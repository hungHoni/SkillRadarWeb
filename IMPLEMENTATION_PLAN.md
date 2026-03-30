# SkillRadar — Eng Review & Implementation Plan

## Context

SkillRadar is a greenfield live tech trend radar that aggregates posts from Reddit, Hacker News, and RSS feeds, clusters them semantically using OpenAI embeddings + pgvector, and displays trending topics in a React dashboard with real-time SSE updates. The approved design doc is at `DESIGN.md`. This plan covers Phase 1 (MVP).

## Scope Decisions (from Eng Review)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Real-time transport | **SSE** (not socket.io) | One-way server→client. Lighter, simpler, 40KB smaller bundle |
| Job scheduler | **node-cron** (not BullMQ+Redis) | 3 scrapers at 10-30min intervals. No Redis needed. Saves $3-5/mo |
| Folder structure | **Flat monorepo** (/server, /client, /shared) | Solo dev, simple, no Turborepo overhead |
| Infrastructure | **Node.js + Fastify + PostgreSQL only** | Eliminated Redis dependency. 2 Railway services instead of 3 |

## Revised Architecture

```
[node-cron Scheduler]
   |
   +-- Reddit Scraper (every 10 min)
   +-- HN Scraper (every 10 min)
   +-- RSS Scraper (every 30 min)
   |
   v
[Fastify Server]
   |
   +-- POST /internal/ingest  <-- scrapers call this
   |       |
   |       v
   |   [OpenAI Embedding API]
   |       |
   |       v
   |   [Clustering Engine]
   |       |
   |       +-- pgvector nearest-neighbor query
   |       +-- Assign to cluster or create new
   |       +-- Update heat scores
   |       |
   |       v
   |   [SSE Broadcast] --> connected browsers
   |
   +-- GET /api/trends        <-- React frontend
   +-- GET /api/rising
   +-- GET /api/sources/health
   +-- GET /api/sse/stream    <-- SSE endpoint
   |
   v
[PostgreSQL + pgvector]
   |
   +-- posts (with embeddings)
   +-- clusters (with centroids)
   +-- cluster_posts (junction)
   +-- source_health
```

## Project Structure

```
SkillRadarWeb/
├── server/
│   ├── src/
│   │   ├── index.ts              # Fastify server entry point
│   │   ├── config.ts             # Environment config
│   │   ├── db/
│   │   │   ├── client.ts         # PostgreSQL connection (pg + pgvector)
│   │   │   └── migrations/
│   │   │       └── 001_initial.sql
│   │   ├── scrapers/
│   │   │   ├── scheduler.ts      # node-cron setup for all scrapers
│   │   │   ├── reddit.ts         # Reddit API scraper
│   │   │   ├── hn.ts             # HN API scraper
│   │   │   └── rss.ts            # RSS feed scraper
│   │   ├── embedding/
│   │   │   └── openai.ts         # OpenAI embedding client
│   │   ├── clustering/
│   │   │   ├── engine.ts         # Core clustering logic
│   │   │   ├── heat.ts           # Heat score computation
│   │   │   └── tagger.ts         # Domain tagging (subreddit mapping + keyword heuristics)
│   │   ├── routes/
│   │   │   ├── trends.ts         # GET /api/trends
│   │   │   ├── clusters.ts       # GET /api/clusters/:id
│   │   │   ├── rising.ts         # GET /api/rising
│   │   │   └── sources.ts        # GET /api/sources/health
│   │   └── sse/
│   │       └── broadcast.ts      # SSE connection manager + event broadcasting
│   └── package.json
├── client/
│   ├── src/
│   │   ├── App.tsx               # Root component
│   │   ├── main.tsx              # Vite entry
│   │   ├── hooks/
│   │   │   └── useSSE.ts         # SSE connection hook with auto-reconnect
│   │   ├── components/
│   │   │   ├── Header.tsx
│   │   │   ├── DomainTabs.tsx
│   │   │   ├── ClusterCard.tsx
│   │   │   ├── HeatBar.tsx
│   │   │   ├── SourceBadge.tsx
│   │   │   ├── RisingSidebar.tsx
│   │   │   ├── SourceHealth.tsx
│   │   │   └── KeyboardBar.tsx
│   │   ├── api/
│   │   │   └── client.ts         # Fetch wrapper for API calls
│   │   └── types/
│   │       └── index.ts          # Shared TypeScript types
│   ├── index.html
│   ├── vite.config.ts
│   └── package.json
├── shared/
│   └── types.ts                  # Types shared between server and client
├── DESIGN.md
├── CLAUDE.md
├── package.json                  # Root workspace config
└── tsconfig.json                 # Root TypeScript config
```

