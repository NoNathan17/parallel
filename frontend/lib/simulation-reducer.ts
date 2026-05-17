import { applyAgentStreamEvent } from "@/lib/agent-stream";
import type {
  AgentMessage,
  BranchRecord,
  CandidateRecord,
  FinalFeedback,
  InterventionResult,
  SimulationEvent,
  SimulationEventBase,
  StageScoreRecord,
} from "@/lib/types";
import { VARIANT_LABELS } from "@/lib/types";

const LANE_ORDER = ["baseline", "gender", "race", "socioeconomic"];

export type SimulationUIState = {
  simulationId: string | null;
  targetRole: string;
  stages: string[];
  interventions: string[];
  isReplay: boolean;
  loading: boolean;
  done: boolean;
  candidates: CandidateRecord[];
  messages: Map<string, AgentMessage>;
  messageOrder: string[];
  branches: BranchRecord[];
  assumptions: { candidateId: string; tag: string; stage: string }[];
  scores: Record<string, Record<number, StageScoreRecord>>;
  activeStageIndex: number | null;
  activeCandidateIds: Set<string>;
  pulsingNodeIds: Set<string>;
  selectedNodeId: string | null;
  finalFeedback: FinalFeedback | null;
  interventionResult: InterventionResult | null;
  lastSeq: number;
};

export const initialSimulationUIState: SimulationUIState = {
  simulationId: null,
  targetRole: "",
  stages: [],
  interventions: [],
  isReplay: false,
  loading: false,
  done: false,
  candidates: [],
  messages: new Map(),
  messageOrder: [],
  branches: [],
  assumptions: [],
  scores: {},
  activeStageIndex: null,
  activeCandidateIds: new Set(),
  pulsingNodeIds: new Set(),
  selectedNodeId: null,
  finalFeedback: null,
  interventionResult: null,
  lastSeq: 0,
};

function laneIndex(candidateId: string): number {
  const i = LANE_ORDER.indexOf(candidateId);
  return i >= 0 ? i : LANE_ORDER.length;
}

function upsertCandidate(
  candidates: CandidateRecord[],
  e: SimulationEventBase,
): CandidateRecord[] {
  const id = e.candidateId;
  if (!id || id === "all") return candidates;
  if (candidates.some((c) => c.id === id)) return candidates;
  return [
    ...candidates,
    {
      id,
      name: e.candidateName ?? "Candidate",
      variant: e.variant ?? VARIANT_LABELS[id] ?? id,
      signal: e.signal ?? "",
      laneIndex: laneIndex(id),
    },
  ].sort((a, b) => a.laneIndex - b.laneIndex);
}

function setStageScores(
  scores: SimulationUIState["scores"],
  candidateId: string,
  stageIndex: number,
  e: SimulationEventBase,
): SimulationUIState["scores"] {
  if (
    e.technicalScore === undefined &&
    e.subjectiveScore === undefined &&
    e.confidence === undefined
  ) {
    return scores;
  }
  const next = { ...scores };
  next[candidateId] = {
    ...(next[candidateId] ?? {}),
    [stageIndex]: {
      technicalScore: e.technicalScore ?? next[candidateId]?.[stageIndex]?.technicalScore ?? 0,
      subjectiveScore: e.subjectiveScore ?? next[candidateId]?.[stageIndex]?.subjectiveScore ?? 0,
      confidence: e.confidence ?? next[candidateId]?.[stageIndex]?.confidence ?? 0,
      callbackProbability:
        e.callbackProbability ??
        next[candidateId]?.[stageIndex]?.callbackProbability ??
        0,
    },
  };
  return next;
}

