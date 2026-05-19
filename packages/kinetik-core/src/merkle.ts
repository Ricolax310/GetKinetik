/**
 * GETKINETIK — Merkle Tree Builder
 * Implements Section 6.1 of TAMPERPROOF_ARCHITECTURE_SPEC.md
 *
 * Builds a binary Merkle tree from a list of IPFS CIDs.
 * Each leaf is SHA-256(cid). Internal nodes are SHA-256(left || right).
 * Produces a Merkle root that can be anchored on Solana.
 *
 * Design: simple, auditable, no external dependencies.
 */

import { createHash } from "node:crypto";

// ── Hash helpers ───────────────────────────────────────────────────────────────

function sha256(data: string): string {
  return createHash("sha256").update(data, "utf8").digest("hex");
}

function hashPair(left: string, right: string): string {
  // Sort before hashing so tree is order-independent (standard practice)
  const [a, b] = left <= right ? [left, right] : [right, left];
  return sha256(a + b);
}

// ── Merkle tree ────────────────────────────────────────────────────────────────

export interface MerkleResult {
  root: string;
  leaves: string[];  // SHA-256 of each CID, in order
  depth: number;
  count: number;
}

/**
 * Build a Merkle tree from an array of IPFS CIDs.
 * Returns the root hash and metadata needed for on-chain anchoring.
 *
 * @param cids - Array of IPFS CID strings from a single day's grades
 */
export function buildMerkleTree(cids: string[]): MerkleResult {
  if (cids.length === 0) throw new Error("Cannot build Merkle tree from empty CID list");

  // Leaf layer: SHA-256 of each CID
  let layer: string[] = cids.map((cid) => sha256(cid));
  const leaves = [...layer];

  let depth = 0;

  // Build up until we have a single root
  while (layer.length > 1) {
    const next: string[] = [];
    for (let i = 0; i < layer.length; i += 2) {
      const left = layer[i];
      const right = layer[i + 1] ?? left; // duplicate last node if odd count
      next.push(hashPair(left, right));
    }
    layer = next;
    depth++;
  }

  return {
    root: layer[0],
    leaves,
    depth,
    count: cids.length,
  };
}

/**
 * Generate a Merkle proof for a single CID.
 * Allows third parties to verify a CID's inclusion without the full list.
 *
 * @param cids  - Full CID list used to build the tree
 * @param index - Index of the CID to prove
 */
export function getMerkleProof(cids: string[], index: number): string[] {
  if (index < 0 || index >= cids.length) throw new Error("Index out of bounds");

  let layer: string[] = cids.map((cid) => sha256(cid));
  const proof: string[] = [];

  let idx = index;
  while (layer.length > 1) {
    const siblingIdx = idx % 2 === 0 ? idx + 1 : idx - 1;
    if (siblingIdx < layer.length) {
      proof.push(layer[siblingIdx]);
    }
    const next: string[] = [];
    for (let i = 0; i < layer.length; i += 2) {
      const left = layer[i];
      const right = layer[i + 1] ?? left;
      next.push(hashPair(left, right));
    }
    layer = next;
    idx = Math.floor(idx / 2);
  }

  return proof;
}

/**
 * Verify that a CID is included in a Merkle tree given a root and proof.
 *
 * @param cid   - The CID to verify
 * @param proof - Proof path from getMerkleProof()
 * @param root  - Merkle root to verify against
 */
export function verifyMerkleProof(cid: string, proof: string[], root: string): boolean {
  let current = sha256(cid);
  for (const sibling of proof) {
    current = hashPair(current, sibling);
  }
  return current === root;
}
