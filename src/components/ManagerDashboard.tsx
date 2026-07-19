"use client";

import { useEffect, useState } from "react";
import type { AnalyticsSnapshot, CrmOp, SalesStage } from "@/lib/types";

type SessionRow = {
  id: string;
  stage: SalesStage;
  company?: string;
  name?: string;
  score: number;
  tier: string;
  updatedAt: string;
};

const STAGE_ORDER: SalesStage[] = [
  "greeting",
  "discovery",
  "qualification",
  "pitch",
  "objection",
  "close",
  "won",
  "lost",
];

function formatObjectionLabel(key: string) {
  if (key === "other" || key === "general concern") return "General concern";
  return key.replace(/\b\w/g, (c) => c.toUpperCase());
}

function ResetModal({
  open,
  busy,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#101916]/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[1.25rem] border border-[var(--line)] bg-[var(--panel)] p-6 shadow-2xl">
        <h3 className="font-display text-2xl text-[var(--ink)]">Reset demo CRM?</h3>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Clears sessions, deals, meetings, and the sync log. Useful before
          recording a clean demo.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-full border border-[var(--line)] px-4 py-2 text-sm text-[var(--ink)] disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="rounded-full bg-[var(--ink)] px-4 py-2 text-sm text-[var(--paper)] disabled:opacity-40"
          >
            {busy ? "Clearing..." : "Yes, reset"}
          </button>
        </div>
      </div>
    </div>
  );
}

function SyncConsole({ ops }: { ops: CrmOp[] }) {
  return (
    <section className="rounded-[1.25rem] border border-[var(--line)] bg-[#101916] p-6 text-[var(--paper)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl">Live CRM sync console</h2>
          <p className="mt-1 text-sm text-[#9aab9f]">
            Filesystem writes from agent tools (not fake UI-only state).
          </p>
        </div>
        <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-[var(--accent)]" />
      </div>
      <div className="mt-5 max-h-56 space-y-2 overflow-y-auto font-mono text-[11px] leading-relaxed text-[#c9d6cc]">
        {ops.length === 0 && (
          <p className="text-[#7a8a80]">No CRM ops yet - run the sales floor demo.</p>
        )}
        {ops.slice(0, 18).map((op) => (
          <p key={op.id}>
            <span className="text-[var(--accent)]">
              [{new Date(op.at).toLocaleTimeString()}] {op.action}
            </span>{" "}
            {op.detail}
          </p>
        ))}
      </div>
    </section>
  );
}

