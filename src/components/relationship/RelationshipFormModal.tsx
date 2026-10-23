"use client";

import React, { useState } from "react";
import { GitFork, AlertCircle } from "lucide-react";
import { Person, Relationship, RelationshipType } from "@/types";
import { Dialog } from "@/components/ui/dialog";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { getPersonFullName } from "@/lib/utils";
import { validateRelationship } from "@/domain/validation";

interface RelationshipFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  people: Person[];
  existingRelationships: Relationship[];
  treeId: string;
  initialPerson1Id?: string;
  onSave: (relData: {
    personId1: string;
    personId2: string;
    type: RelationshipType;
    startDate?: string;
    notes?: string;
  }) => void;
}

export function RelationshipFormModal({
  isOpen,
  onClose,
  people,
  existingRelationships,
  treeId,
  initialPerson1Id,
  onSave,
}: RelationshipFormModalProps) {
  const [personId1, setPersonId1] = useState(
    initialPerson1Id || (people.length > 0 ? people[0].id : "")
  );
  const [personId2, setPersonId2] = useState(
    people.length > 1 ? (people[0].id === personId1 ? people[1].id : people[0].id) : ""
  );
  const [relType, setRelType] = useState<RelationshipType>("parent-child");
  const [startDate, setStartDate] = useState("");
  const [notes, setNotes] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const peopleMap = new Map(people.map((p) => [p.id, p]));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const validation = validateRelationship(
      {
        treeId,
        personId1,
        personId2,
        type: relType,
        startDate: startDate || undefined,
        notes: notes || undefined,
      },
      existingRelationships,
      peopleMap
    );

    if (!validation.isValid) {
      setErrorMessage(validation.errors.map((err) => err.message).join(" "));
      return;
    }

    onSave({
      personId1,
      personId2,
      type: relType,
      startDate: startDate || undefined,
      notes: notes || undefined,
    });
    onClose();
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Add Family Relationship"
      description="Connect two family members as parent-child or spouses/partners."
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMessage && (
          <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-800 animate-fade-in">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
            <p className="leading-relaxed">{errorMessage}</p>
          </div>
        )}

        <div className="space-y-1.5">
          <Select
            label="Relationship Type *"
            value={relType}
            onChange={(e) => {
              setRelType(e.target.value as RelationshipType);
              setErrorMessage(null);
            }}
            options={[
              { value: "parent-child", label: "Biological Parent → Child" },
              { value: "adoptive-parent-child", label: "Adoptive Parent → Child" },
              { value: "step-parent-child", label: "Step-Parent → Child" },
              { value: "spouse", label: "Spouse / Registered Partner" },
              { value: "former-spouse", label: "Former Spouse / Partner" },
            ]}
          />
          <p className="text-[11px] text-stone-500">
            {relType.includes("parent")
              ? "First person will be recorded as the Parent, second as the Child."
              : "Mutual partner connection between both individuals."}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Select
            label={relType.includes("parent") ? "Parent *" : "First Partner *"}
            value={personId1}
            onChange={(e) => {
              setPersonId1(e.target.value);
              setErrorMessage(null);
            }}
          >
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {getPersonFullName(p)}
              </option>
            ))}
          </Select>

          <Select
            label={relType.includes("parent") ? "Child *" : "Second Partner *"}
            value={personId2}
            onChange={(e) => {
              setPersonId2(e.target.value);
              setErrorMessage(null);
            }}
          >
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {getPersonFullName(p)}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <Input
            label="Start / Marriage Date"
            placeholder="e.g. 1972 or 1972-06-15"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <p className="mt-1 text-[11px] text-stone-500 dark:text-stone-400">
            Year only (e.g. 1972) or full date (YYYY-MM-DD)
          </p>
        </div>

        <Textarea
          label="Relationship Notes"
          placeholder="Historical context, marriage location, legal documentation..."
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-100">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" className="gap-1.5 shadow-xs">
            <GitFork className="h-4 w-4" />
            Connect Relatives
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
