// Scheduling rules — daily engine + weekly distribution engine (CI cron + local CLI).

export type DripJob = "daily" | "weekly";

export interface ScheduleRule {
  job: DripJob;
  cronUtc: string;
  localLabel: string;
  engine: string;
  outputs: string[];
}

export const SCHEDULE: ScheduleRule[] = [
  {
    job: "daily",
    cronUtc: "0 17 * * *",
    localLabel: "09:00 AM PST (daily)",
    engine: "drip-engine/run.ts daily",
    outputs: [
      "landing/public/drip/daily.json",
      "landing/public/drip/daily.md",
      "landing/public/drip/x-thread.md",
      "landing/api/drip/daily.json",
      "landing/api/drip/patterns.json",
      "landing/api/drip/quality.json",
    ],
  },
  {
    job: "weekly",
    cronUtc: "0 18 * * 0",
    localLabel: "Sunday 10:00 AM PST",
    engine: "drip-engine/run.ts weekly",
    outputs: [
      "landing/public/drip/weekly.json",
      "landing/public/drip/substack.md",
      "landing/public/drip/weekly-substack.md",
      "landing/api/drip/weekly.json",
      "landing/api/drip/patterns.json",
      "landing/api/drip/quality.json",
    ],
  },
];

export const PIPELINE_STAGES = [
  "signal-loader",
  "signal-confidence",
  "taxonomy-v2 + cross-network-aggregator",
  "editorial-engine (daily | weekly)",
  "dist-router (x | substack | api | site)",
  "publishers (optional live)",
] as const;
