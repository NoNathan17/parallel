"use client";

import { motion } from "framer-motion";
import type { BranchEvent, TimelineNode } from "@/lib/types";

const VARIANT_COLORS = [
  "#60a5fa",
  "#f472b6",
  "#a78bfa",
  "#34d399",
  "#fbbf24",
];

interface Props {
  nodes: TimelineNode[];
  branches: BranchEvent[];
  variantIds: string[];
  variantLabels: Record<string, string>;
}

export function TimelineCanvas({ nodes, branches, variantIds, variantLabels }: Props) {
  const width = 800;
  const height = 400;
  const padding = 60;

  const tracks = variantIds.map((vid, i) => ({
    id: vid,
    label: variantLabels[vid] ?? vid.slice(0, 8),
    color: VARIANT_COLORS[i % VARIANT_COLORS.length],
    x: padding + (i * (width - 2 * padding)) / Math.max(variantIds.length - 1, 1),
  }));

  const nodesByVariant = variantIds.reduce(
    (acc, vid) => {
      acc[vid] = nodes
        .filter((n) => n.variant_id === vid)
        .sort((a, b) => a.y - b.y);
      return acc;
    },
    {} as Record<string, TimelineNode[]>
  );

  const hasBranches = branches.length > 0;
  const mergedY = (y: number) => padding + y * (height - 2 * padding);

  return (
    <div className="w-full overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-950/80 p-4">
      <p className="mb-3 font-mono text-xs text-zinc-500">
        {hasBranches
          ? "Timelines branching — assumptions propagating downstream"
          : "All candidates moving together — technically identical"}
      </p>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full min-w-[600px]" style={{ height: 400 }}>
        {/* Merged trunk line */}
        {!hasBranches && tracks.length > 1 && (
          <motion.line
            x1={padding}
            y1={mergedY(0.15)}
            x2={width - padding}
            y2={mergedY(0.95)}
            stroke="#3f3f46"
            strokeWidth={3}
            strokeDasharray="8 4"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.5 }}
          />
        )}

        {tracks.map((track, ti) => {
          const variantNodes = nodesByVariant[track.id] ?? [];
          if (variantNodes.length < 2) return null;

          const points = variantNodes.map((n) => ({
            x: padding + n.x * (width - 2 * padding),
            y: mergedY(n.y),
            merged: n.merged,
          }));

          const pathD = points
            .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
            .join(" ");

          return (
            <g key={track.id}>
              <motion.path
                d={pathD}
                fill="none"
                stroke={track.color}
                strokeWidth={hasBranches && ti > 0 ? 2.5 : 2}
                strokeOpacity={hasBranches && ti > 0 ? 1 : 0.6}
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 1.2, delay: ti * 0.2 }}
              />
              {points.map((p, pi) => (
                <motion.circle
                  key={pi}
                  cx={p.x}
                  cy={p.y}
                  r={6}
                  fill={track.color}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.5 + pi * 0.15 + ti * 0.1 }}
                />
              ))}
              <text
                x={track.x}
                y={height - 16}
                fill={track.color}
                fontSize={10}
                textAnchor="middle"
                className="font-mono"
              >
                {track.label.length > 24 ? track.label.slice(0, 22) + "…" : track.label}
              </text>
            </g>
          );
        })}

        {branches.map((b, i) => {
          const trackIdx = variantIds.indexOf(b.variant_id);
          const color = VARIANT_COLORS[trackIdx % VARIANT_COLORS.length];
          return (
            <motion.g
              key={b.branch_id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 + i * 0.3 }}
            >
              <text
                x={width / 2}
                y={mergedY(0.35) - 20 - i * 18}
                fill={color}
                fontSize={11}
                textAnchor="middle"
                className="font-mono"
              >
                ⚡ {b.cause.slice(0, 60)}
              </text>
            </motion.g>
          );
        })}

        {/* Stage labels */}
        {["Screener", "Recruiter", "Technical", "Manager", "Auditor"].map((label, i) => (
          <text
            key={label}
            x={12}
            y={mergedY(0.15 + i * 0.2)}
            fill="#71717a"
            fontSize={9}
            className="font-mono"
          >
            {label}
          </text>
        ))}
      </svg>
    </div>
  );
}

