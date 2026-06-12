// Human-first daily ops sheet: what you do vs what GitHub Actions already ran.

import fs from "node:fs";
import path from "node:path";
import {
  REPO_ROOT,
  DAILY_DIR,
  collectNetworkStatus,
  loadRegistry,
  formatAge,
  fileAgeMs,
} from "./lib.mjs";
import {
  getWeeklyOutreachTask,
  OUTREACH_GUARDRAILS,
  GTM_NORTH_STAR,
  formatRouteMarkdown,
} from "./gtm-route.mjs";
import {
  getRickTask,
  formatRickMarkdown,
  RICK_NORTH_STAR,
  RICK_GUARDRAILS,
} from "./rick-route.mjs";

const GTM_PATH = path.join(REPO_ROOT, "scripts/bureau/gtm-context.md");
const NEWS_STATE_PATH = path.join(REPO_ROOT, "scripts/data/bureau-news-state.json");
const PIPELINE_PATH = path.join(REPO_ROOT, "scripts/data/bureau-pipeline.json");
const MANUAL_TASKS_PATH = path.join(REPO_ROOT, "docs/bureau/operator-tasks.md");

/** Friday only — nurture paths, not daily cold send. */
const NURTURE_LANES = [
  { id: "hivemapper", label: "Hivemapper", note: "only if they engaged this week" },
  { id: "geodnet", label: "Geodnet", note: "warm — see gtm-context.md (private) for contact rules" },
  { id: "weatherxm", label: "WeatherXM", note: "CEO validated; no third ping" },
];

function weekdayLabel(isoDate) {
  const d = new Date(`${isoDate}T12:00:00Z`);
  return d.toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" });
}

function relFile(absPath) {
  return path.relative(REPO_ROOT, absPath).replace(/\\/g, "/");
}

