const TWITTER_LIMIT = 280;
const AUDITS_URL = "https://getkinetik.app/audits.html";

export function tweetLength(text) {
  return String(text).length;
}

/** Trim to fit Twitter limit without mid-word chop when possible. */
export function fitTweet(text, max = TWITTER_LIMIT) {
  const t = String(text).replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trim() + "…";
}

function fmtDelta(cur, prev) {
  if (typeof cur !== "number" || typeof prev !== "number" || cur === prev) return "";
  const d = cur - prev;
  const sign = d > 0 ? "+" : "";
  return ` (${sign}${d} since last run)`;
}

function shortenFinding(finding) {
  if (!finding) return null;
  let s = finding
    .replace(/\*\*/g, "")
    .replace(/\s*[📡⏱️🛰️].*$/u, "")
    .replace(/— each row in §\d+.*$/i, "")
    .replace(/; start with the largest counts in §\d+.*$/i, "")
    .replace(/ — .*$/i, (m) => (m.length > 60 ? "" : m))
    .trim();
  if (s.length > 100) s = s.slice(0, 99).trim() + "…";
  return s;
}

/**
 * @param {{ name: string, topFinding?: string|null }} row
 * @param {Record<string, number>|null} stats
 * @param {Record<string, number>|null} prevStats
 */
export function composeNetworkTweet(row, stats, prevStats) {
  const name = row.name;

  if (stats?.exactDupGroups != null && stats.observed != null) {
    const body = `${stats.exactDupGroups} exact duplicate coordinate pairs across ${stats.observed.toLocaleString()} ${name} stations${fmtDelta(stats.exactDupGroups, prevStats?.exactDupGroups)}.`;
    return fitTweet(
      `${name} public read: ${body} Methodology + station list on audits page. ${AUDITS_URL}`,
    );
  }

  if (stats?.overCapacityCells != null) {
    const body = `${stats.overCapacityCells.toLocaleString()} cells over designed capacity${fmtDelta(stats.overCapacityCells, prevStats?.overCapacityCells)}.`;
    return fitTweet(
      `${name} public read: ${body} Cell-level detail on audits page. ${AUDITS_URL}`,
    );
  }

  if (stats?.top20ShareOfSupply != null) {
    const pct = (stats.top20ShareOfSupply * 100).toFixed(1);
    let delta = "";
    if (typeof prevStats?.top20ShareOfSupply === "number") {
      const d = (stats.top20ShareOfSupply - prevStats.top20ShareOfSupply) * 100;
      if (Math.abs(d) >= 0.05) delta = ` (${d > 0 ? "+" : ""}${d.toFixed(1)} pp since last run)`;
    }
    return fitTweet(
      `${name} on-chain read: top-20 accounts ≈ ${pct}% of visible HONEY supply${delta}. Public data — cross-check vs your analytics. ${AUDITS_URL}`,
    );
  }

  const hook = shortenFinding(row.topFinding);
  if (hook) {
    return fitTweet(
      `${name} public read: ${hook} Reproducible methodology on audits page. ${AUDITS_URL}`,
    );
  }

  return fitTweet(
    `GETKINETIK public read on ${name} — reproducible methodology, open data. ${AUDITS_URL}`,
  );
}

export function composeDeltaTweet(changedRows, statsById) {
  if (!changedRows.length) return null;
  const primary = changedRows[0];
  const { stats, prevStats } = statsById[primary.id] || {};

  if (stats?.exactDupGroups != null && prevStats?.exactDupGroups != null) {
    const d = stats.exactDupGroups - prevStats.exactDupGroups;
    if (d !== 0) {
      return fitTweet(
        `${primary.name} weekly: duplicate coordinate pairs ${prevStats.exactDupGroups} → ${stats.exactDupGroups} (${d > 0 ? "+" : ""}${d}). Registry teams — grep list in report. ${AUDITS_URL}`,
      );
    }
  }

  if (stats?.overCapacityCells != null && prevStats?.overCapacityCells != null) {
    const d = stats.overCapacityCells - prevStats.overCapacityCells;
    if (d !== 0) {
      return fitTweet(
        `${primary.name} weekly: over-capacity cells ${prevStats.overCapacityCells} → ${stats.overCapacityCells} (${d > 0 ? "+" : ""}${d}). Full cell list on audits page. ${AUDITS_URL}`,
      );
    }
  }

  if (stats?.top20ShareOfSupply != null && prevStats?.top20ShareOfSupply != null) {
    const d = (stats.top20ShareOfSupply - prevStats.top20ShareOfSupply) * 100;
    if (Math.abs(d) >= 0.05) {
      return fitTweet(
        `${primary.name} weekly: top-20 HONEY share ${(prevStats.top20ShareOfSupply * 100).toFixed(1)}% → ${(stats.top20ShareOfSupply * 100).toFixed(1)}%. On-chain public read. ${AUDITS_URL}`,
      );
    }
  }

  return composeNetworkTweet(primary, stats, prevStats);
}

