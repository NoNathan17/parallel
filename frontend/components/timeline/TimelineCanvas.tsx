"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useMemo } from "react";
import type { BranchEvent, TimelineNode } from "@/lib/types";

const VARIANT_COLORS = ["#e8c547", "#f472b6", "#a78bfa", "#34d399", "#60a5fa", "#fbbf24"];
const STAGE_LABELS = ["Screener", "Recruiter", "Technical", "Manager", "Auditor"];
const STAGE_X = [0.12, 0.32, 0.52, 0.72, 0.92];
const BRANCH_X = 0.32;

interface Props {
  nodes: TimelineNode[];
  branches: BranchEvent[];
  variantIds: string[];
  variantLabels: Record<string, string>;
  trunkVisible?: boolean;
}

function toPx(x: number, y: number, w: number, h: number, pad: number) {
  return { x: pad + x * (w - 2 * pad), y: pad + y * (h - 2 * pad) };
}

function branchY(index: number, total: number) {
  if (total <= 1) return 0.5;
  return 0.5 + (index - (total - 1) / 2) * 0.18;
}

export function TimelineCanvas({
  nodes,
  branches,
  variantIds,
  variantLabels,
  trunkVisible = true,
}: Props) {
  const width = 900;
  const height = 420;
  const pad = 48;
  const hasBranched = branches.length > 0;

  const tracks = variantIds.map((vid, i) => ({
    id: vid,
    label: variantLabels[vid] ?? `Track ${i + 1}`,
    color: VARIANT_COLORS[i % VARIANT_COLORS.length],
    index: i,
    y: branchY(i, variantIds.length),
  }));

  const nodesByVariant = useMemo(() => {
    const acc: Record<string, TimelineNode[]> = {};
    for (const vid of variantIds) {
      acc[vid] = nodes.filter((n) => n.variant_id === vid).sort((a, b) => a.x - b.x);
    }
    return acc;
  }, [nodes, variantIds]);

  const nexus = toPx(BRANCH_X, 0.5, width, height, pad);
  const origin = toPx(0.05, 0.5, width, height, pad);

  function buildPath(trackY: number, variantNodes: TimelineNode[], isBaseline: boolean) {
    if (variantNodes.length === 0) return "";

    const pts = variantNodes.map((n) => toPx(n.x, n.y, width, height, pad));
    const fork = toPx(BRANCH_X, trackY, width, height, pad);

    if (!hasBranched) {
      return pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
    }

    if (isBaseline) {
      return `M ${origin.x} ${origin.y} L ${nexus.x} ${nexus.y} ${pts
        .filter((p) => p.x > nexus.x)
        .map((p) => `L ${p.x} ${p.y}`)
        .join(" ")}`;
    }

    const afterFork = pts.filter((p) => p.x >= nexus.x - 2);
    const curve = `M ${nexus.x} ${nexus.y} Q ${nexus.x + 40} ${(nexus.y + fork.y) / 2} ${fork.x} ${fork.y}`;
    const tail = afterFork.map((p, i) => `${i === 0 ? "L" : "L"} ${p.x} ${p.y}`).join(" ");
    return `${curve} ${tail}`;
  }

  return (
    <div className="relative w-full overflow-hidden rounded-xl border border-emerald-900/30 bg-gradient-to-b from-zinc-950 via-[#0a0f0a] to-zinc-950 p-4 shadow-[inset_0_0_60px_rgba(16,185,129,0.06)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_25%_50%,rgba(232,197,71,0.1),transparent_55%)]" />

      <p className="relative mb-1 font-mono text-xs uppercase tracking-[0.2em] text-emerald-500/90">
        {hasBranched ? "⚡ Branching timeline" : "◇ Sacred timeline"}
      </p>
      <p className="relative mb-4 text-sm text-zinc-500">
        {hasBranched
          ? "One path splits into parallel realities"
          : "All candidates share a single timeline — technically identical"}
      </p>

      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ height: 420 }}>
        <defs>
          <filter id="glow-gold">
            <feGaussianBlur stdDeviation="2.5" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {STAGE_X.map((sx, i) => {
          const p = toPx(sx, 0.5, width, height, pad);
          return (
            <g key={STAGE_LABELS[i]}>
              <line x1={p.x} y1={pad} x2={p.x} y2={height - pad} stroke="#1a2e1a" strokeDasharray="3 7" />
              <text x={p.x} y={height - 10} textAnchor="middle" fill="#3d5c3d" fontSize={9} className="font-mono">
                {STAGE_LABELS[i]}
              </text>
            </g>
          );
        })}

        {trunkVisible && (
          <motion.line
            x1={origin.x}
            y1={origin.y}
            x2={nexus.x}
            y2={nexus.y}
            stroke="#e8c547"
            strokeWidth={4}
            strokeLinecap="round"
            filter="url(#glow-gold)"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 1.8, ease: "easeInOut" }}
          />
        )}

        <AnimatePresence>
          {hasBranched && (
            <motion.circle
              cx={nexus.x}
              cy={nexus.y}
              r={10}
              fill="#e8c547"
              initial={{ scale: 0 }}
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 2 }}
            />
          )}
        </AnimatePresence>

        {tracks.map((track, ti) => {
          const variantNodes = nodesByVariant[track.id] ?? [];
          if (!variantNodes.length) return null;
          const isBaseline = ti === 0;
          const pathD = buildPath(track.y, variantNodes, isBaseline);
          const pts = variantNodes.map((n) => toPx(n.x, n.y, width, height, pad));

          return (
            <g key={track.id}>
              <motion.path
                key={`${track.id}-${variantNodes.length}`}
                d={pathD}
                fill="none"
                stroke={track.color}
                strokeWidth={isBaseline ? 3 : 2}
                strokeLinecap="round"
                strokeLinejoin="round"
                filter={isBaseline ? "url(#glow-gold)" : undefined}
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{
                  duration: 1.4,
                  ease: "easeInOut",
                }}
              />
              {pts.map((p, pi) => (
                <motion.circle
                  key={pi}
                  cx={p.x}
                  cy={p.y}
                  r={4}
                  fill={track.color}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 1.2 + pi * 0.25 + ti * 0.1 }}
                />
              ))}
            </g>
          );
        })}

        {branches.map((b, i) => {
          const ti = variantIds.indexOf(b.variant_id);
          const y = branchY(ti, variantIds.length);
          const p = toPx(BRANCH_X, y, width, height, pad);
          return (
            <motion.text
              key={b.branch_id}
              x={p.x + 12}
              y={p.y - 6}
              fill={VARIANT_COLORS[ti % VARIANT_COLORS.length]}
              fontSize={9}
              className="font-mono"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5 + i * 0.5 }}
            >
              ⚡ {b.cause.slice(0, 45)}…
            </motion.text>
          );
        })}
      </svg>

      <div className="mt-2 flex flex-wrap gap-2">
        {tracks.map((t) => (
          <span key={t.id} className="flex items-center gap-1 font-mono text-[10px] text-zinc-600">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: t.color }} />
            {t.label.length > 20 ? t.label.slice(0, 18) + "…" : t.label}
          </span>
        ))}
      </div>
    </div>
  );
}
