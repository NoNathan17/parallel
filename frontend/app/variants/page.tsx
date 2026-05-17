"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";

import { FlowShell } from "@/components/flow/flow-shell";
import { fetchProfilePreview } from "@/lib/api";
import { getFlowSession, hasProfile, saveFlowSession } from "@/lib/flow-session";
import { catalogEntryForId } from "@/lib/variant-catalog";
import type { PreviewCandidate } from "@/lib/flow-session";

export default function VariantsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<PreviewCandidate[]>([]);
  const [candidateName, setCandidateName] = useState("Candidate");

  useEffect(() => {
    if (!hasProfile()) {
      router.replace("/profile");
      return;
    }

    const session = getFlowSession();
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const preview = await fetchProfilePreview(
          session.resumeText,
          session.targetRole,
        );
        if (cancelled) return;
        setCandidates(preview.candidates);
        setCandidateName(preview.parsed.name);
        saveFlowSession({
          parsed: preview.parsed,
          candidates: preview.candidates,
        });
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to generate variants");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  const handleContinue = () => {
    router.push("/simulate");
  };

  return (
    <FlowShell>
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <h1 className="text-3xl font-bold tracking-tight">
            {loading ? "Generating profile variants…" : "Confirm your variants"}
          </h1>
          <p className="mt-3 text-[var(--muted)]">
            Four parallel timelines for <strong className="text-[var(--foreground)]">{candidateName}</strong>.
            Skills stay equivalent — only inclusivity signals differ.
          </p>
        </motion.div>

        {error && (
          <p className="mt-6 rounded-xl border border-[var(--error)]/25 bg-[var(--error-bg)] px-4 py-3 text-center text-sm text-[var(--error)]">
            {error}
          </p>
        )}

        {loading ? (
          <motion.div
            className="mt-12 grid gap-4 sm:grid-cols-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {[0, 1, 2, 3].map((i) => (
              <motion.div
                key={i}
                className="h-48 animate-pulse rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)]"
                animate={{ opacity: [0.4, 0.8, 0.4] }}
                transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.1 }}
              />
            ))}
          </motion.div>
        ) : (
          <motion.div
            className="mt-10 grid gap-5 sm:grid-cols-2"
            initial="hidden"
            animate="visible"
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: 0.1 } },
            }}
          >
            {candidates.map((c) => {
              const catalog = catalogEntryForId(c.id);
              return (
                <motion.article
                  key={c.id}
                  variants={{
                    hidden: { opacity: 0, y: 16 },
                    visible: { opacity: 1, y: 0 },
                  }}
                  className="card-glow rounded-2xl border border-[var(--border)] p-5"
                  style={{
                    borderLeftWidth: 4,
                    borderLeftColor: catalog?.color ?? "#a2d2ff",
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                        Profile {catalog?.shortLabel ?? c.id}
                      </p>
                      <h2 className="mt-1 text-lg font-semibold">{c.variant}</h2>
                    </div>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
                    {catalog?.why ?? c.signal}
                  </p>
                  <p className="mt-3 text-xs leading-relaxed text-[var(--foreground)]/80">
                    {catalog?.whatChanges}
                  </p>
                </motion.article>
              );
            })}
          </motion.div>
        )}

        <motion.div
          className="mt-10 flex flex-wrap items-center justify-center gap-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <Link
            href="/profile"
            className="rounded-xl border border-[var(--border)] px-6 py-3 text-sm text-[var(--muted)] hover:bg-[var(--surface-muted)]"
          >
            Back
          </Link>
          <button
            type="button"
            disabled={loading || candidates.length === 0}
            onClick={handleContinue}
            className="rounded-xl bg-[var(--primary)] px-10 py-3 text-sm font-semibold text-[var(--on-primary)] transition hover:bg-[var(--primary-hover)] disabled:opacity-40"
          >
            Run simulation
          </button>
        </motion.div>
      </div>
    </FlowShell>
  );
}
