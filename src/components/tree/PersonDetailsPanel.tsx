"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  X,
  ExternalLink,
  GitCompare,
  Edit3,
  MapPin,
  Briefcase,
  Calendar,
  Users,
  ChevronRight,
  Trash2,
  Unlink,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Target,
  Sparkles,
} from "lucide-react";
import { Person, Relationship, RelationshipType } from "@/types";
import {
  cn,
  formatDateRange,
  formatDateByPreference,
  getInitials,
  getPersonFullName,
  getAvatarColor,
} from "@/lib/utils";
import { FamilyGraph } from "@/domain/family-graph";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { AddRelativeModal, AddRelativeMode } from "@/components/relationship/AddRelativeModal";

interface PersonDetailsPanelProps {
  person: Person | null;
  treeId: string;
  graph: FamilyGraph;
  allPeople: Person[];
  existingRelationships: Relationship[];
  referencePersonId?: string;
  isReadOnly?: boolean;
  onSetReferencePerson?: (person: Person) => void;
  onClose: () => void;
  onEdit: (person: Person) => void;
  onDeletePerson: (person: Person) => void;
  onFindRelationship: (person: Person) => void;
  onSelectRelative: (person: Person) => void;
  onHighlightAncestors: (person: Person) => void;
  onHighlightDescendants: (person: Person) => void;
  onAddRelationship: (relData: {
    personId1: string;
    personId2: string;
    type: RelationshipType;
    startDate?: string;
    notes?: string;
  }) => Promise<void> | void;
  onRemoveRelationship: (relationshipId: string) => void;
}

