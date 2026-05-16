"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { AgentMessageCard } from "@/components/agent-message-card";
import { FinalFeedbackPanel } from "@/components/final-feedback-panel";
import { LandingPanel } from "@/components/landing-panel";
import { ResumeForm } from "@/components/resume-form";
import { TimelineEventCard } from "@/components/timeline-event-card";
import { VariantsGuide } from "@/components/variants-guide";
import {
  applyAgentStreamEvent,
  isAgentStreamEvent,
} from "@/lib/agent-stream";
import {
  checkHealth,
  streamSimulationFile,
  streamSimulationJson,
} from "@/lib/api";
import type { AgentMessage, FinalFeedback, SimulationEvent, TimelineEvent } from "@/lib/types";
import { isFinalFeedback, isTimelineEvent } from "@/lib/types";
import { VARIANTS } from "@/lib/variants";

type FeedItem =
  | { kind: "agent"; messageId: string }
  | { kind: "timeline"; key: string };

const DEFAULT_ROLE = "Software Engineering Intern";

export function SimulationApp() {
  const [targetRole, setTargetRole] = useState(DEFAULT_ROLE);
  const [resumeText, setResumeText] = useState("");
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [agentMessages, setAgentMessages] = useState<Map<string, AgentMessage>>(
    new Map(),
  );
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [finalFeedback, setFinalFeedback] = useState<FinalFeedback | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [apiOk, setApiOk] = useState<boolean | null>(null);
  const [llmEnabled, setLlmEnabled] = useState(false);
  const [filterVariant, setFilterVariant] = useState<string | "all">("all");
  const abortRef = useRef<AbortController | null>(null);
  const timelineEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      const { ok, llm } = await checkHealth();
      if (cancelled) return;
      setApiOk(ok);
      setLlmEnabled(llm);
    };

    poll();
    const id = setInterval(poll, 5000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  useEffect(() => {
    if (loading) {
      timelineEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [feed.length, loading]);

  const reset = useCallback(() => {
    setEvents([]);
    setAgentMessages(new Map());
    setFeed([]);
    setFinalFeedback(null);
    setError(null);
    setDone(false);
  }, []);

  const ingestEvent = useCallback((item: SimulationEvent) => {
    if (isAgentStreamEvent(item)) {
      const msgEvent = item as TimelineEvent;
      if (item.type === "agent_message_start" && msgEvent.messageId) {
        setFeed((prev) => {
          if (prev.some((f) => f.kind === "agent" && f.messageId === msgEvent.messageId)) {
            return prev;
          }
          return [...prev, { kind: "agent", messageId: msgEvent.messageId! }];
        });
      }
      setAgentMessages((prev) => applyAgentStreamEvent(prev, msgEvent));
      return;
    }

    if (isFinalFeedback(item)) {
      setFinalFeedback(item.feedback);
      return;
    }

    if (isTimelineEvent(item)) {
      const key = `${item.timestamp}-${item.type}-${item.stageIndex}-${item.candidateId ?? ""}`;
      setEvents((prev) => [...prev, item]);
      setFeed((prev) => [...prev, { kind: "timeline", key }]);
      return;
    }

    if (item.type === "simulation_done") {
      setDone(true);
    }
  }, []);

  const runStream = useCallback(
    async (generator: AsyncGenerator<import("@/lib/types").SimulationEvent>) => {
      reset();
      setLoading(true);
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;

      try {
        for await (const item of generator) {
          if (ac.signal.aborted) break;
          ingestEvent(item);
        }
      } catch (err) {
        if (!ac.signal.aborted) {
          setError(err instanceof Error ? err.message : "Simulation failed");
        }
      } finally {
        setLoading(false);
      }
    },
    [reset, ingestEvent],
  );

  const handleSubmitPaste = () => {
    runStream(streamSimulationJson(resumeText.trim(), targetRole.trim()));
  };

  const handleFileSelect = (file: File) => {
    runStream(streamSimulationFile(file, targetRole.trim()));
  };

  const handleStop = () => {
    abortRef.current?.abort();
    setLoading(false);
  };

  const filteredFeed =
    filterVariant === "all"
      ? feed
      : feed.filter((item) => {
          if (item.kind === "agent") {
            const msg = agentMessages.get(item.messageId);
            return !msg?.variant || msg.variant === filterVariant;
          }
          const ev = events.find(
            (e) =>
              `${e.timestamp}-${e.type}-${e.stageIndex}-${e.candidateId ?? ""}` ===
              item.key,
          );
          return !ev?.variant || ev.variant === filterVariant;
        });

  const stageSet = new Set([
    ...events.map((e) => e.stage),
    ...Array.from(agentMessages.values()).map((m) => m.stage),
  ]);
  const showLanding =
    !loading && feed.length === 0 && !finalFeedback;

  return (
    <div className="min-h-full bg-[var(--background)] text-[var(--foreground)]">
      <header className="border-b border-[var(--border)] bg-[var(--surface)]/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <div>
            <p className="text-sm font-semibold tracking-wide text-[var(--primary)]">
              Parallel
            </p>
            <h1 className="text-lg font-semibold text-[var(--foreground)] sm:text-xl">
              Inclusivity hiring simulation
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {apiOk !== null && (
              <>
                <StatusBadge
                  ok={apiOk}
                  label={apiOk ? "API connected" : "API offline"}
                />
                {apiOk && llmEnabled && (
                  <span className="rounded-full bg-[var(--primary-soft)] px-2.5 py-1 text-xs font-medium text-[var(--primary)]">
                    AI agents on
                  </span>
                )}
              </>
            )}
            {loading && (
              <button
                type="button"
                onClick={handleStop}
                className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--muted)] hover:bg-[var(--surface-muted)]"
              >
                Stop
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,340px)_1fr]">
          <aside className="space-y-5 lg:sticky lg:top-6 lg:self-start">
            <ResumeForm
              targetRole={targetRole}
              onTargetRoleChange={setTargetRole}
              resumeText={resumeText}
              onResumeTextChange={setResumeText}
              onSubmit={handleSubmitPaste}
              onFileSelect={handleFileSelect}
              disabled={loading}
              loading={loading}
            />
            <VariantsGuide />
          </aside>

          <div className="min-w-0 space-y-4">
            {error && (
              <div
                role="alert"
                className="rounded-xl border border-red-200 bg-[var(--error-bg)] px-4 py-3 text-sm text-[var(--error)]"
              >
                {error}
              </div>
            )}

            {showLanding && <LandingPanel apiOk={apiOk} />}

            {(feed.length > 0 || loading) && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-[var(--muted)]">
                  Show:
                </span>
                <FilterChip
                  active={filterVariant === "all"}
                  onClick={() => setFilterVariant("all")}
                >
                  All variants
                </FilterChip>
                {VARIANTS.map((v) => (
                  <FilterChip
                    key={v.name}
                    active={filterVariant === v.name}
                    onClick={() => setFilterVariant(v.name)}
                  >
                    {v.shortLabel}
                  </FilterChip>
                ))}
                {stageSet.size > 0 && (
                  <span className="ml-auto text-xs text-[var(--muted-light)]">
                    {feed.length} updates · {stageSet.size} stages
                  </span>
                )}
              </div>
            )}

            <div className="space-y-3">
              {loading && feed.length === 0 && (
                <div className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-5">
                  <Spinner />
                  <span className="text-sm text-[var(--muted)]">
                    Parsing resume and generating variants…
                  </span>
                </div>
              )}
              {filteredFeed.map((item, i) => {
                if (item.kind === "agent") {
                  const msg = agentMessages.get(item.messageId);
                  if (!msg) return null;
                  return (
                    <AgentMessageCard
                      key={item.messageId}
                      message={msg}
                      isStreaming={!msg.isComplete && loading}
                    />
                  );
                }
                const event = events.find(
                  (e) =>
                    `${e.timestamp}-${e.type}-${e.stageIndex}-${e.candidateId ?? ""}` ===
                    item.key,
                );
                if (!event) return null;
                return (
                  <TimelineEventCard
                    key={item.key}
                    event={event}
                    isLatest={i === filteredFeed.length - 1 && loading}
                  />
                );
              })}
              <div ref={timelineEndRef} />
            </div>

            {finalFeedback && <FinalFeedbackPanel feedback={finalFeedback} />}

            {done && !loading && (
              <p className="text-center text-sm text-[var(--muted)]">
                Simulation complete — review the bias auditor summary above.
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function StatusBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
        ok
          ? "bg-[var(--success-bg)] text-[var(--success)]"
          : "bg-[var(--error-bg)] text-[var(--error)]"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${ok ? "bg-[var(--success)]" : "bg-[var(--error)]"}`}
        aria-hidden
      />
      {label}
    </span>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-sm transition ${
        active
          ? "bg-[var(--primary)] font-medium text-[#0c0e14]"
          : "bg-[var(--surface-muted)] text-[var(--muted)] hover:bg-[var(--border)]"
      }`}
    >
      {children}
    </button>
  );
}

function Spinner() {
  return (
    <span
      className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--primary)]"
      aria-hidden
    />
  );
}
