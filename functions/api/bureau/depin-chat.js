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
const MAX_OUTPUT_TOKENS = 600;
/** Stay under Cloudflare Pages function wall-clock limit (~30s). */
const OPENAI_TIMEOUT_MS = 25_000;
const MAX_CONTEXT_CHARS = 12_000;

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

/** Public pack — always fetch deployed static JSON (avoids loopback deadlock in wrangler dev). */
const CONTEXT_PACK_URL =
  "https://getkinetik.app/data/depin-chat-context.json";

async function loadContextPack() {
  const res = await fetch(CONTEXT_PACK_URL, {
    headers: { accept: "application/json" },
    cf: { cacheTtl: 300 },
  });
  if (!res.ok) throw new Error(`context ${res.status}`);
  return res.json();
}

export async function onRequestPost(ctx) {
  try {
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
      const pack = await loadContextPack();
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

    // Public chat must answer in <30s on Pages. Shared BUREAU_NEWS_MODEL=gpt-5 is too slow here.
    const configured = defaultDepinChatModel(env);
    const primaryModel = /^gpt-5/i.test(configured) ? "gpt-4o-mini" : configured;
    const fallbackModel = "gpt-4o-mini";

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
    let result = await chatCompletions({
      apiKey: env.OPENAI_API_KEY,
      model: primaryModel,
      messages: chatMessages,
      maxOutput: MAX_OUTPUT_TOKENS,
      timeoutMs: OPENAI_TIMEOUT_MS,
    });

    if (
      !result.ok &&
      primaryModel !== fallbackModel &&
      /model unavailable|model_not_found|does not have access/i.test(
        result.error || "",
      )
    ) {
      result = await chatCompletions({
        apiKey: env.OPENAI_API_KEY,
        model: fallbackModel,
        messages: chatMessages,
        maxOutput: MAX_OUTPUT_TOKENS,
        timeoutMs: OPENAI_TIMEOUT_MS,
      });
    }

    if (!result.ok) {
      return json({ error: result.error, model: primaryModel }, result.status);
    }

    return json({ reply: result.reply, model: result.model });
  } catch (err) {
    console.error("[depin-chat]", err);
    return json({ error: "Chat error — try again shortly." }, 502);
  }
}

export async function onRequestGet() {
  return json({
    ok: true,
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
