// Re-export daily markdown from editorial engine.

import type { Signal } from "./signal-loader.ts";
import { buildDailyEditorial } from "../editorial-engine/daily.ts";

export function buildDailyMarkdown(signals: Signal[], dateLabel: string): string {
  return buildDailyEditorial(signals, dateLabel).markdown;
}
