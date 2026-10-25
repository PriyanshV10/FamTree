import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/lib/supabase/types";
import { FamilyTree, Person, Relationship, Gender, RelationshipType } from "@/domain/types";
import {
  ITreeRepository,
  TreeGraphData,
  NotFoundError,
  IntegrityError,
  RepositoryError,
} from "./types";
import { createId, getCurrentTimestamp } from "@/lib/utils";
import { DEMO_TREES, DEMO_PEOPLE, DEMO_RELATIONSHIPS } from "@/data/demo-data";
import { purgeTreeLocally, STORAGE_KEY_DELETED_TREES } from "@/lib/sync/tree-cleanup";

type DbPersonRow = Database["public"]["Tables"]["people"]["Row"];
type DbRelationshipRow = Database["public"]["Tables"]["relationships"]["Row"];
type DbTreeRow = Database["public"]["Tables"]["family_trees"]["Row"];

function mapDbPersonToDomain(row: DbPersonRow): Person {
  return {
    id: row.id,
    treeId: row.tree_id,
    firstName: row.first_name,
    middleName: row.middle_name || undefined,
    lastName: row.last_name,
    maidenName: row.maiden_name || undefined,
    displayName: row.display_name || undefined,
    gender: row.gender as Gender,
    birthDate: row.birth_date || undefined,
    deathDate: row.death_date || undefined,
    isLiving: row.is_living,
    birthplace: row.birth_place || undefined,
    occupation: row.occupation || undefined,
    biography: row.bio || undefined,
    photoUrl: row.photo_url || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapDomainPersonToDbInsert(person: Person): Database["public"]["Tables"]["people"]["Insert"] {
  return {
    id: person.id,
    tree_id: person.treeId,
    first_name: person.firstName,
    middle_name: person.middleName || null,
    last_name: person.lastName,
    maiden_name: person.maidenName || null,
    display_name: person.displayName || null,
    gender: person.gender,
    birth_date: person.birthDate || null,
    death_date: person.deathDate || null,
    is_living: person.isLiving,
    birth_place: person.birthplace || null,
    occupation: person.occupation || null,
    bio: person.biography || null,
    photo_url: person.photoUrl || null,
    created_at: person.createdAt,
    updated_at: person.updatedAt,
  };
}

function mapDbRelToDomain(row: DbRelationshipRow): Relationship {
  return {
    id: row.id,
    treeId: row.tree_id,
    personId1: row.person_id_1,
    personId2: row.person_id_2,
    type: row.type as RelationshipType,
    startDate: row.start_date || undefined,
    endDate: row.end_date || undefined,
    notes: row.notes || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapDomainRelToDbInsert(rel: Relationship): Database["public"]["Tables"]["relationships"]["Insert"] {
  return {
    id: rel.id,
    tree_id: rel.treeId,
    person_id_1: rel.personId1,
    person_id_2: rel.personId2,
    type: rel.type,
    start_date: rel.startDate || null,
    end_date: rel.endDate || null,
    notes: rel.notes || null,
    created_at: rel.createdAt,
    updated_at: rel.updatedAt,
  };
}

function mapDbTreeToDomain(row: DbTreeRow, memberCount: number = 0): FamilyTree {
  return {
    id: row.id,
    name: row.name,
    description: row.description || "",
    ownerId: row.owner_id || undefined,
    ownerName: row.owner_name,
    coverColor: row.cover_color || "bg-emerald-800",
    isDefault: row.is_default,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    memberCount,
  };
}

export class SupabaseTreeRepository implements ITreeRepository {
  constructor(private client: SupabaseClient<Database>) {}

  /**
   * Ensures that a user profile exists in the public.profiles table.
   * Satisfies foreign key constraints (family_trees_owner_id_fkey, family_tree_members_user_id_fkey).
   */
  private async ensureProfileExists(userId: string, fullName?: string): Promise<void> {
    try {
      await this.client.from("profiles").upsert(
        {
          id: userId,
          full_name: fullName || "Tree Curator",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );
    } catch (err) {
      console.warn("Could not ensure user profile in database:", err);
    }
  }

  /**
   * Automatically bootstraps demo tree entities into Supabase if missing.
   * Resolves foreign key errors when users point .env.local to an empty database.
   */
  private async ensureTreeExists(treeId: string): Promise<boolean> {
    const demo = DEMO_TREES.find((t) => t.id === treeId);
    if (!demo) return false;

    try {
      const { data: existingTree } = await this.client
        .from("family_trees")
        .select("id")
        .eq("id", treeId)
        .maybeSingle();

      if (!existingTree) {
        const now = getCurrentTimestamp();
        const treeToInsert: Database["public"]["Tables"]["family_trees"]["Insert"] = {
          id: treeId,
          name: demo.name,
          description: demo.description,
          owner_name: demo.ownerName,
          cover_color: demo.coverColor,
          is_default: demo.isDefault,
          created_at: now,
          updated_at: now,
        };

        const { error: insertErr } = await this.client
          .from("family_trees")
          .upsert(treeToInsert, { onConflict: "id" });

        if (insertErr) return false;

        const demoPeople = DEMO_PEOPLE.filter((p) => p.treeId === treeId);
        const demoRels = DEMO_RELATIONSHIPS.filter((r) => r.treeId === treeId);
        if (demoPeople.length > 0) {
          await this.client
            .from("people")
            .upsert(demoPeople.map(mapDomainPersonToDbInsert), { onConflict: "id" });
        }
        if (demoRels.length > 0) {
          await this.client
            .from("relationships")
            .upsert(demoRels.map(mapDomainRelToDbInsert), { onConflict: "id" });
        }
        return true;
      }
      return true;
    } catch {
      return false;
    }
  }

  async listTrees(): Promise<FamilyTree[]> {
    let currentUserId: string | null = null;
    let currentUserEmailPrefix: string | null = null;
    try {
      const { data: authData } = await this.client.auth.getUser();
      currentUserId = authData?.user?.id || null;
      if (authData?.user?.email) {
        currentUserEmailPrefix = authData.user.email.split("@")[0].toLowerCase();
      }
    } catch {
      // Unauthenticated
    }

    const { data: initialTrees, error } = await this.client
      .from("family_trees")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      throw new RepositoryError(`Failed to fetch trees: ${error.message}`, error.code, error);
    }

    let rawTrees = initialTrees || [];

    if (rawTrees.length === 0) {
      // Seed default demo tree so new Supabase databases have initial content
      for (const d of DEMO_TREES) {
        await this.ensureTreeExists(d.id);
      }
      const refetch = await this.client
        .from("family_trees")
        .select("*")
        .order("created_at", { ascending: false });
      rawTrees = refetch.data || [];
    }

    // Filter trees based on user ownership and claim legacy/unassigned trees
    let deletedTreeIds: string[] = [];
    if (typeof window !== "undefined") {
      try {
        const rawDeleted = window.localStorage.getItem(STORAGE_KEY_DELETED_TREES);
        if (rawDeleted) deletedTreeIds = JSON.parse(rawDeleted);
      } catch {
        // ignore
      }
    }

    const filteredTrees = rawTrees.filter((tree) => {
      // 0. Exclude trees deleted by user
      if (deletedTreeIds.includes(tree.id)) return false;

      // 1. If tree has an owner_id:
      if (tree.owner_id) {
        // Return if it belongs to current user
        return currentUserId !== null && tree.owner_id === currentUserId;
      }

      // 2. Default starter trees are viewable by everyone
      if (tree.is_default) {
        return true;
      }

      // 3. If user is logged in:
      if (currentUserId) {
        const treeOwnerLower = (tree.owner_name || "").toLowerCase();
        // If owner_name matches current user email or name, claim it
        if (currentUserEmailPrefix && treeOwnerLower.includes(currentUserEmailPrefix)) {
          this.ensureProfileExists(currentUserId, tree.owner_name).then(() => {
            this.client
              .from("family_trees")
              .update({ owner_id: currentUserId })
              .eq("id", tree.id)
              .then(() => {});
          });
          tree.owner_id = currentUserId;
          return true;
        }

        // Tree belongs to another user or unconfirmed curator
        return false;
      }

      // 4. If NOT logged in: NEVER show unowned user trees on the dashboard!
      // Only default starter demo trees (handled above in #2) are visible to guests.
      return false;
    });

    if (filteredTrees.length === 0) return [];

    // Query member counts in single grouped count query
    const { data: countData } = await this.client
      .from("people")
      .select("tree_id");

    const counts: Record<string, number> = {};
    if (countData) {
      for (const row of countData) {
        counts[row.tree_id] = (counts[row.tree_id] || 0) + 1;
      }
    }

    return filteredTrees.map((t) => mapDbTreeToDomain(t, counts[t.id] || 0));
  }

  async getTree(id: string): Promise<FamilyTree | null> {
    if (typeof window !== "undefined") {
      try {
        const rawDeleted = window.localStorage.getItem(STORAGE_KEY_DELETED_TREES);
        if (rawDeleted) {
          const deletedIds: string[] = JSON.parse(rawDeleted);
          if (deletedIds.includes(id)) return null;
        }
      } catch {
        // ignore
      }
    }
    let currentUserId: string | null = null;
    let currentUserEmailPrefix: string | null = null;
    try {
      const { data: authData } = await this.client.auth.getUser();
      currentUserId = authData?.user?.id || null;
      if (authData?.user?.email) {
        currentUserEmailPrefix = authData.user.email.split("@")[0].toLowerCase();
      }
    } catch {
      // Unauthenticated
    }

    const { data: initialTree, error } = await this.client
      .from("family_trees")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw new RepositoryError(`Failed to fetch tree '${id}': ${error.message}`, error.code, error);
    }

    let tree = initialTree;

    if (!tree) {
      const seeded = await this.ensureTreeExists(id);
      if (seeded) {
        const refetch = await this.client
          .from("family_trees")
          .select("*")
          .eq("id", id)
          .maybeSingle();
        tree = refetch.data;
      }
    }

    if (!tree) return null;

    // Check ownership: If owned by another user and current user is not a member, deny access unless public
    if (tree.owner_id && currentUserId && tree.owner_id !== currentUserId) {
      const { data: membership } = await this.client
        .from("family_tree_members")
        .select("id")
        .eq("tree_id", id)
        .eq("user_id", currentUserId)
        .maybeSingle();

      if (!membership && tree.is_private) {
        return null;
      }
    } else if (tree.owner_id && !currentUserId && !tree.is_default) {
      if (tree.is_private) {
        return null;
      }
    }

    // Auto-claim unowned tree if created by this user
    if (!tree.owner_id && currentUserId && !tree.is_default) {
      const treeOwnerLower = (tree.owner_name || "").toLowerCase();
      if (!currentUserEmailPrefix || treeOwnerLower.includes(currentUserEmailPrefix)) {
        await this.ensureProfileExists(currentUserId, tree.owner_name);
        await this.client
          .from("family_trees")
          .update({ owner_id: currentUserId })
          .eq("id", id);
        tree.owner_id = currentUserId;
      }
    }

    const { count } = await this.client
      .from("people")
      .select("*", { count: "exact", head: true })
      .eq("tree_id", id);

    return mapDbTreeToDomain(tree, count || 0);
  }

  async createTree(input: {
    id?: string;
    name: string;
    description?: string;
    ownerName?: string;
    ownerId?: string;
    coverColor?: string;
  }): Promise<FamilyTree> {
    let currentUserId: string | null = null;
    try {
      const { data: authData } = await this.client.auth.getUser();
      currentUserId = authData?.user?.id || null;
    } catch {
      // Unauthenticated
    }

    const effectiveOwnerId = input.ownerId || currentUserId;
    if (effectiveOwnerId) {
      // Crucial: ensure profile row exists to prevent foreign key violations (family_trees_owner_id_fkey)
      await this.ensureProfileExists(effectiveOwnerId, input.ownerName);
    }

    const treeId = input.id || createId("tree");
    const now = getCurrentTimestamp();

    const insertPayload: Database["public"]["Tables"]["family_trees"]["Insert"] = {
      id: treeId,
      name: input.name,
      description: input.description || "",
      owner_id: effectiveOwnerId,
      owner_name: input.ownerName || "Tree Curator",
      cover_color: input.coverColor || "bg-emerald-800",
      created_at: now,
      updated_at: now,
    };

    const { data, error } = await this.client
      .from("family_trees")
      .insert(insertPayload)
      .select()
      .single();

    if (error) {
      throw new RepositoryError(`Failed to create tree: ${error.message}`, error.code, error);
    }

    if (effectiveOwnerId) {
      try {
        await this.client.from("family_tree_members").upsert(
          {
            tree_id: treeId,
            user_id: effectiveOwnerId,
            role: "owner",
          },
          { onConflict: "tree_id,user_id" }
        );
      } catch {
        // Members table tracking is optional
      }
    }

    return mapDbTreeToDomain(data, 0);
  }

  async updateTree(id: string, updates: Partial<FamilyTree>): Promise<FamilyTree> {
    const updatePayload: Database["public"]["Tables"]["family_trees"]["Update"] = {
      updated_at: getCurrentTimestamp(),
    };
    if (updates.name !== undefined) updatePayload.name = updates.name;
    if (updates.description !== undefined) updatePayload.description = updates.description;
    if (updates.coverColor !== undefined) updatePayload.cover_color = updates.coverColor;
    if (updates.ownerName !== undefined) updatePayload.owner_name = updates.ownerName;

    const { data, error } = await this.client
      .from("family_trees")
      .update(updatePayload)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        throw new NotFoundError(`Family tree '${id}' not found`);
      }
      throw new RepositoryError(`Failed to update tree '${id}': ${error.message}`, error.code, error);
    }

    return mapDbTreeToDomain(data);
  }

  async deleteTree(id: string): Promise<void> {
    let currentUserId: string | null = null;
    try {
      const { data: authData } = await this.client.auth.getUser();
      currentUserId = authData?.user?.id || null;
    } catch {
      // Unauthenticated
    }

    // 1. If user is logged in, attempt to claim unowned tree first to satisfy RLS
    if (currentUserId) {
      try {
        await this.client
          .from("family_trees")
          .update({ owner_id: currentUserId })
          .eq("id", id)
          .is("owner_id", null);
      } catch {
        // Continue
      }
    }

    // 2. Cascade delete dependent records first
    try {
      await this.client.from("relationships").delete().eq("tree_id", id);
    } catch {
      // Continue
    }
    try {
      await this.client.from("people").delete().eq("tree_id", id);
    } catch {
      // Continue
    }
    try {
      await this.client.from("family_tree_members").delete().eq("tree_id", id);
    } catch {
      // Continue
    }

    // 3. Delete from family_trees and check returned data
    const { data, error } = await this.client
      .from("family_trees")
      .delete()
      .eq("id", id)
      .select();

    if (error) {
      throw new RepositoryError(`Failed to delete tree '${id}': ${error.message}`, error.code, error);
    }

    // If data is returned as empty array, it means Postgres RLS blocked row deletion
    if (data && data.length === 0) {
      const { data: stillExists } = await this.client
        .from("family_trees")
        .select("id")
        .eq("id", id)
        .maybeSingle();

      if (stillExists) {
        throw new RepositoryError(
          `Permission denied: Could not delete tree '${id}'. Please execute migration 20261027000000_fix_tree_delete_and_ownership.sql in your Supabase SQL Editor.`,
          "RLS_DELETE_DENIED"
        );
      }
    }

    // 4. Clean up local storage caches completely
    purgeTreeLocally(id);
  }

  /**
   * Batch loads tree, people, and relationships concurrently
   * Avoids N+1 requests.
   */
  async getTreeGraph(treeId: string): Promise<TreeGraphData | null> {
    if (typeof window !== "undefined") {
      try {
        const rawDeleted = window.localStorage.getItem(STORAGE_KEY_DELETED_TREES);
        if (rawDeleted) {
          const deletedIds: string[] = JSON.parse(rawDeleted);
          if (deletedIds.includes(treeId)) return null;
        }
      } catch {
        // ignore
      }
    }
    const [treeResult, peopleResult, relsResult] = await Promise.all([
      this.client.from("family_trees").select("*").eq("id", treeId).maybeSingle(),
      this.client.from("people").select("*").eq("tree_id", treeId).order("created_at"),
      this.client.from("relationships").select("*").eq("tree_id", treeId),
    ]);

    if (treeResult.error) {
      throw new RepositoryError(`Failed to load tree: ${treeResult.error.message}`, treeResult.error.code, treeResult.error);
    }
    if (!treeResult.data) {
      const seeded = await this.ensureTreeExists(treeId);
      if (seeded) {
        return this.getTreeGraph(treeId);
      }
      return null;
    }

    // Verify tree ownership/membership
    const treeRow = treeResult.data;
    let currentUserId: string | null = null;
    let currentUserEmailPrefix: string | null = null;
    try {
      const { data: authData } = await this.client.auth.getUser();
      currentUserId = authData?.user?.id || null;
      if (authData?.user?.email) {
        currentUserEmailPrefix = authData.user.email.split("@")[0].toLowerCase();
      }
    } catch {
      // Unauthenticated
    }

    if (treeRow.owner_id && currentUserId && treeRow.owner_id !== currentUserId) {
      const { data: member } = await this.client
        .from("family_tree_members")
        .select("id")
        .eq("tree_id", treeId)
        .eq("user_id", currentUserId)
        .maybeSingle();

      if (!member && (treeRow as { is_private?: boolean }).is_private) {
        return null;
      }
    } else if (treeRow.owner_id && !currentUserId && !treeRow.is_default) {
      if ((treeRow as { is_private?: boolean }).is_private) {
        return null;
      }
    }

    // Auto-claim unowned tree if created by this user
    if (!treeRow.owner_id && currentUserId && !treeRow.is_default) {
      const treeOwnerLower = (treeRow.owner_name || "").toLowerCase();
      if (!currentUserEmailPrefix || treeOwnerLower.includes(currentUserEmailPrefix)) {
        await this.ensureProfileExists(currentUserId, treeRow.owner_name);
        await this.client
          .from("family_trees")
          .update({ owner_id: currentUserId })
          .eq("id", treeId);
        treeRow.owner_id = currentUserId;
      }
    }

    let people = (peopleResult.data || []).map(mapDbPersonToDomain);
    let relationships = (relsResult.data || []).map(mapDbRelToDomain);

    if (peopleResult.error) {
      console.warn(`Warning loading people for tree '${treeId}':`, peopleResult.error.message);
      const demoPeople = DEMO_PEOPLE.filter((p) => p.treeId === treeId);
      if (demoPeople.length > 0) {
        people = demoPeople;
      }
    }
    if (relsResult.error) {
      console.warn(`Warning loading relationships for tree '${treeId}':`, relsResult.error.message);
      const demoRels = DEMO_RELATIONSHIPS.filter((r) => r.treeId === treeId);
      if (demoRels.length > 0) {
        relationships = demoRels;
      }
    }

    const tree = mapDbTreeToDomain(treeResult.data, people.length);

    return {
      tree,
      people,
      relationships,
    };
  }

  async addPerson(treeId: string, person: Person): Promise<Person> {
    const personToInsert: Person = {
      ...person,
      treeId,
      createdAt: person.createdAt || getCurrentTimestamp(),
      updatedAt: getCurrentTimestamp(),
    };

    let { data, error } = await this.client
      .from("people")
      .insert(mapDomainPersonToDbInsert(personToInsert))
      .select()
      .single();

    if (error && error.code === "23503") {
      const seeded = await this.ensureTreeExists(treeId);
      if (seeded) {
        const retry = await this.client
          .from("people")
          .insert(mapDomainPersonToDbInsert(personToInsert))
          .select()
          .single();
        data = retry.data;
        error = retry.error;
      }
    }

    if (error) {
      if (error.code === "23503") {
        throw new IntegrityError(`Foreign key violation: tree '${treeId}' does not exist.`);
      }
      throw new RepositoryError(`Failed to insert person: ${error.message}`, error.code, error);
    }

    return mapDbPersonToDomain(data!);
  }

  async updatePerson(
    treeId: string,
    personId: string,
    updates: Partial<Person>
  ): Promise<Person> {
    const updatePayload: Database["public"]["Tables"]["people"]["Update"] = {
      updated_at: getCurrentTimestamp(),
    };
    if (updates.firstName !== undefined) updatePayload.first_name = updates.firstName;
    if (updates.middleName !== undefined) updatePayload.middle_name = updates.middleName;
    if (updates.lastName !== undefined) updatePayload.last_name = updates.lastName;
    if (updates.maidenName !== undefined) updatePayload.maiden_name = updates.maidenName;
    if (updates.displayName !== undefined) updatePayload.display_name = updates.displayName;
    if (updates.gender !== undefined) updatePayload.gender = updates.gender;
    if (updates.birthDate !== undefined) updatePayload.birth_date = updates.birthDate;
    if (updates.deathDate !== undefined) updatePayload.death_date = updates.deathDate;
    if (updates.isLiving !== undefined) updatePayload.is_living = updates.isLiving;
    if (updates.birthplace !== undefined) updatePayload.birth_place = updates.birthplace;
    if (updates.occupation !== undefined) updatePayload.occupation = updates.occupation;
    if (updates.biography !== undefined) updatePayload.bio = updates.biography;
    if (updates.photoUrl !== undefined) updatePayload.photo_url = updates.photoUrl;

    const { data, error } = await this.client
      .from("people")
      .update(updatePayload)
      .eq("id", personId)
      .eq("tree_id", treeId)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        throw new NotFoundError(`Person '${personId}' not found in tree '${treeId}'`);
      }
      throw new RepositoryError(`Failed to update person '${personId}': ${error.message}`, error.code, error);
    }

    return mapDbPersonToDomain(data);
  }

  async removePerson(treeId: string, personId: string): Promise<void> {
    const { error } = await this.client
      .from("people")
      .delete()
      .eq("id", personId)
      .eq("tree_id", treeId);

    if (error) {
      throw new RepositoryError(`Failed to remove person '${personId}': ${error.message}`, error.code, error);
    }
  }

  async addRelationship(
    treeId: string,
    relationship: Relationship
  ): Promise<Relationship> {
    const relToInsert: Relationship = {
      ...relationship,
      treeId,
      createdAt: relationship.createdAt || getCurrentTimestamp(),
      updatedAt: getCurrentTimestamp(),
    };

    let { data, error } = await this.client
      .from("relationships")
      .insert(mapDomainRelToDbInsert(relToInsert))
      .select()
      .single();

    if (error && (error.code === "23503" || error.code === "23514")) {
      const seeded = await this.ensureTreeExists(treeId);
      if (seeded) {
        const retry = await this.client
          .from("relationships")
          .insert(mapDomainRelToDbInsert(relToInsert))
          .select()
          .single();
        data = retry.data;
        error = retry.error;
      }
    }

    if (error) {
      if (error.code === "23503" || error.code === "23514") {
        throw new IntegrityError(
          `Integrity constraint failed: ensure both people belong to tree '${treeId}' and are not self-referential.`
        );
      }
      if (error.code === "23505") {
        throw new IntegrityError(`Duplicate relationship already exists between these individuals.`);
      }
      throw new RepositoryError(`Failed to add relationship: ${error.message}`, error.code, error);
    }

    return mapDbRelToDomain(data!);
  }

  async removeRelationship(
    treeId: string,
    relationshipId: string
  ): Promise<void> {
    const { error } = await this.client
      .from("relationships")
      .delete()
      .eq("id", relationshipId)
      .eq("tree_id", treeId);

    if (error) {
      throw new RepositoryError(`Failed to remove relationship '${relationshipId}': ${error.message}`, error.code, error);
    }
  }
}
