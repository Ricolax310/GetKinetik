// Public brain for /bureau/ask — refreshed with audits, bureau brief, and DePIN news headlines.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadAllFeedItems, scoreItem } from "./news-rss.mjs";
import { loadEnvQuiet } from "./lib.mjs";
import {
  chunkText,
  embedTexts,
  DEFAULT_EMBED_MODEL,
} from "../../functions/api/_lib/hfEmbed.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const OUT = path.join(REPO_ROOT, "landing/data/depin-chat-context.json");
const NEUTRALITY = path.join(REPO_ROOT, "NEUTRALITY.md");
const AUDIT_INDEX = path.join(REPO_ROOT, "landing/data/bureau-audit-index.json");
const NEWS_SOURCES = path.join(__dirname, "news-sources.json");
const DAILY_DIR = path.join(REPO_ROOT, "docs/bureau/daily");
const LATEST_NEWS = path.join(DAILY_DIR, "latest-news.md");
const LATEST_BRIEF = path.join(DAILY_DIR, "latest-brief.md");

function sliceFile(p, max = 5000) {
  if (!fs.existsSync(p)) return "";
  const t = fs.readFileSync(p, "utf8");
  return t.length <= max ? t : `${t.slice(0, max)}\n…[truncated]`;
}

function parseLatestNewsMd() {
  if (!fs.existsSync(LATEST_NEWS)) return { topPick: null, headlines: [] };
  const md = fs.readFileSync(LATEST_NEWS, "utf8");
  const topTitle = md.match(/## Top pick\s*\n+\*\*([^*]+)\*\*/);
  const topSource = md.match(/- Source: (.+)/);
  const topUrl = md.match(/- URL: (\S+)/);

  const headlines = [];
  const tableSection = md.split("## All candidates today")[1];
  if (tableSection) {
    for (const line of tableSection.split("\n")) {
      const m = line.match(/^\|\s*(\d+)\s*\|\s*\[([^\]]+)\]/);
      if (m) {
        headlines.push({
          score: Number(m[1]),
          title: m[2].trim().slice(0, 140),
        });
      }
    }
  }

  return {
    topPick: topTitle
      ? {
          title: topTitle[1].trim(),
          source: topSource?.[1]?.trim() || null,
          url: topUrl?.[1]?.trim() || null,
        }
      : null,
    headlines: headlines.slice(0, 12),
  };
}

function parseLatestBriefPublic() {
  if (!fs.existsSync(LATEST_BRIEF)) return [];
  const md = fs.readFileSync(LATEST_BRIEF, "utf8");
  const lines = [];
  for (const line of md.split("\n")) {
    if (!line.startsWith("|") || line.includes("Network |")) continue;
    if (/^[\|\s-]+$/.test(line)) continue;
    const cells = line.split("|").map((c) => c.trim()).filter(Boolean);
    if (cells.length >= 3) {
      lines.push(`${cells[0]}: report ${cells[1]}, ${cells[3] || "see audits"}`);
    }
  }
  return lines.slice(0, 8);
}

async function fetchLiveHeadlines(limit = 18) {
  if (!fs.existsSync(NEWS_SOURCES)) return [];
  const sources = JSON.parse(fs.readFileSync(NEWS_SOURCES, "utf8"));
  const items = await loadAllFeedItems(sources);
  const scored = items
    .map((item) => ({ item, score: scoreItem(item, sources) }))
    .filter((x) => x.score >= 28)
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((x) => ({
    score: x.score,
    title: x.item.title.slice(0, 140),
    source: x.item.source,
    url: x.item.link?.split("?")[0] || null,
  }));
}

function formatNewsSection(newsFromFile, liveHeadlines) {
  const lines = ["## Recent DePIN / infrastructure news (headlines only)"];
  const seen = new Set();

  if (newsFromFile.topPick) {
    lines.push(
      `**Bureau news pick today:** ${newsFromFile.topPick.title}` +
        (newsFromFile.topPick.source ? ` (${newsFromFile.topPick.source})` : ""),
    );
    seen.add(newsFromFile.topPick.title.toLowerCase());
  }

  const merged = [];
  for (const h of newsFromFile.headlines) {
    const key = h.title.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      merged.push({ ...h, from: "daily scan" });
    }
  }
  for (const h of liveHeadlines) {
    const key = h.title.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      merged.push({ ...h, from: "live RSS" });
    }
  }

  if (!merged.length) {
    lines.push("(No headlines cached — chat uses bureau reads and charter.)");
    return lines.join("\n");
  }

  for (const h of merged.slice(0, 20)) {
    lines.push(`- [${h.score ?? "—"}] ${h.title} — ${h.source || "news"}`);
  }

  lines.push(
    "",
    "Visitors may ask how a headline relates to DePIN trust, registry hygiene, or neutral second reads. Do not quote paywalled articles; discuss themes and link to getkinetik.app/audits when relevant.",
  );
  return lines.join("\n");
}

