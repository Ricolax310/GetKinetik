// Distribution router — recurring intelligence publication channels.

import fs from "node:fs";
import path from "node:path";
import type { Signal } from "./signal-loader.ts";
import type { Pattern } from "./cross-network-aggregator.ts";
import type { ScoredSignal } from "./signal-confidence.ts";
import type { NarrativeLayers } from "./narrative-builder.ts";
import { PATHS, REPO_ROOT, SITE_URL } from "./paths.ts";
import { formatApiBundle, formatPatternsOnly } from "./api-formatter.ts";
import { buildXThread, buildXThreadTweets, buildXImageCaption } from "./x-thread.ts";
import { buildDailyEditorial } from "../editorial-engine/daily.ts";
import { buildWeeklyEditorial } from "../editorial-engine/weekly.ts";
import { publishXThread } from "./publishers/x-publisher.ts";
import { renderDailyCardPng, buildDailyCardSvg } from "./chart-card.ts";
import { publishSubstackDraft } from "./publishers/substack-publisher.ts";
import { DAILY_CONFIDENCE_MIN, WEEKLY_CONFIDENCE_MIN, heldBackSignals } from "./signal-confidence.ts";

function loadFullEvidenceMarkdown(cadence: "daily" | "weekly"): string | undefined {
  const candidates =
    cadence === "daily"
      ? [
          path.join(REPO_ROOT, "docs/reports/daily/latest-signal-brief.md"),
          path.join(REPO_ROOT, "docs/reports/daily/latest.md"),
        ]
      : [
          path.join(REPO_ROOT, "docs/reports/weekly/latest-signal-report.md"),
          path.join(REPO_ROOT, "docs/reports/weekly/latest.md"),
        ];
  for (const p of candidates) {
    if (!fs.existsSync(p)) continue;
    const raw = fs.readFileSync(p, "utf8");
    const marker = "## Full Evidence";
    const idx = raw.indexOf(marker);
    if (idx >= 0) return raw.slice(idx + marker.length).trim();
    const appendix = "## Data Appendix";
    const aidx = raw.indexOf(appendix);
    if (aidx >= 0) return raw.slice(aidx + appendix.length).trim();
  }
  return undefined;
}

export type DistributionChannel = "x" | "substack" | "api" | "site";
export type DistributionCadence = "daily" | "weekly";

export interface DistributionContext {
  cadence: DistributionCadence;
  date: string;
  week?: number;
  signals: Signal[];
  patterns: Pattern[];
  narrative: NarrativeLayers;
  scored: ScoredSignal[];
}

export interface ChannelPlan {
  channel: DistributionChannel;
  enabled: boolean;
  outputs: string[];
  livePublish: boolean;
}

export interface DistributionPlan {
  cadence: DistributionCadence;
  channels: ChannelPlan[];
}

function write(file: string, content: string): string {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, "utf8");
  return file;
}

function writeJson(file: string, data: unknown): string {
  return write(file, JSON.stringify(data, null, 2));
}

function writeQualityManifest(scored: ScoredSignal[], mode: "daily" | "weekly"): void {
  const minConfidence = mode === "weekly" ? WEEKLY_CONFIDENCE_MIN : DAILY_CONFIDENCE_MIN;
  const qualityPath = path.join(PATHS.apiDrip, "quality.json");
  let existing: Record<string, unknown> = {};
  if (fs.existsSync(qualityPath)) {
    try {
      existing = JSON.parse(fs.readFileSync(qualityPath, "utf8")) as Record<string, unknown>;
    } catch {
      existing = {};
    }
  }
  const payload = {
    generatedAt: new Date().toISOString(),
    thresholds: { daily: DAILY_CONFIDENCE_MIN, weekly: WEEKLY_CONFIDENCE_MIN },
    taxonomy: "getkinetik.taxonomy/v2",
    ...existing,
    [mode]: {
      minConfidence,
      published: scored
        .filter((s) => s.confidence > minConfidence)
        .map((s) => ({
          network: s.signal.network,
          metric: s.signal.metric,
          confidence: s.confidence,
          flags: s.flags,
        })),
      heldBack: heldBackSignals(scored, minConfidence).map((s) => ({
        network: s.signal.network,
        metric: s.signal.metric,
        confidence: s.confidence,
        flags: s.flags,
      })),
    },
  };
  writeJson(qualityPath, payload);
  writeJson(path.join(PATHS.publicDrip, "quality.json"), payload);
}

/** Build channel routing plan (no I/O). */
export function planDistribution(ctx: DistributionContext): DistributionPlan {
  const isDaily = ctx.cadence === "daily";
  return {
    cadence: ctx.cadence,
    channels: [
      {
        channel: "x",
        enabled: isDaily,
        outputs: ["landing/public/drip/x-thread.md", "landing/public/drip/daily-x-thread.txt", "landing/public/drip/daily-card.png"],
        livePublish: isDaily,
      },
      {
        channel: "substack",
        enabled: !isDaily,
        outputs: ["landing/public/drip/substack.md", "landing/public/drip/weekly-substack.md"],
        livePublish: !isDaily,
      },
      {
        channel: "api",
        enabled: true,
        outputs: isDaily
          ? ["landing/api/drip/daily.json", "landing/api/drip/patterns.json", "landing/api/drip/quality.json"]
          : ["landing/api/drip/weekly.json", "landing/api/drip/patterns.json", "landing/api/drip/quality.json"],
        livePublish: false,
      },
      {
        channel: "site",
        enabled: true,
        outputs: isDaily
          ? ["landing/public/drip/daily.json", "landing/public/drip/daily.md", `https://${SITE_URL}/`]
          : ["landing/public/drip/weekly.json"],
        livePublish: false,
      },
    ],
  };
}

