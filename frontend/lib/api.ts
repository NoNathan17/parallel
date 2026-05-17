import type { SimulationEvent } from "./types";

/** Same-origin proxy in dev (see next.config.ts rewrites /api → backend). */
const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "/api";

export type SimulateOptions = {
  interventions?: string[];
  isReplay?: boolean;
  signal?: AbortSignal;
};

function parseSseChunk(buffer: string): { events: SimulationEvent[]; rest: string } {
  const events: SimulationEvent[] = [];
  const parts = buffer.split("\n\n");
  const rest = parts.pop() ?? "";

  for (const part of parts) {
    const line = part.trim();
    if (!line.startsWith("data:")) continue;
    const json = line.replace(/^data:\s*/, "");
    if (!json) continue;
    try {
      events.push(JSON.parse(json) as SimulationEvent);
    } catch {
      // skip malformed chunks
    }
  }

  return { events, rest };
}

export async function* streamSimulationJson(
  resumeText: string,
  targetRole: string,
  options?: SimulateOptions,
): AsyncGenerator<SimulationEvent> {
  const response = await fetch(`${API_BASE}/simulate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      resumeText,
      targetRole,
      interventions: options?.interventions ?? [],
      isReplay: options?.isReplay ?? false,
    }),
    signal: options?.signal,
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `Simulation failed (${response.status})`);
  }

  yield* readSseStream(response, options?.signal);
}

export async function* streamSimulationFile(
  file: File,
  targetRole: string,
  options?: SimulateOptions,
): AsyncGenerator<SimulationEvent> {
  const form = new FormData();
  form.append("file", file);
  form.append("targetRole", targetRole);
  if (options?.interventions?.length) {
    form.append("interventions", options.interventions.join(","));
  }
  if (options?.isReplay) {
    form.append("isReplay", "true");
  }

  const response = await fetch(`${API_BASE}/simulate`, {
    method: "POST",
    body: form,
    signal: options?.signal,
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `Simulation failed (${response.status})`);
  }

  yield* readSseStream(response, options?.signal);
}

async function* readSseStream(
  response: Response,
  signal?: AbortSignal,
): AsyncGenerator<SimulationEvent> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error("No response body");

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    if (signal?.aborted) break;
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const { events, rest } = parseSseChunk(buffer);
    buffer = rest;

    for (const event of events) {
      yield event;
    }
  }

  if (buffer.trim()) {
    const { events } = parseSseChunk(buffer + "\n\n");
    for (const event of events) {
      yield event;
    }
  }
}

export type HealthStatus = {
  ok: boolean;
  llm: boolean;
};

export async function checkHealth(): Promise<HealthStatus> {
  try {
    const res = await fetch(`${API_BASE}/health`, { cache: "no-store" });
    if (!res.ok) return { ok: false, llm: false };
    const data = await res.json();
    return {
      ok: data?.status === "ok",
      llm: Boolean(data?.llm),
    };
  } catch {
    return { ok: false, llm: false };
  }
}

export async function fetchInterventions(): Promise<Record<string, string>> {
  try {
    const res = await fetch(`${API_BASE}/interventions`, { cache: "no-store" });
    if (!res.ok) return {};
    return (await res.json()) as Record<string, string>;
  } catch {
    return {};
  }
}
