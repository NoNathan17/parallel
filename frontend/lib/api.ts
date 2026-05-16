import type {
  BaseCandidate,
  CandidateVariant,
  InterventionFlags,
} from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, options);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail ?? `Request failed: ${res.status}`);
  }
  return res.json();
}

export async function uploadResume(file: File): Promise<{
  candidate: BaseCandidate;
  variants: string[];
}> {
  const form = new FormData();
  form.append("file", file);
  return request("/api/candidates", { method: "POST", body: form });
}

export async function seedDemo(): Promise<{
  candidate: BaseCandidate;
  variants: string[];
}> {
  return request("/api/demo/seed", { method: "POST" });
}

export async function getCandidate(id: string): Promise<{
  candidate: BaseCandidate;
  variants: string[];
}> {
  return request(`/api/candidates/${id}`);
}

export async function getVariants(candidateId: string): Promise<{
  base_candidate_id: string;
  variants: CandidateVariant[];
}> {
  return request(`/api/candidates/${candidateId}/variants`);
}

export async function generateVariants(candidateId: string): Promise<{
  base_candidate_id: string;
  variants: CandidateVariant[];
}> {
  return request(`/api/candidates/${candidateId}/variants`, { method: "POST" });
}

/** Create simulation in pending state — call beginSimulation after stream connects */
export async function createSimulation(
  candidateId: string,
  variantIds?: string[],
  interventions?: InterventionFlags
): Promise<{ simulation: { id: string } }> {
  return request("/api/simulations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      candidate_id: candidateId,
      variant_ids: variantIds,
      interventions: interventions ?? {
        blind_screening: false,
        structured_rubric: false,
        hidden_recruiter_notes: false,
        standardized_questions: false,
      },
    }),
  });
}

export async function beginSimulation(
  simulationId: string
): Promise<{ simulation: { id: string; status: string } }> {
  return request(`/api/simulations/${simulationId}/start`, { method: "POST" });
}

/** @deprecated use createSimulation — kept for compatibility */
export const startSimulation = createSimulation;

export async function replaySimulation(
  simulationId: string,
  interventions: InterventionFlags
): Promise<{ simulation: { id: string } }> {
  return request(`/api/simulations/${simulationId}/replay`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ interventions }),
  });
}

export function getEventsUrl(simulationId: string): string {
  return `${API_URL}/api/simulations/${simulationId}/events`;
}

export function getWebSocketUrl(simulationId: string): string {
  const base = API_URL.replace(/^http/, "ws");
  return `${base}/api/simulations/${simulationId}/ws`;
}

export { API_URL };
