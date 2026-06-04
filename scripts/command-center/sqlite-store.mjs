// SQLite-backed local store for command-center agent state.
// Uses Node's built-in experimental sqlite module (no external dependency).

import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { PRIVATE_DIR, SQLITE_DB_PATH } from "./config.mjs";

function nowIso() {
  return new Date().toISOString();
}

function ensureDbDir() {
  fs.mkdirSync(PRIVATE_DIR, { recursive: true });
}

export function openAgentStore() {
  ensureDbDir();
  const db = new DatabaseSync(SQLITE_DB_PATH);
  db.exec(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS agent_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kind TEXT NOT NULL,
      ran_at TEXT NOT NULL,
      status TEXT NOT NULL,
      note TEXT
    );

    CREATE TABLE IF NOT EXISTS morning_briefs (
      brief_date TEXT PRIMARY KEY,
      generated_at TEXT NOT NULL,
      model TEXT,
      payload_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS social_signals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      captured_at TEXT NOT NULL,
      network TEXT,
      signal_type TEXT,
      title TEXT NOT NULL,
      source TEXT,
      url TEXT,
      score REAL,
      payload_json TEXT
    );

    CREATE TABLE IF NOT EXISTS pilot_rankings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      captured_at TEXT NOT NULL,
      company TEXT NOT NULL,
      contact_name TEXT,
      warmness_score INTEGER,
      should_contact_today INTEGER NOT NULL DEFAULT 0,
      overdue INTEGER NOT NULL DEFAULT 0,
      next_action TEXT
    );

    CREATE TABLE IF NOT EXISTS project_health_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      captured_at TEXT NOT NULL,
      open_issues INTEGER,
      pending_tasks INTEGER,
      deployment_status TEXT,
      ci_status TEXT,
      doc_gaps INTEGER,
      business_guardrail INTEGER NOT NULL DEFAULT 1,
      payload_json TEXT
    );
  `);

  const statements = {
    insertRun: db.prepare(
      "INSERT INTO agent_runs (kind, ran_at, status, note) VALUES (?, ?, ?, ?)",
    ),
    latestRunForKind: db.prepare(
      "SELECT kind, ran_at, status, note FROM agent_runs WHERE kind = ? ORDER BY ran_at DESC LIMIT 1",
    ),
    upsertBrief: db.prepare(`
      INSERT INTO morning_briefs (brief_date, generated_at, model, payload_json)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(brief_date) DO UPDATE SET
        generated_at = excluded.generated_at,
        model = excluded.model,
        payload_json = excluded.payload_json
    `),
    getBriefByDate: db.prepare(
      "SELECT brief_date, generated_at, model, payload_json FROM morning_briefs WHERE brief_date = ?",
    ),
    latestBrief: db.prepare(
      "SELECT brief_date, generated_at, model, payload_json FROM morning_briefs ORDER BY brief_date DESC LIMIT 1",
    ),
    wipeSignals: db.prepare("DELETE FROM social_signals"),
    insertSignal: db.prepare(`
      INSERT INTO social_signals
      (captured_at, network, signal_type, title, source, url, score, payload_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `),
    wipePilot: db.prepare("DELETE FROM pilot_rankings"),
    insertPilot: db.prepare(`
      INSERT INTO pilot_rankings
      (captured_at, company, contact_name, warmness_score, should_contact_today, overdue, next_action)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `),
    wipeHealth: db.prepare("DELETE FROM project_health_snapshots"),
    insertHealth: db.prepare(`
      INSERT INTO project_health_snapshots
      (captured_at, open_issues, pending_tasks, deployment_status, ci_status, doc_gaps, business_guardrail, payload_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `),
  };

  return {
    path: path.relative(process.cwd(), SQLITE_DB_PATH).replace(/\\/g, "/"),

    logRun(kind, status, note = null) {
      statements.insertRun.run(kind, nowIso(), status, note);
    },

    latestRun(kind) {
      return statements.latestRunForKind.get(kind) || null;
    },

    upsertMorningBrief(briefDate, model, payload) {
      statements.upsertBrief.run(
        briefDate,
        nowIso(),
        model || "heuristic",
        JSON.stringify(payload),
      );
    },

    getMorningBrief(briefDate) {
      const row = statements.getBriefByDate.get(briefDate);
      if (!row) return null;
      return {
        briefDate: row.brief_date,
        generatedAt: row.generated_at,
        model: row.model,
        payload: JSON.parse(row.payload_json),
      };
    },

    latestMorningBrief() {
      const row = statements.latestBrief.get();
      if (!row) return null;
      return {
        briefDate: row.brief_date,
        generatedAt: row.generated_at,
        model: row.model,
        payload: JSON.parse(row.payload_json),
      };
    },

    replaceSocialSignals(items) {
      db.exec("BEGIN");
      try {
        statements.wipeSignals.run();
        const ts = nowIso();
        for (const item of items || []) {
          statements.insertSignal.run(
            ts,
            item.network || null,
            item.signalType || null,
            item.title || "Untitled signal",
            item.source || null,
            item.url || null,
            Number(item.score || 0),
            JSON.stringify(item),
          );
        }
        db.exec("COMMIT");
      } catch (e) {
        db.exec("ROLLBACK");
        throw e;
      }
    },

    replacePilotRankings(rows) {
      db.exec("BEGIN");
      try {
        statements.wipePilot.run();
        const ts = nowIso();
        for (const row of rows || []) {
          statements.insertPilot.run(
            ts,
            row.company || "Unknown",
            row.contact || null,
            Number(row.warmnessScore || 0),
            row.shouldContactToday ? 1 : 0,
            row.overdue ? 1 : 0,
            row.nextAction || null,
          );
        }
        db.exec("COMMIT");
      } catch (e) {
        db.exec("ROLLBACK");
        throw e;
      }
    },

    recordProjectHealth(health) {
      statements.wipeHealth.run();
      statements.insertHealth.run(
        nowIso(),
        Number(health.openIssues || 0),
        Number(health.pendingTasks || 0),
        health.deploymentStatus || "unknown",
        health.ciStatus || "unknown",
        Number(health.documentationGaps || 0),
        health.businessGuardrail ? 1 : 0,
        JSON.stringify(health),
      );
    },

    close() {
      db.close();
    },
  };
}
