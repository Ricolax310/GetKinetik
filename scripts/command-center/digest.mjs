// Plain-language digests for the Command Center "here is everything" view.

import fs from "node:fs";
import path from "node:path";
import { REPO_ROOT } from "./config.mjs";

function readMd(relPath) {
  const p = path.join(REPO_ROOT, relPath);
  if (!fs.existsSync(p)) return "";
  return fs.readFileSync(p, "utf8");
}

function clean(s) {
  return String(s || "")
    .replace(/\r/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function stripMd(s) {
  return clean(String(s || "").replace(/\*\*/g, "").replace(/`/g, ""));
}

export function parseBureauNews(md) {
  if (!md) {
    return {
      title: null,
      url: null,
      score: null,
      suggestedTweet: null,
      internalNote: null,
      summary: null,
      candidates: [],
    };
  }

  const title = md.match(/\*\*([^*]+)\*\*\s*\n- URL:/)?.[1]?.trim() || null;
  const url = md.match(/\*\*[^*]+\*\*\s*\n- URL: (\S+)/)?.[1]?.trim() || null;
  const score = Number(md.match(/- Score: (\d+)/)?.[1]) || null;
  const suggestedTweet = clean(
    md.match(/### Suggested tweet\s*\n```\s*\n([\s\S]*?)```/)?.[1],
  );
  const internalNote = stripMd(md.match(/Internal: ([^\n]+)/)?.[1]);

  const candidates = [];
  for (const line of md.split("\n")) {
    if (!line.startsWith("|") || line.includes("Score |") || line.includes("---")) continue;
    const cells = line
      .split("|")
      .map((c) => c.trim())
      .filter(Boolean);
    if (cells.length < 3) continue;
    const scoreCell = cells[0];
    const titleCell = cells[1];
    const sourceCell = cells[2];
    if (!/^\d+$/.test(scoreCell)) continue;
    const linkMatch = titleCell.match(/\[([^\]]+)\]\(([^)]+)\)/);
    candidates.push({
      score: Number(scoreCell),
      title: clean(linkMatch?.[1] || titleCell),
      url: linkMatch?.[2] || null,
      source: sourceCell,
      summary: `${clean(linkMatch?.[1] || titleCell)} (${sourceCell}, score ${scoreCell}).`,
    });
  }

  let summary = null;
  if (suggestedTweet) {
    summary = suggestedTweet;
  } else if (title) {
    summary = `Top scanned story: ${title}${score != null ? ` (score ${score})` : ""}.`;
    if (candidates.length > 1) {
      summary += ` ${candidates.length - 1} more candidate${candidates.length === 2 ? "" : "s"} in today's bureau news scan.`;
    }
  }
  if (internalNote && summary) {
    summary += ` Route note: ${internalNote}.`;
  }

  return {
    title,
    url,
    score,
    suggestedTweet,
    internalNote,
    summary,
    candidates: candidates.slice(0, 8),
  };
}

export function readBureauNews() {
  return parseBureauNews(readMd("docs/bureau/daily/latest-news.md"));
}

export function parseBulletinDigest(md) {
  if (!md) return { lead: null, moved: [], weekPlan: [], summary: null };

  const leadBlock = md.match(/## Lead this week\s*\n\s*\*\*([^*]+)\*\* — ([^\n]+)/);
  const lead = leadBlock
    ? { network: leadBlock[1], finding: clean(leadBlock[2]) }
    : null;

  const moved = [];
  for (const line of md.split("\n")) {
    const m = line.match(/^- \*\*([^*]+):\*\* (.+)/);
    if (m) moved.push({ network: m[1], change: stripMd(m[2]) });
  }

  const weekPlan = [];
  const weekSection = md.match(/## This week\s*\n([\s\S]*?)(?=\n---|\n## |$)/);
  if (weekSection) {
    for (const line of weekSection[1].split("\n")) {
      const m = line.match(/^\d+\.\s+(.+)/);
      if (m) weekPlan.push(stripMd(m[1]));
    }
  }

  const parts = [];
  if (lead) parts.push(`${lead.network}: ${lead.finding}`);
  if (moved.length) {
    parts.push(
      `What moved: ${moved.map((x) => `${x.network} (${x.change})`).join("; ")}.`,
    );
  }
  if (weekPlan.length) {
    parts.push(`This week: ${weekPlan.join(" ")}`);
  }

  return {
    lead,
    moved,
    weekPlan,
    summary: parts.length ? parts.join(" ") : null,
  };
}

export function readBulletinDigest() {
  return parseBulletinDigest(readMd("docs/bureau/papers/latest-bulletin.md"));
}

export function bulletinIntelItem(bulletinDigest) {
  if (!bulletinDigest?.summary) return null;
  const title = bulletinDigest.lead
    ? `Lead: ${bulletinDigest.lead.network} — ${bulletinDigest.lead.finding}`
    : "Weekly bureau bulletin";
  return {
    source: "Bureau bulletin",
    title,
    summary: bulletinDigest.summary,
    url: "docs/bureau/papers/latest-bulletin.md",
    kind: "bulletin",
    at: null,
  };
}

export function parseOperatorDigest(md) {
  const today = [];
  const waitRules = [];
  if (!md) return { today, waitRules, summary: null };

  const todaySection = md.match(/## Do today \(you\)\s*\n([\s\S]*?)(?=\n---|\n## |$)/);
  if (todaySection) {
    for (const line of todaySection[1].split("\n")) {
      const m = line.match(/^- \[[ x]\]\s+(.+)/i);
      if (m) today.push(stripMd(m[1]));
    }
  }

  const waitSection = md.match(/## Do not do \(wait rules\)\s*\n([\s\S]*?)(?=\n---|\n## |$)/);
  if (waitSection) {
    for (const line of waitSection[1].split("\n")) {
      if (!line.startsWith("- **")) continue;
      waitRules.push(stripMd(line.replace(/^- /, "")));
    }
  }

  const summaryParts = [];
  if (today.length) {
    summaryParts.push(`Your checklist today: ${today.slice(0, 4).join("; ")}${today.length > 4 ? "…" : ""}.`);
  }
  if (waitRules.length) {
    summaryParts.push(`Wait rules active: ${waitRules.slice(0, 2).join(" ")}`);
  }

  return {
    today,
    waitRules,
    summary: summaryParts.length ? summaryParts.join(" ") : null,
  };
}

function summarizePipeline(pilotRows = [], crmMetrics = {}) {
  const warm = pilotRows.filter((p) => p.heat === "warm" || p.heat === "hot");
  const contactToday = pilotRows.filter((p) => p.shouldContactToday);
  const onWait = pilotRows.filter((p) => p.onWait);

  const bullets = warm.slice(0, 5).map(
    (p) =>
      `${p.company} (${p.heat}, score ${p.warmnessScore ?? 0}): ${p.nextAction}${p.onWait ? " — on wait" : ""}.`,
  );

  const parts = [
    `${warm.length} warm target${warm.length === 1 ? "" : "s"}`,
    contactToday.length
      ? `${contactToday.length} flagged for contact today`
      : "none flagged for contact today",
    crmMetrics.followUpsDue
      ? `${crmMetrics.followUpsDue} follow-up(s) due`
      : "no follow-ups due",
    crmMetrics.outreachSentThisWeek != null
      ? `${crmMetrics.outreachSentThisWeek} outreach touch(es) logged this week`
      : null,
  ].filter(Boolean);

  return {
    summary: `Pilot pipeline: ${parts.join("; ")}.`,
    bullets,
    contactToday: contactToday.map((p) => `${p.company}: ${p.nextAction}`),
    onWait: onWait.map((p) => p.company),
  };
}

function summarizeSocial(socialAgent = {}) {
  const counts = socialAgent.mentionCounts || {};
  const totalMentions = Object.values(counts).reduce((a, b) => a + (b || 0), 0);
  const highSignal = socialAgent.highSignalItems || [];

  if (!totalMentions && !highSignal.length) {
    return {
      summary:
        "No social or RSS signals ingested yet. Add X exports under docs/bureau/private/imports/x/ or run with --fetch-rss.",
      bullets: [],
    };
  }

  const bullets = highSignal.slice(0, 5).map((item) => {
    const nets = (item.networks || []).join(", ") || item.network || "DePIN";
    return `${nets}: ${clean(item.title)} (${(item.signalTypes || [item.signalType]).filter(Boolean).join(", ") || "signal"}).`;
  });

  const activeNets = Object.entries(counts)
    .filter(([, n]) => n > 0)
    .map(([k, n]) => `${k} (${n})`)
    .join(", ");

  return {
    summary: activeNets
      ? `Tracked mentions today: ${activeNets}.${highSignal.length ? ` ${highSignal.length} high-signal item(s) surfaced.` : ""}`
      : "Social sources configured but no keyword matches in current feed.",
    bullets,
  };
}

function summarizeBureau(bureau = {}, bulletin = {}) {
  const networkBullets = (bureau.networks || []).slice(0, 6).map(
    (n) => `${n.network}: ${clean(n.finding)} (${n.outreach} outreach).`,
  );

  const parts = [];
  if (bureau.featuredNetwork && bureau.featuredFinding) {
    parts.push(
      `Featured read — ${bureau.featuredNetwork}: ${clean(bureau.featuredFinding)}`,
    );
  }
  if (bulletin.summary) parts.push(bulletin.summary);

  return {
    summary: parts.length
      ? parts.join(" ")
      : "No bureau daily brief parsed. Run bureau daily workflow or refresh.",
    bullets: networkBullets,
  };
}

function summarizeRepo(repoStatus = {}, projectHealth = {}, route = {}) {
  const parts = [
    repoStatus.summary,
    projectHealth.recommendation,
    route.day && route.task
      ? `Today's route (${route.day} — ${route.focus}): ${stripMd(route.task)}`
      : null,
  ].filter(Boolean);

  const bullets = [
    repoStatus.branch ? `Branch: ${repoStatus.branch}` : null,
    repoStatus.lastCommit
      ? `Last commit: ${repoStatus.lastCommit.subject} (${repoStatus.lastCommit.when})`
      : null,
    projectHealth.openIssues != null
      ? `Open GitHub issues: ${projectHealth.openIssues}`
      : null,
    projectHealth.pendingTasks != null
      ? `Operator checklist items: ${projectHealth.pendingTasks}`
      : null,
  ].filter(Boolean);

  return {
    summary: parts.join(" ") || "Repo status unavailable.",
    bullets,
  };
}

export function buildEverythingDigest({
  news = {},
  bureau = {},
  bulletinMd = "",
  operatorMd = "",
  pilotRows = [],
  crmMetrics = {},
  socialAgent = {},
  repoStatus = {},
  projectHealth = {},
  route = {},
  risks = [],
  weekday = "",
  today = "",
}) {
  const bulletin = parseBulletinDigest(bulletinMd);
  const operator = parseOperatorDigest(operatorMd);
  const pilots = summarizePipeline(pilotRows, crmMetrics);
  const social = summarizeSocial(socialAgent);
  const bureauBlock = summarizeBureau(bureau, bulletin);
  const repo = summarizeRepo(repoStatus, projectHealth, route);

  const topRisk = risks.find((r) => r.level === "warn") || risks[0];

  const overviewParts = [
    news.summary ? `News: ${news.summary}` : null,
    bureauBlock.summary,
    pilots.summary,
    operator.summary,
    topRisk ? `Watch: ${topRisk.detail || topRisk.title}` : null,
  ].filter(Boolean);

  return {
    headline: weekday && today ? `${weekday}, ${today} — your operating picture` : "Your operating picture",
    overview: overviewParts.join(" "),
    sections: [
      {
        id: "news",
        title: "DePIN news",
        summary: news.summary || "No bureau news scan available.",
        bullets: [
          ...(news.suggestedTweet ? [] : news.candidates.slice(0, 4).map((c) => c.summary)),
        ],
        items: news.title
          ? [
              {
                title: news.title,
                url: news.url,
                summary: news.summary,
              },
              ...news.candidates.slice(0, 4).map((c) => ({
                title: c.title,
                url: c.url,
                summary: c.summary,
              })),
            ]
          : [],
      },
      {
        id: "bureau",
        title: "Bureau reads",
        summary: bureauBlock.summary,
        bullets: bureauBlock.bullets,
      },
      {
        id: "operator",
        title: "Your checklist",
        summary: operator.summary || "No operator brief found.",
        bullets: [...operator.today.slice(0, 6), ...operator.waitRules.slice(0, 3)],
      },
      {
        id: "pilots",
        title: "Pilot pipeline",
        summary: pilots.summary,
        bullets: pilots.bullets,
      },
      {
        id: "social",
        title: "Social & mentions",
        summary: social.summary,
        bullets: social.bullets,
      },
      {
        id: "repo",
        title: "Project & repo",
        summary: repo.summary,
        bullets: repo.bullets,
      },
    ],
  };
}
