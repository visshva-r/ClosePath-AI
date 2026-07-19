export type ProductPlan = {
  id: string;
  name: string;
  priceMonthly: number;
  seats: string;
  bestFor: string;
  highlights: string[];
};

export const PRODUCT = {
  name: "Atlas Cloud",
  tagline: "Cut cloud spend 25-40% without slowing engineering.",
  company: "NexusOps",
  category: "Cloud cost intelligence for mid-market SaaS & fintech",
  differentiators: [
    "Live waste detection across AWS, GCP, and Azure",
    "Auto-remediation playbooks with approval gates",
    "FinOps scorecards for CFOs and platform teams",
    "Integrates with Slack, Jira, Terraform, and Datadog",
  ],
  objections: {
    price: "Most teams recover Atlas fees in under 6 weeks from unused reserved capacity alone.",
    timing: "Pilot starts in 5 days with read-only access - no infra changes required.",
    competitor:
      "Unlike generic dashboards, Atlas closes the loop: detect → recommend → remediate → prove savings.",
    security:
      "SOC2 Type II, read-only IAM by default, customer-managed keys available on Growth+.",
  },
  caseStudies: [
    {
      company: "PayOrbit",
      result: "32% AWS reduction in 90 days",
      detail: "Fintech, 180 engineers, multi-account org",
    },
    {
      company: "Stackline Health",
      result: "$410k annualized savings",
      detail: "Healthtech SaaS, GCP-heavy ML workloads",
    },
  ],
} as const;

export const PLANS: ProductPlan[] = [
  {
    id: "starter",
    name: "Starter",
    priceMonthly: 1499,
    seats: "Up to 3 workspaces",
    bestFor: "Series A teams validating FinOps discipline",
    highlights: [
      "AWS + GCP waste scans",
      "Weekly CFO digest",
      "Slack alerts",
    ],
  },
  {
    id: "growth",
    name: "Growth",
    priceMonthly: 3999,
    seats: "Up to 10 workspaces",
    bestFor: "Scaling SaaS with multi-cloud sprawl",
    highlights: [
      "Auto-remediation playbooks",
      "Jira + Terraform hooks",
      "Team scorecards",
      "Priority onboarding",
    ],
  },
  {
    id: "scale",
    name: "Scale",
    priceMonthly: 8999,
    seats: "Unlimited workspaces",
    bestFor: "Fintech & regulated orgs needing controls",
    highlights: [
      "Custom policies + SSO",
      "Dedicated FinOps architect",
      "CMK + private networking",
      "Quarterly exec reviews",
    ],
  },
];

export function searchProductKnowledge(query: string): string {
  const q = query.toLowerCase();
  const chunks: string[] = [];

  if (
    q.includes("price") ||
    q.includes("cost") ||
    q.includes("plan") ||
    q.includes("pricing")
  ) {
    chunks.push(
      "Pricing plans:\n" +
        PLANS.map(
          (p) =>
            `- ${p.name}: $${p.priceMonthly}/mo - ${p.bestFor}. Includes: ${p.highlights.join(", ")}.`
        ).join("\n")
    );
  }

  if (q.includes("integrat") || q.includes("slack") || q.includes("jira")) {
    chunks.push(
      "Integrations: Slack, Jira, Terraform, Datadog, AWS Cost Explorer, GCP Billing, Azure Cost Management."
    );
  }

  if (q.includes("security") || q.includes("compliance") || q.includes("soc")) {
    chunks.push(PRODUCT.objections.security);
  }

  if (q.includes("competitor") || q.includes("vs") || q.includes("alternative")) {
    chunks.push(PRODUCT.objections.competitor);
  }

  if (q.includes("case") || q.includes("customer") || q.includes("result")) {
    chunks.push(
      PRODUCT.caseStudies
        .map((c) => `${c.company}: ${c.result} (${c.detail})`)
        .join(" | ")
    );
  }

  if (q.includes("save") || q.includes("roi") || q.includes("waste")) {
    chunks.push(
      `${PRODUCT.tagline} Differentiators: ${PRODUCT.differentiators.join("; ")}`
    );
  }

  if (chunks.length === 0) {
    chunks.push(
      `${PRODUCT.name} by ${PRODUCT.company}: ${PRODUCT.tagline}\n` +
        PRODUCT.differentiators.map((d) => `- ${d}`).join("\n")
    );
  }

  return chunks.join("\n\n");
}

export function recommendPlan(profile: {
  companySize?: string;
  budget?: string;
  role?: string;
}): ProductPlan {
  const size = (profile.companySize || "").toLowerCase();
  const budget = (profile.budget || "").toLowerCase();

  if (
    size.includes("500") ||
    size.includes("1000") ||
    size.includes("enterprise") ||
    budget.includes("20") ||
    budget.includes("50")
  ) {
    return PLANS[2];
  }

  if (
    size.includes("100") ||
    size.includes("200") ||
    size.includes("250") ||
    budget.includes("5") ||
    budget.includes("10")
  ) {
    return PLANS[1];
  }

  return PLANS[0];
}
