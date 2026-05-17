"use client";

import { useRef, useState } from "react";

const SAMPLE_RESUME = `Nathan Ong
nathan@email.com
UC Irvine Computer Science
Skills: React, FastAPI, Python, AI, PostgreSQL
Projects: AI hiring simulation, food recognition app
Experience: Software engineering intern and research developer`;

type ResumeFormProps = {
  targetRole: string;
  onTargetRoleChange: (value: string) => void;
  resumeText: string;
  onResumeTextChange: (value: string) => void;
  onSubmit: () => void;
  onFileSelect: (file: File) => void;
  disabled?: boolean;
  loading?: boolean;
};

export function ResumeForm({
  targetRole,
  onTargetRoleChange,
  resumeText,
  onResumeTextChange,
  onSubmit,
  onFileSelect,
  disabled,
  loading,
}: ResumeFormProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<"upload" | "paste">("upload");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const canSubmit =
    targetRole.trim() &&
    (mode === "paste" ? resumeText.trim() : selectedFile !== null);

  const handleSubmit = () => {
    if (mode === "upload" && selectedFile) {
      onFileSelect(selectedFile);
    } else {
      onSubmit();
    }
  };

  return (
    <section className="card-glow rounded-xl p-5">
      <h2 className="text-base font-semibold text-[var(--foreground)]">
        Start simulation
      </h2>
      <p className="mt-1 text-sm text-[var(--muted)]">
        Upload a resume file first, or switch to paste.
      </p>

      <label className="mt-5 block">
        <span className="text-sm font-medium text-[var(--foreground)]">
          Target role
        </span>
        <input
          type="text"
          value={targetRole}
          onChange={(e) => onTargetRoleChange(e.target.value)}
          placeholder="Software Engineering Intern"
          disabled={disabled}
          className="mt-1.5 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-light)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 disabled:opacity-50"
        />
      </label>

      <div
        className="mt-5 flex gap-1 rounded-lg bg-[var(--surface-muted)] p-1"
        role="tablist"
        aria-label="Resume input method"
      >
        <TabButton
          active={mode === "upload"}
          onClick={() => setMode("upload")}
          disabled={disabled}
        >
          Upload file
        </TabButton>
        <TabButton
          active={mode === "paste"}
          onClick={() => setMode("paste")}
          disabled={disabled}
        >
          Paste text
        </TabButton>
      </div>

      {mode === "upload" ? (
        <div className="mt-4">
          <input
            ref={fileRef}
            type="file"
            accept=".txt,.pdf,text/plain,application/pdf"
            disabled={disabled}
            className="sr-only"
            id="resume-file"
            onChange={(e) => {
              setSelectedFile(e.target.files?.[0] ?? null);
            }}
          />
          <label
            htmlFor="resume-file"
            className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-10 text-center transition ${
              selectedFile
                ? "border-[var(--primary)] bg-[var(--primary-soft)]"
                : "border-[var(--border-strong)] bg-[var(--surface-muted)] hover:border-[var(--primary)] hover:bg-[var(--primary-soft)]/50"
            } ${disabled ? "pointer-events-none opacity-50" : ""}`}
          >
            <span
              className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--surface)] text-xl text-[var(--primary)] ring-1 ring-[var(--border)]"
              aria-hidden
            >
              ↑
            </span>
            <span className="text-sm font-medium text-[var(--foreground)]">
              {selectedFile ? selectedFile.name : "Choose resume file"}
            </span>
            <span className="text-xs text-[var(--muted)]">
              .txt or .pdf — recommended way to start
            </span>
          </label>
        </div>
      ) : (
        <label className="mt-4 block">
          <span className="text-sm font-medium text-[var(--foreground)]">
            Resume text
          </span>
          <textarea
            value={resumeText}
            onChange={(e) => onResumeTextChange(e.target.value)}
            rows={8}
            disabled={disabled}
            placeholder="Paste resume content here…"
            className="mt-1.5 w-full resize-y rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm leading-relaxed text-[var(--foreground)] placeholder:text-[var(--muted-light)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 disabled:opacity-50"
          />
          <button
            type="button"
            onClick={() => onResumeTextChange(SAMPLE_RESUME)}
            disabled={disabled}
            className="mt-2 text-sm font-medium text-[var(--primary)] underline-offset-2 hover:underline disabled:opacity-50"
          >
            Load sample resume
          </button>
        </label>
      )}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={disabled || !canSubmit}
        className="mt-5 w-full rounded-lg bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-[var(--on-primary)] transition hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-40"
      >
        {loading ? "Running simulation…" : "Run simulation"}
      </button>
    </section>
  );
}

function TabButton({
  active,
  onClick,
  disabled,
  children,
}: {
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      disabled={disabled}
      className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition ${
        active
          ? "bg-[var(--surface)] text-[var(--foreground)] shadow-sm"
          : "text-[var(--muted)] hover:text-[var(--foreground)]"
      } disabled:opacity-50`}
    >
      {children}
    </button>
  );
}
