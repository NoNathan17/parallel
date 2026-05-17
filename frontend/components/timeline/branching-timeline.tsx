"use client";

import { useEffect, useMemo } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  useEdgesState,
  useNodesState,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { motion } from "framer-motion";

import { TimelineNode } from "@/components/timeline/timeline-node";
import { buildTimelineGraph } from "@/lib/timeline-graph";
import type { SimulationUIState } from "@/lib/simulation-reducer";

const nodeTypes = {
  timelineNode: TimelineNode,
} satisfies NodeTypes;

type BranchingTimelineProps = {
  state: SimulationUIState;
  onSelectNode: (nodeId: string | null) => void;
};

export function BranchingTimeline({ state, onSelectNode }: BranchingTimelineProps) {
  const graph = useMemo(() => buildTimelineGraph(state), [state]);
  const [nodes, setNodes, onNodesChange] = useNodesState(graph.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(graph.edges);

  useEffect(() => {
    setNodes(graph.nodes);
    setEdges(graph.edges);
  }, [graph, setNodes, setEdges]);

  return (
    <div
      className="relative h-[min(72vh,640px)] w-full overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--background-subtle)]"
      style={{ perspective: "1200px" }}
    >
      <p className="absolute left-4 top-3 z-10 text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
        Sacred timeline → parallel variant branches
      </p>
      {state.loading && (
        <motion.span
          className="absolute right-4 top-3 z-10 flex items-center gap-2 text-xs text-[var(--primary)]"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 1 }}
        >
          <span className="h-2 w-2 rounded-full bg-[var(--primary)]" />
          Live simulation
        </motion.span>
      )}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.22 }}
        minZoom={0.3}
        maxZoom={1.5}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable
        onNodeClick={(_, node) => onSelectNode(node.id)}
        onPaneClick={() => onSelectNode(null)}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#d4cdd8" />
        <Controls
          showInteractive={false}
          className="!rounded-lg !border-[var(--border)] !bg-[var(--surface)]"
        />
        <MiniMap
          nodeColor={(n) => (n.data as { color?: string }).color ?? "#a2d2ff"}
          maskColor="rgba(250, 248, 252, 0.85)"
          className="!rounded-lg !border-[var(--border)]"
        />
      </ReactFlow>
    </div>
  );
}
