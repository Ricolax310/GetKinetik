// ============================================================================
// Mint a partner API key for the /api/attest channel.
//
// Generates a fresh 32-byte random key (base64) and prints both:
//   - the raw key to share with the partner
//   - the JSON snippet to merge into the ATTEST_API_KEYS Cloudflare secret
//
// Run:    node scripts/mint-partner-key.mjs <partnerName>
// Example: node scripts/mint-partner-key.mjs dimo
//
// After running:
//   1. Copy the generated key into Bitwarden / 1Password (label: "GETKINETIK
//      partner key — <partnerName>"). You won't be able to retrieve it from
//      Cloudflare later.
//   2. Open Cloudflare Pages → getkinetik → Settings → Variables and Secrets.
//   3. If ATTEST_API_KEYS exists, edit it: parse the JSON, add this partner's
//      entry, save. If it doesn't exist yet, create it with the printed JSON.
//   4. Redeploy production. Until the deploy goes green, the new key won't
//      authenticate.
//   5. Hand the raw key to the partner over a secure channel (Signal, 1Pass
//      shared item, encrypted email). Never paste it in public channels.
//
// IMPORTANT: ATTEST_API_KEYS overrides the legacy single ATTEST_API_KEY. If
// you have a single-key deployment today and switch to the dict, the old key
// stops working unless you include it as an entry in the new dict.
// ============================================================================

import { randomBytes } from "node:crypto";

const partnerName = (process.argv[2] || "").trim().toLowerCase();

if (!partnerName || !/^[a-z0-9][a-z0-9._-]{0,31}$/.test(partnerName)) {
  console.error(
    "usage: node scripts/mint-partner-key.mjs <partnerName>\n" +
      "  partnerName: 1-32 chars, lowercase letters / digits / '.' '_' '-'",
  );
  process.exit(1);
}

const key = randomBytes(32).toString("base64");

const oneEntry = JSON.stringify({ [partnerName]: key });

console.log("");
console.log("=== GETKINETIK partner key minted ===");
console.log("");
console.log(`partner:        ${partnerName}`);
console.log(`key (raw):      ${key}`);
console.log("");
console.log("Cloudflare ATTEST_API_KEYS — if no dict exists yet, paste:");
console.log("");
console.log(`  ${oneEntry}`);
console.log("");
console.log("If a dict already exists, parse the current value, add:");
console.log("");
console.log(`  "${partnerName}": "${key}"`);
console.log("");
console.log("Partner calls /api/attest with:");
console.log("");
console.log(`  Authorization: Bearer ${key}`);
console.log("");
