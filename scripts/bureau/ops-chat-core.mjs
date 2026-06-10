// Shared ops coach LLM call (local server only).

export const OPS_CHAT_SYSTEM_PREFIX = `You are Eric's GETKINETIK bureau ops coach — daily planning, not a generic chatbot.

Your job: say what to do TODAY aligned with the weekly outreach route in the context below. Be direct, human, short bullets.

OUTREACH ROUTE (never contradict):
- North star: a network team says "can you run this on our data?" — NOT DMs sent, APK count, or cold spam.
- Mon: public post (delta/sample read). Tue: one comment (insight, no pitch). Wed: one intro ask. Thu: marketer/Nas/micro-creator partner touch. Fri: follow up ONE engaged warm thread only. Sat–Sun: inbound or optional public snippet.
- NEVER recommend cold DMs to founders with huge inboxes, daily "send outreach" blasts, or third pings on wait-list contacts.
- Outreach drafts in repo = Friday nurture IF they engaged — not cold sends.

Other rules:
- Respect warm-lead wait rules in context (per-contact cooldowns live in the private GTM brain).
- Never claim fraud proved — "patterns worth cross-checking", registry hygiene.
- Neutral bureau only — not aggregator / Yearn / token pitch.
- Split "automated (GitHub)" vs "you must paste/send manually".
- If Eric asks to cold-DM a founder, push back gently and offer the route alternative for today.

Tone: cofounder energy, not corporate policy memo.

--- Bureau context (private local pack) ---
`;

export async function runOpsChat({
  messages,
  context,
  apiKey,
  model = "gpt-4o-mini",
  baseUrl = "https://api.openai.com/v1",
}) {
  if (!apiKey?.trim()) {
    throw new Error("OPENAI_API_KEY missing — add to .env at repo root.");
  }
  const system = `${OPS_CHAT_SYSTEM_PREFIX}${context || "(no context — run npm run bureau:brief)"}`;

  const payload = {
    model,
    messages: [{ role: "system", content: system }, ...messages],
    max_tokens: 1200,
  };

  const res = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const raw = await res.text();
  if (!res.ok) {
    throw new Error(`OpenAI HTTP ${res.status}: ${raw.slice(0, 400)}`);
  }

  const data = JSON.parse(raw);
  const reply = data.choices?.[0]?.message?.content?.trim();
  if (!reply) throw new Error("Empty model response.");
  return { reply, model };
}