export interface DistributionResult {
  plan: DistributionPlan;
  written: string[];
  publish: Record<string, string>;
}

/** Execute file writes + optional live publishers per channel rules. */
export async function executeDistribution(ctx: DistributionContext): Promise<DistributionResult> {
  const plan = planDistribution(ctx);
  const written: string[] = [];
  const publish: Record<string, string> = {};
  const minConfidence = ctx.cadence === "weekly" ? WEEKLY_CONFIDENCE_MIN : DAILY_CONFIDENCE_MIN;

  writeQualityManifest(ctx.scored, ctx.cadence);
  written.push("landing/api/drip/quality.json", "landing/public/drip/quality.json");

  if (ctx.patterns.length > 0 || ctx.cadence === "daily") {
    const patternsPayload = formatPatternsOnly(ctx.patterns);
    writeJson(path.join(PATHS.apiDrip, "patterns.json"), patternsPayload);
    writeJson(path.join(PATHS.publicDrip, "patterns.json"), patternsPayload);
    written.push("landing/api/drip/patterns.json");
  }

  const apiBundle = formatApiBundle(ctx.signals, ctx.patterns, ctx.narrative, {
    date: ctx.date,
    week: ctx.week,
    scored: ctx.scored,
    minConfidence,
  });

  if (ctx.cadence === "daily") {
    writeJson(path.join(PATHS.apiDrip, "daily.json"), apiBundle);
    writeJson(path.join(PATHS.publicDrip, "daily.json"), apiBundle);
    written.push("landing/api/drip/daily.json", "landing/public/drip/daily.json");

    const fullEvidence = loadFullEvidenceMarkdown("daily");
    const dailyEd = buildDailyEditorial(ctx.signals, ctx.date, fullEvidence);
    write(path.join(PATHS.publicDrip, "daily.md"), dailyEd.markdown);
    written.push("landing/public/drip/daily.md");

    const thread = buildXThread(ctx.signals, ctx.patterns, ctx.date);
    const tweets = buildXThreadTweets(ctx.signals, ctx.patterns, ctx.date);
    const caption = buildXImageCaption(ctx.signals, ctx.patterns, ctx.date);
    write(path.join(PATHS.publicDrip, "x-thread.md"), thread);
    write(path.join(PATHS.publicDrip, "daily-x-thread.txt"), thread);
    write(path.join(PATHS.publicDrip, "daily-card.svg"), buildDailyCardSvg(ctx.signals, ctx.patterns, ctx.date));
    written.push("landing/public/drip/x-thread.md", "landing/public/drip/daily-card.svg");

    let cardPng: Buffer | undefined;
    try {
      cardPng = await renderDailyCardPng(ctx.signals, ctx.patterns, ctx.date);
      fs.writeFileSync(path.join(PATHS.publicDrip, "daily-card.png"), cardPng);
      written.push("landing/public/drip/daily-card.png");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      publish.x = `Card render skipped: ${msg}`;
    }

    const xPlan = plan.channels.find((c) => c.channel === "x");
    if (xPlan?.livePublish) {
      const xResult = await publishXThread(thread, {
        tweets,
        caption,
        imagePng: cardPng,
      });
      publish.x = xResult.message;
    }
  } else {
    writeJson(path.join(PATHS.apiDrip, "weekly.json"), apiBundle);
    writeJson(path.join(PATHS.publicDrip, "weekly.json"), apiBundle);
    written.push("landing/api/drip/weekly.json", "landing/public/drip/weekly.json");

    const week = ctx.week ?? 0;
    const fullEvidence = loadFullEvidenceMarkdown("weekly");
    const weeklyEd = buildWeeklyEditorial(ctx.signals, ctx.patterns, week, fullEvidence);
    write(path.join(PATHS.publicDrip, "substack.md"), weeklyEd.markdown);
    write(path.join(PATHS.publicDrip, "weekly-substack.md"), weeklyEd.markdown);
    written.push("landing/public/drip/substack.md");

    const thread = buildXThread(ctx.signals, ctx.patterns, `Week ${week}`);
    write(path.join(PATHS.publicDrip, "weekly-x-thread.txt"), thread);
    written.push("landing/public/drip/weekly-x-thread.txt");

    const subPlan = plan.channels.find((c) => c.channel === "substack");
    if (subPlan?.livePublish) {
      const subResult = await publishSubstackDraft(weeklyEd.markdown, {
        title: weeklyEd.substackTitle,
      });
      publish.substack = subResult.message;
    }
  }

  return { plan, written, publish };
}
