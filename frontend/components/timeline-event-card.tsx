import { ScoreMetric } from "@/components/score-metric";
import type { TimelineEvent } from "@/lib/types";
import { variantStyle } from "@/lib/variants";

type TimelineEventCardProps = {
  event: TimelineEvent;
  isLatest?: boolean;
};

export function TimelineEventCard({ event, isLatest }: TimelineEventCardProps) {
  const styles = variantStyle(event.variant);
  const hasScores =
    event.technicalScore !== undefined ||
    event.subjectiveScore !== undefined;

  return (
    <article
      className={`relative rounded-xl border bg-slate-900/60 p-4 backdrop-blur-sm transition-all ${
        styles.border
      } ${isLatest ? "ring-1 ring-teal-500/40 shadow-lg shadow-teal-950/30" : ""}`}
    >
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-teal-400/90">
            {event.stage}
          </p>
          {event.variant && (
            <span
              className={`mt-1 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${styles.badge}`}
            >
              {event.variant}
            </span>
          )}
        </div>
        <time className="font-mono text-[10px] text-slate-500">
          {new Date(event.timestamp).toLocaleTimeString()}
        </time>
      </div>

      {(event.sourceAgent || event.targetAgent) && (
        <p className="mb-2 font-mono text-xs text-slate-500">
          {event.sourceAgent}
          {event.sourceAgent && event.targetAgent ? " → " : ""}
          {event.targetAgent}
        </p>
      )}

      <p className="text-sm font-medium text-slate-100">{event.message}</p>
      <p className="mt-2 text-sm leading-relaxed text-slate-400">
        {event.stageFeedback}
      </p>

      {event.branchReason && (
        <p className="mt-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-200/90">
          {event.branchReason}
        </p>
      )}

      {event.assumptionTags && event.assumptionTags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {event.assumptionTags.map((tag) => (
            <span
              key={tag}
              className="rounded-md bg-slate-800 px-2 py-0.5 font-mono text-[10px] text-slate-400"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {hasScores && (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <ScoreMetric label="Technical" value={event.technicalScore} />
          <ScoreMetric label="Subjective" value={event.subjectiveScore} />
          <ScoreMetric
            label="Confidence"
            value={event.confidence}
            format="percent"
          />
          <ScoreMetric
            label="Callback"
            value={event.callbackProbability}
            format="percent"
          />
        </div>
      )}
    </article>
  );
}
