"use client";

import React, { memo } from "react";
import { Handle, Position, NodeProps, Node } from "@xyflow/react";
import { TreeNodeData } from "@/types";
import { cn, formatDateRange, getInitials, getPersonFullName, getAvatarColor } from "@/lib/utils";

export type PersonNodeType = Node<TreeNodeData, "personNode">;

export function getSplitNameLines(person: {
  firstName?: string;
  middleName?: string;
  lastName?: string;
  displayName?: string;
}): string[] {
  const hasFirst = Boolean(person.firstName?.trim());
  const hasMiddle = Boolean(person.middleName?.trim());
  const hasLast = Boolean(person.lastName?.trim());

  if (hasFirst || hasLast) {
    const lines: string[] = [];
    if (hasFirst) lines.push(person.firstName!.trim());
    if (hasMiddle) lines.push(person.middleName!.trim());
    if (hasLast) lines.push(person.lastName!.trim());
    return lines;
  }

  if (person.displayName?.trim()) {
    const words = person.displayName.trim().split(/\s+/);
    if (words.length <= 3) {
      return words;
    }
    return [
      words[0],
      words.slice(1, -1).join(" "),
      words[words.length - 1],
    ].filter(Boolean);
  }

  return ["Unknown"];
}

function PersonNodeComponent({ data, selected }: NodeProps<PersonNodeType>) {
  const nodeData = data;
  const person = nodeData.person;

  if (!person) return null;

  const nameLines = getSplitNameLines(person);
  const fullName = getPersonFullName(person);
  const initials = getInitials(fullName);
  const years = formatDateRange(person.birthDate, person.deathDate, person.isLiving);
  const avatarBg = getAvatarColor(person.id);

  const isHighlighted = nodeData.isHighlighted;
  const isCompact = Boolean(nodeData.isCompact);
  const isCardHoverTarget = Boolean(nodeData.isCardHoverTarget);
  const isRelativeHighlighted = Boolean(nodeData.isRelativeHighlighted);
  const isDimmed = Boolean(nodeData.isDimmed);

  return (
    <div
      className={cn(
        "group relative flex cursor-pointer rounded-2xl border transition-all shadow-xs hover:shadow-md",
        "bg-[#E1EAE1] dark:bg-[#1A261F] border-[#C5D5C6] dark:border-[#2C3D30] hover:border-[#9FB8A1] dark:hover:border-[#3E5643]",
        isCompact
          ? "w-28 min-h-[86px] flex-col px-2 py-2.5 items-center justify-center text-center rounded-xl"
          : "w-40 h-[195px] flex-col p-3 items-center justify-start text-center rounded-2xl overflow-hidden",
        selected
          ? "border-[#1B4D3E] dark:border-emerald-500 ring-2 ring-[#1B4D3E]/30 dark:ring-emerald-500/40 shadow-md !bg-[#D4E4D4] dark:!bg-[#1F3328]"
          : isCardHoverTarget
          ? "border-emerald-600 dark:border-emerald-400 ring-2 ring-emerald-500/60 shadow-lg !bg-emerald-50/80 dark:!bg-emerald-950/60 scale-[1.02] z-50"
          : isRelativeHighlighted
          ? "border-amber-500 dark:border-amber-400 ring-2 ring-amber-400/60 shadow-md !bg-amber-50/70 dark:!bg-amber-950/50 z-40"
          : isHighlighted
          ? "border-amber-500 dark:border-amber-400 ring-2 ring-amber-400/40 !bg-amber-50/50 dark:!bg-amber-950/30"
          : isDimmed
          ? "opacity-30 filter grayscale-[30%]"
          : ""
      )}
    >
      {/* React Flow Handles - hidden to remove dots on the borders */}
      <Handle
        type="target"
        position={Position.Top}
        id="parent-target"
        className="!h-0 !w-0 !min-h-0 !min-w-0 !opacity-0 !border-0 pointer-events-none"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="child-source"
        className="!h-0 !w-0 !min-h-0 !min-w-0 !opacity-0 !border-0 pointer-events-none"
      />
      <Handle
        type="target"
        position={Position.Left}
        id="spouse-target"
        className="!h-0 !w-0 !min-h-0 !min-w-0 !opacity-0 !border-0 pointer-events-none"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="spouse-source"
        className="!h-0 !w-0 !min-h-0 !min-w-0 !opacity-0 !border-0 pointer-events-none"
      />

      {/* Reference Person Indicator Badge */}
      {nodeData.isReferencePerson && (
        <span
          className="absolute -top-1.5 -right-1.5 flex items-center gap-0.5 rounded-full bg-emerald-700 dark:bg-emerald-600 px-1.5 py-0.5 text-[9px] font-bold text-white shadow-xs border border-white dark:border-[#1A261F] z-20 pointer-events-none"
          title={`Reference Person (Generation ${nodeData.generation ?? 0})`}
        >
          ★ Ref
        </span>
      )}

      {isCompact ? (
        /* Compact Mode: No avatar, reduced horizontal width, full font size preserved */
        <div className="flex flex-col items-center justify-center text-center w-full">
          <div className="flex flex-col items-center justify-center space-y-0.5 w-full">
            {nameLines.map((part, idx) => (
              <span
                key={idx}
                className="text-sm sm:text-base font-bold text-stone-900 dark:text-stone-100 group-hover:text-[#1B4D3E] dark:group-hover:text-emerald-400 transition-colors leading-tight text-center break-words max-w-full tracking-tight"
                title={fullName}
              >
                {part}
              </span>
            ))}
          </div>
          <p className="mt-1.5 text-xs text-stone-600 dark:text-stone-300 font-medium leading-none">
            {years}
          </p>
        </div>
      ) : (
        /* Standard Mode: Tall portrait card inspired by reference tree */
        <div className="flex flex-col items-center text-center w-full">
          {/* Framed Avatar / Portrait */}
          <div className="relative p-1 rounded-full border border-stone-300/80 dark:border-stone-600/80 bg-white/70 dark:bg-stone-900/60 shadow-2xs">
            {person.photoUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={person.photoUrl}
                alt={fullName}
                className="h-14 w-14 rounded-full object-cover shadow-xs"
              />
            ) : (
              <div
                className={cn(
                  "flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-base font-bold tracking-wider select-none shadow-xs",
                  avatarBg
                )}
              >
                {initials}
              </div>
            )}
            {/* Gender / Living Status Dot */}
            <span
              className={cn(
                "absolute bottom-0.5 right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white dark:border-[#18201B]",
                person.gender === "male"
                  ? "bg-sky-500"
                  : person.gender === "female"
                  ? "bg-rose-400"
                  : "bg-emerald-500"
              )}
              title={`${person.gender} · ${person.isLiving ? "Living" : "Deceased"}`}
            />
          </div>

          {/* Stacked Names: first name \n middle name \n last name with increased font size */}
          <div className="mt-2.5 flex flex-col items-center justify-center space-y-0.5 w-full px-1">
            {nameLines.map((part, idx) => (
              <span
                key={idx}
                className="text-sm sm:text-base font-bold text-stone-900 dark:text-stone-100 group-hover:text-[#1B4D3E] dark:group-hover:text-emerald-400 transition-colors leading-tight text-center break-words max-w-full tracking-tight"
              >
                {part}
              </span>
            ))}
          </div>

          {/* Dates & Biographical details */}
          <div className="mt-2 flex flex-col items-center text-center space-y-0.5 w-full">
            <p className="text-xs text-stone-600 dark:text-stone-300 font-medium leading-none">
              {years}
            </p>
            {person.occupation && (
              <p
                className="text-[11px] text-stone-500 dark:text-stone-400 line-clamp-1 pt-0.5 leading-tight"
                title={person.occupation}
              >
                {person.occupation}
              </p>
            )}
            {person.biography && (
              <p
                className="text-[10px] text-stone-400 dark:text-stone-500 line-clamp-2 pt-0.5 leading-tight italic px-0.5"
                title={person.biography}
              >
                {person.biography}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export const PersonNode = memo(PersonNodeComponent);
