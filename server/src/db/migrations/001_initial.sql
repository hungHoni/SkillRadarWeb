-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Raw posts from all sources
CREATE TABLE IF NOT EXISTS posts (
  id            BIGSERIAL PRIMARY KEY,
  source        TEXT NOT NULL,
  source_id     TEXT NOT NULL,
  title         TEXT NOT NULL,
  snippet       TEXT,
  url           TEXT,
  author        TEXT,
  score         INT DEFAULT 0,
  comment_count INT DEFAULT 0,
  subreddit     TEXT,
  domain_tag    TEXT,
  embedding     vector(1536),
  created_at    TIMESTAMPTZ NOT NULL,
  scraped_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(source, source_id)
);

-- Topic clusters
CREATE TABLE IF NOT EXISTS clusters (
  id            BIGSERIAL PRIMARY KEY,
  title         TEXT NOT NULL,
  centroid      vector(1536),
  domain_tag    TEXT NOT NULL,
  heat_score    REAL DEFAULT 0,
  source_count  INT DEFAULT 0,
  mention_count INT DEFAULT 0,
  first_seen    TIMESTAMPTZ DEFAULT NOW(),
  last_updated  TIMESTAMPTZ DEFAULT NOW(),
  is_active     BOOLEAN DEFAULT TRUE
);

-- Junction table: posts <-> clusters
CREATE TABLE IF NOT EXISTS cluster_posts (
  cluster_id BIGINT REFERENCES clusters(id),
  post_id    BIGINT REFERENCES posts(id),
  similarity REAL,
  PRIMARY KEY (cluster_id, post_id)
);

-- Source health tracking
CREATE TABLE IF NOT EXISTS source_health (
  source          TEXT PRIMARY KEY,
  last_scrape     TIMESTAMPTZ,
  status          TEXT DEFAULT 'healthy',
  error_count     INT DEFAULT 0,
  last_scraped_id TEXT,
  last_scraped_at TIMESTAMPTZ
);

-- Indexes (IVFFlat requires data to build — created later via 002_ivfflat_index.sql)
CREATE INDEX IF NOT EXISTS idx_clusters_heat ON clusters (heat_score DESC) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_posts_scraped ON posts (scraped_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_url ON posts (url) WHERE url IS NOT NULL;

-- Seed source health rows
INSERT INTO source_health (source, status) VALUES ('reddit', 'healthy') ON CONFLICT DO NOTHING;
INSERT INTO source_health (source, status) VALUES ('hn', 'healthy') ON CONFLICT DO NOTHING;
INSERT INTO source_health (source, status) VALUES ('rss', 'healthy') ON CONFLICT DO NOTHING;
