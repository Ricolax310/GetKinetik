// Hard-constraint guard. The distribution layer is a neutral infrastructure
// index: never "bureau", never accusatory, never editorializing/hype.

const BANNED_REPLACEMENTS: [RegExp, string][] = [
  [/\bbureau\b/gi, "signal index"],
  [/\bsybil\b/gi, "duplication"],
  [/\bfraud(ulent)?\b/gi, "anomaly"],
  [/\bscam\b/gi, "anomaly"],
  [/\bfake\b/gi, "unverified"],
  [/\bcheat(ing|ed|s)?\b/gi, "anomaly"],
  [/\bgaming\b/gi, "anomaly"],
  [/\bexploit(ing|ed|s)?\b/gi, "anomaly"],
  [/\bmassive\b/gi, "notable"],
  [/\bhuge\b/gi, "notable"],
  [/\bexplosive\b/gi, "notable"],
  [/\bskyrocket(ing|ed|s)?\b/gi, "rose"],
  [/\bmoon(ing|ed|s)?\b/gi, "rose"],
  [/\bgrep\b/gi, "review"],
  [/\bops queue\b/gi, "review queue"],
  [/\baudit\b/gi, "signal view"],
  [/\bverification\b/gi, "data integrity check"],
];

// Terms that must never survive into published text (post-replacement check).
const FORBIDDEN: RegExp[] = [/\bbureau\b/i, /\baudit\b/i, /\bsybil\b/i, /\bfraud\b/i, /\bscam\b/i];

/** Neutralize loaded/editorial phrasing. */
export function neutralize(text: string): string {
  let out = text;
  for (const [re, rep] of BANNED_REPLACEMENTS) out = out.replace(re, rep);
  // Strip emoji/pictographs but preserve line structure (collapse spaces/tabs only).
  out = out.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, "").replace(/[ \t]{2,}/g, " ");
  // Trim trailing space on each line without removing newlines.
  out = out.replace(/[ \t]+$/gm, "");
  return out;
}

/** Throws if any forbidden term remains — fails the run rather than publishing. */
export function assertClean(text: string, where: string): string {
  const clean = neutralize(text);
  for (const re of FORBIDDEN) {
    if (re.test(clean)) {
      throw new Error(`[sanitize] forbidden term in ${where}: ${re}`);
    }
  }
  return clean;
}
