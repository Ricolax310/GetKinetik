# GETKINETIK Sovereign Verifier

Independent, static, browser-side Ed25519 verifier for Sovereign Node
**Proof of Origin** cards and **signed heartbeats** minted by the
[GETKINETIK](../) mobile app.

The verifier is pure HTML/CSS/JS. No backend, no tracking, no persistence.
Open `index.html` locally, host it on GitHub Pages / Vercel / Netlify, or
drop it on any static host. If the page can load, the verifier works.

## Why this exists

Every Sovereign Node mints an Ed25519 keypair that lives in keystore and
never leaves the device. The app emits two kinds of signed artifacts:

- **Proof of Origin cards** — freshly signed on every open, stamping the
  node ID, public key, mint date, lifetime beats, chain tip, and
  attribution.
- **Signed heartbeats** — hash-chained uptime proofs emitted every 30s
  while the node is LIVE.

Those signatures are mathematically valid but socially invisible without
an independent verifier. This page is that verifier. Any stranger can
paste a shared artifact here and get a definitive VALID / INVALID back,
without trusting the app, the domain, or anyone else.

## Verification contract

For any artifact, all four of these must pass:

1. `stableStringify(payload)` equals the signed `message` byte-for-byte.
2. `sha256(message)` truncated to 16 hex chars equals the embedded `hash`.
3. For Proof of Origin: `payload.attribution` equals
   `"GETKINETIK by OutFromNothing LLC"`.
4. `Ed25519.verify(signature, message, payload.pubkey)` returns `true`.

These checks mirror `src/lib/proof.ts::verifyProofOfOrigin` and
`src/lib/heartbeat.ts::verifyHeartbeat` in the app. If either side
changes its canonical serialization or attribution constant, bump
`__kinetikVerifier.version` in `verifier.js` and the corresponding
version field in the app payload.

## Input formats

Two JSON shapes are accepted:

**FULL** (what the app mints today):

```json
{
  "payload": { "v": 1, "kind": "proof-of-origin", ... },
  "message": "{\"attribution\":\"GETKINETIK by OutFromNothing LLC\",...}",
  "signature": "<128 hex chars>",
  "hash": "<16 hex chars>"
}
```

**COMPACT** (QR / URL fragment — `message` and `hash` are re-derived):

```json
{
  "payload": { "v": 1, "kind": "proof-of-origin", ... },
  "signature": "<128 hex chars>"
}
```

## URL-fragment auto-verify

A QR code or deep link can pre-load an artifact:

```
https://verify.getkinetik.com/#proof=<base64url(JSON)>
```

On page load, if `#proof=` is present, the page decodes, fills the
textarea, and runs verification automatically. The fragment stays
client-side (browsers never send URL fragments to servers), so pasting
a verify link into chat/email does not leak the artifact to any host.

## Self-test

The **SELF-TEST** button mints a throwaway keypair in-browser, signs a
fake proof, and runs it through the same `verifyArtifact()` the paste
path uses. A passing self-test confirms the runtime is healthy — if a
real artifact then fails, the failure is genuine, not a verifier bug.

## Hosting

Any static host works. Recommended flow for the canonical deployment:

- Push this `verifier/` folder to a `gh-pages` branch (or separate repo),
  or configure GitHub Pages to serve from this folder on `main`.
- Point `verify.getkinetik.com` CNAME at the static host.
- Cloudflare / any CDN in front is fine; the page is static.

For local dev, any plain HTTP server will do:

```bash
# from /verifier
python -m http.server 8000
# then open http://localhost:8000
```

`file://` also works in most modern browsers thanks to the ES-module
imports being routed through esm.sh, but `http://` is cleaner for testing
the URL-fragment flow.

## Zero-external-trust mode (optional)

By default the verifier fetches two ES modules from esm.sh on load:

- `@noble/ed25519@3.1.0`
- `@noble/hashes@2.2.0/sha2.js`

These are the same pinned versions the app's `package.json` uses, so they
are already audited as part of the app. A user who wants the verifier to
run with zero external fetches can vendor them:

1. Download `ed25519.js` from `https://esm.sh/@noble/ed25519@3.1.0` and
   `sha2.js` from `https://esm.sh/@noble/hashes@2.2.0/sha2.js` (these are
   bundled ESM files).
2. Save them in this folder.
3. Change the two `import` lines at the top of `verifier.js` to the
   local paths: `./ed25519.js` and `./sha2.js`.

After that change, opening `index.html` makes zero network requests.

## License / attribution

Part of the GETKINETIK Sovereign Node project by OutFromNothing LLC.
The attribution string is cryptographically bound into every Proof of
Origin payload — see `PROOF_ATTRIBUTION` in `verifier.js` and
`src/lib/proof.ts`.