export function composeDeltaThread(changedRows, statsById) {
  const tweet1 = composeDeltaTweet(changedRows, statsById);
  if (!tweet1) return null;
  const primary = changedRows[0];
  const hook = shortenFinding(primary.topFinding);
  const reportUrl = `https://github.com/Ricolax310/GetKinetik/blob/main/${primary.report?.replace(/\\/g, "/")}`;
  const tweet2 = fitTweet(
    hook
      ? `${hook}. Full methodology + IDs in report. ${reportUrl}`
      : `Full report: ${reportUrl}`,
  );
  return { tweet1, tweet2 };
}

export function composeVerifyTweet() {
  return fitTweet(
    "Optional trust check: POST getkinetik.app/api/verify-device → valid/invalid + device age + signed chain. npm i @getkinetik/verify",
  );
}

export function tweetMeta(text) {
  const len = tweetLength(text);
  return { length: len, ok: len <= TWITTER_LIMIT, overBy: Math.max(0, len - TWITTER_LIMIT) };
}

function formatTweetBlock(label, text) {
  return `### ${label}\n\n\`\`\`\n${text}\n\`\`\``;
}

export function formatPostsMarkdown({ sampleTweet, verifyTweet, deltaTweet, deltaThread, linkedIn, today }) {
  const parts = [
    `# Bureau posts — ${today}`,
    "",
    "---",
    "",
    formatTweetBlock("Twitter/X — sample read", sampleTweet),
    "",
    "---",
    "",
    formatTweetBlock("Twitter/X — verify-device", verifyTweet),
  ];

  if (deltaTweet) {
    parts.push("", "---", "", formatTweetBlock("Twitter/X — weekly delta", deltaTweet));
  }
  if (deltaThread) {
    parts.push(
      "",
      "### Twitter/X — thread",
      "",
      "**Tweet 1**",
      "```",
      deltaThread.tweet1,
      "```",
      "",
      "**Tweet 2 (reply)**",
      "```",
      deltaThread.tweet2,
      "```",
    );
  }

  parts.push(
    "",
    "---",
    "",
    "### LinkedIn",
    "",
    "```",
    linkedIn,
    "```",
    "",
  );

  return parts.join("\n");
}

export function formatDeltaPostsMarkdown({ changed, deltaTweet, deltaThread, linkedIn, today }) {
  if (!changed.length) {
    return `# Bureau delta posts — ${today}

> No material fleet changes vs last run — patterns stable.

${formatTweetBlock("Twitter/X — verify-device", composeVerifyTweet())}

_Rotation posts in [latest-posts.md](./latest-posts.md)._
`;
  }

  const bullets = changed
    .map((r) => `- **${r.name}:** ${r.snapshotDelta || "see report"}`)
    .join("\n");

  const parts = [
    `# Bureau delta posts — ${today}`,
    "",
    `${changed.length} network(s) with material changes since last run.`,
    "",
    "## What changed",
    "",
    bullets,
    "",
    "---",
    "",
    formatTweetBlock("Twitter/X", deltaTweet || ""),
  ];

  if (deltaThread) {
    parts.push(
      "",
      "### Thread",
      "",
      "**Tweet 1**",
      "```",
      deltaThread.tweet1,
      "```",
      "",
      "**Tweet 2**",
      "```",
      deltaThread.tweet2,
      "```",
    );
  }

  parts.push(
    "",
    "---",
    "",
    "### LinkedIn",
    "",
    "```",
    linkedIn,
    "```",
    "",
  );

  return parts.join("\n");
}
