#!/usr/bin/env node
// Build static, crawlable SEO findings pages from the bureau audit index.
//
// Why: the live audits view is rendered client-side (audits-live.js), so search
// engines never index the actual numbers. These static pages put each network's
// real finding into indexable HTML so people Googling "<network> fake nodes /
// duplicate hotspots / sybil" land on the bureau — discovery that needs zero
// followers and compounds over time.
//
// Output (served by Cloudflare Pages from landing/):
//   landing/findings/index.html           — hub page (all findings)
//   landing/findings/<network-id>/index.html — one page per network
//   landing/sitemap.xml                    — regenerated with every public URL
//
// Source of truth: scripts/data/bureau-audit-index.json (+ scripts/bureau/networks.json).
// Re-run after each bureau scan: node scripts/bureau/build-findings-pages.mjs

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const SITE = "https://getkinetik.app";
const GITHUB_BLOB = "https://github.com/Ricolax310/GetKinetik/blob/main";
const CONTACT = "eric@outfromnothingllc.com";

const AUDIT_INDEX = path.join(REPO_ROOT, "scripts/data/bureau-audit-index.json");
const NETWORKS_REG = path.join(REPO_ROOT, "scripts/bureau/networks.json");
const OUT_DIR = path.join(REPO_ROOT, "landing/findings");
const SITEMAP = path.join(REPO_ROOT, "landing/sitemap.xml");

