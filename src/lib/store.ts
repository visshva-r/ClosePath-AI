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

const DATA_DIR = path.join(process.cwd(), ".data");
const SESSIONS_FILE = path.join(DATA_DIR, "sessions.json");
const DEALS_FILE = path.join(DATA_DIR, "deals.json");
const MEETINGS_FILE = path.join(DATA_DIR, "meetings.json");
const OPS_FILE = path.join(DATA_DIR, "ops.json");

function ensureStore() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  if (!existsSync(SESSIONS_FILE)) writeFileSync(SESSIONS_FILE, "{}");
  if (!existsSync(DEALS_FILE)) writeFileSync(DEALS_FILE, "[]");
  if (!existsSync(MEETINGS_FILE)) writeFileSync(MEETINGS_FILE, "[]");
  if (!existsSync(OPS_FILE)) writeFileSync(OPS_FILE, "[]");
}

function readJson<T>(file: string, fallback: T): T {
  ensureStore();
  try {
    return JSON.parse(readFileSync(file, "utf8")) as T;
  } catch {
    return fallback;
  }
}

function writeJson(file: string, data: unknown) {
  ensureStore();
  writeFileSync(file, JSON.stringify(data, null, 2));
}

export function appendOp(action: string, detail: string) {
  const ops = readJson<CrmOp[]>(OPS_FILE, []);
  ops.unshift({
    id: crypto.randomUUID(),
    at: new Date().toISOString(),
    action,
    detail,
  });
  writeJson(OPS_FILE, ops.slice(0, 40));
}

export function listOps(): CrmOp[] {
  return readJson<CrmOp[]>(OPS_FILE, []);
}

export function getSession(id: string): SessionState | null {
  const all = readJson<Record<string, SessionState>>(SESSIONS_FILE, {});
  return all[id] ?? null;
}

export function saveSession(session: SessionState) {
  const all = readJson<Record<string, SessionState>>(SESSIONS_FILE, {});
  all[session.id] = session;
  writeJson(SESSIONS_FILE, all);
}

export function listSessions(): SessionState[] {
  const all = readJson<Record<string, SessionState>>(SESSIONS_FILE, {});
  return Object.values(all).sort(
    (a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt)
  );
}

export function listDeals(): Deal[] {
  return readJson<Deal[]>(DEALS_FILE, []);
}

export function saveDeal(deal: Deal) {
  const deals = listDeals().filter((d) => d.id !== deal.id);
  deals.push(deal);
  writeJson(DEALS_FILE, deals);
  appendOp(
    "create_deal",
    `${deal.company} | ${deal.plan} | $${deal.value.toLocaleString()}/yr ACV`
  );
}

export function listMeetings(): Meeting[] {
  return readJson<Meeting[]>(MEETINGS_FILE, []);
}

export function saveMeeting(meeting: Meeting) {
  const meetings = listMeetings().filter((m) => m.id !== meeting.id);
  meetings.push(meeting);
  writeJson(MEETINGS_FILE, meetings);
  appendOp(
    "book_meeting",
    `${meeting.withName} @ ${meeting.company} → ${meeting.slot}`
  );
}

export function clearCrmData() {
  writeJson(SESSIONS_FILE, {});
  writeJson(DEALS_FILE, []);
  writeJson(MEETINGS_FILE, []);
  writeJson(OPS_FILE, []);
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
