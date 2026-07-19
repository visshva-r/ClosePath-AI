import { PRODUCT, recommendPlan, searchProductKnowledge } from "./product";
import {
  categorizeObjections,
  computeLeadScore,
  emptyProfile,
  emptyScore,
  isDeclineIntent,
  nextStage,
} from "./scoring";
import {
  appendOp,
  getSession,
  saveDeal,
  saveMeeting,
  saveSession,
} from "./store";
import type {
  ChatMessage,
  LeadProfile,
  ObjectionLog,
  ReasonerStep,
  SalesStage,
  SessionState,
} from "./types";

function id() {
  return crypto.randomUUID();
}

function now() {
  return new Date().toISOString();
}

export function createSession(): SessionState {
  const session: SessionState = {
    id: id(),
    stage: "greeting",
    profile: emptyProfile(),
    score: emptyScore(),
    objections: [],
    reasoner: [
      {
        t: now(),
        kind: "route",
        text: "Session opened → Greeting agent online",
      },
    ],
    messages: [
      {
        id: id(),
        role: "assistant",
        content: `Hey - I'm **ClosePath**, the AI sales partner for **${PRODUCT.name}**.\n\nI help mid-market teams find cloud waste and turn it into measurable savings (usually 25-40%).\n\nQuick one: what company are you with, and what's your role?`,
        at: now(),
        meta: { stage: "greeting", toolsUsed: [] },
      },
    ],
    createdAt: now(),
    updatedAt: now(),
  };
  saveSession(session);
  appendOp("open_session", `New lead session ${session.id.slice(0, 8)}`);
  return session;
}

function nextBusinessSlot(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  while (d.getDay() === 0 || d.getDay() === 6) {
    d.setDate(d.getDate() + 1);
  }
  const date = d.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return `${date}, 11:00 AM IST (30 min pilot kickoff)`;
}

