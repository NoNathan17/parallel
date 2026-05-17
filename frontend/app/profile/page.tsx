"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

import { FlowShell } from "@/components/flow/flow-shell";
import { getFlowSession, saveFlowSession } from "@/lib/flow-session";

const SAMPLE_RESUME = `Nathan Ong
nathan@email.com
UC Irvine Computer Science
Skills: React, FastAPI, Python, AI, PostgreSQL
Projects: AI hiring simulation, food recognition app
Experience: Software engineering intern and research developer`;

const DEFAULT_ROLE = "Software Engineering Intern";

function ProfilePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialMode = searchParams.get("mode") === "upload" ? "upload" : "create";
  const fileRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<"upload" | "create">(initialMode);
  const [targetRole, setTargetRole] = useState(DEFAULT_ROLE);
  const [resumeText, setResumeText] = useState("");
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    const session = getFlowSession();
    if (session.targetRole) setTargetRole(session.targetRole);
    if (session.resumeText) setResumeText(session.resumeText);
  }, []);

  const canContinue =
    targetRole.trim() &&
    (mode === "create" ? resumeText.trim().length > 20 : file !== null);

  const handleContinue = async () => {
    if (mode === "upload" && file) {
      const text = await file.text();
      saveFlowSession({
        targetRole: targetRole.trim(),
        resumeText: text,
        resumeFileName: file.name,
      });
    } else {
      saveFlowSession({
        targetRole: targetRole.trim(),
        resumeText: resumeText.trim(),
      });
    }
    router.push("/variants");
  };

  return (
    <FlowShell>
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Fill out your profile
          </h1>
          <p className="mt-3 text-[var(--muted)]">
            Upload a resume or create your profile manually. We&apos;ll generate
            parallel candidate variants with equivalent qualifications.
          </p>
        </motion.div>

        <motion.div
          className="mt-10 grid gap-8 md:grid-cols-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
        >
          <button
            type="button"
            onClick={() => setMode("upload")}
            className={`rounded-2xl border p-8 text-left transition ${
              mode === "upload"
                ? "border-[var(--primary)] bg-[var(--primary-soft)] ring-2 ring-[var(--primary)]/30"
                : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--primary)]/50"
            }`}
          >
            <span className="text-3xl" aria-hidden>
              ↑
            </span>
            <h2 className="mt-4 text-lg font-semibold">Add your resume</h2>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Upload .txt or .pdf — fastest way to start the simulation.
            </p>
          </button>

          <button
            type="button"
            onClick={() => setMode("create")}
            className={`rounded-2xl border p-8 text-left transition ${
              mode === "create"
                ? "border-[var(--primary)] bg-[var(--primary-soft)] ring-2 ring-[var(--primary)]/30"
                : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--primary)]/50"
            }`}
          >
            <span className="text-3xl" aria-hidden>
              ✎
            </span>
            <h2 className="mt-4 text-lg font-semibold">Create your profile</h2>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Paste or type resume content directly.
            </p>
          </button>
        </motion.div>

        <motion.div
          className="card-glow mx-auto mt-10 max-w-2xl rounded-2xl p-6"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <label className="block">
            <span className="text-sm font-medium">Target role</span>
            <input
              type="text"
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              className="mt-2 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
            />
          </label>

          {mode === "upload" ? (
            <motion.div className="mt-6" layout>
              <input
                ref={fileRef}
                type="file"
                accept=".txt,.pdf"
                className="sr-only"
                id="resume-upload"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              <label
                htmlFor="resume-upload"
                className="flex cursor-pointer flex-col items-center rounded-xl border-2 border-dashed border-[var(--border-strong)] py-12 transition hover:border-[var(--primary)] hover:bg-[var(--primary-soft)]/30"
              >
                <span className="text-sm font-medium">
                  {file ? file.name : "Choose resume file"}
                </span>
                <span className="mt-1 text-xs text-[var(--muted)]">.txt or .pdf</span>
              </label>
            </motion.div>
          ) : (
            <label className="mt-6 block">
              <span className="text-sm font-medium">Resume text</span>
              <textarea
                value={resumeText}
                onChange={(e) => setResumeText(e.target.value)}
                rows={10}
                placeholder="Paste your resume here…"
                className="mt-2 w-full resize-y rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm leading-relaxed focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
              />
              <button
                type="button"
                onClick={() => setResumeText(SAMPLE_RESUME)}
                className="mt-2 text-sm text-[var(--primary)] hover:underline"
              >
                Load sample resume
              </button>
            </label>
          )}

          <button
            type="button"
            disabled={!canContinue}
            onClick={handleContinue}
            className="mt-8 w-full rounded-xl bg-[var(--primary)] py-3.5 text-sm font-semibold text-[#0c0e14] transition hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Continue to variants
          </button>
        </motion.div>
      </div>
    </FlowShell>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--background)]" />}>
      <ProfilePageContent />
    </Suspense>
  );
}
