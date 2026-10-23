import { Node, Edge, MarkerType } from "@xyflow/react";
import { Person, Relationship, TreeNodeData } from "@/types";
import { ReferencePersonConfig } from "@/lib/reference-person";

export interface LayoutOptions {
  selectedPersonId?: string | null;
  highlightedPersonIds?: Set<string>;
  highlightedEdgeIds?: Set<string>;
  isCompact?: boolean;
  isDark?: boolean;
  onSelectPerson?: (person: Person) => void;
  onViewProfile?: (personId: string) => void;
  onFindRelationship?: (person: Person) => void;
  siblingOrder?: Record<string, string[]>;
  spouseOrder?: Record<string, string[]>;
  referencePersonConfig?: ReferencePersonConfig | null;
  onSwapSpouses?: (spouse1Id: string, spouse2Id: string) => void;
}

export const EDGE_PALETTE_LIGHT = [
  "#1B4D3E", // 0: Forest Emerald (Default brand green)
  "#2563EB", // 1: Royal Sapphire Blue
  "#7C3AED", // 2: Amethyst Purple
  "#D97706", // 3: Golden Amber
  "#0D9488", // 4: Persian Teal
  "#C026D3", // 5: Vivid Magenta
  "#0284C7", // 6: Cerulean Sky
  "#EA580C", // 7: Rust Orange
  "#4F46E5", // 8: Deep Indigo
  "#DC2626", // 9: Crimson Red
];

export const EDGE_PALETTE_DARK = [
  "#34D399", // 0: Bright Emerald
  "#60A5FA", // 1: Sky Blue
  "#A78BFA", // 2: Soft Violet
  "#FBBF24", // 3: Golden Amber
  "#2DD4BF", // 4: Mint Teal
  "#E879F9", // 5: Bright Fuchsia
  "#38BDF8", // 6: Cyan
  "#FB923C", // 7: Tangerine
  "#818CF8", // 8: Periwinkle Indigo
  "#F87171", // 9: Coral Red
];

export interface EdgeGeometry {
  edgeId: string;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  midY: number;
  isHighlighted: boolean;
  siblingIndex: number;
}

export function getEdgeSegments(edge: EdgeGeometry): { x1: number; y1: number; x2: number; y2: number; isVertical: boolean }[] {
  // If straight vertical (sourceX === targetX)
  if (Math.abs(edge.sourceX - edge.targetX) < 1) {
    return [
      {
        x1: edge.sourceX,
        y1: Math.min(edge.sourceY, edge.targetY),
        x2: edge.sourceX,
        y2: Math.max(edge.sourceY, edge.targetY),
        isVertical: true,
      },
    ];
  }

  // 3 segments: V1, H, V2
  return [
    {
      x1: edge.sourceX,
      y1: Math.min(edge.sourceY, edge.midY),
      x2: edge.sourceX,
      y2: Math.max(edge.sourceY, edge.midY),
      isVertical: true,
    },
    {
      x1: Math.min(edge.sourceX, edge.targetX),
      y1: edge.midY,
      x2: Math.max(edge.sourceX, edge.targetX),
      y2: edge.midY,
      isVertical: false,
    },
    {
      x1: edge.targetX,
      y1: Math.min(edge.midY, edge.targetY),
      x2: edge.targetX,
      y2: Math.max(edge.midY, edge.targetY),
      isVertical: true,
    },
  ];
}

