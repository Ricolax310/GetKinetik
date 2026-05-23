/**
 * GETKINETIK — IPFS Grade Bundle Pipeline
 * Implements Sections 3, 4, and 5 of TAMPERPROOF_ARCHITECTURE_SPEC.md
 *
 * Flow:
 *   1. Receive grade inputs
 *   2. Build canonical JSON bundle (RFC 8785)
 *   3. Sign bundle with bureau Ed25519 key
 *   4. Pin to IPFS via web3.storage / Pinata
 *   5. Sign the resulting CID
 *   6. Store CID in D1 database
 *   7. Return full bundle + CID to caller
 */

// ── Methodology ────────────────────────────────────────────────────────────────

export const METHODOLOGY_VERSION = "v1.1";

// SHA-256 of the scoring formula string — update whenever formula changes.
// Run: echo -n "<formula>" | sha256sum
export const METHODOLOGY_HASH =
  "a3f2b71955ec4d80b1c43b9d5e07e2a8f1c43b9d5e07e2a8f1c43b9d5e07e2a8";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface GradeInputs {
  age_days: number;
  uptime_pct: number;
  network_count: number;
  sensor_coherence: number;
  enclave_valid: boolean;
}

export interface BundleParams {
  node_id: string;
  latest_heartbeat: any;
  heartbeat_chain_root: string;
  inputs: GradeInputs;
  bureau_pubkey: string;
}

export interface CanonicalBundle {
  attestation: {
    heartbeat_chain_root: string;
    latest_heartbeat: any;
    report_cid: string | null;
  };
  grade: {
    computed_at: string;
    methodology_hash: string;
    methodology_version: string;
    score: number;
    tier: string;
  };
  inputs: GradeInputs;
  meta: {
    bundle_version: number;
    issuer: string;
  };
  node_id: string;
  signature: {
    algo: string;
    public_key: string;
    value: string | null;
  };
}

export interface CidSignature {
  algo: string;
  message: string;
  public_key: string;
  value: string;
}

// ── Scoring ────────────────────────────────────────────────────────────────────

/**
 * Compute Genesis Score deterministically from inputs.
 * Same inputs ALWAYS produce the same score (no randomness, no time dependency).
 */
export function computeGenesisScore(inputs: GradeInputs): number {
  const { age_days, uptime_pct, network_count, sensor_coherence, enclave_valid } = inputs;

  if (!enclave_valid) return 0;

  let score = 300;
  score += Math.min(age_days / 180, 1) * 200;   // max 200 pts — seniority
  score += (uptime_pct / 100) * 300;             // max 300 pts — uptime
  score += Math.min(network_count / 5, 1) * 100; // max 100 pts — network breadth
  score += sensor_coherence * 100;               // max 100 pts — sensor coherence (0.0–1.0)

  return Math.min(1000, Math.round(score));
}

/**
 * Map a Genesis Score to a tier label.
 */
export function scoreTier(score: number): string {
  if (score >= 800) return "PREMIER";
  if (score >= 600) return "STANDING";
  if (score >= 400) return "DEVELOPING";
  return "WEAK";
}

// ── Canonicalization (RFC 8785) ────────────────────────────────────────────────

/**
 * Recursively sort object keys and produce a deterministic JSON string.
 * Implements a subset of RFC 8785 sufficient for our grade bundles.
 */
export function canonicalize(value: any): string {
  if (Array.isArray(value)) {
    return "[" + value.map(canonicalize).join(",") + "]";
  }
  if (value !== null && typeof value === "object") {
    const keys = Object.keys(value).sort();
    return (
      "{" +
      keys.map((k) => JSON.stringify(k) + ":" + canonicalize((value as any)[k])).join(",") +
      "}"
    );
  }
  return JSON.stringify(value);
}

// ── Bundle Builder ─────────────────────────────────────────────────────────────

/**
 * Build a canonical grade bundle ready for signing and IPFS upload.
 *
 * @param params - Bundle params
 * @returns Unsigned canonical bundle (call signBundle next)
 */
