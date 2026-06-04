/**
 * OpenAI chat/completions helper for Cloudflare Pages functions.
 * Handles gpt-5 / o-series token param differences and safe error parsing.
 */

const DEFAULT_BASE = "https://api.openai.com/v1";

export function defaultDepinChatModel(env) {
  const raw =
    env?.BUREAU_DEPIN_CHAT_MODEL?.trim() ||
    env?.OPENAI_MODEL?.trim() ||
    "gpt-5";
  if (/^gpt-4o-mini$/i.test(raw)) return "gpt-5";
  return raw;
}

export function usesCompletionTokensParam(model) {
  return /^(gpt-5|o\d)/i.test(String(model || "").trim());
}

export function buildChatPayload({ model, messages, maxOutput = 1200 }) {
  const payload = { model, messages };
  if (usesCompletionTokensParam(model)) {
    payload.max_completion_tokens = maxOutput;
    payload.reasoning_effort = "minimal";
  } else {
    payload.temperature = 0.4;
    payload.max_tokens = maxOutput;
  }
  return payload;
}

function openAiErrorMessage(status, body) {
  const err = body?.error;
  const code = err?.code || err?.type || "";
  const msg = err?.message || `OpenAI HTTP ${status}`;

  if (code === "model_not_found" || /does not have access to model/i.test(msg)) {
    return "Chat model unavailable on this API key — set BUREAU_DEPIN_CHAT_MODEL to gpt-5 in Cloudflare.";
  }
  if (/max_tokens.*max_completion_tokens/i.test(msg)) {
    return "Chat model config error — redeploy latest bureau chat worker.";
  }
  if (status === 401) {
    return "Chat auth failed — check OPENAI_API_KEY on Cloudflare.";
  }
  if (status === 429) {
    return "Chat rate limited — try again in a minute.";
  }
  return "Model error — try again shortly.";
}

export async function chatCompletions({
  apiKey,
  model,
  messages,
  maxOutput = 1200,
  timeoutMs = 15_000,
  baseUrl = DEFAULT_BASE,
}) {
  const url = `${baseUrl.replace(/\/$/, "")}/chat/completions`;
  const payload = buildChatPayload({ model, messages, maxOutput });

  let res;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
      signal:
        typeof AbortSignal !== "undefined" && AbortSignal.timeout
          ? AbortSignal.timeout(timeoutMs)
          : undefined,
    });
  } catch (err) {
    const message =
      err?.name === "TimeoutError" || err?.name === "AbortError"
        ? "Chat timed out — try a shorter question."
        : "Chat upstream unreachable — try again shortly.";
    return { ok: false, status: 502, error: message, debug: `fetch:${err?.name || ""}:${String(err?.message || err).slice(0, 120)}` };
  }

  let body;
  try {
    body = await res.json();
  } catch {
    return { ok: false, status: 502, error: "Invalid response from model provider." };
  }

  if (!res.ok) {
    return {
      ok: false,
      status: res.status >= 500 ? 502 : 502,
      error: openAiErrorMessage(res.status, body),
    };
  }

  const reply = body.choices?.[0]?.message?.content?.trim();
  if (!reply) {
    const finish = body.choices?.[0]?.finish_reason;
    const hint =
      finish === "length"
        ? "Response truncated — try a shorter question or raise token budget."
        : "Empty response from model.";
    return { ok: false, status: 502, error: hint };
  }

  return { ok: true, reply, model: body.model || model };
}
