// Prioritize pilot/outreach over engineering — calm daily focus.

import {
  ENGINEERING_KEYWORDS,
  PILOT_KEYWORDS,
} from "./config.mjs";
import { bulletinIntelItem } from "./digest.mjs";

const WAIT_ORG_HINTS = [
  { org: "geodnet", who: "Mike Horton" },
  { org: "weatherxm", who: "Manolis Nikiforakis" },
];

function isOrgOnWait(org, warmWaits) {
  const key = org.toLowerCase();
  const hint = WAIT_ORG_HINTS.find((h) => key.includes(h.org));
  if (hint) {
    return warmWaits.some((w) => w.who.includes(hint.who.split(" ")[0]));
  }
  return warmWaits.some((w) => key.includes(w.who.toLowerCase().split(" ")[0]));
}

function scoreIssue(issue) {
  const blob = `${issue.title} ${(issue.labels || []).map((l) => l.name).join(" ")}`.toLowerCase();
  let score = 0;
  for (const k of PILOT_KEYWORDS) if (blob.includes(k)) score += 3;
  for (const k of ENGINEERING_KEYWORDS) if (blob.includes(k)) score -= 2;
  if (blob.includes("bug") && blob.includes("verify")) score += 1;
  return score;
}

export function classifyIssues(issues = []) {
  const open = issues.filter((i) => i.state === "OPEN" || i.state === "open");
  const ranked = open
    .map((issue) => ({
      ...issue,
      pilotScore: scoreIssue(issue),
      bucket: scoreIssue(issue) >= 2 ? "pilot" : scoreIssue(issue) <= -2 ? "engineering" : "neutral",
    }))
    .sort((a, b) => b.pilotScore - a.pilotScore);

  return {
    openCount: open.length,
    pilotRelevant: ranked.filter((i) => i.bucket === "pilot").slice(0, 5),
    engineering: ranked.filter((i) => i.bucket === "engineering").slice(0, 5),
    deferred: ranked.filter((i) => i.bucket === "engineering"),
  };
}

export function buildCriticalToday({ route, operatorTasks, warmWaits, pipelineAge }) {
  const tasks = [];

  if (route?.task) {
    tasks.push({
      id: "route-today",
      kind: "outreach",
      title: route.task.replace(/\*\*/g, "").slice(0, 120),
      why: `Today's UTC route (${route.day} — ${route.focus})`,
      priority: 100,
    });
  }

  for (const t of operatorTasks.slice(0, 4)) {
    if (t.toLowerCase().includes("optional") && tasks.length >= 2) continue;
    tasks.push({
      id: `op-${tasks.length}`,
      kind: t.toLowerCase().includes("inbound") ? "pilot" : "outreach",
      title: t.replace(/\*\*/g, "").slice(0, 120),
      why: "From latest operator brief",
      priority: t.toLowerCase().includes("inbound") ? 95 : 70,
    });
  }

  if (pipelineAge) {
    const ageDays = (Date.now() - new Date(pipelineAge).getTime()) / 86_400_000;
    if (ageDays > 5) {
      tasks.push({
        id: "pipeline-stale",
        kind: "admin",
        title: "Review outreach drafts — weekly scan may be stale",
        why: `Last pipeline run ${Math.floor(ageDays)}d ago`,
        priority: 55,
      });
    }
  }

  const sorted = tasks
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 3)
    .map(({ priority, ...rest }) => rest);

  return sorted;
}

export function buildTopOpportunities({ pilotPipeline, bureau, newsTitle }) {
  const opps = [];

  for (const p of pilotPipeline.slice(0, 5)) {
    opps.push({
      org: p.org,
      difficulty: p.difficulty,
      why: p.why,
      kind: "pilot",
      score: 100 - p.priority * 3,
    });
  }

  if (bureau?.featuredNetwork && bureau?.featuredFinding) {
    opps.push({
      org: bureau.featuredNetwork,
      difficulty: "—",
      why: bureau.featuredFinding,
      kind: "read",
      score: 88,
    });
  }

  if (newsTitle) {
    opps.push({
      org: "News pick",
      difficulty: "—",
      why: newsTitle,
      kind: "comment",
      score: 60,
    });
  }

  return opps.sort((a, b) => b.score - a.score).slice(0, 5).filter((o, i, arr) => {
    return arr.findIndex((x) => x.org === o.org) === i;
  });
}

export function buildPeopleToContact({ contacts, warmWaits, pilotPipeline }) {
  const people = [];

  for (const p of pilotPipeline.slice(0, 4)) {
    const blocked = isOrgOnWait(p.org, warmWaits);
    people.push({
      name: p.org,
      company: p.org,
      role: "Pilot target",
      channel: blocked ? "WAIT — nurture only if they engaged" : "Route-appropriate touch",
      angle: p.why?.slice(0, 140),
      blocked,
    });
  }

  for (const c of contacts.slice(0, 6)) {
    if (people.length >= 5) break;
    if (isOrgOnWait(c.company, warmWaits) || isOrgOnWait(c.name, warmWaits)) continue;
    if (people.some((p) => p.name === c.name)) continue;
    people.push({
      name: c.name,
      company: c.company,
      role: c.role,
      channel: c.email || c.x || "X / Discord",
      angle: c.angle?.slice(0, 140),
      blocked: false,
    });
  }

  return people.slice(0, 5);
}

