"use client";

import React, { useState, useMemo } from "react";
import { Search, UserCheck, AlertCircle, UserPlus, X } from "lucide-react";
import { Person, Relationship, RelationshipType } from "@/types";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  getPersonFullName,
  formatDateRange,
  getInitials,
  getAvatarColor,
  isValidFlexibleDate,
  normalizeFlexibleDate,
  cn,
} from "@/lib/utils";
import { validateRelationship } from "@/domain/validation";

export type AddRelativeMode = "parent" | "child" | "spouse";

interface AddRelativeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPerson: Person;
  mode: AddRelativeMode;
  allPeople: Person[];
  existingRelationships: Relationship[];
  treeId: string;
  onSave: (relData: {
    personId1: string;
    personId2: string;
    type: RelationshipType;
    startDate?: string;
    notes?: string;
  }) => Promise<void> | void;
}

export function AddRelativeModal({
  isOpen,
  onClose,
  currentPerson,
  mode,
  allPeople,
  existingRelationships,
  treeId,
  onSave,
}: AddRelativeModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [marriageDate, setMarriageDate] = useState("");
  const [relSubtype, setRelSubtype] = useState<RelationshipType>(() => {
    if (mode === "parent" || mode === "child") return "parent-child";
    return "spouse";
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Determine people who already have this relationship with currentPerson
  const excludedPersonIds = useMemo(() => {
    const ids = new Set<string>([currentPerson.id]);

    for (const rel of existingRelationships) {
      if (mode === "parent") {
        // Exclude people who are already parents of currentPerson
        if (
          rel.personId2 === currentPerson.id &&
          (rel.type === "parent-child" ||
            rel.type === "adoptive-parent-child" ||
            rel.type === "step-parent-child")
        ) {
          ids.add(rel.personId1);
        }
      } else if (mode === "child") {
        // Exclude people who are already children of currentPerson
        if (
          rel.personId1 === currentPerson.id &&
          (rel.type === "parent-child" ||
            rel.type === "adoptive-parent-child" ||
            rel.type === "step-parent-child")
        ) {
          ids.add(rel.personId2);
        }
      } else if (mode === "spouse") {
        // Exclude people who are already current partners
        if (
          rel.type === "spouse" &&
          (rel.personId1 === currentPerson.id || rel.personId2 === currentPerson.id)
        ) {
          ids.add(rel.personId1 === currentPerson.id ? rel.personId2 : rel.personId1);
        }
      }
    }
    return ids;
  }, [currentPerson.id, existingRelationships, mode]);

  // Filter candidates matching search query
  const filteredCandidates = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return allPeople
      .filter((p) => !excludedPersonIds.has(p.id))
      .filter((p) => {
        if (!query) return true;
        const name = getPersonFullName(p).toLowerCase();
        const maiden = (p.maidenName || "").toLowerCase();
        const display = (p.displayName || "").toLowerCase();
        return (
          name.includes(query) ||
          maiden.includes(query) ||
          display.includes(query)
        );
      });
  }, [allPeople, excludedPersonIds, searchQuery]);

  const currentPersonName = getPersonFullName(currentPerson);

  const titleText =
    mode === "parent"
      ? `Add Parent for ${currentPersonName}`
      : mode === "child"
      ? `Add Child for ${currentPersonName}`
      : `Add Partner for ${currentPersonName}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPersonId) {
      setErrorMessage("Please select a person from the list.");
      return;
    }

    setErrorMessage(null);

    // Parent-child direction: personId1 is parent, personId2 is child
    let personId1: string;
    let personId2: string;

    if (mode === "parent") {
      personId1 = selectedPersonId; // Selected relative is parent
      personId2 = currentPerson.id; // currentPerson is child
    } else if (mode === "child") {
      personId1 = currentPerson.id; // currentPerson is parent
      personId2 = selectedPersonId; // Selected relative is child
    } else {
      personId1 = currentPerson.id;
      personId2 = selectedPersonId;
    }

    if (mode === "spouse" && marriageDate.trim()) {
      if (!isValidFlexibleDate(marriageDate)) {
        setErrorMessage("Enter a valid marriage year (e.g. 1972) or date (YYYY-MM-DD).");
        return;
      }
    }

    const startDate = mode === "spouse" ? normalizeFlexibleDate(marriageDate) : undefined;

    // Domain validation
    const peopleMap = new Map(allPeople.map((p) => [p.id, p]));
    const validation = validateRelationship(
      {
        treeId,
        personId1,
        personId2,
        type: relSubtype,
        startDate,
      },
      existingRelationships,
      peopleMap
    );

    if (!validation.isValid) {
      setErrorMessage(validation.errors.map((err) => err.message).join(". "));
      return;
    }

    try {
      setIsSubmitting(true);
      await onSave({
        personId1,
        personId2,
        type: relSubtype,
        startDate,
      });
      // Reset state and close
      setSearchQuery("");
      setSelectedPersonId(null);
      setMarriageDate("");
      setErrorMessage(null);
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to create relationship.";
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedCandidate = allPeople.find((p) => p.id === selectedPersonId);

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title={titleText} maxWidth="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Error Notice */}
        {errorMessage && (
          <div className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50/80 p-3 text-xs text-red-800">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
            <div className="flex-1 font-medium">{errorMessage}</div>
          </div>
        )}

        {/* Relationship Subtype Selection */}
        {mode === "parent" && (
          <Select
            label="Parentage Type"
            value={relSubtype}
            onChange={(e) => setRelSubtype(e.target.value as RelationshipType)}
            options={[
              { label: "Biological Parent", value: "parent-child" },
              { label: "Adoptive Parent", value: "adoptive-parent-child" },
              { label: "Step-Parent", value: "step-parent-child" },
            ]}
          />
        )}

        {mode === "child" && (
          <Select
            label="Child Relationship Type"
            value={relSubtype}
            onChange={(e) => setRelSubtype(e.target.value as RelationshipType)}
            options={[
              { label: "Biological Child", value: "parent-child" },
              { label: "Adoptive Child", value: "adoptive-parent-child" },
              { label: "Step-Child", value: "step-parent-child" },
            ]}
          />
        )}

        {mode === "spouse" && (
          <div className="space-y-3">
            <Select
              label="Partnership Status"
              value={relSubtype}
              onChange={(e) => setRelSubtype(e.target.value as RelationshipType)}
              options={[
                { label: "Current Spouse / Partner", value: "spouse" },
                { label: "Former Spouse / Partner", value: "former-spouse" },
              ]}
            />

            <div>
              <Input
                label="Marriage / Union Date (Optional)"
                placeholder="e.g. 1972 or 1972-06-15"
                value={marriageDate}
                onChange={(e) => {
                  setMarriageDate(e.target.value);
                  setErrorMessage(null);
                }}
              />
              <p className="mt-1 text-[11px] text-stone-500 dark:text-stone-400">
                Year only (e.g. 1972) or full date (YYYY-MM-DD). Displays on timeline and relative profiles.
              </p>
            </div>
          </div>
        )}

        {/* Search Bar for selecting related person */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300">
            {mode === "parent"
              ? "Select Parent"
              : mode === "child"
              ? "Select Child"
              : "Select Partner"}
          </label>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400 dark:text-stone-500 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search by name (e.g. Arthur, Chen)...`}
              className="w-full rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 pl-9 pr-8 py-2 text-xs text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:border-[#1B4D3E] dark:focus:border-emerald-500 focus:outline-hidden focus:ring-1 focus:ring-[#1B4D3E]"
              autoFocus
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 p-0.5"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Search Results List */}
        <div className="rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/40 p-1.5 max-h-56 overflow-y-auto space-y-1">
          {filteredCandidates.length === 0 ? (
            <div className="py-6 text-center text-xs text-stone-400 dark:text-stone-500">
              {searchQuery ? (
                <>No relatives found matching &quot;{searchQuery}&quot;</>
              ) : (
                <>No eligible candidates remaining in this tree</>
              )}
            </div>
          ) : (
            filteredCandidates.map((p) => {
              const name = getPersonFullName(p);
              const initials = getInitials(name);
              const years = formatDateRange(p.birthDate, p.deathDate, p.isLiving);
              const avatarColor = getAvatarColor(p.id);
              const isSelected = selectedPersonId === p.id;

              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedPersonId(p.id)}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left transition-all",
                    isSelected
                      ? "bg-[#1B4D3E] dark:bg-emerald-800 text-white shadow-xs"
                      : "bg-white dark:bg-stone-900 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-900 dark:text-stone-100 border border-stone-200/60 dark:border-stone-800"
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold border",
                        isSelected ? "bg-white/20 text-white border-white/30" : avatarColor
                      )}
                    >
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <p
                        className={cn(
                          "truncate text-xs font-semibold",
                          isSelected ? "text-white" : "text-stone-900 dark:text-stone-100"
                        )}
                      >
                        {name}
                      </p>
                      <p
                        className={cn(
                          "text-[10px]",
                          isSelected ? "text-emerald-100 dark:text-emerald-200" : "text-stone-500 dark:text-stone-400"
                        )}
                      >
                        {years} {p.occupation ? `· ${p.occupation}` : ""}
                      </p>
                    </div>
                  </div>

                  {isSelected && (
                    <UserCheck className="h-4 w-4 shrink-0 text-white" />
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Confirmation Summary */}
        {selectedCandidate && (
          <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 p-2.5 text-xs text-emerald-900 dark:text-emerald-200 flex items-center justify-between">
            <div>
              <span className="font-semibold">{getPersonFullName(selectedCandidate)}</span>{" "}
              will be connected as{" "}
              <strong className="underline">
                {mode === "parent"
                  ? "parent"
                  : mode === "child"
                  ? "child"
                  : "partner"}
              </strong>{" "}
              to {currentPersonName}
              {mode === "spouse" && marriageDate.trim()
                ? ` (married ${marriageDate.trim()})`
                : ""}
              .
            </div>
          </div>
        )}

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100 dark:border-stone-800">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={!selectedPersonId || isSubmitting}
            className="gap-1.5"
          >
            <UserPlus className="h-3.5 w-3.5" />
            {isSubmitting ? "Connecting..." : "Connect"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
