// Founder metrics, mission tasks, repo plain-English, founder mode.

import fs from "node:fs";
import path from "node:path";
import { REPO_ROOT } from "./config.mjs";

export function buildTodaysMission({ pipelineRows, route, warmWaits, operatorTasks }) {
  const missions = [];

  const topPilot = pipelineRows.find((p) => !p.onWait && (p.heat === "hot" || p.heat === "warm"));
  if (topPilot) {
    missions.push({
      id: "pilot-1",
      type: "pilot",
      title: `${topPilot.company}: ${topPilot.nextAction}`,
      minutes: 30,
      impact: "high",
      impactLabel: "Moves toward first signed pilot",
    });
  }

  if (route?.task) {
    missions.push({
      id: "outreach-1",
      type: "outreach",
      title: route.task.replace(/\*\*/g, "").slice(0, 100),
      minutes: 20,
      impact: "high",
      impactLabel: "Inbound pull — no cold founder DMs",
    });
  }

  const inbound = operatorTasks.find((t) => /inbound|run on our data/i.test(t));
  if (inbound) {
    missions.push({
      id: "business-1",
      type: "business",
      title: inbound.replace(/\*\*/g, "").slice(0, 100),
      minutes: 15,
      impact: "high",
      impactLabel: "Same-day reply = north star win",
    });
  } else {
    const dimo = pipelineRows.find((p) => p.company === "DIMO" && !p.onWait);
    if (dimo && missions.length < 3) {
      missions.push({
        id: "business-dimo",
        type: "business",
        title: "Draft grants@dimo.zone pilot reply (30-min scope)",
        minutes: 25,
        impact: "medium",
        impactLabel: "Warm thread — product owner path",
      });
    }
  }

  const sorted = missions.slice(0, 3);
  while (sorted.length < 3 && pipelineRows.length > sorted.length) {
    const p = pipelineRows[sorted.length];
    if (p.onWait) continue;
    sorted.push({
      id: `fill-${sorted.length}`,
      type: "outreach",
      title: p.nextAction,
      minutes: 15,
      impact: "medium",
      impactLabel: `Pipeline #${p.priority}`,
    });
    if (sorted.length >= 3) break;
  }

  return sorted.slice(0, 3);
}

export function buildFounderModeWarning({ issueBuckets, criticalToday, productSignals }) {
  const outreachCount = criticalToday.filter((t) => t.kind === "outreach" || t.kind === "pilot").length;
  const engIssues = issueBuckets?.engineering?.length || 0;
  const engSignals = productSignals.filter((s) => s.level === "defer").length;
  const engScore = engIssues + engSignals;
  const outreachScore = outreachCount + (issueBuckets?.pilotRelevant?.length || 0);

  if (engScore > outreachScore + 2) {
    return {
      active: true,
      message: "You are spending time building instead of validating.",
      detail: `${engScore} engineering signals vs ${outreachScore} pilot/outreach signals. Ship conversations, not features.`,
    };
  }
  return { active: false, message: null, detail: null };
}

export function buildRepoStatusPlain({ git, issueBuckets }) {
  const lines = [];
  const branch = git?.branch || "unknown";
  const lastCommit = git?.recentCommits?.[0];

  if (branch === "main" && git?.clean) {
    lines.push({ status: "ok", text: "Main branch is clean. No repo action needed today." });
  } else if (branch !== "main") {
    lines.push({
      status: "info",
      text: `Working on ${branch}. Pilot docs can ship from this branch when ready.`,
    });
  } else if (!git?.clean) {
    lines.push({
      status: "info",
      text: `${git.modified || 0} modified files locally — commit pilot outreach docs when stable.`,
    });
  }

  if (lastCommit) {
    const subj = lastCommit.subject.toLowerCase();
    if (/verif|attestation|bureau|parity|policy/.test(subj)) {
      lines.push({
        status: "ok",
        text: "Verification rail stable. No action needed unless a pilot asks for changes.",
      });
    } else if (/pilot|outreach|docs/.test(subj)) {
      lines.push({ status: "ok", text: "Recent work supports pilot acquisition. Good." });
    } else {
      lines.push({
        status: "defer",
        text: `Last commit: ${lastCommit.subject}. Defer deeper engineering unless blocked.`,
      });
    }
  }

  const openPilot = issueBuckets?.pilotRelevant?.length || 0;
  const openEng = issueBuckets?.engineering?.length || 0;
  if (openEng > 0) {
    lines.push({
      status: "defer",
      text: `${openEng} engineering issue(s) open — hidden from priority unless broken.`,
    });
  }
  if (openPilot > 0) {
    lines.push({
      status: "info",
      text: `${openPilot} partner-facing issue(s) may need attention before a pilot call.`,
    });
  }

  let ciStatus = "unknown";
  try {
    const ciPath = path.join(REPO_ROOT, ".github/workflows");
    if (fs.existsSync(ciPath)) {
      ciStatus = "configured";
      lines.push({ status: "ok", text: "CI configured. Trust green checks; don't watch logs daily." });
    }
  } catch {
    /* ignore */
  }

  return {
    summary: lines[0]?.text || "Repo status OK.",
    lines,
    branch,
    lastCommit: lastCommit
      ? { hash: lastCommit.hash, subject: lastCommit.subject, when: lastCommit.when }
      : null,
    ciStatus,
    openTasks: issueBuckets?.openCount || 0,
  };
}

