// Editorial rules — intelligence publication layer (not dashboard copy).

/** Daily: factual observations only. */
export const DAILY_EDITORIAL = {
  allowInterpretation: false,
  allowCrossNetworkSynthesis: false,
  allowSystemicObservations: false,
  maxImplicationLines: 0,
  tone: "infrastructure-analyst",
} as const;

/** Weekly: cross-network synthesis permitted; still non-accusatory. */
export const WEEKLY_EDITORIAL = {
  allowInterpretation: true,
  allowCrossNetworkSynthesis: true,
  allowSystemicObservations: true,
  maxImplicationLines: 3,
  maxSummaryLines: 5,
  minSummaryLines: 3,
  tone: "infrastructure-analyst",
} as const;

export const FORBIDDEN_EDITORIAL_PHRASES = [
  /\bwe believe\b/i,
  /\bthey are\b.*\bfraud/i,
  /\bscam\b/i,
  /\bclearly cheating\b/i,
] as const;

export function assertEditorialRule(
  text: string,
  mode: "daily" | "weekly",
  where: string,
): void {
  for (const re of FORBIDDEN_EDITORIAL_PHRASES) {
    if (re.test(text)) {
      throw new Error(`[editorial:${mode}] forbidden phrasing in ${where}`);
    }
  }
  if (mode === "daily" && /\b(suggests|implies|indicates that operators)\b/i.test(text)) {
    throw new Error(`[editorial:daily] interpretation leaked into ${where}`);
  }
}