export function simulationReducer(
  state: SimulationUIState,
  event: SimulationEvent,
): SimulationUIState {
  const e = event as SimulationEventBase;
  const seq = e.seq ?? state.lastSeq;

  if (event.type === "start_loading") {
    return {
      ...initialSimulationUIState,
      targetRole: (e as SimulationEventBase & { targetRole?: string }).targetRole ?? "",
      interventions: e.interventions ?? [],
      isReplay: Boolean(e.isReplay),
      loading: true,
    };
  }

  if (event.type === "simulation_started") {
    return {
      ...initialSimulationUIState,
      simulationId: e.simulationId ?? null,
      targetRole: e.targetRole ?? state.targetRole,
      stages: e.stages ?? [],
      interventions: e.interventions ?? [],
      isReplay: Boolean(e.isReplay),
      loading: true,
      lastSeq: seq,
    };
  }

  if (event.type === "simulation_done") {
    return {
      ...state,
      loading: false,
      done: true,
      activeStageIndex: null,
      activeCandidateIds: new Set(),
      pulsingNodeIds: new Set(),
      lastSeq: seq,
    };
  }

  if (event.type === "final_feedback" && "feedback" in event) {
    return {
      ...state,
      finalFeedback: event.feedback,
      lastSeq: seq,
    };
  }

  if (event.type === "intervention_result") {
    return {
      ...state,
      interventionResult: {
        message: e.message ?? "",
        callbackGapReduction: (e as SimulationEventBase & { callbackGapReduction?: number })
          .callbackGapReduction ?? 0,
        subjectiveGapReduction: (e as SimulationEventBase & { subjectiveGapReduction?: number })
          .subjectiveGapReduction ?? 0,
        before: (e as SimulationEventBase & { before?: Record<string, number> }).before ?? {},
        after: (e as SimulationEventBase & { after?: Record<string, number> }).after ?? {},
      },
      lastSeq: seq,
    };
  }

  let next: SimulationUIState = { ...state, lastSeq: seq };

  if (
    event.type === "candidate_created" ||
    event.type === "variant_created"
  ) {
    next.candidates = upsertCandidate(next.candidates, e);
  }

  if (event.type === "stage_entered" && e.stageIndex !== undefined) {
    next.activeStageIndex = e.stageIndex;
    next.activeCandidateIds = new Set(e.candidateIds ?? next.candidates.map((c) => c.id));
    next.pulsingNodeIds = new Set(
      (e.candidateIds ?? next.candidates.map((c) => c.id)).map(
        (id) => `node-${id}-${e.stageIndex}`,
      ),
    );
  }

  if (event.type === "stage_completed") {
    next.pulsingNodeIds = new Set();
  }

  if (event.type === "candidate_stage_started" && e.candidateId && e.stageIndex !== undefined) {
    next.pulsingNodeIds = new Set([`node-${e.candidateId}-${e.stageIndex}`]);
    next.selectedNodeId = `node-${e.candidateId}-${e.stageIndex}`;
  }

  if (
    event.type === "agent_message_start" ||
    event.type === "agent_message_delta" ||
    event.type === "agent_message_end"
  ) {
    const messages = applyAgentStreamEvent(next.messages, e as Parameters<typeof applyAgentStreamEvent>[1]);
    next.messages = messages;
    if (event.type === "agent_message_start" && e.messageId) {
      if (!next.messageOrder.includes(e.messageId)) {
        next.messageOrder = [...next.messageOrder, e.messageId];
      }
    }
    if (event.type === "agent_message_end" && e.candidateId && e.stageIndex !== undefined) {
      next = {
        ...next,
        scores: setStageScores(next.scores, e.candidateId, e.stageIndex, e),
      };
    }
  }

  if (event.type === "agent_message" && e.messageId) {
    const id = e.messageId;
    const existing = next.messages.get(id);
    next.messages = new Map(next.messages);
    next.messages.set(id, {
      messageId: id,
      speaker: e.sourceAgent ?? e.speaker ?? "Agent",
      messageRole: (e.messageRole as AgentMessage["messageRole"]) ?? "reasoning",
      stage: e.stage ?? "",
      stageIndex: e.stageIndex ?? 0,
      variant: e.variant,
      candidateId: e.candidateId,
      sourceAgent: e.sourceAgent,
      targetAgent: e.targetAgent,
      content: e.message ?? e.content ?? existing?.content ?? "",
      isComplete: true,
      seq: e.seq,
      technicalScore: e.technicalScore,
      subjectiveScore: e.subjectiveScore,
      confidence: e.confidence,
      callbackProbability: e.callbackProbability,
      assumptionTags: e.assumptionTags,
      branchReason: e.branchReason,
    });
    if (!next.messageOrder.includes(id)) {
      next.messageOrder = [...next.messageOrder, id];
    }
    if (e.candidateId && e.stageIndex !== undefined) {
      next.candidates = upsertCandidate(next.candidates, e);
      next.scores = setStageScores(next.scores, e.candidateId, e.stageIndex, e);
    }
  }

  if (event.type === "score_update" && e.candidateId && e.stageIndex !== undefined) {
    next.candidates = upsertCandidate(next.candidates, e);
    next.scores = setStageScores(next.scores, e.candidateId, e.stageIndex, e);
    next.pulsingNodeIds = new Set([`node-${e.candidateId}-${e.stageIndex}`]);
  }

  if (event.type === "branch_detected" && e.candidateId) {
    const branch: BranchRecord = {
      candidateId: e.candidateId,
      variant: e.variant ?? e.candidateId,
      stage: e.stage ?? "",
      stageIndex: e.stageIndex ?? 0,
      branchReason: e.branchReason ?? e.message ?? "Timeline branch",
      severity: e.severity ?? "medium",
    };
    if (!next.branches.some((b) => b.candidateId === branch.candidateId && b.stageIndex === branch.stageIndex)) {
      next.branches = [...next.branches, branch];
    }
    next.pulsingNodeIds = new Set([`branch-${e.candidateId}-${e.stageIndex}`]);
  }

  if (event.type === "assumption_propagated" && e.candidateId && e.assumptionTag) {
    next.assumptions = [
      ...next.assumptions,
      {
        candidateId: e.candidateId,
        tag: e.assumptionTag,
        stage: e.stage ?? "",
      },
    ];
  }

  if (event.type === "bias_audit_flag" && e.candidateId) {
    next.pulsingNodeIds = new Set([`audit-${e.candidateId}`]);
  }

  return next;
}

export function nodeIdFor(candidateId: string, stageIndex: number): string {
  return `node-${candidateId}-${stageIndex}`;
}

export function messagesForNode(
  state: SimulationUIState,
  candidateId: string,
  stageIndex: number,
): AgentMessage[] {
  const out: AgentMessage[] = [];
  for (const id of state.messageOrder) {
    const m = state.messages.get(id);
    if (m && m.candidateId === candidateId && m.stageIndex === stageIndex) {
      out.push(m);
    }
  }
  return out;
}
