"use client";

import React, { useState, useMemo } from "react";
import { GitCompare, Sparkles, Users, GitCommit, Search, X, Check } from "lucide-react";
import { Person, Relationship, RelationshipResolution } from "@/types";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  getPersonFullName,
  getInitials,
  getAvatarColor,
  formatDateRange,
  cn,
} from "@/lib/utils";
import { FamilyGraph } from "@/domain/family-graph";
import { resolveRelationship } from "@/domain/relationship-engine";

interface RelationshipFinderModalProps {
  isOpen: boolean;
  onClose: () => void;
  people: Person[];
  relationships: Relationship[];
  initialPersonA?: Person | null;
  onHighlightPath?: (personIds: string[], edgeIds: string[]) => void;
}

export function RelationshipFinderModal({
  isOpen,
  onClose,
  people,
  relationships,
  initialPersonA,
  onHighlightPath,
}: RelationshipFinderModalProps) {
  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Relationship Discovery Engine"
      description="Search and select any two individuals to deterministically calculate their exact genealogical relationship across generations."
      maxWidth="xl"
    >
      {isOpen && (
        <RelationshipFinderForm
          people={people}
          relationships={relationships}
          initialPersonA={initialPersonA}
          onHighlightPath={onHighlightPath}
          onClose={onClose}
        />
      )}
    </Dialog>
  );
}

