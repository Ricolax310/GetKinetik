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
import { embedTexts, rankChunks, rerank } from "../_lib/hfEmbed.js";

const MAX_MESSAGES = 16;
const MAX_USER_CHARS = 2000;
// gpt-5 spends reasoning tokens from this same budget even at minimal effort —
// 400 left zero tokens for the visible answer ("Empty reply from chat service").
const MAX_OUTPUT_TOKENS = 1500;
/** Stay under Cloudflare Pages function wall-clock limit (~30s).
 *  Context fetch is bounded separately, so 20s here keeps worst-case total safe. */
const OPENAI_TIMEOUT_MS = 20_000;
const MAX_CONTEXT_CHARS = 6_000;
const RETRIEVAL_TOP_K = 8;
const EMBED_TIMEOUT_MS = 6_000;
const BUILD_MARKER = "chat-retrieval-1";

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

/**
 * Embedding-based retrieval: pick the chunks most relevant to the user's question
 * instead of sending one truncated blob. Requires the pack to carry precomputed
 * chunk embeddings (pack.retrieval) AND an HF token in the env. Returns the
 * focused context string, or null to signal "fall back to plain context".
 */
async function retrieveContext(pack, query, env) {
  const index = pack?.retrieval;
  const token = env?.HF_TOKEN?.trim();
  if (!token || !index?.chunks?.length || !index.model || !query) return null;

  try {
    const [queryVec] = await embedTexts({
      texts: query,
      token,
      model: index.model,
      timeoutMs: EMBED_TIMEOUT_MS,
    });
    if (!queryVec?.length) return null;

    const top = rankChunks(queryVec, index.chunks, RETRIEVAL_TOP_K);

    // Optional cross-encoder rerank — only when a rerank model is configured.
    // Fully fault-tolerant: returns the embedding order on any issue.
    const rerankModel = env?.BUREAU_RERANK_MODEL?.trim();
    let passages = top.map((t) => t.text);
    if (rerankModel) {
      passages = await rerank({
        query,
        passages,
        token,
        model: rerankModel,
        timeoutMs: EMBED_TIMEOUT_MS,
      });
    }

    let out = "";
    for (const text of passages) {
      if (out.length + text.length + 2 > MAX_CONTEXT_CHARS) break;
      out += (out ? "\n\n" : "") + text;
    }
    return out || null;
  } catch {
    return null; // any failure → caller uses the plain truncated context
  }
}

export async function onRequestPost(ctx) {
  try {
    const { request, env } = ctx;

    // Diagnostic probe: POST ?ping returns immediately (no context, no OpenAI).
    // Isolates whether platform 502s originate before or during the model call.
    if (new URL(request.url).searchParams.has("ping")) {
      return json({ ok: true, build: BUILD_MARKER, pong: true, hasKey: Boolean(env.OPENAI_API_KEY?.trim()) });
    }

    // Diagnostic probe: POST ?probe makes a minimal outbound OpenAI request
    // and reports the upstream status — isolates key/egress issues.
    if (new URL(request.url).searchParams.has("probe")) {
      const stages = { build: BUILD_MARKER, hasKey: Boolean(env.OPENAI_API_KEY?.trim()) };
      try {
        const r = await fetch("https://api.openai.com/v1/models?limit=1", {
          headers: { authorization: `Bearer ${env.OPENAI_API_KEY}` },
          signal: withTimeout(8000),
        });
        stages.upstreamStatus = r.status;
        stages.keyValid = r.status !== 401;
      } catch (e) {
        stages.fetchError = `${e?.name || "Error"}: ${String(e?.message || e).slice(0, 160)}`;
      }
      return json(stages);
    }

    // NOTE: error responses use HTTP 200 + { ok:false, error } on purpose.
    // Cloudflare replaces 502/52x response bodies with its own plaintext page
    // ("error code: 502"), which hides the real error from the frontend.
    if (!env.OPENAI_API_KEY?.trim()) {
      return json({ ok: false, error: "Chat is offline — add OPENAI_API_KEY on Cloudflare Pages (Production)." });
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
      const query = messages[messages.length - 1]?.content || "";

      // Prefer focused, embedding-retrieved context; fall back to truncation.
      const retrieved = await retrieveContext(pack, query, env);
      if (retrieved) {
        context = retrieved;
      } else {
        context =
          rawContext.length > MAX_CONTEXT_CHARS
            ? `${rawContext.slice(0, MAX_CONTEXT_CHARS)}\n\n[context truncated for chat]`
            : rawContext || context;
      }

      meta = `Pack generated: ${pack.generatedAt || pack.updatedAt || "unknown"}. `;
      if (retrieved) meta += "Context retrieved by relevance. ";
      if (pack.news?.liveHeadlines?.length) {
        meta += `${pack.news.liveHeadlines.length} live headlines + `;
      }
      if (pack.news?.topPick?.title) {
        meta += `today's bureau news pick: "${pack.news.topPick.title}". `;
      }
    } catch {
      /* use fallback context */
    }

    const modelOverride = new URL(request.url).searchParams.get("model");
    const model = modelOverride || defaultDepinChatModel(env);

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

    // Diagnostic: ?nocall runs context-load + prompt build but SKIPS OpenAI.
    if (new URL(request.url).searchParams.has("nocall")) {
      return json({ ok: true, build: BUILD_MARKER, promptChars: system.length, model });
    }

    const chatMessages = [{ role: "system", content: system }, ...messages];
    const result = await chatCompletions({
      apiKey: env.OPENAI_API_KEY,
      model,
      messages: chatMessages,
      maxOutput: MAX_OUTPUT_TOKENS,
      timeoutMs: OPENAI_TIMEOUT_MS,
    });

    if (!result.ok) {
      return json({ ok: false, error: result.error, model, debug: result.debug || null });
    }

    return json({ ok: true, reply: result.reply, model: result.model });
  } catch (err) {
    console.error("[depin-chat]", err);
    return json({
      ok: false,
      error: "Chat error — try again shortly.",
      debug: String(err?.message || err).slice(0, 200),
      where: "outer-catch",
    });
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
