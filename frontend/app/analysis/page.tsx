"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";

import { FinalFeedbackPanel } from "@/components/final-feedback-panel";
import { FlowShell } from "@/components/flow/flow-shell";
import { getFlowSession, saveFlowSession } from "@/lib/flow-session";
import type { FinalFeedback, InterventionResult } from "@/lib/types";

export default function AnalysisPage() {
  const router = useRouter();
  const [feedback, setFeedback] = useState<FinalFeedback | null>(null);
  const [interventionResult, setInterventionResult] =
    useState<InterventionResult | null>(null);

  useEffect(() => {
    const session = getFlowSession();
    if (!session.simulationComplete || !session.finalFeedback) {
      router.replace("/simulate");
      return;
    }
    setFeedback(session.finalFeedback);
    setInterventionResult(session.interventionResult ?? null);
  }, [router]);

  if (!feedback) {
    return (
      <FlowShell>
        <div className="flex min-h-[50vh] items-center justify-center text-[var(--muted)]">
          Loading analysis…
        </div>
      </FlowShell>
    );
  }

  return (
    <FlowShell>
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <p className="text-sm font-medium uppercase tracking-wider text-[var(--primary)]">
            Bias audit complete
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            Uncover what diverged
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-[var(--muted)]">
            The auditor compared all variant timelines against the baseline.
            Technical parity with subjective and callback gaps indicates
            inclusivity issues—not skills gaps.
          </p>
        </motion.div>

        {interventionResult && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-8 rounded-2xl border border-[var(--accent)]/40 bg-[var(--accent-soft)] p-5"
          >
            <h2 className="text-sm font-semibold text-[var(--foreground)]">
              Intervention impact
            </h2>
            <p className="mt-2 text-sm text-[var(--muted)]">
              {interventionResult.message} Callback gap reduced by{" "}
              <strong className="text-[var(--foreground)]">
                {interventionResult.callbackGapReduction} pts
              </strong>
              ; subjective gap by{" "}
              <strong className="text-[var(--foreground)]">
                {interventionResult.subjectiveGapReduction} pts
              </strong>
              .
            </p>
          </motion.div>
        )}

        <motion.div
          className="mt-10"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <FinalFeedbackPanel feedback={feedback} />
        </motion.div>

        <motion.div
          className="mt-12 flex flex-wrap justify-center gap-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
        >
          <Link
            href="/simulate"
            className="rounded-xl border border-[var(--border)] px-6 py-3 text-sm text-[var(--muted)] hover:bg-[var(--surface-muted)]"
          >
            Replay simulation
          </Link>
          <button
            type="button"
            onClick={() => {
              saveFlowSession({ simulationComplete: false, finalFeedback: undefined });
              router.push("/profile");
            }}
            className="rounded-xl bg-[var(--primary)] px-8 py-3 text-sm font-semibold text-[var(--on-primary)] hover:bg-[var(--primary-hover)]"
          >
            Start new profile
          </button>
        </motion.div>
      </div>
    </FlowShell>
  );
}
