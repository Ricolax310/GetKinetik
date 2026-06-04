// Intelligence clustering, mention radar, opportunity detection.

const CLUSTERS = [
  { id: "weather", label: "Weather", re: /weather|weatherxm|sensor|climate|ambient|air quality|meteo/i },
  { id: "mapping", label: "Mapping", re: /hivemapper|map|mapping|geo|rtk|gnss|geodnet|onocoy|wingbits|location/i },
  { id: "wireless", label: "Wireless", re: /helium|wireless|5g|mobile|wifi|broadband|dabba|telecom|roam/i },
  { id: "ai", label: "AI", re: /\bai\b|gpu|compute|inference|grass|render|akash|fluence|crynux|375ai/i },
  { id: "infrastructure", label: "Infrastructure", re: /infrastructure|rpc|helius|iotex|peaq|solana|chain|node|validator/i },
  { id: "funding", label: "Funding", re: /fund|series|raise|grant|invest|vc|capital|million|seed/i },
];

const MENTION_SIGNALS = [
  { id: "verification", label: "Verification", re: /verif(y|ication)|attestation|integrity|sybil|proof of origin|poo\b|device trust/i },
  { id: "attestation", label: "Attestation", re: /attestation|signed evidence|bureau|neutral read/i },
  { id: "device", label: "Device integrity", re: /device (identity|integrity|auth)|hardware trust|operator trust/i },
  { id: "poo", label: "Proof of origin", re: /proof of origin|heartbeat log|portable evidence/i },
  { id: "fraud", label: "Fraud discussion", re: /fraud|spoof|bot farm|fake node|abuse|gaming rewards/i },
  { id: "partnership", label: "Partnership opportunity", re: /partnership|partner with|integration|ecosystem lead|grants?/i },
  { id: "ai-trust", label: "AI trust", re: /ai trust|model integrity|training data provenance/i },
];

const TRACKED_NETWORKS = [
  { id: "depin", label: "DePIN", re: /\bdepin\b/i },
  { id: "weatherxm", label: "WeatherXM", re: /weatherxm|@weatherxm/i },
  { id: "geodnet", label: "GEODNET", re: /geodnet|@geodnet_/i },
  { id: "hivemapper", label: "Hivemapper", re: /hivemapper/i },
  { id: "dimo", label: "DIMO", re: /\bdimo\b|@dimo_network/i },
  { id: "helium", label: "Helium", re: /\bhelium\b/i },
  { id: "minima", label: "Minima", re: /\bminima\b|@minima_/i },
  { id: "iotex", label: "IoTeX", re: /iotex|@iotex/i },
];

const RADAR_SIGNALS = [
  { type: "launch", re: /launch|mainnet|testnet|goes live|now live|announces network/i, weight: 3 },
  { type: "funding", re: /raises|raised|series [a-d]|seed round|grant from|funding/i, weight: 2 },
  { type: "partnership", re: /partner(s|ship)|integrat(es|ion)|collaborat/i, weight: 2 },
  { type: "new-project", re: /new depin|introducing|meet @|welcome to|stealth/i, weight: 2 },
  { type: "pilot-candidate", re: /sensor|station|mapper|operator|device|rewards|sybil|registry/i, weight: 1 },
];

function blob(item) {
  return `${item.title || ""} ${item.excerpt || ""} ${item.text || ""}`.toLowerCase();
}

export function clusterIntelItem(item) {
  const text = blob(item);
  const tags = CLUSTERS.filter((c) => c.re.test(text)).map((c) => c.id);
  return { ...item, clusters: tags.length ? tags : ["infrastructure"] };
}

export function buildClusteredFeed(items) {
  const enriched = items.map(clusterIntelItem);
  const byCluster = {};
  for (const c of CLUSTERS) byCluster[c.id] = { label: c.label, items: [] };
  byCluster.other = { label: "Other", items: [] };

  for (const item of enriched) {
    const primary = item.clusters[0] || "other";
    if (byCluster[primary]) byCluster[primary].items.push(item);
    else byCluster.other.items.push(item);
  }

  return {
    all: enriched.slice(0, 20),
    clusters: Object.entries(byCluster)
      .filter(([, v]) => v.items.length)
      .map(([id, v]) => ({ id, label: v.label, items: v.items.slice(0, 8) })),
  };
}

export function detectMentionOpportunities(items) {
  const hits = [];
  for (const item of items) {
    const text = blob(item);
    const signals = MENTION_SIGNALS.filter((s) => s.re.test(text));
    if (!signals.length) continue;
    hits.push({
      title: (item.title || item.text || "").slice(0, 160),
      url: item.url || item.link || null,
      source: item.source || item.feed || "Intel",
      signals: signals.map((s) => s.label),
      score: signals.length * 10 + (item.kind === "x" ? 5 : 0),
    });
  }
  return hits.sort((a, b) => b.score - a.score).slice(0, 8);
}

function classifySocialSignals(item) {
  const text = blob(item);
  const signals = MENTION_SIGNALS.filter((s) => s.re.test(text)).map((s) => s.id);
  const networks = TRACKED_NETWORKS.filter((n) => n.re.test(text)).map((n) => n.id);
  return { signals, networks };
}