function SearchablePersonPicker({
  label,
  selectedPersonId,
  onSelect,
  people,
  excludePersonId,
}: {
  label: string;
  selectedPersonId: string;
  onSelect: (personId: string) => void;
  people: Person[];
  excludePersonId?: string;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const selectedPerson = people.find((p) => p.id === selectedPersonId);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return people
      .filter((p) => !excludePersonId || p.id !== excludePersonId)
      .filter((p) => {
        if (!q) return true;
        const fullName = getPersonFullName(p).toLowerCase();
        return fullName.includes(q) || (p.maidenName && p.maidenName.toLowerCase().includes(q));
      });
  }, [people, excludePersonId, searchQuery]);

  return (
    <div className="space-y-1.5 relative">
      <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 dark:text-stone-300">
        {label}
      </label>

      <div className="relative">
        <div className="relative flex items-center">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-400 dark:text-stone-500 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            placeholder={selectedPerson ? `Search to change (${getPersonFullName(selectedPerson)})...` : "Search by name..."}
            className="w-full rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 pl-8 pr-8 py-2 text-xs text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:border-emerald-600 focus:outline-hidden focus:ring-1 focus:ring-emerald-600"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Selected Person Summary Card */}
        {selectedPerson && !isOpen && (
          <div className="mt-2 flex items-center justify-between rounded-xl border border-stone-200/90 dark:border-stone-800 bg-stone-50/80 dark:bg-stone-900/60 p-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold border",
                  getAvatarColor(selectedPerson.id)
                )}
              >
                {getInitials(getPersonFullName(selectedPerson))}
              </div>
              <div className="min-w-0 truncate">
                <p className="truncate text-xs font-semibold text-stone-800 dark:text-stone-100">
                  {getPersonFullName(selectedPerson)}
                </p>
                <p className="text-[10px] text-stone-500 dark:text-stone-400">
                  {formatDateRange(selectedPerson.birthDate, selectedPerson.deathDate, selectedPerson.isLiving)}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(true)}
              className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400 hover:underline px-1"
            >
              Change
            </button>
          </div>
        )}

        {/* Search Results Dropdown Menu */}
        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-20"
              onClick={() => setIsOpen(false)}
            />
            <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-52 overflow-y-auto rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-1.5 shadow-xl space-y-1 animate-fade-in">
              {filtered.length === 0 ? (
                <div className="py-4 text-center text-xs text-stone-400 dark:text-stone-500">
                  No family members found matching &quot;{searchQuery}&quot;
                </div>
              ) : (
                filtered.map((p) => {
                  const name = getPersonFullName(p);
                  const isSelected = p.id === selectedPersonId;
                  const dates = formatDateRange(p.birthDate, p.deathDate, p.isLiving);

                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        onSelect(p.id);
                        setSearchQuery("");
                        setIsOpen(false);
                      }}
                      className={cn(
                        "flex w-full items-center justify-between gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors",
                        isSelected
                          ? "bg-emerald-800 text-white font-semibold shadow-xs"
                          : "hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-900 dark:text-stone-100"
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 truncate">
                        <div
                          className={cn(
                            "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold border",
                            isSelected ? "bg-white/20 text-white border-white/30" : getAvatarColor(p.id)
                          )}
                        >
                          {getInitials(name)}
                        </div>
                        <div className="truncate">
                          <span className="font-medium">{name}</span>
                          <span
                            className={cn(
                              "ml-1.5 text-[10px]",
                              isSelected ? "text-emerald-100" : "text-stone-400 dark:text-stone-500"
                            )}
                          >
                            · {dates}
                          </span>
                        </div>
                      </div>
                      {isSelected && <Check className="h-3.5 w-3.5 shrink-0 text-white" />}
                    </button>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function RelationshipFinderForm({
  people,
  relationships,
  initialPersonA,
  onHighlightPath,
  onClose,
}: {
  people: Person[];
  relationships: Relationship[];
  initialPersonA?: Person | null;
  onHighlightPath?: (personIds: string[], edgeIds: string[]) => void;
  onClose: () => void;
}) {
  const defaultPersonA = initialPersonA?.id || people[0]?.id || "";
  const defaultPersonB =
    people.find((p) => p.id !== defaultPersonA)?.id || people[1]?.id || "";

  const [personAId, setPersonAId] = useState<string>(defaultPersonA);
  const [personBId, setPersonBId] = useState<string>(defaultPersonB);
  const [result, setResult] = useState<RelationshipResolution | null>(null);

  const handleCalculate = () => {
    if (!personAId || !personBId) return;

    const graph = new FamilyGraph("workspace-tree", people, relationships);
    const res = resolveRelationship(graph, personAId, personBId);
    setResult(res);
  };

  const handleApplyHighlight = () => {
    if (!result) return;
    const nodeIds = new Set<string>();
    const edgeIds = new Set<string>();

    nodeIds.add(result.person1.id);
    nodeIds.add(result.person2.id);

    for (const ca of result.commonAncestors) {
      nodeIds.add(ca.ancestor.id);
    }

    for (const seg of result.shortestPath) {
      nodeIds.add(seg.from.id);
      nodeIds.add(seg.to.id);
      edgeIds.add(seg.relationship.id);
    }

    if (onHighlightPath) {
      onHighlightPath(Array.from(nodeIds), Array.from(edgeIds));
    }
    onClose();
  };

  return (
    <div className="space-y-6">
      {/* Searchable Selection Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
        <SearchablePersonPicker
          label="First Person"
          selectedPersonId={personAId}
          onSelect={(id) => {
            setPersonAId(id);
            setResult(null);
          }}
          people={people}
          excludePersonId={personBId}
        />

        <SearchablePersonPicker
          label="Second Person"
          selectedPersonId={personBId}
          onSelect={(id) => {
            setPersonBId(id);
            setResult(null);
          }}
          people={people}
          excludePersonId={personAId}
        />
      </div>

      {/* Action Button */}
      <div className="flex justify-center">
        <Button
          onClick={handleCalculate}
          disabled={!personAId || !personBId || personAId === personBId}
          className="gap-2 px-6 shadow-sm"
        >
          <GitCompare className="h-4 w-4" />
          Calculate Connection
        </Button>
      </div>

      {/* Discovery Results */}
      {result && (
        <div className="rounded-2xl border border-emerald-200/90 bg-emerald-50/40 p-5 space-y-4 animate-fade-in">
          {/* Top result banner */}
          <div className="flex items-center justify-between border-b border-emerald-100 pb-3">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-800">
                Inferred Relationship
              </span>
              <h3 className="text-xl font-serif font-bold text-stone-900 mt-0.5">
                {result.label}
              </h3>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-900 border border-emerald-200 capitalize">
                {result.nature}
              </span>
              {result.isBloodRelated && (
                <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-semibold text-stone-700 border border-stone-200">
                  Consanguineous
                </span>
              )}
            </div>
          </div>

          {/* Explanation */}
          <p className="text-sm leading-relaxed text-stone-700 bg-white/80 p-3.5 rounded-xl border border-emerald-100">
            {result.explanation}
          </p>

          {/* Common Ancestors */}
          {result.commonAncestors.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-stone-600 flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-emerald-700" />
                Common Ancestor(s):
              </span>
              <div className="flex flex-wrap gap-2">
                {result.commonAncestors.map((ca) => (
                  <span
                    key={ca.ancestor.id}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1 text-xs font-medium text-stone-800 border border-stone-200 shadow-2xs"
                  >
                    <span className="h-2 w-2 rounded-full bg-emerald-600" />
                    {getPersonFullName(ca.ancestor)} ({ca.distance1} gen / {ca.distance2} gen)
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Step-by-Step Path */}
          {result.shortestPath.length > 0 && (
            <div className="space-y-2 pt-2">
              <span className="text-xs font-semibold text-stone-600 flex items-center gap-1.5">
                <GitCommit className="h-3.5 w-3.5 text-emerald-700" />
                Connection Path ({result.shortestPath.length} step{result.shortestPath.length === 1 ? "" : "s"}):
              </span>
              <div className="space-y-1 rounded-xl bg-white/90 p-3 border border-stone-200/80 text-xs text-stone-700">
                {result.shortestPath.map((seg, idx) => (
                  <div key={idx} className="flex items-center gap-2 py-0.5">
                    <span className="font-semibold text-stone-900">
                      {getPersonFullName(seg.from)}
                    </span>
                    <span className="text-stone-400">→</span>
                    <span className="rounded-md bg-stone-100 px-2 py-0.5 text-[11px] font-medium text-emerald-800">
                      {seg.stepDescription}
                    </span>
                    <span className="text-stone-400">→</span>
                    <span className="font-semibold text-stone-900">
                      {getPersonFullName(seg.to)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Highlight button */}
          <div className="pt-2 flex justify-end">
            <Button
              variant="subtle"
              size="sm"
              onClick={handleApplyHighlight}
              className="gap-1.5 text-xs shadow-2xs"
            >
              <Sparkles className="h-3.5 w-3.5 text-emerald-700" />
              Highlight Path on Canvas
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
