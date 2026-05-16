"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { AgentEvaluation, AgentMessage, AgentThinking } from "@/lib/types";

const AGENT_LABELS: Record<string, string> = {
  resume_screener: "Resume Screener",
  recruiter: "Recruiter",
  technical_interviewer: "Technical Interviewer",
  hiring_manager: "Hiring Manager",
  bias_auditor: "Bias Auditor",
};

const AGENT_COLORS: Record<string, string> = {
  resume_screener: "text-zinc-400",
  recruiter: "text-pink-400",
  technical_interviewer: "text-blue-400",
  hiring_manager: "text-violet-400",
  bias_auditor: "text-amber-400",
};

interface Props {
  messages: AgentMessage[];
  evaluations: AgentEvaluation[];
  thinking: AgentThinking | null;
  activeAgent: string | null;
}

type FeedItem =
  | { kind: "message"; data: AgentMessage; ts: number }
  | { kind: "evaluation"; data: AgentEvaluation; ts: number };

export function AgentFeed({ messages, evaluations, thinking, activeAgent }: Props) {
  const items: FeedItem[] = [
    ...messages.map((m, i) => ({ kind: "message" as const, data: m, ts: i })),
    ...evaluations.map((e, i) => ({
      kind: "evaluation" as const,
      data: e,
      ts: 1000 + i,
    })),
  ].sort((a, b) => a.ts - b.ts);

  const recent = items.slice(-16);

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-zinc-800 bg-zinc-950/80 p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-mono text-xs uppercase tracking-widest text-zinc-500">
          Agent network — live
        </h3>
        {activeAgent && (
          <motion.span
            key={activeAgent}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-1.5 font-mono text-[10px] text-emerald-500"
          >
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
            {AGENT_LABELS[activeAgent] ?? activeAgent} active
          </motion.span>
        )}
      </div>

      <AnimatePresence mode="popLayout">
        {thinking && (
          <motion.div
            key="thinking"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-lg border border-dashed border-zinc-700 bg-zinc-900/40 px-3 py-2"
          >
            <p className="font-mono text-xs text-zinc-500">
              {AGENT_LABELS[thinking.agent] ?? thinking.agent} · thinking…
            </p>
            <p className="text-sm text-zinc-400">{thinking.message}</p>
          </motion.div>
        )}

        {recent.length === 0 && !thinking && (
          <p className="text-sm text-zinc-600">Agents connecting…</p>
        )}

        {recent.map((item, i) =>
          item.kind === "message" ? (
            <MessageBubble key={`msg-${i}`} message={item.data} />
          ) : (
            <EvaluationCard key={`eval-${item.data.agent}-${item.data.variant_id}-${i}`} ev={item.data} />
          )
        )}
      </AnimatePresence>
    </div>
  );
}

function MessageBubble({ message }: { message: AgentMessage }) {
  const from = AGENT_LABELS[message.from_agent] ?? message.from_agent;
  const to =
    message.to_agent === "all"
      ? "everyone"
      : AGENT_LABELS[message.to_agent] ?? message.to_agent;
  const color = AGENT_COLORS[message.from_agent] ?? "text-zinc-300";
  const toneBorder =
    message.tone === "concerned"
      ? "border-amber-800/50"
      : message.tone === "pushback"
        ? "border-blue-800/50"
        : "border-zinc-700/80";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      className={`rounded-lg border ${toneBorder} bg-zinc-900/70 px-3 py-2.5`}
    >
      <p className="mb-1 font-mono text-[10px] text-zinc-600">
        <span className={color}>{from}</span>
        <span className="text-zinc-700"> → </span>
        <span className="text-zinc-500">{to}</span>
      </p>
      <p className="text-sm leading-snug text-zinc-200">{message.message}</p>
      {message.variant_label && (
        <p className="mt-1 font-mono text-[10px] text-zinc-600">re: {message.variant_label}</p>
      )}
    </motion.div>
  );
}

function EvaluationCard({ ev }: { ev: AgentEvaluation }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="rounded-lg border border-zinc-800/60 bg-zinc-900/40 px-3 py-2 opacity-80"
    >
      <div className="flex justify-between gap-2">
        <span className={`font-mono text-[10px] ${AGENT_COLORS[ev.agent] ?? "text-zinc-400"}`}>
          {AGENT_LABELS[ev.agent]} · scored
        </span>
        <span className="font-mono text-[10px] text-zinc-600">
          {(ev.callback_probability * 100).toFixed(0)}% callback
        </span>
      </div>
      <p className="mt-0.5 text-xs text-zinc-500">{ev.variant_label}</p>
    </motion.div>
  );
}
