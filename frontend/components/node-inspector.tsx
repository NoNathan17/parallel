"use client";

import { motion, AnimatePresence } from "framer-motion";

import {
  messagesForNode,
  nodeIdFor,
  type SimulationUIState,
} from "@/lib/simulation-reducer";
import { VARIANT_LANE_COLORS, VARIANT_LABELS } from "@/lib/types";

type NodeInspectorProps = {
  state: SimulationUIState;
  selectedNodeId: string | null;
};

function parseNodeId(id: string): { candidateId: string; stageIndex: number } | null {
  const m = /^node-(.+)-(\d+)$/.exec(id);
  if (!m) return null;
  return { candidateId: m[1]!, stageIndex: Number(m[2]) };
}

export function NodeInspector({ state, selectedNodeId }: NodeInspectorProps) {
  const parsed = selectedNodeId ? parseNodeId(selectedNodeId) : null;
  const candidate = parsed
    ? state.candidates.find((c) => c.id === parsed.candidateId)
    : null;
  const scores = parsed ? state.scores[parsed.candidateId]?.[parsed.stageIndex] : null;
  const branch = parsed
    ? state.branches.find(
        (b) =>
          b.candidateId === parsed.candidateId &&
          b.stageIndex === parsed.stageIndex,
      )
    : null;
  const nodeMessages = parsed
    ? messagesForNode(state, parsed.candidateId, parsed.stageIndex)
    : [];
  const assumptions = parsed
    ? state.assumptions.filter((a) => a.candidateId === parsed.candidateId)
    : [];

  return (
    <AnimatePresence mode="wait">
      {parsed && candidate ? (
        <motion.section
          key={selectedNodeId}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          className="card-glow rounded-xl p-4"
        >
          <div className="flex items-start gap-3">
            <span
              className="mt-1 h-3 w-3 shrink-0 rounded-full"
              style={{
                backgroundColor: VARIANT_LANE_COLORS[candidate.id] ?? "#a2d2ff",
              }}
            />
            <motion.div>
              <h3 className="text-sm font-semibold text-[var(--foreground)]">
                {VARIANT_LABELS[candidate.id] ?? candidate.variant}
              </h3>
              <p className="text-xs text-[var(--muted)]">
                Stage {parsed.stageIndex} · click timeline nodes to inspect
              </p>
            </motion.div>
          </div>

          {scores && (
            <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
              <Metric label="Technical" value={scores.technicalScore} />
              <Metric label="Subjective" value={scores.subjectiveScore} />
              <Metric label="Confidence" value={`${Math.round(scores.confidence * 100)}%`} />
              <Metric
                label="Callback"
                value={`${Math.round(scores.callbackProbability * 100)}%`}
              />
            </div>
          )}

          {branch && (
            <p className="mt-3 rounded-lg border border-[var(--branch)]/40 bg-[var(--branch-bg)] px-3 py-2 text-xs text-[var(--foreground)]">
              {branch.branchReason}
            </p>
          )}

          {assumptions.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-medium text-[var(--muted)]">Assumptions</p>
              <motion.div className="mt-1 flex flex-wrap gap-1">
                {assumptions.map((a) => (
                  <span
                    key={`${a.tag}-${a.stage}`}
                    className="rounded bg-[var(--surface-muted)] px-2 py-0.5 text-[10px] text-[var(--muted)]"
                  >
                    {a.tag.replace(/_/g, " ")}
                  </span>
                ))}
              </motion.div>
            </div>
          )}

          {nodeMessages.length > 0 && (
            <div className="mt-4 max-h-40 space-y-2 overflow-y-auto">
              <p className="text-xs font-medium text-[var(--muted)]">Agent thread</p>
              {nodeMessages.map((m) => (
                <div
                  key={m.messageId}
                  className="rounded-lg bg-[var(--surface-muted)] px-2 py-1.5 text-xs text-[var(--foreground)]"
                >
                  <span className="font-medium text-[var(--primary)]">
                    {m.speaker}
                  </span>
                  <p className="mt-1 line-clamp-4 leading-relaxed text-[var(--muted)]">
                    {m.content}
                  </p>
                </div>
              ))}
            </div>
          )}
        </motion.section>
      ) : (
        <motion.p
          key="hint"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-xl border border-dashed border-[var(--border)] px-4 py-6 text-center text-sm text-[var(--muted)]"
        >
          Select a stage node on the branching timeline to inspect scores, branches,
          and agent messages for that variant.
        </motion.p>
      )}
    </AnimatePresence>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg bg-[var(--surface-muted)] px-2 py-1.5">
      <span className="text-[var(--muted)]">{label}</span>
      <p className="font-mono font-medium text-[var(--foreground)]">{value}</p>
    </div>
  );
}

export { nodeIdFor };
