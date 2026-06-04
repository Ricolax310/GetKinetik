// X thread formatter — hook → signal follow-ups → pattern → site link.

import type { Signal } from "./signal-loader.ts";
import type { Pattern } from "./cross-network-aggregator.ts";
import { factLine, marketImplication } from "./narrative-builder.ts";
import { assertClean, neutralize } from "./sanitize.ts";
import { SITE_URL } from "./paths.ts";

const SEV_RANK: Record<string, number> = { high: 3, medium: 2, low: 1 };
const MIN_TWEETS = 6;
const MAX_TWEETS = 10;
const MAX_TWEET_LEN = 280;

function strongestHook(patterns: Pattern[], signals: Signal[]): string {
  const cross = patterns.filter((p) => p.scope === "cross-network" || p.scope === "systemic");
  if (cross.length) {
    const top = cross.sort((a, b) => b.networks.length - a.networks.length)[0];
    return top.headline;
  }
  const topSignal = signals
    .slice()
    .sort((a, b) => SEV_RANK[b.severity] - SEV_RANK[a.severity] || Math.abs(b.delta) - Math.abs(a.delta))[0];
  return topSignal ? factLine(topSignal) : "DePIN cross-network signal index update.";
}

function trimTweet(text: string): string {
  const clean = neutralize(text).replace(/\s+/g, " ").trim();
  if (clean.length <= MAX_TWEET_LEN) return clean;
  return `${clean.slice(0, MAX_TWEET_LEN - 1)}…`;
}

/** Structured tweets for API posting (no 1/N prefix). */
export function buildXThreadTweets(
  signals: Signal[],
  patterns: Pattern[],
  label: string,
): string[] {
  const tweets: string[] = [];

  tweets.push(trimTweet(`DePIN signal index — ${label}. ${strongestHook(patterns, signals)}`));

  const bullets = signals
    .slice()
    .sort((a, b) => SEV_RANK[b.severity] - SEV_RANK[a.severity] || Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, 6)
    .map((s) => trimTweet(factLine(s)));
  for (const b of bullets) {
    if (tweets.length >= MAX_TWEETS - 2) break;
    tweets.push(b);
  }

  const patternExplain =
    patterns.find((p) => p.scope === "cross-network" || p.scope === "systemic") || patterns[0];
  if (patternExplain && tweets.length < MAX_TWEETS - 1) {
    tweets.push(trimTweet(`Observed pattern: ${patternExplain.description}`));
  }

  const implication = marketImplication(patterns, signals)[0];
  if (implication && tweets.length < MAX_TWEETS - 1) tweets.push(trimTweet(implication));

  tweets.push(trimTweet(`Full live feed → https://${SITE_URL}/`));

  while (tweets.length < MIN_TWEETS && bullets.length) {
    const extra = bullets.find((b) => !tweets.includes(b));
    if (!extra) break;
    tweets.splice(tweets.length - 1, 0, extra);
  }

  return tweets.slice(0, MAX_TWEETS).map((t, i) => assertClean(t, `x-tweet ${i + 1}`));
}

export function buildXThread(
  signals: Signal[],
  patterns: Pattern[],
  label: string,
): string {
  const tweets = buildXThreadTweets(signals, patterns, label);
  return tweets
    .map((t, i) => assertClean(`${i + 1}/${tweets.length} ${t}`, `x-thread ${i + 1}`))
    .join("\n\n---\n\n");
}

/** Parse markdown thread file back into tweet texts (strips 1/N prefix). */
export function parseXThreadMarkdown(markdown: string): string[] {
  return markdown
    .split(/\n---\n/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const line = block.replace(/^\d+\/\d+\s+/, "").trim();
      return trimTweet(line);
    });
}
