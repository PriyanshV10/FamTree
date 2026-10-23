"use client";

import React, { useState, useMemo } from "react";
import { Search, Target, Check, RotateCcw } from "lucide-react";
import { Person } from "@/types";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getPersonFullName, getAvatarColor, getInitials, cn } from "@/lib/utils";
import { ReferencePersonConfig } from "@/lib/reference-person";

interface ReferencePersonModalProps {
  isOpen: boolean;
  onClose: () => void;
  people: Person[];
  currentConfig: ReferencePersonConfig | null;
  onSaveConfig: (config: ReferencePersonConfig) => void;
  onResetToAuto: () => void;
}

export function ReferencePersonModal({
  isOpen,
  onClose,
  people,
  currentConfig,
  onSaveConfig,
  onResetToAuto,
}: ReferencePersonModalProps) {
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPersonId, setSelectedPersonId] = useState<string>(
    () => currentConfig?.personId || people[0]?.id || ""
  );
  const [baseGeneration, setBaseGeneration] = useState<number>(
    () => currentConfig?.baseGeneration ?? 0
  );

  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      setSelectedPersonId(currentConfig?.personId || people[0]?.id || "");
      setBaseGeneration(currentConfig?.baseGeneration ?? 0);
      setSearchTerm("");
    }
  }

  const filteredPeople = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return people;
    return people.filter((p) => {
      const name = getPersonFullName(p).toLowerCase();
      return (
        name.includes(term) ||
        (p.occupation && p.occupation.toLowerCase().includes(term))
      );
    });
  }, [people, searchTerm]);

  const handleSave = () => {
    if (!selectedPersonId) return;
    onSaveConfig({
      personId: selectedPersonId,
      baseGeneration,
    });
    onClose();
  };

  const handleReset = () => {
    onResetToAuto();
    onClose();
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Generational Reference Anchor"
      description="Fix a family member as the reference anchor. Adding ancestors or relatives will calculate generations outward from this person without shifting the rest of the tree."
      maxWidth="md"
    >
      <div className="space-y-4 pt-2">
        {/* Search input */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
          <input
            type="text"
            placeholder="Search family members..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-[#141A16] pl-9 pr-4 py-2 text-xs text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:border-emerald-500 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        {/* People selection list */}
        <div className="max-h-60 overflow-y-auto space-y-1.5 rounded-xl border border-stone-200/80 dark:border-stone-800 p-1.5">
          {filteredPeople.length === 0 ? (
            <div className="py-6 text-center text-xs text-stone-400">
              No family members found.
            </div>
          ) : (
            filteredPeople.map((person) => {
              const fullName = getPersonFullName(person);
              const initials = getInitials(fullName);
              const avatarColor = getAvatarColor(person.id);
              const isSelected = selectedPersonId === person.id;
              const isCurrentlyActiveRef = currentConfig?.personId === person.id;

              return (
                <button
                  key={person.id}
                  type="button"
                  onClick={() => setSelectedPersonId(person.id)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-lg p-2 text-left transition-colors text-xs",
                    isSelected
                      ? "bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-100"
                      : "hover:bg-stone-50 dark:hover:bg-stone-800/60 border border-transparent text-stone-800 dark:text-stone-200"
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={cn(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold select-none",
                        avatarColor
                      )}
                    >
                      {initials}
                    </div>
                    <div className="truncate">
                      <div className="font-medium truncate flex items-center gap-1.5">
                        <span>{fullName}</span>
                        {isCurrentlyActiveRef && (
                          <span className="rounded-full bg-emerald-100 dark:bg-emerald-900 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-800 dark:text-emerald-300">
                            Current Ref
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-stone-400 capitalize">
                        {person.gender} · {person.isLiving ? "Living" : "Deceased"}
                      </span>
                    </div>
                  </div>

                  {isSelected && (
                    <Check className="h-4 w-4 shrink-0 text-emerald-700 dark:text-emerald-400" />
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Base Generation Setting */}
        <div className="flex items-center justify-between rounded-xl border border-stone-200/80 dark:border-stone-800 bg-stone-50/60 dark:bg-stone-900/40 p-3 text-xs">
          <div>
            <span className="font-semibold text-stone-800 dark:text-stone-200 block">
              Reference Generation Level
            </span>
            <span className="text-stone-500 dark:text-stone-400 text-[11px]">
              Generation number for this reference person (parents will be -1, kids +1).
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              value={baseGeneration}
              onChange={(e) => setBaseGeneration(Number(e.target.value) || 0)}
              className="w-16 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-[#18201B] px-2 py-1 text-center font-bold text-xs"
            />
          </div>
        </div>

        {/* Dialog footer buttons */}
        <div className="flex items-center justify-between pt-3 border-t border-stone-100 dark:border-stone-800">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="gap-1.5 text-xs text-stone-500 hover:text-stone-800 dark:hover:text-stone-200"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset to Auto
          </Button>

          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              className="gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white"
            >
              <Target className="h-3.5 w-3.5" />
              Set Reference
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
