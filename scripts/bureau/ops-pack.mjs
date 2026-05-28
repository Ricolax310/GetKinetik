// Builds docs/bureau/private/bureau-ops.json — local ops UI only (not deployed).

import fs from "node:fs";
import path from "node:path";
import { REPO_ROOT, DAILY_DIR } from "./lib.mjs";
import { PRIVATE_OPS_DIR } from "./private-paths.mjs";
import { buildOperatorData } from "./operator-brief.mjs";
import { formatRouteMarkdown, GTM_NORTH_STAR } from "./gtm-route.mjs";

const OUT_PATH = path.join(PRIVATE_OPS_DIR, "bureau-ops.json");
const GTM_PATH = path.join(REPO_ROOT, "scripts/bureau/gtm-context.md");
const MAX_DAY_FILES = 120;
const MAX_MD_PER_DAY = 14_000;

const SCHEDULE = [
  {
    id: "daily-brief",
    label: "Daily brief + ops calendar",
    utcHour: 8,
    utcMinute: 0,
    daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
    kind: "auto",
    note: "latest-operator.md, posts, outreach queue",
  },
  {
    id: "daily-news",
    label: "News scan + LLM drafts",
    utcHour: 9,
    utcMinute: 0,
    daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
    kind: "auto",
    note: "latest-news.md",
  },
  {
    id: "weekly-scan",
    label: "Weekly public sample reads",
    utcHour: 14,
    utcMinute: 0,
    daysOfWeek: [1],
    kind: "auto",
    note: "All enabled networks — reports + outreach drafts",
  },
];

const DATE_FILE_RE =
  /^(\d{4}-\d{2}-\d{2})-(operator|news|brief|posts|delta-posts)\.md$/;

function readGtmForChat() {
  if (!fs.existsSync(GTM_PATH)) return "";
  const md = fs.readFileSync(GTM_PATH, "utf8");
  return md.length > 12_000 ? `${md.slice(0, 12_000)}\n…(truncated)` : md;
}

function scanDailyArchive() {
  const days = {};
  if (!fs.existsSync(DAILY_DIR)) return days;

  const files = fs.readdirSync(DAILY_DIR).filter((f) => DATE_FILE_RE.test(f));
  const sorted = files.sort().reverse().slice(0, MAX_DAY_FILES);

  for (const file of sorted) {
    const m = file.match(DATE_FILE_RE);
    if (!m) continue;
    const [, date, kind] = m;
    if (!days[date]) {
      days[date] = {
        hasBrief: false,
        hasNews: false,
        hasPosts: false,
        hasScan: false,
        taskCount: 0,
        newsTitle: null,
        summary: null,
        briefMarkdown: null,
        newsMarkdown: null,
      };
    }
    const abs = path.join(DAILY_DIR, file);
    const md = fs.readFileSync(abs, "utf8");
    const slice = md.length > MAX_MD_PER_DAY ? `${md.slice(0, MAX_MD_PER_DAY)}\n…` : md;

    if (kind === "operator") {
      days[date].hasBrief = true;
      days[date].briefMarkdown = slice;
      const tasks = (md.match(/^- \[ \] /gm) || []).length;
      days[date].taskCount = tasks;
      const firstTask = md.match(/^- \[ \] (.+)$/m);
      days[date].summary = firstTask?.[1]?.replace(/\*\*/g, "").slice(0, 100) || "Ops briefing";
    } else if (kind === "news") {
      days[date].hasNews = true;
      days[date].newsMarkdown = slice;
      const title = md.match(/\*\*([^*]+)\*\*\s*\n- URL:/);
      if (title) days[date].newsTitle = title[1].trim();
    } else if (kind === "brief") {
      days[date].hasBrief = true;
    } else if (kind === "posts") {
      days[date].hasPosts = true;
    }
  }

  const pipePath = path.join(REPO_ROOT, "scripts/data/bureau-pipeline.json");
  if (fs.existsSync(pipePath)) {
    try {
      const p = JSON.parse(fs.readFileSync(pipePath, "utf8"));
      if (p.updatedAt) {
        const scanDate = p.updatedAt.slice(0, 10);
        if (!days[scanDate]) {
          days[scanDate] = {
            hasBrief: false,
            hasNews: false,
            hasPosts: false,
            hasScan: true,
            taskCount: 0,
            newsTitle: null,
            summary: "Weekly pipeline scan",
            briefMarkdown: null,
            newsMarkdown: null,
          };
        } else {
          days[scanDate].hasScan = true;
        }
      }
    } catch {
      /* ignore */
    }
  }

  return days;
}

