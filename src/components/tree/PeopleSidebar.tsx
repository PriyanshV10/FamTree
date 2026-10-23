"use client";

import React, { useState, useMemo } from "react";
import { Search, UserPlus, Users, ChevronRight, X } from "lucide-react";
import { Person, Relationship } from "@/types";
import { cn, formatDateRange, getInitials, getPersonFullName, getAvatarColor } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { computeGenerations } from "./tree-layout";
import { ReferencePersonConfig } from "@/lib/reference-person";

interface PeopleSidebarProps {
  people: Person[];
  relationships?: Relationship[];
  selectedPerson: Person | null;
  referencePersonConfig?: ReferencePersonConfig | null;
  isReadOnly?: boolean;
  onSelectPerson: (person: Person) => void;
  onAddPerson: () => void;
  isOpen: boolean;
  onToggle: () => void;
}

export function PeopleSidebar({
  people,
  relationships = [],
  selectedPerson,
  referencePersonConfig,
  isReadOnly = false,
  onSelectPerson,
  onAddPerson,
  isOpen,
  onToggle,
}: PeopleSidebarProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "living" | "deceased">("all");
  const [generationFilter, setGenerationFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"name" | "birthYear" | "generation">("name");

  // Compute generation ranks anchored to reference person
  const generations = useMemo(() => {
    return computeGenerations(people, relationships, referencePersonConfig);
  }, [people, relationships, referencePersonConfig]);

  const uniqueGens = useMemo(() => {
    const set = new Set<number>();
    generations.forEach((g) => set.add(g));
    return Array.from(set).sort((a, b) => a - b);
  }, [generations]);

  const filteredAndSortedPeople = useMemo(() => {
    const filtered = people.filter((p) => {
      const fullName = getPersonFullName(p).toLowerCase();
      const matchesSearch =
        fullName.includes(searchTerm.toLowerCase()) ||
        (p.occupation && p.occupation.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (p.birthplace && p.birthplace.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "living" && p.isLiving) ||
        (statusFilter === "deceased" && !p.isLiving);

      const gen = generations.get(p.id) ?? 0;
      const matchesGeneration =
        generationFilter === "all" || gen.toString() === generationFilter;

      return matchesSearch && matchesStatus && matchesGeneration;
    });

    return filtered.sort((a, b) => {
      if (sortBy === "name") {
        return getPersonFullName(a).localeCompare(getPersonFullName(b));
      } else if (sortBy === "birthYear") {
        const yA = a.birthDate ? parseInt(a.birthDate.split("-")[0], 10) : 9999;
        const yB = b.birthDate ? parseInt(b.birthDate.split("-")[0], 10) : 9999;
        return yA - yB;
      } else if (sortBy === "generation") {
        const gA = generations.get(a.id) ?? 0;
        const gB = generations.get(b.id) ?? 0;
        return gA - gB;
      }
      return 0;
    });
  }, [people, searchTerm, statusFilter, generationFilter, sortBy, generations]);

  return (
    <>
      {/* Mobile backdrop overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 backdrop-blur-xs md:hidden animate-fade-in"
          onClick={onToggle}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "fixed md:static inset-y-0 left-0 z-30 flex flex-col w-84 max-w-[85vw] border-r border-stone-200/80 dark:border-stone-800 bg-white dark:bg-[#141A16] transition-all duration-300 ease-in-out shadow-xs",
          isOpen
            ? "translate-x-0 md:w-84"
            : "-translate-x-full md:w-0 md:border-r-0 md:overflow-hidden md:opacity-0 md:pointer-events-none"
        )}
      >
        {/* Sidebar Header */}
      <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 p-3.5">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-emerald-800 dark:text-emerald-400" />
          <h3 className="font-serif font-bold text-stone-900 dark:text-stone-100">People</h3>
          <span className="rounded-full bg-stone-100 dark:bg-stone-800 px-2 py-0.5 text-xs font-semibold text-stone-600 dark:text-stone-300">
            {filteredAndSortedPeople.length}
            {filteredAndSortedPeople.length !== people.length && ` / ${people.length}`}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {!isReadOnly && (
            <Button
              size="sm"
              onClick={onAddPerson}
              className="h-8 gap-1 text-xs px-2.5"
              title="Add Person"
            >
              <UserPlus className="h-3.5 w-3.5" />
              Add
            </Button>
          )}
          <button
            onClick={onToggle}
            className="md:hidden rounded-lg p-1 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800"
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Search & Filter Controls */}
      <div className="p-3 border-b border-stone-100 dark:border-stone-800 space-y-2.5">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-stone-400 dark:text-stone-500" />
          <input
            type="text"
            placeholder="Search by name, place, occupation..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50/60 dark:bg-stone-900/60 py-2 pl-9 pr-7 text-xs text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:bg-white dark:focus:bg-stone-900 focus:border-emerald-600 focus:outline-hidden focus:ring-1 focus:ring-emerald-600"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-2.5 top-2.5 text-xs text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
            >
              ×
            </button>
          )}
        </div>

        {/* Filters Grid */}
        <div className="flex items-center justify-between gap-1.5">
          {/* Status Pills */}
          <div className="flex gap-1">
            {(["all", "living", "deceased"] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={cn(
                  "rounded-md px-2 py-0.5 text-[11px] font-medium capitalize transition-colors",
                  statusFilter === status
                    ? "bg-emerald-800 dark:bg-emerald-700 text-white"
                    : "bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700"
                )}
              >
                {status}
              </button>
            ))}
          </div>

          {/* Sort Menu */}
          <div className="flex items-center gap-1 text-[11px]">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "name" | "birthYear" | "generation")}
              className="rounded-md border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 py-0.5 px-1.5 text-[11px] text-stone-700 dark:text-stone-300"
              title="Sort People"
            >
              <option value="name">Name (A-Z)</option>
              <option value="birthYear">Birth Year</option>
              <option value="generation">Generation</option>
            </select>
          </div>
        </div>

        {/* Generation Filter Dropdown */}
        {uniqueGens.length > 1 && (
          <div className="flex items-center justify-between gap-2 pt-1 border-t border-stone-100 dark:border-stone-800/80 text-[11px]">
            <span className="text-stone-500 dark:text-stone-400">Generation:</span>
            <select
              value={generationFilter}
              onChange={(e) => setGenerationFilter(e.target.value)}
              className="rounded-md border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 py-0.5 px-2 text-[11px] text-stone-700 dark:text-stone-300"
            >
              <option value="all">All Generations ({people.length})</option>
              {uniqueGens.map((g) => {
                const isRef = g === (referencePersonConfig?.baseGeneration ?? 0);
                const label = isRef
                  ? `Gen ${g} (Reference Anchor)`
                  : g < (referencePersonConfig?.baseGeneration ?? 0)
                  ? `Gen ${g} (Ancestors)`
                  : `Gen +${g} (Descendants)`;
                return (
                  <option key={g} value={g.toString()}>
                    {label}
                  </option>
                );
              })}
            </select>
          </div>
        )}
      </div>

      {/* People List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {filteredAndSortedPeople.length === 0 ? (
          <div className="p-6 text-center text-xs text-stone-400 dark:text-stone-500">
            No family members match your filter criteria.
          </div>
        ) : (
          filteredAndSortedPeople.map((person) => {
            const fullName = getPersonFullName(person);
            const initials = getInitials(fullName);
            const isSelected = selectedPerson?.id === person.id;
            const years = formatDateRange(person.birthDate, person.deathDate, person.isLiving);
            const avatarColor = getAvatarColor(person.id);
            const gen = generations.get(person.id) ?? 0;
            const isRef =
              referencePersonConfig?.personId === person.id ||
              (!referencePersonConfig?.personId && people[0]?.id === person.id);

            return (
              <button
                key={person.id}
                onClick={() => onSelectPerson(person)}
                className={cn(
                  "group flex w-full items-center gap-2.5 rounded-lg p-2 text-left transition-all",
                  isSelected
                    ? "bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/80 shadow-2xs"
                    : "hover:bg-stone-50 dark:hover:bg-stone-800/60 border border-transparent"
                )}
              >
                <div
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold tracking-wider",
                    avatarColor
                  )}
                >
                  {initials}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p
                      className={cn(
                        "truncate text-xs font-semibold text-stone-900 dark:text-stone-100 group-hover:text-emerald-900 dark:group-hover:text-emerald-300",
                        isSelected && "text-emerald-950 dark:text-emerald-200 font-bold"
                      )}
                    >
                      {fullName}
                    </p>
                    <span
                      className={cn(
                        "shrink-0 rounded px-1 py-0.2 text-[9px] font-mono",
                        isRef
                          ? "bg-emerald-100 dark:bg-emerald-900/80 text-emerald-800 dark:text-emerald-300 font-bold"
                          : "bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400"
                      )}
                    >
                      {isRef ? "★ Ref" : gen > 0 ? `G+${gen}` : `G${gen}`}
                    </span>
                  </div>
                  <p className="truncate text-[11px] text-stone-400 dark:text-stone-500">
                    {years}
                    {person.occupation && ` · ${person.occupation}`}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-stone-300 dark:text-stone-600 group-hover:text-stone-500 dark:group-hover:text-stone-400" />
              </button>
            );
          })
        )}
      </div>
    </aside>
  </>
);
}
