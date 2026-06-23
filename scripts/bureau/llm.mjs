// Shared LLM caller for all bureau/command-center drafting.
//
// WHY THIS EXISTS: drafting used to call OpenAI directly in several places, so
// when OpenAI ran out of quota (HTTP 429 insufficient_quota) EVERY draft went
// dark with no fallback. This helper makes one provider failing non-fatal:
//   1. Try OpenAI (primary).
//   2. On any failure (quota, auth, network, empty), fall back to Hugging Face
//      router (OpenAI-compatible) when HF_TOKEN is set.
// It always returns a structured result with a clear reason on failure — never
// throws silently, never returns empty without saying why.

import { defaultDepinChatModel, usesCompletionTokensParam } from "../../functions/api/_lib/openaiChat.js";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const HF_URL = "https://router.huggingface.co/v1/chat/completions";
// HF fallback model — override with HF_FALLBACK_MODEL in .env. Must be a model
// served by the HF router's OpenAI-compatible endpoint.
const HF_DEFAULT_MODEL = "meta-llama/Llama-3.3-70B-Instruct";

/**
 * @param {object} o
 * @param {string} o.system           system prompt
 * @param {string} o.user             user prompt
 * @param {number} [o.maxOutput=2000]  token budget
 * @param {number} [o.temperature=0.6] sampling temp (non-reasoning models)
 * @param {boolean} [o.jsonMode=true]  request JSON object output
 * @param {number} [o.timeoutMs=45000] per-call timeout
 * @param {string} [o.openaiModel]     override OpenAI model
 * @returns {Promise<{ ok: boolean, content: string|null, provider: string|null, error: string|null }>}
 */
export async function llmChat({
  system,
  user,
  maxOutput = 2000,
  temperature = 0.6,
  jsonMode = true,
  timeoutMs = 45_000,
  openaiModel,
} = {}) {
  const messages = [
    { role: "system", content: system },
    { role: "user", content: user },
  ];
  const errors = [];

  // ── Primary: OpenAI ────────────────────────────────────────────────────────
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (apiKey) {
    const model = openaiModel || defaultDepinChatModel(process.env);
    const payload = { model, messages };
    if (jsonMode) payload.response_format = { type: "json_object" };
    if (usesCompletionTokensParam(model)) {
      payload.max_completion_tokens = maxOutput;
      payload.reasoning_effort = "low";
    } else {
      payload.temperature = temperature;
      payload.max_tokens = maxOutput;
    }
    const r = await callProvider(OPENAI_URL, apiKey, payload, timeoutMs);
    if (r.ok) return { ok: true, content: r.content, provider: `openai:${model}`, error: null };
    errors.push(`openai: ${r.error}`);
  } else {
    errors.push("openai: no OPENAI_API_KEY");
  }

  // ── Fallback: Hugging Face router (OpenAI-compatible) ───────────────────────
  const hfToken = process.env.HF_TOKEN?.trim();
  if (hfToken) {
    const model = process.env.HF_FALLBACK_MODEL?.trim() || HF_DEFAULT_MODEL;
    const payload = { model, messages, max_tokens: maxOutput, temperature };
    if (jsonMode) payload.response_format = { type: "json_object" };
    const r = await callProvider(HF_URL, hfToken, payload, timeoutMs);
    if (r.ok) return { ok: true, content: r.content, provider: `hf:${model}`, error: null };
    errors.push(`hf: ${r.error}`);
  } else {
    errors.push("hf: no HF_TOKEN");
  }

  return { ok: false, content: null, provider: null, error: errors.join(" | ") };
}

async function callProvider(url, token, payload, timeoutMs) {
  let res;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout?.(timeoutMs),
    });
  } catch (e) {
    const name = e?.name || "";
    return { ok: false, error: name === "TimeoutError" || name === "AbortError" ? "timed out" : `unreachable (${String(e?.message || e).slice(0, 80)})` };
  }
  let body;
  const raw = await res.text();
  if (!res.ok) {
    // Pull a concise reason (quota/auth/rate-limit) from the error body.
    let reason = `HTTP ${res.status}`;
    try {
      const j = JSON.parse(raw);
      if (j?.error?.code) reason = `HTTP ${res.status} ${j.error.code}`;
      else if (j?.error?.message) reason = `HTTP ${res.status} ${String(j.error.message).slice(0, 80)}`;
    } catch {
      /* non-JSON error body */
    }
    return { ok: false, error: reason };
  }
  try {
    body = JSON.parse(raw);
  } catch {
    return { ok: false, error: "invalid JSON from provider" };
  }
  const content = body.choices?.[0]?.message?.content?.trim();
  if (!content) {
    const finish = body.choices?.[0]?.finish_reason;
    return { ok: false, error: finish === "length" ? "truncated (raise token budget)" : "empty response" };
  }
  return { ok: true, content };
}
