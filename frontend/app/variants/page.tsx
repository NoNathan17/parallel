"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { generateVariants, getCandidate, getVariants, startSimulation } from "@/lib/api";
import type { CandidateVariant } from "@/lib/types";

function VariantsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const candidateId = searchParams.get("candidateId") ?? "";
  const [variants, setVariants] = useState<CandidateVariant[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [candidateName, setCandidateName] = useState("");

  useEffect(() => {
    if (!candidateId) return;
    (async () => {
      try {
        const cand = await getCandidate(candidateId);
        setCandidateName(cand.candidate.name);
        let res = await getVariants(candidateId);
        if (res.variants.length === 0) {
          res = await generateVariants(candidateId);
        }
        setVariants(res.variants);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load variants");
      } finally {
        setLoading(false);
      }
    })();
  }, [candidateId]);

  const runSimulation = async () => {
    setStarting(true);
    setError(null);
    try {
      const res = await startSimulation(
        candidateId,
        variants.map((v) => v.id)
      );
      router.push(`/simulation/${res.simulation.id}?candidateId=${candidateId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start simulation");
      setStarting(false);
    }
  };

  if (!candidateId) {
    return <p className="text-zinc-400">Missing candidate ID.</p>;
  }

  return (
    <>
      <Link href="/create" className="mb-8 inline-block text-sm text-zinc-500 hover:text-zinc-300">
        ← Back
      </Link>
      <h1 className="mb-2 text-3xl font-semibold">Parallel realities</h1>
      <p className="mb-2 text-zinc-400">
        Base candidate: <span className="text-zinc-200">{candidateName}</span>
      </p>
      <p className="mb-8 text-sm text-violet-400">
        These candidates are technically identical. Only one contextual signal changes per variant.
      </p>

      {loading && <p className="text-zinc-500">Generating variants…</p>}
      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="grid gap-4 sm:grid-cols-2">
        {variants.map((v) => (
          <div
            key={v.id}
            className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5"
          >
            <p className="mb-2 font-mono text-xs uppercase tracking-widest text-amber-500">
              Only this contextual signal changed
            </p>
            <h2 className="mb-1 text-lg font-medium text-zinc-100">{v.changed_signal}</h2>
            <p className="mb-3 text-sm text-zinc-400">{v.description}</p>
            <div className="rounded bg-zinc-950 p-2 font-mono text-xs text-zinc-500">
              {Object.keys(v.context_overlay).length > 0
                ? JSON.stringify(v.context_overlay, null, 2)
                : "No overlay (baseline control)"}
            </div>
          </div>
        ))}
      </div>

      {!loading && variants.length > 0 && (
        <button
          onClick={runSimulation}
          disabled={starting}
          className="mt-10 w-full rounded-lg bg-violet-600 py-3 text-sm font-medium hover:bg-violet-500 disabled:opacity-40"
        >
          {starting ? "Starting simulation…" : "Run hiring simulation →"}
        </button>
      )}
    </>
  );
}

export default function VariantsPage() {
  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-16 text-zinc-100">
      <div className="mx-auto max-w-4xl">
        <Suspense fallback={<p className="text-zinc-500">Loading…</p>}>
          <VariantsContent />
        </Suspense>
      </div>
    </main>
  );
}
