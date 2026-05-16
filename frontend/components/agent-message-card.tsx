import { ScoreMetric } from "@/components/score-metric";
import type { AgentMessage } from "@/lib/types";

type AgentMessageCardProps = {
  message: AgentMessage;
  isStreaming?: boolean;
};

export function AgentMessageCard({ message, isStreaming }: AgentMessageCardProps) {
  const isHandoff = message.messageRole === "handoff";
  const hasScores =
    message.technicalScore !== undefined ||
    message.subjectiveScore !== undefined;

  return (
    <article
      className={`rounded-xl border px-4 py-3 ${
        isHandoff
          ? "border-[var(--border)] bg-[var(--surface-muted)]/50"
          : "border-[var(--primary)]/25 bg-[var(--surface)]"
      } ${isStreaming ? "ring-1 ring-[var(--primary)]/30" : ""}`}
    >
      <MessageHeader message={message} isHandoff={isHandoff} isStreaming={isStreaming} />

      <div
        className={`mt-2 text-sm leading-relaxed whitespace-pre-wrap ${
          isHandoff ? "text-[var(--muted)] italic" : "text-[var(--foreground)]"
        }`}
      >
        {message.content || (isStreaming ? "…" : "")}
        {isStreaming && message.content && (
          <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-[var(--primary)]" />
        )}
      </div>

      {hasScores && message.isComplete && (
        <div className="mt-3 grid grid-cols-2 gap-2 border-t border-[var(--border)] pt-3 sm:grid-cols-4">
          <ScoreMetric label="Technical" value={message.technicalScore} />
          <ScoreMetric label="Subjective" value={message.subjectiveScore} />
          <ScoreMetric
            label="Confidence"
            value={message.confidence}
            format="percent"
          />
          <ScoreMetric
            label="Callback"
            value={message.callbackProbability}
            format="percent"
          />
        </div>
      )}
    </article>
  );
}

function MessageHeader({
  message,
  isHandoff,
  isStreaming,
}: {
  message: AgentMessage;
  isHandoff: boolean;
  isStreaming?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-2">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--primary)]">
          {message.stage}
        </p>
        <p className="mt-0.5 text-sm font-medium text-[var(--foreground)]">
          {message.speaker}
          {isHandoff && (
            <span className="ml-2 text-xs font-normal text-[var(--muted)]">
              handoff
            </span>
          )}
        </p>
        {message.variant && (
          <p className="text-xs text-[var(--muted)]">Variant: {message.variant}</p>
        )}
      </div>
      {isStreaming && !message.isComplete && (
        <span className="text-xs text-[var(--primary)]">typing…</span>
      )}
    </div>
  );
}
