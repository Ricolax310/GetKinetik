// Flat reading feed — news, bureau reads, RSS. No scores, ranking, or pipeline.

import fs from "node:fs";
import path from "node:path";
import { REPO_ROOT } from "./config.mjs";
import {
  readBureauNews,
  readBulletinDigest,
  bulletinIntelItem,
} from "./digest.mjs";
import { ingestRss, ingestXExports, ingestBureauReports } from "./ingest.mjs";

function stripScores(text) {
  return String(text || "")
    .replace(/\(\s*score\s+\d+\s*\)/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function loadAuditReads() {
  const p = path.join(REPO_ROOT, "scripts/data/bureau-audit-index.json");
  if (!fs.existsSync(p)) return [];
  try {
    const networks = JSON.parse(fs.readFileSync(p, "utf8")).networks || [];
    return networks
      .filter((n) => n.topFinding && n.generatedAt)
      .map((n) => ({
        title: n.name,
        summary: stripScores(n.topFinding.replace(/\*\*/g, "")),
        url: n.report
          ? `https://github.com/Ricolax310/GetKinetik/blob/main/${n.report.replace(/\\/g, "/")}`
          : null,
        source: "Bureau audit",
        asOf: n.generatedAt,
      }));
  } catch {
    return [];
  }
}

function newsItems(newsDigest) {
  const items = [];
  if (newsDigest.suggestedTweet) {
    items.push({
      title: "Suggested public snippet (from news scan)",
      summary: newsDigest.suggestedTweet,
      url: newsDigest.url,
      source: "Bureau news",
    });
  } else if (newsDigest.title) {
    items.push({
      title: newsDigest.title,
      summary: stripScores(newsDigest.summary || newsDigest.title),
      url: newsDigest.url,
      source: "Bureau news",
    });
  }
  for (const c of newsDigest.candidates || []) {
    if (items.length >= 8) break;
    if (c.url && items.some((x) => x.url === c.url)) continue;
    items.push({
      title: c.title,
      summary: stripScores(c.summary || c.title),
      url: c.url,
      source: c.source || "News scan",
    });
  }
  return items;
}

/**
 * @param {{ fetchRss?: boolean }} options
 */
export async function buildReadingFeed(options = {}) {
  const newsDigest = readBureauNews();
  const bulletinDigest = readBulletinDigest();
  const bureau = ingestBureauReports();
  const rss = await ingestRss({ fetchLive: Boolean(options.fetchRss) });
  const xExport = ingestXExports(15);

  const rssItems = (rss.items || []).slice(0, 8).map((item) => ({
    title: item.title,
    summary: stripScores(item.excerpt || item.title),
    url: item.link,
    source: item.feed || "RSS",
    at: item.pubDate || null,
  }));

  const xItems = (xExport.items || []).slice(0, 5).map((tw) => ({
    title: tw.text.slice(0, 120) + (tw.text.length > 120 ? "…" : ""),
    summary: tw.text,
    url: null,
    source: "X export",
    at: tw.created || null,
  }));

  const bulletinItem = bulletinIntelItem(bulletinDigest);
  const bulletinItems = bulletinItem
    ? [
        {
          title: bulletinItem.title,
          summary: stripScores(bulletinItem.summary),
          url: null,
          source: bulletinItem.source,
        },
      ]
    : [];

  if (bureau.featuredNetwork && bureau.featuredFinding) {
    bulletinItems.unshift({
      title: `Featured: ${bureau.featuredNetwork}`,
      summary: stripScores(bureau.featuredFinding),
      url: bureau.paths?.brief,
      source: "Bureau daily brief",
    });
  }

  const auditReads = loadAuditReads();
  const sections = [];

  const newsSectionItems = newsItems(newsDigest);
  if (newsSectionItems.length) {
    sections.push({ id: "news", title: "DePIN news", items: newsSectionItems });
  }
  if (rssItems.length) {
    sections.push({ id: "rss", title: "RSS feeds", items: rssItems });
  }

  const bureauItems = [...bulletinItems, ...auditReads];
  if (bureauItems.length) {
    sections.push({ id: "bureau", title: "Bureau reads", items: bureauItems });
  }
  if (xItems.length) {
    sections.push({ id: "x", title: "X / social exports", items: xItems });
  }

  const allItems = sections.flatMap((s) =>
    s.items.map((item) => ({ ...item, section: s.title })),
  );

  return {
    generatedAt: new Date().toISOString(),
    rssHint: rss.hint || null,
    xHint: xExport.hint || null,
    sections,
    allItems,
  };
}
