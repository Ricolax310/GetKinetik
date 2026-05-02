# GETKINETIK

> **Honest numbers for every DePIN you run.**
> Built outside the networks. Owned by no one. Hardware-signed proof of
> what your devices actually did, actually earned, and actually proved —
> across every network paying out, in plain sight, no spin.

GETKINETIK is the **independent trust layer for the decentralized
physical economy** — a neutral, cryptographically-verifiable record of
node identity, uptime, and earnings across DePIN networks (Nodle, DIMO,
Hivemapper, WeatherXM, Geodnet, more coming).

Networks can't grade themselves and stay credible. Foundations can't
audit their own ecosystems without conflict. We're the third party that
sits outside every network, reads what really happened, and signs it
with hardware-rooted keys you can verify in any browser.

**Our charter** is in [`NEUTRALITY.md`](./NEUTRALITY.md): no token, no
equity in graded networks, no exclusive partnerships, all revenue in
fiat or stablecoin, methodology public. That's what makes the data
worth trusting.

No servers holding your data. No accounts. No middleman taking a cut of
your tokens. Just signed receipts, on your device, verifiable by anyone.

---

## Status

**v1.4.0 is the current public release** (Android preview APK). **v1.5** is
next on the roadmap (seed backup, partner premium, etc.) — see the roadmap
block below. Install via [getkinetik.app](https://getkinetik.app) (Android
download) or **`GETKINETIK-v1.4.0.apk`** on
[Releases](https://github.com/Ricolax310/GetKinetik/releases/latest).

| Layer | Status | What it is |
|---|---|---|
| **L1** Sovereign Identity + Trust | ✅ Shipped | Ed25519 key + hash-chained heartbeat log + public verifier |
| **L2** Sensor Capture + Signing | 🟡 Partial | 3 of 7 planned permission-free sensors signing into the chain |
| **L3** DePIN Optimizer | ✅ Shipped | Gas-aware claim timing, shared polling pool, yield scoring, device discovery |
| **L4** Earnings Ledger + Disclosure Fee | ✅ Shipped | Hardware-signed earnings receipts; optional 1% bureau fee disclosed in the signature |
| **Partner Verification API** | ✅ Shipped | `POST /api/verify-device` — signed proof in, attestation out |
| **Verified-User Premium** | 🔨 v1.5 | Partners pay our verified operators 10–15% above standard rate (partner activation required) |
| **Genesis Score** | 🟡 Partial | Public node reputation score (uptime, age, attestation count). **Non-transferable. Not a token. Never priced.** |

iOS preview is on the roadmap. Currently Android-only because Apple's
restrictions on background sensor collection and crypto-flavored apps make
the architecture meaningfully harder there. iPhone visitors hitting the
download button can join the waitlist on the site.

### Roadmap

```
v1.4.x  SHIPPED — Optimizer, Genesis Score (MVP), shared PollingPool, verify-device webhook, metrics
v1.5    NEXT   — Seed-phrase backup; first verified-user premium with a partner network;
                 Methodology v1.0 published (how the Genesis Score is computed)
v1.6    SOON   — Partner API tiers (free, pro, enterprise); batch attestation endpoint;
                 third-party auditor read API
v2.0    LATER  — Public attestation index across 25+ DePIN networks; transparency reports
```

---

## What's actually verifiable right now

Anyone, no account, no install:

- **Mint a Proof of Origin** in the app, scan its QR, paste the URL into
  any browser, and the [public verifier](https://getkinetik.app/verify/)
  runs the full Ed25519 signature check entirely client-side. No server
  call. No account. No trust required — the math is the witness.
- **Try it cold** with a live demonstration proof generated from
  [`scripts/mint-demo-proof.mjs`](./scripts/mint-demo-proof.mjs). The
  script outputs a self-contained URL you can verify in any browser.

This isn't a demo of "what trust looks like." It's the actual trust
primitive the app is built on, exposed publicly so anyone — partner,
auditor, skeptic — can confirm we're not lying about what's signed.

---

## Repository layout

```
.
├── App.tsx                      # Mobile app entry (Expo / React Native)
├── src/
│   ├── components/              # Vault UI, Gemstone, AggregatorPanel, etc.
│   └── hooks/                   # Sensor + storage glue
│
├── packages/
│   ├── kinetik-core/            # L1 + L4 trust-layer primitive (the moat)
│   │   └── src/                 #   identity · heartbeat · sensors ·
│   │                            #   proof · stableJson · wallet · adapter
│   ├── optimizer/               # L3 optimizer engine
│   │   └── src/                 #   priceFeed · gasFeed · scorer ·
│   │                            #   discovery · pollingPool · savings
│   ├── credits/                 # Genesis Credits engine (NOT a token)
│   ├── adapter-nodle/           # L3 adapter — Nodle Cash
│   ├── adapter-dimo/            # L3 adapter — DIMO Network
│   ├── adapter-hivemapper/      # L3 adapter — Hivemapper Honey Jar
│   ├── adapter-weatherxm/       # L3 adapter — WeatherXM Pro
│   └── adapter-geodnet/         # L3 adapter — Geodnet
│
├── src/components/
│   ├── AggregatorPanel.tsx      # Multi-adapter earnings UI (shared PollingPool)
│   ├── OptimizationReport.tsx   # Weekly savings proof modal
│   ├── GenesisCreditsTicker.tsx # Genesis Credits counter
│   └── ...
│
├── landing/                     # getkinetik.app (Cloudflare Pages)
│   ├── index.html               #   marketing site
│   ├── verify/                  #   public Ed25519 verifier (zero deps)
│   ├── dimo-callback/           #   OAuth bounce page for DIMO login
│   └── metrics/                 #   public network metrics dashboard
│
├── functions/api/
│   ├── waitlist.js              # Cloudflare Function — waitlist KV
│   ├── verify-device.js         # Cloudflare Function — partner verification webhook
│   ├── credits.js               # Cloudflare Function — Genesis Credits KV sync
│   └── metrics.js               # Cloudflare Function — network metrics aggregate
│
├── docs/
│   ├── architecture.md          # System overview for M&A due diligence
│   ├── cryptography.md          # Signing contract specification
│   ├── adapter-contract.md      # Partner integration guide
│   ├── IP-ASSIGNMENT.md         # IP ownership + USPTO trademark guidance
│   └── api/verify-device.md    # verify-device webhook API spec
│
└── scripts/
    └── mint-demo-proof.mjs      # Generate a live demo proof URL
```

The TypeScript app and the browser-side verifier share a cryptographic
contract — `stableStringify`, `PROOF_ATTRIBUTION`, the artifact shape.
The verifier is intentionally a near-byte-for-byte mirror of
`packages/kinetik-core/src/proof.ts` and `heartbeat.ts`, so a proof
minted by the app and a proof verified by the browser cannot diverge
without one or both refusing to validate.

---

## For partners

We're the **independent trust layer** that grades nodes across every
DePIN — never a network competitor. The integration shape is:

- **Read-only** against the partner network's own API (we never custody earnings; tokens live in the user's wallet on the partner's network)
- **Hardware-signed Proof of Origin** attached to every node-side claim, verifiable by anyone via the public verifier at `getkinetik.app/verify/`
- **Free verification webhook** for anti-Sybil checks: `POST https://getkinetik.app/api/verify-device`
- **Verified-user premium programme** — pay GETKINETIK-verified nodes 10–15% above your standard rate; we pass it through as a signed receipt. You save more on fraud than you pay in premium.

Try the webhook right now (no auth required):
```bash
curl -X POST https://getkinetik.app/api/verify-device \
  -H 'Content-Type: application/json' \
  -d '{"proofUrl":"<paste_any_getkinetik_proof_url>"}'
```

Full API spec: [`docs/api/verify-device.md`](./docs/api/verify-device.md)

Outreach materials: [`PARTNER_EMAILS.md`](./PARTNER_EMAILS.md)

Direct contact: **eric@outfromnothingllc.com**

---

## Honest disclosure

Your node is an **anonymous cryptographic identity** — the network sees
a unique ID, never a name, never an account. That identity lives only on
your phone.

**If you lose your phone, the real picture is:**

- Your DePIN earnings (DIMO, Nodle, Hivemapper, etc.) are safe — they
  live in your wallet on those networks. We only read them, never hold them.
- Your **Genesis Score** is a public reputation number tied to your node's
  history. It is **never transferable, never priced, never redeemable** —
  it's a *grade*, not a currency. Losing your phone resets the grade for
  the new device, but no money is at stake.
- What you actually lose is your **node's seniority** — how long it's been
  running, its heartbeat chain, its track record. The anonymous identity
  itself can be recreated instantly on a new device.

Seniority is a reputation clock, not cash. As the bureau grows, partners
who pay verified-user premiums may weight node age and Genesis Score in
their offers — meaning a long-running, well-graded node may unlock
*better partner rates*, but the grade itself is never something you own
or can sell. Lose your phone and you start the clock over; nothing
else is lost.

Seed-phrase backup (write down 12 words, restore on a new device, one
device active at a time) is **in progress** — not in v1.4.0; see
`RELEASE_NOTES_v1.4.md` for current limitations.

---

## Building from source

The app is an Expo / React Native project. Standard local dev:

```bash
npm install
npx expo start
```

The web verifier is static HTML + JS with vendored cryptography — no
build step, no bundler, no node_modules at runtime. Open
`landing/verify/index.html` in a browser to test locally.

Production Android builds happen via EAS:

```bash
npx eas-cli build -p android --profile preview
```

Smoketest the cryptographic contract any time:

```bash
node landing/verify/smoketest.mjs
```

---

## License

UNLICENSED — proprietary, not open source. Copyright © OutFromNothing LLC.

The verifier at `landing/verify/` is intentionally readable, auditable,
and runs entirely in the user's browser — that's a feature, not an
invitation to fork.

---

## Contact

- Project: [getkinetik.app](https://getkinetik.app)
- Email: eric@outfromnothingllc.com
- GitHub: [@Ricolax310](https://github.com/Ricolax310)
- Founder: Eric (Kinetik_Rick) · OutFromNothing LLC

A Sovereign Node Protocol artifact. Not transferable.
