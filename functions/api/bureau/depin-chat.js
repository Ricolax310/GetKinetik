/**
 * POST /api/bureau/depin-chat
 *
 * Public DePIN trust & security Q&A for getkinetik.app visitors.
 * Uses only public context from /data/depin-chat-context.json (no private ops data).
 *
 * Cloudflare Pages env:
 *   OPENAI_API_KEY              (required)
 *   BUREAU_DEPIN_CHAT_MODEL     (optional, default gpt-4o-mini)
 */

const MAX_MESSAGES = 16;
const MAX_USER_CHARS = 2000;

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "access-control-allow-origin": "*",
    },
  });
}

async function loadPublicContext(origin) {
  const res = await fetch(`${origin}/data/depin-chat-context.json`, {
    cf: { cacheTtl: 300 },
  });
  if (!res.ok) throw new Error(`context ${res.status}`);
  const data = await res.json();
  return data.context || "";
}

export async function onRequestPost(ctx) {
  const { request, env } = ctx;

  if (!env.OPENAI_API_KEY?.trim()) {
    return json({ error: "Chat temporarily unavailable." }, 503);
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

  if (!messages.length || messages.at(-1).role !== "user") {
    return json({ error: "Send a message." }, 400);
  }

  const origin = new URL(request.url).origin;
  let context;
  try {
    context = await loadPublicContext(origin);
  } catch {
    context = "GETKINETIK neutral DePIN bureau — public reads on open data, signed device evidence optional.";
  }

  const model = (env.BUREAU_DEPIN_CHAT_MODEL || "gpt-4o-mini").trim();

  let meta = "";
  try {
    const res = await fetch(`${origin}/data/depin-chat-context.json`, { cf: { cacheTtl: 60 } });
    if (res.ok) {
      const pack = await res.json();
      meta = `Pack generated: ${pack.generatedAt || pack.updatedAt || "unknown"}. `;
      if (pack.news?.liveHeadlines?.length) {
        meta += `${pack.news.liveHeadlines.length} live headlines + `;
      }
      if (pack.news?.topPick?.title) {
        meta += `today's bureau news pick: "${pack.news.topPick.title}". `;
      }
    }
  } catch {
    /* ignore */
  }

  const system = `You are the public GETKINETIK bureau assistant on getkinetik.app.

You explain DePIN trust, security, and registry integrity in plain language for builders, operators, and curious visitors.

${meta}

Rules:
- Neutral bureau framing: friendly second read, not replacing network verifiers, no token, no custody.
- Never claim fraud is proved — use "patterns worth cross-checking", reproducible public evidence.
- No investment advice, no token price talk, no hype.
- When relevant, mention public sample reads and links (audits page, bureau, API docs).
- The context below includes refreshed public bureau reads AND recent DePIN news headlines — visitors may ask you to explain how a news story relates to trust, registry hygiene, or neutral verification.
- For news: discuss themes and industry implications; do not pretend you read full paywalled articles.
- Keep answers concise (2–6 short paragraphs or bullets max unless they ask for depth).
- If off-topic (unrelated to DePIN, infra trust, device attestation, mapping/RTK/weather networks), politely redirect.

--- Public context (refreshed with bureau automation) ---
${context}`;

  const oai = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.OPENAI_API_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "system", content: system }, ...messages],
      max_tokens: 900,
    }),
  });

  if (!oai.ok) {
    return json({ error: "Model error — try again shortly." }, 502);
  }

  const data = await oai.json();
  const reply = data.choices?.[0]?.message?.content?.trim();
  if (!reply) return json({ error: "Empty response." }, 502);

  return json({ reply, model });
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "POST, OPTIONS",
      "access-control-allow-headers": "content-type",
    },
  });
}
