import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-6 text-zinc-100">
      <div className="max-w-2xl text-center">
        <p className="mb-4 font-mono text-xs uppercase tracking-[0.3em] text-violet-500">
          Parallel
        </p>
        <h1 className="mb-6 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
          The system changed,
          <br />
          <span className="text-violet-400">not the skill.</span>
        </h1>
        <p className="mb-10 text-lg text-zinc-400">
          Watch equally qualified candidates branch into different hiring outcomes—then
          replay with structural interventions that restore fairness.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/create"
            className="rounded-lg bg-violet-600 px-8 py-3 text-sm font-medium hover:bg-violet-500 transition-colors"
          >
            Upload resume → Watch parallels diverge
          </Link>
          <Link
            href="/create"
            className="rounded-lg border border-zinc-700 px-8 py-3 text-sm text-zinc-300 hover:border-zinc-500 transition-colors"
          >
            Try demo candidate
          </Link>
        </div>
        <p className="mt-16 font-mono text-xs text-zinc-600">
          Multi-agent hiring simulation · interpretable bias tracing · intervention replay
        </p>
      </div>
    </main>
  );
}
