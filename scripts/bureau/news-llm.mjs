// Bureau news copy — OpenAI-compatible API with full GETKINETIK brain context.

import { buildKinetikBrainPack, defaultNewsModel } from "./news-context.mjs";
import { AI_OUTREACH_SYSTEM_BLOCK, getWeeklyOutreachTask } from "./gtm-route.mjs";

const BUREAU_SYSTEM = `You are the GETKINETIK bureau voice engine for Eric (@Ricolax310 / Kinetik_Rick).

You are fully briefed on GETKINETIK's mission, warm leads, live reads, wait rules, and WEEKLY OUTREACH ROUTE via the KINETIK BRAIN PACK. Treat that pack as ground truth over your general knowledge.

Write like a sharp operator — not marketing, not Gemini-flattery, not crypto bro.

${AI_OUTREACH_SYSTEM_BLOCK}

TODAY'S ROUTE SLOT: comments fit Tuesday; public posts fit Monday/Saturday; skip suggesting cold DMs or "send outreach email today" any day.

HARD RULES:
- Neutral bureau only. Never aggregator / Yearn / Plaid / "maximize earnings" framing.
- Never accuse Sybil/fraud proved. Use registry hygiene, economic concentration, second read.
- Respect WAIT rules in GTM brain — no @Mike, no @Manolis, no pitching Raziel a SAFE in comments.
- Skip price-hit pieces and takedown articles on partners we're nurturing.
- Comments must add ONE concrete insight (data lens, registry vs rewards, attestation at scale) — this is the Tuesday motion when the article fits.
- Do not repeat tweets/posts listed in recent automation or latest-posts drafts.
- In "notes", remind Eric of today's route task only if relevant (one short line).

OUTPUT: valid JSON only:
{
  "action": "comment" | "skip" | "own_post",
  "skipReason": "if skip",
  "confidence": 0.0-1.0,
  "networkIds": ["geodnet"],
  "linkedinComment": "2-4 sentences for paste under their article/post",
  "tweet": "standalone tweet <=270 chars if own_post OR strong news; else empty",
  "postTweet": false,
  "notes": "one line for Eric"
}

action=own_post when the article is major industry news and a standalone bureau tweet adds value (not a reply thread).
postTweet=true ONLY for own_post with confidence>=0.88 and tweet is factual.
confidence>=0.85 required for any publish recommendation.`;

export async function generateNewsCopy({
  article,
  networkIds,
  registry,
  model,
  apiKey,
  baseUrl,
}) {
  const brain = buildKinetikBrainPack(registry, networkIds);
  const route = getWeeklyOutreachTask();
  const user = `KINETIK BRAIN PACK:
${brain}

---
TODAY (UTC): ${route.day} — primary outreach focus: ${route.focus}
${route.task.replace(/\*\*/g, "")}

---
ARTICLE TO RESPOND TO:
Title: ${article.title}
URL: ${article.link}
Source: ${article.source}
Published: ${article.pubDate || "unknown"}
Snippet: ${article.description || "(none)"}
Matched networks: ${networkIds.join(", ") || "general DePIN"}

Decide skip, comment-only (linkedinComment), or own_post (linkedinComment optional + tweet with postTweet).`;

  const url = (baseUrl || "https://api.openai.com/v1").replace(/\/$/, "") + "/chat/completions";
  const chosenModel = model || defaultNewsModel();

  const payload = {
    model: chosenModel,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: BUREAU_SYSTEM },
      { role: "user", content: user },
    ],
  };
  // gpt-5 / o-series: only default temperature; omit param
  if (!/^(gpt-5|o\d)/i.test(chosenModel)) {
    payload.temperature = 0.25;
  }

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const raw = await res.text();
  if (!res.ok) {
    throw new Error(`LLM HTTP ${res.status} (${chosenModel}): ${raw.slice(0, 400)}`);
  }
  let parsed;
  try {
    const body = JSON.parse(raw);
    const content = body.choices?.[0]?.message?.content;
    parsed = JSON.parse(content);
  } catch (e) {
    throw new Error(`LLM parse failed: ${e.message}`);
  }
  parsed._model = chosenModel;
  return parsed;
}

export function pickBestCandidate(scoredItems, minScore = 25) {
  const viable = scoredItems.filter((x) => x.score >= minScore).sort((a, b) => b.score - a.score);
  return viable[0] || null;
}
