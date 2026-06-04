// Local ingestors — no cloud required; optional gh/rss when online.

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import {
  REPO_ROOT,
  IMPORTS_DIR,
  X_IMPORT_DIR,
  RSS_CACHE_PATH,
  GITHUB_CACHE_PATH,
  NOTES_DIR,
  MARKDOWN_SOURCES,
  FEEDS_CONFIG,
  SOCIAL_SOURCES_CONFIG,
  DEFAULT_RSS_FEEDS,
} from "./config.mjs";

function rel(abs) {
  return path.relative(REPO_ROOT, abs).replace(/\\/g, "/");
}

function readText(absPath, max = 24_000) {
  if (!fs.existsSync(absPath)) return null;
  const raw = fs.readFileSync(absPath, "utf8");
  return raw.length > max ? `${raw.slice(0, max)}\n…(truncated)` : raw;
}

function statFile(absPath) {
  if (!fs.existsSync(absPath)) return null;
  const s = fs.statSync(absPath);
  return { path: rel(absPath), mtime: s.mtime.toISOString(), bytes: s.size };
}

export function ingestMarkdownNotes() {
  const files = [];
  for (const src of MARKDOWN_SOURCES) {
    const abs = path.join(REPO_ROOT, src.path);
    const text = readText(abs);
    if (text) {
      files.push({
        id: src.id,
        label: src.label,
        path: src.path,
        mtime: statFile(abs)?.mtime,
        excerpt: text.slice(0, 600).replace(/\s+/g, " ").trim(),
      });
    }
  }

  const noteFiles = [];
  if (fs.existsSync(NOTES_DIR)) {
    for (const name of fs.readdirSync(NOTES_DIR).filter((f) => /\.md$/i.test(f))) {
      const abs = path.join(NOTES_DIR, name);
      const text = readText(abs, 8000);
      noteFiles.push({
        name,
        path: rel(abs),
        mtime: statFile(abs)?.mtime,
        text,
      });
    }
  }

  return { files, noteFiles };
}

export function parsePilotPipeline() {
  const mdPath = path.join(REPO_ROOT, "docs/pilot-targets.md");
  if (!fs.existsSync(mdPath)) return [];
  const md = fs.readFileSync(mdPath, "utf8");
  const rows = [];
  for (const line of md.split("\n")) {
    if (!line.startsWith("| **")) continue;
    const cells = line
      .split("|")
      .map((c) => c.trim())
      .filter(Boolean);
    if (cells.length < 5) continue;
    const priority = cells[0].replace(/\*\*/g, "");
    const org = cells[1];
    const category = cells[2];
    const difficulty = cells[3].replace(/\*\*/g, "");
    const why = cells[4];
    rows.push({ priority: Number(priority) || rows.length + 1, org, category, difficulty, why });
  }
  return rows.sort((a, b) => a.priority - b.priority);
}

export function parseDepinContacts(limit = 12) {
  const csvPath = path.join(REPO_ROOT, "docs/depin-contacts-100.csv");
  if (!fs.existsSync(csvPath)) return [];
  const text = fs.readFileSync(csvPath, "utf8");
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === "," && !inQuotes) {
      row.push(cell);
      cell = "";
      continue;
    }
    if ((ch === "\n" || ch === "\r") && !inQuotes) {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      if (cell || row.length) row.push(cell);
      if (row.length) rows.push(row);
      row = [];
      cell = "";
      continue;
    }
    cell += ch;
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  const out = [];
  for (let i = 1; i < rows.length && out.length < limit; i++) {
    const parts = rows[i];
    if (parts.length < 9) continue;
    const [category, name, company, role, x, , email, why, angle] = parts;
    if (why?.includes("Defer")) continue;
    out.push({
      category,
      name,
      company,
      role,
      x,
      email: email?.startsWith("Not public") ? null : email,
      why,
      angle,
    });
  }
  return out;
}

