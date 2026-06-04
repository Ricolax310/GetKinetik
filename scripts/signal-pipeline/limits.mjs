// Single source of truth for X post length limits.
// Standard accounts: 280 chars. Premium (KINETIK_PREMIUM=true): long-form.

const PREMIUM_MAX = 25000;
const STANDARD_MAX = 280;

export function isPremium() {
  return process.env.KINETIK_PREMIUM === "true";
}

export function maxTweetLen() {
  return isPremium() ? PREMIUM_MAX : STANDARD_MAX;
}
