// Twitter/X copy composer — short, post-ready tweets from bureau stats (not raw report dumps).

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
      `${name} public read (neutral bureau): ${body} Worth cross-checking vs your registry. ${AUDITS_URL}`,
    );
  }

  if (stats?.overCapacityCells != null) {
    const body = `${stats.overCapacityCells.toLocaleString()} cells over designed capacity${fmtDelta(stats.overCapacityCells, prevStats?.overCapacityCells)}.`;
    return fitTweet(
      `${name} public read (neutral bureau): ${body} Friendly second read on public data. ${AUDITS_URL}`,
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
      `${name} public read (neutral bureau): ${hook} Reproducible methodology. Your verifier still runs. ${AUDITS_URL}`,
    );
  }

  return fitTweet(
    `GETKINETIK neutral DePIN bureau — reproducible public read on ${name}. Friendly helper, second read not replacement. ${AUDITS_URL}`,
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
        `Weekly ${primary.name} delta: duplicate coordinate pairs ${prevStats.exactDupGroups} → ${stats.exactDupGroups} (${d > 0 ? "+" : ""}${d}). Neutral bureau public read — worth a registry cross-check. ${AUDITS_URL}`,
      );
    }
  }

  if (stats?.overCapacityCells != null && prevStats?.overCapacityCells != null) {
    const d = stats.overCapacityCells - prevStats.overCapacityCells;
    if (d !== 0) {
      return fitTweet(
        `Weekly ${primary.name} delta: over-capacity cells ${prevStats.overCapacityCells} → ${stats.overCapacityCells} (${d > 0 ? "+" : ""}${d}). Public data read — friendly second opinion. ${AUDITS_URL}`,
      );
    }
  }

  if (stats?.top20ShareOfSupply != null && prevStats?.top20ShareOfSupply != null) {
    const d = (stats.top20ShareOfSupply - prevStats.top20ShareOfSupply) * 100;
    if (Math.abs(d) >= 0.05) {
      return fitTweet(
        `Weekly ${primary.name} delta: top-20 HONEY share ${(prevStats.top20ShareOfSupply * 100).toFixed(1)}% → ${(stats.top20ShareOfSupply * 100).toFixed(1)}%. On-chain public read. ${AUDITS_URL}`,
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
      ? `Pattern worth cross-checking: ${hook}. Full methodology in report. ${reportUrl}`
      : `Full reproducible report: ${reportUrl}`,
  );
  return { tweet1, tweet2 };
}

export function composeVerifyTweet() {
  return fitTweet(
    "Optional DePIN trust sanity check: POST getkinetik.app/api/verify-device → valid/invalid + device age + signed chain. Your verifier still runs. npm i @getkinetik/verify",
  );
}

export function tweetMeta(text) {
  const len = tweetLength(text);
  return { length: len, ok: len <= TWITTER_LIMIT, overBy: Math.max(0, len - TWITTER_LIMIT) };
}

function formatTweetBlock(label, text) {
  const meta = tweetMeta(text);
  const status = meta.ok ? `${meta.length}/280 ✓` : `${meta.length}/280 ⚠️ over by ${meta.overBy}`;
  return `### ${label} (${status})\n\n\`\`\`\n${text}\n\`\`\``;
}

export function formatPostsMarkdown({ sampleTweet, verifyTweet, deltaTweet, deltaThread, linkedIn, today }) {
  const parts = [
    `# Bureau post drafts — ${today}`,
    "",
    "> **Do not auto-post.** Copy the tweet block below — already sized for Twitter/X.",
    "",
    "---",
    "",
    formatTweetBlock("Twitter/X — post this (sample read or daily rotation)", sampleTweet),
    "",
    "---",
    "",
    formatTweetBlock("Twitter/X — verify-device (~1×/week)", verifyTweet),
  ];

  if (deltaTweet) {
    parts.push("", "---", "", formatTweetBlock("Twitter/X — delta post (when something moved)", deltaTweet));
  }
  if (deltaThread) {
    parts.push(
      "",
      "### Twitter/X — delta thread (optional 2-tweet version)",
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
    "### LinkedIn (optional)",
    "",
    "```",
    linkedIn,
    "```",
    "",
    "---",
    "",
    "## Guardrails",
    "",
    "- Say **pattern** / **worth cross-checking** — not \"fraud proved\"",
    "- Link getkinetik.app/audits.html or GitHub report",
    "- **Do not auto-post**",
    "",
  );

  return parts.join("\n");
}

export function formatDeltaPostsMarkdown({ changed, deltaTweet, deltaThread, linkedIn, today }) {
  if (!changed.length) {
    return `# Delta post drafts — ${today}

> **No material snapshot deltas today.** Skip the sample-read post — patterns stable vs last run.

${formatTweetBlock("Optional (~1×/week)", composeVerifyTweet())}

_Full rotation posts in [latest-posts.md](./latest-posts.md)._
`;
  }

  const bullets = changed
    .map((r) => `- **${r.name}:** ${r.snapshotDelta || "see report"}`)
    .join("\n");

  const parts = [
    `# Delta post drafts — ${today}`,
    "",
    `> **Post only when something moved.** ${changed.length} network(s) with material deltas.`,
    "",
    "## What changed",
    "",
    bullets,
    "",
    "---",
    "",
    formatTweetBlock("Twitter/X — copy this", deltaTweet || ""),
  ];

  if (deltaThread) {
    parts.push(
      "",
      "### Thread version (reply to tweet 1 with tweet 2)",
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
    "---",
    "",
    "## Guardrails",
    "",
    "- Pattern language only — not \"fraud proved\"",
    "- **Do not auto-post**",
    "",
  );

  return parts.join("\n");
}
