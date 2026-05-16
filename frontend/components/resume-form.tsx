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
  const [mode, setMode] = useState<"paste" | "upload">("paste");
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
    <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-lg">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
        Start simulation
      </h2>

      <label className="mt-4 block">
        <span className="text-xs text-slate-500">Target role</span>
        <input
          type="text"
          value={targetRole}
          onChange={(e) => onTargetRoleChange(e.target.value)}
          placeholder="Software Engineering Intern"
          disabled={disabled}
          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-teal-500/50 focus:outline-none focus:ring-1 focus:ring-teal-500/30 disabled:opacity-50"
        />
      </label>

      <div className="mt-4 flex gap-2">
        <TabButton
          active={mode === "paste"}
          onClick={() => setMode("paste")}
          disabled={disabled}
        >
          Paste resume
        </TabButton>
        <TabButton
          active={mode === "upload"}
          onClick={() => setMode("upload")}
          disabled={disabled}
        >
          Upload file
        </TabButton>
      </div>

      {mode === "paste" ? (
        <label className="mt-3 block">
          <span className="text-xs text-slate-500">Resume text</span>
          <textarea
            value={resumeText}
            onChange={(e) => onResumeTextChange(e.target.value)}
            rows={10}
            disabled={disabled}
            placeholder="Paste resume content..."
            className="mt-1 w-full resize-y rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 font-mono text-xs leading-relaxed text-slate-200 placeholder:text-slate-600 focus:border-teal-500/50 focus:outline-none focus:ring-1 focus:ring-teal-500/30 disabled:opacity-50"
          />
          <button
            type="button"
            onClick={() => onResumeTextChange(SAMPLE_RESUME)}
            disabled={disabled}
            className="mt-2 text-xs text-teal-400/80 hover:text-teal-300 disabled:opacity-50"
          >
            Load sample resume
          </button>
        </label>
      ) : (
        <div className="mt-3">
          <input
            ref={fileRef}
            type="file"
            accept=".txt,.pdf,text/plain,application/pdf"
            disabled={disabled}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0] ?? null;
              setSelectedFile(file);
            }}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={disabled}
            className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-600 bg-slate-950/50 px-4 py-10 text-sm text-slate-400 transition hover:border-teal-500/40 hover:bg-slate-900 disabled:opacity-50"
          >
            <span className="text-2xl text-slate-600">↑</span>
            <span>
              {selectedFile ? selectedFile.name : "Choose .txt or .pdf resume"}
            </span>
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={disabled || !canSubmit}
        className="mt-5 w-full rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-teal-900/30 transition hover:from-teal-500 hover:to-cyan-500 disabled:cursor-not-allowed disabled:opacity-40"
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
      onClick={onClick}
      disabled={disabled}
      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
        active
          ? "bg-slate-800 text-white"
          : "text-slate-500 hover:text-slate-300"
      } disabled:opacity-50`}
    >
      {children}
    </button>
  );
}