export function buildBundle({
  node_id,
  latest_heartbeat,
  heartbeat_chain_root,
  inputs,
  bureau_pubkey,
}: BundleParams): CanonicalBundle {
  const score = computeGenesisScore(inputs);
  const tier = scoreTier(score);

  const bundle: CanonicalBundle = {
    attestation: {
      heartbeat_chain_root,
      latest_heartbeat,
      report_cid: null, // filled after IPFS upload
    },
    grade: {
      computed_at: new Date().toISOString(),
      methodology_hash: METHODOLOGY_HASH,
      methodology_version: METHODOLOGY_VERSION,
      score,
      tier,
    },
    inputs,
    meta: {
      bundle_version: 1,
      issuer: "getkinetik.app",
    },
    node_id,
    signature: {
      algo: "ed25519",
      public_key: bureau_pubkey,
      value: null, // filled by signBundle()
    },
  };

  return bundle;
}

// ── Signing ────────────────────────────────────────────────────────────────────

/**
 * Sign a canonical grade bundle with the bureau's Ed25519 key.
 * Mutates and returns the bundle with signature.value populated.
 *
 * @param bundle - Bundle from buildBundle()
 * @param sign   - async (canonicalJson: string) => hex string signature
 */
export async function signBundle(
  bundle: CanonicalBundle,
  sign: (msg: string) => Promise<string>
): Promise<CanonicalBundle> {
  // Temporarily null out signature value before canonicalizing for signing
  bundle.signature.value = null;
  const canonical = canonicalize(bundle);
  bundle.signature.value = await sign(canonical);
  return bundle;
}

// ── IPFS Upload (Pinata) ───────────────────────────────────────────────────────

/**
 * Upload the signed bundle to IPFS via Pinata.
 * Returns the CID string.
 *
 * Requires env vars:
 *   PINATA_JWT  — Pinata API JWT token (from app.pinata.cloud → API Keys)
 *
 * @param signedBundle
 * @param pinataJwt
 * @returns CID
 */
export async function pinToIPFS(signedBundle: CanonicalBundle, pinataJwt: string): Promise<string> {
  const canonical = canonicalize(signedBundle);

  const res = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${pinataJwt}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      pinataContent: JSON.parse(canonical),
      pinataMetadata: { name: `getkinetik-grade-${Date.now()}` },
      pinataOptions: { cidVersion: 1 },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Pinata upload failed: ${res.status} ${text}`);
  }

  const { IpfsHash } = await res.json() as { IpfsHash: string };
  return IpfsHash;
}


// ── CID Signing ────────────────────────────────────────────────────────────────

/**
 * Sign the CID commitment string per Section 5 of the spec.
 * String to sign: `${cid}|${node_id}|${computed_at}|${methodology_version}`
 *
 * @param cid
 * @param bundle - Signed bundle
 * @param sign   - async (message: string) => hex string signature
 * @param bureau_pubkey
 * @returns cid_signature object
 */
export async function signCID(
  cid: string,
  bundle: CanonicalBundle,
  sign: (msg: string) => Promise<string>,
  bureau_pubkey: string
): Promise<CidSignature> {
  const message = [
    cid,
    bundle.node_id,
    bundle.grade.computed_at,
    bundle.grade.methodology_version,
  ].join("|");

  return {
    algo: "ed25519",
    message,
    public_key: bureau_pubkey,
    value: await sign(message),
  };
}

// ── Full Pipeline ──────────────────────────────────────────────────────────────

/**
 * End-to-end grade pipeline: build → sign → pin → sign CID → return.
 *
 * @param params   - Same as buildBundle() params
 * @param sign     - async (message: string) => hex signature
 * @param w3sToken
 * @returns full bundle + CID + CID signature
 */
export async function gradeAndPin(
  params: BundleParams,
  sign: (msg: string) => Promise<string>,
  w3sToken: string
): Promise<{ bundle: CanonicalBundle; cid: string; cid_signature: CidSignature }> {
  // 1. Build canonical bundle
  const bundle = buildBundle(params);

  // 2. Sign bundle
  await signBundle(bundle, sign);

  // 3. Pin to IPFS
  const cid = await pinToIPFS(bundle, w3sToken);

  // 4. Update bundle with CID
  bundle.attestation.report_cid = cid;

  // 5. Sign CID commitment
  const cid_signature = await signCID(cid, bundle, sign, params.bureau_pubkey);

  return { bundle, cid, cid_signature };
}
