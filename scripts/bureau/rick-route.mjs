// @Kinetik_Rick visibility lane — the human "out there" account.
//
// This is NOT the partner route (gtm-route.mjs) and NOT @kinetiksignal
// (drip-engine cards). This lane has one job: get strangers to see Rick,
// click the profile, and follow. Win metric = profile clicks + follows,
// not "run this on our data?" (that's the bureau north star).
//
// Rules of the lane:
//   - Replies on big threads carry NO links. The profile does the selling.
//   - Fresh posts: one link max, every 2nd-3rd post only.
//   - Quote tweets are allowed here (growth), unlike partner outreach (DM).
//   - Never contradict partner wait rules — no @-ing wait-listed contacts.

export const RICK_NORTH_STAR =
  "Strangers click @Kinetik_Rick and follow — visibility compounds, partner DMs convert.";

/** UTC weekday → one visibility action for the personal account. */
const RICK_WEEKLY_ROUTE = {
  0: {
    day: "Sunday",
    focus: "Off / light",
    task: "Optional: 1 reply on any big Sybil/verify thread you genuinely have a take on. No links. Otherwise rest.",
  },
  1: {
    day: "Monday",
    focus: "Hook post",
    task: "Post 1 hook tweet (no link). Pull from the hooks bank or today's news pick. Example shape: \"Base Verify fixed wallet farmers. Emulator farmers are the next room.\"",
  },
  2: {
    day: "Tuesday",
    focus: "Reply raid",
    task: "3 replies on threads with 500+ likes (Sybil, DePIN fraud, device verification, PoP). 1-3 sentences each, one concrete point, NO links. Profile clicks are the goal.",
  },
  3: {
    day: "Wednesday",
    focus: "Proof clip",
    task: "Post or re-caption the native demo clip (uploaded directly to X, not a YouTube link). If pinned already, quote your own pin with a fresh one-liner.",
  },
  4: {
    day: "Thursday",
    focus: "Quote take",
    task: "Quote-tweet 1 ecosystem post (Base Verify, verify-tooling, DePIN fraud news) with a 2-3 line take. Growth quote is fine here — partner DMs stay in the bureau lane.",
  },
  5: {
    day: "Friday",
    focus: "Link post",
    task: "1 post WITH a link (bureau page, a published scan, or the verify demo). This is the only planned link post of the week — make it earn it.",
  },
  6: {
    day: "Saturday",
    focus: "Reply raid",
    task: "2 replies on big threads. Same rules: short, concrete, no links.",
  },
};

export const RICK_GUARDRAILS = [
  "Replies: never include a link — bio and pinned post do the converting",
  "Max 1 planned link post per week (Friday); hooks and takes the rest",
  "Quote tweets OK for growth; partner outreach stays DM (bureau lane)",
  "Never @ or quote wait-listed warm leads (gtm-context.md rules still apply)",
  "Sound like a person who built something, not a brand account",
];

/** Reusable opening lines when Rick is staring at a blank compose box. */
export const RICK_HOOKS = [
  "Base Verify fixed wallet farmers. Emulator farmers are the next room over.",
  "Helium didn't lose money to bad data. It lost money to fake hotspots.",
  "One verified human ≠ one real device. DePIN still bleeds on the second one.",
  "Social proof says who you are. Device proof says the work actually happened.",
  "Every DePIN grades its own homework. Nobody grades the device.",
  "GPS coordinates are a claim. A hardware-signed heartbeat chain is a receipt.",
];

export function getRickTask(date = new Date()) {
  const dow = date.getUTCDay();
  return RICK_WEEKLY_ROUTE[dow] || RICK_WEEKLY_ROUTE[1];
}

export function formatRickMarkdown(date = new Date()) {
  const r = getRickTask(date);
  const guards = RICK_GUARDRAILS.map((g) => `- ${g}`).join("\n");
  const hooks = RICK_HOOKS.map((h) => `- ${h}`).join("\n");
  return `## @Kinetik_Rick — be seen (visibility lane)

**North star:** ${RICK_NORTH_STAR}

**Today (${r.day}) — ${r.focus}:** ${r.task}

**Guardrails:**
${guards}

**Hooks bank (steal one):**
${hooks}
`;
}

/** Injected into the news LLM so it drafts a personal-voice reply too. */
export const RICK_SYSTEM_BLOCK = `RICK VISIBILITY LANE (personal account @Kinetik_Rick — separate from bureau voice):
North star: ${RICK_NORTH_STAR}

In addition to the bureau output, draft "rickReply": a reply Rick can paste
under the article's X thread (or the biggest related thread) in HIS voice:
- 1-3 sentences, <=240 chars, sounds like a builder talking, not a brand
- One concrete point (device layer vs social layer, registry vs rewards, fake-node economics)
- ABSOLUTELY NO links, no hashtags, no "@" mentions of wait-listed contacts
- It should make a stranger curious enough to click the profile
- If the article truly has no X-thread angle, set rickReply to ""`;