export function buildRisks({ warmWaits, pipelineAge, git, issueBuckets, gtmRule }) {
  const risks = [];

  for (const w of warmWaits) {
    risks.push({
      level: "warn",
      title: `Wait: ${w.who}`,
      detail: w.rule,
    });
  }

  if (pipelineAge) {
    const ageDays = (Date.now() - new Date(pipelineAge).getTime()) / 86_400_000;
    if (ageDays > 7) {
      risks.push({
        level: "warn",
        title: "Stale network reads",
        detail: `Pipeline last updated ${Math.floor(ageDays)} days ago — refresh before citing numbers in outreach`,
      });
    }
  }

  if (issueBuckets?.engineering?.length > 3) {
    risks.push({
      level: "info",
      title: "Engineering backlog visible",
      detail: `${issueBuckets.engineering.length} open issues look engineering-heavy — defer unless a pilot asks`,
    });
  }

  if (!git?.clean && git?.untracked > 15) {
    risks.push({
      level: "info",
      title: "Large local WIP",
      detail: `${git.untracked} untracked files — commit pilot docs when ready, ignore .wrangler noise`,
    });
  }

  risks.push({
    level: "info",
    title: "30-day build rule",
    detail: gtmRule || "No major features unless a pilot partner asks",
  });

  return risks.slice(0, 6);
}

export function pickRecommendedNextAction({ criticalToday, topOpportunities, route, warmWaits }) {
  if (criticalToday[0]) {
    return {
      action: criticalToday[0].title,
      reason: criticalToday[0].why,
      type: criticalToday[0].kind,
    };
  }

  const topPilot = topOpportunities.find((o) => o.kind === "pilot");
  if (topPilot) {
    const blocked = isOrgOnWait(topPilot.org, warmWaits);
    if (blocked) {
      return {
        action: route?.task?.replace(/\*\*/g, "") || "Follow today's outreach route — warm leads on wait",
        reason: "Warm lead wait rules active",
        type: "outreach",
      };
    }
    return {
      action: `Prepare one hook for ${topPilot.org} pilot conversation`,
      reason: topPilot.why,
      type: "pilot",
    };
  }

  return {
    action: route?.task?.replace(/\*\*/g, "") || "Skim inbox for inbound pilot interest",
    reason: "North star: can you run this on our data?",
    type: "outreach",
  };
}

export function buildIntelFeed({
  rssItems,
  xItems,
  newsTitle,
  newsUrl,
  newsSummary,
  bulletinDigest,
}) {
  const feed = [];

  if (newsTitle || newsSummary) {
    feed.push({
      source: "Bureau news scan",
      title: newsTitle || "Today's news scan",
      url: newsUrl,
      summary: newsSummary || newsTitle,
      kind: "news",
      at: null,
    });
  }

  for (const item of rssItems.slice(0, 6)) {
    feed.push({
      source: item.feed,
      title: item.title,
      url: item.link,
      excerpt: item.excerpt,
      summary: item.excerpt || item.title,
      kind: "rss",
      at: item.pubDate,
    });
  }

  for (const tw of xItems.slice(0, 5)) {
    feed.push({
      source: "X export",
      title: tw.text.slice(0, 140),
      summary: tw.text,
      url: null,
      kind: "x",
      at: tw.created,
    });
  }

  const bulletinItem = bulletinIntelItem(bulletinDigest);
  if (bulletinItem) feed.push(bulletinItem);

  return feed.slice(0, 12);
}

export function buildProductSignals({ issueBuckets, git, markdownFiles }) {
  const signals = [];

  for (const issue of issueBuckets.pilotRelevant.slice(0, 3)) {
    signals.push({
      level: "pilot",
      title: `#${issue.number} ${issue.title}`,
      url: issue.url,
      note: "May affect partner-facing surface",
    });
  }

  for (const issue of issueBuckets.engineering.slice(0, 2)) {
    signals.push({
      level: "defer",
      title: `#${issue.number} ${issue.title}`,
      url: issue.url,
      note: "Engineering — defer until pilot asks",
    });
  }

  const staleChecks = [
    { path: "landing/api/postman.json", label: "Postman collection may be v1" },
    { path: "landing/status/index.html", label: "Status page footer may be v1" },
  ];
  for (const check of staleChecks) {
    const hit = markdownFiles.find((f) => f.id === "latest-brief");
    if (hit) {
      signals.push({
        level: "defer",
        title: check.label,
        url: check.path,
        note: "Known doc drift — fix only if partner blocked",
      });
    }
  }

  if (git?.branch && git.branch !== "main") {
    signals.push({
      level: "info",
      title: `On branch ${git.branch}`,
      url: null,
      note: git.ahead ? `${git.ahead} commit(s) ahead of remote` : "Local branch",
    });
  }

  return signals.slice(0, 6);
}

function parseOperatorCheckboxes(md) {
  if (!md) return [];
  return md
    .split("\n")
    .filter((l) => l.startsWith("- [ ]"))
    .map((l) => l.replace(/^- \[ \]\s*/, "").trim())
    .filter((l) => !l.startsWith("**Your note:** Zero cold"));
}

export { parseOperatorCheckboxes };