// ── Helpers ────────────────────────────────────────────────────────────────

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Strip markdown bold + emoji + collapse whitespace for plain prose. */
function clean(s) {
  return String(s ?? "")
    .replace(/\*\*/g, "")
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function num(v) {
  return typeof v === "number" && isFinite(v) ? v.toLocaleString("en-US") : null;
}

function pct(v) {
  return typeof v === "number" && isFinite(v) ? `${(v * 100).toFixed(2)}%` : null;
}

function clip(s, max) {
  const t = clean(s);
  if (t.length <= max) return t;
  const slice = t.slice(0, max - 1);
  const sp = slice.lastIndexOf(" ");
  return `${(sp > max * 0.6 ? slice.slice(0, sp) : slice).trimEnd()}…`;
}

// Short, keyword-forward concept per network for the <title> + H1.
const CONCEPT = {
  "helium-iot": "hotspot stacking",
  "helium-mobile": "hotspot stacking",
  geodnet: "duplicate stations",
  weatherxm: "over-capacity cells",
  hivemapper: "HONEY concentration",
  natix: "coverage metrics",
  dimo: "device-backing gap",
};

/** A tight headline (number-first) for titles, derived from the strongest stat. */
function shortHeadline(net) {
  const s = net.stats || {};
  if (typeof s.largestStack === "number") return `${num(s.largestStack)} on one GPS point`;
  if (typeof s.exactDupGroups === "number") return `${num(s.exactDupGroups)} identical-coordinate groups`;
  if (typeof s.overCapacityCells === "number") return `${num(s.overCapacityCells)} above designed limit`;
  if (typeof s.top20ShareOfSupply === "number") return `${pct(s.top20ShareOfSupply)} in top 20 wallets`;
  if (typeof s.hardwarePct === "number") return `${pct(s.hardwarePct)} backed by hardware`;
  return clip(net.topFinding, 48);
}

// ── Domain framing keyed by anomaly type (neutral bureau voice) ──────────────

const ANOMALY = {
  duplication_cluster: {
    label: "Duplicate-coordinate read",
    keyword: "duplicate GPS coordinates and stacked devices",
    whatItIs:
      "Multiple devices reporting the exact same GPS coordinate. At small counts this is normal — dense buildings, shared rooftops, and H3-hex snapping all produce shared coordinates legitimately. Large single-coordinate stacks are the documented stacking pattern that warrants a registry cross-check.",
    whatItIsnt:
      "This is not proof of fraud. Honest dense deployments can share a coordinate, and the bureau makes no accusation. The list is a review queue, not a verdict.",
  },
  capacity_violation: {
    label: "Over-capacity read",
    keyword: "map cells reporting more devices than they can physically hold",
    whatItIs:
      "Map cells that list more devices than the area can physically contain. The bureau surfaces the count and the cell index so the question can be asked from public data alone.",
    whatItIsnt:
      "This is not proof of fake devices. Over-capacity can come from registry double-counting or expected reward-zone behavior. Only the operator can settle the cause — the bureau just makes the count checkable.",
  },
  economic_concentration: {
    label: "Supply-concentration read",
    keyword: "token supply concentration across visible wallets",
    whatItIs:
      "A large share of visible token supply held by a small number of on-chain accounts. This is economic shape, computed from public chain data.",
    whatItIsnt:
      "This is not fraud and not a device-level claim. Treasuries, market makers, and exchanges all hold large wallets. The bureau cannot link wallets to operators — this is for treasury/market-structure context only.",
  },
  telemetry_discontinuity: {
    label: "Telemetry-continuity read",
    keyword: "public output metrics that flatline while sign-ups keep rising",
    whatItIs:
      "A public, cumulative output metric that stops moving while registrations keep climbing — visible from the network's own public feed.",
    whatItIsnt:
      "This is not proof of anything wrong. It is commonly an ETL or display freeze rather than a real activity change. The bureau asks the question; the operator confirms the cause.",
  },
};

// Per-network natural-language search terms, woven into title/description/intro.
const SEO_TERMS = {
  "helium-iot": "Helium IoT hotspot stacking, duplicate GPS hotspots, fake hotspots",
  "helium-mobile": "Helium Mobile hotspot stacking, duplicate coordinates, fake hotspots",
  geodnet: "GEODNET duplicate stations, RTK sybil risk, fake base stations",
  weatherxm: "WeatherXM over-capacity cells, fake weather stations, station density",
  hivemapper: "Hivemapper HONEY supply concentration, token distribution",
  natix: "Natix coverage metrics, mapping activity, driver registrations",
  dimo: "DIMO connected devices, vehicle data DePIN, real device share, aftermarket vs synthetic",
};

const STAT_LABELS = {
  observed: "Units observed (with coordinates)",
  flaggedCount: "Flagged (any heuristic)",
  flaggedPct: "Share of fleet flagged",
  exactDupGroups: "Exact duplicate-coordinate groups",
  nearDupClusters: "Near-duplicate clusters",
  tightClusters: "Tight clusters",
  lowPrecision: "Low-precision coordinates",
  overCapacityCells: "Cells over designed capacity",
  overCapacityPct: "Share of cells over capacity",
  drilledCells: "Cells drilled in detail",
  devicesInDrilled: "Devices in drilled cells",
  stackedSpots: "Coordinates holding 10+ units",
  largestStack: "Largest single-coordinate stack",
  unasserted: "On-chain with no asserted location",
  top20ShareOfSupply: "Top-20 wallet share of visible supply",
  supplyUiAmount: "Visible token supply",
  drivers: "Registered drivers",
  kmMapped: "Kilometers mapped (cumulative)",
};

const PCT_KEYS = new Set(["flaggedPct", "overCapacityPct", "top20ShareOfSupply"]);
const SKIP_STAT_KEYS = new Set(["generatedAt", "partASkipped", "largestAccountsReturned"]);

function statRows(stats) {
  if (!stats || typeof stats !== "object") return [];
  const rows = [];
  for (const [key, value] of Object.entries(stats)) {
    if (SKIP_STAT_KEYS.has(key)) continue;
    if (typeof value !== "number" || !isFinite(value)) continue;
    const label = STAT_LABELS[key] || key.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
    const display = PCT_KEYS.has(key) ? pct(value) : num(value);
    if (display) rows.push({ label, display });
  }
  return rows;
}

// ── Shared CSS (inline; CSP allows style 'unsafe-inline') ────────────────────

const STYLE = `
  :root{--bg:#0a0a0a;--soft:#111113;--edge:#1a1a1d;--accent:#1565C0;--ember:#90CAF9;
    --plat:#e8e8ea;--silver:#b8b8bd;--steel:#6e6e75;--flag:#FF6B6B}
  *{box-sizing:border-box;margin:0;padding:0}
  html,body{background:var(--bg);color:var(--plat);line-height:1.6;
    font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display","Inter","Segoe UI",system-ui,sans-serif;
    -webkit-font-smoothing:antialiased}
  a{color:var(--ember);text-decoration:none}
  a:hover{color:var(--plat)}
  .container{max-width:820px;margin:0 auto;padding:48px 22px 88px}
  header.top{display:flex;justify-content:space-between;align-items:center;gap:16px;
    padding-bottom:28px;border-bottom:1px solid var(--edge);margin-bottom:40px;flex-wrap:wrap}
  header.top .brand{font-weight:600;letter-spacing:.12em;font-size:13px;color:var(--ember)}
  .top-nav{display:flex;gap:14px;flex-wrap:wrap}
  .top-nav a{color:var(--silver);font-size:12px;letter-spacing:.08em;text-transform:uppercase}
  .eyebrow{color:var(--ember);font-size:12px;letter-spacing:.14em;text-transform:uppercase;margin-bottom:14px}
  h1{font-size:clamp(28px,5vw,44px);line-height:1.12;font-weight:700;letter-spacing:-.02em;margin-bottom:14px}
  h2{font-size:22px;font-weight:650;margin:40px 0 14px;letter-spacing:-.01em}
  p{color:var(--silver);margin-bottom:14px}
  .meta{font-size:13px;color:var(--steel);margin-bottom:8px}
  .meta code{color:var(--silver);background:var(--soft);padding:2px 6px;border-radius:5px;font-size:12px}
  .finding{background:var(--soft);border:1px solid var(--edge);border-left:3px solid var(--accent);
    border-radius:12px;padding:22px 24px;margin:26px 0;font-size:18px;color:var(--plat);line-height:1.5}
  table{width:100%;border-collapse:collapse;margin:18px 0;font-size:14px}
  th,td{text-align:left;padding:11px 12px;border-bottom:1px solid var(--edge)}
  th{color:var(--steel);font-weight:500;font-size:12px;letter-spacing:.04em;text-transform:uppercase}
  td.v{text-align:right;color:var(--plat);font-variant-numeric:tabular-nums;font-weight:600}
  .cols{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin:18px 0}
  .card{background:var(--soft);border:1px solid var(--edge);border-radius:12px;padding:18px 20px}
  .card h3{font-size:13px;letter-spacing:.06em;text-transform:uppercase;color:var(--ember);margin-bottom:8px}
  .card p{font-size:14px;margin:0}
  .cta{background:var(--soft);border:1px solid var(--edge);border-radius:12px;padding:22px 24px;margin:34px 0}
  .cta a{display:inline-block;margin-right:18px;font-size:14px}
  .pill{display:inline-block;background:rgba(21,101,192,.14);border:1px solid rgba(144,202,249,.3);
    color:var(--ember);font-size:11px;letter-spacing:.06em;text-transform:uppercase;
    padding:4px 10px;border-radius:999px;margin-bottom:18px}
  .others{display:flex;flex-wrap:wrap;gap:10px;margin-top:14px}
  .others a{background:var(--soft);border:1px solid var(--edge);border-radius:8px;padding:8px 12px;font-size:13px;color:var(--silver)}
  footer{margin-top:56px;padding-top:24px;border-top:1px solid var(--edge);font-size:12px;color:var(--steel)}
  @media(max-width:620px){.cols{grid-template-columns:1fr}}
`;

function head({ title, description, canonical, keywords }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"/>
<meta name="theme-color" content="#0A0A0A"/>
<meta name="color-scheme" content="dark"/>
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}"/>
<meta name="keywords" content="${esc(keywords)}"/>
<meta name="robots" content="index,follow,max-image-preview:large"/>
<link rel="canonical" href="${esc(canonical)}"/>
<meta property="og:type" content="article"/>
<meta property="og:title" content="${esc(title)}"/>
<meta property="og:description" content="${esc(description)}"/>
<meta property="og:url" content="${esc(canonical)}"/>
<meta property="og:site_name" content="GETKINETIK"/>
<meta property="og:image" content="${SITE}/og-image.png"/>
<meta property="og:image:width" content="1024"/>
<meta property="og:image:height" content="1024"/>
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:title" content="${esc(title)}"/>
<meta name="twitter:description" content="${esc(description)}"/>
<meta name="twitter:image" content="${SITE}/og-image.png"/>
<link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' fill='%230A0A0A'/%3E%3Cpolygon points='16,6 24,16 16,26 8,16' fill='%231565C0'/%3E%3C/svg%3E"/>
<style>${STYLE}</style>
</head>`;
}

function topNav() {
  return `<header class="top">
<span class="brand">GETKINETIK BUREAU</span>
<nav class="top-nav">
<a href="/">Home</a>
<a href="/findings/">Findings</a>
<a href="/bureau/">Bureau</a>
<a href="/verify/">Verify</a>
<a href="/api/docs/">API</a>
</nav>
</header>`;
}

function jsonLd(obj) {
  // Inline application/ld+json is a non-executable data block — not blocked by
  // script-src 'self'. Helps Google treat the page as a published report.
  return `<script type="application/ld+json">${JSON.stringify(obj)}</script>`;
}

// ── Per-network page ─────────────────────────────────────────────────────────

function buildNetworkPage(net, all) {
  const a = ANOMALY[net.anomalyType] || ANOMALY.duplication_cluster;
  const headline = clean(net.topFinding);
  const seoTerms = SEO_TERMS[net.id] || `${net.name} sybil risk, fake nodes`;
  const concept = CONCEPT[net.id] || "sybil-risk read";
  const canonical = `${SITE}/findings/${net.id}/`;
  let title = `${net.name} ${concept}: ${shortHeadline(net)} | GETKINETIK Bureau`;
  if (title.length > 65) title = `${net.name} ${concept}: ${shortHeadline(net)} | GETKINETIK`;
  const description = clip(
    `${headline} Independent, reproducible read of ${net.name}'s public data by the neutral GETKINETIK DePIN bureau — no token, no custody.`,
    300,
  );
  const rows = statRows(net.stats);
  const reportUrl = net.report ? `${GITHUB_BLOB}/${net.report}` : null;
  const source = net.publicSource ? clean(net.publicSource) : null;
  const asOf = net.generatedAt || (net.stats && net.stats.generatedAt) || null;

  const ld = jsonLd({
    "@context": "https://schema.org",
    "@type": "Report",
    headline: clip(`${net.name} — ${a.label}`, 110),
    about: `${net.name} DePIN network public-data Sybil-risk read`,
    datePublished: asOf,
    inLanguage: "en",
    isAccessibleForFree: true,
    url: canonical,
    keywords: seoTerms,
    publisher: {
      "@type": "Organization",
      name: "GETKINETIK Bureau",
      url: SITE,
    },
    description: clip(headline, 250),
  });

  const others = all
    .filter((o) => o.id !== net.id)
    .map((o) => `<a href="/findings/${o.id}/">${esc(o.name)}</a>`)
    .join("");

  const statsTable = rows.length
    ? `<h2>The numbers</h2>
<table>
<thead><tr><th>Metric</th><th class="v">Value</th></tr></thead>
<tbody>
${rows.map((r) => `<tr><td>${esc(r.label)}</td><td class="v">${esc(r.display)}</td></tr>`).join("\n")}
</tbody>
</table>`
    : "";

  const checkLine = net.verificationCall
    ? clean(net.verificationCall)
    : net.clarificationRequest
      ? clean(net.clarificationRequest)
      : `Reproduce the read from the public source above and cross-check the flagged entries against the registry.`;

  return `${head({ title, description, canonical, keywords: seoTerms })}
<body>
${ld}
<div class="container">
${topNav()}
<p class="eyebrow">Public-data read · neutral bureau</p>
<span class="pill">${esc(a.label)}</span>
<h1>${esc(net.name)}: public Sybil-risk read</h1>
${asOf ? `<p class="meta">As of <strong>${esc(String(asOf).slice(0, 10))}</strong></p>` : ""}
${source ? `<p class="meta">Public source: <code>${esc(source)}</code> · no auth, no internal data</p>` : ""}

<div class="finding">${esc(headline)}</div>

<p>This is an independent read of <strong>${esc(net.name)}</strong>'s own public data by the GETKINETIK bureau. We publish what the public endpoint returns — covering ${esc(a.keyword)} — so anyone can reproduce it. We hold no token in any network we read and take no equity in graded networks.</p>

${statsTable}

<h2>What this means — and what it doesn't</h2>
<div class="cols">
<div class="card"><h3>Worth a look</h3><p>${esc(a.whatItIs)}</p></div>
<div class="card"><h3>Not an accusation</h3><p>${esc(a.whatItIsnt)}</p></div>
</div>

<h2>How to confirm it</h2>
<p>${esc(checkLine)}</p>
<p>For an authoritative per-device grade — hardware-rooted signature, chain age, tamper flags — a network or operator can POST a Proof of Origin to <a href="/api/docs/">the verify-device API</a>.</p>

<div class="cta">
<h3 style="font-size:13px;letter-spacing:.06em;text-transform:uppercase;color:var(--ember);margin-bottom:12px">Go deeper</h3>
${reportUrl ? `<a href="${esc(reportUrl)}">Full methodology &amp; row-level table →</a>` : ""}
<a href="/verify/">Verify a device →</a>
<a href="mailto:${CONTACT}">Request the full table →</a>
</div>

<h2>Other networks the bureau reads</h2>
<div class="others">${others}</div>

<footer>
<p>GETKINETIK is an independent, neutral DePIN bureau. Findings cite public endpoints only and are reproducible. No token. No custody. No equity in graded networks.</p>
<p style="margin-top:8px"><a href="/findings/">← All findings</a> · <a href="/bureau/">About the bureau</a> · ${CONTACT}</p>
</footer>
</div>
</body>
</html>`;
}

