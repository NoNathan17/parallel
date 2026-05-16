"use client";

import { motion } from "framer-motion";
import type { BiasAudit } from "@/lib/types";

interface Props {
  audit: BiasAudit | null;
  callbackSpread: number;
  replayMetrics: {
    divergence_reduction: number;
    callback_spread_before: number;
    callback_spread_after: number;
  } | null;
}

export function BiasAuditorPanel({ audit, callbackSpread, replayMetrics }: Props) {
  return (
    <div className="rounded-xl border border-amber-900/40 bg-amber-950/20 p-4">
      <h3 className="mb-3 font-mono text-xs uppercase tracking-widest text-amber-500">
        Bias Auditor
      </h3>

      <div className="mb-4">
        <p className="mb-1 text-xs text-zinc-500">Callback spread</p>
        <motion.p
          key={callbackSpread}
          initial={{ scale: 1.1 }}
          animate={{ scale: 1 }}
          className="font-mono text-2xl text-amber-300"
        >
          {(callbackSpread * 100).toFixed(1)}%
        </motion.p>
        {replayMetrics && (
          <p className="mt-1 text-xs text-emerald-400">
            Reduced from {(replayMetrics.callback_spread_before * 100).toFixed(1)}% →{" "}
            {(replayMetrics.callback_spread_after * 100).toFixed(1)}%
          </p>
        )}
      </div>

      {audit ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-3 text-sm"
        >
          <p className="leading-relaxed text-zinc-300">{audit.summary}</p>
          <div className="space-y-1 font-mono text-xs text-zinc-500">
            <p>Divergence started: {audit.divergence_start_agent}</p>
            <p>Amplified by: {audit.amplifier_agent}</p>
            <p>Signal: {audit.signal_caused}</p>
          </div>
          {audit.technical_equivalence_maintained && (
            <p className="border-t border-zinc-800 pt-2 text-xs text-emerald-500">
              Technical performance remained equivalent across variants.
            </p>
          )}
        </motion.div>
      ) : (
        <p className="text-sm text-zinc-600">Auditor analyzing simulation…</p>
      )}
    </div>
  );
}
