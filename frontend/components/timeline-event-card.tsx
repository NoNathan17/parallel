import { ScoreMetric } from "@/components/score-metric";
import type { TimelineEvent } from "@/lib/types";

type TimelineEventCardProps = {
  event: TimelineEvent;
  isLatest?: boolean;
};

export function TimelineEventCard({ event, isLatest }: TimelineEventCardProps) {
  const hasScores =
    event.technicalScore !== undefined ||
    event.subjectiveScore !== undefined;

  return (
    <article
      className={`card-glow rounded-xl border border-[var(--border)] p-4 transition-all ${
        isLatest ? "ring-2 ring-[var(--primary)]/40" : ""
      }`}
    >
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--primary)]">
            {event.stage}
          </p>

          {event.variant && (
            <p className="mt-1 text-xs text-[var(--muted)]">
              Variant:{" "}
              <span className="font-medium text-[var(--foreground)]">
                {event.variant}
              </span>
            </p>
          )}
        </div>

        <time className="text-xs text-[var(--muted-light)]">
          {new Date(event.timestamp).toLocaleTimeString()}
        </time>
      </div>

      {(event.sourceAgent || event.targetAgent) && (
        <p className="mb-2 text-xs text-[var(--muted)]">
          {event.sourceAgent}
          {event.sourceAgent && event.targetAgent ? " → " : ""}
          {event.targetAgent}
        </p>
      )}

      <p className="text-sm font-medium text-[var(--foreground)]">
        {event.message}
      </p>

      <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
        {event.stageFeedback}
      </p>

      {event.branchReason && (
        <p className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
          {event.branchReason}
        </p>
      )}

      {event.assumptionTags && event.assumptionTags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {event.assumptionTags.map((tag) => (
            <span
              key={tag}
              className="rounded-md bg-[var(--surface-muted)] px-2 py-0.5 text-xs text-[var(--muted)]"
            >
              {tag.replace(/_/g, " ")}
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