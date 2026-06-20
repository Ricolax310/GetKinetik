// AI-generated daily posts + thread, grounded in the day's REAL public-read
// numbers, in the neutral bureau voice — with memory of recent posts so the
// content never repeats day to day (the root fix for "it says the same thing").
//
// Falls back to the deterministic templates (daily-posts.mjs) when no API key
// is set or the model call fails, so the dashboard never breaks.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { REPO_ROOT } from "./config.mjs";
import { loadEnvQuiet } from "../bureau/lib.mjs";
import { heroFact, loadNetworks, buildDailyPosts, buildGrowthKit } from "./daily-posts.mjs";
import {
  defaultDepinChatModel,
  usesCompletionTokensParam,
} from "../../functions/api/_lib/openaiChat.js";

const HISTORY_PATH = path.join(REPO_ROOT, "scripts/data/ai-posts-history.json");
const HISTORY_DAYS = 10;

function loadHistory() {
  if (!fs.existsSync(HISTORY_PATH)) return {};
  try {
    return JSON.parse(fs.readFileSync(HISTORY_PATH, "utf8"));
  } catch {
    return {};
  }
}

function saveHistory(history) {
  const dates = Object.keys(history).sort().slice(-HISTORY_DAYS);
  const trimmed = {};
  for (const d of dates) trimmed[d] = history[d];
  fs.mkdirSync(path.dirname(HISTORY_PATH), { recursive: true });
  fs.writeFileSync(HISTORY_PATH, JSON.stringify(trimmed, null, 2), "utf8");
}

/** All texts posted in the recent window — fed to the model as "do not repeat". */
function recentTexts(history) {
  const out = [];
  for (const day of Object.values(history)) {
    for (const p of day.posts || []) if (p.text) out.push(p.text);
    for (const t of day.thread || []) if (t) out.push(t);
  }
  return out.slice(-40);
}

function heroesToday() {
  return loadNetworks().map(heroFact).filter(Boolean);
}

const SYSTEM = `You are the GETKINETIK bureau voice — a neutral DePIN integrity bureau run by a sharp solo operator (not a marketer, not a crypto hype account).

You write ready-to-post X content from TODAY's reproducible public-data reads.

HARD RULES (never break):
- Neutral second read. Never accuse fraud/Sybil as proved. Use "pattern worth a look", "checkable", "registry hygiene".
- No token talk, no price, no shilling, no financial advice. No custody claims.
- Everything must be reproducible from public data. Never invent numbers — use ONLY the numbers given.
- Each tweet <= 270 characters. Plain, confident, specific. No corporate filler, no "excited to share", no emoji spam (one tasteful emoji max, optional).
- Lead with the single most striking real number.
- Do NOT reuse phrasings, sentence structures, or openers from the RECENT POSTS list. Every output must feel freshly written.

VOICE: terse operator. Concrete. One idea per post. Confident but never accusatory.`;

function buildUserPrompt(heroes, recent) {
  const facts = heroes
    .map(
      (h) =>
        `- ${h.network} [${h.kind}]: ${h.plain}. (broader: ${h.broad})` +
        (typeof h.fleet === "number" ? ` fleet≈${h.fleet}` : ""),
    )
    .join("\n");

  const avoid = recent.length
    ? `\n\nRECENT POSTS — do NOT echo these phrasings:\n${recent.map((t) => `• ${t.replace(/\s+/g, " ").slice(0, 120)}`).join("\n")}`
    : "";

  return `TODAY'S PUBLIC READS (use only these numbers):
${facts}

Write a fresh set of posts. Output STRICT JSON:
{
  "leadNetwork": "<network name you led with>",
  "posts": [
    { "goal": "Followers — broad hook", "audience": "DePIN-curious general", "text": "<=270 chars" },
    { "goal": "Authority — explainer", "audience": "builders/operators", "text": "<=270 chars" },
    { "goal": "Reach — community question", "audience": "DePIN community", "text": "<=270 chars" },
    { "goal": "Partners — network tag", "audience": "<network> team", "text": "<=270 chars" }
  ]
}

Make each post genuinely different from the recent posts.${avoid}`;
}

