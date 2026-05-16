export type TimelineEvent = {
  type: string;
  stage: string;
  stageIndex: number;
  messageId?: string;
  speaker?: string;
  messageRole?: "handoff" | "reasoning";
  content?: string;
  delta?: string;
  candidateId?: string;
  candidateName?: string;
  variant?: string;
  sourceAgent?: string;
  targetAgent?: string;
  message?: string;
  stageFeedback?: string;
  confidence?: number;
  callbackProbability?: number;
  technicalScore?: number;
  subjectiveScore?: number;
  assumptionTags?: string[];
  branchReason?: string;
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
  technicalScore?: number;
  subjectiveScore?: number;
  confidence?: number;
  callbackProbability?: number;
};

export type FinalFeedback = {
  summary: string;
  keyFindings: string[];
  divergencePoints: string[];
  suggestedInterventions: string[];
  fairnessDeltaPlaceholder: string;
};

export type SimulationEvent =
  | TimelineEvent
  | { type: "final_feedback"; feedback: FinalFeedback }
  | { type: "simulation_done" };

export function isTimelineEvent(e: SimulationEvent): e is TimelineEvent {
  return (
    e.type !== "final_feedback" &&
    e.type !== "simulation_done" &&
    e.type !== "agent_message_start" &&
    e.type !== "agent_message_delta" &&
    e.type !== "agent_message_end"
  );
}

export function isFinalFeedback(
  e: SimulationEvent,
): e is { type: "final_feedback"; feedback: FinalFeedback } {
  return e.type === "final_feedback";
}