export function buildSocialIntelligenceAgent({
  xItems = [],
  rssItems = [],
  configuredSources = [],
  configuredKeywords = [],
}) {
  const normalized = [
    ...xItems.map((x) => ({
      source: "X",
      title: x.text || "",
      text: x.text || "",
      at: x.created || null,
      url: x.url || null,
      kind: "x",
    })),
    ...rssItems.map((r) => ({
      source: r.feed || "RSS",
      title: r.title || "",
      text: `${r.title || ""} ${r.excerpt || ""}`,
      at: r.pubDate || null,
      url: r.link || null,
      kind: "rss",
    })),
  ];

  const mentionCounts = Object.fromEntries(TRACKED_NETWORKS.map((n) => [n.id, 0]));
  const highSignalItems = [];
  const keywordRegex =
    configuredKeywords.length > 0
      ? new RegExp(configuredKeywords.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|"), "i")
      : null;

  for (const item of normalized) {
    const { signals, networks } = classifySocialSignals(item);
    for (const n of networks) mentionCounts[n] = (mentionCounts[n] || 0) + 1;

    const signalScore = signals.length * 12 + networks.length * 8 + (item.kind === "x" ? 4 : 0);
    const hasConfiguredSource =
      configuredSources.length === 0 ||
      configuredSources.some((src) => item.text.toLowerCase().includes(String(src).toLowerCase().replace(/^@/, "")));
    const hasConfiguredKeyword = !keywordRegex || keywordRegex.test(item.text);

    if (signals.length === 0) continue;
    if (!hasConfiguredSource && !hasConfiguredKeyword) continue;
    if (signalScore < 20) continue;

    highSignalItems.push({
      title: item.title.slice(0, 180),
      url: item.url,
      source: item.source,
      at: item.at,
      networks,
      signalTypes: signals,
      score: signalScore,
      network: networks[0] || "depin",
      signalType: signals[0] || "discussion",
    });
  }

  highSignalItems.sort((a, b) => b.score - a.score);
  return {
    configuredSources,
    configuredKeywords,
    trackedNetworks: TRACKED_NETWORKS.map((n) => n.label),
    mentionCounts,
    highSignalItems: highSignalItems.slice(0, 20),
  };
}

export function buildOpportunityRadar({ rssItems, xItems, pilotPipeline, newsTitle }) {
  const raw = [];
  if (newsTitle) raw.push({ title: newsTitle, source: "News" });
  for (const i of rssItems) raw.push({ title: i.title, excerpt: i.excerpt, source: i.feed, url: i.link });
  for (const i of xItems) raw.push({ title: i.text, source: "X", text: i.text });

  const detected = [];
  for (const item of raw) {
    const text = blob(item);
    for (const sig of RADAR_SIGNALS) {
      if (!sig.re.test(text)) continue;
      detected.push({
        type: sig.type,
        title: (item.title || "").slice(0, 140),
        source: item.source,
        url: item.url || null,
        weight: sig.weight,
      });
    }
  }

  for (const p of pilotPipeline.slice(0, 6)) {
    detected.push({
      type: "pilot-candidate",
      title: `${p.org} — ${p.why?.slice(0, 90)}`,
      source: "Pilot pipeline",
      url: null,
      weight: p.difficulty === "Easy" ? 4 : 2,
      org: p.org,
    });
  }

  const scored = detected.map((d) => {
    let likelihood = 40;
    let fit = 50;
    let urgency = 30;
    if (d.type === "pilot-candidate") {
      likelihood = d.weight >= 4 ? 75 : 55;
      fit = 85;
      urgency = 60;
    }
    if (d.type === "funding") urgency += 20;
    if (d.type === "launch") urgency += 15;
    if (d.type === "partnership") fit += 15;
    const score = likelihood * 0.35 + fit * 0.4 + urgency * 0.25;
    const summary =
      d.type === "pilot-candidate" && d.org
        ? `${d.org} is a warm pilot target in your pipeline — ${d.title.replace(/^[^:]+:\s*/, "")}.`
        : `${d.type.replace(/-/g, " ")} signal from ${d.source}: ${d.title}.`;
    return {
      ...d,
      likelihood,
      strategicFit: fit,
      urgency,
      score: Math.round(score),
      summary,
    };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .filter((o, i, arr) => arr.findIndex((x) => x.title === o.title) === i);
}

export function buildMorningBriefItems({
  newsDigest = null,
  mentionHits,
  pilotRows,
  followUpsDue,
  partnerActivity,
}) {
  const items = [];
  if (newsDigest?.title || newsDigest?.summary) {
    items.push({
      kind: "news",
      label: "DePIN news",
      text: newsDigest.title || "Today's news scan",
      summary: newsDigest.summary,
      url: newsDigest.url,
    });
  }
  for (const m of mentionHits.slice(0, 2)) {
    items.push({
      kind: "mention",
      label: "Mention opportunity",
      text: m.title,
      summary: m.signals?.length
        ? `Signals: ${m.signals.join(", ")}. Worth a neutral reply if relevant to verification or attestation.`
        : m.title,
      url: m.url,
    });
  }
  for (const p of pilotRows.filter((r) => r.heat === "hot" || r.heat === "warm").slice(0, 2)) {
    items.push({
      kind: "pilot",
      label: "Pilot opportunity",
      text: `${p.company} — ${p.nextAction}`,
      summary: p.why
        ? `${p.company} (${p.heat}): ${p.why} Next: ${p.nextAction}.`
        : `${p.company}: ${p.nextAction}`,
      url: null,
    });
  }
  if (followUpsDue > 0) {
    items.push({
      kind: "followup",
      label: "Follow-ups due",
      text: `${followUpsDue} follow-up(s) due today`,
      summary: `${followUpsDue} CRM follow-up(s) are due today. Check the pipeline table and log touches after each reply.`,
      url: null,
    });
  }
  if (partnerActivity) {
    items.push({
      kind: "partner",
      label: "Partner activity",
      text: partnerActivity,
      summary: partnerActivity,
      url: null,
    });
  }
  return items.slice(0, 5);
}