export function doEdgesIntersect(a: EdgeGeometry, b: EdgeGeometry): boolean {
  if (a.edgeId === b.edgeId) return false;

  const aSegments = getEdgeSegments(a);
  const bSegments = getEdgeSegments(b);

  const EPS = 2;

  for (const sA of aSegments) {
    for (const sB of bSegments) {
      if (sA.isVertical && !sB.isVertical) {
        const vx = sA.x1;
        const vMinY = sA.y1;
        const vMaxY = sA.y2;
        const hy = sB.y1;
        const hMinX = sB.x1 + EPS;
        const hMaxX = sB.x2 - EPS;

        if (vx >= hMinX && vx <= hMaxX && hy >= vMinY && hy <= vMaxY) {
          return true;
        }
      } else if (!sA.isVertical && sB.isVertical) {
        const hy = sA.y1;
        const hMinX = sA.x1 + EPS;
        const hMaxX = sA.x2 - EPS;
        const vx = sB.x1;
        const vMinY = sB.y1;
        const vMaxY = sB.y2;

        if (vx >= hMinX && vx <= hMaxX && hy >= vMinY && hy <= vMaxY) {
          return true;
        }
      } else if (!sA.isVertical && !sB.isVertical && Math.abs(sA.y1 - sB.y1) < 5) {
        const overlapStart = Math.max(sA.x1, sB.x1);
        const overlapEnd = Math.min(sA.x2, sB.x2);
        if (overlapEnd - overlapStart > 10) {
          return true;
        }
      } else if (sA.isVertical && sB.isVertical && Math.abs(sA.x1 - sB.x1) < 5) {
        const overlapStart = Math.max(sA.y1, sB.y1);
        const overlapEnd = Math.min(sA.y2, sB.y2);
        if (overlapEnd - overlapStart > 10) {
          return true;
        }
      }
    }
  }

  return false;
}

export function assignConflictFreeEdgeColors(
  geometries: EdgeGeometry[],
  isDark: boolean = false
): Map<string, string> {
  const palette = isDark ? EDGE_PALETTE_DARK : EDGE_PALETTE_LIGHT;
  const conflictGraph = new Map<string, Set<string>>();

  for (const g of geometries) {
    conflictGraph.set(g.edgeId, new Set());
  }

  for (let i = 0; i < geometries.length; i++) {
    for (let j = i + 1; j < geometries.length; j++) {
      if (doEdgesIntersect(geometries[i], geometries[j])) {
        conflictGraph.get(geometries[i].edgeId)!.add(geometries[j].edgeId);
        conflictGraph.get(geometries[j].edgeId)!.add(geometries[i].edgeId);
      }
    }
  }

  const assignedColorIndices = new Map<string, number>();

  for (const g of geometries) {
    if (g.isHighlighted) continue;

    const neighborIds = conflictGraph.get(g.edgeId) || new Set();
    const usedIndices = new Set<number>();
    for (const nId of neighborIds) {
      const idx = assignedColorIndices.get(nId);
      if (idx !== undefined) usedIndices.add(idx);
    }

    const preferredIdx = g.siblingIndex % palette.length;

    let chosenIdx: number;
    if (!usedIndices.has(preferredIdx)) {
      chosenIdx = preferredIdx;
    } else {
      let found = -1;
      for (let c = 0; c < palette.length; c++) {
        if (!usedIndices.has(c)) {
          found = c;
          break;
        }
      }
      chosenIdx = found !== -1 ? found : (preferredIdx + 1) % palette.length;
    }

    assignedColorIndices.set(g.edgeId, chosenIdx);
  }

  const colorMap = new Map<string, string>();
  for (const g of geometries) {
    if (g.isHighlighted) {
      colorMap.set(g.edgeId, isDark ? "#10B981" : "#047857");
    } else {
      const idx = assignedColorIndices.get(g.edgeId) ?? 0;
      colorMap.set(g.edgeId, palette[idx]);
    }
  }

  return colorMap;
}