// ── Hub page ─────────────────────────────────────────────────────────────────

function buildHubPage(all) {
  const canonical = `${SITE}/findings/`;
  const title = "DePIN Sybil-risk findings — public-data reads | GETKINETIK Bureau";
  const description =
    "Independent, reproducible Sybil-risk reads across major DePIN networks — Helium, GEODNET, WeatherXM and more. Duplicate coordinates, over-capacity cells, stacked hotspots. No token, no custody.";
  const keywords =
    "DePIN sybil, fake nodes, duplicate hotspots, Helium hotspot stacking, GEODNET duplicate stations, WeatherXM fake stations, DePIN fraud detection";

  const ld = jsonLd({
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "DePIN Sybil-risk findings",
    url: canonical,
    description,
    publisher: { "@type": "Organization", name: "GETKINETIK Bureau", url: SITE },
  });

  const cards = all
    .map((net) => {
      const a = ANOMALY[net.anomalyType] || ANOMALY.duplication_cluster;
      return `<div class="card" style="margin-bottom:14px">
<h3>${esc(net.name)} · ${esc(a.label)}</h3>
<p style="margin-bottom:12px">${esc(clip(net.topFinding, 220))}</p>
<a href="/findings/${net.id}/">Read the ${esc(net.name)} finding →</a>
</div>`;
    })
    .join("\n");

  return `${head({ title, description, canonical, keywords })}
<body>
${ld}
<div class="container">
${topNav()}
<p class="eyebrow">Neutral bureau · public-data reads</p>
<h1>What the bureau found</h1>
<p>The GETKINETIK bureau reads major DePIN networks on their own public data and publishes what the endpoints return — duplicate coordinates, over-capacity map cells, stacked hotspots, supply concentration. Every number below is reproducible with no API key and no internal access. We hold no token and take no equity in any network we read.</p>
${cards}
<div class="cta">
<a href="/bureau/">How the bureau works →</a>
<a href="/api/docs/">Verify-device API →</a>
<a href="mailto:${CONTACT}">Run a read on your network →</a>
</div>
<footer>
<p>GETKINETIK is an independent, neutral DePIN bureau. Findings cite public endpoints only. No token. No custody.</p>
</footer>
</div>
</body>
</html>`;
}

