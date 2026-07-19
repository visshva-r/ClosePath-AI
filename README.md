# ClosePath AI

Multi-agent B2B sales assistant that runs a staged workflow:

**Discover -> Qualify (BANT) -> Pitch -> Handle objections -> Close**

Along the way it runs sales tools (lead scoring, product knowledge search, proposal generation, objection logging, meeting booking, deal creation) and writes results into a simple CRM store. A manager dashboard shows funnel metrics, objection breakdown, pipeline value, and a live sync log.

## Features

- Staged sales state machine with live stage indicator
- BANT scoring and lead profile extraction
- Multi-category objection handling
- Live agent reasoner terminal (route / extract / tool / CRM steps)
- ROI calculator for cloud spend scenarios
- Proposal one-pager preview on closed-won
- Manager dashboard with funnel, heatmap, deals, meetings, sync console
- Works without an API key (deterministic agent). Optional OpenAI polish if configured.

## Quick start

```bash
cd Project
npm install
npm run dev
```

Open [http://localhost:3010](http://localhost:3010)

| Surface | Path |
|---|---|
| Sales floor | `/` |
| Manager dashboard | `/dashboard` |

Dev server uses port **3010** by default.

### Optional LLM polish

```env
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
```

Copy `.env.example` to `.env.local`.

## Demo walkthrough

1. Open `/dashboard` and reset CRM data if you want a clean slate.
2. On `/`, click **Play demo step** five times (or type as the prospect).
3. Watch BANT score, reasoner terminal, and tool chips update.
4. On close, review the proposal one-pager and confetti state.
5. Open `/dashboard` for funnel, objections, deals, and sync log.

## Architecture

```
Prospect message
    ->
Profile extractor -> BANT scorer -> Stage router
    ->
Tools: score_lead | search_product_knowledge | generate_proposal
       log_objection | book_meeting | create_deal
    ->
Reasoner terminal + CRM ops log (.data/)
    ->
Manager dashboard
```

### Key files

| File | Role |
|---|---|
| `src/lib/agent.ts` | Orchestration, reasoner, tools |
| `src/lib/scoring.ts` | BANT scoring and stage transitions |
| `src/lib/product.ts` | Demo product catalog (Atlas Cloud) |
| `src/lib/store.ts` | Sessions, deals, meetings, ops |
| `src/components/SalesWorkspace.tsx` | Sales floor UI |
| `src/components/ManagerDashboard.tsx` | Analytics UI |

## Tech stack

- Next.js (App Router) + TypeScript
- Tailwind CSS
- Local JSON persistence under `.data/`
- Optional OpenAI Chat Completions for reply polish

## Deploy

```bash
cd Project
npx vercel --prod
```

## License / notes

Personal portfolio project. Atlas Cloud / NexusOps names are fictional demo data for the sales simulation.
