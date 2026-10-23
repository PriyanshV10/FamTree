"use client";

import React, { memo } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";

export interface UnionNodeData extends Record<string, unknown> {
  spouse1Id: string;
  spouse2Id: string;
  isHighlighted?: boolean;
  onSwapSpouses?: (spouse1Id: string, spouse2Id: string) => void;
}

function UnionNodeComponent({ data }: NodeProps) {
  const nodeData = data as unknown as UnionNodeData;
  const isHighlighted = Boolean(nodeData?.isHighlighted);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (nodeData?.onSwapSpouses && nodeData.spouse1Id && nodeData.spouse2Id) {
      nodeData.onSwapSpouses(nodeData.spouse1Id, nodeData.spouse2Id);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      e.stopPropagation();
      if (nodeData?.onSwapSpouses && nodeData.spouse1Id && nodeData.spouse2Id) {
        nodeData.onSwapSpouses(nodeData.spouse1Id, nodeData.spouse2Id);
      }
    }
  };

  return (
    <div
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      className={`group relative flex h-4 w-4 items-center justify-center rounded-full border transition-all cursor-pointer hover:scale-125 active:scale-95 ${
        isHighlighted
          ? "border-amber-500 bg-amber-400 dark:border-amber-400 dark:bg-amber-500 ring-2 ring-amber-300/60 shadow-xs"
          : "border-rose-400 dark:border-rose-500/80 bg-white dark:bg-[#18201B] hover:border-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 shadow-2xs"
      }`}
      title="Click to swap spouse positions"
    >
      {/* Tiny inner center indicator */}
      <span
        className={`h-2 w-2 rounded-full pointer-events-none transition-transform group-hover:scale-110 ${
          isHighlighted ? "bg-amber-700 dark:bg-amber-900" : "bg-rose-500 group-hover:bg-rose-600"
        }`}
      />

      {/* Left Handle for Spouse 1 */}
      <Handle
        type="target"
        position={Position.Left}
        id="spouse-left"
        className="!h-0 !w-0 !min-h-0 !min-w-0 !opacity-0 !border-0 pointer-events-none"
      />

      {/* Right Handle for Spouse 2 */}
      <Handle
        type="source"
        position={Position.Right}
        id="spouse-right"
        className="!h-0 !w-0 !min-h-0 !min-w-0 !opacity-0 !border-0 pointer-events-none"
      />

      {/* Bottom Handle: Origin of children's arrows */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="children-source"
        className="!h-0 !w-0 !min-h-0 !min-w-0 !opacity-0 !border-0 pointer-events-none"
      />
    </div>
  );
}

export const UnionNode = memo(UnionNodeComponent);
