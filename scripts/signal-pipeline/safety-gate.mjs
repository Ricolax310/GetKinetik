// Safety gate — final filter BEFORE any X API post.
// Sits between renderer output and the posting call.
// No grammar logic, no rendering. Pure validation.

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { maxTweetLen } from "./limits.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const HASH_FILE = path.join(REPO_ROOT, "scripts/data/last_post_hash.txt");

const MAX_HASHTAGS = 5;
const MIN_MARKDOWN_LENGTH = 10;

// HARD CONTENT RULES (non-negotiable):
// every post must reference >= 2 distinct networks; ecosystem is always the
// subject; no interpretation / narrative / spotlighting language.
const MIN_NETWORKS = 2;

const INTERPRETATION_PATTERNS = [
  /\bbecause\b/i,
  /\bdriven by\b/i,
  /\bdue to\b/i,
  /\bcaused by\b/i,
  /\bled to\b/i,
  /\bthanks to\b/i,
  /\bas a result\b/i,
  /\bresulting in\b/i,
  /\bspotlight/i,
];

const VALID_GRAMMAR_VERSIONS = new Set(["v2", "v3"]);

// Canonical network detection — the authoritative definition of "a network
// being present in a post". Counts distinct networks NAMED in the published
// text, so the multi-network guarantee is tied to the artifact itself, not to
// upstream extraction. Each network maps to alias patterns.
const NETWORK_ALIASES = {
  geodnet:    [/\bgeodnet\b/i],
  weatherxm:  [/\bweatherxm\b/i, /\bwxm\b/i],
  hivemapper: [/\bhivemapper\b/i, /\bhoney\b/i],
  natix:      [/\bnatix\b/i],
  nodle:      [/\bnodle\b/i, /\bnodl\b/i],
  dawn:       [/\bdawn\b/i, /\bandrena\b/i],
  dimo:       [/\bdimo\b/i],
  grass:      [/\bgrass\b/i, /\btitan\b/i],
};

/** Count distinct canonical networks explicitly named in the text. */
export function countNetworksInText(text) {
  const t = String(text || "");
  let count = 0;
  const matched = [];
  for (const [id, patterns] of Object.entries(NETWORK_ALIASES)) {
    if (patterns.some((p) => p.test(t))) {
      count += 1;
      matched.push(id);
    }
  }
  return { count, matched };
}

// Mode resolution — single source of truth.
export function resolveKinetikMode() {
  const raw = (process.env.KINETIK_MODE || "manual").toLowerCase().trim();
  if (["manual", "safe", "autopilot"].includes(raw)) return raw;
  console.warn(`[safety-gate] unknown KINETIK_MODE "${raw}" — defaulting to manual`);
  return "manual";
}

function countHashtags(text) {
  return (String(text).match(/#\w+/g) || []).length;
}

function hashContent(text) {
  return crypto.createHash("sha256").update(String(text)).digest("hex");
}

// Dedupe is TIME-WINDOWED, not absolute. Identical content is allowed to
// repost on the normal cadence (posting the same state two days running beats
// posting nothing). Only an identical post *within* this window is blocked,
// which catches accidental rapid re-runs. Default 12h (override via env).
const DEDUPE_WINDOW_HOURS = Number(process.env.DEDUPE_WINDOW_HOURS || 12);

function loadLastPost() {
  try {
    if (!fs.existsSync(HASH_FILE)) return null;
    const raw = fs.readFileSync(HASH_FILE, "utf8").trim();
    // Back-compat: old format was a bare hash string.
    if (raw.startsWith("{")) return JSON.parse(raw);
    return { hash: raw, at: null };
  } catch {
    return null;
  }
}

export function saveLastHash(text) {
  try {
    fs.mkdirSync(path.dirname(HASH_FILE), { recursive: true });
    fs.writeFileSync(
      HASH_FILE,
      JSON.stringify({ hash: hashContent(text), at: new Date().toISOString() }),
      "utf8",
    );
  } catch {
    /* non-fatal */
  }
}

/**
 * Run all safety checks on a post before it is sent.
 *
 * @param {{ markdown: string, grammarVersion: string, postText: string, networkCount?: number }} post
 * @returns {{ ok: boolean, reason: string | null }}
 */
export function safetyGate(post) {
  const { markdown, grammarVersion, postText, networkCount } = post;

  if (!markdown || markdown.length < MIN_MARKDOWN_LENGTH) {
    return { ok: false, reason: "empty or too-short markdown" };
  }

  if (!grammarVersion || !VALID_GRAMMAR_VERSIONS.has(grammarVersion)) {
    return { ok: false, reason: `malformed grammarVersion: ${grammarVersion}` };
  }

  if (!postText || postText.trim().length === 0) {
    return { ok: false, reason: "empty post text" };
  }

  // HARD RULE: multi-network only — AUTHORITATIVE on the published text.
  // Count networks actually named in postText (not upstream feed counts).
  const named = countNetworksInText(postText);
  if (named.count < MIN_NETWORKS) {
    return {
      ok: false,
      reason: `multi-network rule: ${named.count} network(s) named in post [${named.matched.join(", ") || "none"}] < required ${MIN_NETWORKS}`,
    };
  }
  // Defensive secondary check against upstream count, if provided.
  if (typeof networkCount === "number" && networkCount < MIN_NETWORKS) {
    return { ok: false, reason: `multi-network rule: upstream feed had ${networkCount} active network(s) < required ${MIN_NETWORKS}` };
  }

  // HARD RULE: neutral, descriptive tone — no interpretation/narrative framing.
  for (const pattern of INTERPRETATION_PATTERNS) {
    if (pattern.test(postText)) {
      return { ok: false, reason: `interpretation/narrative language detected: ${pattern}` };
    }
  }

  const maxLen = maxTweetLen();
  if (postText.length > maxLen) {
    return { ok: false, reason: `post exceeds ${maxLen} chars (${postText.length})` };
  }

  if (countHashtags(postText) > MAX_HASHTAGS) {
    return { ok: false, reason: `too many hashtags (${countHashtags(postText)} > ${MAX_HASHTAGS})` };
  }

  // Time-windowed dedupe: only block an identical post within the window.
  const hash = hashContent(postText);
  const last = loadLastPost();
  if (last && last.hash === hash && last.at) {
    const ageHours = (Date.now() - new Date(last.at).getTime()) / 3_600_000;
    if (ageHours < DEDUPE_WINDOW_HOURS) {
      return {
        ok: false,
        reason: `duplicate within ${DEDUPE_WINDOW_HOURS}h window (last posted ${ageHours.toFixed(1)}h ago)`,
      };
    }
    // Older than the window — identical content is allowed to repost.
  }

  return { ok: true, reason: null };
}
