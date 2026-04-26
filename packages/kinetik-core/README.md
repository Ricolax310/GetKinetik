# @kinetik/core

The L1 trust-layer primitive for GETKINETIK Sovereign Nodes.

This package is the **moat**. Everything else in the GETKINETIK monorepo
(the app shell, the verifier, future DePIN integrations, the eventual
public SDK) is downstream of what lives here.

## Status

**Internal-only as of 2026-04-25.** Do not publish to npm. Do not link
externally. The public SDK release is gated on:

- L4 (wallet + 1% conversion fee path) shipping inside the app
- Brand attestor key anchored at `getkinetik.app/.well-known/getkinetik-attestor.json`
- At least one DePIN integration (Nodle) operating against this package's
  public surface as a real second consumer

Until then, the boundary exists for hygiene: one source of truth for the
signing contract, clean import surface for the app, no entanglement
between L1 primitives and UI.

## What's inside

- `identity` — Ed25519 keypair, SecureStore sealing, sign/verify
- `heartbeat` — Hash-chained signed uptime log, useHeartbeat hook
- `sensors` — L2 permission-free sensor sampler + canonical sensor block
- `proof` — Proof of Origin payload + signing pipeline
- `proofShare` — Verifier URL builder + native share-sheet handoff
- `stableJson` — `stableStringify`, the canonical serializer

## The contract (do not break)

Every signable artifact MUST round-trip through `stableStringify`. Any
change to serialization invalidates every previously signed artifact.
Bump the `v` field on the affected payload type and update the verifier
to accept both versions. The verifier at `landing/verify/verifier.js`
is downstream of this package's contract — keep them in lock-step.

## Public surface

Re-exports through `src/index.ts`. Anything not re-exported is internal
and may change without warning. As the SDK formalizes, this surface gets
curated; today it exposes the union of what the app currently consumes.
