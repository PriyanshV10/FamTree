import { describe, it, expect, vi } from "vitest";
import { SupabaseTreeRepository } from "@/repositories/supabase-tree-repository";
import { IntegrityError, NotFoundError } from "@/repositories/types";
import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/lib/supabase/types";

describe("SupabaseTreeRepository", () => {
  it("batch loads tree, people, and relationships concurrently in getTreeGraph", async () => {
    const mockTree = {
      id: "tree-1",
      name: "Test Tree",
      description: "Test Desc",
      owner_id: null,
      owner_name: "Owner",
      cover_color: "bg-emerald-800",
      is_default: false,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    };

    const mockPeople = [
      {
        id: "p1",
        tree_id: "tree-1",
        first_name: "Alice",
        middle_name: null,
        last_name: "Smith",
        maiden_name: null,
        display_name: null,
        gender: "female",
        birth_date: "1980-01-01",
        death_date: null,
        is_living: true,
        birth_place: "London",
        occupation: "Scientist",
        bio: "Bio",
        photo_url: null,
        metadata: {},
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      },
    ];

    const mockRels = [
      {
        id: "r1",
        tree_id: "tree-1",
        person_id_1: "p1",
        person_id_2: "p2",
        type: "spouse",
        start_date: "2005-01-01",
        end_date: null,
        notes: null,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      },
    ];

    const mockClient = {
      from: vi.fn((table: string) => {
        if (table === "family_trees") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: mockTree, error: null }),
              }),
            }),
          };
        }
        if (table === "people") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({ data: mockPeople, error: null }),
              }),
            }),
          };
        }
        if (table === "relationships") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: mockRels, error: null }),
            }),
          };
        }
        return {};
      }),
    } as unknown as SupabaseClient<Database>;

    const repo = new SupabaseTreeRepository(mockClient);
    const result = await repo.getTreeGraph("tree-1");

    expect(result).not.toBeNull();
    expect(result?.tree.name).toBe("Test Tree");
    expect(result?.people.length).toBe(1);
    expect(result?.people[0].firstName).toBe("Alice");
    expect(result?.people[0].birthplace).toBe("London");
    expect(result?.relationships.length).toBe(1);
    expect(result?.relationships[0].type).toBe("spouse");
  });

  it("translates foreign key error (code 23503) to IntegrityError when adding person", async () => {
    const mockClient = {
      from: vi.fn().mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { code: "23503", message: "foreign key violation" },
            }),
          }),
        }),
      }),
    } as unknown as SupabaseClient<Database>;

    const repo = new SupabaseTreeRepository(mockClient);
    await expect(
      repo.addPerson("nonexistent-tree", {
        id: "p1",
        treeId: "nonexistent-tree",
        firstName: "Test",
        lastName: "User",
        gender: "unknown",
        isLiving: true,
        createdAt: "2026-01-01",
        updatedAt: "2026-01-01",
      })
    ).rejects.toThrow(IntegrityError);
  });

  it("translates not found code PGRST116 to NotFoundError on update", async () => {
    const mockClient = {
      from: vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: { code: "PGRST116", message: "no rows returned" },
                }),
              }),
            }),
          }),
        }),
      }),
    } as unknown as SupabaseClient<Database>;

    const repo = new SupabaseTreeRepository(mockClient);
    await expect(
      repo.updatePerson("tree-1", "nonexistent-person", { firstName: "Changed" })
    ).rejects.toThrow(NotFoundError);
  });

  it("deletes a tree and purges dependencies", async () => {
    const mockClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-123", email: "user@example.com" } },
        }),
      },
      from: vi.fn((table: string) => {
        if (table === "family_trees") {
          return {
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                is: vi.fn().mockResolvedValue({ data: null, error: null }),
              }),
            }),
            delete: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockResolvedValue({
                  data: [{ id: "tree-to-del" }],
                  error: null,
                }),
              }),
            }),
          };
        }
        return {
          delete: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        };
      }),
    } as unknown as SupabaseClient<Database>;

    const repo = new SupabaseTreeRepository(mockClient);
    await expect(repo.deleteTree("tree-to-del")).resolves.toBeUndefined();
    expect(mockClient.from).toHaveBeenCalledWith("family_trees");
    expect(mockClient.from).toHaveBeenCalledWith("people");
    expect(mockClient.from).toHaveBeenCalledWith("relationships");
  });
});
