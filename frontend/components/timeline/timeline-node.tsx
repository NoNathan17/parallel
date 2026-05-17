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
  const active = d.active || selected;

  return (
    <motion.div
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: active ? 1.02 : 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 320, damping: 24 }}
      className="min-w-[120px] max-w-[150px] rounded-xl border bg-[var(--surface)] px-3 py-2.5"
      style={{
        borderColor: d.branched
          ? "var(--branch)"
          : active
            ? d.color
            : "var(--border)",
        borderWidth: active || d.branched ? 2 : 1,
      }}
    >
      <Handle type="target" position={Position.Left} className="!h-2 !w-2 !bg-[var(--muted)]" />
      <Handle type="source" position={Position.Right} className="!h-2 !w-2 !bg-[var(--primary)]" />

      <motion.div
        className="mb-1 h-1 rounded-full"
        style={{ backgroundColor: d.color }}
        animate={{ opacity: active ? 1 : 0.7 }}
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
        <p className="mt-2 line-clamp-2 text-[9px] leading-snug text-[var(--muted)]">
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
    <span className="rounded bg-[var(--surface-muted)] px-1 py-0.5 font-mono text-[9px] text-[var(--muted)]">
      {label}:{value}
      {suffix}
    </span>
  );
}

export const TimelineNode = memo(TimelineNodeComponent);
