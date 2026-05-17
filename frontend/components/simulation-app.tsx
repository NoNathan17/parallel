"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { motion } from "framer-motion";

import { AgentFeed } from "@/components/agent-feed";
import { FinalFeedbackPanel } from "@/components/final-feedback-panel";
import { InterventionControls } from "@/components/intervention-controls";
import { LandingPanel } from "@/components/landing-panel";
import { NodeInspector } from "@/components/node-inspector";
import { ResumeForm } from "@/components/resume-form";
import { VariantsGuide } from "@/components/variants-guide";
import {
  checkHealth,
  streamSimulationFile,
  streamSimulationJson,
} from "@/lib/api";
import type { SimulationEvent } from "@/lib/types";
import {
  initialSimulationUIState,
  simulationReducer,
  type SimulationUIState,
} from "@/lib/simulation-reducer";

const BranchingTimeline = dynamic(
  () =>
    import("@/components/timeline/branching-timeline").then((m) => m.BranchingTimeline),
  {
    ssr: false,
    loading: () => (
      <motion.div
        className="flex h-[min(72vh,640px)] items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)]"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ repeat: Infinity, duration: 1.2 }}
      >
        <span className="text-sm text-[var(--muted)]">Loading timeline…</span>
      </motion.div>
    ),
  },
);

const DEFAULT_ROLE = "Software Engineering Intern";

function parseNodeFilter(nodeId: string | null): string | null {
  const m = nodeId?.match(/^node-(.+)-\d+$/);
  return m?.[1] ?? null;
}

export function SimulationApp() {
  const [targetRole, setTargetRole] = useState(DEFAULT_ROLE);
  const [resumeText, setResumeText] = useState("");
  const [interventions, setInterventions] = useState<string[]>([]);
  const [isReplay, setIsReplay] = useState(false);
  const [simState, dispatch] = useReducer(simulationReducer, initialSimulationUIState);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [apiOk, setApiOk] = useState<boolean | null>(null);
  const [llmEnabled, setLlmEnabled] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

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

  const ingest = useCallback((event: SimulationEvent) => {
    dispatch(event);
  }, []);

  const runStream = useCallback(
    async (
      generator: AsyncGenerator<SimulationEvent>,
    ) => {
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;

      setSelectedNodeId(null);
      setError(null);
      dispatch({
        type: "start_loading",
        targetRole,
        interventions,
        isReplay,
      } as SimulationEvent);

      try {
        for await (const item of generator) {
          if (ac.signal.aborted) break;
          ingest(item);
        }
      } catch (err) {
        if (!ac.signal.aborted) {
          setError(err instanceof Error ? err.message : "Simulation failed");
        }
      } finally {
        if (!ac.signal.aborted) {
          dispatch({ type: "simulation_done" } as SimulationEvent);
        }
      }
    },
    [targetRole, interventions, isReplay, ingest],
  );

  const simUi: SimulationUIState = {
    ...simState,
    loading: simState.loading && !simState.done,
  };

  const showExperience =
    simUi.loading || simUi.candidates.length > 0 || simUi.messageOrder.length > 0;

  const filterCandidateId = parseNodeFilter(selectedNodeId);

  const handleSubmitPaste = () => {
    runStream(
      streamSimulationJson(resumeText.trim(), targetRole.trim(), {
        interventions,
        isReplay,
      }),
    );
  };

  const handleFileSelect = (file: File) => {
    runStream(
      streamSimulationFile(file, targetRole.trim(), {
        interventions,
        isReplay,
      }),
    );
  };

  const handleStop = () => {
    abortRef.current?.abort();
    dispatch({ type: "simulation_done" } as SimulationEvent);
  };

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <header className="border-b border-[var(--border)] bg-[var(--surface)]/80 backdrop-blur-md">
        <motion.div
          className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6"
          layout
        >
          <div>
            <p className="text-sm font-semibold tracking-wide text-[var(--primary)]">
              Parallel
            </p>
            <h1 className="text-lg font-semibold sm:text-xl">
              Multi-agent hiring timelines
            </h1>
          </div>
          <motion.div className="flex flex-wrap items-center gap-2" layout>
            {apiOk !== null && (
              <StatusBadge
                ok={apiOk}
                label={apiOk ? "API connected" : "API offline"}
              />
            )}
            {apiOk && llmEnabled && (
              <span className="rounded-full bg-[var(--primary-soft)] px-2.5 py-1 text-xs font-medium text-[var(--primary)]">
                AI agents · live stream
              </span>
            )}
            {simUi.lastSeq > 0 && (
              <span className="text-xs text-[var(--muted)]">
                step {simUi.lastSeq}
              </span>
            )}
            {simUi.loading && (
              <button
                type="button"
                onClick={handleStop}
                className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--muted)] hover:bg-[var(--surface-muted)]"
              >
                Stop
              </button>
            )}
          </motion.div>
        </motion.div>
      </header>

      <main className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6">
        <div className="grid gap-6 xl:grid-cols-[300px_1fr_340px]">
          <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
            <ResumeForm
              targetRole={targetRole}
              onTargetRoleChange={setTargetRole}
              resumeText={resumeText}
              onResumeTextChange={setResumeText}
              onSubmit={handleSubmitPaste}
              onFileSelect={handleFileSelect}
              disabled={simUi.loading}
              loading={simUi.loading}
            />
            <InterventionControls
              selected={interventions}
              onChange={setInterventions}
              disabled={simUi.loading}
              isReplay={isReplay}
              onReplayChange={setIsReplay}
            />
            <VariantsGuide />
          </aside>

          <div className="min-w-0 space-y-4">
            {error && (
              <motion.div
                role="alert"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-red-500/30 bg-[var(--error-bg)] px-4 py-3 text-sm text-[var(--error)]"
              >
                {error}
              </motion.div>
            )}

            {!showExperience && <LandingPanel apiOk={apiOk} />}

            {showExperience && (
              <BranchingTimeline
                state={simUi}
                onSelectNode={setSelectedNodeId}
              />
            )}

            {simUi.interventionResult && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="rounded-xl border border-[var(--accent)]/30 bg-[var(--accent-soft)] px-4 py-3 text-sm"
              >
                <p className="font-medium text-[var(--accent)]">
                  Intervention replay
                </p>
                <p className="mt-1 text-[var(--muted)]">
                  {simUi.interventionResult.message} Callback gap reduced by{" "}
                  {simUi.interventionResult.callbackGapReduction} pts.
                </p>
              </motion.div>
            )}

            {simUi.finalFeedback && (
              <FinalFeedbackPanel feedback={simUi.finalFeedback} />
            )}
          </div>

          <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
            {showExperience ? (
              <>
                <AgentFeed
                  state={simUi}
                  filterCandidateId={filterCandidateId}
                />
                <NodeInspector
                  state={simUi}
                  selectedNodeId={selectedNodeId}
                />
              </>
            ) : (
              <p className="rounded-xl border border-dashed border-[var(--border)] p-6 text-center text-sm text-[var(--muted)]">
                Agent conversation streams here during simulation.
              </p>
            )}
          </aside>
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
      />
      {label}
    </span>
  );
}
