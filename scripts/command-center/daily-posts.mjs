// Daily posting helper — turns the day's real public reads into ready-to-post
// X content aimed at GROWTH (followers, users, partners), not just B2B tags.
//
// Produces a small rotating set of complete, copy-paste tweets in distinct
// styles so the feed never repeats the same "does that match your view?" line:
//   1. HOOK      — the single most striking number, framed to win followers
//   2. EXPLAINER — teaches one concept tied to today's data (authority)
//   3. QUESTION  — open prompt to the DePIN community (reach / replies)
//   4. NETWORK   — neutral tag at one network (partner outreach)
//
// Neutral bureau voice throughout: "patterns worth a look", reproducible public
// data, never an accusation of fraud.

import fs from "node:fs";
import path from "node:path";
import { REPO_ROOT } from "./config.mjs";

const AUDIT_INDEX = path.join(REPO_ROOT, "scripts/data/bureau-audit-index.json");
const TWEET_LIMIT = 280;

function loadNetworks() {
  if (!fs.existsSync(AUDIT_INDEX)) return [];
  try {
    return JSON.parse(fs.readFileSync(AUDIT_INDEX, "utf8")).networks || [];
  } catch {
    return [];
  }
}

function n(v) {
  return typeof v === "number" && isFinite(v) ? v.toLocaleString("en-US") : null;
}

function pct(v) {
  return typeof v === "number" && isFinite(v) ? `${(v * 100).toFixed(1)}%` : null;
}

/** Stable day-of-year so the same day yields the same rotation, but it moves daily. */
function dayIndex(today) {
  const d = new Date(`${today}T12:00:00Z`);
  const start = Date.UTC(d.getUTCFullYear(), 0, 0);
  return Math.floor((d.getTime() - start) / 86_400_000);
}

function pick(arr, idx) {
  return arr.length ? arr[idx % arr.length] : null;
}

function fit(text) {
  const t = String(text).replace(/\s{2,}/g, " ").trim();
  return t.length <= TWEET_LIMIT ? t : `${t.slice(0, TWEET_LIMIT - 1).trimEnd()}…`;
}

/**
 * Per-network "hero fact" — the most interesting, plain-language number we can
 * stand behind today. Returns null for networks with nothing post-worthy.
 */
function heroFact(net) {
  const s = net.stats || {};
  switch (net.id) {
    case "helium-iot":
    case "helium-mobile": {
      if (typeof s.largestStack !== "number") return null;
      return {
        network: net.name,
        kind: "stack",
        big: s.largestStack,
        stacks: s.stackedSpots,
        fleet: s.observed,
        plain: `${n(s.largestStack)} ${net.name} hotspots claim the exact same GPS coordinate`,
        broad: `On ${net.name}, ${n(s.largestStack)} hotspots share one identical GPS point — and ${n(s.stackedSpots)} coordinates hold 10+ hotspots each`,
      };
    }
    case "geodnet": {
      if (typeof s.exactDupGroups !== "number") return null;
      return {
        network: net.name,
        kind: "dup",
        big: s.exactDupGroups,
        fleet: s.observed,
        plain: `${n(s.exactDupGroups)} groups of GEODNET stations report identical coordinates`,
        broad: `${n(s.exactDupGroups)} sets of GEODNET RTK stations sit on the exact same coordinate across ${n(s.observed)} public stations`,
      };
    }
    case "weatherxm": {
      if (typeof s.overCapacityCells !== "number") return null;
      return {
        network: net.name,
        kind: "capacity",
        big: s.overCapacityCells,
        plain: `${n(s.overCapacityCells)} WeatherXM map cells report more stations than the area should physically hold`,
        broad: `${n(s.overCapacityCells)} WeatherXM map cells show more weather stations than the cell can physically fit`,
      };
    }
    case "hivemapper": {
      if (typeof s.top20ShareOfSupply !== "number") return null;
      return {
        network: net.name,
        kind: "econ",
        big: s.top20ShareOfSupply,
        plain: `${pct(s.top20ShareOfSupply)} of visible HONEY supply sits in just 20 wallets`,
        broad: `${pct(s.top20ShareOfSupply)} of the visible HONEY token supply is held by the top 20 wallets`,
      };
    }
    default:
      return null;
  }
}

const HASHTAGS = "#DePIN #crypto";

/** HOOK — broad-audience post built to make a DePIN-curious reader follow. */
function hookPost(hero, idx) {
  const openers = [
    `${hero.plain}.`,
    `Public data, anyone can check: ${hero.plain.charAt(0).toLowerCase()}${hero.plain.slice(1)}.`,
    `Spotted in today's open-data read — ${hero.plain.charAt(0).toLowerCase()}${hero.plain.slice(1)}.`,
  ];
  const closers = [
    `Not proof of anything wrong — but exactly the kind of pattern a neutral second read should surface. We publish these daily.`,
    `Could be legit co-location, could be registry noise. We don't accuse — we make it checkable. Daily reads 👇`,
    `We read every major DePIN network on public data alone and flag what's worth a closer look. Follow for the daily.`,
  ];
  return fit(`${pick(openers, idx)} ${pick(closers, idx)} ${HASHTAGS}`);
}

