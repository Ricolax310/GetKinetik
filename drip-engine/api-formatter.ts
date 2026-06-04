// API formatter — machine-consumable drip bundle.

import type { Signal } from "./signal-loader.ts";
import type { Pattern } from "./cross-network-aggregator.ts";
import type { NarrativeLayers } from "./narrative-builder.ts";
import type { ScoredSignal } from "./signal-confidence.ts";

export interface DripApiBundle {
  generatedAt: string;
  schema: "getkinetik.drip/v2";
  date?: string;
  week?: number;
  minConfidence?: number;
  daily: string[];
  weekly: string[];
  patterns: Pattern[];
  implication: string[];
  signals: Signal[];
  quality?: {
    scored: { network: string; metric: string; confidence: number; flags: string[] }[];
    heldBack: { network: string; metric: string; confidence: number; flags: string[] }[];
  };
}

export function formatApiBundle(
  signals: Signal[],
  patterns: Pattern[],
  narrative: NarrativeLayers,
  meta: { date?: string; week?: number; scored?: ScoredSignal[]; minConfidence?: number } = {},
): DripApiBundle {
  const minConf = meta.minConfidence ?? 0;
  const scored = meta.scored ?? [];
  return {
    generatedAt: new Date().toISOString(),
    schema: "getkinetik.drip/v2",
    date: meta.date,
    week: meta.week,
    minConfidence: meta.minConfidence,
    daily: narrative.daily,
    weekly: narrative.weekly,
    patterns,
    implication: narrative.implication,
    signals,
    quality: scored.length
      ? {
          scored: scored
            .filter((s) => s.confidence > minConf)
            .map((s) => ({
              network: s.signal.network,
              metric: s.signal.metric,
              confidence: s.confidence,
              flags: s.flags,
            })),
          heldBack: scored
            .filter((s) => s.confidence <= minConf)
            .map((s) => ({
              network: s.signal.network,
              metric: s.signal.metric,
              confidence: s.confidence,
              flags: s.flags,
            })),
        }
      : undefined,
  };
}

export function formatPatternsOnly(patterns: Pattern[]): {
  generatedAt: string;
  patterns: Pattern[];
} {
  return {
    generatedAt: new Date().toISOString(),
    patterns,
  };
}