export function computeGenerations(
  people: Person[],
  relationships: Relationship[],
  config?: ReferencePersonConfig | null
): Map<string, number> {
  const generations = new Map<string, number>();
  if (people.length === 0) return generations;

  // Build bidirectional graph of generation deltas:
  // delta = Gen(neighbor) - Gen(current)
  const adj = new Map<string, Array<{ target: string; delta: number }>>();
  const addEdge = (u: string, v: string, delta: number) => {
    let list = adj.get(u);
    if (!list) {
      list = [];
      adj.set(u, list);
    }
    list.push({ target: v, delta });
  };

  for (const rel of relationships) {
    if (
      rel.type === "parent-child" ||
      rel.type === "adoptive-parent-child" ||
      rel.type === "step-parent-child"
    ) {
      // Parent -> Child: +1
      addEdge(rel.personId1, rel.personId2, 1);
      // Child -> Parent: -1
      addEdge(rel.personId2, rel.personId1, -1);
    } else if (rel.type === "spouse" || rel.type === "former-spouse") {
      // Spouse <-> Spouse: 0
      addEdge(rel.personId1, rel.personId2, 0);
      addEdge(rel.personId2, rel.personId1, 0);
    }
  }

  // 1. Identify reference person
  let refPerson: Person | undefined;
  if (config?.personId) {
    refPerson = people.find((p) => p.id === config.personId);
  }
  // Auto / first initially: pick earliest created person or people[0]
  if (!refPerson && people.length > 0) {
    const sorted = [...people].sort((a, b) =>
      (a.createdAt || "").localeCompare(b.createdAt || "")
    );
    refPerson = sorted[0] || people[0];
  }

  const baseGen = config?.baseGeneration ?? 0;

  // 2. BFS starting from reference person
  if (refPerson) {
    generations.set(refPerson.id, baseGen);
    const queue: string[] = [refPerson.id];

    while (queue.length > 0) {
      const currId = queue.shift()!;
      const currGen = generations.get(currId)!;
      const edges = adj.get(currId);
      if (edges) {
        for (const edge of edges) {
          const targetGen = currGen + edge.delta;
          if (!generations.has(edge.target)) {
            generations.set(edge.target, targetGen);
            queue.push(edge.target);
          }
        }
      }
    }
  }

  // 3. Fallback for any disconnected components not reached from reference person
  for (const person of people) {
    if (generations.has(person.id)) continue;

    generations.set(person.id, baseGen);
    const queue: string[] = [person.id];

    while (queue.length > 0) {
      const currId = queue.shift()!;
      const currGen = generations.get(currId)!;
      const edges = adj.get(currId);
      if (edges) {
        for (const edge of edges) {
          const targetGen = currGen + edge.delta;
          if (!generations.has(edge.target)) {
            generations.set(edge.target, targetGen);
            queue.push(edge.target);
          }
        }
      }
    }
  }

  return generations;
}

