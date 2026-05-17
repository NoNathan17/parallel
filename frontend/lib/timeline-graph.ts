import type { Edge, Node } from "@xyflow/react";

import { nodeIdFor } from "@/lib/simulation-reducer";
import type { SimulationUIState } from "@/lib/simulation-reducer";
import { VARIANT_LANE_COLORS } from "@/lib/types";

const STAGE_X = 200;
const LANE_HEIGHT = 130;
const ORIGIN_Y = 195;

const STAGE_LABELS = [
  "Parse",
  "Variants",
  "Screen",
  "Recruiter",
  "Technical",
  "Manager",
  "Audit",
];

export type TimelineNodeData = {
  label: string;
  sublabel?: string;
  nodeKind: "origin" | "fork" | "stage" | "branch" | "audit";
  candidateId?: string;
  variant?: string;
  stageIndex: number;
  color: string;
  active: boolean;
  branched: boolean;
  audited: boolean;
  scores?: {
    technical?: number;
    subjective?: number;
    confidence?: number;
    callback?: number;
  };
  branchReason?: string;
};

export function buildTimelineGraph(state: SimulationUIState): {
  nodes: Node<TimelineNodeData>[];
  edges: Edge[];
} {
  const nodes: Node<TimelineNodeData>[] = [];
  const edges: Edge[] = [];

  const candidateCount = Math.max(state.candidates.length, 1);
  const totalHeight = (candidateCount - 1) * LANE_HEIGHT;
  const centerY = ORIGIN_Y;

  nodes.push({
    id: "origin",
    type: "timelineNode",
    position: { x: 0, y: centerY },
    data: {
      label: "Singularity",
      sublabel: "Base profile",
      nodeKind: "origin",
      stageIndex: -1,
      color: "#eef0f6",
      active: state.activeStageIndex === 0,
      branched: false,
      audited: false,
    },
  });

  nodes.push({
    id: "parse",
    type: "timelineNode",
    position: { x: STAGE_X * 0.85, y: centerY },
    data: {
      label: "Resume parsed",
      nodeKind: "stage",
      stageIndex: 0,
      color: "#a3adc2",
      active: state.pulsingNodeIds.has("parse") || state.activeStageIndex === 0,
      branched: false,
      audited: false,
    },
  });
  edges.push({
    id: "e-origin-parse",
    source: "origin",
    target: "parse",
    animated: state.activeStageIndex === 0,
    style: { stroke: "#8b7cf8", strokeWidth: 2 },
  });

  nodes.push({
    id: "fork",
    type: "timelineNode",
    position: { x: STAGE_X * 1.7, y: centerY },
    data: {
      label: "Variant fork",
      sublabel: `${state.candidates.length || 4} timelines`,
      nodeKind: "fork",
      stageIndex: 1,
      color: "#8b7cf8",
      active: state.activeStageIndex === 1,
      branched: false,
      audited: false,
    },
  });
  edges.push({
    id: "e-parse-fork",
    source: "parse",
    target: "fork",
    animated: state.activeStageIndex === 1,
    style: { stroke: "#8b7cf8", strokeWidth: 2 },
  });

  const hiringStages = [2, 3, 4, 5, 6];

  state.candidates.forEach((c) => {
    const laneY = centerY - totalHeight / 2 + c.laneIndex * LANE_HEIGHT;
    const color = VARIANT_LANE_COLORS[c.id] ?? "#8b7cf8";
    const hasBranch = state.branches.some((b) => b.candidateId === c.id);

    hiringStages.forEach((si, idx) => {
      const id = nodeIdFor(c.id, si);
      const branch = state.branches.find(
        (b) => b.candidateId === c.id && b.stageIndex === si,
      );
      const sc = state.scores[c.id]?.[si];
      const active =
        state.pulsingNodeIds.has(id) ||
        (state.activeStageIndex === si && state.activeCandidateIds.has(c.id));

      nodes.push({
        id,
        type: "timelineNode",
        position: { x: STAGE_X * (2.4 + idx * 0.95), y: laneY },
        data: {
          label: STAGE_LABELS[si] ?? `Stage ${si}`,
          sublabel: c.variant,
          nodeKind: branch ? "branch" : si === 6 ? "audit" : "stage",
          candidateId: c.id,
          variant: c.variant,
          stageIndex: si,
          color,
          active,
          branched: Boolean(branch),
          audited: state.pulsingNodeIds.has(`audit-${c.id}`) && si === 6,
          scores: sc
            ? {
                technical: sc.technicalScore,
                subjective: sc.subjectiveScore,
                confidence: Math.round(sc.confidence * 100),
                callback: Math.round(sc.callbackProbability * 100),
              }
            : undefined,
          branchReason: branch?.branchReason,
        },
      });

      const source = idx === 0 ? "fork" : nodeIdFor(c.id, hiringStages[idx - 1]!);
      edges.push({
        id: `e-${c.id}-${si}`,
        source,
        target: id,
        animated: active,
        style: {
          stroke: branch ? "#fbbf24" : color,
          strokeWidth: branch ? 3 : hasBranch ? 2 : 1.5,
          strokeDasharray: branch ? "8 4" : undefined,
        },
      });
    });
  });

  if (state.candidates.length === 0 && state.loading) {
    for (let i = 0; i < 4; i++) {
      const laneY = centerY - (3 * LANE_HEIGHT) / 2 + i * LANE_HEIGHT;
      const id = `placeholder-${i}`;
      nodes.push({
        id,
        type: "timelineNode",
        position: { x: STAGE_X * 2.4, y: laneY },
        data: {
          label: "Spawning…",
          nodeKind: "stage",
          stageIndex: 2,
          color: "#3d4760",
          active: true,
          branched: false,
          audited: false,
        },
      });
      edges.push({
        id: `e-fork-ph-${i}`,
        source: "fork",
        target: id,
        animated: true,
        style: { stroke: "#3d4760", strokeWidth: 1, strokeDasharray: "4 4" },
      });
    }
  }

  return { nodes, edges };
}
