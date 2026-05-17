/** SSE payload from Parallel backend (camelCase). */
export type SimulationEventBase = {
  type: string;
  seq?: number;
  timelineStep?: number;
  simulationId?: string;
  timestamp?: string;
  stage?: string;
  stageIndex?: number;
  candidateId?: string;
  candidateName?: string;
  variant?: string;
  sourceAgent?: string;
  targetAgent?: string;
  message?: string;
  stageFeedback?: string;
  messageId?: string;
  speaker?: string;
  messageRole?: "handoff" | "reasoning";
  content?: string;
  delta?: string;
  technicalScore?: number;
  subjectiveScore?: number;
  confidence?: number;
  callbackProbability?: number;
  confidenceDelta?: number;
  callbackDelta?: number;
  subjectiveDelta?: number;
  technicalDelta?: number;
  confidenceDeltaVsBaseline?: number;
  callbackDeltaVsBaseline?: number;
  subjectiveDeltaVsBaseline?: number;
  assumptionTags?: string[];
  assumptionTag?: string;
  branchReason?: string;
  severity?: string;
  candidateIds?: string[];
  stages?: string[];
  interventions?: string[];
  isReplay?: boolean;
  targetRole?: string;
  signal?: string;
  resumeSnapshot?: string;
  branchedCandidates?: string[];
  totalSteps?: number;
};

export type TimelineEvent = SimulationEventBase & {
  timestamp: string;
};

export type AgentMessage = {
  messageId: string;
  speaker: string;
  messageRole: "handoff" | "reasoning";
  stage: string;
  stageIndex: number;
  variant?: string;
  candidateId?: string;
  sourceAgent?: string;
  targetAgent?: string;
  content: string;
  isComplete: boolean;
  seq?: number;
  technicalScore?: number;
  subjectiveScore?: number;
  confidence?: number;
  callbackProbability?: number;
  assumptionTags?: string[];
  branchReason?: string;
};

export type CandidateRecord = {
  id: string;
  name: string;
  variant: string;
  signal: string;
  laneIndex: number;
};

export type BranchRecord = {
  candidateId: string;
  variant: string;
  stage: string;
  stageIndex: number;
  branchReason: string;
  severity: string;
};

export type StageScoreRecord = {
  technicalScore: number;
  subjectiveScore: number;
  confidence: number;
  callbackProbability: number;
};

export type FinalFeedback = {
  summary: string;
  keyFindings: string[];
  divergencePoints: string[];
  suggestedInterventions: string[];
  fairnessDeltaPlaceholder: string;
  fairnessMetrics?: {
    maxCallbackGap: number;
    maxSubjectiveGap: number;
    branchedVariantCount: number;
  };
};

export type InterventionResult = {
  callbackGapReduction: number;
  subjectiveGapReduction: number;
  before: Record<string, number>;
  after: Record<string, number>;
  message: string;
};

export type SimulationEvent =
  | SimulationEventBase
  | { type: "final_feedback"; feedback: FinalFeedback; simulationId?: string }
  | { type: "simulation_done" };

export function isFinalFeedback(
  e: SimulationEvent,
): e is { type: "final_feedback"; feedback: FinalFeedback } {
  return e.type === "final_feedback";
}

export const AGENT_STREAM_TYPES = new Set([
  "agent_message_start",
  "agent_message_delta",
  "agent_message_end",
  "agent_message",
]);

export const VARIANT_LANE_COLORS: Record<string, string> = {
  baseline: "#8b7cf8",
  gender: "#f472b6",
  race: "#fbbf24",
  socioeconomic: "#5eead4",
};

export const VARIANT_LABELS: Record<string, string> = {
  baseline: "Baseline",
  gender: "Gender",
  race: "Race & Ethnicity",
  socioeconomic: "Socioeconomic",
};
