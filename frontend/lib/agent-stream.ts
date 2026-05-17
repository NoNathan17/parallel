import type { AgentMessage, SimulationEventBase } from "./types";

export function applyAgentStreamEvent(
  messages: Map<string, AgentMessage>,
  event: SimulationEventBase,
): Map<string, AgentMessage> {
  const next = new Map(messages);
  const id = event.messageId;
  if (!id) return next;

  if (event.type === "agent_message_start") {
    next.set(id, {
      messageId: id,
      speaker: event.speaker ?? "Agent",
      messageRole: (event.messageRole as AgentMessage["messageRole"]) ?? "reasoning",
      stage: event.stage ?? "",
      stageIndex: event.stageIndex ?? 0,
      variant: event.variant,
      candidateId: event.candidateId,
      sourceAgent: event.sourceAgent,
      targetAgent: event.targetAgent,
      content: event.content ?? "",
      isComplete: false,
      seq: event.seq,
    });
    return next;
  }

  if (event.type === "agent_message_delta") {
    const existing = next.get(id);
    if (existing) {
      next.set(id, {
        ...existing,
        content: existing.content + (event.delta ?? ""),
      });
    }
    return next;
  }

  if (event.type === "agent_message_end") {
    const existing = next.get(id);
    next.set(id, {
      messageId: id,
      speaker: event.speaker ?? existing?.speaker ?? "Agent",
      messageRole:
        (event.messageRole as AgentMessage["messageRole"]) ??
        existing?.messageRole ??
        "reasoning",
      stage: event.stage ?? existing?.stage ?? "",
      stageIndex: event.stageIndex ?? existing?.stageIndex ?? 0,
      variant: event.variant ?? existing?.variant,
      candidateId: event.candidateId ?? existing?.candidateId,
      sourceAgent: event.sourceAgent ?? existing?.sourceAgent,
      targetAgent: event.targetAgent ?? existing?.targetAgent,
      content: event.content ?? existing?.content ?? "",
      isComplete: true,
      seq: event.seq ?? existing?.seq,
      technicalScore: event.technicalScore ?? existing?.technicalScore,
      subjectiveScore: event.subjectiveScore ?? existing?.subjectiveScore,
      confidence: event.confidence ?? existing?.confidence,
      callbackProbability: event.callbackProbability ?? existing?.callbackProbability,
    });
    return next;
  }

  return next;
}

export function isAgentStreamEvent(e: { type: string }): boolean {
  return (
    e.type === "agent_message_start" ||
    e.type === "agent_message_delta" ||
    e.type === "agent_message_end" ||
    e.type === "agent_message"
  );
}
