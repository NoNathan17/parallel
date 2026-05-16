"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { FinalFeedbackPanel } from "@/components/final-feedback-panel";
import { ResumeForm } from "@/components/resume-form";
import { TimelineEventCard } from "@/components/timeline-event-card";
import {
  checkHealth,
  streamSimulationFile,
  streamSimulationJson,
} from "@/lib/api";
import type { FinalFeedback, TimelineEvent } from "@/lib/types";
import { isFinalFeedback, isTimelineEvent } from "@/lib/types";
import { VARIANT_STYLES } from "@/lib/variants";

const DEFAULT_ROLE = "Software Engineering Intern";

export function SimulationApp() {
  const [targetRole, setTargetRole] = useState(DEFAULT_ROLE);
  const [resumeText, setResumeText] = useState("");
  const [events, setEvents] = useState<TimelineEvent[]>([]);
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
  }, [events.length, loading]);

  const reset = useCallback(() => {
    setEvents([]);
    setFinalFeedback(null);
    setError(null);
    setDone(false);
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

          if (isFinalFeedback(item)) {
            setFinalFeedback(item.feedback);
          } else if (isTimelineEvent(item)) {
            setEvents((prev) => [...prev, item]);
          } else if (item.type === "simulation_done") {
            setDone(true);
          }
        }
      } catch (err) {
        if (!ac.signal.aborted) {
          setError(err instanceof Error ? err.message : "Simulation failed");
        }
      } finally {
        setLoading(false);
      }
    },
    [reset],
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

  const variants = Object.keys(VARIANT_STYLES);
  const filteredEvents =
    filterVariant === "all"
      ? events
      : events.filter((e) => e.variant === filterVariant);

  const stageSet = new Set(events.map((e) => e.stage));

  return (
    <div className="min-h-full bg-[#070b12] text-slate-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(20,184,166,0.12),transparent)]" />

      <header className="relative border-b border-slate-800/80 bg-slate-950/50 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-teal-400/80">
              Parallel
            </p>
            <h1 className="mt-0.5 text-xl font-semibold tracking-tight text-white sm:text-2xl">
              Hiring bias simulation
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {apiOk !== null && (
              <div className="flex items-center gap-2">
                <span
                  className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                    apiOk
                      ? "bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/25"
                      : "bg-red-500/10 text-red-400 ring-1 ring-red-500/25"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${apiOk ? "bg-emerald-400" : "bg-red-400"}`}
                  />
                  API {apiOk ? "online" : "offline"}
                </span>
                {apiOk && llmEnabled && (
                  <span className="rounded-full bg-violet-500/10 px-2.5 py-1 text-xs font-medium text-violet-300 ring-1 ring-violet-500/25">
                    LLM enabled
                  </span>
                )}
              </div>
            )}
            {loading && (
              <button
                type="button"
                onClick={handleStop}
                className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-400 hover:bg-slate-800"
              >
                Stop
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="relative mx-auto grid max-w-7xl gap-6 px-4 py-8 lg:grid-cols-[360px_1fr] lg:px-6">
        <aside className="lg:sticky lg:top-6 lg:self-start">
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

          <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900/50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Controlled variants
            </p>
            <ul className="mt-2 space-y-1.5 text-xs text-slate-400">
              {variants.map((v) => (
                <li key={v} className="flex items-center gap-2">
                  <span
                    className={`h-2 w-2 rounded-full ${VARIANT_STYLES[v].dot}`}
                  />
                  {v}
                </li>
              ))}
            </ul>
          </div>
        </aside>

        <div className="min-w-0 space-y-4">
          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
              {!apiOk && (
                <p className="mt-1 text-xs text-red-400/80">
                  Start the backend:{" "}
                  <code className="rounded bg-slate-900 px-1">
                    uvicorn app.main:app --reload --port 8000
                  </code>
                </p>
              )}
            </div>
          )}

          {(events.length > 0 || loading) && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-500">Filter:</span>
              <FilterChip
                active={filterVariant === "all"}
                onClick={() => setFilterVariant("all")}
              >
                All
              </FilterChip>
              {variants.map((v) => (
                <FilterChip
                  key={v}
                  active={filterVariant === v}
                  onClick={() => setFilterVariant(v)}
                >
                  {v.split(" ")[0]}
                </FilterChip>
              ))}
              {stageSet.size > 0 && (
                <span className="ml-auto font-mono text-xs text-slate-600">
                  {events.length} events · {stageSet.size} stages
                </span>
              )}
            </div>
          )}

          {!loading && events.length === 0 && !finalFeedback && (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800 py-24 text-center">
              <p className="text-4xl text-slate-700">◇</p>
              <p className="mt-3 text-sm text-slate-500">
                Upload or paste a resume, then run the simulation.
              </p>
              <p className="mt-1 max-w-sm text-xs text-slate-600">
                Four equivalent-qualification variants will move through resume
                screening, recruiter, technical, and hiring manager stages.
              </p>
            </div>
          )}

          <div className="space-y-3">
            {filteredEvents.map((event, i) => (
              <TimelineEventCard
                key={`${event.timestamp}-${event.candidateId}-${event.stageIndex}-${i}`}
                event={event}
                isLatest={i === filteredEvents.length - 1 && loading}
              />
            ))}
            {loading && events.length === 0 && (
              <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-6">
                <Spinner />
                <span className="text-sm text-slate-400">
                  Parsing resume and generating variants…
                </span>
              </div>
            )}
            <div ref={timelineEndRef} />
          </div>

          {finalFeedback && <FinalFeedbackPanel feedback={finalFeedback} />}

          {done && !loading && (
            <p className="text-center text-xs text-slate-600">
              Simulation complete — review divergence in the bias auditor summary.
            </p>
          )}
        </div>
      </main>
    </div>
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
      className={`rounded-full px-2.5 py-1 text-xs transition ${
        active
          ? "bg-teal-500/20 text-teal-300 ring-1 ring-teal-500/30"
          : "bg-slate-800/80 text-slate-500 hover:text-slate-300"
      }`}
    >
      {children}
    </button>
  );
}

function Spinner() {
  return (
    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-teal-500/30 border-t-teal-400" />
  );
}
