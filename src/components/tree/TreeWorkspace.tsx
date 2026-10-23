"use client";

import React, { useState, useMemo, useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { TreeCanvas } from "./TreeCanvas";
import { PeopleSidebar } from "./PeopleSidebar";
import { PersonDetailsPanel } from "./PersonDetailsPanel";
import { TreeToolbar } from "./TreeToolbar";
import { PersonFormModal } from "@/components/person/PersonFormModal";
import { RelationshipFinderModal } from "@/components/relationship/RelationshipFinderModal";
import { TimelineModal } from "./TimelineModal";
import { ExportImportModal } from "./ExportImportModal";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FamilyTree, Person, Relationship, RelationshipType } from "@/types";
import { FamilyGraph } from "@/domain/family-graph";
import { computeGenerations } from "./tree-layout";
import { getTreeRepository, getRepositoryBackend } from "@/repositories";
import { getPreferences } from "@/lib/preferences";
import {
  getSiblingOrder,
  resetSiblingOrder,
  TreeSiblingOrder,
} from "@/lib/sibling-order";
import {
  getSpouseOrder,
  resetSpouseOrder,
  TreeSpouseOrder,
} from "@/lib/spouse-order";
import {
  ReferencePersonConfig,
  getReferencePersonConfig,
  saveReferencePersonConfig,
  resetReferencePersonConfig,
} from "@/lib/reference-person";
import { ReferencePersonModal } from "./ReferencePersonModal";
import { ShareTreeModal } from "./ShareTreeModal";
import { AlertCircle, X, Trash2, Eye, GitFork, LogIn } from "lucide-react";
import { getPersonFullName } from "@/lib/utils";
import { useAuth } from "@/components/auth/AuthContext";
import { duplicateTreeToAccount } from "@/lib/tree-clone";

interface TreeWorkspaceProps {
  initialTree: FamilyTree;
  initialPeople: Person[];
  initialRelationships: Relationship[];
  initialShareRole?: "viewer" | "editor";
}