export function parseWarmWaits() {
  const gtmPath = path.join(REPO_ROOT, "scripts/bureau/gtm-context.md");
  if (!fs.existsSync(gtmPath)) return [];
  const md = fs.readFileSync(gtmPath, "utf8");
  const section = md.match(/## Warm leads[\s\S]*?(?=\n## |\n---|\Z)/);
  if (!section) return [];
  const rows = [];
  for (const line of section[0].split("\n")) {
    if (!line.startsWith("|") || line.includes("Who |")) continue;
    const cells = line
      .split("|")
      .map((c) => c.trim())
      .filter(Boolean);
    if (cells.length < 4 || cells[0].startsWith("---")) continue;
    rows.push({ who: cells[0], lane: cells[1], state: cells[2], rule: cells[3] });
  }
  return rows;
}

export function ingestBureauReports() {
  const pipelinePath = path.join(REPO_ROOT, "scripts/data/bureau-pipeline.json");
  let pipeline = null;
  if (fs.existsSync(pipelinePath)) {
    try {
      pipeline = JSON.parse(fs.readFileSync(pipelinePath, "utf8"));
    } catch {
      pipeline = null;
    }
  }

  const briefPath = path.join(REPO_ROOT, "docs/bureau/daily/latest-brief.md");
  const bulletinPath = path.join(REPO_ROOT, "docs/bureau/papers/latest-bulletin.md");
  const operatorPath = path.join(REPO_ROOT, "docs/bureau/daily/latest-operator.md");

  const briefMd = readText(briefPath, 6000);
  const featured =
    briefMd?.match(/\*\*Featured read \(([^)]+)\):\*\* ([^\n]+)/) ||
    briefMd?.match(/- \*\*Featured read \(([^)]+)\):\*\* ([^\n]+)/);

  const networks = [];
  if (briefMd) {
    for (const line of briefMd.split("\n")) {
      if (!line.startsWith("| ") || line.includes("Network |")) continue;
      const cells = line
        .split("|")
        .map((c) => c.trim())
        .filter(Boolean);
      if (cells.length >= 4 && !cells[0].startsWith("---")) {
        networks.push({
          network: cells[0],
          report: cells[1],
          outreach: cells[2],
          finding: cells[3]?.replace(/\r/g, ""),
        });
      }
    }
  }

  return {
    pipeline,
    pipelineAge: pipeline?.updatedAt || null,
    featuredNetwork: featured?.[1] || null,
    featuredFinding: featured?.[2] || null,
    networks,
    paths: {
      brief: fs.existsSync(briefPath) ? rel(briefPath) : null,
      bulletin: fs.existsSync(bulletinPath) ? rel(bulletinPath) : null,
      operator: fs.existsSync(operatorPath) ? rel(operatorPath) : null,
    },
  };
}

function parseTweetObject(obj) {
  if (!obj) return null;
  const text =
    obj.full_text ||
    obj.text ||
    obj.tweet?.full_text ||
    obj.tweet?.text ||
    null;
  if (!text) return null;
  const created =
    obj.created_at || obj.tweet?.created_at || obj.date || null;
  return { text: String(text).replace(/\s+/g, " ").trim(), created };
}

export function ingestXExports(maxItems = 40, options = {}) {
  const items = [];
  if (!fs.existsSync(X_IMPORT_DIR)) {
    return { items, source: null, hint: "Drop X/Twitter export JSON or tweet.js under docs/bureau/private/imports/x/" };
  }

  function walkJson(val, depth = 0) {
    if (depth > 8 || items.length >= maxItems) return;
    if (Array.isArray(val)) {
      for (const v of val) walkJson(v, depth + 1);
      return;
    }
    if (val && typeof val === "object") {
      const tw = parseTweetObject(val);
      if (tw && tw.text.length > 20) {
        items.push(tw);
      }
      for (const k of Object.keys(val)) walkJson(val[k], depth + 1);
    }
  }

  for (const name of fs.readdirSync(X_IMPORT_DIR)) {
    const abs = path.join(X_IMPORT_DIR, name);
    if (fs.statSync(abs).isDirectory()) continue;
    if (/\.json$/i.test(name)) {
      try {
        walkJson(JSON.parse(fs.readFileSync(abs, "utf8")));
      } catch {
        /* skip */
      }
    } else if (/tweet\.js$/i.test(name)) {
      const raw = fs.readFileSync(abs, "utf8");
      const jsonish = raw.replace(/^window\.YTD\.tweet\.part0\s*=\s*/, "").replace(/;$/, "");
      try {
        walkJson(JSON.parse(jsonish));
      } catch {
        /* skip */
      }
    }
  }

  const defaultRe =
    /depin|weatherxm|geodnet|hivemapper|dimo|helium|minima|grass|iotex|peaq|rtk|sensor|sybil|attestation|verify|proof[- ]of[- ]origin|device authenticity|fraud/i;
  const keywordRe = options.keywordRe || defaultRe;
  const filtered = items
    .filter((t) => keywordRe.test(t.text))
    .slice(0, maxItems);

  return {
    items: filtered.length ? filtered : items.slice(0, 15),
    source: rel(X_IMPORT_DIR),
    hint: filtered.length ? null : "No DePIN keyword matches — showing recent tweets if any",
  };
}

