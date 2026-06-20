-- GETKINETIK D1 Migration — Tamper-Proof Pipeline Tables
-- Run via: wrangler d1 execute getkinetik-db --file=migrations/001_tamperproof_pipeline.sql

-- ── grades table (add IPFS columns if not already present) ───────────────────
-- If your grades table already exists, run only the ALTER TABLE statements.
-- If starting fresh, run the full CREATE TABLE.

CREATE TABLE IF NOT EXISTS grades (
  id               TEXT PRIMARY KEY,          -- UUID
  node_id          TEXT NOT NULL,             -- Ed25519 public key (hex)
  score            INTEGER NOT NULL,          -- Genesis Score 0-1000
  tier             TEXT NOT NULL,             -- WEAK / DEVELOPING / STANDING / PREMIER
  computed_at      TEXT NOT NULL,             -- ISO 8601 timestamp
  methodology_version TEXT NOT NULL DEFAULT 'v1.1',
  methodology_hash TEXT NOT NULL,
  uptime_pct       REAL,
  network_count    INTEGER,
  sensor_coherence REAL,
  age_days         INTEGER,
  enclave_valid    INTEGER DEFAULT 1,         -- boolean (1/0)

  -- IPFS columns (added by tamper-proof pipeline)
  ipfs_cid         TEXT,                      -- IPFS CID of the signed grade bundle
  cid_signature    TEXT,                      -- Ed25519 signature over CID commitment
  bundle_json      TEXT,                      -- Full canonical JSON bundle (cache)

  created_at       TEXT DEFAULT (datetime('now'))
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_grades_node_id    ON grades(node_id);
CREATE INDEX IF NOT EXISTS idx_grades_computed_at ON grades(computed_at);
CREATE INDEX IF NOT EXISTS idx_grades_ipfs_cid   ON grades(ipfs_cid);

-- ── daily_anchors table ───────────────────────────────────────────────────────
-- One row per day. Stores the Solana anchor for that day's Merkle root.

CREATE TABLE IF NOT EXISTS daily_anchors (
  day                  TEXT PRIMARY KEY,  -- "2026-05-19"
  merkle_root          TEXT NOT NULL,     -- SHA-256 Merkle root of all CIDs that day
  cid_count            INTEGER NOT NULL,  -- Number of CIDs in the tree
  methodology_version  TEXT NOT NULL,
  solana_signature     TEXT NOT NULL,     -- Solana transaction signature
  solana_cluster       TEXT NOT NULL,     -- "mainnet-beta" or "devnet"
  solana_explorer_url  TEXT,             -- Explorer link (convenience)
  anchored_at          TEXT NOT NULL     -- ISO 8601 timestamp of when anchor was written
);

-- ── ALTER TABLE statements (run these if grades table already exists) ─────────
-- Uncomment and run if you need to add IPFS columns to an existing table:

-- ALTER TABLE grades ADD COLUMN ipfs_cid TEXT;
-- ALTER TABLE grades ADD COLUMN cid_signature TEXT;
-- ALTER TABLE grades ADD COLUMN bundle_json TEXT;