export function PersonDetailsPanel({
  person,
  treeId,
  graph,
  allPeople,
  existingRelationships,
  referencePersonId,
  isReadOnly = false,
  onClose,
  onEdit,
  onDeletePerson,
  onFindRelationship,
  onSelectRelative,
  onHighlightAncestors,
  onHighlightDescendants,
  onAddRelationship,
  onRemoveRelationship,
  onSetReferencePerson,
}: PersonDetailsPanelProps) {
  const [confirmDeletePerson, setConfirmDeletePerson] = useState(false);
  const [relToDelete, setRelToDelete] = useState<{ id: string; targetName: string } | null>(null);
  const [addRelativeMode, setAddRelativeMode] = useState<AddRelativeMode | null>(null);

  if (!person) return null;

  const fullName = getPersonFullName(person);
  const initials = getInitials(fullName);
  const years = formatDateRange(person.birthDate, person.deathDate, person.isLiving);
  const avatarColor = getAvatarColor(person.id);

  // Directly query the domain graph
  const parents = graph.getParents(person.id);
  const spouses = graph.getSpouses(person.id, true);
  const siblings = graph.getSiblings(person.id);
  const children = graph.getChildren(person.id);

  return (
    <aside
      className="fixed inset-y-0 right-0 z-30 flex w-full max-w-sm flex-col border-l border-stone-200/80 dark:border-stone-800 bg-white dark:bg-[#141A16] text-stone-900 dark:text-stone-100 shadow-xl animate-fade-in sm:max-w-md transition-colors"
      aria-labelledby="person-panel-title"
    >
      {/* Top Bar */}
      <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 px-5 py-4">
        <span className="text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
          Person Overview
        </span>
        <button
          onClick={onClose}
          aria-label="Close details panel"
          className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-stone-700 dark:hover:text-stone-200 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
        {/* Profile Card */}
        <div className="flex items-start gap-4">
          <div
            className={cn(
              "flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border text-lg font-bold shadow-xs",
              avatarColor
            )}
          >
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <h2
              id="person-panel-title"
              className="text-lg font-serif font-bold text-stone-900 dark:text-stone-100 leading-tight"
            >
              {fullName}
            </h2>
            <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400 font-medium">{years}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] font-medium border",
                  person.isLiving
                    ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                    : "bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 border-stone-200 dark:border-stone-700"
                )}
              >
                {person.isLiving ? "Living" : "Deceased"}
              </span>
              <span className="rounded-full bg-stone-100 dark:bg-stone-800 px-2 py-0.5 text-[10px] font-medium text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-700 capitalize">
                {person.gender}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className={cn("gap-2", isReadOnly ? "flex" : "grid grid-cols-2")}>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onFindRelationship(person)}
            className="w-full gap-1.5 text-xs"
          >
            <GitCompare className="h-3.5 w-3.5 text-emerald-700" />
            Find Relation
          </Button>
          {!isReadOnly && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(person)}
              className="w-full gap-1.5 text-xs"
            >
              <Edit3 className="h-3.5 w-3.5 text-stone-600" />
              Edit Profile
            </Button>
          )}
        </div>

        {/* Generational Lineage Actions */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <Button
            variant="subtle"
            size="sm"
            onClick={() => onHighlightAncestors(person)}
            className="w-full gap-1 text-[11px]"
            title="Highlight all ancestors of this person"
          >
            <ArrowUpRight className="h-3.5 w-3.5 text-emerald-800" />
            Ancestors
          </Button>
          <Button
            variant="subtle"
            size="sm"
            onClick={() => onHighlightDescendants(person)}
            className="w-full gap-1 text-[11px]"
            title="Highlight all descendants of this person"
          >
            <ArrowDownRight className="h-3.5 w-3.5 text-emerald-800" />
            Descendants
          </Button>
        </div>

        {/* Reference Person Generational Anchor Status / Action */}
        {onSetReferencePerson && (
          <div className="pt-0.5">
            {referencePersonId === person.id ? (
              <div className="flex items-center gap-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-3 py-2 text-xs text-emerald-800 dark:text-emerald-300">
                <Sparkles className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <div className="flex-1 min-w-0">
                  <span className="font-semibold block">Reference Person (Anchor)</span>
                  <span className="text-[11px] text-emerald-700 dark:text-emerald-400 block leading-tight">
                    Generations for all family members are calculated from this person.
                  </span>
                </div>
              </div>
            ) : !isReadOnly ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onSetReferencePerson(person)}
                className="w-full gap-1.5 text-xs text-stone-700 dark:text-stone-300 hover:text-emerald-800 dark:hover:text-emerald-300 hover:border-emerald-300 dark:hover:border-emerald-700"
                title="Fix this person as the generational reference anchor for the tree"
              >
                <Target className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-400" />
                Set as Reference Person
              </Button>
            ) : null}
          </div>
        )}

        {/* Biographical Details */}
        <div className="rounded-xl border border-stone-100 bg-stone-50/60 p-4 space-y-2.5 text-xs">
          {person.birthplace && (
            <div className="flex items-center gap-2 text-stone-700">
              <MapPin className="h-4 w-4 shrink-0 text-stone-400" />
              <span>
                <strong className="font-semibold text-stone-800">Born:</strong>{" "}
                {person.birthplace}
              </span>
            </div>
          )}
          {person.occupation && (
            <div className="flex items-center gap-2 text-stone-700">
              <Briefcase className="h-4 w-4 shrink-0 text-stone-400" />
              <span>
                <strong className="font-semibold text-stone-800">Career:</strong>{" "}
                {person.occupation}
              </span>
            </div>
          )}
          <div className="flex items-center gap-2 text-stone-700">
            <Calendar className="h-4 w-4 shrink-0 text-stone-400" />
            <span>
              <strong className="font-semibold text-stone-800">Timeline:</strong>{" "}
              {person.birthDate ? formatDateByPreference(person.birthDate) : "Unknown"}
              {person.deathDate ? ` to ${formatDateByPreference(person.deathDate)}` : ""}
            </span>
          </div>
        </div>

        {/* Biography */}
        {person.biography && (
          <div className="space-y-1.5">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-500">
              Biographical Notes
            </h4>
            <p className="text-xs leading-relaxed text-stone-600 bg-white p-3.5 rounded-xl border border-stone-100">
              {person.biography}
            </p>
          </div>
        )}

        {/* Immediate Relatives Section */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-emerald-800" />
            Immediate Relatives (Domain Graph)
          </h4>

          {/* Parents */}
          <div className="space-y-1">
            <div className="flex items-center justify-between pb-0.5">
              <p className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">Parents</p>
              {!isReadOnly && (
                <button
                  type="button"
                  onClick={() => setAddRelativeMode("parent")}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-800 hover:text-emerald-950 hover:underline transition-colors"
                  title={`Add parent for ${fullName}`}
                >
                  <Plus className="h-3 w-3" /> Add Parent
                </button>
              )}
            </div>
            {parents.length === 0 ? (
              <p className="text-xs text-stone-400 italic">None recorded</p>
            ) : (
              parents.map(({ person: p, relationship: r }) => (
                <RelativeRowWithActions
                  key={r.id}
                  person={p}
                  relationshipLabel={
                    r.type === "adoptive-parent-child"
                      ? "Adoptive Parent"
                      : r.type === "step-parent-child"
                      ? "Step-Parent"
                      : "Parent"
                  }
                  onSelect={onSelectRelative}
                  onDisconnect={
                    isReadOnly
                      ? undefined
                      : () =>
                          setRelToDelete({
                            id: r.id,
                            targetName: getPersonFullName(p),
                          })
                  }
                />
              ))
            )}
          </div>

          {/* Spouses / Partners */}
          <div className="space-y-1">
            <div className="flex items-center justify-between pb-0.5">
              <p className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">Spouse / Partner</p>
              {!isReadOnly && (
                <button
                  type="button"
                  onClick={() => setAddRelativeMode("spouse")}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-800 hover:text-emerald-950 hover:underline transition-colors"
                  title={`Add partner for ${fullName}`}
                >
                  <Plus className="h-3 w-3" /> Add Partner
                </button>
              )}
            </div>
            {spouses.length === 0 ? (
              <p className="text-xs text-stone-400 italic">None recorded</p>
            ) : (
              spouses.map(({ person: p, relationship: r }) => (
                <RelativeRowWithActions
                  key={r.id}
                  person={p}
                  relationshipLabel={
                    r.type === "former-spouse"
                      ? `Former Partner${r.startDate ? ` (m. ${r.startDate})` : ""}`
                      : `Partner${r.startDate ? ` (m. ${r.startDate})` : ""}`
                  }
                  onSelect={onSelectRelative}
                  onDisconnect={
                    isReadOnly
                      ? undefined
                      : () =>
                          setRelToDelete({
                            id: r.id,
                            targetName: getPersonFullName(p),
                          })
                  }
                />
              ))
            )}
          </div>

          {/* Siblings */}
          <div className="space-y-1">
            <p className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider pb-0.5">Siblings</p>
            {siblings.length === 0 ? (
              <p className="text-xs text-stone-400 italic">None recorded</p>
            ) : (
              siblings.map(({ person: p, type }) => (
                <RelativeRowWithActions
                  key={p.id}
                  person={p}
                  relationshipLabel={`${type.charAt(0).toUpperCase() + type.slice(1)} Sibling`}
                  onSelect={onSelectRelative}
                />
              ))
            )}
          </div>

          {/* Children */}
          <div className="space-y-1">
            <div className="flex items-center justify-between pb-0.5">
              <p className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">Children</p>
              {!isReadOnly && (
                <button
                  type="button"
                  onClick={() => setAddRelativeMode("child")}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-800 hover:text-emerald-950 hover:underline transition-colors"
                  title={`Add child for ${fullName}`}
                >
                  <Plus className="h-3 w-3" /> Add Child
                </button>
              )}
            </div>
            {children.length === 0 ? (
              <p className="text-xs text-stone-400 italic">None recorded</p>
            ) : (
              children.map(({ person: p, relationship: r }) => (
                <RelativeRowWithActions
                  key={r.id}
                  person={p}
                  relationshipLabel={
                    r.type === "adoptive-parent-child"
                      ? "Adoptive Child"
                      : r.type === "step-parent-child"
                      ? "Step-Child"
                      : "Child"
                  }
                  onSelect={onSelectRelative}
                  onDisconnect={
                    isReadOnly
                      ? undefined
                      : () =>
                          setRelToDelete({
                            id: r.id,
                            targetName: getPersonFullName(p),
                          })
                  }
                />
              ))
            )}
          </div>
        </div>

        {/* Delete Person Action */}
        {!isReadOnly && (
          <div className="pt-2 border-t border-stone-100">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setConfirmDeletePerson(true)}
              className="w-full text-rose-600 hover:text-rose-700 hover:bg-rose-50 gap-1.5 text-xs"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete Person from Tree
            </Button>
          </div>
        )}
      </div>

      {/* Footer link to Profile Page */}
      <div className="border-t border-stone-100 p-4 bg-stone-50/70">
        <Link
          href={`/trees/${treeId}/person/${person.id}`}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-stone-900 py-2.5 text-xs font-semibold text-white hover:bg-stone-800 transition-colors"
        >
          <span>View Full Profile Page</span>
          <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Confirm Person Deletion Dialog */}
      <ConfirmDialog
        isOpen={confirmDeletePerson}
        onClose={() => setConfirmDeletePerson(false)}
        onConfirm={() => onDeletePerson(person)}
        title="Delete Family Member"
        description={`Are you sure you want to delete ${fullName} from this family tree? This will also remove all relationships involving ${fullName}.`}
        confirmLabel="Delete Person"
        isDestructive={true}
      />

      {/* Confirm Relationship Disconnect Dialog */}
      <ConfirmDialog
        isOpen={relToDelete !== null}
        onClose={() => setRelToDelete(null)}
        onConfirm={() => {
          if (relToDelete) {
            onRemoveRelationship(relToDelete.id);
            setRelToDelete(null);
          }
        }}
        title="Disconnect Relationship"
        description={`Are you sure you want to remove the relationship between ${fullName} and ${relToDelete?.targetName || "this relative"}?`}
        confirmLabel="Disconnect"
        isDestructive={true}
      />

      {/* Add Relative (Parent / Child / Partner) Modal with Search Bar */}
      {addRelativeMode && (
        <AddRelativeModal
          isOpen={addRelativeMode !== null}
          onClose={() => setAddRelativeMode(null)}
          currentPerson={person}
          mode={addRelativeMode}
          allPeople={allPeople}
          existingRelationships={existingRelationships}
          treeId={treeId}
          onSave={onAddRelationship}
        />
      )}
    </aside>
  );
}

