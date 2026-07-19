import type { Metadata } from "next";
import Link from "next/link";
import ManagerDashboard from "@/components/ManagerDashboard";

export const metadata: Metadata = {
  title: "Manager Dashboard | ClosePath AI",
  description:
    "Live sales funnel, objection heatmap, meetings, and closed-won deals created by ClosePath agent tools.",
};

export default function DashboardPage() {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
      <header className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href="/" className="font-display text-2xl text-[var(--ink)]">
            ClosePath
          </Link>
          <h1 className="mt-3 font-display text-4xl text-[var(--ink)] sm:text-5xl">
            Manager dashboard
          </h1>
          <p className="mt-2 max-w-xl text-[var(--muted)]">
            Live funnel, objection heatmap, meetings, and deals created by agent
            tool calls. Shows the sales motion beyond chat alone.
          </p>
        </div>
        <Link
          href="/#floor"
          className="rounded-full bg-[var(--ink)] px-4 py-2 text-sm text-[var(--paper)]"
        >
          Back to sales floor
        </Link>
      </header>
      <ManagerDashboard />
    </main>
  );
}
