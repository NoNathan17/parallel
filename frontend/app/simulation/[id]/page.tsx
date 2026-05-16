"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { AgentFeed } from "@/components/timeline/AgentFeed";
import { BiasAuditorPanel } from "@/components/timeline/BiasAuditorPanel";
import { InterventionBar } from "@/components/timeline/InterventionBar";
import { TimelineCanvas } from "@/components/timeline/TimelineCanvas";
import { useSimulationStream } from "@/hooks/useSimulationStream";
import { getVariants, replaySimulation } from "@/lib/api";
import type { CandidateVariant, InterventionFlags } from "@/lib/types";

function SimulationContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const simulationId = params.id as string;
  const candidateId = searchParams.get("candidateId") ?? "";

  const stream = useSimulationStream(simulationId);
  const [variants, setVariants] = useState<CandidateVariant[]>([]);
  const [interventions, setInterventions] = useState<InterventionFlags>({
    blind_screening: false,
    structured_rubric: false,
    hidden_recruiter_notes: false,
    standardized_questions: false,
  });
  const [replayId, setReplayId] = useState<string | null>(null);
  const [replayLoading, setReplayLoading] = useState(false);

  useEffect(() => {
    if (!candidateId) return;
    getVariants(candidateId)
      .then((res) => setVariants(res.variants))
      .catch(() => {});
  }, [candidateId]);

  const variantLabels = Object.fromEntries(
    variants.map((v) => [v.id, v.label])
  );
  const variantIds = variants.map((v) => v.id);

  const handleReplay = async () => {
    setReplayLoading(true);
    try {
      const res = await replaySimulation(simulationId, interventions);
      setReplayId(res.simulation.id);
      window.location.href = `/simulation/${res.simulation.id}?candidateId=${candidateId}&replay=1`;
    } catch {
      setReplayLoading(false);
    }
  };

  const activeId = replayId ?? simulationId;

  const headline = stream.completed
    ? "Timelines have diverged — the system changed, not the skill."
    : "These candidates are technically identical.";

  return (
    <div className="mx-auto max-w-7xl">
      <Link href={`/variants?candidateId=${candidateId}`} className="mb-6 inline-block text-sm text-zinc-500 hover:text-zinc-300">
        ← Variants
      </Link>

      <h1 className="mb-1 text-2xl font-semibold tracking-tight">{headline}</h1>
      <p className="mb-8 font-mono text-xs text-zinc-500">
        Simulation {activeId.slice(0, 8)}… · {stream.connected ? "live" : "connecting"}
      </p>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <TimelineCanvas
            nodes={stream.timelineNodes}
            branches={stream.branchEvents}
            variantIds={variantIds}
            variantLabels={variantLabels}
          />
          <AgentFeed evaluations={stream.evaluations} />
        </div>

        <div className="space-y-4">
          <BiasAuditorPanel
            audit={stream.biasAudit}
            callbackSpread={stream.callbackSpread}
            replayMetrics={stream.replayMetrics}
          />
          <InterventionBar
            flags={interventions}
            onChange={setInterventions}
            onReplay={handleReplay}
            disabled={!stream.completed}
            loading={replayLoading}
          />
        </div>
      </div>
    </div>
  );
}

export default function SimulationPage() {
  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-12 text-zinc-100">
      <Suspense fallback={<p className="text-zinc-500">Loading simulation…</p>}>
        <SimulationContent />
      </Suspense>
    </main>
  );
}