export function loadSocialSourcesConfig() {
  const defaults = {
    xSources: [],
    keywords: [
      "depin",
      "weatherxm",
      "geodnet",
      "hivemapper",
      "dimo",
      "helium",
      "minima",
      "iotex",
      "verification",
      "attestation",
      "proof of origin",
      "device authenticity",
      "fraud",
    ],
  };
  if (!fs.existsSync(SOCIAL_SOURCES_CONFIG)) return defaults;
  try {
    const cfg = JSON.parse(fs.readFileSync(SOCIAL_SOURCES_CONFIG, "utf8"));
    return {
      xSources: Array.isArray(cfg.xSources) ? cfg.xSources : defaults.xSources,
      keywords: Array.isArray(cfg.keywords) && cfg.keywords.length
        ? cfg.keywords
        : defaults.keywords,
    };
  } catch {
    return defaults;
  }
}

function loadFeedsConfig() {
  if (fs.existsSync(FEEDS_CONFIG)) {
    try {
      const cfg = JSON.parse(fs.readFileSync(FEEDS_CONFIG, "utf8"));
      if (Array.isArray(cfg.feeds) && cfg.feeds.length) return cfg.feeds;
    } catch {
      /* fall through */
    }
  }
  return DEFAULT_RSS_FEEDS;
}

function parseRssXml(xml, feedLabel) {
  const items = [];
  const chunks = xml.split("<item>").slice(1);
  for (const chunk of chunks.slice(0, 8)) {
    const title = chunk.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i)?.[1]?.trim();
    const link = chunk.match(/<link>([^<]+)<\/link>/i)?.[1]?.trim();
    const pub = chunk.match(/<pubDate>([^<]+)<\/pubDate>/i)?.[1]?.trim();
    const desc = chunk
      .match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i)?.[1]
      ?.replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 200);
    if (title) items.push({ feed: feedLabel, title, link, pubDate: pub, excerpt: desc });
  }
  return items;
}

export async function ingestRss({ fetchLive = false } = {}) {
  if (!fetchLive && fs.existsSync(RSS_CACHE_PATH)) {
    try {
      const cached = JSON.parse(fs.readFileSync(RSS_CACHE_PATH, "utf8"));
      return {
        items: cached.items || [],
        fetchedAt: cached.fetchedAt || null,
        fromCache: true,
      };
    } catch {
      /* rebuild */
    }
  }

  if (!fetchLive) {
    return {
      items: [],
      fetchedAt: null,
      fromCache: false,
      hint: "Run npm run command-center:build -- --fetch-rss when online to cache feeds locally",
    };
  }

  const feeds = loadFeedsConfig();
  const items = [];
  for (const feed of feeds) {
    try {
      const res = await fetch(feed.url, {
        headers: { "user-agent": "GetKinetik-CommandCenter/1.0 (local)" },
        signal: AbortSignal.timeout(12_000),
      });
      if (!res.ok) continue;
      const xml = await res.text();
      items.push(...parseRssXml(xml, feed.label || feed.id));
    } catch {
      /* offline — keep partial */
    }
  }

  const payload = { fetchedAt: new Date().toISOString(), items };
  fs.mkdirSync(path.dirname(RSS_CACHE_PATH), { recursive: true });
  fs.writeFileSync(RSS_CACHE_PATH, JSON.stringify(payload, null, 2), "utf8");
  return { items, fetchedAt: payload.fetchedAt, fromCache: false };
}

