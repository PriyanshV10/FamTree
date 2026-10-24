import React from "react";
import { connection } from "next/server";
import { TreeWorkspace } from "@/components/tree/TreeWorkspace";
import { getDemoTree, getDemoPeople, getDemoRelationships, DEMO_TREES } from "@/data/demo-data";
import { getTreeRepository } from "@/repositories";
import { SupabaseTreeRepository } from "@/repositories/supabase-tree-repository";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { FamilyTree, Person, Relationship } from "@/types";

export const instant = false;

export function generateStaticParams() {
  return DEMO_TREES.map((tree) => ({
    id: tree.id,
  }));
}

interface TreePageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function TreePage({ params }: TreePageProps) {
  const { id } = await params;
  const demoTree = getDemoTree(id);

  let initialTree: FamilyTree | null = null;
  let initialPeople: Person[] = [];
  let initialRelationships: Relationship[] = [];

  if (demoTree) {
    initialTree = demoTree;
    initialPeople = getDemoPeople(demoTree.id);
    initialRelationships = getDemoRelationships(demoTree.id);
  } else {
    // Non-demo trees are dynamic and must be rendered at request time
    await connection();

    try {
      if (isSupabaseConfigured()) {
        const serverClient = await getSupabaseServerClient();
        if (serverClient) {
          const supabaseRepo = new SupabaseTreeRepository(serverClient);
          const loaded = await supabaseRepo.getTreeGraph(id);
          if (loaded) {
            initialTree = loaded.tree;
            initialPeople = loaded.people;
            initialRelationships = loaded.relationships;
          }
        }
      }

      if (!initialTree) {
        const repo = getTreeRepository();
        const loaded = await repo.getTreeGraph(id);
        if (loaded) {
          initialTree = loaded.tree;
          initialPeople = loaded.people;
          initialRelationships = loaded.relationships;
        }
      }
    } catch (err) {
      console.warn("Could not load tree graph on server:", err);
    }
  }

  if (!initialTree) {
    initialTree = {
      id,
      name: "Family Tree",
      description: "",
      ownerName: "Curator",
      coverColor: "bg-emerald-800",
      isDefault: false,
      createdAt: "1970-01-01T00:00:00.000Z",
      updatedAt: "1970-01-01T00:00:00.000Z",
    };
  }

  return (
    <TreeWorkspace
      initialTree={initialTree}
      initialPeople={initialPeople}
      initialRelationships={initialRelationships}
    />
  );
}
