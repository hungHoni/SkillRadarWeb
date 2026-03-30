# TODOs — SkillRadar

Generated from `/plan-eng-review` on 2026-03-27.

## Phase 1 (implement during MVP)

### 1. Rebalance heat score formula
- **What:** Change heat formula from `source_diversity² * log(mentions+1) * e^(-hours/24)` to `sqrt(source_diversity) * log(mentions+1) * e^(-hours/24)`.
- **Why:** Current formula overweights source diversity — 3 mentions across 3 sources scores higher than 100 mentions on 1 source. `sqrt()` keeps diversity as a signal without letting it dominate.
- **Pros:** More intuitive heat rankings; single-source viral topics aren't buried.
- **Cons:** None significant — trivial code change.
- **Context:** Identified by outside voice (Claude subagent) during eng review. The original squared formula was from DESIGN.md. Update both `server/src/clustering/heat.ts` and DESIGN.md when implementing.
- **Depends on:** Step 4 (Embedding & Clustering) implementation.

### 2. URL dedup before embedding
- **What:** Before generating an embedding for a new post, check if a post with the same URL already exists. If it does, add the new source tag to the existing post instead of creating a duplicate.
- **Why:** The same article shared on Reddit, HN, and RSS would otherwise generate 3 separate embeddings and potentially 3 separate clusters for the same content. Wastes embedding API calls and pollutes clustering.
- **Pros:** Saves ~30% on embedding API costs; cleaner clusters; accurate source_count for heat scoring.
- **Cons:** Adds a DB lookup before each embedding call (negligible at MVP scale).
- **Context:** Posts table already has a `url` column. Add a check in the ingestion pipeline: `SELECT id FROM posts WHERE url = $1`. If found, add new source tag via an update. If not found, proceed with normal embedding + clustering flow.
- **Depends on:** Step 3 (Scrapers) and Step 4 (Embedding & Clustering).

### 3. Scraper high-water marks
- **What:** Add `last_scraped_id` and `last_scraped_at` columns to the `source_health` table. Each scraper stores its high-water mark after a successful run and resumes from that point on restart.
- **Why:** Without high-water marks, a server restart causes scrapers to re-fetch posts they've already processed. While `ON CONFLICT DO NOTHING` prevents DB duplicates, it still wastes API calls and rate limit budget.
- **Pros:** Crash recovery without redundant API calls; respects rate limits better; faster restart.
- **Cons:** 2 extra columns in source_health table; minor scraper code change.
- **Context:** Reddit scraper uses `after` pagination param (store last seen `t3_xxxxx`). HN scraper uses item IDs (store max item ID). RSS scraper uses `pubDate` (store latest timestamp). Add to migration `001_initial.sql`.
- **Depends on:** Step 2 (Database Schema) and Step 3 (Scrapers).

### 4. Batch OpenAI embedding calls
- **What:** Instead of calling OpenAI's embedding API once per post, batch up to 100 posts per API call using the batch input parameter.
- **Why:** At ~1000 posts/day, individual calls = ~1000 API requests/day. Batching = ~10 API requests/day. Reduces latency, cost overhead, and rate limit pressure by ~100x.
- **Pros:** Massively fewer API calls; lower latency per post; less rate limit risk.
- **Cons:** Slightly more complex embedding code; need to handle partial batch failures.
- **Context:** OpenAI's `/v1/embeddings` endpoint accepts an array of strings as input (up to 100). Accumulate posts in a buffer, flush when buffer hits 100 or after a timeout (e.g., 30 seconds). Implement in `server/src/embedding/openai.ts`.
- **Depends on:** Step 4 (Embedding & Clustering).