// ── Sitemap ──────────────────────────────────────────────────────────────────

function buildSitemap(all) {
  const today = new Date().toISOString().slice(0, 10);
  const staticUrls = [
    { loc: `${SITE}/`, priority: "1.0", changefreq: "weekly" },
    { loc: `${SITE}/findings/`, priority: "0.9", changefreq: "daily" },
    { loc: `${SITE}/bureau/`, priority: "0.8", changefreq: "weekly" },
    { loc: `${SITE}/bureau/why/`, priority: "0.6", changefreq: "monthly" },
    { loc: `${SITE}/verify/`, priority: "0.6", changefreq: "monthly" },
    { loc: `${SITE}/api/docs/`, priority: "0.5", changefreq: "monthly" },
  ];
  const networkUrls = all.map((net) => ({
    loc: `${SITE}/findings/${net.id}/`,
    priority: "0.8",
    changefreq: "daily",
    lastmod: (net.generatedAt || today).slice(0, 10),
  }));

  const entries = [...staticUrls, ...networkUrls]
    .map((u) => {
      const lastmod = u.lastmod ? `\n    <lastmod>${u.lastmod}</lastmod>` : "";
      return `  <url>
    <loc>${u.loc}</loc>${lastmod}
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</urlset>
`;
}

// ── Main ─────────────────────────────────────────────────────────────────────

function loadNetworks() {
  const index = JSON.parse(fs.readFileSync(AUDIT_INDEX, "utf8"));
  const reg = JSON.parse(fs.readFileSync(NETWORKS_REG, "utf8"));
  const regById = new Map((reg.networks || []).map((n) => [n.id, n]));

  // Only networks with a real headline finding get a page (no thin/empty pages).
  return (index.networks || [])
    .filter((n) => n.topFinding && clean(n.topFinding).length > 20)
    .map((n) => {
      const r = regById.get(n.id) || {};
      return {
        ...n,
        report: n.report || r.report || null,
        publicSource: n.publicSource || r.publicSource || null,
      };
    });
}

function main() {
  const networks = loadNetworks();
  if (!networks.length) {
    console.error("No networks with findings in the audit index — nothing to build.");
    process.exit(1);
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });

  for (const net of networks) {
    const dir = path.join(OUT_DIR, net.id);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "index.html"), buildNetworkPage(net, networks), "utf8");
  }

  fs.writeFileSync(path.join(OUT_DIR, "index.html"), buildHubPage(networks), "utf8");
  fs.writeFileSync(SITEMAP, buildSitemap(networks), "utf8");

  console.log(`Findings pages built (${networks.length} networks):`);
  console.log(`  Hub:     landing/findings/index.html`);
  for (const net of networks) {
    console.log(`  Network: landing/findings/${net.id}/index.html  (${net.name})`);
  }
  console.log(`  Sitemap: landing/sitemap.xml  (${networks.length + 6} URLs)`);
  console.log(`\nNext: commit + push, then submit ${SITE}/sitemap.xml in Google Search Console.`);
}

main();
