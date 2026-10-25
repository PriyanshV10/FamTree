"use client";

import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/lib/supabase/types";
import { FamilyTree, Person, Relationship, Gender, RelationshipType } from "@/domain/types";
import {
  STORAGE_KEY_TREES,
  STORAGE_KEY_PEOPLE,
  STORAGE_KEY_RELATIONSHIPS,
  STORAGE_KEY_DELETED_TREES,
} from "./tree-cleanup";

export async function syncLocalAndSupabase(
  userId: string,
  client: SupabaseClient<Database>
): Promise<{ syncedCount: number; fetchedCount: number }> {
  if (typeof window === "undefined") {
    return { syncedCount: 0, fetchedCount: 0 };
  }

  let localTrees: FamilyTree[] = [];
  let localPeople: Person[] = [];
  let localRels: Relationship[] = [];
  let deletedTreeIds: string[] = [];

  try {
    const rawTrees = localStorage.getItem(STORAGE_KEY_TREES);
    const rawPeople = localStorage.getItem(STORAGE_KEY_PEOPLE);
    const rawRels = localStorage.getItem(STORAGE_KEY_RELATIONSHIPS);
    const rawDeleted = localStorage.getItem(STORAGE_KEY_DELETED_TREES);

    if (rawTrees) localTrees = JSON.parse(rawTrees);
    if (rawPeople) localPeople = JSON.parse(rawPeople);
    if (rawRels) localRels = JSON.parse(rawRels);
    if (rawDeleted) deletedTreeIds = JSON.parse(rawDeleted);
  } catch (err) {
    console.warn("Could not read local trees for sync:", err);
  }

  // Ensure tombstoned/deleted trees are deleted from Supabase
  if (deletedTreeIds.length > 0) {
    for (const delId of deletedTreeIds) {
      try {
        await client.from("family_trees").delete().eq("id", delId);
      } catch {
        // ignore
      }
    }
  }

  let syncedCount = 0;

  // 1. Find local trees that are either unowned (guest) or belong to this user
  // Do NOT sync trees that were deleted or belong to a different user
  const treesToSync = localTrees.filter((t) => {
    if (deletedTreeIds.includes(t.id)) return false;
    // Skip default demo trees unless modified
    if (t.isDefault) return false;
    // If tagged with a DIFFERENT user ID, do NOT upload to this user
    if (t.ownerId && t.ownerId !== userId && t.ownerId !== "guest" && t.ownerId !== "local-curator") {
      return false;
    }
    return true;
  });

  if (treesToSync.length > 0) {
    try {
      await client.from("profiles").upsert(
        {
          id: userId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id", ignoreDuplicates: true }
      );
    } catch {
      // Ignore if exists
    }
  }

  for (const tree of treesToSync) {
    try {
      // Upsert tree in Supabase
      const { error: treeErr } = await client.from("family_trees").upsert({
        id: tree.id,
        name: tree.name,
        description: tree.description || "",
        owner_id: userId,
        owner_name: tree.ownerName,
        cover_color: tree.coverColor || "bg-emerald-800",
        is_default: false,
        created_at: tree.createdAt,
        updated_at: tree.updatedAt,
      });

      if (!treeErr) {
        // Tag local tree with userId
        tree.ownerId = userId;
        syncedCount++;

        // Sync its people
        const treePeople = localPeople.filter((p) => p.treeId === tree.id);
        if (treePeople.length > 0) {
          const mappedPeople = treePeople.map((p) => ({
            id: p.id,
            tree_id: p.treeId,
            first_name: p.firstName,
            middle_name: p.middleName || null,
            last_name: p.lastName,
            maiden_name: p.maidenName || null,
            display_name: p.displayName || null,
            gender: p.gender,
            birth_date: p.birthDate || null,
            death_date: p.deathDate || null,
            is_living: p.isLiving,
            birth_place: p.birthplace || null,
            occupation: p.occupation || null,
            bio: p.biography || null,
            photo_url: p.photoUrl || null,
            created_at: p.createdAt,
            updated_at: p.updatedAt,
          }));
          await client.from("people").upsert(mappedPeople, { onConflict: "id" });
        }

        // Sync its relationships
        const treeRels = localRels.filter((r) => r.treeId === tree.id);
        if (treeRels.length > 0) {
          const mappedRels = treeRels.map((r) => ({
            id: r.id,
            tree_id: r.treeId,
            person_id_1: r.personId1,
            person_id_2: r.personId2,
            type: r.type,
            start_date: r.startDate || null,
            end_date: r.endDate || null,
            notes: r.notes || null,
            created_at: r.createdAt,
            updated_at: r.updatedAt,
          }));
          await client.from("relationships").upsert(mappedRels, { onConflict: "id" });
        }

        // Register ownership in family_tree_members
        await client.from("family_tree_members").upsert(
          {
            tree_id: tree.id,
            user_id: userId,
            role: "owner",
          },
          { onConflict: "tree_id,user_id" }
        );
      }
    } catch (err) {
      console.warn("Failed to sync tree to Supabase:", tree.id, err);
    }
  }

  // 2. Fetch trees from Supabase for this user (including claiming unowned trees)
  let fetchedCount = 0;
  let userPrefix = "";
  try {
    const { data: authData } = await client.auth.getUser();
    if (authData?.user?.email) {
      userPrefix = authData.user.email.split("@")[0].toLowerCase();
    }
  } catch {
    // Unauthenticated
  }

  try {
    const { data: allDbTrees } = await client
      .from("family_trees")
      .select("*");

    const userDbTrees = (allDbTrees || []).filter((dbt) => {
      // Do not re-import trees that were deleted by user
      if (deletedTreeIds.includes(dbt.id)) return false;
      // 1. Owned by this user
      if (dbt.owner_id === userId) return true;
      // 2. Unowned tree created by this user
      if (!dbt.owner_id && !dbt.is_default) {
        if (!userPrefix || (dbt.owner_name || "").toLowerCase().includes(userPrefix)) {
          return true;
        }
      }
      return false;
    });

    if (userDbTrees.length > 0) {
      fetchedCount = userDbTrees.length;
      for (const dbt of userDbTrees) {
        // Auto-claim unowned tree in Supabase
        if (!dbt.owner_id) {
          await client.from("family_trees").update({ owner_id: userId }).eq("id", dbt.id);
          dbt.owner_id = userId;
        }

        // Upsert into localTrees
        const existingIdx = localTrees.findIndex((lt) => lt.id === dbt.id);
        const mappedTree: FamilyTree = {
          id: dbt.id,
          name: dbt.name,
          description: dbt.description || "",
          ownerId: dbt.owner_id || userId,
          ownerName: dbt.owner_name,
          coverColor: dbt.cover_color || "bg-emerald-800",
          isDefault: dbt.is_default,
          createdAt: dbt.created_at,
          updatedAt: dbt.updated_at,
        };

        if (existingIdx >= 0) {
          localTrees[existingIdx] = mappedTree;
        } else {
          localTrees.push(mappedTree);
        }

        // Fetch people and rels for this tree
        const [{ data: dbPeople }, { data: dbRels }] = await Promise.all([
          client.from("people").select("*").eq("tree_id", dbt.id),
          client.from("relationships").select("*").eq("tree_id", dbt.id),
        ]);

        if (dbPeople) {
          for (const dbp of dbPeople) {
            const mappedP: Person = {
              id: dbp.id,
              treeId: dbp.tree_id,
              firstName: dbp.first_name,
              middleName: dbp.middle_name || undefined,
              lastName: dbp.last_name,
              maidenName: dbp.maiden_name || undefined,
              displayName: dbp.display_name || undefined,
              gender: dbp.gender as Gender,
              birthDate: dbp.birth_date || undefined,
              deathDate: dbp.death_date || undefined,
              isLiving: dbp.is_living,
              birthplace: dbp.birth_place || undefined,
              occupation: dbp.occupation || undefined,
              biography: dbp.bio || undefined,
              photoUrl: dbp.photo_url || undefined,
              createdAt: dbp.created_at,
              updatedAt: dbp.updated_at,
            };
            const pIdx = localPeople.findIndex((p) => p.id === dbp.id);
            if (pIdx >= 0) localPeople[pIdx] = mappedP;
            else localPeople.push(mappedP);
          }
        }

        if (dbRels) {
          for (const dbr of dbRels) {
            const mappedR: Relationship = {
              id: dbr.id,
              treeId: dbr.tree_id,
              personId1: dbr.person_id_1,
              personId2: dbr.person_id_2,
              type: dbr.type as RelationshipType,
              startDate: dbr.start_date || undefined,
              endDate: dbr.end_date || undefined,
              notes: dbr.notes || undefined,
              createdAt: dbr.created_at,
              updatedAt: dbr.updated_at,
            };
            const rIdx = localRels.findIndex((r) => r.id === dbr.id);
            if (rIdx >= 0) localRels[rIdx] = mappedR;
            else localRels.push(mappedR);
          }
        }
      }
    }

    // Persist merged local storage
    localStorage.setItem(STORAGE_KEY_TREES, JSON.stringify(localTrees));
    localStorage.setItem(STORAGE_KEY_PEOPLE, JSON.stringify(localPeople));
    localStorage.setItem(STORAGE_KEY_RELATIONSHIPS, JSON.stringify(localRels));

    window.dispatchEvent(
      new CustomEvent("famtree:data-synced", {
        detail: { syncedCount, fetchedCount },
      })
    );
  } catch (err) {
    console.warn("Could not fetch remote trees during sync:", err);
  }

  return { syncedCount, fetchedCount };
}
