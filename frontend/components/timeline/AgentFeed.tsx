"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { AgentEvaluation } from "@/lib/types";

const AGENT_LABELS: Record<string, string> = {
  resume_screener: "Resume Screener",
  recruiter: "Recruiter",
  technical_interviewer: "Technical Interviewer",
  hiring_manager: "Hiring Manager",
  bias_auditor: "Bias Auditor",
};

interface Props {
  evaluations: AgentEvaluation[];
}

export function AgentFeed({ evaluations }: Props) {
  const recent = evaluations.slice(-12).reverse();

  return (
    <motion.div layout className="flex flex-col gap-2 max-h-[420px] overflow-y-auto">
      <h3 className="font-mono text-xs uppercase tracking-widest text-zinc-500">
        Agent activity
      </h3>
      <AnimatePresence mode="popLayout">
        {recent.length === 0 && (
          <p className="text-sm text-zinc-600">Waiting for agents…</p>
        )}
        {recent.map((ev, i) => (
          <motion.div
            key={`${ev.agent}-${ev.variant_id}-${i}`}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3"
          >
            <motion.div className="flex items-center justify-between gap-2 mb-1">
              <span className="font-mono text-xs text-violet-400">
                {AGENT_LABELS[ev.agent] ?? ev.agent}
              </span>
              <span className="font-mono text-xs text-zinc-500">
                {(ev.callback_probability * 100).toFixed(0)}% callback
              </span>
            </motion.div>
            <p className="text-xs text-zinc-400 mb-1">{ev.variant_label}</p>
            <p className="text-sm text-zinc-300 leading-snug">{ev.rationale}</p>
            {ev.assumptions.length > 0 && (
              <ul className="mt-2 space-y-0.5">
                {ev.assumptions.map((a, j) => (
                  <li key={j} className="font-mono text-xs text-amber-600/80">
                    → {a}
                  </li>
                ))}
              </ul>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  );
}