**Total: ~25 files.** This is appropriate for a full-stack app with background processing.

## Implementation Steps (Phase 1 MVP)

### Step 1: Project Scaffolding
- Initialize npm workspaces (root package.json with `"workspaces": ["server", "client", "shared"]`)
- Set up TypeScript strict mode across all packages
- Set up Vite + React + TailwindCSS v4 in /client
- Set up Fastify + TypeScript in /server
- Add Biome for linting/formatting
- Create `.env.example` with required env vars

### Step 2: Database Schema
- Set up PostgreSQL connection in `server/src/db/client.ts` using `pg` + `pgvector`
- Write migration `001_initial.sql` with the 4 tables from DESIGN.md
- Add IVFFlat index on embeddings column (not HNSW — sufficient at MVP scale, less memory)
- Add migration runner script

### Step 3: Scrapers
- `server/src/scrapers/reddit.ts` — OAuth Reddit API client, fetches top/hot posts from configured subreddits
- `server/src/scrapers/hn.ts` — HN Firebase API client, fetches top stories + metadata
- `server/src/scrapers/rss.ts` — Generic RSS/Atom feed parser for tech blogs
- `server/src/scrapers/scheduler.ts` — node-cron scheduling (Reddit/HN every 10 min, RSS every 30 min)
- Each scraper writes raw posts to `posts` table with `ON CONFLICT DO NOTHING` for deduplication

### Step 4: Embedding & Clustering
- `server/src/embedding/openai.ts` — Calls OpenAI text-embedding-3-small, returns 1536-dim vector (batch up to 100 per call)
- `server/src/clustering/engine.ts` — Core logic:
  1. URL dedup check before embedding
  2. Embed new post (batched)
  3. Query pgvector for top-5 nearest cluster centroids (cosine similarity)
  4. If similarity > 0.82 → add to cluster, update centroid incrementally
  5. If no match → create new cluster
- `server/src/clustering/heat.ts` — Heat score formula: `sqrt(source_diversity) * log(mentions+1) * e^(-hours/24)`
- `server/src/clustering/tagger.ts` — Domain tagging via subreddit mapping + keyword heuristics
- 30-min merge cron: find nearest centroid pairs via pgvector, merge if similarity > 0.88
- 48h deactivation cron: mark stale clusters inactive
- Nightly cron: recalculate centroids from actual member embeddings (fixes drift)

### Step 5: API Routes
- `GET /api/trends?domain=all&limit=20` — Trending clusters sorted by heat_score
- `GET /api/clusters/:id` — Single cluster with member posts
- `GET /api/rising?limit=10` — Fastest-rising topics (heat delta over 2h)
- `GET /api/sources/health` — Source status from source_health table
- All routes return JSON with proper error handling

### Step 6: SSE Broadcast
- `server/src/sse/broadcast.ts` — Manages SSE connections, broadcasts events
- `GET /api/sse/stream` — SSE endpoint with `text/event-stream` content type
- Events: `cluster:new`, `cluster:updated`, `source:status`
- Auto-sends heartbeat every 30s to keep connections alive
- Clustering engine calls broadcast after each cluster update
- Event ID sequencing with Last-Event-ID replay (last 100 events in memory buffer)

