"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getEventsUrl } from "@/lib/api";
import type {
  AgentEvaluation,
  BiasAudit,
  BranchEvent,
  SimulationEvent,
  TimelineNode,
} from "@/lib/types";

export interface SimulationStreamState {
  connected: boolean;
  completed: boolean;
  evaluations: AgentEvaluation[];
  timelineNodes: TimelineNode[];
  branchEvents: BranchEvent[];
  biasAudit: BiasAudit | null;
  divergenceScore: number;
  callbackSpread: number;
  replayMetrics: {
    divergence_reduction: number;
    callback_spread_before: number;
    callback_spread_after: number;
  } | null;
  variantCallbacks: Record<string, number>;
}

const initialState: SimulationStreamState = {
  connected: false,
  completed: false,
  evaluations: [],
  timelineNodes: [],
  branchEvents: [],
  biasAudit: null,
  divergenceScore: 0,
  callbackSpread: 0,
  replayMetrics: null,
  variantCallbacks: {},
};

export function useSimulationStream(simulationId: string) {
  const [state, setState] = useState<SimulationStreamState>(initialState);
  const esRef = useRef<EventSource | null>(null);

  const handleEvent = useCallback((event: SimulationEvent) => {
    switch (event.type) {
      case "agent.evaluation":
        setState((s) => ({
          ...s,
          evaluations: [...s.evaluations, event.payload as unknown as AgentEvaluation],
        }));
        break;
      case "timeline.node":
        setState((s) => ({
          ...s,
          timelineNodes: [...s.timelineNodes, event.payload as unknown as TimelineNode],
        }));
        break;
      case "timeline.branch":
        setState((s) => ({
          ...s,
          branchEvents: [...s.branchEvents, event.payload as unknown as BranchEvent],
        }));
        break;
      case "bias.audit":
        setState((s) => ({
          ...s,
          biasAudit: event.payload as unknown as BiasAudit,
        }));
        break;
      case "simulation.completed":
        setState((s) => ({
          ...s,
          completed: true,
          divergenceScore: (event.payload.divergence_score as number) ?? 0,
          callbackSpread: (event.payload.callback_spread as number) ?? 0,
          variantCallbacks: (event.payload.variant_callbacks as Record<string, number>) ?? {},
        }));
        break;
      case "replay.completed":
        setState((s) => ({
          ...s,
          replayMetrics: {
            divergence_reduction: event.payload.divergence_reduction as number,
            callback_spread_before: event.payload.callback_spread_before as number,
            callback_spread_after: event.payload.callback_spread_after as number,
          },
          callbackSpread: (event.payload.callback_spread_after as number) ?? s.callbackSpread,
        }));
        break;
      default:
        break;
    }
  }, []);

  useEffect(() => {
    if (!simulationId) return;

    const es = new EventSource(getEventsUrl(simulationId));
    esRef.current = es;

    es.onopen = () => setState((s) => ({ ...s, connected: true }));

    es.onmessage = (msg) => {
      try {
        const data = JSON.parse(msg.data) as SimulationEvent;
        if (data.type === "stream.end") {
          es.close();
          return;
        }
        handleEvent(data);
      } catch {
        // ignore parse errors
      }
    };

    es.onerror = () => {
      setState((s) => ({ ...s, connected: false }));
    };

    return () => {
      es.close();
      esRef.current = null;
    };
  }, [simulationId, handleEvent]);

  const reset = useCallback(() => setState(initialState), []);

  return { ...state, reset };
}