export function ingestGitHubIssues({ refresh = false } = {}) {
  if (!refresh && fs.existsSync(GITHUB_CACHE_PATH)) {
    try {
      const raw = JSON.parse(fs.readFileSync(GITHUB_CACHE_PATH, "utf8"));
      const issues = Array.isArray(raw) ? raw : raw.issues || [];
      return {
        fetchedAt: raw.fetchedAt || null,
        repo: raw.repo || null,
        issues,
        fromCache: true,
        error: null,
      };
    } catch {
      /* refetch */
    }
  }

  let issues = [];
  let repo = null;
  let error = null;

  try {
    repo = execFileSync("git", ["remote", "get-url", "origin"], {
      cwd: REPO_ROOT,
      encoding: "utf8",
    }).trim();
  } catch {
    repo = null;
  }

  if (refresh || !fs.existsSync(GITHUB_CACHE_PATH)) {
    try {
      const raw = execFileSync(
        "gh",
        [
          "issue",
          "list",
          "--state",
          "open",
          "--limit",
          "30",
          "--json",
          "number,title,labels,state,updatedAt,url,assignees",
        ],
        { cwd: REPO_ROOT, encoding: "utf8", timeout: 15_000 },
      );
      issues = JSON.parse(raw);
      const payload = { fetchedAt: new Date().toISOString(), repo, issues };
      fs.mkdirSync(path.dirname(GITHUB_CACHE_PATH), { recursive: true });
      fs.writeFileSync(GITHUB_CACHE_PATH, JSON.stringify(payload, null, 2), "utf8");
      return { ...payload, fromCache: false, error: null };
    } catch (e) {
      error = e.message?.includes("gh")
        ? "Install GitHub CLI (`gh auth login`) or drop github-issues.json in imports/"
        : String(e.message || e);
    }
  }

  return {
    fetchedAt: null,
    repo,
    issues,
    fromCache: false,
    error,
    hint: "Run: gh issue list --json number,title,labels,state,updatedAt,url > docs/bureau/private/imports/github-issues.json",
  };
}

export function ingestGitStatus() {
  const out = {
    branch: null,
    clean: true,
    modified: 0,
    untracked: 0,
    ahead: 0,
    behind: 0,
    recentCommits: [],
    error: null,
  };

  try {
    out.branch = execFileSync("git", ["branch", "--show-current"], {
      cwd: REPO_ROOT,
      encoding: "utf8",
    }).trim();
    const status = execFileSync("git", ["status", "--porcelain"], {
      cwd: REPO_ROOT,
      encoding: "utf8",
    });
    const lines = status.split("\n").filter(Boolean);
    out.modified = lines.filter((l) => l.startsWith(" M") || l.startsWith("M")).length;
    out.untracked = lines.filter((l) => l.startsWith("??")).length;
    out.clean = lines.length === 0;

    try {
      const ab = execFileSync("git", ["rev-list", "--left-right", "--count", "HEAD...@{u}"], {
        cwd: REPO_ROOT,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      }).trim();
      const [ahead, behind] = ab.split(/\s+/).map(Number);
      out.ahead = ahead || 0;
      out.behind = behind || 0;
    } catch {
      /* no upstream */
    }

    const log = execFileSync(
      "git",
      ["log", "-5", "--format=%h|%s|%cr"],
      { cwd: REPO_ROOT, encoding: "utf8" },
    );
    out.recentCommits = log
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        const [hash, subject, when] = line.split("|");
        return { hash, subject, when };
      });
  } catch (e) {
    out.error = String(e.message || e);
  }

  return out;
}

export function ensureImportDirs() {
  fs.mkdirSync(IMPORTS_DIR, { recursive: true });
  fs.mkdirSync(X_IMPORT_DIR, { recursive: true });
  fs.mkdirSync(NOTES_DIR, { recursive: true });
  fs.mkdirSync(path.dirname(RSS_CACHE_PATH), { recursive: true });
}
