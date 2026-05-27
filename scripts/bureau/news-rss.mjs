// Fetch RSS/Atom items and Google News RSS search results (no API key).

const UA =
  "GETKINETIK-BureauNews/1.0 (+https://getkinetik.app; research bot; contact eric@outfromnothingllc.com)";

export async function fetchText(url, timeoutMs = 20_000) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ac.signal,
      headers: { "User-Agent": UA, Accept: "application/rss+xml, application/xml, text/xml, */*" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return await res.text();
  } finally {
    clearTimeout(t);
  }
}

function decodeEntities(s) {
  return String(s)
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/<[^>]+>/g, "")
    .trim();
}

function extractTag(block, tag) {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i");
  const m = block.match(re);
  return m ? decodeEntities(m[1]) : "";
}

/** Parse RSS 2.0 or Atom-ish feeds into normalized items. */
export function parseFeedXml(xml, source) {
  const items = [];
  const rssItems = xml.match(/<item[\s\S]*?<\/item>/gi) || [];
  for (const block of rssItems) {
    const title = extractTag(block, "title");
    const link = extractTag(block, "link") || block.match(/<link[^>]*href="([^"]+)"/i)?.[1];
    const pubDate = extractTag(block, "pubDate") || extractTag(block, "dc:date");
    const description = extractTag(block, "description").slice(0, 500);
    if (title && link) items.push({ title, link, pubDate, description, source });
  }
  if (items.length === 0) {
    const entries = xml.match(/<entry[\s\S]*?<\/entry>/gi) || [];
    for (const block of entries) {
      const title = extractTag(block, "title");
      const link =
        block.match(/<link[^>]*href="([^"]+)"/i)?.[1] || extractTag(block, "link");
      const pubDate = extractTag(block, "updated") || extractTag(block, "published");
      const description = extractTag(block, "summary").slice(0, 500);
      if (title && link) items.push({ title, link, pubDate, description, source });
    }
  }
  return items;
}

export function googleNewsRssUrl(query) {
  const q = encodeURIComponent(query);
  return `https://news.google.com/rss/search?q=${q}&hl=en-US&gl=US&ceid=US:en`;
}

export async function loadAllFeedItems(sourcesConfig) {
  const all = [];
  for (const feed of sourcesConfig.rssFeeds || []) {
    try {
      const xml = await fetchText(feed.url);
      const items = parseFeedXml(xml, feed.label || feed.id);
      all.push(...items.map((it) => ({ ...it, feedId: feed.id })));
    } catch (e) {
      console.error(`[news] RSS skip ${feed.id}: ${e.message}`);
    }
  }
  for (const q of sourcesConfig.googleNewsQueries || []) {
    try {
      const url = googleNewsRssUrl(q);
      const xml = await fetchText(url);
      const items = parseFeedXml(xml, `Google News: ${q}`);
      all.push(...items.map((it) => ({ ...it, query: q })));
    } catch (e) {
      console.error(`[news] Google News skip "${q}": ${e.message}`);
    }
  }
  return dedupeByLink(all);
}

function dedupeByLink(items) {
  const seen = new Set();
  const out = [];
  for (const it of items) {
    const key = it.link.split("?")[0];
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(it);
  }
  return out;
}

export function parseItemDate(item) {
  if (!item.pubDate) return null;
  const d = new Date(item.pubDate);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Score 0–100 for relevance to GETKINETIK bureau topics. */
export function scoreItem(item, sourcesConfig) {
  const text = `${item.title} ${item.description} ${item.source}`.toLowerCase();
  for (const pat of sourcesConfig.skipTitlePatterns || []) {
    if (text.includes(pat.toLowerCase())) return 0;
  }
  const keywords = [
    ["geodnet", 25],
    ["geod ", 15],
    ["rtk", 12],
    ["weatherxm", 25],
    ["wxm", 8],
    ["hivemapper", 22],
    ["honey", 10],
    ["depin", 18],
    ["decentralized physical", 15],
    ["proof of location", 12],
    ["gnss", 10],
    ["registry", 8],
    ["sybil", 6],
    ["attestation", 10],
    ["solana", 8],
    ["helium", 6],
    ["mapping", 6],
    ["robotics", 5],
    ["autonomous", 5],
  ];
  let score = 0;
  for (const [kw, pts] of keywords) {
    if (text.includes(kw)) score += pts;
  }
  const age = parseItemDate(item);
  if (age) {
    const days = (Date.now() - age.getTime()) / 86_400_000;
    if (days <= 3) score += 15;
    else if (days <= 7) score += 8;
    else if (days > 14) score -= 10;
  }
  return Math.min(100, score);
}

export function matchNetwork(item, registry) {
  const text = `${item.title} ${item.description}`.toLowerCase();
  const hits = [];
  for (const net of registry) {
    const id = net.id.toLowerCase();
    const name = net.name.toLowerCase();
    if (text.includes(id) || text.includes(name)) hits.push(net.id);
    if (id === "geodnet" && (text.includes("geodnet") || text.includes("geod "))) hits.push(net.id);
    if (id === "hivemapper" && text.includes("honey")) hits.push(net.id);
  }
  return [...new Set(hits)];
}