export async function buildDepinChatContext(options = {}) {
  const fetchNews = options.fetchNews !== false;
  const now = new Date().toISOString();

  let networks = [];
  let auditUpdated = null;
  if (fs.existsSync(AUDIT_INDEX)) {
    try {
      const idx = JSON.parse(fs.readFileSync(AUDIT_INDEX, "utf8"));
      networks = idx.networks || [];
      auditUpdated = idx.updatedAt || null;
    } catch {
      networks = [];
    }
  }

  const networkLines = networks.map((n) => {
    const finding = (n.topFinding || "").replace(/\*\*/g, "").slice(0, 200);
    const gen = n.generatedAt ? ` (read ${n.generatedAt})` : "";
    return `- ${n.name}${gen}: ${finding || "public sample read on open data"}`;
  });

  const briefLines = parseLatestBriefPublic();
  const newsFromFile = parseLatestNewsMd();
  let liveHeadlines = [];
  if (fetchNews) {
    try {
      console.error("[depin-context] fetching live DePIN news headlines…");
      liveHeadlines = await fetchLiveHeadlines();
    } catch (e) {
      console.error(`[depin-context] live news skip: ${e.message}`);
    }
  }

  const newsSection = formatNewsSection(newsFromFile, liveHeadlines);

  const context = [
    "GETKINETIK is the neutral DePIN bureau at getkinetik.app — reproducible public reads, optional hardware-signed device evidence (Proof of Origin, verify-device API). Not a token, not custody, not an earnings aggregator.",
    "",
    `Context generated: ${now.slice(0, 16).replace("T", " ")} UTC`,
    auditUpdated ? `Public audit index updated: ${auditUpdated}` : "",
    "",
    "Topics you help with: DePIN trust, registry hygiene, economic concentration on-chain, RTK/mapping/weather network integrity patterns, why neutral third-party reads matter, Genesis Score as optional reference (not priced, not financial advice). You may discuss recent DePIN news headlines below in general terms.",
    "",
    "Never: accuse fraud as proved, shill tokens, price predictions, tell users to trust GETKINETIK servers blindly — point to public methodology and reproducible sources.",
    "",
    "## Neutrality charter (excerpt)",
    sliceFile(NEUTRALITY, 4500),
    "",
    "## Current public sample reads",
    networkLines.join("\n") || "(see getkinetik.app/audits.html)",
    "",
    briefLines.length ? "## Latest bureau brief (public summary)\n" + briefLines.join("\n") : "",
    "",
    newsSection,
    "",
    "Links: https://getkinetik.app/bureau/ | https://getkinetik.app/audits.html | https://getkinetik.app/bureau/ask/ | https://getkinetik.app/api/docs/",
  ]
    .filter(Boolean)
    .join("\n");

  const retrieval = await buildRetrievalIndex(context, options);

  return {
    version: retrieval ? 3 : 2,
    updatedAt: now.slice(0, 10),
    generatedAt: now,
    auditIndexUpdated: auditUpdated,
    networks: networks.map((n) => ({
      id: n.id,
      name: n.name,
      generatedAt: n.generatedAt,
      topFinding: (n.topFinding || "").replace(/\*\*/g, "").slice(0, 220),
    })),
    news: {
      topPick: newsFromFile.topPick,
      headlines: newsFromFile.headlines,
      liveHeadlines,
    },
    context,
    ...(retrieval ? { retrieval } : {}),
  };
}

/**
 * Pre-compute embeddings for the context, chunk by chunk, so the chat function
 * can retrieve only the relevant slices at query time instead of truncating.
 *
 * Only runs when an HF token is available (build machine / CI). When absent the
 * pack ships without embeddings and the chat function falls back to plain context.
 */
async function buildRetrievalIndex(context, options = {}) {
  if (options.embed === false) return null;
  loadEnvQuiet();
  const token = process.env.HF_TOKEN?.trim();
  if (!token) {
    console.error("[depin-context] no HF_TOKEN — skipping embeddings (chat falls back to plain context)");
    return null;
  }

  const model = process.env.BUREAU_EMBED_MODEL?.trim() || DEFAULT_EMBED_MODEL;
  const chunks = chunkText(context);
  if (!chunks.length) return null;

  try {
    console.error(`[depin-context] embedding ${chunks.length} chunks via ${model}…`);
    const vectors = await embedTexts({ texts: chunks, token, model, timeoutMs: 60_000 });
    if (vectors.length !== chunks.length) {
      throw new Error(`embedding count mismatch (${vectors.length} != ${chunks.length})`);
    }
    return {
      model,
      dims: vectors[0]?.length || 0,
      builtAt: new Date().toISOString(),
      chunks: chunks.map((text, i) => ({ text, embedding: vectors[i] })),
    };
  } catch (e) {
    console.error(`[depin-context] embedding failed (${e.message}) — shipping without retrieval`);
    return null;
  }
}

export async function writeDepinChatContext(options = {}) {
  const payload = await buildDepinChatContext(options);
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(payload, null, 2), "utf8");
  return path.relative(REPO_ROOT, OUT).replace(/\\/g, "/");
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename);
if (isMain) {
  writeDepinChatContext().then((p) => console.log(p)).catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
