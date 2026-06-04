// Re-export weekly Substack body from editorial engine (locked format).

import type { Signal } from "./signal-loader.ts";
import type { Pattern } from "./cross-network-aggregator.ts";
import { buildWeeklyEditorial } from "../editorial-engine/weekly.ts";

export function buildSubstack(signals: Signal[], patterns: Pattern[], weekNumber: number): string {
  return buildWeeklyEditorial(signals, patterns, weekNumber).markdown;
}
