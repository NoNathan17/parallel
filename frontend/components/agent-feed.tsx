"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { AgentMessageCard } from "@/components/agent-message-card";
import type { SimulationUIState } from "@/lib/simulation-reducer";
import { VARIANT_LANE_COLORS } from "@/lib/types";

type AgentFeedProps = {
  state: SimulationUIState;
  filterCandidateId?: string | null;
};

export function AgentFeed({ state, filterCandidateId }: AgentFeedProps) {
  const endRef = useRef<HTMLDivElement>(null);

  const messages = state.messageOrder
    .map((id) => state.messages.get(id))
    .filter((m): m is NonNullable<typeof m> => {
      if (!m) return false;
      if (filterCandidateId && m.candidateId !== filterCandidateId) return false;
      return true;
    });

  useEffect(() => {
    if (state.loading) {
      endRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length, state.loading]);

  return (
    <section className="flex h-[min(72vh,640px)] flex-col rounded-2xl border border-[var(--border)] bg-[var(--surface)]/60">
      <header className="shrink-0 border-b border-[var(--border)] px-4 py-3">
        <h2 className="text-sm font-semibold text-[var(--foreground)]">
          Agent channel
        </h2>
        <p className="text-xs text-[var(--muted)]">
          Live handoffs & reasoning · {messages.length} messages
        </p>
      </header>

      <motion.div layout className="flex-1 space-y-2 overflow-y-auto p-3">
        <AnimatePresence initial={false}>
          {messages.length === 0 && state.loading && (
            <motion.p
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="py-8 text-center text-sm text-[var(--muted)]"
            >
              Waiting for agents…
            </motion.p>
          )}
          {messages.map((msg) => (
            <motion.div
              key={msg.messageId}
              layout
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            >
              <div
                className="rounded-lg"
                style={{
                  borderLeft: `3px solid ${VARIANT_LANE_COLORS[msg.candidateId ?? "baseline"] ?? "#a2d2ff"}`,
                }}
              >
                <AgentMessageCard
                  message={msg}
                  isStreaming={!msg.isComplete && state.loading}
                />
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        <motion.div ref={endRef} layout />
      </motion.div>
    </section>
  );
}
