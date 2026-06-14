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

// ── Growth kit: bio, pinned post, and a daily data thread ──────────────────

/** Static-ish bio — accurate, no overclaiming, leads with what we can prove. */
const BIO =
  "Neutral DePIN bureau. I read public network data and flag what's worth a second look — duplicate coordinates, capacity overflows, stacked hotspots, supply concentration. Reproducible, no token, no shilling. Helium · WeatherXM · GEODNET · Hivemapper → getkinetik.app";

/** Pinned-post snapshot — today's headline numbers across the audited networks. */
function buildPinnedPost(heroes) {
  const byId = {};
  for (const h of heroes) byId[h.network] = h;
  const bullets = heroes.slice(0, 4).map((h) => `• ${h.plain}`);
  return [
    "Most DePIN dashboards tell you a network is growing. None tell you if the devices are real.",
    "",
    "I run a neutral second read on public data — anyone can reproduce it, I hold no token in any network I audit.",
    "",
    "Today's reads:",
    ...bullets,
    "",
    "Not accusations. Questions worth asking. Daily at getkinetik.app",
  ].join("\n");
}

/** A 5-tweet data thread built from the day's lead finding. */
function buildThread(hero) {
  const close =
    "I publish these daily across Helium, GEODNET, WeatherXM, Hivemapper. No token, no pitch — just reproducible public reads.\n\ngetkinetik.app";

  const byKind = {
    stack: [
      `${hero.plain}.\n\nAcross the network, ${n(hero.stacks)} coordinates each hold 10+ hotspots — out of ~${n(hero.fleet)} located units.\n\nWhat that does and doesn't mean, from public data 🧵`,
      `First, what it's NOT: proof of fraud. Helium asserts locations to H3 hexes, so dense buildings and shared mounts legitimately share coordinates. Small stacks are normal.`,
      `What's worth a look: stacks of THIS size. ${n(hero.big)} radios on one point isn't a building — it's the classic hotspot-stacking pattern. Could be honest dense deployment, could be gaming. Public data can't tell you which.`,
      `That's the point of a neutral read: surface the size, name the question, let the network answer. The keys are grep-able from the free Entity API — no insider access.`,
      close,
    ],
    dup: [
      `${hero.plain}.\n\nOn a public registry of ${n(hero.fleet)} stations, that's checkable by anyone today 🧵`,
      `What it's NOT: an accusation. Co-located installs and shared-mount sites can share a coordinate legitimately.`,
      `What's worth a look: for a GPS reference network, two stations at the EXACT same coordinate is structurally odd — there's no second position to triangulate from. Usually a dedupe gap, not fraud.`,
      `Why it matters: you can only fix what you can see. Each duplicate group is one row a registry team can grep — no internal data needed.`,
      close,
    ],
    capacity: [
      `${hero.plain}.\n\nThat's from the public cells view — reproducible today 🧵`,
      `What it's NOT: proof of fake devices. Over-capacity can come from registry double-counting or expected reward-zone behavior.`,
      `What's worth a look: a map cell listing more stations than the area can physically hold is a registry-vs-reality question only the operator can settle.`,
      `The neutral read just surfaces the count and the H3 indices. The network checks the cause. No accusation, just the question.`,
      close,
    ],
    econ: [
      `${hero.plain}.\n\nThat's visible on-chain — anyone can verify it 🧵`,
      `What it's NOT: fraud. Treasuries, market makers, and exchanges all hold large wallets. Concentration isn't wrongdoing.`,
      `What's worth a look: "how concentrated is visible supply?" is a fair question any holder should be able to answer from chain data. So I answer it, neutrally.`,
      `This is economic SHAPE, not a device claim — useful for treasury/MM review, not proof of anything about the physical network.`,
      close,
    ],
  };
  return byKind[hero.kind] || null;
}

export function buildGrowthKit(today = new Date().toISOString().slice(0, 10)) {
  const idx = dayIndex(today);
  const heroes = loadNetworks().map(heroFact).filter(Boolean);
  if (!heroes.length) return { today, bio: BIO, pinnedPost: null, thread: null };
  const hero = heroes[idx % heroes.length];
  return {
    today,
    leadNetwork: hero.network,
    bio: BIO,
    pinnedPost: buildPinnedPost(heroes),
    thread: buildThread(hero),
  };
}

export function renderGrowthKitMarkdown(kit) {
  const lines = ["## PROFILE & THREADS — set once, post weekly", ""];
  lines.push("### Bio (set once)", "", "```", kit.bio, "```", "");
  if (kit.pinnedPost) {
    lines.push("### Pinned post (refresh when numbers move)", "", "```", kit.pinnedPost, "```", "");
  }
  if (kit.thread?.length) {
    lines.push(`### Data thread (post 1 today — lead: ${kit.leadNetwork})`, "");
    kit.thread.forEach((t, i) => {
      lines.push(`**${i + 1}/${kit.thread.length}**`, "", "```", t, "```", "");
    });
  }
  return lines;
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
