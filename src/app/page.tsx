import Link from "next/link";
import SalesWorkspace from "@/components/SalesWorkspace";

export default function HomePage() {
  return (
    <main className="relative flex-1 overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[70vh] bg-[radial-gradient(ellipse_at_top,_rgba(159,212,90,0.22),_transparent_60%)]" />

      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-6 pt-8">
        <Link href="/" className="font-display text-2xl text-[var(--ink)]">
          ClosePath
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link
            href="/dashboard"
            className="text-[var(--muted)] transition hover:text-[var(--ink)]"
          >
            Manager dashboard
          </Link>
          <a
            href="#floor"
            className="rounded-full bg-[var(--ink)] px-4 py-2 text-[var(--paper)]"
          >
            Open sales floor
          </a>
        </nav>
      </header>

      <section className="relative z-10 mx-auto grid w-full max-w-6xl gap-10 px-6 pb-16 pt-16 lg:grid-cols-[1.15fr_0.85fr] lg:items-end lg:pt-24">
        <div>
          <p className="font-display text-5xl leading-[0.95] text-[var(--ink)] sm:text-6xl lg:text-7xl">
            ClosePath
          </p>
          <h1 className="mt-5 max-w-xl text-xl leading-snug text-[var(--ink)] sm:text-2xl">
            Multi-agent sales assistant that qualifies, pitches, closes, and
            writes CRM records for you.
          </h1>
          <p className="mt-4 max-w-lg text-[var(--muted)]">
            Staged B2B sales workflow with BANT scoring, objection handling,
            proposals, meeting booking, and a live manager dashboard.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="#floor"
              className="rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-[var(--ink)] transition hover:brightness-110"
            >
              Try the live agent
            </a>
            <Link
              href="/dashboard"
              className="rounded-full border border-[var(--line)] bg-[var(--panel)]/70 px-5 py-3 text-sm text-[var(--ink)] backdrop-blur"
            >
              View pipeline intel
            </Link>
          </div>
        </div>

        <div className="relative min-h-[280px] overflow-hidden rounded-[2rem] border border-[var(--line)] bg-[linear-gradient(145deg,#1a2a22_0%,#24352c_45%,#3d5a36_100%)] p-6 text-[var(--paper)] shadow-[0_40px_100px_-50px_rgba(20,32,28,0.8)]">
          <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-[var(--accent)]/30 blur-3xl" />
          <p className="text-xs uppercase tracking-[0.22em] text-[var(--accent)]">
            Agent graph
          </p>
          <ul className="relative mt-6 space-y-3 font-display text-2xl">
            {[
              "Discover pain",
              "Score BANT",
              "Pitch Atlas Cloud",
              "Handle objections",
              "Book + create deal",
            ].map((step, i) => (
              <li
                key={step}
                className="flex items-center gap-3 opacity-0 animate-[fadeUp_0.6s_ease_forwards]"
                style={{ animationDelay: `${0.15 * i}s` }}
              >
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[var(--accent)] text-xs font-sans font-bold text-[var(--ink)]">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="floor" className="relative z-10 mx-auto w-full max-w-6xl px-6 pb-24">
        <SalesWorkspace />
      </section>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </main>
  );
}
