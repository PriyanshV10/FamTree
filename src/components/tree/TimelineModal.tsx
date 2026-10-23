"use client";

import React, { useState, useMemo } from "react";
import { Heart, Sparkles, Cross, MapPin, ChevronRight } from "lucide-react";
import { Person, Relationship } from "@/types";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getPersonFullName, getAvatarColor, getInitials } from "@/lib/utils";

interface TimelineEvent {
  id: string;
  year: number;
  dateStr?: string;
  type: "birth" | "marriage" | "death";
  title: string;
  subtitle?: string;
  place?: string;
  personId: string;
  partnerId?: string;
  notes?: string;
}

interface TimelineModalProps {
  isOpen: boolean;
  onClose: () => void;
  people: Person[];
  relationships: Relationship[];
  onSelectPerson: (person: Person) => void;
}

export function TimelineModal({
  isOpen,
  onClose,
  people,
  relationships,
  onSelectPerson,
}: TimelineModalProps) {
  const [filterType, setFilterType] = useState<"all" | "birth" | "marriage" | "death">("all");
  const [selectedDecade, setSelectedDecade] = useState<string>("all");

  const personMap = useMemo(() => {
    const map = new Map<string, Person>();
    people.forEach((p) => map.set(p.id, p));
    return map;
  }, [people]);

  // Aggregate all milestones chronologically
  const events = useMemo(() => {
    const list: TimelineEvent[] = [];

    // 1. Births
    for (const p of people) {
      if (p.birthDate) {
        const year = parseInt(p.birthDate.split("-")[0], 10);
        if (!isNaN(year)) {
          list.push({
            id: `birth-${p.id}`,
            year,
            dateStr: p.birthDate,
            type: "birth",
            title: `Birth of ${getPersonFullName(p)}`,
            subtitle: p.occupation ? `Later: ${p.occupation}` : undefined,
            place: p.birthplace,
            personId: p.id,
            notes: p.biography,
          });
        }
      }
    }

    // 2. Marriages / Unions
    const processedSpouseRels = new Set<string>();
    for (const rel of relationships) {
      if (rel.type === "spouse" || rel.type === "former-spouse") {
        const pairKey = [rel.personId1, rel.personId2].sort().join("-");
        if (processedSpouseRels.has(pairKey)) continue;
        processedSpouseRels.add(pairKey);

        const p1 = personMap.get(rel.personId1);
        const p2 = personMap.get(rel.personId2);
        if (!p1 || !p2) continue;

        let year = rel.startDate ? parseInt(rel.startDate.split("-")[0], 10) : undefined;
        // If relationship date not recorded, estimate between generation average or skip
        if (!year && p1.birthDate && p2.birthDate) {
          const y1 = parseInt(p1.birthDate.split("-")[0], 10);
          const y2 = parseInt(p2.birthDate.split("-")[0], 10);
          if (!isNaN(y1) && !isNaN(y2)) {
            year = Math.max(y1, y2) + 26; // Generational average estimate
          }
        }

        if (year && !isNaN(year)) {
          list.push({
            id: `marr-${rel.id}`,
            year,
            dateStr: rel.startDate,
            type: "marriage",
            title: `Marriage of ${p1.firstName} & ${p2.firstName}`,
            subtitle: `${getPersonFullName(p1)} and ${getPersonFullName(p2)}`,
            personId: p1.id,
            partnerId: p2.id,
            notes: rel.notes,
          });
        }
      }
    }

    // 3. Deaths
    for (const p of people) {
      if (!p.isLiving && p.deathDate) {
        const year = parseInt(p.deathDate.split("-")[0], 10);
        if (!isNaN(year)) {
          let age: number | undefined;
          if (p.birthDate) {
            const bYear = parseInt(p.birthDate.split("-")[0], 10);
            if (!isNaN(bYear)) {
              age = year - bYear;
            }
          }

          list.push({
            id: `death-${p.id}`,
            year,
            dateStr: p.deathDate,
            type: "death",
            title: `Passing of ${getPersonFullName(p)}`,
            subtitle: age !== undefined ? `Lived to age ${age}` : undefined,
            place: p.birthplace,
            personId: p.id,
          });
        }
      }
    }

    // Sort chronologically ascending
    return list.sort((a, b) => a.year - b.year);
  }, [people, relationships, personMap]);

  // Extract decades for filter
  const decades = useMemo(() => {
    const set = new Set<number>();
    events.forEach((e) => {
      const dec = Math.floor(e.year / 10) * 10;
      set.add(dec);
    });
    return Array.from(set).sort((a, b) => a - b);
  }, [events]);

  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      const matchesType = filterType === "all" || e.type === filterType;
      const decadeNum = Math.floor(e.year / 10) * 10;
      const matchesDecade = selectedDecade === "all" || decadeNum.toString() === selectedDecade;
      return matchesType && matchesDecade;
    });
  }, [events, filterType, selectedDecade]);

  const handleSelectEvent = (event: TimelineEvent) => {
    const p = personMap.get(event.personId);
    if (p) {
      onSelectPerson(p);
      onClose();
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Generational Milestone Timeline"
      description="Chronological journey of births, unions, and historical milestones across your family's history."
      maxWidth="xl"
    >
      {/* Controls & Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 dark:border-stone-800 pb-3 mb-4">
        {/* Type pills */}
        <div className="flex items-center gap-1">
          <Button
            variant={filterType === "all" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setFilterType("all")}
            className="h-7 text-xs"
          >
            All Events ({events.length})
          </Button>
          <Button
            variant={filterType === "birth" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setFilterType("birth")}
            className="h-7 text-xs gap-1 text-emerald-800 dark:text-emerald-300"
          >
            <Sparkles className="h-3 w-3" />
            Births
          </Button>
          <Button
            variant={filterType === "marriage" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setFilterType("marriage")}
            className="h-7 text-xs gap-1 text-rose-800 dark:text-rose-300"
          >
            <Heart className="h-3 w-3" />
            Unions
          </Button>
          <Button
            variant={filterType === "death" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setFilterType("death")}
            className="h-7 text-xs gap-1 text-stone-600 dark:text-stone-400"
          >
            <Cross className="h-3 w-3" />
            Passings
          </Button>
        </div>

        {/* Decade Selector */}
        {decades.length > 1 && (
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-stone-500">Era:</span>
            <select
              value={selectedDecade}
              onChange={(e) => setSelectedDecade(e.target.value)}
              className="rounded-md border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 py-1 px-2 text-xs text-stone-800 dark:text-stone-200"
            >
              <option value="all">All Decades</option>
              {decades.map((d) => (
                <option key={d} value={d.toString()}>
                  {d}s
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Timeline Stream */}
      <div className="max-h-[60vh] overflow-y-auto pr-1 space-y-6">
        {filteredEvents.length === 0 ? (
          <div className="py-12 text-center text-xs text-stone-400 dark:text-stone-500">
            No milestones found matching your filter criteria.
          </div>
        ) : (
          <div className="relative pl-6 space-y-6 border-l-2 border-stone-200 dark:border-stone-800 ml-4">
            {filteredEvents.map((event) => {
              const p = personMap.get(event.personId);
              const initials = p ? getInitials(getPersonFullName(p)) : "?";
              const avatarColor = p ? getAvatarColor(p.id) : "bg-stone-100";

              return (
                <div
                  key={event.id}
                  onClick={() => handleSelectEvent(event)}
                  className="relative group cursor-pointer transition-transform hover:-translate-x-0.5"
                >
                  {/* Timeline Node Dot */}
                  <div
                    className={`absolute -left-[31px] top-1.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white dark:border-[#141A16] shadow-2xs ${
                      event.type === "birth"
                        ? "bg-emerald-600 text-white"
                        : event.type === "marriage"
                        ? "bg-rose-500 text-white"
                        : "bg-stone-500 text-white"
                    }`}
                  >
                    {event.type === "birth" && <Sparkles className="h-3 w-3" />}
                    {event.type === "marriage" && <Heart className="h-3 w-3" />}
                    {event.type === "death" && <Cross className="h-3 w-3" />}
                  </div>

                  {/* Event Card */}
                  <div className="rounded-xl border border-stone-200/90 dark:border-stone-800 bg-white dark:bg-[#141A16] p-3.5 shadow-2xs hover:border-emerald-500/80 dark:hover:border-emerald-500/80 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold ${avatarColor}`}
                        >
                          {initials}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-stone-900 dark:text-stone-100 group-hover:text-emerald-800 dark:group-hover:text-emerald-300 transition-colors">
                              {event.title}
                            </span>
                            <span className="rounded-md bg-stone-100 dark:bg-stone-800 px-1.5 py-0.5 text-[10px] font-mono font-bold text-stone-700 dark:text-stone-300">
                              {event.year}
                            </span>
                          </div>
                          {event.subtitle && (
                            <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
                              {event.subtitle}
                            </p>
                          )}
                        </div>
                      </div>

                      <ChevronRight className="h-4 w-4 shrink-0 text-stone-300 dark:text-stone-600 group-hover:text-emerald-600 dark:group-hover:text-emerald-400" />
                    </div>

                    {event.place && (
                      <div className="mt-2 flex items-center gap-1 text-[11px] text-stone-500 dark:text-stone-400">
                        <MapPin className="h-3 w-3 text-stone-400" />
                        <span>{event.place}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-stone-100 dark:border-stone-800 flex justify-between items-center text-[11px] text-stone-400 dark:text-stone-500">
        <span>Click any event to focus that person on the tree canvas.</span>
        <Button variant="outline" size="sm" onClick={onClose}>
          Close
        </Button>
      </div>
    </Dialog>
  );
}
