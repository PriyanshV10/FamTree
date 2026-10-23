"use client";

import React, { memo } from "react";
import { BaseEdge, EdgeProps } from "@xyflow/react";

function getOrthogonalBusPath(
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
  busY: number,
  r = 8
): string {
  if (Math.abs(sourceX - targetX) < 1.5) {
    return `M ${sourceX} ${sourceY} L ${targetX} ${targetY}`;
  }
  const isRight = targetX > sourceX;
  const actualR = Math.min(
    r,
    Math.max(1, Math.abs(busY - sourceY) / 2),
    Math.max(1, Math.abs(targetY - busY) / 2),
    Math.max(1, Math.abs(targetX - sourceX) / 2)
  );

  if (isRight) {
    return `M ${sourceX} ${sourceY} L ${sourceX} ${busY - actualR} Q ${sourceX} ${busY} ${sourceX + actualR} ${busY} L ${targetX - actualR} ${busY} Q ${targetX} ${busY} ${targetX} ${busY + actualR} L ${targetX} ${targetY}`;
  } else {
    return `M ${sourceX} ${sourceY} L ${sourceX} ${busY - actualR} Q ${sourceX} ${busY} ${sourceX - actualR} ${busY} L ${targetX + actualR} ${busY} Q ${targetX} ${busY} ${targetX} ${busY + actualR} L ${targetX} ${targetY}`;
  }
}

function ContrastEdgeComponent(props: EdgeProps) {
  const {
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    style = {},
    markerEnd,
    interactionWidth = 24,
    label,
    labelStyle,
    labelBgStyle,
  } = props;

  const [isHovered, setIsHovered] = React.useState(false);

  // Use explicit busY below parent cards; if missing, place 65% of the distance down
  const busY = (props.data?.busY as number) ?? sourceY + (targetY - sourceY) * 0.65;

  const edgePath = getOrthogonalBusPath(sourceX, sourceY, targetX, targetY, busY, 8);
  const labelX = (sourceX + targetX) / 2;
  const labelY = busY;

  const baseStrokeWidth = Number(style.strokeWidth) || 2.25;
  const strokeWidth = isHovered ? Math.max(baseStrokeWidth + 1.75, 4.5) : baseStrokeWidth;
  const edgeColor = (style.stroke as string) || "#1B4D3E";

  const effectiveStyle: React.CSSProperties = {
    ...style,
    strokeWidth,
    filter: isHovered ? `drop-shadow(0 0 8px ${edgeColor})` : undefined,
    transition: "stroke-width 0.15s ease, filter 0.15s ease, opacity 0.2s ease",
  };

  const haloOpacity = style.opacity !== undefined ? Number(style.opacity) : 1;

  return (
    <g
      className="cursor-pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Background halo path: matches canvas background to prevent lines fusing when crossing */}
      <path
        id={`${id}-halo`}
        d={edgePath}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth + (isHovered ? 6 : 4)}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ opacity: haloOpacity, transition: "opacity 0.2s ease" }}
        className="text-[#FAF8F5] dark:text-[#111513] transition-all pointer-events-none"
      />
      {/* Invisible wide hit target for effortless hovering */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={24}
        className="pointer-events-auto"
      />
      {/* Foreground colored arrow path */}
      <BaseEdge
        id={id}
        path={edgePath}
        style={effectiveStyle}
        markerEnd={markerEnd}
        labelX={labelX}
        labelY={labelY}
        label={label}
        labelStyle={labelStyle}
        labelBgStyle={labelBgStyle}
        interactionWidth={interactionWidth}
      />
    </g>
  );
}

export const ContrastEdge = memo(ContrastEdgeComponent);
