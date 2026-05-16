"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { seedDemo, uploadResume } from "@/lib/api";
import type { BaseCandidate } from "@/lib/types";

export default function CreatePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [candidate, setCandidate] = useState<BaseCandidate | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setError("Please upload a PDF resume.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await uploadResume(file);
      setCandidate(res.candidate);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleDemo = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await seedDemo();
      router.push(`/variants?candidateId=${res.candidate.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Demo seed failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-2xl px-6 py-16">
        <Link href="/" className="mb-8 inline-block text-sm text-zinc-500 hover:text-zinc-300">
          ← Parallel
        </Link>
        <h1 className="mb-2 text-3xl font-semibold tracking-tight">Create base candidate</h1>
        <p className="mb-8 text-zinc-400">
          Upload a resume to extract the technically equivalent base profile.
        </p>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const file = e.dataTransfer.files[0];
            if (file) handleFile(file);
          }}
          className={`rounded-xl border-2 border-dashed p-12 text-center transition-colors ${
            dragOver ? "border-violet-500 bg-violet-950/20" : "border-zinc-700 bg-zinc-900/50"
          }`}
        >
          <p className="mb-4 text-zinc-400">Drop PDF resume here</p>
          <label className="inline-block cursor-pointer rounded-lg bg-violet-600 px-6 py-2 text-sm font-medium hover:bg-violet-500">
            {loading ? "Parsing…" : "Choose file"}
            <input
              type="file"
              accept=".pdf"
              className="hidden"
              disabled={loading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />
          </label>
        </div>

        {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

        <div className="mt-6">
          <button
            onClick={handleDemo}
            disabled={loading}
            className="rounded-lg border border-zinc-600 px-4 py-2 text-sm text-zinc-300 hover:border-zinc-400 disabled:opacity-40"
          >
            Use demo candidate
          </button>
        </div>

        {candidate && (
          <div className="mt-10 rounded-xl border border-zinc-800 bg-zinc-900/60 p-6">
            <h2 className="mb-4 text-lg font-medium">{candidate.name}</h2>
            <p className="mb-2 text-sm text-zinc-400">{candidate.target_role}</p>
            <p className="mb-4 text-sm text-zinc-300">{candidate.technical_summary}</p>
            <button
              onClick={() => router.push(`/variants?candidateId=${candidate.id}`)}
              className="mt-4 w-full rounded-lg bg-violet-600 py-2 text-sm font-medium hover:bg-violet-500"
            >
              Generate parallel realities →
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
