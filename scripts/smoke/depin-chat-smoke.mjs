#!/usr/bin/env node
/**
 * Smoke POST /api/bureau/depin-chat (in-process handler).
 * Usage:
 *   node scripts/smoke/depin-chat-smoke.mjs
 *   OPENAI_API_KEY=sk-... node scripts/smoke/depin-chat-smoke.mjs --live
 */
import { readFileSync, existsSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "../..");
const live = process.argv.includes("--live");

function loadDotEnv() {
  const p = join(root, ".env");
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 1) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (!process.env[k]) process.env[k] = v;
  }
}

loadDotEnv();

const { onRequestPost } = await import(
  pathToFileURL(join(root, "functions/api/bureau/depin-chat.js")).href
);

async function call(env, body) {
  const req = new Request("http://127.0.0.1/api/bureau/depin-chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const res = await onRequestPost({ request: req, env });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Non-JSON HTTP ${res.status}: ${text.slice(0, 120)}`);
  }
  return { status: res.status, data };
}

let failed = 0;

const noKey = await call({}, { messages: [{ role: "user", content: "hi" }] });
if (noKey.status !== 503 || !noKey.data.error) {
  console.error("FAIL expected 503 without OPENAI_API_KEY", noKey);
  failed++;
} else {
  console.log("PASS no API key → 503 JSON");
}

const key = process.env.OPENAI_API_KEY?.trim();
if (!key) {
  console.log("SKIP live OpenAI (--live or set OPENAI_API_KEY in .env)");
  process.exit(failed ? 1 : 0);
}

if (!live && !process.argv.includes("--live")) {
  console.log("SKIP live OpenAI (pass --live to call OpenAI)");
  process.exit(failed ? 1 : 0);
}

const liveRes = await call(
  { OPENAI_API_KEY: key, BUREAU_DEPIN_CHAT_MODEL: process.env.BUREAU_DEPIN_CHAT_MODEL },
  {
    messages: [
      {
        role: "user",
        content: "In one sentence, what does a neutral DePIN bureau do?",
      },
    ],
  },
);

if (liveRes.status !== 200 || !liveRes.data.reply) {
  console.error("FAIL live chat", liveRes);
  failed++;
} else {
  console.log("PASS live chat →", liveRes.data.reply.slice(0, 120) + "…");
  console.log("model:", liveRes.data.model);
}

process.exit(failed ? 1 : 0);
