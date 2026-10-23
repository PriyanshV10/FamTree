"use client";

import React from "react";
import Link from "next/link";
import {
  ChevronLeft,
  UserPlus,
  GitCompare,
  GitFork,
  Users,
  EyeOff,
  Minimize2,
  Maximize2,
  History,
  DownloadCloud,
  Trash2,
  RotateCcw,
  Target,
} from "lucide-react";
import { FamilyTree, Person } from "@/types";
import { getPersonFullName } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface TreeToolbarProps {
  tree: FamilyTree;
  peopleCount: number;
  generationCount?: number;
  hasHighlights?: boolean;
  backend?: "supabase" | "local";
  isCompact?: boolean;
  hasCustomSiblingOrder?: boolean;
  referencePerson?: Person | null;
  onOpenReferenceSelector?: () => void;
  onResetSiblingOrder?: () => void;
  onClearHighlights?: () => void;
  onToggleSidebar: () => void;
  onToggleCompact?: () => void;
  onAddPerson: () => void;
  onAddRelationship?: () => void;
  onOpenFinder: () => void;
  onOpenTimeline?: () => void;
  onOpenExportImport?: () => void;
  onDeleteTree?: () => void;
}

export function TreeToolbar({
  tree,
  peopleCount,
  generationCount = 3,
  hasHighlights = false,
  backend = "local",
  isCompact = false,
  hasCustomSiblingOrder = false,
  referencePerson,
  onOpenReferenceSelector,
  onResetSiblingOrder,
  onClearHighlights,
  onToggleSidebar,
  onToggleCompact,
  onAddPerson,
  onAddRelationship,
  onOpenFinder,
  onOpenTimeline,
  onOpenExportImport,
  onDeleteTree,
}: TreeToolbarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200/80 dark:border-stone-800 bg-white/95 dark:bg-[#141A16]/95 px-4 py-2.5 backdrop-blur-xs transition-colors">
      {/* Left: Breadcrumbs & Tree Info */}
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard"
          className="flex items-center gap-1 text-xs font-semibold text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white transition-colors"
          title="Back to Trees"
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Trees</span>
        </Link>

        <div className="h-4 w-px bg-stone-200 dark:bg-stone-800" />

        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-serif font-bold text-stone-900 dark:text-stone-100">
              {tree.name}
            </h1>
            <span className="hidden md:inline-flex rounded-full bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              Active Tree
            </span>
            <span
              className={`hidden lg:inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium border ${
                backend === "supabase"
                  ? "bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 border-teal-200 dark:border-teal-800"
                  : "bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800"
              }`}
              title={
                backend === "supabase"
                  ? "Connected to Supabase PostgreSQL database."
                  : "Running in local browser persistence mode."
              }
            >
              {backend === "supabase" ? "● Supabase Cloud" : "● Local Persistence"}
            </span>
          </div>
          <p className="hidden sm:block text-[11px] text-stone-500 dark:text-stone-400">
            {peopleCount} family members · {generationCount} generation{generationCount === 1 ? "" : "s"} charted
          </p>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {hasHighlights && onClearHighlights && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearHighlights}
            className="h-8 gap-1.5 text-xs text-amber-800 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40"
            title="Clear Path and Generational Highlights"
          >
            <EyeOff className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Clear Highlights</span>
          </Button>
        )}

        {hasCustomSiblingOrder && onResetSiblingOrder && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onResetSiblingOrder}
            className="h-8 gap-1.5 text-xs text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100"
            title="Reset custom sibling order back to default birthdate ordering"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Reset Layout Order</span>
          </Button>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={onToggleSidebar}
          className="h-8 gap-1.5 text-xs text-stone-700 dark:text-stone-300"
          title="Toggle People Panel"
        >
          <Users className="h-3.5 w-3.5 text-stone-500 dark:text-stone-400" />
          <span className="hidden sm:inline">People</span> ({peopleCount})
        </Button>

        {referencePerson && onOpenReferenceSelector && (
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenReferenceSelector}
            className="h-8 gap-1.5 text-xs text-stone-700 dark:text-stone-300 hover:text-emerald-900 dark:hover:text-emerald-300 hover:border-emerald-300 dark:hover:border-emerald-700"
            title={`Reference Anchor: ${getPersonFullName(referencePerson)}. Generations calculate outward from this person. Click to change.`}
          >
            <Target className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-400" />
            <span className="hidden xl:inline text-stone-400 dark:text-stone-500">Ref:</span>
            <span className="font-semibold text-stone-800 dark:text-stone-200 truncate max-w-[110px]">
              {getPersonFullName(referencePerson)}
            </span>
          </Button>
        )}

        {onToggleCompact && (
          <Button
            variant={isCompact ? "secondary" : "outline"}
            size="sm"
            onClick={onToggleCompact}
            className={`h-8 gap-1.5 text-xs ${
              isCompact
                ? "bg-emerald-50 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700 hover:bg-emerald-100"
                : "text-stone-700 dark:text-stone-300"
            }`}
            title={isCompact ? "Switch to Detailed Mode" : "Switch to Compact Mode (Names Only)"}
          >
            {isCompact ? (
              <Maximize2 className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-400" />
            ) : (
              <Minimize2 className="h-3.5 w-3.5 text-stone-500 dark:text-stone-400" />
            )}
            <span className="hidden sm:inline">{isCompact ? "Detailed View" : "Compact View"}</span>
          </Button>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={onOpenFinder}
          className="h-8 gap-1.5 text-xs text-stone-700 dark:text-stone-300 hover:text-emerald-900 dark:hover:text-emerald-300 hover:border-emerald-300 dark:hover:border-emerald-700"
        >
          <GitCompare className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-400" />
          <span>Relationship Finder</span>
        </Button>

        {onOpenTimeline && (
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenTimeline}
            className="h-8 gap-1.5 text-xs text-stone-700 dark:text-stone-300 hover:text-emerald-900 dark:hover:text-emerald-300 hover:border-emerald-300 dark:hover:border-emerald-700"
            title="Open Generational Milestone Timeline"
          >
            <History className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-400" />
            <span className="hidden xl:inline">Timeline</span>
          </Button>
        )}

        {onOpenExportImport && (
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenExportImport}
            className="h-8 gap-1.5 text-xs text-stone-700 dark:text-stone-300 hover:text-emerald-900 dark:hover:text-emerald-300 hover:border-emerald-300 dark:hover:border-emerald-700"
            title="Export GEDCOM / Backup Tree"
          >
            <DownloadCloud className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-400" />
            <span className="hidden xl:inline">Export & Backup</span>
          </Button>
        )}

        {onAddRelationship && (
          <Button
            variant="outline"
            size="sm"
            onClick={onAddRelationship}
            className="h-8 gap-1.5 text-xs text-stone-700 dark:text-stone-300 hover:text-emerald-900 dark:hover:text-emerald-300 hover:border-emerald-300 dark:hover:border-emerald-700"
          >
            <GitFork className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-400" />
            <span className="hidden md:inline">Connect Relatives</span>
          </Button>
        )}

        <Button
          size="sm"
          onClick={onAddPerson}
          className="h-8 gap-1.5 text-xs shadow-xs"
        >
          <UserPlus className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Add Person</span>
        </Button>

        {onDeleteTree && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onDeleteTree}
            className="h-8 w-8 p-0 text-stone-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
            title="Delete this family tree"
            aria-label="Delete this family tree"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}