function buildChatContext(data, days) {
  const parts = [
    "# GETKINETIK bureau ops context (for assistant)",
    "",
    `Today (UTC): ${data.today}`,
    "",
    "## GTM brain",
    readGtmForChat(),
    "",
    "## Outreach route",
    formatRouteMarkdown(),
    "",
    `North star: ${GTM_NORTH_STAR}`,
    "",
    "## Today's do list",
    ...(data.doToday || []).map((t) => `- ${t}`),
    "",
    "## Wait rules",
    ...(data.doNot || []).map((w) => `- ${w.who}: ${w.rule}`),
    "",
    "## Live numbers",
    ...(data.numbers || []),
    "",
    "## Network health",
    ...(data.networkHealth || []),
    "",
    "## Automation schedule (UTC)",
    ...SCHEDULE.map(
      (s) =>
        `- ${s.label}: ${String(s.utcHour).padStart(2, "0")}:${String(s.utcMinute).padStart(2, "0")} UTC` +
        (s.daysOfWeek.length === 7 ? " daily" : " Mondays"),
    ),
  ];
  if (data.news?.title) {
    parts.push("", `## News pick: ${data.news.title}`);
  }
  const recent = Object.keys(days)
    .sort()
    .reverse()
    .slice(0, 7);
  if (recent.length) {
    parts.push("", "## Recent calendar days");
    for (const d of recent) {
      const day = days[d];
      const flags = [
        day.hasBrief && "brief",
        day.hasNews && "news",
        day.hasScan && "scan",
      ]
        .filter(Boolean)
        .join(", ");
      parts.push(`- ${d}: ${flags || "—"} — ${day.summary || day.newsTitle || "—"}`);
    }
  }
  return parts.join("\n");
}

export function buildOpsPack(registry, pipelineResults = null) {
  const data = buildOperatorData(registry, pipelineResults);
  const days = scanDailyArchive();
  const today = data.today;

  if (!days[today]) {
    days[today] = {
      hasBrief: true,
      hasNews: !!data.news?.title,
      hasPosts: false,
      hasScan: false,
      taskCount: data.doToday?.length || 0,
      newsTitle: data.news?.title || null,
      summary: data.doToday?.[0] || "Today",
      briefMarkdown: data.markdown,
      newsMarkdown: null,
    };
  } else {
    days[today].briefMarkdown = data.markdown;
    days[today].taskCount = data.doToday?.length || 0;
    days[today].hasBrief = true;
    if (data.news?.title) days[today].newsTitle = data.news.title;
  }

  const newsPath = path.join(DAILY_DIR, "latest-news.md");
  if (fs.existsSync(newsPath)) {
    const newsMd = fs.readFileSync(newsPath, "utf8");
    if (days[today]) {
      days[today].newsMarkdown =
        newsMd.length > MAX_MD_PER_DAY ? newsMd.slice(0, MAX_MD_PER_DAY) : newsMd;
      days[today].hasNews = true;
    }
  }

  const pack = {
    version: 1,
    updatedAt: new Date().toISOString(),
    today,
    schedule: SCHEDULE,
    todayData: {
      weekday: data.weekday,
      doToday: data.doToday,
      doNot: data.doNot,
      automated: data.automated,
      numbers: data.numbers,
      networkHealth: data.networkHealth,
      news: data.news,
      nextScanDays: data.nextScanDays,
      markdown: data.markdown,
    },
    days,
    chatContext: buildChatContext(data, days),
  };

  return pack;
}

export function writeOpsPack(registry, pipelineResults = null) {
  const pack = buildOpsPack(registry, pipelineResults);
  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, JSON.stringify(pack, null, 2), "utf8");
  return { path: path.relative(REPO_ROOT, OUT_PATH).replace(/\\/g, "/") };
}
