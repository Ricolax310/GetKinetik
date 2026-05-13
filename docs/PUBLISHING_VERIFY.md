# Publishing `@getkinetik/verify` to npm

The `packages/verify/` workspace is **published and live**. This document
is the runbook for the initial publish and for every subsequent version
bump.

> Status as of 2026-05-13: **`@getkinetik/verify@0.1.0` is LIVE on npm.**
> Confirmed via clean `npm install` from a fresh directory and via the
> public page at https://www.npmjs.com/package/@getkinetik/verify. The
> initial publish was 2FA-gated via a WebAuthn security key (Windows
> Hello). The sections below describe both the one-time setup that
> already ran, and the recurring publish flow for every version after.

---

## Why we publish

GETKINETIK is the independent trust layer for the decentralized
physical economy. The bureau's credibility depends on partners being
able to **independently** verify our signed artifacts without calling
our infrastructure. That's what this package is — a pure-function,
zero-network verifier any partner can drop into a Node, browser, or
edge worker.

A live `npm install @getkinetik/verify` is the cheapest credibility
unlock available. It turns the SDK from an internal artifact into a
public install. Partner conversations change shape the moment "here's
the webhook" becomes "here's the npm package."

---

## Scope decision (2026-05-12, locked)

The `@kinetik` scope on npm was unavailable — soft-squatted by a
dormant `kinetik` user account with 0 packages and 0 orgs that npm
will not release. We claimed `@getkinetik` instead, which matches
the `getkinetik.app` domain and reads cleanly as
`npm i @getkinetik/verify`.

If a future package goes public (`@getkinetik/sdk-react-native`,
`@getkinetik/sdk-android`, etc.), it ships under the same scope.

---

## One-time setup (DONE — kept here for the record)

> The setup below was completed during the v0.1.0 publish on 2026-05-13.
> Future publishes only need the **Publishing** section.

### 1. Log in to npm

```bash
npm login
```

This opens a browser auth flow. Sign in there; the terminal will
unblock when done. Confirm with:

```bash
npm whoami
```

You should see your npm username (e.g. `kinetik_rick`).

### 2. Verify you have permission to publish under `@getkinetik`

```bash
npm org ls getkinetik
```

You should see yourself as an owner of the org. If npm returns an
"unauthorized" error, you're logged in under a different account
than the one that created `@getkinetik` — fix the login first.

### 3. Enable 2FA on the publishing account

npm requires 2FA (or a 2FA-bypassed granular access token) before
allowing publishes to a public scope. On the `kinetik_rick` account
we registered a **Security Key (WebAuthn / Passkey)** via Windows
Hello — this is the strongest 2FA path npm supports and it works
in the CLI publish flow by opening a browser tab when prompted.

When publishing, npm will print an authentication URL and pause:

```
Authenticate your account at: https://www.npmjs.com/auth/cli/<id>
Press ENTER to open in the browser...
```

**Run `npm publish` in an interactive terminal** — press ENTER, the
browser opens, Windows Hello prompts, you confirm, and the terminal
finishes the publish. A non-interactive shell will exit before the
WebAuthn handshake completes and the publish will fail with `EOTP`.

---

## Publishing (subsequent versions)

From the repo root, after merging the version bump to `main`:

```bash
cd packages/verify
npm run build      # tsc -> dist/, must be clean
npm test           # 27/27 smoketest, exits 0 on pass
npm publish        # --access public is baked into package.json
```

The `prepublishOnly` script runs `build` and `smoketest` automatically
before publish — if either fails, npm aborts before pushing anything.
So the `npm run build` and `npm test` lines above are belt-and-
suspenders, not strictly required.

**Run `npm publish` in an interactive terminal** — npm will pause
on the WebAuthn confirmation step (see 2FA section above).

Confirm the new version is live:

```bash
npm view @getkinetik/verify version
# expect: <the version you just bumped>

# Or do a clean install in a temp dir to test it end-to-end:
mkdir -Force "$env:TEMP/gk-verify-test"; cd "$env:TEMP/gk-verify-test"
npm init -y >$null
npm install @getkinetik/verify
node -e "import('@getkinetik/verify').then(m => console.log(m.VERSION))"
```

