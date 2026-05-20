#!/usr/bin/env node
/**
 * GETKINETIK — Daily CID Anchor Script
 * Implements Section 6 (full flow) of TAMPERPROOF_ARCHITECTURE_SPEC.md
 *
 * Run manually:    node scripts/anchor-daily-cids.mjs
 * Run via cron:    0 23 * * * node /path/to/scripts/anchor-daily-cids.mjs
 * Run via CF Cron: Deploy as Cloudflare Worker with cron trigger "0 23 * * *"
 *
 * What it does:
 *   1. Query D1 for all CIDs produced today
 *   2. Build a Merkle tree from those CIDs
 *   3. Write the Merkle root to Solana via SPL Memo program
 *   4. Store the anchor record (signature + root) back in D1
 *   5. Print the Solana Explorer link
 *
 * Required env vars (set in .env or Cloudflare secrets):
 *   SOLANA_RPC_URL      - RPC endpoint (use devnet for testing)
 *   BUREAU_WALLET_KEY   - Base58 or JSON array of bureau wallet secret key
 *   D1_API_URL          - Cloudflare D1 HTTP API base URL
 *   D1_API_TOKEN        - Cloudflare API token with D1 write access
 *   D1_DATABASE_ID      - Your D1 database ID
 *   CF_ACCOUNT_ID       - Cloudflare account ID
 *   METHODOLOGY_VERSION - e.g. "v1.1"
 */

import "dotenv/config";
import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import { buildMerkleTree } from "../packages/kinetik-core/src/merkle";
import { anchorOnSolana, explorerUrl } from "../packages/kinetik-core/src/solana-anchor";

// ── Config ─────────────────────────────────────────────────────────────────────

const RPC_URL = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";
const METHODOLOGY_VERSION = process.env.METHODOLOGY_VERSION || "v1.1";
const CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID;
const D1_DATABASE_ID = process.env.D1_DATABASE_ID;
const D1_API_TOKEN = process.env.D1_API_TOKEN;
const PINATA_JWT = process.env.PINATA_JWT;

// Today's date in ISO format: "2026-05-19"
const TODAY = new Date().toISOString().slice(0, 10);

// ── Load bureau wallet ─────────────────────────────────────────────────────────

function loadWallet() {
  const raw = process.env.BUREAU_WALLET_KEY;
  if (!raw) throw new Error("BUREAU_WALLET_KEY not set");
  try {
    // Try JSON array format first
    const arr = JSON.parse(raw);
    return Keypair.fromSecretKey(Uint8Array.from(arr));
  } catch {
    // Fall back to base58
    return Keypair.fromSecretKey(bs58.decode(raw));
  }
}

// ── D1 helpers ─────────────────────────────────────────────────────────────────

async function d1Query(sql, params = []) {
  const url = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/d1/database/${D1_DATABASE_ID}/query`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${D1_API_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ sql, params }),
  });
  if (!res.ok) throw new Error(`D1 query failed: ${res.status} ${await res.text()}`);
  const json = await res.json();
  if (!json.success) throw new Error(`D1 error: ${JSON.stringify(json.errors)}`);
  return json.result[0]?.results ?? [];
}

// ── Main ───────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n🔐 GETKINETIK Daily CID Anchor — ${TODAY}\n`);

  // 1. Fetch all CIDs produced today from D1
  console.log("📋 Fetching today's CIDs from D1...");
  const rows = await d1Query(
    "SELECT ipfs_cid FROM grades WHERE date(computed_at) = ? AND ipfs_cid IS NOT NULL",
    [TODAY]
  );

  const cids = rows.map((r) => r.ipfs_cid).filter(Boolean);
  console.log(`   Found ${cids.length} CIDs for ${TODAY}`);

  if (cids.length === 0) {
    console.log("   ⚠️  No CIDs found for today. Skipping anchor.");
    return;
  }

  // 2. Build Merkle tree
  console.log("🌲 Building Merkle tree...");
  const { root, count, depth } = buildMerkleTree(cids);
  console.log(`   Root:  ${root}`);
  console.log(`   Count: ${count} leaves`);
  console.log(`   Depth: ${depth} levels`);

  // 3. Load wallet and anchor on Solana
  console.log("\n🔑 Loading bureau wallet...");
  const payer = loadWallet();
  console.log(`   Wallet: ${payer.publicKey.toBase58()}`);

  console.log("\n⛓️  Writing Merkle root to Solana...");
  const anchor = {
    day: TODAY,
    merkle_root: root,
    count,
    methodology_version: METHODOLOGY_VERSION,
    issuer: "getkinetik.app",
  };

  const isMainnet = RPC_URL.includes("mainnet");
  const cluster = isMainnet ? "mainnet-beta" : "devnet";

  const signature = await anchorOnSolana(anchor, payer, RPC_URL);
  const url = explorerUrl(signature, cluster);

  console.log(`   ✅ Transaction confirmed!`);
  console.log(`   Signature: ${signature}`);
  console.log(`   Explorer:  ${url}`);

  // 4. Store anchor record back in D1
  console.log("\n💾 Storing anchor record in D1...");
  await d1Query(
    `INSERT OR REPLACE INTO daily_anchors 
     (day, merkle_root, cid_count, methodology_version, solana_signature, solana_cluster, anchored_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [TODAY, root, count, METHODOLOGY_VERSION, signature, cluster, new Date().toISOString()]
  );
  console.log("   ✅ Anchor record stored.");

  // 5. Summary
  console.log("\n════════════════════════════════════════");
  console.log("  GETKINETIK Daily Anchor — COMPLETE");
  console.log("════════════════════════════════════════");
  console.log(`  Day:           ${TODAY}`);
  console.log(`  CIDs anchored: ${count}`);
  console.log(`  Merkle root:   ${root}`);
  console.log(`  Solana tx:     ${signature}`);
  console.log(`  Explorer:      ${url}`);
  console.log("════════════════════════════════════════\n");
}

main().catch((err) => {
  console.error("❌ Anchor failed:", err.message);
  process.exit(1);
});