export function buildProjectHealthAgent({
  git,
  issueBuckets,
  operatorTasks = [],
  markdownFiles = [],
  bureau = null,
}) {
  const openIssues = issueBuckets?.openCount || 0;
  const pendingTasks = operatorTasks.length;
  const engineeringIssues = issueBuckets?.engineering?.length || 0;
  const pilotIssues = issueBuckets?.pilotRelevant?.length || 0;
  const ciFailures = (issueBuckets?.engineering || []).filter((i) =>
    /ci|build fail|pipeline fail|test fail/i.test(i.title || ""),
  ).length;

  let deploymentStatus = "stable";
  if (git?.branch && git.branch !== "main") {
    deploymentStatus = "working-branch";
  } else if (!git?.clean) {
    deploymentStatus = "local-uncommitted";
  }

  const docGaps = [];
  const requiredDocIds = ["one-pager", "latest-operator", "latest-brief"];
  for (const id of requiredDocIds) {
    if (!markdownFiles.find((f) => f.id === id)) {
      docGaps.push(`${id} missing from local context`);
    }
  }
  if (!bureau?.pipelineAge) {
    docGaps.push("No pipeline timestamp found");
  }

  const businessGuardrail = engineeringIssues <= pilotIssues + 2;
  return {
    openIssues,
    pendingTasks,
    deploymentStatus,
    ciFailures,
    documentationGaps: docGaps.length,
    documentationGapItems: docGaps,
    businessGuardrail,
    recommendation: businessGuardrail
      ? "Engineering and outreach are balanced. Keep pilot conversations first."
      : "Engineering is overtaking business development. Pause non-blocking build work.",
  };
}

export function buildFounderHealth({ crmMetrics, missionsCompleted = 0 }) {
  const daysPilot = crmMetrics.daysSincePilotConversation;
  const daysFeedback = crmMetrics.daysSinceCustomerFeedback;
  let note = "Focus on one conversation that can say yes.";
  if (daysPilot != null && daysPilot <= 3) {
    note = "Recent pilot conversation momentum — follow up while warm.";
  } else if (daysPilot != null && daysPilot > 14) {
    note = "Two weeks without pilot conversation — today's mission is outreach.";
  } else if (crmMetrics.outreachSentThisWeek >= 3) {
    note = "Solid outreach rhythm this week. Protect time for replies.";
  }

  return {
    tasksCompletedToday: missionsCompleted,
    outreachCompletedThisWeek: crmMetrics.outreachSentThisWeek,
    daysSincePilotConversation: daysPilot,
    daysSinceCustomerFeedback: daysFeedback,
    note,
  };
}

export function readAttestationMetrics() {
  const statsPath = path.join(REPO_ROOT, "docs/bureau/private/command-center-metrics.json");
  if (fs.existsSync(statsPath)) {
    try {
      return JSON.parse(fs.readFileSync(statsPath, "utf8"));
    } catch {
      /* default */
    }
  }
  return {
    attestationsGenerated: null,
    apiUsage30d: null,
    note: "Optional: edit docs/bureau/private/command-center-metrics.json",
  };
}

export function buildMetrics(crmMetrics, attestationMeta) {
  return {
    pilotConversations: crmMetrics.pilotConversations,
    followUpsDue: crmMetrics.followUpsDue,
    overdueFollowUps: crmMetrics.overdueFollowUps,
    outreachSentThisWeek: crmMetrics.outreachSentThisWeek,
    attestationsGenerated: attestationMeta.attestationsGenerated,
    apiUsage30d: attestationMeta.apiUsage30d,
  };
}

export function buildTodaysFocus(missions) {
  return missions.map((m, i) => ({
    rank: i + 1,
    type: m.type,
    title: m.title,
    minutes: m.minutes,
    impact: m.impact,
    impactLabel: m.impactLabel,
  }));
}