function parseWarmLeadWaits() {
  if (!fs.existsSync(GTM_PATH)) return [];
  const md = fs.readFileSync(GTM_PATH, "utf8");
  const section = md.match(/## Warm leads[\s\S]*?(?=\n## |\n---|\Z)/);
  if (!section) return [];
  const rows = [];
  for (const line of section[0].split("\n")) {
    if (!line.startsWith("|") || line.includes("Who |")) continue;
    const cells = line
      .split("|")
      .map((c) => c.trim())
      .filter(Boolean);
    if (cells.length < 4 || cells[0] === "-----") continue;
    rows.push({ who: cells[0], lane: cells[1], state: cells[2], rule: cells[3] });
  }
  return rows;
}

function parseGtmNumbers() {
  if (!fs.existsSync(GTM_PATH)) return [];
  const md = fs.readFileSync(GTM_PATH, "utf8");
  const section = md.match(/## Current live numbers[\s\S]*?(?=\n## |\Z)/);
  if (!section) return [];
  return section[0]
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.startsWith("- "));
}

function readNewsSummary() {
  const newsPath = path.join(DAILY_DIR, "latest-news.md");
  if (!fs.existsSync(newsPath)) return null;
  const md = fs.readFileSync(newsPath, "utf8");
  const titleMatch = md.match(/## Top pick\s*\n+\*\*([^*]+)\*\*/);
  const actionMatch = md.match(/LLM action: (\w+)/);
  const confMatch = md.match(/confidence ([\d.]+)/);
  const autoPosted = md.match(/\*\*Auto-posted to X:\*\* (https:\/\/[^\s]+)/);
  const skipReason = md.match(/Skip reason: (.+)/);
  const newsAge = formatAge(fileAgeMs(newsPath));
  return {
    path: relFile(newsPath),
    title: titleMatch?.[1]?.trim() || null,
    action: actionMatch?.[1] || null,
    confidence: confMatch ? Number(confMatch[1]) : null,
    autoPostedUrl: autoPosted?.[1] || null,
    skipReason: skipReason?.[1]?.trim() || null,
    newsAge,
    hasLinkedIn: md.includes("### LinkedIn comment"),
    hasTweet: md.includes("### Suggested tweet"),
  };
}

function readLastAutomationRuns() {
  const out = { pipeline: null, news: null };
  if (fs.existsSync(PIPELINE_PATH)) {
    try {
      const p = JSON.parse(fs.readFileSync(PIPELINE_PATH, "utf8"));
      out.pipeline = p.updatedAt || null;
    } catch {
      /* ignore */
    }
  }
  if (fs.existsSync(NEWS_STATE_PATH)) {
    try {
      const s = JSON.parse(fs.readFileSync(NEWS_STATE_PATH, "utf8"));
      out.news = s.runs?.[0]?.at || null;
    } catch {
      /* ignore */
    }
  }
  return out;
}

function readManualTasks() {
  if (!fs.existsSync(MANUAL_TASKS_PATH)) return [];
  const lines = fs.readFileSync(MANUAL_TASKS_PATH, "utf8").split("\n");
  const tasks = [];
  for (const line of lines) {
    const t = line.trim();
    if (t.startsWith("- [ ]") || t.startsWith("- [x]")) {
      const text = t.replace(/^- \[[ x]\]\s*/, "").trim();
      if (text) tasks.push(text);
    }
  }
  return tasks;
}

function daysUntilNextMondayUtc() {
  const now = new Date();
  const d = now.getUTCDay();
  const hour = now.getUTCHours();
  if (d === 1 && hour < 14) return 0;
  if (d === 1) return 7;
  if (d === 0) return 1;
  return 8 - d;
}

function buildDoToday(enabled, news, manualTasks) {
  const items = [];
  let n = 1;

  for (const t of manualTasks) {
    items.push(`${n}. **Your note:** ${t}`);
    n += 1;
  }

  const stale = enabled.filter((r) => r.stale);
  if (stale.length) {
    items.push(
      `${n}. **Refresh data** — reports older than 7 days: ${stale.map((r) => r.name).join(", ")}. Run \`npm run bureau:scan\` or wait for **Monday 14:00 UTC** weekly job.`,
    );
    n += 1;
  }

  const route = getWeeklyOutreachTask();
  items.push(`${n}. **Today’s route (${route.day}):** ${route.task}`);
  n += 1;

  const rick = getRickTask();
  items.push(`${n}. **@Kinetik_Rick visibility (${rick.focus}):** ${rick.task}`);
  n += 1;

  const dow = new Date().getUTCDay();
  if (dow === 5) {
    for (const slot of NURTURE_LANES) {
      const row = enabled.find((r) => r.id === slot.id);
      if (!row?.outreachPath) continue;
      items.push(
        `${n}. **Friday nurture — ${slot.label}** (${slot.note}): \`${row.outreachPath}\` — reply only if they engaged.`,
      );
      n += 1;
    }
  }

  if (news?.title && news.action !== "skip") {
    if (news.hasLinkedIn && news.action === "comment") {
      items.push(
        `${n}. **LinkedIn comment** (paste manually): \`${news.path}\` → article *${news.title.slice(0, 72)}${news.title.length > 72 ? "…" : ""}*`,
      );
      n += 1;
    }
    if (news.hasTweet && !news.autoPostedUrl) {
      items.push(
        `${n}. **Optional X tweet** — review suggested text in \`${news.path}\` (not auto-posted unless you enabled \`BUREAU_AUTO_POST\`).`,
      );
      n += 1;
    }
  } else if (news?.skipReason) {
    items.push(`${n}. **News:** skip today — ${news.skipReason}`);
    n += 1;
  }

  const moved = enabled.filter(
    (r) => r.snapshotDelta && !/unchanged vs last run/i.test(r.snapshotDelta),
  );
  if (moved.length) {
    items.push(
      `${n}. **Optional social — deltas moved:** ${moved.map((r) => r.name).join(", ")} → \`docs/bureau/daily/latest-delta-posts.md\``,
    );
    n += 1;
  }

  items.push(
    `${n}. **Optional timeline post:** pick one draft in \`docs/bureau/daily/latest-posts.md\` (sample read or verify-device).`,
  );
  n += 1;

  items.push(
    `${n}. **North star:** any inbound “run this on our data?” — reply same day (this is the win, not DMs sent).`,
  );

  if (items.length === 0) {
    return ["1. Nothing urgent — skim numbers below and one social touch if you want presence."];
  }
  return items;
}

/** Structured ops data for markdown, calendar JSON, and chat context. */
export function buildOperatorData(registry, pipelineResults = null) {
  const today = new Date().toISOString().slice(0, 10);
  const rows = collectNetworkStatus(registry, pipelineResults);
  const enabled = rows.filter((r) => r.defaultEnabled);
  const warmWaits = parseWarmLeadWaits();
  const numbers = parseGtmNumbers();
  const news = readNewsSummary();
  const runs = readLastAutomationRuns();
  const manualTasks = readManualTasks();
  const doTodayRaw = buildDoToday(enabled, news, manualTasks);
  const doToday = doTodayRaw.map((line) => line.replace(/^\d+\.\s*/, ""));

  const automated = [];
  automated.push({
    job: "Daily ops sheet",
    when: "08:00 UTC daily",
    what: "Brief, posts, ops calendar, outreach queue",
    yourPart: "Read Do today",
  });
  automated.push({
    job: "News scan + LLM",
    when: "09:00 UTC daily",
    what: "latest-news.md",
    yourPart: "Paste LinkedIn comment if drafted",
  });
  automated.push({
    job: "Weekly scans",
    when: "Monday 14:00 UTC",
    what: "Reports, snapshots, outreach drafts",
    yourPart: "Review when stale",
  });
  if (runs.pipeline) {
    automated.push({
      job: "Last full pipeline",
      when: `${runs.pipeline.slice(0, 16).replace("T", " ")}Z`,
      what: "bureau-pipeline.json",
      yourPart: "—",
    });
  }
  if (runs.news) {
    automated.push({
      job: "Last news run",
      when: `${runs.news.slice(0, 16).replace("T", " ")}Z`,
      what: "latest-news.md",
      yourPart: "—",
    });
  }
  automated.push({
    job: "X auto-post",
    when: news?.autoPostedUrl ? "Today" : "—",
    what: news?.autoPostedUrl || "Off unless BUREAU_AUTO_POST + X keys",
    yourPart: news?.autoPostedUrl ? "Engage replies" : "You post manually",
  });
  automated.push({
    job: "Email / LinkedIn DMs",
    when: "—",
    what: "Never automated",
    yourPart: "You send",
  });

  const numberLines =
    numbers.length > 0
      ? numbers.map((l) => l.replace(/^- /, ""))
      : enabled.map((r) => `${r.name}: ${r.topFinding || "—"}`);

  const networkHealth = enabled.map((r) => {
    const delta = r.snapshotDelta ? ` · ${r.snapshotDelta}` : "";
    return `${r.name} — report ${r.reportAge}${r.stale ? " (stale)" : ""}${delta}`;
  });

  const routeBlock = formatRouteMarkdown();
  const rickBlock = formatRickMarkdown();
  const markdown = buildOperatorMarkdown({
    today,
    weekday: weekdayLabel(today),
    doToday,
    warmWaits,
    numbers: numberLines.map((n) => (n.startsWith("-") ? n : `- ${n}`)),
    networkHealth,
    news,
    automated,
    nextScanDays: daysUntilNextMondayUtc(),
    routeBlock,
    rickBlock,
    guardrails: OUTREACH_GUARDRAILS,
  });

  return {
    today,
    weekday: weekdayLabel(today),
    doToday,
    doNot: warmWaits,
    automated,
    numbers: numberLines,
    networkHealth,
    news,
    nextScanDays: daysUntilNextMondayUtc(),
    northStar: GTM_NORTH_STAR,
    weeklyRoute: getWeeklyOutreachTask(),
    guardrails: OUTREACH_GUARDRAILS,
    rickNorthStar: RICK_NORTH_STAR,
    rickRoute: getRickTask(),
    rickGuardrails: RICK_GUARDRAILS,
    markdown,
  };
}

function buildOperatorMarkdown({
  today,
  weekday,
  doToday,
  warmWaits,
  numbers,
  networkHealth,
  news,
  automated,
  nextScanDays,
  routeBlock,
  rickBlock,
}) {
  const waitLines =
    warmWaits.length === 0
      ? ["- (Edit warm-lead table in `scripts/bureau/gtm-context.md`.)"]
      : warmWaits.map((w) => `- **${w.who}** (${w.lane}): ${w.rule}`);

  const autoRows = [
    "| Job | When (UTC) | What ran | Your part |",
    "|-----|------------|----------|-------------|",
    ...automated.map(
      (a) =>
        `| **${a.job}** | ${a.when} | ${a.what} | ${a.yourPart} |`,
    ),
  ];

  const networkGlance = networkHealth.map((h) => `- **${h.split(" — ")[0]}** — ${h.split(" — ").slice(1).join(" — ")}`);

  return `# Your daily briefing — ${today} (${weekday})

> **Start here every morning.** Checkboxes are for you in Cursor/GitHub — nothing sends without you.

---

## Do today (you)

${doToday.map((line) => `- [ ] ${line}`).join("\n")}

---

## Do not do (wait rules)

${waitLines.join("\n")}

---

${routeBlock}

---

${rickBlock}

---

## Already automated (GitHub Actions)

${autoRows.join("\n")}

**Next weekly scan:** ~${nextScanDays} day(s) (Monday 14:00 UTC) unless you run \`npm run bureau:weekly\` locally.

---

## Numbers at a glance

${numbers.join("\n")}

${news?.title ? `\n**News pick** (${news.newsAge}): ${news.title} → \`${news.path}\`\n` : ""}

---

## Network health (from last scan)

${networkGlance.join("\n")}

---

## Open these files

| File | Purpose |
|------|---------|
| [\`latest-operator.md\`](latest-operator.md) | This briefing (markdown) |
| [\`docs/bureau/private/\`](../../private/) | Private ops calendar + coach — \`npm run bureau:ops\` (localhost) |
| [\`latest-news.md\`](latest-news.md) | Today's comment/tweet drafts |
| [\`latest-posts.md\`](latest-posts.md) | Sample-read & verify tweets |
| [\`latest-delta-posts.md\`](latest-delta-posts.md) | Posts when metrics moved |
| [\`latest-brief.md\`](latest-brief.md) | Technical bureau table |
| [\`../../outreach/OUTREACH_QUEUE.md\`](../../outreach/OUTREACH_QUEUE.md) | Send order + draft paths |

**Add your own standing tasks:** edit [\`docs/bureau/operator-tasks.md\`](../../operator-tasks.md) (optional checklist lines).

---

*Generated by \`scripts/bureau/operator-brief.mjs\` — run \`npm run bureau:brief\` locally anytime.*
`;
}

export function buildOperatorBrief(registry, pipelineResults = null) {
  return buildOperatorData(registry, pipelineResults).markdown;
}

export function writeOperatorBrief(registry, pipelineResults = null) {
  const today = new Date().toISOString().slice(0, 10);
  const data = buildOperatorData(registry, pipelineResults);
  const md = data.markdown;
  fs.mkdirSync(DAILY_DIR, { recursive: true });
  const dated = path.join(DAILY_DIR, `${today}-operator.md`);
  const latest = path.join(DAILY_DIR, "latest-operator.md");
  fs.writeFileSync(dated, md, "utf8");
  fs.writeFileSync(latest, md, "utf8");

  return {
    dated: relFile(dated),
    latest: relFile(latest),
  };
}
