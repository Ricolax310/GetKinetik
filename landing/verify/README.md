# GETKINETIK Sovereign Verifier

Independent, static, browser-side Ed25519 verifier for Sovereign Node
**Proof of Origin** cards and **signed heartbeats** minted by the
[GETKINETIK](../../) mobile app.

**Live at: [getkinetik.app/verify/](https://getkinetik.app/verify/)**

The verifier is pure HTML/CSS/JS with vendored crypto. No backend, no
tracking, no persistence, no external network requests at verify time.
It is served from the same Cloudflare Pages project as the landing site,
under the same strict CSP (`script-src 'self'`) — the page is locked
down to exactly the bytes in this folder.

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
https://getkinetik.app/verify/#proof=<base64url(JSON)>
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

## Files

```
landing/verify/
├── index.html       HTML skeleton + meta
├── styles.css       Obsidian/ruby/sapphire aesthetic mirroring the app
├── verifier.js      4-check verify pipeline + URL fragment + self-test
├── smoketest.mjs    Node regression test — re-run after any vendor refresh
├── README.md        This file
└── vendor/
    ├── ed25519.js   @noble/ed25519@3.1.0 — full bundle, zero imports
    ├── sha2.js      @noble/hashes@2.2.0/sha2 — imports _md, _u64, utils
    ├── _md.mjs      @noble/hashes internal — imports utils
    ├── _u64.mjs     @noble/hashes internal — leaf, no imports
    └── utils.mjs    @noble/hashes internal — leaf, no imports
```

## Hosting

The verifier ships as part of the `landing/` Cloudflare Pages project.
Pushing to `main` auto-deploys both the landing page and the verifier in
the same build.

**Build output directory:** `landing/`
**Live path:** `getkinetik.app/verify/`

No separate project, no separate CSP, no separate DNS entry.

## Refreshing vendored crypto

The five files in `vendor/` are committed bundles of published ESM. To
upgrade to a newer release of either library:

1. Update the pinned versions in the app's `package.json`.
2. From the repo root, with PowerShell:

   ```powershell
   $v_ed  = "3.1.0"   # match app package.json
   $v_hsh = "2.2.0"   # match app package.json
   $dest  = "landing/verify/vendor"

   Invoke-WebRequest "https://esm.sh/@noble/ed25519@$v_ed/es2022/ed25519.bundle.mjs" -OutFile "$dest/ed25519.js"
   Invoke-WebRequest "https://esm.sh/@noble/hashes@$v_hsh/es2022/sha2.bundle.mjs"    -OutFile "$dest/sha2.js"
   Invoke-WebRequest "https://esm.sh/@noble/hashes@$v_hsh/es2022/_md.mjs"            -OutFile "$dest/_md.mjs"
   Invoke-WebRequest "https://esm.sh/@noble/hashes@$v_hsh/es2022/_u64.mjs"           -OutFile "$dest/_u64.mjs"
   Invoke-WebRequest "https://esm.sh/@noble/hashes@$v_hsh/es2022/utils.mjs"          -OutFile "$dest/utils.mjs"
   ```

3. Run the smoke test to confirm contract parity with the app:

   ```bash
   node landing/verify/smoketest.mjs
   ```

4. Commit the updated vendor files **together** with the app-side
   `package.json` bump. Never drift the two.

## Local preview

```powershell
# from repo root
python -m http.server --directory landing 4173
# open http://localhost:4173/verify/
```

Any static server works. Because crypto is vendored, `file://` loading
also works for quick offline audits.

## License / attribution

Part of the GETKINETIK Sovereign Node project by OutFromNothing LLC.
The attribution string is cryptographically bound into every Proof of
Origin payload — see `PROOF_ATTRIBUTION` in `verifier.js` and
`src/lib/proof.ts`.
