// Local-first paths and defaults for the Command Center.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(__dirname, "..", "..");

/** UTC calendar day — matches build.mjs and signal pipeline dates. */
export function todayUtc() {
  return new Date().toISOString().slice(0, 10);
}

export const PRIVATE_DIR = path.join(REPO_ROOT, "docs/bureau/private");
export const IMPORTS_DIR = path.join(PRIVATE_DIR, "imports");

// Audit index resolution. The tracked file is the committed copy; the cache is a
// gitignored, HTTP-synced copy of the latest canonical data (written on Pull
// live). Reads use whichever is FRESHER by mtime, so the local dashboard is
// never stale whether you Pull live or git pull — with ZERO git side effects
// (the cache lives under the gitignored private dir; no tracked file is touched).
export const AUDIT_INDEX_TRACKED = path.join(REPO_ROOT, "scripts/data/bureau-audit-index.json");
export const AUDIT_INDEX_CACHE = path.join(PRIVATE_DIR, "bureau-audit-index.cache.json");

export function resolveAuditIndexPath() {
  try {
    if (!fs.existsSync(AUDIT_INDEX_CACHE)) return AUDIT_INDEX_TRACKED;
    if (!fs.existsSync(AUDIT_INDEX_TRACKED)) return AUDIT_INDEX_CACHE;
    const cacheM = fs.statSync(AUDIT_INDEX_CACHE).mtimeMs;
    const trackedM = fs.statSync(AUDIT_INDEX_TRACKED).mtimeMs;
    return cacheM >= trackedM ? AUDIT_INDEX_CACHE : AUDIT_INDEX_TRACKED;
  } catch {
    return AUDIT_INDEX_TRACKED;
  }
}
export const X_IMPORT_DIR = path.join(IMPORTS_DIR, "x");
export const RSS_CACHE_PATH = path.join(IMPORTS_DIR, "rss-cache.json");
export const GITHUB_CACHE_PATH = path.join(IMPORTS_DIR, "github-issues.json");
export const NOTES_DIR = path.join(IMPORTS_DIR, "notes");
export const SQLITE_DB_PATH = path.join(PRIVATE_DIR, "command-center.db");

export const OUT_JSON = path.join(PRIVATE_DIR, "command-center.json");
export const BRIEF_DIR = path.join(REPO_ROOT, "docs/command-center/daily");
export const FEEDS_CONFIG = path.join(REPO_ROOT, "docs/command-center/feeds.json");
export const SOCIAL_SOURCES_CONFIG = path.join(
  REPO_ROOT,
  "docs/command-center/social-sources.json",
);

export const MARKDOWN_SOURCES = [
  { id: "gtm", path: "scripts/bureau/gtm-context.md", label: "GTM brain" },
  { id: "pilot-targets", path: "docs/pilot-targets.md", label: "Pilot targets" },
  { id: "pilot-plan", path: "docs/pilot-plan.md", label: "Pilot plan" },
  { id: "outreach-email", path: "docs/outreach-email.md", label: "Outreach templates" },
  { id: "one-pager", path: "docs/ONE_PAGER.md", label: "Partner one-pager" },
  { id: "operator-tasks", path: "docs/bureau/operator-tasks.md", label: "Operator tasks" },
  { id: "latest-operator", path: "docs/bureau/daily/latest-operator.md", label: "Latest operator brief" },
  { id: "latest-brief", path: "docs/bureau/daily/latest-brief.md", label: "Latest bureau brief" },
  { id: "latest-news", path: "docs/bureau/daily/latest-news.md", label: "Latest news scan" },
  { id: "latest-bulletin", path: "docs/bureau/papers/latest-bulletin.md", label: "Latest bulletin" },
  { id: "depin-contacts", path: "docs/depin-contacts-100.csv", label: "DePIN contacts" },
];

export const DEFAULT_RSS_FEEDS = [
  {
    id: "depinscan",
    label: "DePINscan blog",
    url: "https://depinscan.io/blog/rss.xml",
  },
  {
    id: "messari",
    label: "Messari research",
    url: "https://messari.io/rss",
  },
];

export const ENGINEERING_KEYWORDS = [
  "ci",
  "test",
  "refactor",
  "typescript",
  "openapi",
  "postman",
  "parity",
  "drift",
  "smoke",
  "fuzz",
  "verifier",
  "canonical",
  "policy",
  "worker",
  "expo",
  "android",
];

export const PILOT_KEYWORDS = [
  "pilot",
  "partner",
  "outreach",
  "integration",
  "verify-device",
  "attestation",
  "bureau",
  "grant",
  "dimo",
  "weatherxm",
  "geodnet",
  "hivemapper",
];
