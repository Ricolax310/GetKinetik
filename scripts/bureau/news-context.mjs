// Assemble full GETKINETIK context for news LLM — keeps the model "in sync" with the repo.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  REPO_ROOT,
  DAILY_DIR,
  PIPELINE_PATH,
  loadRegistry,
  collectNetworkStatus,
  loadNetworkSnapshotStats,
  summarizeSnapshotDelta,
  extractHeadlineFindings,
  resolveRepo,
} from "./lib.mjs";
import { formatRouteMarkdown } from "./gtm-route.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GTM_BRAIN = path.join(__dirname, "gtm-context.md");
const MAX_FILE_CHARS = 12_000;

function buildBureauContext(registry, networkIds) {
  const lines = ["Live bureau reads (use at most one number if relevant):"];
  const ids = networkIds?.length ? networkIds : registry.map((n) => n.id);
  for (const net of registry) {
    if (!ids.includes(net.id)) continue;
    const { stats } = loadNetworkSnapshotStats(net);
    const delta = summarizeSnapshotDelta(net);
    const reportPath = resolveRepo(net.report);
    let finding = null;
    if (fs.existsSync(reportPath)) {
      const findings = extractHeadlineFindings(fs.readFileSync(reportPath, "utf8"));
      finding = findings[0] || null;
    }
    lines.push(`- ${net.name}: ${finding || "see report"}${delta ? ` | ${delta}` : ""}`);
    if (stats?.exactDupGroups != null) {
      lines.push(`  exactDupGroups=${stats.exactDupGroups}, observed=${stats.observed ?? "?"}`);
    }
    if (stats?.overCapacityCells != null) {
      lines.push(`  overCapacityCells=${stats.overCapacityCells}`);
    }
    if (stats?.top20ShareOfSupply != null) {
      lines.push(`  top20ShareOfSupply=${(stats.top20ShareOfSupply * 100).toFixed(1)}%`);
    }
  }
  lines.push("Audits: https://getkinetik.app/audits.html");
  return lines.join("\n");
}

function readSlice(absPath, maxChars = MAX_FILE_CHARS) {
  if (!fs.existsSync(absPath)) return null;
  const text = fs.readFileSync(absPath, "utf8");
  return text.length <= maxChars ? text : text.slice(0, maxChars) + "\n…[truncated]";
}

/** Everything the news writer model should know about GETKINETIK today. */
export function buildKinetikBrainPack(registry, networkIds) {
  const sections = [];

  sections.push("=== GTM BRAIN (curated — highest priority) ===");
  sections.push(readSlice(GTM_BRAIN) || "(missing scripts/bureau/gtm-context.md)");

  sections.push("\n=== OUTREACH ROUTE (follow this — no cold founder DMs) ===");
  sections.push(formatRouteMarkdown());

  sections.push("\n=== Today's operator brief ===");
  sections.push(
    readSlice(path.join(DAILY_DIR, "latest-operator.md"), 4500) ||
      "(run npm run bureau:brief first)",
  );

  sections.push("\n=== STATUS.md ===");
  sections.push(readSlice(path.join(REPO_ROOT, "STATUS.md"), 6000));

  sections.push("\n=== NEUTRALITY charter (excerpt) ===");
  sections.push(readSlice(path.join(REPO_ROOT, "NEUTRALITY.md"), 5000));

  sections.push("\n=== Today's bureau brief ===");
  sections.push(
    readSlice(path.join(DAILY_DIR, "latest-brief.md"), 4000) ||
      "(run npm run bureau:brief first)",
  );

  sections.push("\n=== Post drafts (do not repeat verbatim if already posted) ===");
  sections.push(readSlice(path.join(DAILY_DIR, "latest-posts.md"), 2500));

  sections.push("\n=== Outreach queue (Friday nurture only if engaged — not daily cold send) ===");
  sections.push(readSlice(path.join(REPO_ROOT, "docs/outreach/OUTREACH_QUEUE.md"), 2000));

  if (fs.existsSync(PIPELINE_PATH)) {
    try {
      const pipe = JSON.parse(fs.readFileSync(PIPELINE_PATH, "utf8"));
      sections.push("\n=== Pipeline snapshot ===");
      sections.push(JSON.stringify(pipe, null, 2).slice(0, 3000));
    } catch {
      /* ignore */
    }
  }

  sections.push("\n=== Live network reads (from snapshots) ===");
  const status = collectNetworkStatus(registry);
  for (const row of status) {
    if (networkIds?.length && !networkIds.includes(row.id)) continue;
    sections.push(
      `- ${row.name}: ${row.topFinding || "—"}${row.snapshotDelta ? ` | ${row.snapshotDelta}` : ""}`,
    );
  }

  sections.push("\n=== Stats detail (matched networks) ===");
  sections.push(buildBureauContext(registry, networkIds));

  const statePath = path.join(REPO_ROOT, "scripts/data/bureau-news-state.json");
  if (fs.existsSync(statePath)) {
    try {
      const st = JSON.parse(fs.readFileSync(statePath, "utf8"));
      const recent = (st.runs || []).slice(0, 5);
      sections.push("\n=== Recent news automation (avoid duplicate angles) ===");
      sections.push(JSON.stringify(recent, null, 2));
    } catch {
      /* ignore */
    }
  }

  return sections.join("\n");
}

export function defaultNewsModel() {
  return (
    process.env.BUREAU_NEWS_MODEL ||
    process.env.OPENAI_MODEL ||
    "gpt-5"
  );
}
