import { motion } from "framer-motion";

import type { FinalFeedback } from "@/lib/types";

type FinalFeedbackPanelProps = {
  feedback: FinalFeedback;
};

export function FinalFeedbackPanel({ feedback }: FinalFeedbackPanelProps) {
  return (
    <section className="card-glow rounded-xl p-6">
      <h2 className="text-lg font-semibold text-[var(--foreground)]">
        Parallel bias auditor
      </h2>
      <p className="mt-1 text-sm text-[var(--muted)]">
        Summary of where outcomes diverged across variants
      </p>

      <p className="mt-4 text-sm leading-relaxed text-[var(--foreground)]">
        {feedback.summary}
      </p>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <FeedbackList title="Key findings" items={feedback.keyFindings} />
        <FeedbackList
          title="Divergence points"
          items={feedback.divergencePoints}
          variant="highlight"
        />
      </div>

      <div className="mt-6">
        <h3 className="text-sm font-semibold text-[var(--foreground)]">
          Suggested interventions
        </h3>
        <ul className="mt-2 space-y-2">
          {feedback.suggestedInterventions.map((item, i) => (
            <li
              key={i}
              className="flex gap-2 text-sm leading-relaxed text-[var(--muted)]"
            >
              <span
                className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--primary)]"
                aria-hidden
              />
              {item}
            </li>
          ))}
        </ul>
      </div>

      {feedback.fairnessMetrics && (
        <div className="mt-6 grid grid-cols-3 gap-3">
          <MetricCard
            label="Max callback gap"
            value={`${feedback.fairnessMetrics.maxCallbackGap} pts`}
          />
          <MetricCard
            label="Max subjective gap"
            value={`${feedback.fairnessMetrics.maxSubjectiveGap}`}
          />
          <MetricCard
            label="Branched variants"
            value={String(feedback.fairnessMetrics.branchedVariantCount)}
          />
        </div>
      )}

      <p className="mt-6 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3 text-xs leading-relaxed text-[var(--muted)]">
        {feedback.fairnessDeltaPlaceholder}
      </p>
    </section>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <motion.div className="rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2">
      <p className="text-[10px] uppercase tracking-wide text-[var(--muted)]">{label}</p>
      <p className="text-sm font-semibold text-[var(--foreground)]">{value}</p>
    </motion.div>
  );
}

function FeedbackList({
  title,
  items,
  variant = "default",
}: {
  title: string;
  items: string[];
  variant?: "default" | "highlight";
}) {
  const dot =
    variant === "highlight" ? "bg-[var(--pastel-rose)]" : "bg-[var(--accent)]";

  return (
    <div>
      <h3 className="text-sm font-semibold text-[var(--foreground)]">{title}</h3>
      <ul className="mt-2 space-y-2">
        {items.map((item, i) => (
          <li
            key={i}
            className="flex gap-2 text-sm leading-relaxed text-[var(--muted)]"
          >
            <span
              className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${dot}`}
              aria-hidden
            />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
