export interface Education {
  institution: string;
  degree?: string;
  field?: string;
  year?: string;
}

export interface Project {
  name: string;
  description: string;
  technologies?: string[];
}

export interface Experience {
  company: string;
  title: string;
  duration?: string;
  description?: string;
}

export interface Skill {
  name: string;
  level?: string;
}

export interface BaseCandidate {
  id: string;
  name: string;
  email?: string;
  target_role: string;
  education: Education[];
  projects: Project[];
  experience: Experience[];
  skills: Skill[];
  technical_summary: string;
  technical_equivalence_hash?: string;
}

export interface CandidateVariant {
  id: string;
  base_candidate_id: string;
  signal: string;
  label: string;
  changed_signal: string;
  description: string;
  context_overlay: Record<string, unknown>;
  name: string;
  target_role: string;
  technical_summary: string;
  technical_equivalence_hash: string;
}

export interface InterventionFlags {
  blind_screening: boolean;
  structured_rubric: boolean;
  hidden_recruiter_notes: boolean;
  standardized_questions: boolean;
}

export interface SimulationEvent {
  type: string;
  simulation_id: string;
  payload: Record<string, unknown>;
}

export interface AgentMessage {
  from_agent: string;
  to_agent: string;
  message: string;
  tone?: string;
  variant_id?: string;
  variant_label?: string;
}

export interface AgentThinking {
  agent: string;
  message: string;
}

export interface AgentEvaluation {
  agent: string;
  variant_id: string;
  variant_label: string;
  score: number;
  confidence: number;
  callback_probability: number;
  rationale: string;
  assumptions: string[];
}

export interface TimelineNode {
  node_id: string;
  agent: string;
  variant_id: string;
  x: number;
  y: number;
  merged: boolean;
  score: number;
  confidence: number;
}

export interface BranchEvent {
  branch_id: string;
  parent_node_id: string;
  variant_id: string;
  variant_label: string;
  cause: string;
  signal: string;
  agent: string;
  confidence_delta: number;
  branch_x?: number;
  branch_y?: number;
}

export interface BiasAudit {
  divergence_start_agent: string;
  divergence_start_variant: string;
  amplifier_agent: string;
  signal_caused: string;
  summary: string;
  technical_equivalence_maintained: boolean;
}
