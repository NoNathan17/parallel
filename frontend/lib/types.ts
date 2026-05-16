export type TimelineEvent = {
  type: string;
  stage: string;
  stageIndex: number;
  candidateId?: string;
  candidateName?: string;
  variant?: string;
  sourceAgent: string;
  targetAgent: string;
  message: string;
  stageFeedback: string;
  confidence?: number;
  callbackProbability?: number;
  technicalScore?: number;
  subjectiveScore?: number;
  assumptionTags?: string[];
  branchReason?: string;
  timestamp: string;
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
  return e.type !== "final_feedback" && e.type !== "simulation_done";
}

export function isFinalFeedback(
  e: SimulationEvent,
): e is { type: "final_feedback"; feedback: FinalFeedback } {
  return e.type === "final_feedback";
}