export function generateTreeLayout(
  people: Person[],
  relationships: Relationship[],
  options: LayoutOptions = {}
): { nodes: Node[]; edges: Edge[] } {
  const isCompact = Boolean(options.isCompact);
  const generations = computeGenerations(
    people,
    relationships,
    options.referencePersonConfig
  );

  // Group individuals by generation rank
  const generationGroups = new Map<number, Person[]>();
  for (const person of people) {
    const gen = generations.get(person.id) || 0;
    const group = generationGroups.get(gen) || [];
    group.push(person);
    generationGroups.set(gen, group);
  }

  // Coordinate positioning dimensions
  const nodeWidth = isCompact ? 112 : 160;
  const nodeHeight = isCompact ? 86 : 195;
  const nodeGapX = isCompact ? 20 : 36;
  const genGapY = isCompact ? 146 : 265;
  const startY = 60;

  const positions = new Map<string, { x: number; y: number }>();

  // Map child -> parents for parent-anchored placement
  const childToParentsMap = new Map<string, string[]>();
  for (const rel of relationships) {
    if (
      rel.type === "parent-child" ||
      rel.type === "adoptive-parent-child" ||
      rel.type === "step-parent-child"
    ) {
      const pList = childToParentsMap.get(rel.personId2) || [];
      pList.push(rel.personId1);
      childToParentsMap.set(rel.personId2, pList);
    }
  }

  // --- HIERARCHICAL SUBTREE-AWARE TREE LAYOUT ---
  interface LayoutCouple {
    id: string;
    people: Person[];
    generation: number;
    children: LayoutCouple[];
    width: number;
    x?: number;
  }

  function computeSubtreeWidth(
    couple: LayoutCouple,
    widthNode: number,
    gapX: number
  ): number {
    const ownWidth =
      couple.people.length * widthNode + (couple.people.length - 1) * gapX;
    if (couple.children.length === 0) {
      couple.width = ownWidth;
      return ownWidth;
    }

    let childrenWidth = 0;
    for (let i = 0; i < couple.children.length; i++) {
      const childW = computeSubtreeWidth(couple.children[i], widthNode, gapX);
      childrenWidth += childW + (i > 0 ? gapX : 0);
    }

    couple.width = Math.max(ownWidth, childrenWidth);
    return couple.width;
  }

  function assignCoupleCoordinates(
    couple: LayoutCouple,
    startX: number,
    yStart: number,
    gapY: number,
    widthNode: number,
    gapX: number,
    posMap: Map<string, { x: number; y: number }>,
    placedSet: Set<string>
  ) {
    const ownWidth =
      couple.people.length * widthNode + (couple.people.length - 1) * gapX;
    const y = yStart + couple.generation * gapY;

    // Center this parent couple directly over their subtree
    const coupleLeftX = startX + (couple.width - ownWidth) / 2;
    couple.x = coupleLeftX + ownWidth / 2;

    couple.people.forEach((p, idx) => {
      posMap.set(p.id, {
        x: coupleLeftX + idx * (widthNode + gapX),
        y,
      });
      placedSet.add(p.id);
    });

    if (couple.children.length > 0) {
      let childrenTotalWidth = 0;
      for (let i = 0; i < couple.children.length; i++) {
        childrenTotalWidth += couple.children[i].width + (i > 0 ? gapX : 0);
      }

      let childStartX = startX + (couple.width - childrenTotalWidth) / 2;

      for (const child of couple.children) {
        assignCoupleCoordinates(
          child,
          childStartX,
          yStart,
          gapY,
          widthNode,
          gapX,
          posMap,
          placedSet
        );
        childStartX += child.width + gapX;
      }
    }
  }

  // 1. Build couple units
  const personToCouple = new Map<string, LayoutCouple>();
  const couples: LayoutCouple[] = [];
  const processedPersons = new Set<string>();

  // Find all spouse relationships in the same generation
  for (const rel of relationships) {
    if (rel.type === "spouse" || rel.type === "former-spouse") {
      const p1 = people.find((p) => p.id === rel.personId1);
      const p2 = people.find((p) => p.id === rel.personId2);
      if (!p1 || !p2) continue;

      const gen1 = generations.get(p1.id) || 0;
      const gen2 = generations.get(p2.id) || 0;
      if (gen1 === gen2 && !processedPersons.has(p1.id) && !processedPersons.has(p2.id)) {
        const p1Parents = childToParentsMap.get(p1.id) || [];
        const p2Parents = childToParentsMap.get(p2.id) || [];

        const coupleId = [p1.id, p2.id].sort().join("___");
        let peopleList = [p1, p2];
        if (p2Parents.length > 0 && p1Parents.length === 0) {
          peopleList = [p2, p1];
        }

        // Apply custom spouseOrder if present
        const customSpouseOrder = options.spouseOrder?.[coupleId];
        if (customSpouseOrder && customSpouseOrder.length >= 2) {
          const first = peopleList.find((p) => p.id === customSpouseOrder[0]);
          const second = peopleList.find((p) => p.id === customSpouseOrder[1]);
          if (first && second) {
            peopleList = [first, second];
          }
        }

        const couple: LayoutCouple = {
          id: coupleId,
          people: peopleList,
          generation: gen1,
          children: [],
          width: 0,
        };

        couples.push(couple);
        personToCouple.set(p1.id, couple);
        personToCouple.set(p2.id, couple);
        processedPersons.add(p1.id);
        processedPersons.add(p2.id);
      }
    }
  }

  // Any remaining person without a spouse is a single-person couple
  for (const person of people) {
    if (!processedPersons.has(person.id)) {
      const gen = generations.get(person.id) || 0;
      const couple: LayoutCouple = {
        id: person.id,
        people: [person],
        generation: gen,
        children: [],
        width: 0,
      };
      couples.push(couple);
      personToCouple.set(person.id, couple);
      processedPersons.add(person.id);
    }
  }

  // 2. Link parent couples -> child couples
  const childCoupleToParentCouple = new Map<string, LayoutCouple>();

  for (const rel of relationships) {
    if (
      rel.type === "parent-child" ||
      rel.type === "adoptive-parent-child" ||
      rel.type === "step-parent-child"
    ) {
      const parentCouple = personToCouple.get(rel.personId1);
      const childCouple = personToCouple.get(rel.personId2);

      if (parentCouple && childCouple && parentCouple !== childCouple) {
        if (!childCoupleToParentCouple.has(childCouple.id)) {
          childCoupleToParentCouple.set(childCouple.id, parentCouple);
          parentCouple.children.push(childCouple);
        }
      }
    }
  }

  // Sort children of each couple stably by custom siblingOrder or birthDate or id
  for (const c of couples) {
    let customOrder: string[] | undefined = options.siblingOrder?.[c.id];
    if (!customOrder) {
      for (const p of c.people) {
        if (options.siblingOrder?.[p.id]) {
          customOrder = options.siblingOrder[p.id];
          break;
        }
      }
    }
    if (!customOrder && c.people.length > 1) {
      const sortedKey = c.people.map((p) => p.id).sort().join("___");
      customOrder = options.siblingOrder?.[sortedKey];
    }

    const getChildRank = (couple: LayoutCouple): number => {
      if (!customOrder) return -1;
      const byCoupleId = customOrder.indexOf(couple.id);
      if (byCoupleId !== -1) return byCoupleId;
      for (const p of couple.people) {
        const byPersonId = customOrder.indexOf(p.id);
        if (byPersonId !== -1) return byPersonId;
      }
      return -1;
    };

    c.children.sort((a, b) => {
      if (customOrder && customOrder.length > 0) {
        const rankA = getChildRank(a);
        const rankB = getChildRank(b);
        if (rankA !== -1 && rankB !== -1) return rankA - rankB;
        if (rankA !== -1) return -1;
        if (rankB !== -1) return 1;
      }

      const birthA = a.people[0]?.birthDate || "";
      const birthB = b.people[0]?.birthDate || "";
      if (birthA && birthB) return birthA.localeCompare(birthB);
      return a.id.localeCompare(b.id);
    });
  }

  // Find root couples (couples with no parent couple in this tree)
  const rootCouples = couples.filter((c) => !childCoupleToParentCouple.has(c.id));
  const rootOrder = options.siblingOrder?.["root"];
  const getRootRank = (couple: LayoutCouple): number => {
    if (!rootOrder) return -1;
    const byCoupleId = rootOrder.indexOf(couple.id);
    if (byCoupleId !== -1) return byCoupleId;
    for (const p of couple.people) {
      const byPersonId = rootOrder.indexOf(p.id);
      if (byPersonId !== -1) return byPersonId;
    }
    return -1;
  };

  rootCouples.sort((a, b) => {
    if (a.generation !== b.generation) {
      return a.generation - b.generation;
    }
    if (rootOrder && rootOrder.length > 0) {
      const rankA = getRootRank(a);
      const rankB = getRootRank(b);
      if (rankA !== -1 && rankB !== -1) return rankA - rankB;
      if (rankA !== -1) return -1;
      if (rankB !== -1) return 1;
    }
    return 0;
  });

  // 3. Compute subtree widths bottom-up
  for (const root of rootCouples) {
    computeSubtreeWidth(root, nodeWidth, nodeGapX);
  }

  // 4. Assign coordinates top-down
  let currentRootX = 60;
  const familyGapX = nodeGapX * 2;
  const placedPersons = new Set<string>();

  for (const root of rootCouples) {
    assignCoupleCoordinates(
      root,
      currentRootX,
      startY,
      genGapY,
      nodeWidth,
      nodeGapX,
      positions,
      placedPersons
    );
    currentRootX += root.width + familyGapX;
  }

  // Fallback for any unplaced disconnected individuals
  for (const person of people) {
    if (!placedPersons.has(person.id)) {
      const gen = generations.get(person.id) || 0;
      positions.set(person.id, {
        x: currentRootX,
        y: startY + gen * genGapY,
      });
      currentRootX += nodeWidth + nodeGapX;
    }
  }

  // Globally center the tree on the canvas
  let minTreeX = Infinity;
  let maxTreeX = -Infinity;
  for (const pos of positions.values()) {
    minTreeX = Math.min(minTreeX, pos.x);
    maxTreeX = Math.max(maxTreeX, pos.x + nodeWidth);
  }
  if (isFinite(minTreeX) && isFinite(maxTreeX)) {
    const treeWidth = maxTreeX - minTreeX;
    const centerShift = Math.max(60, 700 - treeWidth / 2) - minTreeX;
    if (Math.abs(centerShift) > 0.1) {
      for (const pos of positions.values()) {
        pos.x += centerShift;
      }
    }
  }

  // Construct React Flow Person Nodes
  const nodes: Node[] = people.map((person) => {
    const pos = positions.get(person.id) || { x: 100, y: 100 };
    const isSelected = options.selectedPersonId === person.id;
    const isHighlighted = options.highlightedPersonIds?.has(person.id) ?? false;
    const gen = generations.get(person.id) ?? 0;
    const isReferencePerson =
      options.referencePersonConfig?.personId === person.id ||
      (!options.referencePersonConfig?.personId && people[0]?.id === person.id);

    const personNodeData: TreeNodeData = {
      person,
      isSelected,
      isHighlighted,
      isCompact,
      isReferencePerson,
      generation: gen,
      onSelect: options.onSelectPerson,
      onViewProfile: options.onViewProfile,
      onFindRelationship: options.onFindRelationship,
    };

    return {
      id: person.id,
      type: "personNode",
      position: pos,
      data: personNodeData,
    };
  });

  const edges: Edge[] = [];

  // Identify partner unions
  const spouseRels = relationships.filter(
    (r) => r.type === "spouse" || r.type === "former-spouse"
  );

  interface UnionInfo {
    unionNodeId: string;
    spouse1Id: string;
    spouse2Id: string;
    rel: Relationship;
  }

  const unionMap = new Map<string, UnionInfo>(); // key: sorted "id1___id2"
  const personPairToUnionId = new Map<string, string>();

  for (const rel of spouseRels) {
    const pairKey = [rel.personId1, rel.personId2].sort().join("___");
    if (unionMap.has(pairKey)) continue;

    const pos1 = positions.get(rel.personId1);
    const pos2 = positions.get(rel.personId2);
    if (!pos1 || !pos2) continue;

    const leftId = pos1.x <= pos2.x ? rel.personId1 : rel.personId2;
    const rightId = pos1.x <= pos2.x ? rel.personId2 : rel.personId1;
    const leftPos = positions.get(leftId)!;
    const rightPos = positions.get(rightId)!;

    // Center point between spouses
    const xMid = (leftPos.x + nodeWidth + rightPos.x) / 2;
    const yMid = (leftPos.y + rightPos.y + nodeHeight) / 2;
    const unionNodeId = `union-${pairKey}`;

    const isUnionHighlighted =
      Boolean(options.highlightedEdgeIds?.has(rel.id)) ||
      (Boolean(options.highlightedPersonIds?.has(rel.personId1)) &&
        Boolean(options.highlightedPersonIds?.has(rel.personId2)));

    // Create Union Node (partner junction)
    nodes.push({
      id: unionNodeId,
      type: "unionNode",
      position: { x: xMid - 7, y: yMid - 7 },
      draggable: false,
      data: {
        spouse1Id: leftId,
        spouse2Id: rightId,
        isHighlighted: isUnionHighlighted,
        onSwapSpouses: options.onSwapSpouses,
      },
    });

    const info: UnionInfo = {
      unionNodeId,
      spouse1Id: leftId,
      spouse2Id: rightId,
      rel,
    };
    unionMap.set(pairKey, info);
    personPairToUnionId.set(`${leftId}___${rightId}`, unionNodeId);
    personPairToUnionId.set(`${rightId}___${leftId}`, unionNodeId);

    // Spouse horizontal edges to union node
    const strokeColor = isUnionHighlighted ? "#BE123C" : "#E11D48";
    const strokeWidth = isUnionHighlighted ? 3.5 : 2;

    edges.push({
      id: `${rel.id}-left`,
      source: leftId,
      target: unionNodeId,
      sourceHandle: "spouse-source",
      targetHandle: "spouse-left",
      type: "straight",
      style: {
        stroke: strokeColor,
        strokeWidth,
        strokeDasharray: rel.type === "former-spouse" ? "4,4" : undefined,
      },
      animated: isUnionHighlighted,
    });

    edges.push({
      id: `${rel.id}-right`,
      source: unionNodeId,
      target: rightId,
      sourceHandle: "spouse-right",
      targetHandle: "spouse-target",
      type: "straight",
      style: {
        stroke: strokeColor,
        strokeWidth,
        strokeDasharray: rel.type === "former-spouse" ? "4,4" : undefined,
      },
      animated: isUnionHighlighted,
    });
  }

  // Group parent-child relationships by child
  const parentChildRels = relationships.filter(
    (r) =>
      r.type === "parent-child" ||
      r.type === "adoptive-parent-child" ||
      r.type === "step-parent-child"
  );

  const childToRels = new Map<string, Relationship[]>();
  for (const rel of parentChildRels) {
    const list = childToRels.get(rel.personId2) || [];
    list.push(rel);
    childToRels.set(rel.personId2, list);
  }

  interface ChildEdgeSpec {
    id: string;
    source: string;
    target: string;
    sourceHandle: string;
    targetHandle: string;
    isHighlighted: boolean;
    isAdoptive: boolean;
    isStep: boolean;
    siblingIndex: number;
    geometry: EdgeGeometry;
  }

  const childEdgeSpecs: ChildEdgeSpec[] = [];
  const parentOrUnionSiblingCount = new Map<string, number>();

  // Collect candidate child edges and calculate geometries
  for (const [childId, rels] of childToRels.entries()) {
    const parentIds = rels.map((r) => r.personId1);
    const childPos = positions.get(childId);
    if (!childPos) continue;

    const targetX = childPos.x + nodeWidth / 2;
    const targetY = childPos.y;

    let handledByUnion = false;

    // Check if there are two parents who form a partner union
    if (parentIds.length >= 2) {
      for (let i = 0; i < parentIds.length && !handledByUnion; i++) {
        for (let j = i + 1; j < parentIds.length && !handledByUnion; j++) {
          const p1 = parentIds[i];
          const p2 = parentIds[j];
          const unionNodeId = personPairToUnionId.get(`${p1}___${p2}`);

          if (unionNodeId) {
            handledByUnion = true;
            const r1 = rels.find((r) => r.personId1 === p1)!;
            const r2 = rels.find((r) => r.personId1 === p2)!;

            const isAdoptive =
              r1.type === "adoptive-parent-child" ||
              r2.type === "adoptive-parent-child";
            const isStep =
              r1.type === "step-parent-child" ||
              r2.type === "step-parent-child";

            const isEdgeHighlighted =
              Boolean(options.highlightedEdgeIds?.has(r1.id)) ||
              Boolean(options.highlightedEdgeIds?.has(r2.id)) ||
              (Boolean(options.highlightedPersonIds?.has(childId)) &&
                (Boolean(options.highlightedPersonIds?.has(p1)) ||
                  Boolean(options.highlightedPersonIds?.has(p2))));

            const pairKey = [p1, p2].sort().join("___");
            const unionInfo = unionMap.get(pairKey);
            const leftPos = positions.get(unionInfo?.spouse1Id || p1) || { x: 0, y: 0 };
            const rightPos = positions.get(unionInfo?.spouse2Id || p2) || { x: 0, y: 0 };
            const xMid = (leftPos.x + nodeWidth + rightPos.x) / 2;
            const yMid = (leftPos.y + rightPos.y + nodeHeight) / 2;

            const sourceX = xMid;
            const sourceY = yMid + 7;
            const parentBottomY = Math.max(leftPos.y, rightPos.y) + nodeHeight;
            const midY = (parentBottomY + targetY) / 2;

            const sibIdx = parentOrUnionSiblingCount.get(unionNodeId) || 0;
            parentOrUnionSiblingCount.set(unionNodeId, sibIdx + 1);

            const edgeId = `union-child-${childId}`;
            childEdgeSpecs.push({
              id: edgeId,
              source: unionNodeId,
              target: childId,
              sourceHandle: "children-source",
              targetHandle: "parent-target",
              isHighlighted: isEdgeHighlighted,
              isAdoptive,
              isStep,
              siblingIndex: sibIdx,
              geometry: {
                edgeId,
                sourceX,
                sourceY,
                targetX,
                targetY,
                midY,
                isHighlighted: isEdgeHighlighted,
                siblingIndex: sibIdx,
              },
            });
          }
        }
      }
    }

    // Direct parent arrows if not handled by a partner union
    if (!handledByUnion) {
      for (const rel of rels) {
        const isAdoptive = rel.type === "adoptive-parent-child";
        const isStep = rel.type === "step-parent-child";

        const isEdgeHighlighted =
          Boolean(options.highlightedEdgeIds?.has(rel.id)) ||
          (Boolean(options.highlightedPersonIds?.has(rel.personId1)) &&
            Boolean(options.highlightedPersonIds?.has(rel.personId2)));

        const parentPos = positions.get(rel.personId1) || { x: 0, y: 0 };
        const sourceX = parentPos.x + nodeWidth / 2;
        const sourceY = parentPos.y + nodeHeight;
        const midY = (sourceY + targetY) / 2;

        const sibIdx = parentOrUnionSiblingCount.get(rel.personId1) || 0;
        parentOrUnionSiblingCount.set(rel.personId1, sibIdx + 1);

        childEdgeSpecs.push({
          id: rel.id,
          source: rel.personId1,
          target: rel.personId2,
          sourceHandle: "child-source",
          targetHandle: "parent-target",
          isHighlighted: isEdgeHighlighted,
          isAdoptive,
          isStep,
          siblingIndex: sibIdx,
          geometry: {
            edgeId: rel.id,
            sourceX,
            sourceY,
            targetX,
            targetY,
            midY,
            isHighlighted: isEdgeHighlighted,
            siblingIndex: sibIdx,
          },
        });
      }
    }
  }

  // Assign distinct colors so intersecting arrows never share the same color
  const geometries = childEdgeSpecs.map((s) => s.geometry);
  const colorMap = assignConflictFreeEdgeColors(geometries, options.isDark);

  for (const spec of childEdgeSpecs) {
    const strokeColor = colorMap.get(spec.id) || (options.isDark ? "#34D399" : "#1B4D3E");

    edges.push({
      id: spec.id,
      source: spec.source,
      target: spec.target,
      sourceHandle: spec.sourceHandle,
      targetHandle: spec.targetHandle,
      type: "contrastEdge",
      data: {
        busY: spec.geometry.midY,
      },
      style: {
        stroke: strokeColor,
        strokeWidth: spec.isHighlighted ? 3.5 : 2.25,
        strokeDasharray: spec.isAdoptive ? "5,5" : spec.isStep ? "3,3" : undefined,
      },
      animated: spec.isHighlighted,
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 14,
        height: 14,
        color: strokeColor,
      },
      label: spec.isAdoptive ? "Adoptive" : spec.isStep ? "Step" : undefined,
      labelStyle: { fill: strokeColor, fontSize: 10, fontWeight: 600 },
      labelBgStyle: { fill: options.isDark ? "#1C241F" : "#F0FDF4", fillOpacity: 0.9, rx: 4, ry: 4 },
    });
  }

  return { nodes, edges };
}
