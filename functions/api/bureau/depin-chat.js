/**
 * POST /api/bureau/depin-chat
 *
 * Public DePIN trust & security Q&A for getkinetik.app visitors.
 * Uses only public context from /data/depin-chat-context.json (no private ops data).
 *
 * Cloudflare Pages env:
 *   OPENAI_API_KEY              (required)
 *   BUREAU_DEPIN_CHAT_MODEL     (optional, default gpt-5)
 *   OPENAI_MODEL                (optional fallback)
 */

import {
  chatCompletions,
  defaultDepinChatModel,
} from "../_lib/openaiChat.js";

const MAX_MESSAGES = 16;
const MAX_USER_CHARS = 2000;
const MAX_OUTPUT_TOKENS = 400;
/** Stay under Cloudflare Pages function wall-clock limit (~30s).
 *  Context fetch is bounded separately, so 20s here keeps worst-case total safe. */
const OPENAI_TIMEOUT_MS = 20_000;
const MAX_CONTEXT_CHARS = 6_000;
const BUILD_MARKER = "chat-resilience-4";

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

/** Public pack location (static asset shipped with the Pages deploy). */
const CONTEXT_PACK_PATH = "/data/depin-chat-context.json";
const CONTEXT_PACK_URL = "https://getkinetik.app/data/depin-chat-context.json";
const CONTEXT_FETCH_TIMEOUT_MS = 4000;

function withTimeout(ms) {
  return typeof AbortSignal !== "undefined" && AbortSignal.timeout
    ? AbortSignal.timeout(ms)
    : undefined;
}

/**
 * Load the public context pack WITHOUT a same-zone loopback hang.
 * 1. Prefer the Pages ASSETS binding (reads the bundled static file directly —
 *    no network round-trip, cannot loop back through this Function).
 * 2. Fall back to an external fetch with a hard timeout so it can never stall
 *    the request long enough for Cloudflare to 502 the whole Function.
 */
async function loadContextPack(env, request) {
  if (env?.ASSETS?.fetch && request?.url) {
    try {
      const assetUrl = new URL(CONTEXT_PACK_PATH, request.url);
      const res = await env.ASSETS.fetch(
        new Request(assetUrl, { headers: { accept: "application/json" } }),
      );
      if (res.ok) return await res.json();
    } catch {
      /* fall through to external fetch */
    }
  }

  const res = await fetch(CONTEXT_PACK_URL, {
    headers: { accept: "application/json" },
    cf: { cacheTtl: 300 },
    signal: withTimeout(CONTEXT_FETCH_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`context ${res.status}`);
  return res.json();
}

export async function onRequestPost(ctx) {
  try {
    const { request, env } = ctx;

    // Diagnostic probe: POST ?ping returns immediately (no context, no OpenAI).
    // Isolates whether platform 502s originate before or during the model call.
    if (new URL(request.url).searchParams.has("ping")) {
      return json({ ok: true, build: BUILD_MARKER, pong: true, hasKey: Boolean(env.OPENAI_API_KEY?.trim()) });
    }

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
        content:
          typeof m.content === "string"
            ? m.content.slice(0, MAX_USER_CHARS)
            : "",
      }))
      .filter((m) => m.content.trim().length > 0);

    if (!messages.length || messages[messages.length - 1].role !== "user") {
      return json({ error: "Send a message." }, 400);
    }

    let context =
      "GETKINETIK neutral DePIN bureau — public reads on open data, signed device evidence optional.";
    let meta = "";

    try {
      const pack = await loadContextPack(env, request);
      const rawContext =
        typeof pack.context === "string" ? pack.context : "";
      context =
        rawContext.length > MAX_CONTEXT_CHARS
          ? `${rawContext.slice(0, MAX_CONTEXT_CHARS)}\n\n[context truncated for chat]`
          : rawContext || context;
      meta = `Pack generated: ${pack.generatedAt || pack.updatedAt || "unknown"}. `;
      if (pack.news?.liveHeadlines?.length) {
        meta += `${pack.news.liveHeadlines.length} live headlines + `;
      }
      if (pack.news?.topPick?.title) {
        meta += `today's bureau news pick: "${pack.news.topPick.title}". `;
      }
    } catch {
      /* use fallback context */
    }

    const model = defaultDepinChatModel(env);

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

    const chatMessages = [{ role: "system", content: system }, ...messages];
    const result = await chatCompletions({
      apiKey: env.OPENAI_API_KEY,
      model,
      messages: chatMessages,
      maxOutput: MAX_OUTPUT_TOKENS,
      timeoutMs: OPENAI_TIMEOUT_MS,
    });

    if (!result.ok) {
      return json({ error: result.error, model, debug: result.debug || null }, result.status);
    }

    return json({ reply: result.reply, model: result.model });
  } catch (err) {
    console.error("[depin-chat]", err);
    return json(
      {
        error: "Chat error — try again shortly.",
        debug: String(err?.message || err).slice(0, 200),
        where: "outer-catch",
      },
      502,
    );
  }
}

export async function onRequestGet() {
  return json({
    ok: true,
    build: BUILD_MARKER,
    endpoint: "POST /api/bureau/depin-chat",
    bodyExample: {
      messages: [{ role: "user", content: "What does a neutral DePIN bureau do?" }],
    },
    requiresEnv: ["OPENAI_API_KEY"],
    optionalEnv: ["BUREAU_DEPIN_CHAT_MODEL", "OPENAI_MODEL"],
  });
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET, POST, OPTIONS",
      "access-control-allow-headers": "content-type",
    },
  });
}

export async function onRequest(ctx) {
  if (ctx.request.method === "OPTIONS") return onRequestOptions();
  if (ctx.request.method === "GET") return onRequestGet();
  if (ctx.request.method === "POST") return onRequestPost(ctx);
  return json({ error: "Method not allowed." }, 405);
}