export async function generateAiContent({ heroes, recent = [], apiKey, model, baseUrl }) {
  if (!apiKey) throw new Error("OPENAI_API_KEY required");
  const chosenModel = model || defaultDepinChatModel(process.env);
  const url = (baseUrl || process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "") + "/chat/completions";

  const payload = {
    model: chosenModel,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM },
      { role: "user", content: buildUserPrompt(heroes, recent) },
    ],
  };
  if (usesCompletionTokensParam(chosenModel)) {
    payload.max_completion_tokens = 2000;
    payload.reasoning_effort = "low";
  } else {
    payload.temperature = 0.75;
    payload.max_tokens = 2000;
  }

  const res = await fetch(url, {
    method: "POST",
    headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(45_000),
  });
  const raw = await res.text();
  if (!res.ok) throw new Error(`LLM HTTP ${res.status} (${chosenModel}): ${raw.slice(0, 300)}`);

  const body = JSON.parse(raw);
  const content = body.choices?.[0]?.message?.content;
  const parsed = JSON.parse(content);
  parsed._model = chosenModel;
  return parsed;
}

/**
 * Drop-in for the dashboard: AI content when a key is available, else templates.
 * Persists what it generated so tomorrow's run avoids repeating today.
 */
export async function buildDailyPostsSmart(today = new Date().toISOString().slice(0, 10), opts = {}) {
  loadEnvQuiet();
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  const heroes = heroesToday();
  if (!apiKey || !heroes.length) {
    return { ...buildDailyPosts(today), source: "template" };
  }

  const history = loadHistory();
  // Reuse today's generation so dashboard refreshes are instant (no re-spend).
  if (!opts.force && history[today]?.posts?.length) {
    const cached = history[today];
    return {
      today,
      leadNetwork: cached.leadNetwork || heroes[0].network,
      posts: cached.posts,
      thread: cached.thread || [],
      source: "ai:cached",
    };
  }

  try {
    const gen = await generateAiContent({ heroes, recent: recentTexts(history), apiKey });
    const posts = (gen.posts || []).filter((p) => p?.text);
    if (!posts.length) throw new Error("empty generation");

    const leadNetwork = gen.leadNetwork || heroes[0].network;
    history[today] = { leadNetwork, posts, thread: gen.thread || [] };
    saveHistory(history);
    return { today, leadNetwork, posts, thread: gen.thread || [], source: `ai:${gen._model}` };
  } catch (e) {
    console.error(`[ai-posts] fell back to templates: ${e.message}`);
    return { ...buildDailyPosts(today), source: "template-fallback" };
  }
}

// CLI: show BEFORE (templates) vs AFTER (AI) on today's real data.
const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isMain) {
  loadEnvQuiet();
  const today = new Date().toISOString().slice(0, 10);
  const heroes = heroesToday();
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  const sep = "─".repeat(70);
  console.log(`\n${sep}\nBEFORE — current template posts\n${sep}`);
  for (const p of buildDailyPosts(today).posts) console.log(`\n[${p.goal}]\n${p.text}`);

  if (!apiKey) {
    console.log("\n(no OPENAI_API_KEY — cannot show AI version)");
  } else {
    console.log(`\n${sep}\nAFTER — AI-generated from the same real numbers\n${sep}`);
    try {
      const gen = await generateAiContent({ heroes, recent: [], apiKey });
      for (const p of gen.posts || []) console.log(`\n[${p.goal}]\n${p.text}`);
      console.log(`\n--- THREAD ---`);
      (gen.thread || []).forEach((t, i) => console.log(`\n${i + 1}/ ${t}`));
      console.log(`\n(model: ${gen._model})`);
    } catch (e) {
      console.error(`\nAI generation failed: ${e.message}`);
    }
  }
}
