# TODOs — SkillRadar

Generated from `/plan-eng-review` on 2026-03-27.
Updated: 2026-03-31.

## Phase 1 (implement during MVP) — ALL DONE ✅

### 1. ✅ Rebalance heat score formula
- **Status:** DONE — Implemented in `server/src/clustering/heat.ts` using `sqrt(source_diversity)`. Verified by 10 unit tests in `heat.test.ts`.

### 2. ✅ URL dedup before embedding
- **Status:** DONE — Implemented in `server/src/clustering/engine.ts`. Checks `posts.url` before embedding, adds source tag to existing post if duplicate found.

### 3. ✅ Scraper high-water marks
- **Status:** DONE — `last_scraped_id` and `last_scraped_at` columns in `source_health` table. Each scraper (Reddit/HN/RSS) stores and resumes from high-water mark.

### 4. ✅ Batch OpenAI embedding calls
- **Status:** DONE — Implemented in `server/src/embedding/openai.ts`. Batches up to 100 posts per API call with 30s flush timeout.

## Phase 2 (post-MVP)

### 5. Full-stack deployment on Railway
- **What:** Deploy the backend to Railway with PostgreSQL + pgvector. Configure real API credentials.
- **Why:** The GitHub Pages demo uses mock data. Real deployment needed for live scraping + clustering.
- **Context:** Procfile exists. Need Railway project with PostgreSQL service (pgvector extension), plus env vars: `DATABASE_URL`, `OPENAI_API_KEY`, `REDDIT_CLIENT_ID`, `REDDIT_CLIENT_SECRET`.

### 6. Expand test coverage (25 remaining gaps)
- **What:** Add unit tests for scrapers, clustering engine, API routes, and SSE broadcast.
- **Why:** Currently at 29% coverage (10/35 paths). Heat + tagger fully covered; scrapers, engine, routes, SSE untested.
- **Context:** See IMPLEMENTATION_PLAN.md test coverage diagram for specific gaps.

### 7. E2E tests (4 gaps)
- **What:** Add Playwright/Vitest E2E tests for dashboard load, domain filtering, SSE updates, empty state.
- **Why:** User flows are untested. Core interaction paths need integration coverage.

### 8. Data retention/cleanup job
- **What:** Cron job to archive/delete posts older than N days.
- **Why:** 4 months headroom on free tier, but needed eventually to prevent unbounded growth.
