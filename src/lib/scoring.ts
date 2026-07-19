import type { LeadProfile, LeadScore, SalesStage } from "./types";

export function emptyScore(): LeadScore {
  return {
    budget: 0,
    authority: 0,
    need: 0,
    timeline: 0,
    total: 0,
    tier: "cold",
  };
}

export function emptyProfile(): LeadProfile {
  return { painPoints: [] };
}

export function computeLeadScore(profile: LeadProfile): LeadScore {
  let budget = 0;
  let authority = 0;
  let need = 0;
  let timeline = 0;

  const b = (profile.budget || "").toLowerCase();
  if (b.includes("50") || b.includes("100") || b.includes("unlimited"))
    budget = 25;
  else if (b.includes("10") || b.includes("20") || b.includes("25"))
    budget = 20;
  else if (b.includes("5") || b.includes("8") || b.includes("budget"))
    budget = 14;
  else if (b) budget = 8;

  const role = (profile.role || "").toLowerCase();
  if (
    role.includes("cfo") ||
    role.includes("cto") ||
    role.includes("vp") ||
    role.includes("head") ||
    role.includes("founder") ||
    role.includes("director")
  ) {
    authority = 25;
  } else if (
    role.includes("manager") ||
    role.includes("lead") ||
    role.includes("finops")
  ) {
    authority = 16;
  } else if (role) {
    authority = 8;
  }
  if (profile.decisionMaker) authority = Math.min(25, authority + 5);

  need = Math.min(25, profile.painPoints.length * 8);
  const painBlob = profile.painPoints.join(" ").toLowerCase();
  if (
    painBlob.includes("cost") ||
    painBlob.includes("cloud") ||
    painBlob.includes("waste") ||
    painBlob.includes("bill")
  ) {
    need = Math.min(25, need + 6);
  }

  const t = (profile.timeline || "").toLowerCase();
  if (t.includes("week") || t.includes("asap") || t.includes("immediate"))
    timeline = 25;
  else if (t.includes("month") || t.includes("quarter") || t.includes("30"))
    timeline = 18;
  else if (t.includes("year") || t.includes("later")) timeline = 8;
  else if (t) timeline = 10;

  const total = budget + authority + need + timeline;
  let tier: LeadScore["tier"] = "cold";
  if (total >= 75) tier = "qualified";
  else if (total >= 55) tier = "hot";
  else if (total >= 30) tier = "warm";

  return { budget, authority, need, timeline, total, tier };
}

export function isDeclineIntent(userText: string): boolean {
  const text = userText.toLowerCase().trim();
  if (!text) return false;
  return (
    /\bnot interested\b/.test(text) ||
    /\bnot now\b/.test(text) ||
    /\bno thanks\b/.test(text) ||
    /\bno thank you\b/.test(text) ||
    /\bno interest\b/.test(text) ||
    /\bpass(?:\s+for now)?\b/.test(text) ||
    /\bdecline\b/.test(text) ||
    /\bunsubscribe\b/.test(text) ||
    /\bstop (?:messaging|contacting|emailing)\b/.test(text) ||
    text === "stop" ||
    text === "no"
  );
}

export function nextStage(
  current: SalesStage,
  profile: LeadProfile,
  score: LeadScore,
  userText: string
): SalesStage {
  const text = userText.toLowerCase();

  if (isDeclineIntent(userText)) {
    return "lost";
  }

  // Already closed outcomes stay put
  if (current === "won" || current === "lost") {
    return current;
  }

  const closeSignals =
    text.includes("yes") ||
    text.includes("book") ||
    text.includes("let's do") ||
    text.includes("lets do") ||
    text.includes("sounds good") ||
    text.includes("i'm in") ||
    text.includes("im in") ||
    text.includes("deal") ||
    text.includes("schedule") ||
    text.includes("kickoff");

  if (
    (current === "close" ||
      current === "objection" ||
      current === "pitch") &&
    closeSignals
  ) {
    return "won";
  }

  const objectionSignals =
    text.includes("expensive") ||
    text.includes("costly") ||
    text.includes("too much") ||
    text.includes("competitor") ||
    text.includes("already use") ||
    text.includes("not sure") ||
    text.includes("later") ||
    text.includes("concern") ||
    text.includes("worry") ||
    text.includes("security") ||
    text.includes("budget");

  if (
    (current === "pitch" || current === "close" || current === "objection") &&
    objectionSignals
  ) {
    return "objection";
  }

  switch (current) {
    case "greeting":
      return "discovery";
    case "discovery": {
      const hasBasics =
        Boolean(profile.company) &&
        Boolean(profile.role) &&
        profile.painPoints.length > 0;
      return hasBasics ? "qualification" : "discovery";
    }
    case "qualification":
      return score.total >= 40 ? "pitch" : "discovery";
    case "pitch":
      return objectionSignals ? "objection" : "close";
    case "objection":
      return "close";
    case "close":
      return "close";
    default:
      return current;
  }
}

/** Detect every objection category present in one message (pricing + security, etc.). */
export function categorizeObjections(text: string): string[] {
  const t = text.toLowerCase();
  const cats: string[] = [];

  if (
    t.includes("price") ||
    t.includes("expensive") ||
    t.includes("costly") ||
    t.includes("too much") ||
    /\bcost\b/.test(t)
  ) {
    cats.push("pricing");
  }
  if (t.includes("time") || t.includes("later") || t.includes("busy")) {
    cats.push("timing");
  }
  if (t.includes("security") || t.includes("compliance") || t.includes("risk")) {
    cats.push("security");
  }
  if (
    t.includes("competitor") ||
    t.includes("cubecost") ||
    t.includes("already use") ||
    t.includes("alternative") ||
    /\bvs\b/.test(t)
  ) {
    cats.push("competition");
  }

  if (cats.length === 0) cats.push("general concern");
  return cats;
}

export function categorizeObjection(text: string): string {
  return categorizeObjections(text)[0];
}
