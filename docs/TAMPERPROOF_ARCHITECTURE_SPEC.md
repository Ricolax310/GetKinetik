# GETKINETIK — Tamper-Proof Architecture Guidelines (Dev Team Spec)

> **Status:** Active Engineering Spec  
> **Version:** 1.0  
> **Date:** 2026-05-19  
> **Author:** OutFromNothing LLC

---

# 1. Node Identity & Attestation Requirements

### 1.1 Hardware Identity
- Each node MUST generate its Ed25519 keypair inside Android Keystore / TEE (ARM TrustZone).
- The **public key = node_id** and MUST remain stable for the lifetime of the node.
- Private keys MUST never leave the secure enclave.

### 1.2 Heartbeat Format
Every heartbeat MUST include:
- `timestamp`
- `sensor_snapshot` (motion, pressure, light, etc.)
- `prev_hash` (hash-chain pointer)
- `signature` (Ed25519 over the entire payload)

### 1.3 Verification
- Verification MUST be fully offline using `@getkinetik/verify`.
- Hosted verification (`POST /api/verify-device`) MUST produce identical results.

---

# 2. Grading Logic Requirements

### 2.1 Determinism
- Given identical inputs, the Genesis Score MUST be identical.
- No randomness, no time-dependent behavior except explicit timestamps.

### 2.2 Versioning
- Each grade MUST include:
  - `methodology_version`
  - `methodology_hash` (SHA-256 of the scoring code or config)

### 2.3 Inputs Required
- Node age (seniority)
- Heartbeat uptime %
- Active network count
- Sensor coherence metrics
- Enclave signature validity

All inputs MUST be included in the final bundle.

---

# 3. Canonical Grade Bundle Specification

Each evaluation MUST produce **one canonical JSON object**:

```json
{
  "node_id": "<TEE public key>",
  "attestation": {
    "latest_heartbeat": { "...": "..." },
    "heartbeat_chain_root": "<hash>",
    "report_cid": "<optional>"
  },
  "grade": {
    "score": 0,
    "tier": "<string>",
    "computed_at": "<ISO timestamp>",
    "methodology_version": "v1.1",
    "methodology_hash": "<sha256>"
  },
  "inputs": {
    "uptime_pct": 0.0,
    "network_count": 0,
    "sensor_coherence": 0.0,
    "age_days": 0,
    "enclave_valid": true
  },
  "meta": {
    "issuer": "getkinetik.app",
    "bundle_version": 1
  },
  "signature": {
    "algo": "ed25519",
    "public_key": "<bureau_pubkey>",
    "value": "<sig>"
  }
}
```

### 3.1 Canonicalization
Before hashing or signing:
- JSON MUST be canonicalized (sorted keys, no whitespace variance).
- Use **RFC 8785** (JSON Canonicalization Scheme).

---

# 4. IPFS Publishing Requirements

### 4.1 Upload
- The canonical JSON MUST be uploaded to IPFS via Cloudflare's gateway.
- The resulting **CID MUST be stored** in the database and returned to the client.

### 4.2 Persistence
- CIDs MUST be pinned using Cloudflare's IPFS pinning.
- Optional: secondary pinning provider (Pinata, web3.storage) for redundancy.

### 4.3 Public Access
- Every grade MUST be accessible at:
  - `https://getkinetik.app/ipfs/<cid>`
  - `ipfs://<cid>`

---

# 5. CID Signing Requirements

### 5.1 CID Signature
After generating the CID, sign the following string:

```
CID + node_id + computed_at + methodology_version
```

Add this to the bundle as:

```json
"cid_signature": {
  "algo": "ed25519",
  "public_key": "<bureau_pubkey>",
  "value": "<sig>"
}
```

This proves:
- GETKINETIK acknowledges the record
- The record belongs to that node
- The record was produced at that time
- The methodology version is correct

---

# 6. Blockchain Anchoring Requirements (Solana)

### 6.1 Daily Merkle Root
- Collect all CIDs generated in a 24-hour window.
- Build a Merkle tree.
- Publish the Merkle root to Solana.

### 6.2 On-Chain Schema
Store:
- `merkle_root`
- `day_timestamp`
- `count`
- `methodology_version`

### 6.3 Verification
Third parties can:
- Fetch CID → verify signature → verify inclusion in Merkle tree → verify on-chain root.

This creates **cryptographic, timestamped, censorship-resistant auditability**.

---

# 7. Frontend Requirements

### 7.1 Display
For each node:
- Latest grade
- CID
- CID signature
- Link to IPFS
- Methodology version
- On-chain anchor (if available)

### 7.2 Verification Tools
Provide:
- "Verify this grade" button (runs offline verification)
- "View on Solana" link
- "Download bundle" option

---

# 8. Security Requirements

### 8.1 Key Management
- Bureau signing key MUST be stored in HSM or Cloudflare Key Management.
- Rotation MUST be versioned and published.

### 8.2 Replay Protection
- `computed_at` MUST be monotonic per node.
- Reject stale grade submissions.

### 8.3 Integrity
- All hashes MUST be SHA-256.
- All signatures MUST be Ed25519.

---

# 9. Testing Requirements

### 9.1 Unit Tests
- Canonicalization
- Signature generation & verification
- Deterministic scoring

### 9.2 Integration Tests
- IPFS upload
- CID retrieval
- Offline verification

### 9.3 End-to-End Tests
- Node heartbeat → grade → IPFS → CID → Solana anchor → verification

---

# 10. Documentation Requirements

Maintain publicly:
- Public methodology docs
- Public verification docs
- Public schema definitions
- Public key registry

---

## Implementation Priority Order

| Priority | Task | Effort |
|---|---|---|
| 🔴 1 | Canonical grade bundle format (Section 3) | ~4 hrs |
| 🔴 2 | IPFS pinning pipeline (Section 4) | ~4 hrs |
| 🔴 3 | CID signing (Section 5) | ~2 hrs |
| 🟡 4 | Daily Merkle root + Solana anchor (Section 6) | ~1 day |
| 🟡 5 | Frontend CID display + verify button (Section 7) | ~4 hrs |
| 🟢 6 | Full test suite (Section 9) | ~1 day |
