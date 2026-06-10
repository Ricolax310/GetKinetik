// Pilot CRM — merge pilot-targets with local touch history.

import fs from "node:fs";
import path from "node:path";
import { REPO_ROOT, PRIVATE_DIR } from "./config.mjs";

export const CRM_PATH = path.join(PRIVATE_DIR, "command-center-crm.json");

const DEFAULT_CONTACTS = {
  WeatherXM: {
    contact: "Manolis Nikiforakis",
    founderName: "Manolis Nikiforakis",
    ecosystemLead: "WeatherXM ecosystem lead",
    productLead: "WeatherXM product lead",
    status: "warm",
    channel: "@nikil511",
  },
  Geodnet: {
    contact: "Mike Horton",
    founderName: "Mike Horton",
    ecosystemLead: "GEODNET BD lead",
    productLead: "GEODNET product lead",
    status: "warm",
    channel: "support.geodnet.com",
  },
  DIMO: {
    contact: "Andy Chatham / grants",
    founderName: "Rob Solomon",
    ecosystemLead: "DIMO ecosystem lead",
    productLead: "DIMO product lead",
    status: "warm",
    channel: "grants@dimo.zone",
  },
  Hivemapper: {
    contact: "MIP-26 / ecosystem",
    founderName: "Ariel Seidman",
    ecosystemLead: "Hivemapper ecosystem lead",
    productLead: "Hivemapper product lead",
    status: "warm",
    channel: "Discord #mip-26",
  },
  "DePIN Hub": {
    contact: "Program lead",
    founderName: null,
    ecosystemLead: "DePIN Hub program lead",
    productLead: null,
    status: "cold",
    channel: "depinhub.io",
  },
};