export function TreeWorkspace({
  initialTree,
  initialPeople,
  initialRelationships,
  initialShareRole,
}: TreeWorkspaceProps) {
  const router = useRouter();
  const { user, profile } = useAuth();
  const [tree, setTree] = useState<FamilyTree>(initialTree);
  const [people, setPeople] = useState<Person[]>(initialPeople);
  const [relationships, setRelationships] = useState<Relationship[]>(initialRelationships);
  const [backend] = useState<"supabase" | "local">(() => getRepositoryBackend());
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDeleteTreeModalOpen, setIsDeleteTreeModalOpen] = useState(false);
  const [isDeletingTree, setIsDeletingTree] = useState(false);

  // Share States & Access Control
  const [shareRole] = useState<"viewer" | "editor" | null>(() => {
    if (initialShareRole) return initialShareRole;
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const s = params.get("share");
      if (s === "viewer" || s === "editor") {
        return s;
      }
    }
    return null;
  });
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isCloningTree, setIsCloningTree] = useState(false);
  const [editorPromptDismissed, setEditorPromptDismissed] = useState(false);

  const isOwner = Boolean(
    (user && tree.ownerId && tree.ownerId === user.id) ||
    (!user && (!tree.ownerId || tree.ownerId === "guest" || tree.ownerId === "local-curator"))
  );

  // Viewer link is strictly read-only for anyone.
  // Editor link keeps the original tree read-only until copied to personal profile.
  const isReadOnly = shareRole === "viewer" || (shareRole === "editor" && !isOwner);

  const handleDuplicateTree = async () => {
    if (!user) {
      const returnUrl =
        typeof window !== "undefined"
          ? window.location.pathname + window.location.search
          : `/trees/${tree.id}?share=editor`;
      router.push(`/login?next=${encodeURIComponent(returnUrl)}`);
      return;
    }

    setIsCloningTree(true);
    setErrorMessage(null);
    try {
      const cloned = await duplicateTreeToAccount({
        tree,
        people,
        relationships,
        ownerId: user.id,
        ownerName: user.user_metadata?.full_name || profile?.fullName || "Curator",
        customTreeName: `${tree.name} (My Copy)`,
      });
      router.push(`/trees/${cloned.id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to copy family tree.";
      setErrorMessage(msg);
      setIsCloningTree(false);
    }
  };

  // Sync latest persisted data from repository on mount
  useEffect(() => {
    let isMounted = true;
    const repo = getTreeRepository();
    repo.getTreeGraph(initialTree.id)
      .then((data) => {
        if (!isMounted || !data) return;
        setTree(data.tree);
        setPeople(data.people);
        setRelationships(data.relationships);
      })
      .catch((err) => {
        console.warn("Could not reload tree from repository:", err);
      });
    return () => {
      isMounted = false;
    };
  }, [initialTree.id]);

  // Maintain active FamilyGraph instance backed by domain engine
  const graph = useMemo(
    () => new FamilyGraph(tree.id, people, relationships),
    [tree.id, people, relationships]
  );

  // Persistent sibling order (loaded from localStorage by tree ID)
  const [currentTreeId, setCurrentTreeId] = useState(initialTree.id);
  const [siblingOrder, setSiblingOrder] = useState<TreeSiblingOrder>(() =>
    getSiblingOrder(initialTree.id)
  );

  // Persistent spouse order (loaded from localStorage by tree ID)
  const [spouseOrder, setSpouseOrder] = useState<TreeSpouseOrder>(() =>
    getSpouseOrder(initialTree.id)
  );

  // Persistent reference person config (loaded from localStorage by tree ID)
  const [referenceConfig, setReferenceConfig] = useState<ReferencePersonConfig | null>(() =>
    getReferencePersonConfig(initialTree.id, initialPeople)
  );
  const [isReferenceModalOpen, setIsReferenceModalOpen] = useState(false);

  if (tree.id !== currentTreeId) {
    setCurrentTreeId(tree.id);
    setSiblingOrder(getSiblingOrder(tree.id));
    setSpouseOrder(getSpouseOrder(tree.id));
    setReferenceConfig(getReferencePersonConfig(tree.id, people));
  }

  // Determine active reference person
  const currentRefPerson = useMemo(() => {
    if (!referenceConfig?.personId) {
      return people[0] ?? null;
    }
    return people.find((p) => p.id === referenceConfig.personId) ?? people[0] ?? null;
  }, [referenceConfig, people]);

  // Compute generation count dynamically relative to reference person
  const generationCount = useMemo(() => {
    const gens = computeGenerations(people, relationships, referenceConfig);
    if (gens.size === 0) return 1;
    let minGen = 0;
    let maxGen = 0;
    for (const g of gens.values()) {
      if (g < minGen) minGen = g;
      if (g > maxGen) maxGen = g;
    }
    return Math.max(1, maxGen - minGen + 1);
  }, [people, relationships, referenceConfig]);

  // Compact mode toggle (initialized from user preferences)
  const [isCompact, setIsCompact] = useState(() => getPreferences().defaultViewMode === "compact");

  useEffect(() => {
    const handleSiblingOrderChange = () => {
      setSiblingOrder(getSiblingOrder(tree.id));
    };
    window.addEventListener("famtree:sibling-order-changed", handleSiblingOrderChange);
    return () => {
      window.removeEventListener("famtree:sibling-order-changed", handleSiblingOrderChange);
    };
  }, [tree.id]);

  useEffect(() => {
    const handleSpouseOrderChange = () => {
      setSpouseOrder(getSpouseOrder(tree.id));
    };
    window.addEventListener("famtree:spouse-order-changed", handleSpouseOrderChange);
    return () => {
      window.removeEventListener("famtree:spouse-order-changed", handleSpouseOrderChange);
    };
  }, [tree.id]);

  useEffect(() => {
    const handleRefChange = () => {
      setReferenceConfig(getReferencePersonConfig(tree.id, people));
    };
    window.addEventListener("famtree:reference-person-changed", handleRefChange);
    return () => {
      window.removeEventListener("famtree:reference-person-changed", handleRefChange);
    };
  }, [tree.id, people]);

  useEffect(() => {
    const handlePrefChange = () => {
      setIsCompact(getPreferences().defaultViewMode === "compact");
    };
    window.addEventListener("famtree:preferences-changed", handlePrefChange);
    return () => window.removeEventListener("famtree:preferences-changed", handlePrefChange);
  }, []);

  // Track whether viewing on a desktop viewport (min-width: 768px)
  const isDesktop = useSyncExternalStore(
    (callback) => {
      if (typeof window === "undefined") return () => {};
      const mq = window.matchMedia("(min-width: 768px)");
      mq.addEventListener("change", callback);
      return () => mq.removeEventListener("change", callback);
    },
    () => window.matchMedia("(min-width: 768px)").matches,
    () => true
  );

  // Manual override toggle state (null means follow responsive default: open on desktop, collapsed on mobile)
  const [manualSidebarState, setManualSidebarState] = useState<boolean | null>(null);

  // Responsive sidebar visibility: default to collapsed on mobile (< 768px), open on desktop (>= 768px)
  const isSidebarOpen = manualSidebarState !== null ? manualSidebarState : isDesktop;

  // Selection & UI drawer states
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Modals
  const [isAddEditPersonOpen, setIsAddEditPersonOpen] = useState(false);
  const [personToEdit, setPersonToEdit] = useState<Person | null>(null);

  const [isFinderOpen, setIsFinderOpen] = useState(false);
  const [finderInitialPerson, setFinderInitialPerson] = useState<Person | null>(null);

  const [isTimelineOpen, setIsTimelineOpen] = useState(false);
  const [isExportImportOpen, setIsExportImportOpen] = useState(false);

  // Canvas Highlighting
  const [highlightedPersonIds, setHighlightedPersonIds] = useState<Set<string>>(new Set());
  const [highlightedEdgeIds, setHighlightedEdgeIds] = useState<Set<string>>(new Set());

  // --- Handlers ---

  const handleSelectPerson = (person: Person | null) => {
    setSelectedPerson(person);
    if (person) {
      setIsDetailsOpen(true);
      // Auto-collapse people sidebar on mobile when selecting a member so canvas/details are visible
      if (!isDesktop) {
        setManualSidebarState(false);
      }
      // Highlight selected node
      setHighlightedPersonIds(new Set([person.id]));
      setHighlightedEdgeIds(new Set());
    } else {
      setIsDetailsOpen(false);
      setHighlightedPersonIds(new Set());
      setHighlightedEdgeIds(new Set());
    }
  };

  const handleClearHighlights = () => {
    setHighlightedPersonIds(new Set());
    setHighlightedEdgeIds(new Set());
  };

  // Person CRUD
  const handleOpenAddPerson = () => {
    if (isReadOnly) return;
    setPersonToEdit(null);
    setIsAddEditPersonOpen(true);
  };

  const handleOpenEditPerson = (person: Person) => {
    if (isReadOnly) return;
    setPersonToEdit(person);
    setIsAddEditPersonOpen(true);
  };

  const handleSavePerson = async (savedPerson: Person) => {
    if (isReadOnly) return;
    setErrorMessage(null);
    const repo = getTreeRepository();
    const exists = people.some((p) => p.id === savedPerson.id);

    try {
      if (exists) {
        await repo.updatePerson(tree.id, savedPerson.id, savedPerson);
        const updated = graph.updatePerson(savedPerson.id, savedPerson);
        setPeople(graph.getAllPeople());
        setSelectedPerson(updated);
      } else {
        await repo.addPerson(tree.id, savedPerson);
        const created = graph.addPerson(savedPerson);
        setPeople(graph.getAllPeople());
        setSelectedPerson(created);
        setIsDetailsOpen(true);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to persist person record.";
      setErrorMessage(msg);
      console.error("Repository error saving person:", err);
    }
  };

  const handleDeletePerson = async (person: Person) => {
    if (isReadOnly) return;
    setErrorMessage(null);
    const repo = getTreeRepository();
    try {
      await repo.removePerson(tree.id, person.id);
      graph.removePerson(person.id);
      setPeople(graph.getAllPeople());
      setRelationships(graph.getAllRelationships());
      setSelectedPerson(null);
      setIsDetailsOpen(false);
      handleClearHighlights();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to delete person record.";
      setErrorMessage(msg);
      console.error("Repository error deleting person:", err);
    }
  };

  // Relationship CRUD
  const handleSaveRelationship = async (relData: {
    personId1: string;
    personId2: string;
    type: RelationshipType;
    startDate?: string;
    notes?: string;
  }) => {
    if (isReadOnly) return;
    setErrorMessage(null);
    const repo = getTreeRepository();
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
      // Highlight the new connection on the canvas
      setHighlightedPersonIds(new Set([newRel.personId1, newRel.personId2]));
      setHighlightedEdgeIds(new Set([newRel.id]));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to persist relationship.";
      setErrorMessage(msg);
      console.error("Repository error adding relationship:", err);
    }
  };

  const handleRemoveRelationship = async (relId: string) => {
    if (isReadOnly) return;
    setErrorMessage(null);
    const repo = getTreeRepository();
    try {
      await repo.removeRelationship(tree.id, relId);
      graph.removeRelationship(relId);
      setRelationships(graph.getAllRelationships());
      handleClearHighlights();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to remove relationship.";
      setErrorMessage(msg);
      console.error("Repository error removing relationship:", err);
    }
  };

  // Highlighting Lineages
  const handleHighlightAncestors = (person: Person) => {
    const ancestors = graph.getAncestors(person.id);
    const nodeIds = new Set<string>([person.id]);
    const edgeIds = new Set<string>();

    for (const a of ancestors) {
      nodeIds.add(a.person.id);
      for (const r of a.viaRelationships) {
        edgeIds.add(r.id);
      }
    }

    setHighlightedPersonIds(nodeIds);
    setHighlightedEdgeIds(edgeIds);
  };

  const handleHighlightDescendants = (person: Person) => {
    const descendants = graph.getDescendants(person.id);
    const nodeIds = new Set<string>([person.id]);
    const edgeIds = new Set<string>();

    for (const d of descendants) {
      nodeIds.add(d.person.id);
      for (const r of d.viaRelationships) {
        edgeIds.add(r.id);
      }
    }

    setHighlightedPersonIds(nodeIds);
    setHighlightedEdgeIds(edgeIds);
  };

  const handleHighlightPath = (nodeIds: string[], edgeIds: string[]) => {
    setHighlightedPersonIds(new Set(nodeIds));
    setHighlightedEdgeIds(new Set(edgeIds));
  };

  const handleOpenFinderWithPerson = (person: Person) => {
    setFinderInitialPerson(person);
    setIsFinderOpen(true);
  };

  const handleImportData = async (
    importedPeople: Person[],
    importedRelationships: Relationship[],
    mode: "append" | "replace"
  ) => {
    if (isReadOnly) return;
    setErrorMessage(null);
    const repo = getTreeRepository();

    try {
      if (mode === "replace") {
        for (const p of people) {
          try {
            await repo.removePerson(tree.id, p.id);
          } catch {
            // ignore deletion errors during batch cleanup
          }
        }
        for (const p of importedPeople) {
          await repo.addPerson(tree.id, p);
        }
        for (const r of importedRelationships) {
          await repo.addRelationship(tree.id, r);
        }
        setPeople(importedPeople);
        setRelationships(importedRelationships);
        setSelectedPerson(null);
        setIsDetailsOpen(false);
      } else {
        const existingPersonIds = new Set(people.map((p) => p.id));
        const newPeople = importedPeople.filter((p) => !existingPersonIds.has(p.id));
        for (const p of newPeople) {
          await repo.addPerson(tree.id, p);
        }

        const existingRelKeys = new Set(
          relationships.map((r) => `${r.personId1}-${r.personId2}-${r.type}`)
        );
        const newRelationships = importedRelationships.filter(
          (r) => !existingRelKeys.has(`${r.personId1}-${r.personId2}-${r.type}`)
        );
        for (const r of newRelationships) {
          await repo.addRelationship(tree.id, r);
        }

        setPeople((prev) => [...prev, ...newPeople]);
        setRelationships((prev) => [...prev, ...newRelationships]);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to import tree data.";
      setErrorMessage(msg);
      throw err;
    }
  };

  const handleDeleteThisTree = async () => {
    if (isReadOnly) return;
    setIsDeletingTree(true);
    setErrorMessage(null);
    try {
      const repo = getTreeRepository();
      await repo.deleteTree(tree.id);
      router.push("/dashboard");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete tree.";
      setErrorMessage(msg);
      setIsDeletingTree(false);
    }
  };

  // Reference Person Handlers
  const handleSetReferencePerson = (person: Person) => {
    if (isReadOnly) return;
    const newConfig: ReferencePersonConfig = {
      personId: person.id,
      baseGeneration: 0,
      updatedAt: new Date().toISOString(),
    };
    saveReferencePersonConfig(tree.id, newConfig);
    setReferenceConfig(newConfig);
  };

  const handleSaveReferenceConfig = (config: ReferencePersonConfig) => {
    if (isReadOnly) return;
    saveReferencePersonConfig(tree.id, config);
    setReferenceConfig(config);
  };

  const handleResetReferenceConfig = () => {
    if (isReadOnly) return;
    resetReferencePersonConfig(tree.id);
    setReferenceConfig(getReferencePersonConfig(tree.id, people));
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#FAF8F5] dark:bg-[#111513] transition-colors">
      {/* Global Navigation */}
      <Navbar />

      {/* Editor Duplicate Notice Banner */}
      {shareRole === "editor" && !isOwner && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-emerald-50 dark:bg-emerald-950/60 border-b border-emerald-200 dark:border-emerald-800/80 px-4 py-2.5 text-xs text-emerald-900 dark:text-emerald-200">
          <div className="flex items-center gap-2">
            <GitFork className="h-4 w-4 shrink-0 text-emerald-700 dark:text-emerald-400" />
            <span>
              <strong>Shared Editor Link:</strong> Make a copy of this tree to your profile to begin editing.
            </span>
          </div>
          <div className="flex items-center gap-2">
            {user ? (
              <Button
                size="sm"
                onClick={handleDuplicateTree}
                disabled={isCloningTree}
                className="h-7 text-xs bg-emerald-700 hover:bg-emerald-800 text-white gap-1.5 shadow-xs"
              >
                <GitFork className="h-3.5 w-3.5" />
                {isCloningTree ? "Copying Tree..." : "Copy to My Profile"}
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={() => {
                  const returnUrl =
                    typeof window !== "undefined"
                      ? window.location.pathname + window.location.search
                      : `/trees/${tree.id}?share=editor`;
                  router.push(`/login?next=${encodeURIComponent(returnUrl)}`);
                }}
                className="h-7 text-xs bg-emerald-700 hover:bg-emerald-800 text-white gap-1.5 shadow-xs"
              >
                <LogIn className="h-3.5 w-3.5" />
                Sign In to Copy & Edit
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Read-Only Viewer Notice Banner */}
      {shareRole === "viewer" && (
        <div className="flex items-center justify-between gap-3 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-900/60 px-4 py-2 text-xs text-amber-900 dark:text-amber-200">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <span>
              <strong>Viewer Mode:</strong> You are viewing this family tree in read-only mode. Nothing will be saved.
            </span>
          </div>
          <span className="rounded-full bg-amber-100 dark:bg-amber-900/60 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:text-amber-300">
            Read-Only
          </span>
        </div>
      )}

      {/* Workspace Header Toolbar */}
      <TreeToolbar
        tree={tree}
        peopleCount={people.length}
        generationCount={generationCount}
        hasHighlights={highlightedPersonIds.size > 0 || highlightedEdgeIds.size > 0}
        backend={backend}
        isCompact={isCompact}
        isReadOnly={isReadOnly}
        hasCustomSiblingOrder={
          Object.keys(siblingOrder).length > 0 || Object.keys(spouseOrder).length > 0
        }
        referencePerson={currentRefPerson}
        onOpenReferenceSelector={() => setIsReferenceModalOpen(true)}
        onResetSiblingOrder={() => {
          if (isReadOnly) return;
          resetSiblingOrder(tree.id);
          resetSpouseOrder(tree.id);
          setSiblingOrder({});
          setSpouseOrder({});
        }}
        onClearHighlights={handleClearHighlights}
        onToggleSidebar={() => setManualSidebarState(!isSidebarOpen)}
        onToggleCompact={() => setIsCompact((c) => !c)}
        onAddPerson={handleOpenAddPerson}
        onOpenFinder={() => {
          setFinderInitialPerson(selectedPerson);
          setIsFinderOpen(true);
        }}
        onOpenTimeline={() => setIsTimelineOpen(true)}
        onOpenExportImport={() => setIsExportImportOpen(true)}
        onOpenShareModal={() => setIsShareModalOpen(true)}
        onDeleteTree={() => setIsDeleteTreeModalOpen(true)}
      />

      {/* Persistence / Database Error Notification Banner */}
      {errorMessage && (
        <div className="flex items-center justify-between gap-3 bg-red-50 dark:bg-red-950/60 border-b border-red-200 dark:border-red-900 px-4 py-2 text-xs text-red-800 dark:text-red-300">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
            <span className="font-medium">Persistence Notice: {errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="rounded p-1 hover:bg-red-100 dark:hover:bg-red-900 text-red-600 dark:text-red-400"
            title="Dismiss"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Main Workspace Body */}
      <div className="relative flex flex-1 overflow-hidden">
        {/* Left Searchable People Panel */}
        <PeopleSidebar
          people={people}
          relationships={relationships}
          selectedPerson={selectedPerson}
          referencePersonConfig={referenceConfig}
          isReadOnly={isReadOnly}
          onSelectPerson={handleSelectPerson}
          onAddPerson={isReadOnly ? () => {} : handleOpenAddPerson}
          isOpen={isSidebarOpen}
          onToggle={() => setManualSidebarState(!isSidebarOpen)}
        />

        {/* Central Large React Flow Canvas */}
        <main className="relative flex-1 h-full w-full overflow-hidden">
          <TreeCanvas
            treeId={tree.id}
            people={people}
            relationships={relationships}
            selectedPerson={selectedPerson}
            highlightedPersonIds={highlightedPersonIds}
            highlightedEdgeIds={highlightedEdgeIds}
            siblingOrder={siblingOrder}
            spouseOrder={spouseOrder}
            referencePersonConfig={referenceConfig}
            isCompact={isCompact}
            isReadOnly={isReadOnly}
            onUpdateSiblingOrder={isReadOnly ? undefined : setSiblingOrder}
            onUpdateSpouseOrder={isReadOnly ? undefined : setSpouseOrder}
            onSelectPerson={handleSelectPerson}
            onFindRelationship={handleOpenFinderWithPerson}
            onAddPerson={isReadOnly ? undefined : handleOpenAddPerson}
            onOpenExportImport={() => setIsExportImportOpen(true)}
          />
        </main>

        {/* Right Details Slide-over Panel */}
        {isDetailsOpen && (
          <PersonDetailsPanel
            person={selectedPerson}
            treeId={tree.id}
            graph={graph}
            allPeople={people}
            existingRelationships={relationships}
            referencePersonId={currentRefPerson?.id}
            isReadOnly={isReadOnly}
            onSetReferencePerson={isReadOnly ? undefined : handleSetReferencePerson}
            onClose={() => {
              setIsDetailsOpen(false);
              setSelectedPerson(null);
            }}
            onEdit={isReadOnly ? () => {} : handleOpenEditPerson}
            onDeletePerson={isReadOnly ? () => {} : handleDeletePerson}
            onFindRelationship={handleOpenFinderWithPerson}
            onSelectRelative={handleSelectPerson}
            onHighlightAncestors={handleHighlightAncestors}
            onHighlightDescendants={handleHighlightDescendants}
            onAddRelationship={isReadOnly ? () => {} : handleSaveRelationship}
            onRemoveRelationship={isReadOnly ? () => {} : handleRemoveRelationship}
          />
        )}
      </div>

      {/* Add / Edit Person Form Modal */}
      <PersonFormModal
        isOpen={isAddEditPersonOpen}
        onClose={() => setIsAddEditPersonOpen(false)}
        onSave={handleSavePerson}
        initialPerson={personToEdit}
        treeId={tree.id}
      />

      {/* Relationship Discovery Finder Modal */}
      <RelationshipFinderModal
        isOpen={isFinderOpen}
        onClose={() => setIsFinderOpen(false)}
        people={people}
        relationships={relationships}
        initialPersonA={finderInitialPerson}
        onHighlightPath={handleHighlightPath}
      />

      {/* Generational Milestone Timeline Modal */}
      <TimelineModal
        isOpen={isTimelineOpen}
        onClose={() => setIsTimelineOpen(false)}
        people={people}
        relationships={relationships}
        onSelectPerson={handleSelectPerson}
      />

      {/* Data Export & Import Center Modal */}
      <ExportImportModal
        isOpen={isExportImportOpen}
        onClose={() => setIsExportImportOpen(false)}
        tree={tree}
        people={people}
        relationships={relationships}
        onImportData={handleImportData}
      />

      {/* Reference Person Generation Anchor Modal */}
      <ReferencePersonModal
        isOpen={isReferenceModalOpen}
        onClose={() => setIsReferenceModalOpen(false)}
        people={people}
        currentConfig={referenceConfig}
        onSaveConfig={handleSaveReferenceConfig}
        onResetToAuto={handleResetReferenceConfig}
      />

      {/* Delete Family Tree Confirmation Dialog */}
      <Dialog
        isOpen={isDeleteTreeModalOpen}
        onClose={() => setIsDeleteTreeModalOpen(false)}
        title="Delete Family Tree?"
        description={`Are you sure you want to permanently delete "${tree.name}"? All ${people.length} family members, records, and relationships will be erased.`}
        maxWidth="md"
      >
        <div className="space-y-4 pt-2">
          <div className="rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 p-3 text-xs text-red-800 dark:text-red-300">
            <strong>Warning:</strong> This action cannot be undone. The entire lineage record will be removed from the database and you will be returned to the dashboard.
          </div>
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-100 dark:border-stone-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDeleteTreeModalOpen(false)}
              disabled={isDeletingTree}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleDeleteThisTree}
              isLoading={isDeletingTree}
              className="bg-red-600 hover:bg-red-700 text-white gap-1.5"
            >
              <Trash2 className="h-4 w-4" />
              Delete Permanently
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Share Family Tree Modal */}
      <ShareTreeModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        tree={tree}
      />

      {/* Editor Duplicate Invitation Dialog */}
      <Dialog
        isOpen={shareRole === "editor" && !isOwner && !editorPromptDismissed}
        onClose={() => setEditorPromptDismissed(true)}
        title={user ? "Copy Tree to Your Profile" : "Editor Invitation: Sign In Required"}
        description={
          user
            ? `You have been invited to edit "${tree.name}". To make edits without altering the original curator's tree, a personal copy will be placed into your profile.`
            : `You have been invited to edit "${tree.name}". Please sign in or create an account so a personal copy of this tree can be saved to your profile for editing.`
        }
        maxWidth="md"
      >
        <div className="space-y-4 pt-2">
          <div className="rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-[#18201B] p-4 text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-stone-500 dark:text-stone-400">Family Tree:</span>
              <span className="font-semibold text-stone-900 dark:text-stone-100">{tree.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500 dark:text-stone-400">Total Members:</span>
              <span className="font-medium text-stone-900 dark:text-stone-100">{people.length} people</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500 dark:text-stone-400">Generations:</span>
              <span className="font-medium text-stone-900 dark:text-stone-100">{generationCount} generations</span>
            </div>
            {currentRefPerson && (
              <div className="flex justify-between">
                <span className="text-stone-500 dark:text-stone-400">Reference Anchor:</span>
                <span className="font-medium text-stone-900 dark:text-stone-100">{getPersonFullName(currentRefPerson)}</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-stone-100 dark:border-stone-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditorPromptDismissed(true)}
            >
              View Read-Only Instead
            </Button>
            {user ? (
              <Button
                type="button"
                onClick={handleDuplicateTree}
                disabled={isCloningTree}
                className="bg-emerald-800 hover:bg-emerald-900 text-white gap-1.5"
              >
                <GitFork className="h-4 w-4" />
                {isCloningTree ? "Copying Tree..." : "Copy Tree & Start Editing"}
              </Button>
            ) : (
              <Button
                type="button"
                onClick={() => {
                  const returnUrl =
                    typeof window !== "undefined"
                      ? window.location.pathname + window.location.search
                      : `/trees/${tree.id}?share=editor`;
                  router.push(`/login?next=${encodeURIComponent(returnUrl)}`);
                }}
                className="bg-emerald-800 hover:bg-emerald-900 text-white gap-1.5"
              >
                <LogIn className="h-4 w-4" />
                Sign In to Edit
              </Button>
            )}
          </div>
        </div>
      </Dialog>
    </div>
  );
}