And visit https://www.npmjs.com/package/@getkinetik/verify — the
README renders directly on that page.

> **Note on cache propagation.** For a fresh scope's first publish,
> npm's CDN can take up to a few minutes to surface the new package
> on `npm view` and on the public registry endpoint, even though
> `npm publish` exited cleanly and `npm install` works against the
> origin. Don't chase 404s in that window — wait, then re-check.
> Subsequent publishes propagate within seconds.

---

## Versioning policy

The `VERSION` constant in `packages/verify/src/index.ts` is the
**cryptographic contract version**, not the marketing version. It
stays in lockstep with:

- `landing/verify/verifier.js` → `window.__kinetikVerifier.version`
- `functions/api/verify-device.js` → response `methodologyVersion`
- `packages/kinetik-core/` → schema version on `HeartbeatPayload.v`,
  `ProofOfOriginPayload.v`, etc.

Bump rules:

| Change | Bump |
|--------|------|
| `stableStringify` shape | **major** (`X.0.0`) — breaks every previously signed artifact |
| `sha256[:16]` truncation rule | **major** — same reason |
| Ed25519 signing scheme | **major** — same reason |
| `PROOF_ATTRIBUTION` constant | **major** — same reason |
| New artifact `kind` supported (additive) | **minor** (`0.Y.0`) |
| Bug fix in verification report rendering | **patch** (`0.0.Z`) |

`0.x` while we have zero downstream partners on the package; `1.0.0`
the day the first partner ships an integration that imports it. Before
`1.0.0`, minor bumps may include breaking type changes — after `1.0.0`,
the type surface is part of the contract and only changes on major.

**Current version: `0.1.0` (published 2026-05-13).** Next bump candidates:

- `0.1.1` — fix the `repository.url` warning (`git+` prefix) so future
  publishes don't show the auto-correction notice. Already applied in
  the local working tree; will go out with the next release.
- `0.2.0` — when the v:2 PoO schema gains optional `audience`/`nonce`/
  `purpose` fields per `docs/sdk/CLIENT_SDK_DESIGN.md`. Verifier gains
  optional rendering for those fields. Additive, backward-compat.
- `1.0.0` — when the first partner ships an integration that imports
  this package in production.

---

## What NOT to do

- **Do not publish from a feature branch.** Publish only from `main`,
  after the commit that bumps `VERSION` has landed.
- **Do not skip the smoketest.** `prepublishOnly` runs it; if you
  ever bypass via `--ignore-scripts`, you're publishing without
  contract verification. Don't.
- **Do not unpublish.** You have 72 hours, after which npm refuses
  unpublish requests for packages with more than 1 dependent. A bad
  release is fixed by publishing a patch, not by retracting.
- **Do not publish the entire monorepo.** Only `packages/verify/`
  ships. The other workspace packages (`packages/kinetik-core/`,
  `packages/optimizer/`, `packages/credits/`, `packages/adapter-*`)
  are `private: true` by design and the in-app code stays private
  until each L1/L2/L3/L4 SDK boundary is formalized (see
  `packages/kinetik-core/README.md` for the three gates on the
  identity package specifically). When any of those packages goes
  public, they get renamed to the `@getkinetik/...` scope before
  publish.
- **Do not sign commits as the bot.** Publishing identity stays with
  the human author so npm 2FA stays meaningful.

---

## Drift check (manual, run periodically)

The verify package shares a cryptographic contract with three other
implementations. They must stay byte-equivalent. To audit drift:

```bash
# Compare stableStringify across all three implementations.
rg -n 'const stableStringify' packages/verify/src functions/api landing/verify

# Compare PROOF_ATTRIBUTION across all four implementations.
rg -n 'PROOF_ATTRIBUTION =' packages/verify/src packages/kinetik-core/src functions/api landing/verify
```

All matches must be byte-identical strings. Any difference is a
contract bug — fix it before the next publish.

---

*OutFromNothing LLC · GETKINETIK · The Bureau · 2026-05*