export default function ManagerDashboard() {
  const [analytics, setAnalytics] = useState<AnalyticsSnapshot | null>(null);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [clearing, setClearing] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);

  async function load() {
    const res = await fetch("/api/analytics");
    const data = await res.json();
    setAnalytics(data.analytics);
    setSessions(data.sessions || []);
  }

  async function clearData() {
    setClearing(true);
    try {
      const res = await fetch("/api/analytics", { method: "DELETE" });
      const data = await res.json();
      setAnalytics(data.analytics);
      setSessions([]);
      setResetOpen(false);
    } finally {
      setClearing(false);
    }
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 2500);
    return () => clearInterval(t);
  }, []);

  if (!analytics) {
    return (
      <p className="animate-pulse text-sm text-[var(--muted)]">
        Loading revenue intelligence...
      </p>
    );
  }

  const maxFunnel = Math.max(1, ...Object.values(analytics.stageFunnel));

  return (
    <div className="space-y-8">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setResetOpen(true)}
          className="rounded-full border border-[var(--line)] px-4 py-2 text-sm text-[var(--muted)] transition hover:bg-[var(--wash)] hover:text-[var(--ink)]"
        >
          Reset demo CRM data
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Sessions", analytics.totalSessions],
          ["Active leads", analytics.activeSessions],
          ["Avg BANT", analytics.avgScore],
          ["Pipeline $", `$${analytics.pipelineValue.toLocaleString()}`],
        ].map(([label, value]) => (
          <div
            key={label as string}
            className="rounded-[1.25rem] border border-[var(--line)] bg-[var(--panel)] p-5"
          >
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
              {label}
            </p>
            <p className="mt-2 font-display text-3xl text-[var(--ink)]">{value}</p>
          </div>
        ))}
      </div>

      <SyncConsole ops={analytics.ops || []} />

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-[1.25rem] border border-[var(--line)] bg-[var(--panel)] p-6">
          <h2 className="font-display text-2xl text-[var(--ink)]">Stage funnel</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Current stage per session (demo moves stages quickly).
          </p>
          <div className="mt-6 space-y-3">
            {STAGE_ORDER.map((stage) => {
              const count = analytics.stageFunnel[stage] || 0;
              return (
                <div key={stage}>
                  <div className="mb-1 flex justify-between text-xs uppercase tracking-wide text-[var(--muted)]">
                    <span>{stage}</span>
                    <span>{count}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-[var(--line)]">
                    <div
                      className="h-full rounded-full bg-[var(--accent)] transition-all duration-700"
                      style={{ width: `${(count / maxFunnel) * 100}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-[1.25rem] border border-[var(--line)] bg-[var(--panel)] p-6">
          <h2 className="font-display text-2xl text-[var(--ink)]">Objection heatmap</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Multi-category logging when objection agent fires.
          </p>
          <div className="mt-6 space-y-3">
            {Object.keys(analytics.objectionBreakdown).length === 0 && (
              <p className="text-sm text-[var(--muted)]">
                No objections yet - run demo step 4 (price + security).
              </p>
            )}
            {Object.entries(analytics.objectionBreakdown).map(([k, v]) => (
              <div
                key={k}
                className="flex items-center justify-between rounded-xl bg-[var(--wash)] px-4 py-3 text-sm"
              >
                <span className="text-[var(--ink)]">{formatObjectionLabel(k)}</span>
                <span className="font-mono text-[var(--accent-deep)]">{v}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="rounded-[1.25rem] border border-[var(--line)] bg-[var(--panel)] p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl text-[var(--ink)]">Deals & meetings</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Created by tool calls - not manual CRM entry.
            </p>
          </div>
          <p className="text-sm text-[var(--muted)]">
            Closed won: {analytics.closedWon}
          </p>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="text-xs uppercase tracking-wider text-[var(--muted)]">
              <tr>
                <th className="pb-3 font-medium">Company</th>
                <th className="pb-3 font-medium">Contact</th>
                <th className="pb-3 font-medium">Plan</th>
                <th className="pb-3 font-medium">ACV</th>
                <th className="pb-3 font-medium">Stage</th>
              </tr>
            </thead>
            <tbody>
              {analytics.deals.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-[var(--muted)]">
                    No deals yet. Close a demo lead to populate this table.
                  </td>
                </tr>
              )}
              {analytics.deals.map((d) => (
                <tr key={d.id} className="border-t border-[var(--line)]">
                  <td className="py-3 text-[var(--ink)]">{d.company}</td>
                  <td className="py-3">{d.contactName}</td>
                  <td className="py-3">{d.plan}</td>
                  <td className="py-3 font-mono">${d.value.toLocaleString()}</td>
                  <td className="py-3 capitalize">{d.stage.replace("_", " ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {analytics.meetings.length > 0 && (
          <ul className="mt-6 space-y-2 border-t border-[var(--line)] pt-6">
            {analytics.meetings.map((m) => (
              <li key={m.id} className="text-sm text-[var(--ink)]">
                <span className="text-[var(--accent-deep)]">Meeting</span> | {m.withName} @{" "}
                {m.company} - {m.slot}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-[1.25rem] border border-[var(--line)] bg-[var(--panel)] p-6">
        <h2 className="font-display text-2xl text-[var(--ink)]">Recent sessions</h2>
        <div className="mt-4 divide-y divide-[var(--line)]">
          {sessions.slice(0, 8).map((s) => (
            <div
              key={s.id}
              className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"
            >
              <div>
                <p className="text-[var(--ink)]">
                  {s.company || "Unknown co"} | {s.name || "Prospect"}
                </p>
                <p className="text-xs text-[var(--muted)]">{s.id.slice(0, 8)}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="rounded-full bg-[var(--wash)] px-2.5 py-1 text-xs capitalize">
                  {s.stage}
                </span>
                <span className="font-mono text-[var(--accent-deep)]">{s.score}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <ResetModal
        open={resetOpen}
        busy={clearing}
        onCancel={() => setResetOpen(false)}
        onConfirm={clearData}
      />
    </div>
  );
}
