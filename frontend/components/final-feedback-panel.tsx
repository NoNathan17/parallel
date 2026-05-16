import type { FinalFeedback } from "@/lib/types";

type FinalFeedbackPanelProps = {
  feedback: FinalFeedback;
};

export function FinalFeedbackPanel({ feedback }: FinalFeedbackPanelProps) {
  return (
    <section className="rounded-2xl border border-teal-500/30 bg-gradient-to-br from-slate-900 via-slate-900 to-teal-950/40 p-6 shadow-xl">
      <div className="mb-4 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500/20 text-teal-300">
          ◈
        </span>
        <h2 className="text-lg font-semibold text-white">Parallel Bias Auditor</h2>
      </div>

      <p className="text-sm leading-relaxed text-slate-300">{feedback.summary}</p>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <FeedbackList title="Key findings" items={feedback.keyFindings} />
        <FeedbackList
          title="Divergence points"
          items={feedback.divergencePoints}
          accent="amber"
        />
      </div>

      <div className="mt-6">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
          Suggested interventions
        </h3>
        <ul className="space-y-2">
          {feedback.suggestedInterventions.map((item, i) => (
            <li
              key={i}
              className="flex gap-2 text-sm text-slate-300 before:shrink-0 before:text-teal-500 before:content-['→']"
            >
              {item}
            </li>
          ))}
        </ul>
      </div>

      <p className="mt-6 rounded-lg border border-slate-700/80 bg-slate-800/50 px-4 py-3 font-mono text-xs text-slate-500">
        {feedback.fairnessDeltaPlaceholder}
      </p>
    </section>
  );
}

function FeedbackList({
  title,
  items,
  accent = "teal",
}: {
  title: string;
  items: string[];
  accent?: "teal" | "amber";
}) {
  const dot = accent === "amber" ? "bg-amber-400" : "bg-teal-400";

  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
        {title}
      </h3>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2 text-sm text-slate-300">
            <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