function parsePilotDetails(md) {
  const map = {};
  const blocks = md.split(/^### \d+\. /m).slice(1);
  for (const block of blocks) {
    const org = block.split("\n")[0]?.trim();
    if (!org) continue;
    const dm = block.match(/\*\*Decision maker\*\* \| (.+)/);
    const contact = block.match(/\*\*Public contact\*\* \| (.+)/);
    map[org] = {
      decisionMaker: dm?.[1]?.trim() || null,
      publicContact: contact?.[1]?.trim() || null,
    };
  }
  return map;
}

function daysSince(iso) {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  return Math.floor(ms / 86_400_000);
}

function heatFromStatus(status, days, onWait) {
  if (onWait) return "wait";
  if (status === "hot" || status === "negotiating") return "hot";
  if (status === "warm") return days != null && days > 14 ? "cooling" : "warm";
  if (days != null && days > 21) return "cold";
  return status || "cold";
}

function warmnessScore({ status, daysSinceTouch, onWait, overdue, priority }) {
  if (onWait) return 8;
  let score = 25;
  if (status === "hot" || status === "negotiating") score = 92;
  else if (status === "warm") score = 74;
  else if (status === "cooling") score = 58;
  else if (status === "cold") score = 38;
  if (daysSinceTouch == null) score += 5;
  else if (daysSinceTouch > 21) score -= 14;
  else if (daysSinceTouch > 10) score -= 6;
  if (overdue) score += 10;
  if (priority <= 3) score += 6;
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function loadOrCreateCrm() {
  if (fs.existsSync(CRM_PATH)) {
    try {
      return JSON.parse(fs.readFileSync(CRM_PATH, "utf8"));
    } catch {
      /* rebuild */
    }
  }
  const seed = {
    version: 1,
    updatedAt: new Date().toISOString(),
    lastPilotConversation: null,
    lastCustomerFeedback: null,
    outreachSentThisWeek: 0,
    weekStarted: new Date().toISOString().slice(0, 10),
    targets: Object.entries(DEFAULT_CONTACTS).map(([company, meta]) => ({
      company,
      contact: meta.contact,
      founderName: meta.founderName || null,
      ecosystemLead: meta.ecosystemLead || null,
      productLead: meta.productLead || null,
      status: meta.status,
      channel: meta.channel,
      lastTouch: null,
      nextAction: null,
      followUpDue: null,
      notes: "",
    })),
  };
  fs.mkdirSync(PRIVATE_DIR, { recursive: true });
  fs.writeFileSync(CRM_PATH, JSON.stringify(seed, null, 2), "utf8");
  return seed;
}

export function buildPilotPipelineRows(pilotPipeline, warmWaits, crm) {
  const detailsPath = path.join(REPO_ROOT, "docs/pilot-targets.md");
  const details = fs.existsSync(detailsPath)
    ? parsePilotDetails(fs.readFileSync(detailsPath, "utf8"))
    : {};
  const crmByCompany = Object.fromEntries((crm.targets || []).map((t) => [t.company, t]));

  return pilotPipeline.map((p) => {
    const extra = details[p.org] || {};
    const crmRow = crmByCompany[p.org] || {};
    const contact =
      crmRow.contact ||
      extra.decisionMaker?.split("·")[0]?.trim() ||
      DEFAULT_CONTACTS[p.org]?.contact ||
      "—";
    const founderName =
      crmRow.founderName ||
      DEFAULT_CONTACTS[p.org]?.founderName ||
      null;
    const ecosystemLead =
      crmRow.ecosystemLead ||
      DEFAULT_CONTACTS[p.org]?.ecosystemLead ||
      null;
    const productLead =
      crmRow.productLead ||
      DEFAULT_CONTACTS[p.org]?.productLead ||
      null;
    const onWait = warmWaits.some((w) => {
      const hint = p.org.toLowerCase();
      return (
        (hint.includes("geodnet") && w.who.includes("Mike")) ||
        (hint.includes("weatherxm") && w.who.includes("Manolis"))
      );
    });
    const lastTouch = crmRow.lastTouch || null;
    const days = daysSince(lastTouch);
    const followUpDue = crmRow.followUpDue || null;
    const overdue =
      followUpDue && new Date(followUpDue) < new Date(new Date().toISOString().slice(0, 10));

    let nextAction = crmRow.nextAction;
    if (!nextAction) {
      if (onWait) nextAction = "WAIT — nurture only if they engaged";
      else if (p.org === "DIMO") nextAction = "Reply grants@dimo.zone with 30-min pilot scope";
      else if (p.org === "Hivemapper") nextAction = "MIP-26 channel — attestation appendix";
      else if (p.org === "Geodnet") nextAction = "Support ticket + CSV offer";
      else if (p.org === "WeatherXM") nextAction = "Follow capacity read — pilot not accusation";
      else nextAction = "Route-appropriate intro or comment";
    }

    const heat = heatFromStatus(crmRow.status || p.difficulty?.toLowerCase(), days, onWait);
    const warmness = warmnessScore({
      status: heat,
      daysSinceTouch: days,
      onWait,
      overdue,
      priority: p.priority,
    });
    const shouldContactToday = !onWait && (overdue || warmness >= 70 || p.priority <= 3);

    return {
      priority: p.priority,
      company: p.org,
      contact,
      founderName,
      ecosystemLead,
      productLead,
      status: crmRow.status || (p.difficulty === "Easy" ? "warm" : "cold"),
      heat,
      warmnessScore: warmness,
      lastTouch,
      daysSinceTouch: days,
      nextAction,
      followUpDue,
      overdue,
      onWait,
      shouldContactToday,
      why: p.why,
      difficulty: p.difficulty,
      channel: crmRow.channel || extra.publicContact?.slice(0, 80) || "—",
    };
  }).sort((a, b) => {
    if (a.overdue && !b.overdue) return -1;
    if (!a.overdue && b.overdue) return 1;
    const heatOrder = { hot: 0, warm: 1, cooling: 2, cold: 3, wait: 4 };
    return (heatOrder[a.heat] ?? 5) - (heatOrder[b.heat] ?? 5) || a.priority - b.priority;
  });
}

export function crmMetrics(crm, pipelineRows) {
  const followUpsDue = pipelineRows.filter(
    (r) => r.followUpDue && new Date(r.followUpDue) <= new Date(new Date().toISOString().slice(0, 10)),
  ).length;
  const overdue = pipelineRows.filter((r) => r.overdue).length;
  return {
    pilotConversations: crm.pilotConversations ?? 0,
    followUpsDue,
    overdueFollowUps: overdue,
    outreachSentThisWeek: crm.outreachSentThisWeek ?? 0,
    lastPilotConversation: crm.lastPilotConversation,
    daysSincePilotConversation: daysSince(crm.lastPilotConversation),
    lastCustomerFeedback: crm.lastCustomerFeedback,
    daysSinceCustomerFeedback: daysSince(crm.lastCustomerFeedback),
  };
}
