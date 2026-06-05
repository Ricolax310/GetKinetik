// Hashtag layer for X posts — core + featured movers + Crypto, 280-char safe.

import type { Signal } from "./signal-loader.ts";
import { assertClean } from "./sanitize.ts";

export const MAX_HASHTAGS = 5;
const CORE_START = ["DePIN"] as const;
const CORE_END = ["Crypto"] as const;

const SEV_RANK: Record<string, number> = { high: 3, medium: 2, low: 1 };

function shortNet(name: string): string {
  return name.replace(/ Network$/i, "").trim();
}

function signalImportance(s: Signal): number {
  const moved = s.delta !== 0 ? 50 : 0;
  return (SEV_RANK[s.severity] || 0) * 100 + moved + Math.abs(s.delta || 0) * 20;
}

/** Sanitize a network name into a valid X hashtag token. */
export function normalizeNetworkTag(name: string): string {
  const base = shortNet(name).replace(/\s*\/.*$/, "").trim();
  const token = base.replace(/[^a-zA-Z0-9]/g, "");
  return token.length >= 2 ? token : "";
}

/** Featured movers for tags — same priority as daily card (movement + severity). */
export function featuredNetworkNames(signals: Signal[], max = 2): string[] {
  const byNetwork = new Map<string, Signal[]>();
  for (const s of signals.slice().sort((a, b) => signalImportance(b) - signalImportance(a))) {
    const k = shortNet(s.network);
    const list = byNetwork.get(k) || [];
    list.push(s);
    byNetwork.set(k, list);
  }

  return [...byNetwork.entries()]
    .map(([network, all]) => ({
      network,
      hasMovement: all.some((s) => s.delta !== 0),
      score: Math.max(...all.map(signalImportance)),
    }))
    .sort((a, b) => {
      if (a.hasMovement !== b.hasMovement) return a.hasMovement ? -1 : 1;
      return b.score - a.score;
    })
    .slice(0, max)
    .map((row) => row.network);
}

/** Build hashtag line: #DePIN + up to 2 mover tags + #Crypto (max 5 total). */
export function buildHashtags(networks: string[], max = MAX_HASHTAGS): string {
  const tags: string[] = [];
  const seen = new Set<string>();

  const add = (label: string) => {
    const key = label.toLowerCase();
    if (!label || seen.has(key) || tags.length >= max) return;
    seen.add(key);
    tags.push(`#${label}`);
  };

  for (const c of CORE_START) add(c);

  const moverLimit = Math.max(0, max - CORE_START.length - CORE_END.length);
  let movers = 0;
  for (const n of networks) {
    if (movers >= moverLimit) break;
    const t = normalizeNetworkTag(n);
    if (!t || seen.has(t.toLowerCase())) continue;
    add(t);
    movers += 1;
  }

  for (const c of CORE_END) add(c);
  return tags.join(" ");
}

/** Append hashtags to tweet text, trimming body if needed to stay within maxLen. */
export function appendHashtags(text: string, networks: string[], maxLen = 280): string {
  const tagLine = buildHashtags(networks);
  if (!tagLine) return text.length <= maxLen ? text : `${text.slice(0, maxLen - 1)}…`;

  const suffix = `\n\n${tagLine}`;
  let body = text.trimEnd();

  if (body.length + suffix.length <= maxLen) {
    return assertClean(body + suffix, "x-hashtags");
  }

  const budget = maxLen - suffix.length;
  if (budget < 24) {
    return assertClean(`${body.slice(0, maxLen - tagLine.length - 3).trim()}…\n\n${tagLine}`, "x-hashtags");
  }

  body = body.slice(0, budget).trimEnd();
  const lastBreak = body.lastIndexOf("\n");
  if (lastBreak > budget * 0.45) {
    body = body.slice(0, lastBreak).trimEnd();
  } else {
    const lastSpace = body.lastIndexOf(" ");
    body = (lastSpace > budget * 0.5 ? body.slice(0, lastSpace) : body).trimEnd() + "…";
  }

  return assertClean(`${body}${suffix}`, "x-hashtags");
}
