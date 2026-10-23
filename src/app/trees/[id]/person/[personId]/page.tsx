import React from "react";
import { notFound } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import {
  getDemoTree,
  getDemoPerson,
  getDemoPeople,
  getDemoRelationships,
  DEMO_PEOPLE,
} from "@/data/demo-data";
import { PersonProfileClient } from "@/components/person/PersonProfileClient";
import { getTreeRepository } from "@/repositories";
import { SupabaseTreeRepository } from "@/repositories/supabase-tree-repository";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { FamilyTree, Person, Relationship } from "@/types";

export function generateStaticParams() {
  return DEMO_PEOPLE.map((person) => ({
    id: person.treeId,
    personId: person.id,
  }));
}

interface PersonProfilePageProps {
  params: Promise<{
    id: string;
    personId: string;
  }>;
}

export default async function PersonProfilePage({
  params,
}: PersonProfilePageProps) {
  const { id: treeId, personId } = await params;
  const demoTree = getDemoTree(treeId);
  const demoPerson = getDemoPerson(personId);

  let tree: FamilyTree | null = demoTree || null;
  let person: Person | null = demoPerson || null;
  let people: Person[] = [];
  let relationships: Relationship[] = [];

  if (demoTree && demoPerson) {
    people = getDemoPeople(demoTree.id);
    relationships = getDemoRelationships(demoTree.id);
  } else {
    try {
      if (isSupabaseConfigured()) {
        const serverClient = await getSupabaseServerClient();
        if (serverClient) {
          const supabaseRepo = new SupabaseTreeRepository(serverClient);
          const graph = await supabaseRepo.getTreeGraph(treeId);
          if (graph) {
            tree = graph.tree;
            people = graph.people;
            relationships = graph.relationships;
            person = people.find((p) => p.id === personId) || null;
          }
        }
      }

      if (!tree || !person) {
        const repo = getTreeRepository();
        const graph = await repo.getTreeGraph(treeId);
        if (graph) {
          tree = graph.tree;
          people = graph.people;
          relationships = graph.relationships;
          person = people.find((p) => p.id === personId) || null;
        }
      }
    } catch {
      // ignore
    }
  }

  if (!tree || !person) {
    notFound();
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#FBF9F5] dark:bg-[#111513] transition-colors">
      <Navbar />

      <main className="flex-1">
        <PersonProfileClient
          tree={tree}
          initialPerson={person}
          initialPeople={people}
          initialRelationships={relationships}
        />
      </main>

      <Footer />
    </div>
  );
}
