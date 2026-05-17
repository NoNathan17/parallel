"use client";

import { memo } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { motion } from "framer-motion";

import type { TimelineNodeData } from "@/lib/timeline-graph";

function TimelineNodeComponent({
  data,
  selected,
}: NodeProps<Node<TimelineNodeData>>) {
  const d = data;
  const glow = d.active || selected;

  return (
    <motion.div
      initial={{ scale: 0.85, opacity: 0 }}
      animate={{
        scale: glow ? 1.05 : 1,
        opacity: 1,
        boxShadow: glow
          ? `0 0 24px ${d.color}66, 0 0 0 2px ${d.color}`
          : d.branched
            ? `0 0 16px rgba(251, 191, 36, 0.35)`
            : "0 0 0 1px var(--border)",
      }}
      transition={{ type: "spring", stiffness: 320, damping: 24 }}
      className="min-w-[120px] max-w-[150px] rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-2.5"
      style={{ borderColor: d.branched ? "#fbbf24" : undefined }}
    >
      <Handle type="target" position={Position.Left} className="!bg-[var(--muted)] !w-2 !h-2" />
      <Handle type="source" position={Position.Right} className="!bg-[var(--primary)] !w-2 !h-2" />

      <motion.div
        className="mb-1 h-1 rounded-full"
        style={{ backgroundColor: d.color }}
        animate={{ opacity: glow ? [0.5, 1, 0.5] : 1 }}
        transition={{ repeat: glow ? Infinity : 0, duration: 1.2 }}
      />

      <p className="text-xs font-semibold leading-tight text-[var(--foreground)]">
        {d.label}
      </p>
      {d.sublabel && (
        <p className="mt-0.5 truncate text-[10px] text-[var(--muted)]">{d.sublabel}</p>
      )}

      {d.scores && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          className="mt-2 grid grid-cols-2 gap-1 border-t border-[var(--border)] pt-2"
        >
          <ScorePill label="T" value={d.scores.technical} />
          <ScorePill label="S" value={d.scores.subjective} />
          <ScorePill label="C" value={d.scores.confidence} suffix="%" />
          <ScorePill label="CB" value={d.scores.callback} suffix="%" />
        </motion.div>
      )}

      {d.branched && d.branchReason && (
        <p className="mt-2 line-clamp-2 text-[9px] leading-snug text-amber-200/90">
          {d.branchReason}
        </p>
      )}
    </motion.div>
  );
}

function ScorePill({
  label,
  value,
  suffix = "",
}: {
  label: string;
  value?: number;
  suffix?: string;
}) {
  if (value === undefined) return null;
  return (
    <span className="rounded bg-[var(--surface-muted)] px-1 py-0.5 text-[9px] font-mono text-[var(--muted)]">
      {label}:{value}
      {suffix}
    </span>
  );
}

export const TimelineNode = memo(TimelineNodeComponent);
