// X formatter — feed-first: one visible tweet with bullets, not a 10-reply thread.

import type { Signal } from "./signal-loader.ts";
import type { Pattern } from "./cross-network-aggregator.ts";
import { compactFactLine } from "./narrative-builder.ts";
import { assertClean, neutralize } from "./sanitize.ts";
import { SITE_URL } from "./paths.ts";
import { appendHashtags, featuredNetworkNames } from "./hashtags.ts";

const SEV_RANK: Record<string, number> = { high: 3, medium: 2, low: 1 };
const MAX_TWEET_LEN = 280;
const MAX_FEED_TWEETS = 2;
const FEED_BULLETS = 3;

function strongestHook(patterns: Pattern[], signals: Signal[]): string {
  const cross = patterns.filter((p) => p.scope === "cross-network" || p.scope === "systemic");
  if (cross.length) {
    const top = cross.sort((a, b) => b.networks.length - a.networks.length)[0];
    return top.headline;
  }
  const topSignal = signals
    .slice()
    .sort((a, b) => SEV_RANK[b.severity] - SEV_RANK[a.severity] || Math.abs(b.delta) - Math.abs(a.delta))[0];
  return topSignal ? compactFactLine(topSignal) : "Cross-network DePIN signal update.";
}

function formatDateLabel(label: string): string {
  const m = label.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return label;
  const d = new Date(`${m[1]}-${m[2]}-${m[3]}T12:00:00Z`);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

/** Preserve intentional line breaks; collapse only within each line. */
function trimTweet(text: string): string {
  const clean = neutralize(text)
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (clean.length <= MAX_TWEET_LEN) return clean;
  return `${clean.slice(0, MAX_TWEET_LEN - 1)}…`;
}

/** One signal per network when possible; prefer metrics that actually moved. */
function selectFeedSignals(signals: Signal[], max: number): Signal[] {
  const ranked = signals.slice().sort((a, b) => {
    const movedA = a.delta !== 0 ? 1 : 0;
    const movedB = b.delta !== 0 ? 1 : 0;
    if (movedB !== movedA) return movedB - movedA;
    return SEV_RANK[b.severity] - SEV_RANK[a.severity] || Math.abs(b.delta) - Math.abs(a.delta);
  });

  const changed = ranked.filter((s) => s.delta !== 0);
  const pool = changed.length >= 2 ? changed : ranked;

  const picked: Signal[] = [];
  const seenNet = new Set<string>();

  for (const s of pool) {
    if (seenNet.has(s.network)) continue;
    seenNet.add(s.network);
    picked.push(s);
    if (picked.length >= max) return picked;
  }

  if (pool !== ranked) {
    for (const s of ranked) {
      if (picked.includes(s)) continue;
      picked.push(s);
      if (picked.length >= max) break;
    }
  }

  return picked;
}

function composeFeedTweet(
  signals: Signal[],
  patterns: Pattern[],
  label: string,
  bulletCount: number,
): string {
  const picks = selectFeedSignals(signals, bulletCount);
  const hook = strongestHook(patterns, signals);
  const lines = [`DePIN index · ${formatDateLabel(label)}`, ""];

  for (const s of picks) {
    lines.push(`• ${compactFactLine(s)}`);
  }

  // With enough bullets on the root tweet, skip the cross-network headline — it
  // duplicated the old thread hook and pushed stats into hidden replies.
  if (hook && picks.length < 2) {
    lines.push("", hook);
  }

  lines.push("", `https://${SITE_URL}/`);
  return lines.join("\n");
}

/**
 * Feed-first tweets for API posting.
 * Default: ONE root tweet with bullets inline (what people actually see).
 * Overflow: second tweet only if content cannot fit in 280 chars.
 */
export function buildXThreadTweets(
  signals: Signal[],
  patterns: Pattern[],
  label: string,
): string[] {
  const tagNets = featuredNetworkNames(signals, 2);
  let root = trimTweet(composeFeedTweet(signals, patterns, label, FEED_BULLETS));
  root = appendHashtags(root, tagNets);

  if (root.length <= MAX_TWEET_LEN) {
    return [assertClean(root, "x-tweet 1")];
  }

  root = appendHashtags(trimTweet(composeFeedTweet(signals, patterns, label, 2)), tagNets);
  if (root.length <= MAX_TWEET_LEN) {
    return [assertClean(root, "x-tweet 1")];
  }

  const overflowPick = selectFeedSignals(signals, FEED_BULLETS)[2];
  const head = appendHashtags(trimTweet(composeFeedTweet(signals, patterns, label, 2)), tagNets);
  const tail = overflowPick
    ? trimTweet(`• ${compactFactLine(overflowPick)}\n\nhttps://${SITE_URL}/`)
    : trimTweet(`More signals → https://${SITE_URL}/`);

  return [assertClean(head, "x-tweet 1"), assertClean(tail, "x-tweet 2")].slice(0, MAX_FEED_TWEETS);
}

/** Short caption for image posts — concrete movers first so every day differs.
 *
 * Previously this led with strongestHook(), which returns the cross-network
 * pattern HEADLINE — a fixed taxonomy phrase ("infrastructure coverage stress")
 * that is byte-identical every day. Result: every card posted the same text and
 * the feed read like a stuck bot. We now lead with the actual signals that
 * MOVED (per-network deltas), and only fall back to the generic headline when
 * literally nothing changed this window. */
export function buildXImageCaption(
  signals: Signal[],
  patterns: Pattern[],
  label: string,
  opts?: { mentionRick?: boolean; mentionHandle?: string },
): string {
  const date = formatDateLabel(label);
  const line1 = `DePIN index · ${date}`;

  // Prefer concrete movers (delta !== 0), one per network, strongest first.
  const movers = selectFeedSignals(signals, 2).filter((s) => s.delta !== 0);
  const factLines = movers.map((s) => `• ${compactFactLine(s)}`);

  const nets = [...new Set(signals.map((s) => s.network.replace(/ Network$/i, "")))].slice(0, 4);
  const linkLine = `${nets.join(" · ")} · https://${SITE_URL}/`;

  let body: string;
  if (factLines.length) {
    body = [line1, "", ...factLines, "", linkLine].join("\n");
  } else {
    // Nothing moved — fall back to the pattern headline, but keep it short.
    const hook = strongestHook(patterns, signals);
    const line2 = hook.length <= 110 ? hook : `${hook.slice(0, 107)}…`;
    body = [line1, "", line2, "", linkLine].join("\n");
  }

  const handle = (opts?.mentionHandle ?? "Kinetik_Rick").replace(/^@/, "");
  const withMention = opts?.mentionRick ? `@${handle}\n${body}` : body;
  const withTags = appendHashtags(withMention, featuredNetworkNames(signals, 2));
  return trimTweet(withTags);
}

export function buildXThread(
  signals: Signal[],
  patterns: Pattern[],
  label: string,
): string {
  const tweets = buildXThreadTweets(signals, patterns, label);
  return tweets
    .map((t, i) => assertClean(`${i + 1}/${tweets.length}\n${t}`, `x-thread ${i + 1}`))
    .join("\n\n---\n\n");
}

/** Parse markdown thread file back into tweet texts (strips 1/N prefix). */
export function parseXThreadMarkdown(markdown: string): string[] {
  return markdown
    .split(/\n---\n/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const body = block.replace(/^\d+\/\d+\s*\n?/, "").trim();
      return trimTweet(body);
    });
}
