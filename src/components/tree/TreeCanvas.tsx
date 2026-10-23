"use client";

import React, { useMemo, useCallback, useRef } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useEdgesState,
  Node,
  NodeChange,
  OnNodeDrag,
  applyNodeChanges,
  BackgroundVariant,
} from "@xyflow/react";
import { PersonNode } from "./PersonNode";
import { UnionNode } from "./UnionNode";
import { ContrastEdge } from "./ContrastEdge";
import { Person, Relationship } from "@/types";
import { generateTreeLayout } from "./tree-layout";
import {
  TreeSiblingOrder,
  SiblingContext,
  getSubtreeNodeIds,
  getSiblingContext,
  saveSiblingOrder,
} from "@/lib/sibling-order";
import { ReferencePersonConfig } from "@/lib/reference-person";
import { swapSpousesInOrder } from "@/lib/spouse-order";
import { useTheme } from "@/components/theme/ThemeProvider";
import { UserPlus, DownloadCloud, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TreeCanvasProps {
  treeId?: string;
  people: Person[];
  relationships: Relationship[];
  selectedPerson: Person | null;
  highlightedPersonIds?: Set<string>;
  highlightedEdgeIds?: Set<string>;
  siblingOrder?: Record<string, string[]>;
  spouseOrder?: Record<string, string[]>;
  referencePersonConfig?: ReferencePersonConfig | null;
  isCompact?: boolean;
  onUpdateSiblingOrder?: (order: Record<string, string[]>) => void;
  onUpdateSpouseOrder?: (order: Record<string, string[]>) => void;
  onSelectPerson: (person: Person | null) => void;
  onViewProfile?: (personId: string) => void;
  onFindRelationship?: (person: Person) => void;
  onAddPerson?: () => void;
  onOpenExportImport?: () => void;
}

interface DragState {
  draggedNodeId: string;
  initialPositions: Map<string, { x: number; y: number }>;
  subtreeNodeIds: Set<string>;
  siblingCtx: SiblingContext | null;
  currentDx: number;
}

export function TreeCanvas({
  treeId,
  people,
  relationships,
  selectedPerson,
  highlightedPersonIds = new Set(),
  highlightedEdgeIds = new Set(),
  siblingOrder,
  spouseOrder,
  referencePersonConfig,
  isCompact = false,
  onUpdateSiblingOrder,
  onUpdateSpouseOrder,
  onSelectPerson,
  onViewProfile,
  onFindRelationship,
  onAddPerson,
  onOpenExportImport,
}: TreeCanvasProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  // Register custom node types
  const nodeTypes = useMemo(
    () => ({
      personNode: PersonNode,
      unionNode: UnionNode,
    }),
    []
  );

  // Register custom edge types with background crossover contrast halo
  const edgeTypes = useMemo(
    () => ({
      contrastEdge: ContrastEdge,
      smoothstep: ContrastEdge,
    }),
    []
  );

  const [hoveredEdgeId, setHoveredEdgeId] = React.useState<string | null>(null);
  const [hoveredPersonId, setHoveredPersonId] = React.useState<string | null>(null);

  const handleSwapSpouses = useCallback(
    (spouse1Id: string, spouse2Id: string) => {
      const updated = swapSpousesInOrder(treeId || "default", spouse1Id, spouse2Id, spouseOrder);
      onUpdateSpouseOrder?.(updated);
    },
    [treeId, spouseOrder, onUpdateSpouseOrder]
  );

  // Compute layout using deterministic generational engine
  const initialLayout = useMemo(() => {
    return generateTreeLayout(people, relationships, {
      selectedPersonId: selectedPerson?.id,
      highlightedPersonIds,
      highlightedEdgeIds,
      siblingOrder,
      spouseOrder,
      referencePersonConfig,
      isCompact,
      isDark,
      onSelectPerson,
      onViewProfile,
      onFindRelationship,
      onSwapSpouses: handleSwapSpouses,
    });
  }, [
    people,
    relationships,
    selectedPerson?.id,
    highlightedPersonIds,
    highlightedEdgeIds,
    siblingOrder,
    spouseOrder,
    referencePersonConfig,
    isCompact,
    isDark,
    onSelectPerson,
    onViewProfile,
    onFindRelationship,
    handleSwapSpouses,
  ]);

  const [nodes, setNodes] = React.useState<Node[]>(initialLayout.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialLayout.edges);

  const dragStateRef = useRef<DragState | null>(null);

  // Update layout when people, relationships, selection, highlights, siblingOrder, spouseOrder, or theme change
  React.useEffect(() => {
    // Avoid recomputing during active node drag
    if (dragStateRef.current) return;

    const { nodes: updatedNodes, edges: updatedEdges } = generateTreeLayout(
      people,
      relationships,
      {
        selectedPersonId: selectedPerson?.id,
        highlightedPersonIds,
        highlightedEdgeIds,
        siblingOrder,
        spouseOrder,
        referencePersonConfig,
        isCompact,
        isDark,
        onSelectPerson,
        onViewProfile,
        onFindRelationship,
        onSwapSpouses: handleSwapSpouses,
      }
    );
    setNodes(updatedNodes);
    setEdges(updatedEdges);
  }, [
    people,
    relationships,
    selectedPerson?.id,
    highlightedPersonIds,
    highlightedEdgeIds,
    siblingOrder,
    spouseOrder,
    referencePersonConfig,
    isCompact,
    isDark,
    onSelectPerson,
    onViewProfile,
    onFindRelationship,
    handleSwapSpouses,
    setNodes,
    setEdges,
  ]);

  // Handle node changes: lock Y in level row and synchronously translate descendant branch
  const handleNodesChange = useCallback(
    (changes: NodeChange<Node>[]) => {
      const drag = dragStateRef.current;
      if (drag && drag.draggedNodeId) {
        const positionChanges = changes.filter(
          (c) => c.type === "position" && c.id === drag.draggedNodeId && c.position
        );

        if (positionChanges.length > 0) {
          const pChange = positionChanges[0] as {
            type: "position";
            id: string;
            position: { x: number; y: number };
            dragging?: boolean;
          };

          const origin = drag.initialPositions.get(drag.draggedNodeId);
          if (origin) {
            // 1. Lock Y to level row
            pChange.position.y = origin.y;
            const dx = pChange.position.x - origin.x;
            drag.currentDx = dx;

            // 2. Synchronously move all descendant and spouse/union nodes in this subtree
            const additionalChanges: NodeChange<Node>[] = [];
            for (const subId of drag.subtreeNodeIds) {
              if (subId !== drag.draggedNodeId) {
                const subOrigin = drag.initialPositions.get(subId);
                if (subOrigin) {
                  additionalChanges.push({
                    type: "position",
                    id: subId,
                    position: {
                      x: subOrigin.x + dx,
                      y: subOrigin.y,
                    },
                    dragging: pChange.dragging,
                  });
                }
              }
            }

            setNodes((nds) => applyNodeChanges([...changes, ...additionalChanges], nds));
            return;
          }
        }
      }

      setNodes((nds) => applyNodeChanges(changes, nds));
    },
    []
  );

  const handleNodeDragStart: OnNodeDrag<Node> = useCallback(
    (_, node) => {
      if (node.type !== "personNode") return;

      setHoveredPersonId(null);
      const subtreeNodeIds = getSubtreeNodeIds(node.id, relationships, nodes);
      const siblingCtx = getSiblingContext(node.id, people, relationships);

      const initialPositions = new Map<string, { x: number; y: number }>();
      for (const n of nodes) {
        initialPositions.set(n.id, { x: n.position.x, y: n.position.y });
      }

      dragStateRef.current = {
        draggedNodeId: node.id,
        initialPositions,
        subtreeNodeIds,
        siblingCtx,
        currentDx: 0,
      };
    },
    [nodes, people, relationships, setHoveredPersonId]
  );

  const handleNodeDrag: OnNodeDrag<Node> = useCallback(
    (_, node) => {
      const drag = dragStateRef.current;
      if (!drag || drag.draggedNodeId !== node.id) return;
      const origin = drag.initialPositions.get(node.id);
      if (origin) {
        drag.currentDx = node.position.x - origin.x;
        node.position.y = origin.y;
      }
    },
    []
  );

  const handleNodeDragStop: OnNodeDrag<Node> = useCallback(
    (_, node) => {
      const drag = dragStateRef.current;
      if (!drag) return;

      const { siblingCtx, subtreeNodeIds, initialPositions, currentDx } = drag;

      if (siblingCtx && siblingCtx.siblingIds.length > 1) {
        // Calculate effective X position of each sibling
        const getEffectiveX = (personId: string): number => {
          if (personId === drag.draggedNodeId) {
            return node.position.x;
          }
          if (subtreeNodeIds.has(personId)) {
            const orig = initialPositions.get(personId);
            return orig ? orig.x + currentDx : 0;
          }
          const found = nodes.find((n) => n.id === personId);
          return found ? found.position.x : 0;
        };

        const sortedSiblings = [...siblingCtx.siblingIds].sort(
          (a, b) => getEffectiveX(a) - getEffectiveX(b)
        );

        // Check if order changed
        const orderChanged = sortedSiblings.some(
          (id, index) => id !== siblingCtx.siblingIds[index]
        );

        if (orderChanged) {
          const updatedOrder: TreeSiblingOrder = {
            ...(siblingOrder || {}),
            [siblingCtx.parentKey]: sortedSiblings,
          };
          for (const pid of siblingCtx.parentIds) {
            updatedOrder[pid] = sortedSiblings;
          }

          if (treeId) {
            saveSiblingOrder(treeId, updatedOrder);
          }
          if (onUpdateSiblingOrder) {
            onUpdateSiblingOrder(updatedOrder);
          }

          const { nodes: updatedNodes, edges: updatedEdges } = generateTreeLayout(
            people,
            relationships,
            {
              selectedPersonId: selectedPerson?.id,
              highlightedPersonIds,
              highlightedEdgeIds,
              siblingOrder: updatedOrder,
              referencePersonConfig,
              isCompact,
              isDark,
              onSelectPerson,
              onViewProfile,
              onFindRelationship,
            }
          );
          setNodes(updatedNodes);
          setEdges(updatedEdges);
          dragStateRef.current = null;
          return;
        }
      }

      // If order didn't change (dropped without passing a sibling), snap back cleanly
      const { nodes: resetNodes, edges: resetEdges } = generateTreeLayout(
        people,
        relationships,
        {
          selectedPersonId: selectedPerson?.id,
          highlightedPersonIds,
          highlightedEdgeIds,
          siblingOrder,
          referencePersonConfig,
          isCompact,
          isDark,
          onSelectPerson,
          onViewProfile,
          onFindRelationship,
        }
      );
      setNodes(resetNodes);
      setEdges(resetEdges);
      dragStateRef.current = null;
    },
    [
      nodes,
      people,
      relationships,
      selectedPerson?.id,
      highlightedPersonIds,
      highlightedEdgeIds,
      siblingOrder,
      referencePersonConfig,
      treeId,
      isCompact,
      isDark,
      onSelectPerson,
      onViewProfile,
      onFindRelationship,
      onUpdateSiblingOrder,
      setEdges,
    ]
  );

  const handleEdgeMouseEnter = useCallback((_: React.MouseEvent, edge: { id: string }) => {
    setHoveredEdgeId(edge.id);
  }, [setHoveredEdgeId]);

  const handleEdgeMouseLeave = useCallback(() => {
    setHoveredEdgeId(null);
  }, [setHoveredEdgeId]);

  const handleNodeMouseEnter = useCallback((_: React.MouseEvent, node: Node) => {
    if (node.type === "personNode") {
      setHoveredPersonId(node.id);
    }
  }, [setHoveredPersonId]);

  const handleNodeMouseLeave = useCallback(() => {
    setHoveredPersonId(null);
  }, [setHoveredPersonId]);

  // Compute immediate relatives (parents, spouse, children) and immediate arrows when a card is hovered
  const { immediateNodeIds, immediateEdgeIds } = useMemo(() => {
    if (!hoveredPersonId) {
      return {
        immediateNodeIds: new Set<string>(),
        immediateEdgeIds: new Set<string>(),
      };
    }

    const nodeIds = new Set<string>([hoveredPersonId]);
    const edgeIds = new Set<string>();

    const parents = new Set<string>();
    const children = new Set<string>();
    const spouses = new Set<string>();

    for (const rel of relationships) {
      // Parent-child relationships (personId1 = parent, personId2 = child)
      if (
        rel.type === "parent-child" ||
        rel.type === "adoptive-parent-child" ||
        rel.type === "step-parent-child"
      ) {
        if (rel.personId2 === hoveredPersonId) {
          parents.add(rel.personId1);
          nodeIds.add(rel.personId1);
        }
        if (rel.personId1 === hoveredPersonId) {
          children.add(rel.personId2);
          nodeIds.add(rel.personId2);
        }
      }

      // Spouse relationships
      if (rel.type === "spouse" || rel.type === "former-spouse") {
        if (rel.personId1 === hoveredPersonId) {
          spouses.add(rel.personId2);
          nodeIds.add(rel.personId2);
        } else if (rel.personId2 === hoveredPersonId) {
          spouses.add(rel.personId1);
          nodeIds.add(rel.personId1);
        }
      }
    }

    // Connect union nodes involved with hovered person or their parents
    const connectedUnionIds = new Set<string>();
    for (const node of nodes) {
      if (node.type === "unionNode") {
        const uData = node.data as { spouse1Id?: string; spouse2Id?: string };
        if (
          uData.spouse1Id === hoveredPersonId ||
          uData.spouse2Id === hoveredPersonId
        ) {
          connectedUnionIds.add(node.id);
          nodeIds.add(node.id);
        }
        if (
          uData.spouse1Id &&
          uData.spouse2Id &&
          parents.has(uData.spouse1Id) &&
          parents.has(uData.spouse2Id)
        ) {
          connectedUnionIds.add(node.id);
          nodeIds.add(node.id);
        }
      }
    }

    // Identify immediate arrows connected to hovered person or immediate relatives
    for (const edge of edges) {
      const isDirect =
        edge.source === hoveredPersonId || edge.target === hoveredPersonId;
      const isUnionSpouse =
        (edge.source === hoveredPersonId && connectedUnionIds.has(edge.target)) ||
        (connectedUnionIds.has(edge.source) && edge.target === hoveredPersonId) ||
        (spouses.has(edge.source) && connectedUnionIds.has(edge.target)) ||
        (connectedUnionIds.has(edge.source) && spouses.has(edge.target));
      const isParentChild =
        (parents.has(edge.source) && edge.target === hoveredPersonId) ||
        (connectedUnionIds.has(edge.source) && edge.target === hoveredPersonId) ||
        (edge.source === hoveredPersonId && children.has(edge.target)) ||
        (connectedUnionIds.has(edge.source) && children.has(edge.target));

      if (isDirect || isUnionSpouse || isParentChild) {
        edgeIds.add(edge.id);
      }
    }

    return { immediateNodeIds: nodeIds, immediateEdgeIds: edgeIds };
  }, [hoveredPersonId, relationships, nodes, edges]);

  // When hovering an edge or card: elevate immediate arrows and dim non-relevant arrows
  const displayEdges = useMemo(() => {
    // 1. Direct Edge Hover
    if (hoveredEdgeId) {
      const hovered = edges.find((e) => e.id === hoveredEdgeId);
      if (!hovered) return edges;

      const others = edges
        .filter((e) => e.id !== hoveredEdgeId)
        .map((e) => ({
          ...e,
          style: {
            ...e.style,
            opacity: 0.15,
            transition: "opacity 0.2s ease",
          },
        }));

      const elevatedHovered = {
        ...hovered,
        zIndex: 1000,
        style: {
          ...hovered.style,
          opacity: 1,
          strokeWidth: Math.max(Number(hovered.style?.strokeWidth || 2) + 2, 4.5),
          zIndex: 1000,
          transition: "all 0.2s ease",
        },
      };

      return [...others, elevatedHovered];
    }

    // 2. Card Hover -> highlight its immediate arrows (same as arrows) and dim other arrows
    if (hoveredPersonId && immediateEdgeIds.size > 0) {
      const immediateList: typeof edges = [];
      const othersList: typeof edges = [];

      for (const edge of edges) {
        if (immediateEdgeIds.has(edge.id)) {
          immediateList.push({
            ...edge,
            zIndex: 1000,
            style: {
              ...edge.style,
              opacity: 1,
              strokeWidth: Math.max(Number(edge.style?.strokeWidth || 2) + 1.8, 4),
              zIndex: 1000,
              transition: "all 0.2s ease",
            },
          });
        } else {
          othersList.push({
            ...edge,
            style: {
              ...edge.style,
              opacity: 0.15,
              transition: "opacity 0.2s ease",
            },
          });
        }
      }

      // Elevated immediate arrows placed on top in SVG
      return [...othersList, ...immediateList];
    }

    return edges;
  }, [edges, hoveredEdgeId, hoveredPersonId, immediateEdgeIds]);

  // When hovering a card: highlight immediate nodes (parents, spouse, children) and dim others
  const displayNodes = useMemo(() => {
    if (!hoveredPersonId) return nodes;

    return nodes.map((node) => {
      const isHoveredTarget = node.id === hoveredPersonId;
      const isImmediateRelative = immediateNodeIds.has(node.id);

      if (isHoveredTarget) {
        return {
          ...node,
          zIndex: 100,
          data: {
            ...node.data,
            isCardHoverTarget: true,
            isHighlighted: true,
          },
          style: {
            ...node.style,
            opacity: 1,
            transition: "opacity 0.2s ease, transform 0.2s ease",
          },
        };
      }

      if (isImmediateRelative) {
        return {
          ...node,
          zIndex: 90,
          data: {
            ...node.data,
            isRelativeHighlighted: true,
            isHighlighted: true,
          },
          style: {
            ...node.style,
            opacity: 1,
            transition: "opacity 0.2s ease",
          },
        };
      }

      // Other nodes: dim to 0.25 opacity
      return {
        ...node,
        zIndex: 1,
        data: {
          ...node.data,
          isDimmed: true,
        },
        style: {
          ...node.style,
          opacity: 0.25,
          transition: "opacity 0.2s ease",
        },
      };
    });
  }, [nodes, hoveredPersonId, immediateNodeIds]);

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      if (node.type === "unionNode") {
        const uData = node.data as { spouse1Id?: string; spouse2Id?: string };
        if (uData?.spouse1Id && uData?.spouse2Id) {
          handleSwapSpouses(uData.spouse1Id, uData.spouse2Id);
          return;
        }
      }
      const person = people.find((p) => p.id === node.id);
      if (person) {
        onSelectPerson(person);
      }
    },
    [people, onSelectPerson, handleSwapSpouses]
  );

  const handlePaneClick = useCallback(() => {
    onSelectPerson(null);
  }, [onSelectPerson]);

  return (
    <div className="relative h-full w-full bg-[#FAF8F5] dark:bg-[#111513] select-none transition-colors">
      <ReactFlow
        nodes={displayNodes}
        edges={displayEdges}
        onNodesChange={handleNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDragStart={handleNodeDragStart}
        onNodeDrag={handleNodeDrag}
        onNodeDragStop={handleNodeDragStop}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
        onNodeMouseEnter={handleNodeMouseEnter}
        onNodeMouseLeave={handleNodeMouseLeave}
        onEdgeMouseEnter={handleEdgeMouseEnter}
        onEdgeMouseLeave={handleEdgeMouseLeave}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.2}
        maxZoom={1.8}
        defaultViewport={{ x: 0, y: 0, zoom: 0.85 }}
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1.5}
          color={isDark ? "#27332C" : "#D4CFC5"}
        />
        <Controls
          showInteractive={false}
          className="!bottom-6 !left-6 !bg-white dark:!bg-[#18201B] !shadow-md !rounded-xl !border !border-stone-200 dark:!border-stone-800"
        />
        <MiniMap
          nodeStrokeColor={isDark ? "#52B788" : "#1B4D3E"}
          nodeColor={isDark ? "#1F2E26" : "#E8F1EC"}
          nodeBorderRadius={8}
          maskColor={isDark ? "rgba(17, 21, 19, 0.75)" : "rgba(251, 249, 245, 0.75)"}
          className="!bottom-6 !right-6 !bg-white/90 dark:!bg-[#18201B]/90 !backdrop-blur-xs !border !border-stone-200 dark:!border-stone-800 !rounded-xl !shadow-md hidden sm:block"
          style={{ width: 140, height: 95 }}
        />
      </ReactFlow>

      {/* Blank Tree Empty State Overlay */}
      {people.length === 0 && (
        <div className="absolute inset-0 z-10 flex items-center justify-center p-4 pointer-events-none">
          <div className="pointer-events-auto max-w-md w-full rounded-2xl border border-stone-200/90 dark:border-stone-800 bg-white/95 dark:bg-[#18201B]/95 p-6 text-center shadow-xl backdrop-blur-md">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 mb-4">
              <Sparkles className="h-7 w-7 text-emerald-700 dark:text-emerald-400" />
            </div>
            <h3 className="font-serif text-lg font-bold text-stone-900 dark:text-stone-100">
              Your Family Tree is Blank
            </h3>
            <p className="mt-2 text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
              Start charting your ancestry by recording the first family member, or import an existing GEDCOM / JSON archive.
            </p>
            <div className="mt-5 flex flex-col sm:flex-row items-center justify-center gap-2.5">
              {onAddPerson && (
                <Button onClick={onAddPerson} size="sm" className="w-full sm:w-auto gap-1.5 text-xs">
                  <UserPlus className="h-3.5 w-3.5" />
                  Add First Person
                </Button>
              )}
              {onOpenExportImport && (
                <Button onClick={onOpenExportImport} variant="outline" size="sm" className="w-full sm:w-auto gap-1.5 text-xs">
                  <DownloadCloud className="h-3.5 w-3.5" />
                  Import Data
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
