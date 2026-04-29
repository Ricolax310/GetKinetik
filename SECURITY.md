# Security policy

GETKINETIK ships a cryptographic trust layer. Bugs in the wrong file
can silently break the integrity contract every signed proof depends
on. We take that seriously.

## Reporting a vulnerability

**Email:** `eric@outfromnothingllc.com` with subject prefix `[SECURITY]`.

Encrypt with PGP only if you can — we don't currently publish a
public key, plain email is fine. Don't open public GitHub Issues for
security findings — please use email so the disclosure can be
coordinated.

What helps us triage fast:

- A clear description of what the bug allows (signature forgery?
  identity theft? key recovery from disk? side-channel?)
- A minimal reproduction — code snippet, attack URL, or signed
  artifact that demonstrates the issue
- Your suggested severity (low / medium / high / critical) and why
- An estimate of how widely you've looked at the affected surface,
  so we know if it's likely an isolated finding or a class of bug

We will:

- Acknowledge receipt within **3 business days**
- Confirm or refute the finding within **10 business days**
- Ship a fix and disclose, with credit if you'd like, within
  **30 days** of confirmation for clear findings; longer windows
  apply to deeply structural bugs and we'll communicate timing

We will not:

- Pursue legal action against good-faith research that respects this
  policy
- Pay bug bounties at this stage of the project — we're an indie
  project; we'll publicly credit reporters and link to your work in
  the release that fixes the bug

## In scope

The cryptographic surface and anything that touches it:

| Surface | Where it lives |
|---|---|
| Ed25519 keypair handling | `packages/kinetik-core/src/identity.ts` |
| Hash-chained heartbeat log | `packages/kinetik-core/src/heartbeat.ts` |
| Proof of Origin signing pipeline | `packages/kinetik-core/src/proof.ts` |
| Canonical JSON serialization | `packages/kinetik-core/src/stableJson.ts` |
| Browser-side verifier | `landing/verify/verifier.js` |
| Vendored crypto bundles | `landing/verify/vendor/` |
| OAuth bounce page (DIMO etc.) | `landing/dimo-callback/` |
| Waitlist storage | `functions/api/waitlist.js` |

Examples of in-scope findings:

- Forgery of a Proof of Origin or signed earning that the verifier
  accepts as valid
- Recovery of an Ed25519 private key from device storage by another
  app on the same device
- Replay or chain-fork attacks on the heartbeat log that the
  verifier doesn't catch
- Breakage of the canonical serialization contract that lets two
  different payloads sign the same message
- XSS or injection in the verifier UI that could be used to lie
  about a verification result
- Unintended PII leakage from the waitlist endpoint

## Out of scope

These are not security issues per se — please file them as regular
GitHub issues instead:

- The single-key / no-recovery design itself. Users losing their
  device losing their node is a deliberate architectural choice,
  not a bug. (Seed-phrase backup ships in v1.4.)
- DePIN partner network bugs (a Hivemapper API outage is a
  Hivemapper issue, not ours)
- Browser quirks where the verifier renders ugly but still
  cryptographically refuses to validate a tampered proof
- Build-system or CI noise

## A note on the verifier

The verifier at `landing/verify/` is intentionally a near-byte-for-
byte mirror of the app-side cryptography in `packages/kinetik-core/`.
A divergence between those two surfaces is a high-severity finding
even if neither side is independently broken — a proof minted by
one and rejected by the other (or vice versa) is exactly the
contract drift our `stableStringify` discipline exists to prevent.

If you find a divergence, send the failing artifact along with the
report.

---

A Sovereign Node Protocol artifact. Not transferable.
