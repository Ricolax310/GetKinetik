#!/usr/bin/env node
// Local Command Center — localhost only. Not deployed to getkinetik.app.

import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { OUT_JSON, REPO_ROOT, todayUtc } from "./command-center/config.mjs";
import { buildCommandCenter } from "./command-center/build.mjs";
import { startAgentJobs } from "./command-center/jobs.mjs";
import { openAgentStore } from "./command-center/sqlite-store.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UI_DIR = path.join(REPO_ROOT, "tools/command-center");
const PORT = Number(process.env.COMMAND_CENTER_PORT || 5200);
const HOST = process.env.COMMAND_CENTER_HOST || "127.0.0.1";
const MAX_BODY = 32_000;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

function send(res, status, body, type = "text/plain; charset=utf-8") {
  res.writeHead(status, {
    "content-type": type,
    "cache-control": "no-store",
  });
  res.end(body);
}

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

async function ensureFresh() {
  const today = todayUtc();
  if (!fs.existsSync(OUT_JSON)) {
    console.error("[command-center] No data yet — running first build…");
    await buildCommandCenter({ fetchRss: process.env.COMMAND_CENTER_FETCH_RSS_AUTO === "1" });
    return;
  }
  try {
    const payload = JSON.parse(fs.readFileSync(OUT_JSON, "utf8"));
    if (payload.today === today) return;
    console.error(
      `[command-center] Stale brief (${payload.today || "unknown"}) — rebuilding for ${today}…`,
    );
  } catch {
    console.error("[command-center] Corrupt payload — rebuilding…");
  }
  await buildCommandCenter({ fetchRss: process.env.COMMAND_CENTER_FETCH_RSS_AUTO === "1" });
}

function handleTaskState(res) {
  const store = openAgentStore();
  try {
    send(res, 200, JSON.stringify({ done: store.getDoneTasks() }), MIME[".json"]);
  } finally {
    store.close();
  }
}

async function handleTaskToggle(req, res) {
  let body;
  try {
    body = await readJsonBody(req);
  } catch (e) {
    return send(res, 400, JSON.stringify({ error: e.message }), MIME[".json"]);
  }
  if (!body?.key || typeof body.key !== "string") {
    return send(res, 400, JSON.stringify({ error: "Missing task key" }), MIME[".json"]);
  }
  const store = openAgentStore();
  try {
    store.setTaskDone(body.key, body.done === true, body.label ? String(body.label).slice(0, 200) : null);
    send(res, 200, JSON.stringify({ ok: true, key: body.key, done: body.done === true }), MIME[".json"]);
  } catch (e) {
    send(res, 500, JSON.stringify({ error: String(e?.message || e) }), MIME[".json"]);
  } finally {
    store.close();
  }
}

async function handleRefresh(req, res) {
  let body = {};
  try {
    body = await readJsonBody(req);
  } catch (e) {
    return send(res, 400, JSON.stringify({ error: e.message }), MIME[".json"]);
  }

  try {
    const payload = await buildCommandCenter({
      fetchRss: body.fetchRss === true,
    });
    send(
      res,
      200,
      JSON.stringify({ ok: true, updatedAt: payload.updatedAt, today: payload.today }),
      MIME[".json"],
    );
  } catch (e) {
    send(res, 500, JSON.stringify({ error: String(e?.message || e) }), MIME[".json"]);
  }
}

function serveStatic(req, res) {
  let urlPath = req.url?.split("?")[0] || "/";

  if (urlPath === "/data/command-center.json") {
    if (!fs.existsSync(OUT_JSON)) {
      return send(
        res,
        404,
        JSON.stringify({ error: "Run npm run command-center:build first." }),
        MIME[".json"],
      );
    }
    return send(res, 200, fs.readFileSync(OUT_JSON, "utf8"), MIME[".json"]);
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
  if (req.method === "POST" && req.url?.startsWith("/api/refresh")) {
    return handleRefresh(req, res);
  }
  if (req.method === "POST" && req.url?.startsWith("/api/task")) {
    return handleTaskToggle(req, res);
  }
  if (req.method === "GET" && req.url?.split("?")[0] === "/data/task-state.json") {
    return handleTaskState(res);
  }
  if (req.method === "GET" || req.method === "HEAD") {
    return serveStatic(req, res);
  }
  send(res, 405, "Method not allowed");
});

if (!fs.existsSync(UI_DIR)) {
  console.error("Missing tools/command-center");
  process.exit(1);
}

await ensureFresh();

let stopJobs = () => {};
try {
  const store = openAgentStore();
  stopJobs = startAgentJobs({ store, buildCommandCenter });
} catch (e) {
  console.warn(`[command-center] Background jobs disabled: ${e.message}`);
}

server.on("error", (err) => {
  if (err && err.code === "EADDRINUSE") {
    console.error(
      `\n[command-center] Port ${PORT} is already in use — another Command Center is running.\n` +
        `  Stop it (PowerShell):\n` +
        `    Get-NetTCPConnection -LocalPort ${PORT} -State Listen | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }\n` +
        `  Or use another port:  $env:COMMAND_CENTER_PORT=5201; npm run command-center\n`,
    );
  } else {
    console.error("[command-center] server error:", err);
  }
  process.exit(1);
});

server.listen(PORT, HOST, () => {
  console.log(`
GETKINETIK Command Center (localhost only)

  http://${HOST}:${PORT}/

  Data: docs/bureau/private/command-center.json
  Rebuild: npm run command-center:build
  Open app: npm run command-center:open

  Stop: Ctrl+C
`);
});

process.on("SIGINT", () => {
  stopJobs();
  server.close(() => process.exit(0));
});
