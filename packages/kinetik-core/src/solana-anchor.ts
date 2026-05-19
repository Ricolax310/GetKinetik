/**
 * GETKINETIK — Solana CID Anchor
 * Implements Section 6.2 of TAMPERPROOF_ARCHITECTURE_SPEC.md
 *
 * Strategy: SPL Memo Program (already deployed on Solana mainnet/devnet).
 * We write a structured JSON memo containing the daily Merkle root.
 * The transaction is immutable, timestamped by Solana's clock, and
 * verifiable by anyone with a Solana RPC connection.
 *
 * No custom Anchor program required — the Memo program is sufficient
 * for an immutable, timestamped, signed record.
 *
 * Upgrade path: replace with a custom Anchor program for structured
 * on-chain state and Merkle proof verification (Phase 2).
 *
 * Dependencies:
 *   npm install @solana/web3.js
 */

import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";

// SPL Memo program — deployed on all Solana clusters
const MEMO_PROGRAM_ID = new PublicKey(
  "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"
);

// ── On-chain memo schema ────────────────────────────────────────────────────────

export interface DailyAnchor {
  /** ISO date string: "2026-05-19" */
  day: string;
  /** Merkle root hex */
  merkle_root: string;
  /** Number of CIDs in the tree */
  count: number;
  /** Methodology version used for all grades this day */
  methodology_version: string;
  /** Bureau identifier */
  issuer: string;
}

/**
 * Serialize the anchor payload to a compact JSON string.
 * This string is written to Solana via the Memo program.
 */
export function serializeAnchor(anchor: DailyAnchor): string {
  return JSON.stringify({
    day: anchor.day,
    issuer: anchor.issuer,
    merkle_root: anchor.merkle_root,
    methodology_version: anchor.methodology_version,
    count: anchor.count,
    schema: "getkinetik-daily-anchor-v1",
  });
}

// ── Solana anchoring ───────────────────────────────────────────────────────────

/**
 * Write a GETKINETIK daily anchor memo to Solana.
 *
 * @param anchor     - DailyAnchor payload
 * @param payer      - Keypair that signs and pays for the transaction
 * @param rpcUrl     - Solana RPC endpoint (mainnet-beta or devnet)
 * @returns          - Transaction signature (permanent on-chain proof)
 */
export async function anchorOnSolana(
  anchor: DailyAnchor,
  payer: Keypair,
  rpcUrl: string
): Promise<string> {
  const connection = new Connection(rpcUrl, "confirmed");
  const memoText = serializeAnchor(anchor);

  const instruction = new TransactionInstruction({
    keys: [{ pubkey: payer.publicKey, isSigner: true, isWritable: false }],
    programId: MEMO_PROGRAM_ID,
    data: Buffer.from(memoText, "utf-8"),
  });

  const tx = new Transaction().add(instruction);

  const signature = await sendAndConfirmTransaction(connection, tx, [payer], {
    commitment: "confirmed",
  });

  return signature;
}

// ── Explorer link ───────────────────────────────────────────────────────────────

/**
 * Generate a Solana Explorer URL for a transaction signature.
 */
export function explorerUrl(
  signature: string,
  cluster: "mainnet-beta" | "devnet" = "mainnet-beta"
): string {
  const clusterParam =
    cluster === "mainnet-beta" ? "" : `?cluster=${cluster}`;
  return `https://explorer.solana.com/tx/${signature}${clusterParam}`;
}
