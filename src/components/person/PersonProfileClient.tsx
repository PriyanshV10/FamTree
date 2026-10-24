"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  MapPin,
  Briefcase,
  Calendar,
  Users,
  Compass,
  ArrowRight,
  BookOpen,
  Plus,
  Trash2,
  AlertCircle,
  X,
} from "lucide-react";
import { FamilyTree, Person, Relationship, RelationshipType } from "@/types";
import { FamilyGraph } from "@/domain/family-graph";
import {
  getPersonFullName,
  getInitials,
  formatDateRange,
  getAvatarColor,
  cn,
} from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { AddRelativeModal, AddRelativeMode } from "@/components/relationship/AddRelativeModal";
import { getTreeRepository } from "@/repositories";
import { useAuth } from "@/components/auth/AuthContext";

interface PersonProfileClientProps {
  tree: FamilyTree;
  initialPerson: Person;
  initialPeople: Person[];
  initialRelationships: Relationship[];
}

export function PersonProfileClient({
  tree,
  initialPerson,
  initialPeople,
  initialRelationships,
}: PersonProfileClientProps) {
  const { user } = useAuth();
  const [people, setPeople] = useState<Person[]>(initialPeople);
  const [relationships, setRelationships] = useState<Relationship[]>(initialRelationships);
  const [addRelativeMode, setAddRelativeMode] = useState<AddRelativeMode | null>(null);
  const [relToDelete, setRelToDelete] = useState<{ id: string; targetName: string } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync with repository on mount
  useEffect(() => {
    let isMounted = true;
    async function loadFromRepo() {
      try {
        const repo = getTreeRepository(Boolean(user));
        const data = await repo.getTreeGraph(tree.id);
        if (isMounted && data) {
          if (data.people.length > 0) setPeople(data.people);
          if (data.relationships.length > 0) setRelationships(data.relationships);
        }
      } catch (err) {
        console.warn("Could not sync with repository:", err);
      }
    }
    loadFromRepo();
    return () => {
      isMounted = false;
    };
  }, [tree.id, user]);

  // Current person object from latest people state
  const person = useMemo(() => {
    return people.find((p) => p.id === initialPerson.id) || initialPerson;
  }, [people, initialPerson]);

  // Construct reactive family graph
  const graph = useMemo(() => {
    return new FamilyGraph(tree.id, people, relationships);
  }, [tree.id, people, relationships]);

  const fullName = getPersonFullName(person);
  const initials = getInitials(fullName);
  const years = formatDateRange(person.birthDate, person.deathDate, person.isLiving);
  const avatarColor = getAvatarColor(person.id);

  const parents = useMemo(() => graph.getParents(person.id), [graph, person.id]);
  const spouses = useMemo(() => graph.getSpouses(person.id, true), [graph, person.id]);
  const siblings = useMemo(() => graph.getSiblings(person.id), [graph, person.id]);
  const children = useMemo(() => graph.getChildren(person.id), [graph, person.id]);

  // Handler for adding relationship
  const handleAddRelationship = async (relData: {
    personId1: string;
    personId2: string;
    type: RelationshipType;
    startDate?: string;
    notes?: string;
  }) => {
    setErrorMessage(null);
    const repo = getTreeRepository(Boolean(user));
    try {
      const newRel = graph.addRelationship({
        treeId: tree.id,
        personId1: relData.personId1,
        personId2: relData.personId2,
        type: relData.type,
        startDate: relData.startDate,
        notes: relData.notes,
      });
      await repo.addRelationship(tree.id, newRel);
      setRelationships(graph.getAllRelationships());
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to persist relationship.";
      setErrorMessage(msg);
      console.error("Repository error adding relationship:", err);
    }
  };

  // Handler for disconnecting relationship
  const handleDisconnectRelationship = async () => {
    if (!relToDelete) return;
    setErrorMessage(null);
    const repo = getTreeRepository(Boolean(user));
    try {
      await repo.removeRelationship(tree.id, relToDelete.id);
      graph.removeRelationship(relToDelete.id);
      setRelationships(graph.getAllRelationships());
      setRelToDelete(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to remove relationship.";
      setErrorMessage(msg);
      console.error("Repository error removing relationship:", err);
    }
  };

  return (
    <div className="flex-1 mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Breadcrumb / Back button */}
      <div className="flex items-center justify-between pb-6 border-b border-stone-200/80 dark:border-stone-800">
        <Link
          href={`/trees/${tree.id}`}
          className="flex items-center gap-1.5 text-xs font-semibold text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          <span>Back to {tree.name} Canvas</span>
        </Link>

        <Link href={`/trees/${tree.id}`}>
          <Button size="sm" variant="outline" className="gap-1.5 text-xs">
            <Compass className="h-4 w-4 text-[#1B4D3E] dark:text-emerald-400" />
            View in Canvas
          </Button>
        </Link>
      </div>

      {/* Error banner */}
      {errorMessage && (
        <div className="mt-4 flex items-center justify-between gap-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-xl px-4 py-3 text-xs text-red-800 dark:text-red-300">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
            <span className="font-medium">{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="rounded p-1 hover:bg-red-100 dark:hover:bg-red-900/60 text-red-600 dark:text-red-400"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Hero Profile Card */}
      <div className="mt-8 rounded-2xl border border-stone-200/90 dark:border-stone-800 bg-white dark:bg-[#18201B] p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          <div
            className={cn(
              "flex h-24 w-24 shrink-0 items-center justify-center rounded-3xl border-2 text-2xl font-bold tracking-wider shadow-xs",
              avatarColor
            )}
          >
            {initials}
          </div>

          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "rounded-full px-2.5 py-0.5 text-xs font-semibold border",
                  person.isLiving
                    ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                    : "bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 border-stone-200 dark:border-stone-700"
                )}
              >
                {person.isLiving ? "Living" : "Deceased"}
              </span>
              <span className="rounded-full bg-stone-100 dark:bg-stone-800 px-2.5 py-0.5 text-xs font-semibold text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-700 capitalize">
                {person.gender}
              </span>
              <span className="text-xs text-stone-400 dark:text-stone-500">·</span>
              <span className="text-xs font-medium text-stone-500 dark:text-stone-400">
                Tree: {tree.name}
              </span>
            </div>

            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-stone-900 dark:text-stone-100">
              {fullName}
            </h1>

            <p className="text-sm font-semibold text-stone-500 dark:text-stone-400">{years}</p>

            {/* Attributes */}
            <div className="pt-2 flex flex-wrap gap-4 text-xs text-stone-600 dark:text-stone-400">
              {person.birthplace && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-stone-400 dark:text-stone-500" />
                  {person.birthplace}
                </span>
              )}
              {person.occupation && (
                <span className="flex items-center gap-1.5">
                  <Briefcase className="h-4 w-4 text-stone-400 dark:text-stone-500" />
                  {person.occupation}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-stone-400 dark:text-stone-500" />
                {person.birthDate || "Date unrecorded"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Biography Section */}
      {person.biography && (
        <div className="mt-8 rounded-2xl border border-stone-200/80 dark:border-stone-800 bg-white dark:bg-[#18201B] p-6 sm:p-8 shadow-xs">
          <h2 className="flex items-center gap-2 font-serif text-xl font-bold text-stone-900 dark:text-stone-100 pb-3 border-b border-stone-100 dark:border-stone-800">
            <BookOpen className="h-5 w-5 text-[#1B4D3E] dark:text-emerald-400" />
            Life Story & Historical Context
          </h2>
          <p className="mt-4 text-sm sm:text-base leading-relaxed text-stone-700 dark:text-stone-300">
            {person.biography}
          </p>
        </div>
      )}

      {/* Immediate Family Grid from Domain Graph */}
      <div className="mt-8 space-y-6">
        <h2 className="flex items-center gap-2 font-serif text-2xl font-bold text-stone-900">
          <Users className="h-6 w-6 text-[#1B4D3E]" />
          Family Connections
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Parents */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base text-stone-800">Parents</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAddRelativeMode("parent")}
                className="h-7 gap-1 text-xs text-[#1B4D3E] border-[#1B4D3E]/30 hover:bg-[#1B4D3E]/10"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Parent</span>
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {parents.length === 0 ? (
                <p className="text-xs text-stone-400 italic py-2">No parent records</p>
              ) : (
                parents.map(({ person: p, relationship: r }) => (
                  <RelativeRowInteractive
                    key={r.id}
                    treeId={tree.id}
                    person={p}
                    label={
                      r.type === "adoptive-parent-child"
                        ? "Adoptive Parent"
                        : r.type === "step-parent-child"
                        ? "Step-Parent"
                        : "Parent"
                    }
                    onDisconnect={() =>
                      setRelToDelete({
                        id: r.id,
                        targetName: getPersonFullName(p),
                      })
                    }
                  />
                ))
              )}
            </CardContent>
          </Card>

          {/* Spouses / Partners */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base text-stone-800">Spouse / Partner</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAddRelativeMode("spouse")}
                className="h-7 gap-1 text-xs text-[#1B4D3E] border-[#1B4D3E]/30 hover:bg-[#1B4D3E]/10"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Partner</span>
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {spouses.length === 0 ? (
                <p className="text-xs text-stone-400 italic py-2">No spouse records</p>
              ) : (
                spouses.map(({ person: p, relationship: r }) => (
                  <RelativeRowInteractive
                    key={r.id}
                    treeId={tree.id}
                    person={p}
                    label={
                      r.type === "former-spouse"
                        ? `Former Partner${r.startDate ? ` (m. ${r.startDate})` : ""}`
                        : `Partner${r.startDate ? ` (m. ${r.startDate})` : ""}`
                    }
                    onDisconnect={() =>
                      setRelToDelete({
                        id: r.id,
                        targetName: getPersonFullName(p),
                      })
                    }
                  />
                ))
              )}
            </CardContent>
          </Card>

          {/* Siblings */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base text-stone-800">Siblings</CardTitle>
              <span className="text-[11px] text-stone-400 italic">Inferred from parents</span>
            </CardHeader>
            <CardContent className="space-y-2">
              {siblings.length === 0 ? (
                <p className="text-xs text-stone-400 italic py-2">No siblings recorded</p>
              ) : (
                siblings.map(({ person: p, type }) => (
                  <RelativeRowInteractive
                    key={p.id}
                    treeId={tree.id}
                    person={p}
                    label={`${type.charAt(0).toUpperCase() + type.slice(1)} Sibling`}
                  />
                ))
              )}
            </CardContent>
          </Card>

          {/* Children */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base text-stone-800">Children</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAddRelativeMode("child")}
                className="h-7 gap-1 text-xs text-[#1B4D3E] border-[#1B4D3E]/30 hover:bg-[#1B4D3E]/10"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Child</span>
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {children.length === 0 ? (
                <p className="text-xs text-stone-400 italic py-2">No children recorded</p>
              ) : (
                children.map(({ person: p, relationship: r }) => (
                  <RelativeRowInteractive
                    key={r.id}
                    treeId={tree.id}
                    person={p}
                    label={
                      r.type === "adoptive-parent-child"
                        ? "Adoptive Child"
                        : r.type === "step-parent-child"
                        ? "Step-Child"
                        : "Child"
                    }
                    onDisconnect={() =>
                      setRelToDelete({
                        id: r.id,
                        targetName: getPersonFullName(p),
                      })
                    }
                  />
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Add Relative Modal with Live Search Bar */}
      {addRelativeMode && (
        <AddRelativeModal
          isOpen={true}
          onClose={() => setAddRelativeMode(null)}
          currentPerson={person}
          mode={addRelativeMode}
          allPeople={people}
          existingRelationships={relationships}
          treeId={tree.id}
          onSave={handleAddRelationship}
        />
      )}

      {/* Disconnect Relationship Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(relToDelete)}
        title="Disconnect Relative"
        description={`Are you sure you want to remove the relationship between ${fullName} and ${relToDelete?.targetName}? Neither person will be deleted from the tree.`}
        confirmLabel="Disconnect"
        isDestructive={true}
        onConfirm={handleDisconnectRelationship}
        onClose={() => setRelToDelete(null)}
      />
    </div>
  );
}

function RelativeRowInteractive({
  treeId,
  person,
  label,
  onDisconnect,
}: {
  treeId: string;
  person: Person;
  label: string;
  onDisconnect?: () => void;
}) {
  const fullName = getPersonFullName(person);
  const initials = getInitials(fullName);
  const avatarColor = getAvatarColor(person.id);
  const years = formatDateRange(person.birthDate, person.deathDate, person.isLiving);

  return (
    <div className="flex items-center justify-between rounded-xl p-2.5 border border-stone-100 dark:border-stone-800 hover:border-emerald-300 dark:hover:border-emerald-700 hover:bg-emerald-50/20 dark:hover:bg-emerald-950/20 transition-all group">
      <Link
        href={`/trees/${treeId}/person/${person.id}`}
        className="flex items-center gap-3 flex-1 min-w-0"
      >
        <div
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-bold",
            avatarColor
          )}
        >
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-stone-900 dark:text-stone-100 group-hover:text-emerald-950 dark:group-hover:text-emerald-300 truncate">
            {fullName}
          </p>
          <p className="text-[11px] text-stone-400 dark:text-stone-500 truncate">
            {years} · {label}
          </p>
        </div>
      </Link>

      <div className="flex items-center gap-1.5 shrink-0 ml-2">
        {onDisconnect && (
          <button
            type="button"
            onClick={onDisconnect}
            className="p-1 rounded text-stone-300 dark:text-stone-600 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors opacity-0 group-hover:opacity-100"
            title={`Disconnect ${fullName}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
        <Link
          href={`/trees/${treeId}/person/${person.id}`}
          className="p-1 text-stone-400 dark:text-stone-500 group-hover:text-emerald-800 dark:group-hover:text-emerald-400 transition-transform group-hover:translate-x-0.5"
        >
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
