"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import type {
  ChatMessage,
  LeadScore,
  ReasonerStep,
  SalesStage,
  SessionState,
} from "@/lib/types";
import { PLANS } from "@/lib/product";

const STAGE_LABEL: Record<SalesStage, string> = {
  greeting: "Greeting",
  discovery: "Discovery",
  qualification: "Qualify",
  pitch: "Pitch",
  objection: "Objection",
  close: "Close",
  won: "Won",
  lost: "Lost",
};

const PAIN_LABELS: Record<string, string> = {
  aws: "AWS",
  gcp: "GCP",
  azure: "Azure",
  waste: "Cloud waste",
  idle: "Idle resources",
  finops: "FinOps",
  spend: "Cloud spend",
  "cloud bill": "Cloud bill",
  "cloud cost": "Cloud cost",
  overprovision: "Overprovisioning",
  invoice: "Invoice spike",
  savings: "Savings goal",
  reserved: "Reserved capacity",
};

function formatPain(p: string) {
  return (
    PAIN_LABELS[p.toLowerCase()] ||
    p.replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

function renderBoldText(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    const bold = part.match(/^\*\*([^*]+)\*\*$/);
    if (bold) {
      return (
        <strong key={i} className="font-semibold">
          {bold[1]}
        </strong>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

function ScoreBar({ score }: { score: LeadScore }) {
  const rows = [
    { label: "Budget", value: score.budget },
    { label: "Authority", value: score.authority },
    { label: "Need", value: score.need },
    { label: "Timeline", value: score.timeline },
  ];
  return (
    <div className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
            BANT score
          </p>
          <p className="font-display text-3xl text-[var(--ink)]">
            {score.total}
            <span className="text-base text-[var(--muted)]">/100</span>
          </p>
        </div>
        <span className="rounded-full border border-[var(--line)] bg-[var(--panel)] px-3 py-1 text-xs uppercase tracking-wider text-[var(--accent)]">
          {score.tier}
        </span>
      </div>
      {rows.map((r) => (
        <div key={r.label}>
          <div className="mb-1 flex justify-between text-xs text-[var(--muted)]">
            <span>{r.label}</span>
            <span>{r.value}/25</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-[var(--line)]">
            <div
              className="h-full rounded-full bg-[var(--accent)] transition-all duration-500"
              style={{ width: `${(r.value / 25) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[min(100%,42rem)] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? "bg-[var(--ink)] text-[var(--paper)]"
            : "border border-[var(--line)] bg-[var(--panel)] text-[var(--ink)]"
        }`}
      >
        {renderBoldText(msg.content)}
        {msg.meta?.toolsUsed && msg.meta.toolsUsed.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {msg.meta.toolsUsed.map((t) => (
              <span
                key={t}
                className="rounded-md bg-[var(--wash)] px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-[var(--accent-deep)]"
              >
                {t}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ReasonerTerminal({ steps }: { steps: ReasonerStep[] }) {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [steps.length]);

  return (
    <div className="rounded-[1.25rem] border border-[var(--line)] bg-[#101916] p-4 text-[var(--paper)] shadow-inner">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--accent)]">
          Live agent reasoner
        </p>
        <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--accent)]" />
      </div>
      <div className="max-h-44 space-y-1.5 overflow-y-auto font-mono text-[11px] leading-relaxed text-[#c9d6cc]">
        {steps.length === 0 && (
          <p className="text-[#7a8a80]">Waiting for prospect signal...</p>
        )}
        {steps.slice(-12).map((s, i) => (
          <p key={`${s.t}-${i}`}>
            <span className="text-[var(--accent)]">[{s.kind}]</span> {s.text}
          </p>
        ))}
        <div ref={endRef} />
      </div>
    </div>
  );
}

function RoiCalculator() {
  const [spend, setSpend] = useState(42000);
  const [engineers, setEngineers] = useState(220);
  const wasteRate = engineers > 300 ? 0.34 : engineers > 100 ? 0.3 : 0.26;
  const waste = Math.round(spend * wasteRate);
  const plan =
    spend > 80000 ? PLANS[2] : spend > 25000 ? PLANS[1] : PLANS[0];
  const net = waste - plan.priceMonthly;
  const roi = Math.round((net / plan.priceMonthly) * 100);

  return (
    <div className="rounded-[1.25rem] border border-[var(--line)] bg-[var(--panel)] p-5">
      <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
        Cloud savings ROI
      </p>
      <p className="mt-1 font-display text-xl text-[var(--ink)]">Play the math</p>

      <label className="mt-4 block text-xs text-[var(--muted)]">
        Monthly cloud spend | ${spend.toLocaleString()}
        <input
          type="range"
          min={5000}
          max={150000}
          step={1000}
          value={spend}
          onChange={(e) => setSpend(Number(e.target.value))}
          className="mt-2 w-full accent-[var(--accent-deep)]"
        />
      </label>
      <label className="mt-3 block text-xs text-[var(--muted)]">
        Engineers | {engineers}
        <input
          type="range"
          min={20}
          max={800}
          step={10}
          value={engineers}
          onChange={(e) => setEngineers(Number(e.target.value))}
          className="mt-2 w-full accent-[var(--accent-deep)]"
        />
      </label>

      <dl className="mt-4 space-y-2 text-sm">
        <div className="flex justify-between gap-2">
          <dt className="text-[var(--muted)]">Est. monthly waste</dt>
          <dd className="font-mono text-[var(--ink)]">${waste.toLocaleString()}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-[var(--muted)]">Atlas {plan.name}</dt>
          <dd className="font-mono text-[var(--ink)]">
            ${plan.priceMonthly.toLocaleString()}/mo
          </dd>
        </div>
        <div className="flex justify-between gap-2 border-t border-[var(--line)] pt-2">
          <dt className="text-[var(--muted)]">Net ROI / mo</dt>
          <dd className="font-mono font-semibold text-[var(--accent-deep)]">
            +${Math.max(0, net).toLocaleString()} ({Math.max(0, roi)}%)
          </dd>
        </div>
      </dl>
    </div>
  );
}

function ProposalModal({
  open,
  onClose,
  proposal,
}: {
  open: boolean;
  onClose: () => void;
  proposal: NonNullable<SessionState["proposal"]>;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#101916]/55 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[1.5rem] border border-[var(--line)] bg-[var(--panel)] shadow-2xl">
        <div className="border-b border-[var(--line)] bg-[linear-gradient(135deg,#1a2a22,#3d5a36)] px-6 py-5 text-[var(--paper)]">
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--accent)]">
            Atlas Cloud | Pilot proposal
          </p>
          <h3 className="mt-2 font-display text-3xl">One-pager ready</h3>
        </div>
        <div className="space-y-4 px-6 py-5 text-sm text-[var(--ink)]">
          <p>
            Prepared for <strong>{proposal.contact}</strong> at{" "}
            <strong>{proposal.company}</strong>
          </p>
          <div className="rounded-xl bg-[var(--wash)] p-4">
            <p className="text-xs uppercase tracking-wider text-[var(--muted)]">
              Recommended plan
            </p>
            <p className="mt-1 font-display text-2xl">{proposal.plan}</p>
            <p className="mt-2 font-mono text-[var(--accent-deep)]">
              ${proposal.monthly.toLocaleString()}/mo | $
              {proposal.acv.toLocaleString()}/yr ACV
            </p>
          </div>
          <ul className="list-disc space-y-1 pl-5 text-[var(--muted)]">
            <li>14-day read-only pilot with waste baseline</li>
            <li>Kickoff: {proposal.slot}</li>
            <li>SOC2 Type II | Slack + Jira hooks included</li>
          </ul>
          <div className="rounded-xl border border-dashed border-[var(--line)] p-4 text-center">
            <p className="text-xs uppercase tracking-wider text-[var(--muted)]">
              e-signature
            </p>
            <p className="mt-2 font-display text-xl italic text-[var(--ink)]">
              {proposal.contact}
            </p>
            <p className="mt-1 text-xs text-[var(--muted)]">Signed via ClosePath close</p>
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-[var(--line)] px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-[var(--ink)] px-4 py-2 text-sm text-[var(--paper)]"
          >
            Continue to dashboard
          </button>
        </div>
      </div>
    </div>
  );
}

const DEMO_SCRIPT = [
  "Hey, I'm Priya - FinOps lead at PayStack Labs, ~220 engineers.",
  "Our AWS bill jumped 40% and we have idle GPU waste we can't track.",
  "Budget is around $8k/month, want to start a pilot this month. I own the decision.",
  "Looks interesting but feels expensive vs Cubecost - and security is a concern.",
  "Okay, book it.",
];

export default function SalesWorkspace() {
  const [session, setSession] = useState<SessionState | null>(null);
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const [showToolsPulse, setShowToolsPulse] = useState(false);
  const [demoStep, setDemoStep] = useState(0);
  const [showProposal, setShowProposal] = useState(false);
  const [llmReady, setLlmReady] = useState(false);
  const [polishing, setPolishing] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const pulseStartedAt = useRef(0);
  const celebrated = useRef<string | null>(null);

  async function startSession() {
    setError("");
    setShowProposal(false);
    celebrated.current = null;
    const res = await fetch("/api/session", { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed to start session");
      return;
    }
    setSession(data.session);
    setDemoStep(0);
  }

  useEffect(() => {
    startSession();
    void fetch("/api/polish")
      .then((r) => r.json())
      .then((d) => setLlmReady(Boolean(d.configured)))
      .catch(() => setLlmReady(false));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [session?.messages.length, showToolsPulse]);

  useEffect(() => {
    if (pending) {
      pulseStartedAt.current = Date.now();
      setShowToolsPulse(true);
      return;
    }
    const elapsed = Date.now() - pulseStartedAt.current;
    const remaining = Math.max(0, 350 - elapsed);
    const t = setTimeout(() => setShowToolsPulse(false), remaining);
    return () => clearTimeout(t);
  }, [pending]);

  useEffect(() => {
    if (!session || session.stage !== "won" || !session.proposal) return;
    if (celebrated.current === session.id) return;
    celebrated.current = session.id;
    setShowProposal(true);
    void import("canvas-confetti").then((mod) => {
      const confetti = mod.default;
      confetti({
        particleCount: 110,
        spread: 70,
        origin: { y: 0.65 },
        colors: ["#8fce4a", "#1f5c32", "#f5f8f4", "#101916"],
      });
    });
  }, [session]);

  function send(text: string) {
    if (!session || !text.trim() || pending) return;
    setError("");
    const optimistic = text.trim();
    setInput("");
    startTransition(async () => {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: session.id, message: optimistic }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Chat failed");
        return;
      }
      setSession(data.session);
    });
  }

  function runDemoStep() {
    if (demoStep >= DEMO_SCRIPT.length) return;
    const line = DEMO_SCRIPT[demoStep];
    setDemoStep((s) => s + 1);
    send(line);
  }

  async function polishWithGemini() {
    if (!session || polishing || pending) return;
    setPolishing(true);
    setError("");
    try {
      const res = await fetch("/api/polish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: session.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Gemini polish failed");
        return;
      }
      setSession(data.session);
    } finally {
      setPolishing(false);
    }
  }

  const demoDone = demoStep >= DEMO_SCRIPT.length;

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <section className="flex min-h-[70vh] flex-col overflow-hidden rounded-[1.5rem] border border-[var(--line)] bg-[var(--panel)]/80 shadow-[0_30px_80px_-48px_rgba(15,23,22,0.55)] backdrop-blur">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] px-5 py-4">
            <div>
              <p className="font-display text-xl text-[var(--ink)]">Live sales floor</p>
              <p className="text-sm text-[var(--muted)]">
                Multi-agent path | Discovery → Qualify → Pitch → Close
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={runDemoStep}
                disabled={!session || pending || demoDone}
                title={
                  demoDone
                    ? "Click New lead to start over"
                    : "Send the next scripted prospect message"
                }
                className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--ink)] transition hover:brightness-110 disabled:opacity-40"
              >
                {demoDone ? "Demo complete" : "Play demo step"}
              </button>
              <button
                type="button"
                onClick={polishWithGemini}
                disabled={!session || !llmReady || polishing || pending}
                title={
                  llmReady
                    ? "Rewrite the last reply with Gemini (uses API only on click)"
                    : "Add GEMINI_API_KEY in .env.local to enable"
                }
                className="rounded-full border border-[var(--line)] bg-[var(--wash)] px-4 py-2 text-sm text-[var(--ink)] transition hover:brightness-105 disabled:opacity-40"
              >
                {polishing ? "Polishing..." : "Enhance with Gemini"}
              </button>
              <button
                type="button"
                onClick={startSession}
                className="rounded-full border border-[var(--line)] px-4 py-2 text-sm text-[var(--ink)] transition hover:bg-[var(--wash)]"
              >
                New lead
              </button>
            </div>
          </header>

          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
            {session?.messages.map((m) => (
              <MessageBubble key={m.id} msg={m} />
            ))}
            {showToolsPulse && (
              <p className="animate-pulse text-sm text-[var(--muted)]">
                ClosePath is running tools...
              </p>
            )}
            <div ref={bottomRef} />
          </div>

          <form
            className="border-t border-[var(--line)] p-4"
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
          >
            {error && <p className="mb-2 text-sm text-red-700">{error}</p>}
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Reply as the prospect..."
                className="flex-1 rounded-full border border-[var(--line)] bg-[var(--paper)] px-4 py-3 text-sm text-[var(--ink)] outline-none ring-[var(--accent)] placeholder:text-[var(--muted)] focus:ring-2"
              />
              <button
                type="submit"
                disabled={pending || !input.trim()}
                className="rounded-full bg-[var(--ink)] px-5 py-3 text-sm font-medium text-[var(--paper)] disabled:opacity-40"
              >
                Send
              </button>
            </div>
          </form>
        </section>

        <aside className="space-y-4">
          <div className="rounded-[1.25rem] border border-[var(--line)] bg-[var(--panel)] p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
              Pipeline stage
            </p>
            <p className="mt-2 font-display text-2xl text-[var(--ink)]">
              {session ? STAGE_LABEL[session.stage] : "-"}
            </p>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {(
                [
                  "greeting",
                  "discovery",
                  "qualification",
                  "pitch",
                  "objection",
                  "close",
                  "won",
                  "lost",
                ] as SalesStage[]
              ).map((s) => (
                <span
                  key={s}
                  className={`h-2 w-2 rounded-full ${
                    session?.stage === s
                      ? s === "lost"
                        ? "bg-red-500"
                        : "bg-[var(--accent)]"
                      : "bg-[var(--line)]"
                  }`}
                  title={STAGE_LABEL[s]}
                />
              ))}
            </div>
          </div>

          <ReasonerTerminal steps={session?.reasoner || []} />

          <div className="rounded-[1.25rem] border border-[var(--line)] bg-[var(--panel)] p-5">
            {session ? (
              <ScoreBar score={session.score} />
            ) : (
              <p className="text-sm text-[var(--muted)]">Starting session...</p>
            )}
          </div>

          <RoiCalculator />

          <div className="rounded-[1.25rem] border border-[var(--line)] bg-[var(--panel)] p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
              Lead profile
            </p>
            <dl className="mt-3 space-y-2 text-sm">
              {[
                ["Name", session?.profile.name],
                ["Company", session?.profile.company],
                ["Role", session?.profile.role],
                ["Size", session?.profile.companySize],
                ["Budget", session?.profile.budget],
                ["Timeline", session?.profile.timeline],
              ].map(([k, v]) => (
                <div key={k as string} className="flex justify-between gap-3">
                  <dt className="text-[var(--muted)]">{k}</dt>
                  <dd className="text-right text-[var(--ink)]">{v || "-"}</dd>
                </div>
              ))}
            </dl>
            {session && session.profile.painPoints.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {session.profile.painPoints.map((p) => (
                  <span
                    key={p}
                    className="rounded-md bg-[var(--wash)] px-2 py-1 text-xs text-[var(--accent-deep)]"
                  >
                    {formatPain(p)}
                  </span>
                ))}
              </div>
            )}
            {session?.proposal && (
              <button
                type="button"
                onClick={() => setShowProposal(true)}
                className="mt-4 w-full rounded-full border border-[var(--line)] px-3 py-2 text-xs font-medium text-[var(--ink)] hover:bg-[var(--wash)]"
              >
                Reopen proposal one-pager
              </button>
            )}
          </div>
        </aside>
      </div>

      {session?.proposal && (
        <ProposalModal
          open={showProposal}
          onClose={() => setShowProposal(false)}
          proposal={session.proposal}
        />
      )}
    </>
  );
}
