# GETKINETIK

> Aggregate every DePIN earning into one signed ledger. Hardware-signed.
> Zero custody. Your phone is the sovereign node.

**Yearn for DePIN.** Yearn Finance optimized DeFi yields by routing capital
to the highest-paying protocol on-chain, automatically. GETKINETIK does the
same thing for the physical layer — your phone's signed sensor attestations
get aggregated across every DePIN network paying out (Nodle, DIMO,
Hivemapper, WeatherXM, Geodnet, more coming), and earnings flow into one
cryptographically auditable ledger you control.

No servers. No accounts. No middleman. Just receipts.

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
| **L4** Wallet + 1% Protocol Fee | ✅ Shipped | Signed earnings ledger with premium-aware receipts |
| **Verified-User Premium** | 🔨 v1.5 | 10–15% yield boost for hardware-attested nodes (partner activation required) |
| **Genesis Credits** | 🟡 Partial | In-app score + KV backup; full wallet export path still in progress (NOT a token) |

iOS preview is on the roadmap. Currently Android-only because Apple's
restrictions on background sensor collection and crypto-flavored apps make
the architecture meaningfully harder there. iPhone visitors hitting the
download button can join the waitlist on the site.

### Roadmap

```
v1.4.x  SHIPPED — Optimizer, Genesis Credits (MVP), shared PollingPool, verify-device webhook, metrics
v1.5    NEXT   — Seed-phrase backup; first verified-user premium with a partner network
v2.0    LATER  — Network rails, token routing, full multi-chain settlement
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

We're an aggregator and trust layer, not a competitor. The integration shape is:

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
- Your Genesis Credits, once transferred out to your wallet, are safe.
- What you lose is your **node's seniority** — how long it's been running,
  its heartbeat chain, its track record. The anonymous identity itself can
  be recreated instantly on a new device.

Right now that trade-off is low stakes — seniority is a clock, not cash.
As the network matures (Genesis Credits gaining value, node age factoring
into routing priority), the longer you've been running the more that
history is worth. But today, losing a node and starting over is an
inconvenience, not a disaster. Keep your credits transferred out regularly
and there's essentially nothing to lose.

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
