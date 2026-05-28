#!/usr/bin/env node
// Private ops dashboard — localhost only. Not deployed to getkinetik.app.

import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvQuiet } from "./bureau/lib.mjs";
import { PRIVATE_OPS_DIR, REPO_ROOT } from "./bureau/private-paths.mjs";
import { runOpsChat } from "./bureau/ops-chat-core.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UI_DIR = path.join(REPO_ROOT, "tools/bureau-ops-ui");
const PORT = Number(process.env.BUREAU_OPS_PORT || 5199);
const HOST = "127.0.0.1";
const MAX_BODY = 64_000;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let buf = "";
    req.on("data", (c) => {
      buf += c;
      if (buf.length > MAX_BODY) reject(new Error("Body too large"));
    });
    req.on("end", () => {
      try {
        resolve(buf ? JSON.parse(buf) : {});
      } catch {
        reject(new Error("Invalid JSON"));
      }
    });
    req.on("error", reject);
  });
}

function send(res, status, body, type = "text/plain; charset=utf-8") {
  res.writeHead(status, { "content-type": type, "cache-control": "no-store" });
  res.end(body);
}

async function handleChat(req, res) {
  loadEnvQuiet();
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.BUREAU_OPS_CHAT_MODEL || "gpt-4o-mini";

  let body;
  try {
    body = await readJsonBody(req);
  } catch (e) {
    return send(res, 400, JSON.stringify({ error: e.message }), MIME[".json"]);
  }

  const raw = Array.isArray(body.messages) ? body.messages : [];
  const messages = raw
    .filter((m) => m && (m.role === "user" || m.role === "assistant"))
    .slice(-24)
    .map((m) => ({ role: m.role, content: String(m.content || "").slice(0, 4000) }));

  if (!messages.length || messages.at(-1).role !== "user") {
    return send(res, 400, JSON.stringify({ error: "Need a user message." }), MIME[".json"]);
  }

  const packPath = path.join(PRIVATE_OPS_DIR, "bureau-ops.json");
  let context = "";
  if (fs.existsSync(packPath)) {
    context = JSON.parse(fs.readFileSync(packPath, "utf8")).chatContext || "";
  }

  try {
    const out = await runOpsChat({ messages, context, apiKey, model });
    send(res, 200, JSON.stringify(out), MIME[".json"]);
  } catch (e) {
    send(res, 502, JSON.stringify({ error: e.message }), MIME[".json"]);
  }
}

function serveStatic(req, res) {
  let urlPath = req.url?.split("?")[0] || "/";
  if (urlPath === "/data/bureau-ops.json") {
    const packPath = path.join(PRIVATE_OPS_DIR, "bureau-ops.json");
    if (!fs.existsSync(packPath)) {
      return send(
        res,
        404,
        JSON.stringify({ error: "Run npm run bureau:brief first." }),
        MIME[".json"],
      );
    }
    return send(res, 200, fs.readFileSync(packPath, "utf8"), MIME[".json"]);
  }

  if (urlPath === "/" || urlPath === "") urlPath = "/index.html";
  const filePath = path.normalize(path.join(UI_DIR, urlPath));
  if (!filePath.startsWith(UI_DIR)) {
    return send(res, 403, "Forbidden");
  }
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    return send(res, 404, "Not found");
  }
  const ext = path.extname(filePath);
  send(res, 200, fs.readFileSync(filePath), MIME[ext] || "application/octet-stream");
}

const server = http.createServer((req, res) => {
  if (req.method === "POST" && req.url?.startsWith("/api/ops-chat")) {
    return handleChat(req, res);
  }
  if (req.method === "GET" || req.method === "HEAD") {
    return serveStatic(req, res);
  }
  send(res, 405, "Method not allowed");
});

if (!fs.existsSync(UI_DIR)) {
  console.error("Missing tools/bureau-ops-ui");
  process.exit(1);
}

server.listen(PORT, HOST, () => {
  console.log(`
GETKINETIK private ops (localhost only)

  http://${HOST}:${PORT}/

  Data: docs/bureau/private/ (not on getkinetik.app)
  Chat: uses OPENAI_API_KEY from .env

  Regenerate: npm run bureau:brief
  Stop: Ctrl+C
`);
});