/** EXPLAINER — teaches one idea, builds authority, no specific call-out. */
function explainerPost(hero, idx) {
  const byKind = {
    stack: "Why do DePIN hotspots stack on one GPS point? Real reasons (dense buildings, shared mounts) AND gaming both look identical from outside. That's the whole problem: the public map can't tell you which. A neutral read just flags the size, so the network can check.",
    dup: "Two GPS reference stations at the exact same coordinate is physically impossible to triangulate from. On a public registry it usually means a dedupe gap, not fraud — but you can only fix what you can see. We grep the public feed so the question gets asked.",
    capacity: "A map 'cell' over capacity means it lists more devices than the area can physically hold. Sometimes that's registry double-counting, sometimes reward-zone behavior. Public data shows the count; only the operator knows the cause. We surface the count.",
    econ: "Token concentration isn't fraud — treasuries, market makers, and exchanges all hold big wallets. But 'how concentrated is visible supply?' is a fair question anyone should be able to answer from chain data. So we answer it, neutrally.",
  };
  const line = byKind[hero.kind];
  if (!line) return null;
  return fit(`${line} ${HASHTAGS}`);
}

/** QUESTION — open prompt to drive replies and reach. */
function questionPost(hero, idx) {
  const qs = [
    `Genuine question for DePIN builders: when a public map shows ${hero.plain.charAt(0).toLowerCase()}${hero.plain.slice(1)}, what's your first move — assume noise, or investigate? We default to "make it checkable, don't accuse."`,
    `If a neutral third party read your network's public data every day and flagged patterns worth a look — no token, no custody, just receipts — would that help or annoy you? Honest takes welcome.`,
    `What's the most underrated trust signal in DePIN right now? We watch duplicate coordinates, capacity overflows, and supply concentration. Curious what operators actually worry about.`,
  ];
  return fit(`${pick(qs, idx)} ${HASHTAGS}`);
}

/** NETWORK — neutral tag at one network (partner door-knock), varied phrasing. */
function networkPost(net, hero, idx) {
  const obs = hero.broad;
  const frames = [
    `${obs}. Reproducible from your own public endpoint — expected behavior, or worth a registry look on your side?`,
    `Public read: ${obs.charAt(0).toLowerCase()}${obs.slice(1)}. We're not calling it fraud — just asking if the public feed is supposed to look this way.`,
    `${obs}. Happy to share the exact rows. Does this match your internal view?`,
  ];
  return fit(`${pick(frames, idx)} ${HASHTAGS}`);
}

export function buildDailyPosts(today = new Date().toISOString().slice(0, 10)) {
  const idx = dayIndex(today);
  const heroes = loadNetworks()
    .map(heroFact)
    .filter(Boolean);

  if (!heroes.length) {
    return { today, posts: [], note: "No post-worthy public reads available today." };
  }

  // Rotate which network leads the hook/explainer so the feed stays fresh.
  const hero = heroes[idx % heroes.length];
  // Network-tag rotates independently so we don't tag the same network as the hook.
  const tagHero = heroes[(idx + 1) % heroes.length];

  const posts = [
    {
      goal: "Followers — broad hook",
      audience: "DePIN-curious general audience",
      text: hookPost(hero, idx),
    },
    {
      goal: "Authority — explainer",
      audience: "builders + operators learning the space",
      text: explainerPost(hero, idx),
    },
    {
      goal: "Reach — community question",
      audience: "DePIN community (drives replies)",
      text: questionPost(hero, idx),
    },
    {
      goal: "Partners — network tag",
      audience: `${tagHero.network} team`,
      text: networkPost(null, tagHero, idx),
    },
  ].filter((p) => p.text);

  return { today, leadNetwork: hero.network, posts };
}

export function renderDailyPostsMarkdown(daily) {
  const lines = ["## DAILY POSTS — pick 1–3, post, move on", ""];
  if (!daily.posts.length) {
    lines.push(`_${daily.note || "No posts available."}_`, "");
    return lines;
  }
  lines.push(
    `> Ready-to-post content from today's real public reads. Each is a complete tweet (≤280 chars). Goal: followers, reach, and partner door-knocks — not just network tags.`,
    "",
  );
  for (const p of daily.posts) {
    lines.push(`### ${p.goal}`);
    lines.push("");
    lines.push(`_Audience: ${p.audience}_`);
    lines.push("");
    lines.push("```");
    lines.push(p.text);
    lines.push("```");
    lines.push("");
  }
  lines.push(
    "**Posting rhythm:** 1 hook OR explainer most days; drop a community question 2–3×/week; tag a network only when the number actually moved. Reply to every response — that's where partners and followers come from.",
    "",
  );
  return lines;
}
