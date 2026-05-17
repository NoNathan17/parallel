"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { motion } from "framer-motion";

import { AgentFeed } from "@/components/agent-feed";
import { FlowShell } from "@/components/flow/flow-shell";
import { InterventionControls } from "@/components/intervention-controls";
import { NodeInspector } from "@/components/node-inspector";
import {
  checkHealth,
  streamSimulationJson,
} from "@/lib/api";
import { getFlowSession, saveFlowSession } from "@/lib/flow-session";
import type { SimulationEvent, SimulationEventBase } from "@/lib/types";
import {
  initialSimulationUIState,
  simulationReducer,
  type SimulationUIState,
} from "@/lib/simulation-reducer";
import { isFinalFeedback } from "@/lib/types";

const BranchingTimeline = dynamic(
  () =>
    import("@/components/timeline/branching-timeline").then((m) => m.BranchingTimeline),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[min(72vh,640px)] items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)]">
        <span className="text-sm text-[var(--muted)]">Loading timeline…</span>
      </div>
    ),
  },
);

function parseNodeFilter(nodeId: string | null): string | null {
  const m = nodeId?.match(/^node-(.+)-\d+$/);
  return m?.[1] ?? null;
}

export function SimulationExperience() {
  const router = useRouter();
  const session = getFlowSession();
  const [interventions, setInterventions] = useState(session.interventions ?? []);
  const [isReplay, setIsReplay] = useState(session.isReplay ?? false);
  const [simState, dispatch] = useReducer(simulationReducer, initialSimulationUIState);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [apiOk, setApiOk] = useState<boolean | null>(null);
  const [llmEnabled, setLlmEnabled] = useState(false);
  const [started, setStarted] = useState(false);
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

  const ingest = useCallback(
    (event: SimulationEvent) => {
      dispatch(event);
      if (isFinalFeedback(event)) {
        saveFlowSession({
          finalFeedback: event.feedback,
          simulationComplete: true,
        });
      }
      if (event.type === "intervention_result") {
        const e = event as SimulationEventBase & {
          callbackGapReduction?: number;
          subjectiveGapReduction?: number;
          before?: Record<string, number>;
          after?: Record<string, number>;
        };
        saveFlowSession({
          interventionResult: {
            message: e.message ?? "",
            callbackGapReduction: e.callbackGapReduction ?? 0,
            subjectiveGapReduction: e.subjectiveGapReduction ?? 0,
            before: e.before ?? {},
            after: e.after ?? {},
          },
        });
      }
    },
    [],
  );

  const runSimulation = useCallback(async () => {
    const s = getFlowSession();
    if (!s.resumeText.trim()) return;

    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setStarted(true);
    setSelectedNodeId(null);
    setError(null);

    saveFlowSession({ interventions, isReplay });

    dispatch({
      type: "start_loading",
      targetRole: s.targetRole,
      interventions,
      isReplay,
    } as SimulationEvent);

    try {
      const gen = streamSimulationJson(s.resumeText, s.targetRole, {
        interventions,
        isReplay,
        signal: ac.signal,
      });
      for await (const item of gen) {
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
  }, [interventions, isReplay, ingest]);

  useEffect(() => {
    if (apiOk && !started) {
      runSimulation();
    }
  }, [apiOk, started, runSimulation]);

  useEffect(() => {
    if (simState.done && simState.finalFeedback) {
      const t = setTimeout(() => router.push("/analysis"), 800);
      return () => clearTimeout(t);
    }
  }, [simState.done, simState.finalFeedback, router]);

  const simUi: SimulationUIState = {
    ...simState,
    loading: simState.loading && !simState.done,
  };

  const showTimeline =
    simUi.loading || simUi.candidates.length > 0 || simUi.messageOrder.length > 0;

  const filterCandidateId = parseNodeFilter(selectedNodeId);

  return (
    <FlowShell>
      <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold sm:text-2xl">Live simulation</h1>
            <p className="text-sm text-[var(--muted)]">
              {session.parsed?.name ?? "Candidate"} · {session.targetRole}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {apiOk !== null && (
              <span
                className={`rounded-full px-2.5 py-1 text-xs ${apiOk ? "bg-[var(--success-bg)] text-[var(--success)]" : "bg-[var(--error-bg)] text-[var(--error)]"}`}
              >
                {apiOk ? "API connected" : "API offline"}
              </span>
            )}
            {llmEnabled && (
              <span className="rounded-full bg-[var(--primary-soft)] px-2.5 py-1 text-xs text-[var(--primary)]">
                AI agents live
              </span>
            )}
            {simUi.loading && (
              <button
                type="button"
                onClick={() => abortRef.current?.abort()}
                className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--muted)]"
              >
                Stop
              </button>
            )}
            {simUi.done && (
              <Link
                href="/analysis"
                className="rounded-lg bg-[var(--primary)] px-4 py-1.5 text-sm font-semibold text-[#0c0e14]"
              >
                View analysis →
              </Link>
            )}
          </div>
        </div>

        {error && (
          <p className="mb-4 rounded-xl border border-red-500/30 bg-[var(--error-bg)] px-4 py-3 text-sm text-[var(--error)]">
            {error}
          </p>
        )}

        <div className="grid gap-6 xl:grid-cols-[260px_1fr_320px]">
          <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
            <InterventionControls
              selected={interventions}
              onChange={setInterventions}
              disabled={simUi.loading}
              isReplay={isReplay}
              onReplayChange={setIsReplay}
            />
            <Link
              href="/variants"
              className="block text-center text-sm text-[var(--muted)] hover:text-[var(--primary)]"
            >
              ← Back to variants
            </Link>
          </aside>

          <div className="min-w-0">
            {!showTimeline && apiOk === false && (
              <p className="rounded-xl border border-[var(--border)] p-8 text-center text-[var(--muted)]">
                Start the backend API to run the simulation.
              </p>
            )}
            {showTimeline && (
              <BranchingTimeline state={simUi} onSelectNode={setSelectedNodeId} />
            )}
            {simUi.done && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-4 text-center text-sm text-[var(--muted)]"
              >
                Simulation complete — opening analysis…
              </motion.p>
            )}
          </div>

          <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
            {showTimeline ? (
              <>
                <AgentFeed state={simUi} filterCandidateId={filterCandidateId} />
                <NodeInspector state={simUi} selectedNodeId={selectedNodeId} />
              </>
            ) : (
              <p className="rounded-xl border border-dashed border-[var(--border)] p-6 text-center text-sm text-[var(--muted)]">
                Agent channel activates when simulation starts.
              </p>
            )}
          </aside>
        </div>
      </div>
    </FlowShell>
  );
}
