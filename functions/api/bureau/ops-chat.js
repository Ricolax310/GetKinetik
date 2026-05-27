/**
 * POST /api/bureau/ops-chat
 *
 * Bureau ops assistant — answers questions using deployed bureau-ops.json context.
 *
 * Cloudflare Pages → Settings → Functions → Environment variables:
 *   OPENAI_API_KEY           (required)
 *   BUREAU_OPS_CHAT_TOKEN    (required in production — Bearer token from ops page)
 *   BUREAU_OPS_CHAT_MODEL    (optional, default gpt-4o-mini)
 *
 * Body: { messages: [{ role: "user"|"assistant", content: string }] }
 * Response: { reply: string, model: string }
 */

const MAX_MESSAGES = 24;
const MAX_USER_CHARS = 4000;

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function authorize(request, env) {
  const required = env.BUREAU_OPS_CHAT_TOKEN?.trim();
  if (!required) {
    return {
      ok: false,
      error:
        "Ops chat is not enabled. Set BUREAU_OPS_CHAT_TOKEN in Cloudflare Pages env.",
    };
  }
  const auth = request.headers.get("authorization") || "";
  if (auth !== `Bearer ${required}`) {
    return { ok: false, error: "Invalid or missing access token." };
  }
  return { ok: true };
}

async function loadOpsContext(origin) {
  const url = `${origin}/data/bureau-ops.json`;
  const res = await fetch(url, { cf: { cacheTtl: 60 } });
  if (!res.ok) throw new Error(`Failed to load ops pack (${res.status})`);
  const pack = await res.json();
  return pack.chatContext || "";
}

export async function onRequestPost(ctx) {
  const { request, env } = ctx;
  const auth = authorize(request, env);
  if (!auth.ok) return json({ error: auth.error }, auth.error.includes("not enabled") ? 503 : 401);

  if (!env.OPENAI_API_KEY?.trim()) {
    return json({ error: "OPENAI_API_KEY not configured on server." }, 503);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON." }, 400);
  }

  const raw = Array.isArray(body?.messages) ? body.messages : [];
  const messages = raw
    .filter((m) => m && (m.role === "user" || m.role === "assistant"))
    .slice(-MAX_MESSAGES)
    .map((m) => ({
      role: m.role,
      content: String(m.content || "").slice(0, MAX_USER_CHARS),
    }));

  if (!messages.length || messages[messages.length - 1].role !== "user") {
    return json({ error: "Send at least one user message." }, 400);
  }

  const origin = new URL(request.url).origin;
  let context;
  try {
    context = await loadOpsContext(origin);
  } catch (e) {
    return json({ error: `Context load failed: ${e.message}` }, 500);
  }

  const model = (env.BUREAU_OPS_CHAT_MODEL || "gpt-4o-mini").trim();
  const system = `You are Eric's GETKINETIK bureau ops coach — daily planning, not a generic chatbot.

Your job: say what to do TODAY aligned with the weekly outreach route in the context below. Be direct, human, short bullets.

OUTREACH ROUTE (never contradict):
- North star: a network team says "can you run this on our data?" — NOT DMs sent, APK count, or cold spam.
- Mon: public post (delta/sample read). Tue: one comment (insight, no pitch). Wed: one intro ask. Thu: marketer/Nas/micro-creator partner touch. Fri: follow up ONE engaged warm thread only. Sat–Sun: inbound or optional public snippet.
- NEVER recommend cold DMs to founders with huge inboxes, daily "send outreach" blasts, or third pings on wait-list contacts.
- Outreach drafts in repo = Friday nurture IF they engaged — not cold sends.

Other rules:
- Respect warm-lead wait rules in context (no @Mike, Manolis cooldown, Raziel 7-day bump).
- Never claim fraud proved — "patterns worth cross-checking", registry hygiene.
- Neutral bureau only — not aggregator / Yearn / token pitch.
- Split "automated (GitHub)" vs "you must paste/send manually".
- If Eric asks to cold-DM a founder, push back gently and offer the route alternative for today.

Tone: cofounder energy, not corporate policy memo.

--- Bureau context (deployed pack) ---
${context}`;

  const payload = {
    model,
    messages: [{ role: "system", content: system }, ...messages],
    max_tokens: 1200,
  };

  const oai = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.OPENAI_API_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!oai.ok) {
    const errText = await oai.text();
    return json({ error: `OpenAI error (${oai.status})`, detail: errText.slice(0, 400) }, 502);
  }

  const data = await oai.json();
  const reply = data.choices?.[0]?.message?.content?.trim();
  if (!reply) return json({ error: "Empty model response." }, 502);

  return json({ reply, model });
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "POST, OPTIONS",
      "access-control-allow-headers": "authorization, content-type",
    },
  });
}
