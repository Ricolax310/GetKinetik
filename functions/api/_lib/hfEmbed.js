/**
 * Hugging Face embeddings + lightweight retrieval helpers.
 *
 * Shared by:
 *   - scripts/bureau/build-depin-chat-context.mjs  (build-time: embed doc chunks)
 *   - functions/api/bureau/depin-chat.js           (query-time: embed the question)
 *
 * Uses the HF Inference router feature-extraction pipeline:
 *   POST https://router.huggingface.co/hf-inference/models/{model}/pipeline/feature-extraction
 *   Authorization: Bearer <HF_TOKEN>
 *   body: { "inputs": ["...", "..."] }
 *
 * Everything here is dependency-free and runs in both Node and Cloudflare Workers.
 */

export const DEFAULT_EMBED_MODEL = "sentence-transformers/all-MiniLM-L6-v2";
const ROUTER_BASE = "https://router.huggingface.co/hf-inference/models";

/** Mean-pool a token matrix (array of vectors) into a single vector. */
function meanPool(matrix) {
  const rows = matrix.length;
  const dims = matrix[0].length;
  const out = new Array(dims).fill(0);
  for (const row of matrix) {
    for (let i = 0; i < dims; i += 1) out[i] += row[i];
  }
  for (let i = 0; i < dims; i += 1) out[i] /= rows;
  return out;
}

/** Normalize an HF feature-extraction response into a list of 1-D sentence vectors. */
function normalizeEmbeddingResponse(data, count) {
  if (!Array.isArray(data)) throw new Error("Unexpected embedding response shape");
  // Single input returned as a flat vector → wrap it.
  if (typeof data[0] === "number") return [data];
  return data.map((entry) => {
    if (typeof entry[0] === "number") return entry; // already a sentence vector
    if (Array.isArray(entry[0])) return meanPool(entry); // token matrix → pool
    throw new Error("Unexpected embedding entry shape");
  }).slice(0, count);
}

/**
 * Embed one or more texts. Returns an array of number[] vectors (one per input).
 * Throws on auth/transport errors so callers can decide to fall back.
 */
export async function embedTexts({
  texts,
  token,
  model = DEFAULT_EMBED_MODEL,
  timeoutMs = 12_000,
  baseUrl = ROUTER_BASE,
}) {
  if (!token) throw new Error("HF token required for embeddings");
  const inputs = Array.isArray(texts) ? texts : [texts];
  if (!inputs.length) return [];

  const url = `${baseUrl.replace(/\/$/, "")}/${model}/pipeline/feature-extraction`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ inputs, options: { wait_for_model: true } }),
    signal:
      typeof AbortSignal !== "undefined" && AbortSignal.timeout
        ? AbortSignal.timeout(timeoutMs)
        : undefined,
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`HF embed HTTP ${res.status}: ${detail.slice(0, 160)}`);
  }
  const data = await res.json();
  return normalizeEmbeddingResponse(data, inputs.length);
}

/** Cosine similarity between two equal-length numeric vectors. */
export function cosineSim(a, b) {
  let dot = 0;
  let na = 0;
  let nb = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i += 1) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

/**
 * Split text into retrieval chunks on blank-line / section boundaries, then pack
 * paragraphs up to ~maxChars each so chunks stay semantically coherent.
 */
export function chunkText(text, { maxChars = 700, minChars = 80 } = {}) {
  const blocks = String(text || "")
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean);

  const chunks = [];
  let current = "";
  const flush = () => {
    const t = current.trim();
    if (t.length >= minChars) chunks.push(t);
    else if (t && chunks.length) chunks[chunks.length - 1] += `\n\n${t}`;
    else if (t) chunks.push(t);
    current = "";
  };

  for (const block of blocks) {
    if (block.length > maxChars) {
      flush();
      // Hard-split oversized blocks (e.g. long lists) on sentence boundaries.
      let buf = "";
      for (const sentence of block.split(/(?<=[.?!])\s+/)) {
        if ((buf + sentence).length > maxChars && buf) {
          chunks.push(buf.trim());
          buf = "";
        }
        buf += `${sentence} `;
      }
      if (buf.trim()) chunks.push(buf.trim());
      continue;
    }
    if ((current + block).length > maxChars) flush();
    current += (current ? "\n\n" : "") + block;
  }
  flush();
  return chunks;
}

/**
 * Rank pre-embedded chunks against a query vector and return the top-K.
 * `chunks` is [{ text, embedding }]. Returns [{ text, score }] sorted desc.
 */
export function rankChunks(queryVec, chunks, topK = 8) {
  return chunks
    .map((c) => ({ text: c.text, score: cosineSim(queryVec, c.embedding) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

/**
 * Optional second-stage rerank of candidate passages against the query using the
 * HF `sentence-similarity` pipeline (works with bi-encoder + cross-encoder
 * reranker models, e.g. cross-encoder/ettin-reranker-*). Returns passages
 * reordered by relevance, or the original order on any failure.
 *
 * Opt-in: callers should only invoke this when a rerank model is configured.
 */
export async function rerank({
  query,
  passages,
  token,
  model,
  timeoutMs = 6_000,
  baseUrl = ROUTER_BASE,
}) {
  if (!token || !model || !query || !passages?.length) return passages || [];
  try {
    const url = `${baseUrl.replace(/\/$/, "")}/${model}/pipeline/sentence-similarity`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        inputs: { source_sentence: query, sentences: passages },
        options: { wait_for_model: true },
      }),
      signal:
        typeof AbortSignal !== "undefined" && AbortSignal.timeout
          ? AbortSignal.timeout(timeoutMs)
          : undefined,
    });
    if (!res.ok) return passages;
    const scores = await res.json();
    if (!Array.isArray(scores) || scores.length !== passages.length) return passages;
    return passages
      .map((text, i) => ({ text, score: scores[i] }))
      .sort((a, b) => b.score - a.score)
      .map((x) => x.text);
  } catch {
    return passages; // never let rerank break the request
  }
}