### Step 7: React Frontend

#### Information Architecture
```
┌─────────────────────────────────────────────────────────────┐
│  HEADER: "SkillRadar / Live"          "Updated 2 min ago"   │
├─────────────────────────────────────────────────────────────┤
│  DOMAIN TABS: [All 47] [AI/ML 15] [Backend 12] [Frontend 7]│
│               [Cloud/DevOps 6] [System Design 5]            │
├──────────────────────────────────┬──────────────────────────┤
│  MAIN FEED (65%)                 │  SIDEBAR (35%, sticky)   │
│                                  │                          │
│  ┌─ Cluster Card ─────────────┐  │  RISING FAST             │
│  │ Title (H2, Outfit Bold)    │  │  ├─ Topic +340%          │
│  │ Source badges (R, HN, RSS) │  │  ├─ Topic +180%          │
│  │ Snippet (2-line clamp)     │  │  └─ Topic +95%           │
│  │ Domain · Mentions · Time   │  │                          │
│  │ Heat bar ████░░ 4/5        │  │  SOURCES                 │
│  └────────────────────────────┘  │  ├─ Reddit API  ● 2m ago │
│                                  │  ├─ Hacker News ● 1m ago │
│  [More cluster cards...]         │  └─ RSS Feeds   ● 12m ago│
│                                  │                          │
│                                  │  YOUR DOMAINS             │
│                                  │  [AI/ML] [Backend] [+Add] │
├──────────────────────────────────┴──────────────────────────┤
│  KEYBOARD BAR: F Filter · J/K Navigate · Enter Expand · R  │
└─────────────────────────────────────────────────────────────┘
```

#### Navigation Flow
- **Cluster card click** → Inline expand (accordion): reveals full post list with links, scores, timestamps. No page navigation — keeps the feed feel.
- **Rising item click** → Scrolls main feed to that cluster card and highlights it briefly (ring pulse animation)
- **Domain tab click** → Client-side filter, URL updates to `?domain=ai_ml` for shareable state
- **Source badge click** → Opens source post URL in new tab
- **Keyboard: J/K** → Moves visual focus ring between cluster cards
- **Keyboard: Enter** → Toggles expand on focused card
- **Keyboard: F** → Opens domain filter dropdown
- **Keyboard: R** → Manual refresh (fetches latest trends)

- Build all components matching the approved wireframe (see `docs/wireframes/`)
- `useSSE.ts` hook with auto-reconnect on disconnect (exponential backoff, Last-Event-ID)
- Domain tab filtering (client-side filter on loaded data, URL state sync)
- Heat bar visualization with graduated colors (5 levels mapped to design tokens)
- Source badge styling (colored dots per source, active/inactive states)
- Rising sidebar with percentage arrows and count-up animation
- Keyboard shortcuts (J/K navigate, Enter expand, F filter, R refresh)
- Loading skeleton states, empty states with warmth/CTA, error states with retry

### Step 8: Deployment
- Railway deployment config (Procfile or railway.toml)
- PostgreSQL service on Railway with pgvector extension
- GitHub Actions CI: lint + type-check + test on push
- Environment variables: `DATABASE_URL`, `OPENAI_API_KEY`, `REDDIT_CLIENT_ID`, `REDDIT_CLIENT_SECRET`

## Test Plan

### Code Path Coverage Diagram