function RelativeRowWithActions({
  person,
  relationshipLabel,
  onSelect,
  onDisconnect,
}: {
  person: Person;
  relationshipLabel: string;
  onSelect: (person: Person) => void;
  onDisconnect?: () => void;
}) {
  const fullName = getPersonFullName(person);
  const initials = getInitials(fullName);
  const avatarColor = getAvatarColor(person.id);

  return (
    <div className="flex items-center justify-between rounded-lg p-2 transition-colors border border-stone-100/60 dark:border-stone-800 bg-white dark:bg-[#18201B] hover:bg-stone-50/80 dark:hover:bg-stone-800/80">
      <button
        onClick={() => onSelect(person)}
        className="flex items-center gap-2.5 min-w-0 flex-1 text-left"
      >
        <div
          className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold",
            avatarColor
          )}
        >
          {initials}
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-stone-800 dark:text-stone-100">
            {fullName}
          </p>
          <p className="text-[10px] text-stone-400 dark:text-stone-500">{relationshipLabel}</p>
        </div>
      </button>

      <div className="flex items-center gap-1 shrink-0">
        {onDisconnect && (
          <button
            onClick={onDisconnect}
            className="rounded p-1 text-stone-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
            title="Disconnect relationship"
            aria-label={`Disconnect relationship with ${fullName}`}
          >
            <Unlink className="h-3.5 w-3.5" />
          </button>
        )}
        <button
          onClick={() => onSelect(person)}
          className="rounded p-1 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
          aria-label="View relative"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
