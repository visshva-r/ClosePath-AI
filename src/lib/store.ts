import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import type {
  AnalyticsSnapshot,
  CrmOp,
  Deal,
  Meeting,
  SalesStage,
  SessionState,
} from "./types";

type MemoryStore = {
  sessions: Record<string, SessionState>;
  deals: Deal[];
  meetings: Meeting[];
  ops: CrmOp[];
};

/**
 * Primary store is process memory (globalThis) so warm serverless
 * invocations share state. Disk is best-effort only.
 * Client also rehydrates sessions across cold starts / other instances.
 */
function bag(): MemoryStore {
  const g = globalThis as typeof globalThis & {
    __closepathStore?: MemoryStore;
  };
  if (!g.__closepathStore) {
    g.__closepathStore = {
      sessions: {},
      deals: [],
      meetings: [],
      ops: [],
    };
    hydrateFromDisk(g.__closepathStore);
  }
  return g.__closepathStore;
}

function resolveDataDir(): string {
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return path.join("/tmp", "closepath-data");
  }
  return path.join(process.cwd(), ".data");
}

const DATA_DIR = resolveDataDir();
const SESSIONS_FILE = path.join(DATA_DIR, "sessions.json");
const DEALS_FILE = path.join(DATA_DIR, "deals.json");
const MEETINGS_FILE = path.join(DATA_DIR, "meetings.json");
const OPS_FILE = path.join(DATA_DIR, "ops.json");

function ensureDisk() {
  try {
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  } catch {
    // ignore on read-only FS
  }
}

function readDisk<T>(file: string, fallback: T): T {
  try {
    ensureDisk();
    if (!existsSync(file)) return fallback;
    return JSON.parse(readFileSync(file, "utf8")) as T;
  } catch {
    return fallback;
  }
}

function writeDisk(file: string, data: unknown) {
  try {
    ensureDisk();
    writeFileSync(file, JSON.stringify(data, null, 2));
  } catch {
    // best-effort only
  }
}

function hydrateFromDisk(store: MemoryStore) {
  const sessions = readDisk<Record<string, SessionState>>(SESSIONS_FILE, {});
  const deals = readDisk<Deal[]>(DEALS_FILE, []);
  const meetings = readDisk<Meeting[]>(MEETINGS_FILE, []);
  const ops = readDisk<CrmOp[]>(OPS_FILE, []);
  store.sessions = { ...sessions, ...store.sessions };
  if (store.deals.length === 0) store.deals = deals;
  if (store.meetings.length === 0) store.meetings = meetings;
  if (store.ops.length === 0) store.ops = ops;
}

function persistAll() {
  const store = bag();
  writeDisk(SESSIONS_FILE, store.sessions);
  writeDisk(DEALS_FILE, store.deals);
  writeDisk(MEETINGS_FILE, store.meetings);
  writeDisk(OPS_FILE, store.ops);
}

export function appendOp(action: string, detail: string) {
  const store = bag();
  store.ops.unshift({
    id: crypto.randomUUID(),
    at: new Date().toISOString(),
    action,
    detail,
  });
  store.ops = store.ops.slice(0, 40);
  persistAll();
}

export function listOps(): CrmOp[] {
  return [...bag().ops];
}

export function getSession(id: string): SessionState | null {
  return bag().sessions[id] ?? null;
}

export function saveSession(session: SessionState) {
  bag().sessions[session.id] = session;
  persistAll();
}

/** Restore a client-held session snapshot (needed on Vercel multi-instance). */
export function restoreSession(snapshot: SessionState): SessionState {
  if (!snapshot?.id) {
    throw new Error("Invalid session snapshot");
  }
  const normalized: SessionState = {
    ...snapshot,
    profile: snapshot.profile || { painPoints: [] },
    score: snapshot.score || {
      budget: 0,
      authority: 0,
      need: 0,
      timeline: 0,
      total: 0,
      tier: "cold",
    },
    objections: snapshot.objections || [],
    messages: snapshot.messages || [],
    reasoner: snapshot.reasoner || [],
  };
  saveSession(normalized);
  return normalized;
}

export function getOrRestoreSession(
  sessionId: string,
  snapshot?: SessionState | null
): SessionState | null {
  const existing = getSession(sessionId);
  if (existing) return existing;
  if (snapshot && snapshot.id === sessionId) {
    return restoreSession(snapshot);
  }
  return null;
}

export function listSessions(): SessionState[] {
  return Object.values(bag().sessions).sort(
    (a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt)
  );
}

export function listDeals(): Deal[] {
  return [...bag().deals];
}

export function saveDeal(deal: Deal) {
  const store = bag();
  store.deals = store.deals.filter((d) => d.id !== deal.id);
  store.deals.push(deal);
  persistAll();
  appendOp(
    "create_deal",
    `${deal.company} | ${deal.plan} | $${deal.value.toLocaleString()}/yr ACV`
  );
}

export function listMeetings(): Meeting[] {
  return [...bag().meetings];
}

export function saveMeeting(meeting: Meeting) {
  const store = bag();
  store.meetings = store.meetings.filter((m) => m.id !== meeting.id);
  store.meetings.push(meeting);
  persistAll();
  appendOp(
    "book_meeting",
    `${meeting.withName} @ ${meeting.company} → ${meeting.slot}`
  );
}

export function clearCrmData() {
  const store = bag();
  store.sessions = {};
  store.deals = [];
  store.meetings = [];
  store.ops = [];
  persistAll();
  appendOp("reset_crm", "Demo CRM wiped for clean recording");
}

const STAGES: SalesStage[] = [
  "greeting",
  "discovery",
  "qualification",
  "pitch",
  "objection",
  "close",
  "won",
  "lost",
];

export function getAnalytics(): AnalyticsSnapshot {
  const sessions = listSessions();
  const deals = listDeals();
  const meetings = listMeetings();
  const ops = listOps();

  const stageFunnel = Object.fromEntries(
    STAGES.map((s) => [s, 0])
  ) as Record<SalesStage, number>;

  for (const s of sessions) {
    stageFunnel[s.stage] += 1;
  }

  const objectionBreakdown: Record<string, number> = {};
  for (const s of sessions) {
    for (const o of s.objections) {
      objectionBreakdown[o.category] =
        (objectionBreakdown[o.category] || 0) + 1;
    }
  }

  const scored = sessions.filter((s) => s.score.total > 0);
  const avgScore =
    scored.length === 0
      ? 0
      : Math.round(
          scored.reduce((sum, s) => sum + s.score.total, 0) / scored.length
        );

  const closedWon = deals.filter((d) => d.stage === "closed_won").length;
  const pipelineValue = deals
    .filter((d) => d.stage !== "closed_lost")
    .reduce((sum, d) => sum + d.value, 0);

  return {
    totalSessions: sessions.length,
    activeSessions: sessions.filter(
      (s) => !["won", "lost"].includes(s.stage)
    ).length,
    avgScore,
    stageFunnel,
    objectionBreakdown,
    deals,
    meetings,
    closedWon,
    pipelineValue,
    ops,
  };
}