```
CODE PATH COVERAGE
===========================
[+] server/src/scrapers/reddit.ts
    ├── [GAP] fetchSubredditPosts() — happy path (returns posts)
    ├── [GAP] fetchSubredditPosts() — rate limit (429 response)
    ├── [GAP] fetchSubredditPosts() — network timeout
    ├── [GAP] fetchSubredditPosts() — invalid/empty response
    └── [GAP] OAuth token refresh

[+] server/src/scrapers/hn.ts
    ├── [GAP] fetchTopStories() — happy path
    ├── [GAP] fetchTopStories() — API down
    └── [GAP] fetchTopStories() — malformed item data

[+] server/src/scrapers/rss.ts
    ├── [GAP] fetchFeed() — valid RSS/Atom
    ├── [GAP] fetchFeed() — invalid XML
    └── [GAP] fetchFeed() — network error

[+] server/src/embedding/openai.ts
    ├── [GAP] generateEmbedding() — happy path (returns vector)
    ├── [GAP] generateEmbedding() — API error/timeout
    └── [GAP] generateEmbedding() — rate limit

[+] server/src/clustering/engine.ts
    ├── [GAP] clusterPost() — assigns to existing cluster (similarity > 0.82)
    ├── [GAP] clusterPost() — creates new cluster (no match)
    ├── [GAP] clusterPost() — centroid update formula correctness
    ├── [GAP] mergeClusters() — merges pair (similarity > 0.88)
    ├── [GAP] mergeClusters() — no merges needed
    └── [GAP] deactivateStale() — marks 48h-old clusters inactive

[+] server/src/clustering/heat.ts
    ├── [GAP] computeHeat() — single source
    ├── [GAP] computeHeat() — multiple sources (diversity amplification)
    ├── [GAP] computeHeat() — recency decay over time
    └── [GAP] heatLevel() — maps score to 1-5 correctly

[+] server/src/clustering/tagger.ts
    ├── [GAP] tagBySubreddit() — known subreddit mapping
    ├── [GAP] tagBySubreddit() — unknown subreddit
    ├── [GAP] tagByKeywords() — matches ai_ml keywords
    ├── [GAP] tagByKeywords() — matches backend keywords
    └── [GAP] tagByKeywords() — no keyword match (fallback)

[+] server/src/routes/trends.ts
    ├── [GAP] GET /api/trends — returns clusters sorted by heat
    ├── [GAP] GET /api/trends?domain=ai_ml — filtered results
    └── [GAP] GET /api/trends — empty database

[+] server/src/sse/broadcast.ts
    ├── [GAP] SSE connection lifecycle (connect, receive, disconnect)
    ├── [GAP] Heartbeat every 30s
    └── [GAP] Broadcast to multiple connected clients

USER FLOW COVERAGE
===========================
[+] Live dashboard flow
    ├── [GAP] [→E2E] Page loads, fetches trends, displays clusters
    ├── [GAP] [→E2E] Domain tab filtering works
    ├── [GAP] [→E2E] SSE event updates cluster card in real-time
    └── [GAP] [→E2E] Empty state when no clusters exist

─────────────────────────────────
COVERAGE: 0/35 paths tested (0%)
GAPS: 35 paths need tests (4 need E2E)
─────────────────────────────────
```

### Test Files to Create

**Unit tests (Vitest):**
- `server/src/scrapers/__tests__/reddit.test.ts` — Mock HTTP, test all scraper paths
- `server/src/scrapers/__tests__/hn.test.ts` — Mock HTTP, test HN paths
- `server/src/scrapers/__tests__/rss.test.ts` — Mock HTTP, test RSS paths
- `server/src/embedding/__tests__/openai.test.ts` — Mock OpenAI API
- `server/src/clustering/__tests__/engine.test.ts` — Test clustering logic with mock vectors
- `server/src/clustering/__tests__/heat.test.ts` — Test heat formula with known inputs
- `server/src/clustering/__tests__/tagger.test.ts` — Test domain tagging
- `server/src/routes/__tests__/trends.test.ts` — Test API routes with test DB

**E2E tests:**
- `client/e2e/dashboard.test.ts` — Full dashboard load, filtering, SSE updates

## Failure Modes

