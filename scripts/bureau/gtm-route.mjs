// Weekly GTM route — prefer public work + intros over cold founder DMs.

export const GTM_NORTH_STAR =
  'Network teams reply: "Can you run this on our data?"';

/** UTC weekday → one primary human outreach action. */
const WEEKLY_ROUTE = {
  0: {
    day: "Sunday",
    focus: "Rest / prep",
    task: "**Light touch:** skim inbox for inbound “run on our data?” only. No outbound.",
  },
  1: {
    day: "Monday",
    focus: "Public ship",
    task: "**Public ship:** post one audit delta or sample read (X or LinkedIn) from `latest-delta-posts.md` or `latest-posts.md`. Let work pull inbound — **no cold founder DMs**.",
  },
  2: {
    day: "Tuesday",
    focus: "Comment",
    task: "**One thoughtful comment** on a target’s post or article (one concrete insight, no pitch). Use `latest-news.md` if there’s a fit.",
  },
  3: {
    day: "Wednesday",
    focus: "Intro ask",
    task: '**One intro ask** (email or DM to a mutual): “Who’s the ONE person I should talk to for distribution / partnerships?” Not a blast.',
  },
  4: {
    day: "Thursday",
    focus: "Marketing partner",
    task: "**Marketing / community lane:** one touch toward a micro-creator, traveling marketer, or Nas-adjacent partner (build-first + live product). Fellowship form, warm intro, or small creator — not mega-influencer DMs.",
  },
  5: {
    day: "Friday",
    focus: "Follow-up",
    task: "**Follow-up only:** one thread that *engaged* this week (warm leads). No third ping on wait-list contacts. No new cold outreach.",
  },
  6: {
    day: "Saturday",
    focus: "Optional ship",
    task: "**Optional:** one more public snippet OR skip outbound. Protect the weekly rhythm.",
  },
};

export const OUTREACH_GUARDRAILS = [
  "No cold DMs to founders who get thousands of messages",
  "No “pick your brain” — offer one reproducible insight or ask for one intro",
  "Warm leads: follow gtm-context wait rules (no @Mike, no third ping Manolis, Raziel 7-day bump)",
  "Email beats cold DM when you have one specific hook",
  "Win = “can you run this on our data?” — not APK installs or adapter count",
];

export function getWeeklyOutreachTask(date = new Date()) {
  const dow = date.getUTCDay();
  return WEEKLY_ROUTE[dow] || WEEKLY_ROUTE[1];
}

export function formatRouteMarkdown(date = new Date()) {
  const r = getWeeklyOutreachTask(date);
  const guards = OUTREACH_GUARDRAILS.map((g) => `- ${g}`).join("\n");
  return `## This week’s route (not cold DMs)

**North star:** ${GTM_NORTH_STAR}

**Today (${r.day}) — ${r.focus}:** ${r.task.replace(/\*\*/g, "")}

**Guardrails:**
${guards}
`;
}

/** Injected into news LLM + ops chat system prompts. */
export const AI_OUTREACH_SYSTEM_BLOCK = `OUTREACH ROUTE (must follow — overrides generic GTM advice):
North star: ${GTM_NORTH_STAR}

Weekly rhythm (UTC):
- Monday: public ship (audit delta or sample read) — inbound pull, no cold founder DMs
- Tuesday: one thoughtful comment on their post/article (insight only, no pitch)
- Wednesday: one intro ask to a mutual ("who's the ONE person for distribution/partnerships?")
- Thursday: marketing lane (micro-creator, Nas/community marketer, partner-seeking — not mega-influencer DMs)
- Friday: follow up ONE engaged warm thread only; no new cold outreach
- Sat–Sun: inbound only or optional public snippet

Never recommend: cold DMs to founders with huge inboxes; "pick your brain"; blasting outreach drafts daily; third pings on wait-list contacts (@Mike, Manolis ~1wk, Raziel 7-day rule).
Win metric is inbound "run on our data?" — NOT DMs sent, APK downloads, or adapter count.
Outreach draft files are for Friday nurture IF they engaged — not for cold sends.`;
