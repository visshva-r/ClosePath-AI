export type SalesStage =
  | "greeting"
  | "discovery"
  | "qualification"
  | "pitch"
  | "objection"
  | "close"
  | "won"
  | "lost";

export type LeadProfile = {
  name?: string;
  company?: string;
  role?: string;
  companySize?: string;
  budget?: string;
  timeline?: string;
  painPoints: string[];
  currentTools?: string;
  decisionMaker?: boolean;
};

export type LeadScore = {
  budget: number;
  authority: number;
  need: number;
  timeline: number;
  total: number;
  tier: "cold" | "warm" | "hot" | "qualified";
};

export type ObjectionLog = {
  id: string;
  text: string;
  category: string;
  handled: boolean;
  at: string;
};

export type Deal = {
  id: string;
  sessionId: string;
  company: string;
  contactName: string;
  value: number;
  plan: string;
  stage: "proposal" | "negotiation" | "closed_won" | "closed_lost";
  createdAt: string;
};

export type Meeting = {
  id: string;
  sessionId: string;
  withName: string;
  company: string;
  slot: string;
  agenda: string;
  createdAt: string;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  at: string;
  meta?: {
    stage?: SalesStage;
    toolsUsed?: string[];
    score?: LeadScore;
    reasoner?: ReasonerStep[];
  };
};

export type ReasonerStep = {
  t: string;
  kind: "route" | "extract" | "tool" | "crm" | "decision";
  text: string;
};

export type CrmOp = {
  id: string;
  at: string;
  action: string;
  detail: string;
};

export type SessionState = {
  id: string;
  stage: SalesStage;
  profile: LeadProfile;
  score: LeadScore;
  objections: ObjectionLog[];
  messages: ChatMessage[];
  reasoner: ReasonerStep[];
  proposal?: {
    plan: string;
    acv: number;
    monthly: number;
    company: string;
    contact: string;
    slot: string;
  };
  dealId?: string;
  meetingId?: string;
  createdAt: string;
  updatedAt: string;
};

export type AnalyticsSnapshot = {
  totalSessions: number;
  activeSessions: number;
  avgScore: number;
  stageFunnel: Record<SalesStage, number>;
  objectionBreakdown: Record<string, number>;
  deals: Deal[];
  meetings: Meeting[];
  closedWon: number;
  pipelineValue: number;
  ops: CrmOp[];
};