| Codepath | Failure | Test? | Error Handling? | User Impact |
|----------|---------|-------|-----------------|-------------|
| Reddit scraper | 429 rate limit | Planned | Exponential backoff | Source shows "degraded" |
| Reddit scraper | OAuth token expired | Planned | Auto-refresh | Transparent |
| HN scraper | API timeout | Planned | Retry 3x | Source shows "down" |
| OpenAI embedding | API down | Planned | Queue for retry | New posts appear without clustering |
| Clustering | pgvector query slow | No | None needed at MVP scale | N/A |
| SSE | Client disconnect | Planned | Auto-reconnect hook | Brief gap then catches up |
| PostgreSQL | Connection lost | No | Fastify crashes, Railway restarts | ~30s downtime |

**Critical gaps:** 0 — all failure modes either have planned tests+handling or are handled by infrastructure (Railway auto-restart).

## Outside Voice Findings (Claude subagent)

8 issues surfaced. Key architectural items incorporated into the plan:

1. **Centroid drift** — Add periodic centroid recalculation (nightly cron: recompute each active cluster's centroid from actual member post embeddings). Add cold-start note: first ~50 posts create individual clusters; meaningful clustering begins after ~100 posts.
2. **Heat score rebalancing** — Current formula overweights source diversity (3 mentions across 3 sources > 100 on 1 source). Rebalance: `sqrt(source_diversity) * log(mention_count + 1) * e^(-hours/24)` — diversity still matters but doesn't dominate.
3. **URL dedup before embedding** — Dedup posts by URL before generating embeddings. Same article from Reddit+HN+RSS should be one post with multiple source tags, not 3 separate posts.
4. **Scraper high-water marks** — Store `last_scraped_id` / `last_scraped_at` per source in `source_health` table. Scrapers resume from high-water mark on restart. Prevents double-scraping.
5. **Use IVFFlat instead of HNSW** — At MVP scale (150K vectors over 4 months), IVFFlat is sufficient and uses far less memory. Switch to HNSW only if query latency becomes an issue.
6. **SSE Last-Event-ID** — Implement event ID sequencing. On reconnect, replay missed events from a short buffer (last 100 events in memory).
7. **OpenAI batch embedding** — Batch posts (up to 100 per API call) instead of 1-by-1. Reduces API calls ~50x.
8. **Reddit OAuth token refresh** — Implement auto-refresh before expiry (tokens last 1 hour).

Items NOT incorporated (acceptable at MVP):
- Polling interval stays at 10min (serves the "live feel" UX goal; dedup + high-water marks address redundancy)
- Cluster split operation deferred (merge-only is acceptable for MVP; revisit if cluster quality degrades)
- Data retention job deferred to Phase 2 (4 months of headroom on free tier)

## NOT in Scope (Phase 1)

- X/Twitter scraper (API costs $100/mo — deferred to Phase 2)
- User authentication (single-user MVP)
- AI summaries / sentiment analysis (Phase 3)
- Skill Map visualization (Phase 3)
- BullMQ / Redis (replaced with node-cron for MVP)
- Personalization / saved topics (Phase 2)
- Cluster split operation (merge-only for MVP; revisit if quality degrades)
- Data retention/cleanup job (4 months headroom on free tier; add in Phase 2)

## Verification

1. **Scrapers work:** Run `npm run dev:server`, check logs for Reddit/HN/RSS posts being ingested
2. **Clustering works:** Check `clusters` table has entries with heat scores > 0
3. **API works:** `curl http://localhost:3000/api/trends` returns JSON with clusters
4. **SSE works:** Open `http://localhost:3000/api/sse/stream` in browser, see events arrive
5. **Frontend works:** Open `http://localhost:5173`, see clusters with heat bars and source badges
6. **Tests pass:** `npm run test` passes all unit tests

## Review Status

- **Eng Review:** CLEAR — 3 scope reductions accepted, 0 critical gaps
- **Design Review:** CLEAR — score 5/10 → 9/10, 1 decision (inline accordion)
- **Outside Voice:** 8 findings, all incorporated
- **Verdict:** Ready to implement