function extractProfile(prev: LeadProfile, text: string): LeadProfile {
  // Never mine entities from decline / opt-out messages
  if (isDeclineIntent(text)) return prev;

  const profile: LeadProfile = {
    ...prev,
    painPoints: [...prev.painPoints],
  };
  const t = text.trim();

  // Name patterns: "I'm Alex", "I am Priya", "this is Sam"
  // Reject phrases like "I'm not interested"
  const nameMatch = t.match(
    /(?:i'?m|i am|this is|my name is)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i
  );
  if (nameMatch) {
    const candidate = nameMatch[1].trim();
    const blocked =
      /^(not|no|yes|interested|interested yet|sure|good|fine|okay|ok)\b/i.test(
        candidate
      ) || isDeclineIntent(candidate);
    if (!blocked && candidate.length >= 2) {
      profile.name = candidate;
    }
  }

  // Company: "at Stripe", "from Razorpay", "company is Acme"
  const companyMatch = t.match(
    /(?:at|from|with|company(?:\s+is)?|work(?:ing)?\s+(?:at|for))\s+([A-Z][A-Za-z0-9&.\- ]{1,40})/
  );
  if (companyMatch) {
    profile.company = companyMatch[1]
      .replace(/[.,].*$/, "")
      .replace(/\s+~.*$/, "")
      .trim();
  }

  // Role - stop before "at/from/with Company"
  const roleMatch = t.match(
    /\b((?:cfo|cto|ceo|vp|head|director|manager|lead|founder|finops|engineer|platform)(?:\s+(?!at\b|from\b|with\b)[\w/-]+){0,3})/i
  );
  if (roleMatch) {
    profile.role = roleMatch[1]
      .replace(/\s+(?:at|from|with)\s+.*$/i, "")
      .trim();
  }

  // Company size
  const sizeMatch = t.match(
    /(\d{2,5})\s*(?:people|employees|engineers|devs|seats)/i
  );
  if (sizeMatch) profile.companySize = `${sizeMatch[1]} employees`;
  if (/series\s*[abc]/i.test(t) || /startup/i.test(t)) {
    profile.companySize = profile.companySize || "startup / growth stage";
  }

  // Budget
  const budgetMatch = t.match(
    /\$?\s*(\d+(?:\.\d+)?)\s*(k|m)?\s*(?:\/|\s)?(?:mo|month|year|annual|budget)?/i
  );
  if (/budget|spend|afford|allocate/i.test(t) && budgetMatch) {
    profile.budget = budgetMatch[0];
  } else if (/no budget|tight budget/i.test(t)) {
    profile.budget = "tight / exploring";
  } else if (/flexible budget|have budget/i.test(t)) {
    profile.budget = profile.budget || "flexible";
  }

  // Timeline (specific before loose)
  if (/this week|asap|immediately|urgent/i.test(t))
    profile.timeline = "this week / ASAP";
  else if (/this month|pilot this month|start .{0,20}this month/i.test(t))
    profile.timeline = "this month";
  else if (/next month|30 days|this quarter|q[1-4]/i.test(t))
    profile.timeline = "this quarter";
  else if (/next year|someday|later/i.test(t))
    profile.timeline = "later / exploratory";
  else if (
    /month|quarter|weeks?/i.test(t) &&
    /start|buy|pilot|implement/i.test(t)
  )
    profile.timeline = profile.timeline || "within a few months";

  // Decision maker
  if (/decision maker|i decide|i own|final say|i approve/i.test(t))
    profile.decisionMaker = true;
  if (/need approval|boss|committee/i.test(t)) profile.decisionMaker = false;

  // Pain points
  const painHints = [
    "cloud bill",
    "cloud cost",
    "aws",
    "gcp",
    "azure",
    "waste",
    "overprovision",
    "finops",
    "spend",
    "invoice",
    "savings",
    "idle",
    "reserved",
  ];
  for (const hint of painHints) {
    if (t.toLowerCase().includes(hint) && !profile.painPoints.includes(hint)) {
      profile.painPoints.push(hint);
    }
  }
  if (/pain|problem|struggle|challenge|issue/i.test(t) && t.length < 220) {
    const cleaned = t
      .replace(/^.*?(?:pain|problem|struggle|challenge|issue)[:\s-]*/i, "")
      .slice(0, 120);
    if (cleaned && !profile.painPoints.includes(cleaned)) {
      profile.painPoints.push(cleaned);
    }
  }

  // Current tools
  if (
    /datadog|cloudhealth|cubecost|spot\.io|nops|aws native|cost explorer/i.test(
      t
    )
  ) {
    const tool = t.match(
      /datadog|cloudhealth|cubecost|spot\.io|nops|cost explorer/i
    );
    if (tool) profile.currentTools = tool[0];
  }

  return profile;
}

type ToolResult = {
  name: string;
  result: string;
};

function runTools(
  session: SessionState,
  userText: string,
  stage: SalesStage
): ToolResult[] {
  const used: ToolResult[] = [];

  // Always refresh score when profile changed
  const score = computeLeadScore(session.profile);
  session.score = score;
  used.push({
    name: "score_lead",
    result: `BANT ${score.total}/100 (${score.tier}) - B${score.budget} A${score.authority} N${score.need} T${score.timeline}`,
  });

  used.push({
    name: "update_lead_profile",
    result: JSON.stringify({
      name: session.profile.name,
      company: session.profile.company,
      role: session.profile.role,
      size: session.profile.companySize,
      budget: session.profile.budget,
      timeline: session.profile.timeline,
      pains: session.profile.painPoints,
    }),
  });

  if (stage === "pitch" || stage === "objection" || stage === "close") {
    const knowledge = searchProductKnowledge(userText || "roi pricing plans");
    used.push({ name: "search_product_knowledge", result: knowledge });

    const plan = recommendPlan(session.profile);
    used.push({
      name: "generate_proposal",
      result: `${plan.name} @ $${plan.priceMonthly}/mo - ${plan.bestFor}. ${plan.highlights.join("; ")}`,
    });
  }

  if (stage === "objection") {
    const categories = categorizeObjections(userText);
    for (const category of categories) {
      const objection: ObjectionLog = {
        id: id(),
        text: userText,
        category,
        handled: true,
        at: now(),
      };
      session.objections.push(objection);
    }
    used.push({
      name: "log_objection",
      result: `${categories.join(" + ")}: "${userText.slice(0, 80)}"`,
    });
  }

  // Meeting + deal only on won (avoids orphaned meetings without deals)
  if (stage === "won") {
    const meeting = {
      id: id(),
      sessionId: session.id,
      withName: session.profile.name || "Prospect",
      company: session.profile.company || "Unknown",
      slot: nextBusinessSlot(),
      agenda: `Atlas Cloud pilot scoping for ${session.profile.company || "your team"}`,
      createdAt: now(),
    };
    saveMeeting(meeting);
    session.meetingId = meeting.id;
    used.push({
      name: "book_meeting",
      result: `${meeting.slot} - ${meeting.agenda}`,
    });

    const plan = recommendPlan(session.profile);
    const deal = {
      id: id(),
      sessionId: session.id,
      company: session.profile.company || "Unknown",
      contactName: session.profile.name || "Prospect",
      value: plan.priceMonthly * 12,
      plan: plan.name,
      stage: "closed_won" as const,
      createdAt: now(),
    };
    saveDeal(deal);
    session.dealId = deal.id;
    session.proposal = {
      plan: plan.name,
      acv: deal.value,
      monthly: plan.priceMonthly,
      company: deal.company,
      contact: deal.contactName,
      slot: meeting.slot,
    };
    used.push({
      name: "create_deal",
      result: `${deal.plan} - $${deal.value}/yr ACV for ${deal.company}`,
    });
  }

  return used;
}

function craftReply(
  session: SessionState,
  stage: SalesStage,
  userText: string,
  tools: ToolResult[]
): string {
  const { profile, score } = session;
  const name = profile.name ? ` ${profile.name}` : "";
  const company = profile.company || "your team";
  const proposal = tools.find((t) => t.name === "generate_proposal")?.result;
  const knowledge = tools.find((t) => t.name === "search_product_knowledge")?.result;
  const meeting = tools.find((t) => t.name === "book_meeting")?.result;
  const deal = tools.find((t) => t.name === "create_deal")?.result;

  switch (stage) {
    case "discovery": {
      const missing: string[] = [];
      if (!profile.company) missing.push("company");
      if (!profile.role) missing.push("role");
      if (profile.painPoints.length === 0) missing.push("main cloud-cost pain");
      if (!profile.companySize) missing.push("team size");

      if (missing.length >= 3) {
        return `Thanks${name} - got it.\n\nTo tailor this properly: what's the biggest cloud-cost headache right now (AWS/GCP waste, surprise bills, no FinOps owner), and roughly how big is the engineering org?`;
      }
      if (!profile.painPoints.length) {
        return `Appreciate that${name}.\n\nFor ${company}, what hurts most today - idle resources, reserved-instance misfit, multi-cloud blind spots, or CFO pressure on unit economics?`;
      }
      if (!profile.budget && !profile.timeline) {
        return `That pain is exactly where Atlas wins.\n\nTwo quick qualifiers: any budget band in mind for a FinOps tool this quarter, and are you hoping to start a pilot in weeks or later?`;
      }
      return `Solid context on ${company}.\n\nI'll score this opportunity and map the right Atlas path. Anything else I should know - current tools (Cost Explorer, Datadog, Cubecost) or who else is in the buying circle?`;
    }
    case "qualification":
      return `Lead score update for **${company}**: **${score.total}/100** (${score.tier.toUpperCase()}).\n\nBreakdown - Budget ${score.budget}/25 | Authority ${score.authority}/25 | Need ${score.need}/25 | Timeline ${score.timeline}/25.\n\n${
        score.total >= 40 && score.budget > 0 && score.timeline > 0
          ? "You're in a strong buying zone. Want me to pitch the best-fit Atlas plan with ROI proof?"
          : score.total >= 40
            ? "Need looks real. Share budget band and timeline and I can pitch the best-fit Atlas plan."
            : "We're still light on budget/timeline. Share those and I can sharpen the recommendation."
      }`;
    case "pitch": {
      const planLine = proposal || "Growth @ $3999/mo";
      return `Here's the ClosePath recommendation for **${company}**:\n\n**${planLine}**\n\nWhy this fits: ${PRODUCT.tagline}\n${PRODUCT.differentiators
        .slice(0, 3)
        .map((d) => `- ${d}`)
        .join("\n")}\n\n${
        knowledge?.split("\n\n")[0] || ""
      }\n\nSocial proof: ${PRODUCT.caseStudies[0].company} hit ${PRODUCT.caseStudies[0].result}.\n\nWant me to handle concerns, or should we book a 30-min pilot kickoff?`;
    }
    case "objection": {
      const categories = categorizeObjections(userText);
      const rebuttals = categories.map((category) => {
        if (category === "pricing") return PRODUCT.objections.price;
        if (category === "timing") return PRODUCT.objections.timing;
        if (category === "security") return PRODUCT.objections.security;
        if (category === "competition") return PRODUCT.objections.competitor;
        return "Fair concern - most teams start read-only, prove savings in weeks, then expand.";
      });
      const unique = [...new Set(rebuttals)];
      return `Understood${name}.\n\n${unique
        .map((r) => `**${r}**`)
        .join("\n\n")}\n\nWe can also run a 14-day read-only pilot with a savings baseline before any commit.\n\nDoes that help enough to schedule a kickoff?`;
    }
    case "close":
      return `Let's make this concrete for **${company}**.\n\nI can:\n1. Book a **30-min pilot kickoff** (read-only IAM, savings baseline in week 1)\n2. Send a one-page proposal for leadership\n\nReply **"book it"** or **"yes"** and I'll schedule and open the deal in the pipeline.${
        meeting ? `\n\n(Already staged: ${meeting})` : ""
      }`;
    case "won":
      return `Great${name} - you're in.\n\nMeeting: ${meeting || "Pilot kickoff scheduled"}\nDeal: ${deal || "Created in pipeline"}\n\nA NexusOps FinOps architect will join with a waste heatmap for ${company}. Looking forward to the kickoff.`;
    case "lost":
      return `Understood${name} - I'll close this lead and stop outreach.\n\nIf priorities change later, ClosePath can reopen with a fresh cloud waste scan for ${company}. Thanks for your time.`;
    default:
      return `Thanks${name}. Tell me about ${company}'s cloud setup and I'll guide the next best step.`;
  }
}

export async function handleUserMessage(
  sessionId: string,
  userText: string
): Promise<{ session: SessionState; toolsUsed: string[] }> {
  const session = getSession(sessionId);
  if (!session) throw new Error("Session not found");
  if (!session.reasoner) session.reasoner = [];

  const prevStage = session.stage;
  const userMsg: ChatMessage = {
    id: id(),
    role: "user",
    content: userText,
    at: now(),
  };
  session.messages.push(userMsg);

  const reasoner: ReasonerStep[] = [];
  const push = (kind: ReasonerStep["kind"], text: string) => {
    const step = { t: now(), kind, text };
    reasoner.push(step);
    session.reasoner = [...session.reasoner, step].slice(-30);
  };

  push("extract", `Ingested prospect message (${userText.slice(0, 64)}...)`);

  if (isDeclineIntent(userText)) {
    session.stage = "lost";
    push("route", `Route ${prevStage.toUpperCase()} → LOST (decline intent)`);
    push("decision", "Prospect opted out - close lead, skip entity mining");
    const content = craftReply(session, "lost", userText, []);
    const assistantMsg: ChatMessage = {
      id: id(),
      role: "assistant",
      content,
      at: now(),
      meta: {
        stage: "lost",
        toolsUsed: ["stage_sync"],
        score: session.score,
        reasoner,
      },
    };
    session.messages.push(assistantMsg);
    session.updatedAt = now();
    saveSession(session);
    appendOp(
      "stage_sync",
      `${session.profile.company || "Lead"} → lost | decline`
    );
    return { session, toolsUsed: ["stage_sync"] };
  }

  session.profile = extractProfile(session.profile, userText);
  session.score = computeLeadScore(session.profile);
  push(
    "extract",
    `Entities → ${session.profile.name || "?"} @ ${session.profile.company || "?"} | ${session.profile.role || "role?"}`
  );

  const stage = nextStage(session.stage, session.profile, session.score, userText);
  session.stage = stage;
  push(
    "route",
    prevStage === stage
      ? `Stay on ${stage.toUpperCase()} agent`
      : `Route ${prevStage.toUpperCase()} → ${stage.toUpperCase()} agent`
  );
  push(
    "decision",
    `BANT ${session.score.total}/100 (${session.score.tier}) | B${session.score.budget} A${session.score.authority} N${session.score.need} T${session.score.timeline}`
  );

  const tools = runTools(session, userText, stage);
  for (const tool of tools) {
    push(
      tool.name.includes("deal") || tool.name.includes("meeting")
        ? "crm"
        : "tool",
      `${tool.name}: ${tool.result.slice(0, 100)}`
    );
  }

  if (stage === "objection") {
    push(
      "tool",
      `Battlecard pull for: ${categorizeObjections(userText).join(", ")}`
    );
  }

  const draft = craftReply(session, stage, userText, tools);
  // Deterministic reply only. Gemini/OpenAI polish is opt-in via /api/polish (button click).
  const content = draft;

  const assistantMsg: ChatMessage = {
    id: id(),
    role: "assistant",
    content,
    at: now(),
    meta: {
      stage,
      toolsUsed: tools.map((t) => t.name),
      score: session.score,
      reasoner,
    },
  };
  session.messages.push(assistantMsg);
  session.updatedAt = now();
  saveSession(session);
  appendOp(
    "stage_sync",
    `${session.profile.company || "Lead"} → ${stage} | BANT ${session.score.total}`
  );

  return { session, toolsUsed: tools.map((t) => t.name) };
}

export async function polishLastAssistantReply(
  sessionId: string
): Promise<{ session: SessionState; provider: string }> {
  const session = getSession(sessionId);
  if (!session) throw new Error("Session not found");

  let assistantIdx = -1;
  for (let i = session.messages.length - 1; i >= 0; i--) {
    if (session.messages[i].role === "assistant") {
      assistantIdx = i;
      break;
    }
  }
  if (assistantIdx < 0) throw new Error("No assistant reply to polish");

  let userText = "";
  for (let i = assistantIdx - 1; i >= 0; i--) {
    if (session.messages[i].role === "user") {
      userText = session.messages[i].content;
      break;
    }
  }

  const draft = session.messages[assistantIdx].content;
  const { polishReplyWithLlm } = await import("./llm");
  const { text, provider, error } = await polishReplyWithLlm(
    draft,
    session,
    userText
  );

  if (provider === "none") {
    throw new Error(
      error ||
        "No LLM API key configured. Add GEMINI_API_KEY from Google AI Studio to .env.local and restart npm run dev."
    );
  }

  // Never replace a good draft with a broken polish
  if (!text || text.length < 40) {
    throw new Error("Gemini polish was incomplete; original reply kept. Try Enhance again.");
  }

  session.messages[assistantIdx] = {
    ...session.messages[assistantIdx],
    content: text,
    meta: {
      ...session.messages[assistantIdx].meta,
      toolsUsed: [
        ...(session.messages[assistantIdx].meta?.toolsUsed || []),
        `llm_polish_${provider}`,
      ].filter((v, i, a) => a.indexOf(v) === i),
    },
  };
  session.reasoner = [
    ...(session.reasoner || []),
    {
      t: now(),
      kind: "tool" as const,
      text: `On-demand LLM polish via ${provider}`,
    },
  ].slice(-30);
  session.updatedAt = now();
  saveSession(session);
  appendOp("llm_polish", `${provider} refined last assistant reply`);

  return { session, provider };
}
