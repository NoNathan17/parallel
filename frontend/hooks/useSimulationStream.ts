"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { beginSimulation, getEventsUrl, getWebSocketUrl } from "@/lib/api";
import type {
  AgentEvaluation,
  AgentMessage,
  AgentThinking,
  BiasAudit,
  BranchEvent,
  SimulationEvent,
  TimelineNode,
} from "@/lib/types";

/** Minimum ms between UI updates — smooths bursts from replay or batch emit */
const MIN_STEP_MS = 450;

export interface SimulationStreamState {
  connected: boolean;
  transport: "websocket" | "sse" | "none";
  started: boolean;
  completed: boolean;
  activeAgent: string | null;
  thinking: AgentThinking | null;
  messages: AgentMessage[];
  evaluations: AgentEvaluation[];
  timelineNodes: TimelineNode[];
  branchEvents: BranchEvent[];
  trunkVisible: boolean;
  biasAudit: BiasAudit | null;
  divergenceScore: number;
  callbackSpread: number;
  replayMetrics: {
    divergence_reduction: number;
    callback_spread_before: number;
    callback_spread_after: number;
  } | null;
  variantCallbacks: Record<string, number>;
  queueLength: number;
}

const initialState: SimulationStreamState = {
  connected: false,
  transport: "none",
  started: false,
  completed: false,
  activeAgent: null,
  thinking: null,
  messages: [],
  evaluations: [],
  timelineNodes: [],
  branchEvents: [],
  trunkVisible: true,
  biasAudit: null,
  divergenceScore: 0,
  callbackSpread: 0,
  replayMetrics: null,
  variantCallbacks: {},
  queueLength: 0,
};

export function useSimulationStream(simulationId: string) {
  const [state, setState] = useState<SimulationStreamState>(initialState);
  const wsRef = useRef<WebSocket | null>(null);
  const esRef = useRef<EventSource | null>(null);
  const queueRef = useRef<SimulationEvent[]>([]);
  const processingRef = useRef(false);
  const beganRef = useRef(false);

  const applyEvent = useCallback((event: SimulationEvent) => {
    if (event.type === "stream.end") return;

    switch (event.type) {
      case "simulation.started":
        setState((s) => ({ ...s, started: true }));
        break;
      case "agent.round_start":
        setState((s) => ({
          ...s,
          activeAgent: event.payload.agent as string,
          thinking: null,
        }));
        break;
      case "agent.thinking":
        setState((s) => ({
          ...s,
          thinking: event.payload as unknown as AgentThinking,
        }));
        break;
      case "agent.message":
        setState((s) => ({
          ...s,
          messages: [...s.messages, event.payload as unknown as AgentMessage],
        }));
        break;
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
      case "timeline.trunk":
        setState((s) => ({ ...s, trunkVisible: true }));
        break;
      case "bias.audit":
        setState((s) => ({
          ...s,
          biasAudit: event.payload as unknown as BiasAudit,
          thinking: null,
        }));
        break;
      case "simulation.completed":
        setState((s) => ({
          ...s,
          completed: true,
          activeAgent: null,
          thinking: null,
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

  const drainQueue = useCallback(async () => {
    if (processingRef.current) return;
    processingRef.current = true;

    while (queueRef.current.length > 0) {
      const event = queueRef.current.shift()!;
      setState((s) => ({ ...s, queueLength: queueRef.current.length }));
      applyEvent(event);
      await new Promise((r) => setTimeout(r, MIN_STEP_MS));
    }

    processingRef.current = false;
  }, [applyEvent]);

  const enqueue = useCallback(
    (event: SimulationEvent) => {
      queueRef.current.push(event);
      setState((s) => ({ ...s, queueLength: queueRef.current.length }));
      void drainQueue();
    },
    [drainQueue]
  );

  // Start simulation only after stream is connected
  useEffect(() => {
    if (!simulationId || !state.connected || beganRef.current) return;
    beganRef.current = true;

    const kickoff = async () => {
      try {
        await beginSimulation(simulationId);
        wsRef.current?.send("ready");
      } catch {
        /* start may already have been triggered */
      }
    };
    void kickoff();
  }, [simulationId, state.connected]);

  useEffect(() => {
    if (!simulationId) return;

    queueRef.current = [];
    processingRef.current = false;
    beganRef.current = false;
    setState({ ...initialState });

    const connectSSE = () => {
      if (esRef.current) return;
      const es = new EventSource(getEventsUrl(simulationId));
      esRef.current = es;
      es.onopen = () => setState((s) => ({ ...s, connected: true, transport: "sse" }));
      es.onmessage = (msg) => {
        try {
          enqueue(JSON.parse(msg.data) as SimulationEvent);
        } catch {
          /* ignore */
        }
      };
      es.onerror = () => setState((s) => ({ ...s, connected: false }));
    };

    const ws = new WebSocket(getWebSocketUrl(simulationId));
    wsRef.current = ws;

    ws.onopen = () => {
      setState((s) => ({ ...s, connected: true, transport: "websocket" }));
      ws.send("ready");
    };

    ws.onmessage = (msg) => {
      try {
        enqueue(JSON.parse(msg.data) as SimulationEvent);
      } catch {
        /* ignore */
      }
    };

    ws.onerror = () => {
      ws.close();
      connectSSE();
    };

    ws.onclose = () => {
      if (!esRef.current) connectSSE();
    };

    return () => {
      wsRef.current?.close();
      wsRef.current = null;
      esRef.current?.close();
      esRef.current = null;
    };
  }, [simulationId, enqueue]);

  return { ...state, reset: () => setState(initialState) };
}
