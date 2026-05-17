import type { FinalFeedback, InterventionResult } from "@/lib/types";

export type PreviewCandidate = {
  id: string;
  name: string;
  variant: string;
  signal: string;
  resumeSnapshot: string;
};

export type ParsedProfile = {
  name: string;
  email: string;
  education: string[];
  skills: string[];
  projects: string[];
  experience: string[];
  summary: string;
};

export type FlowSession = {
  targetRole: string;
  resumeText: string;
  resumeFileName?: string;
  parsed?: ParsedProfile;
  candidates?: PreviewCandidate[];
  interventions: string[];
  isReplay: boolean;
  finalFeedback?: FinalFeedback;
  interventionResult?: InterventionResult;
  simulationComplete?: boolean;
};

const STORAGE_KEY = "parallel_flow_session";

const DEFAULT_SESSION: FlowSession = {
  targetRole: "Software Engineering Intern",
  resumeText: "",
  interventions: [],
  isReplay: false,
};

export function getFlowSession(): FlowSession {
  if (typeof window === "undefined") return { ...DEFAULT_SESSION };
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SESSION };
    return { ...DEFAULT_SESSION, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SESSION };
  }
}

export function saveFlowSession(patch: Partial<FlowSession>): FlowSession {
  const next = { ...getFlowSession(), ...patch };
  if (typeof window !== "undefined") {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }
  return next;
}

export function clearFlowSession(): void {
  if (typeof window !== "undefined") {
    sessionStorage.removeItem(STORAGE_KEY);
  }
}

export function hasProfile(): boolean {
  const s = getFlowSession();
  return Boolean(s.resumeText.trim() && s.targetRole.trim());
}

export function hasVariants(): boolean {
  const s = getFlowSession();
  return Boolean(s.candidates && s.candidates.length > 0);
}
