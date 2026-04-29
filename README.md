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

**v1.3.0 shipped publicly.** Android-first preview build, install via
[getkinetik.app](https://getkinetik.app) or grab the APK directly from
[Releases](https://github.com/Ricolax310/GetKinetik/releases/latest).

| Layer | Status | What it is |
|---|---|---|
| **L1** Sovereign Identity + Trust | ✅ Shipped | Ed25519 key + hash-chained heartbeat log + public verifier |
| **L2** Sensor Capture + Signing | 🟡 Partial | 3 of 7 planned permission-free sensors signing into the chain |
| **L3** DePIN Routing / Aggregator | 🟡 Read-only | 5 adapters (Nodle, DIMO, Hivemapper, WeatherXM, Geodnet) reading earnings; active routing optimizer is the next layer |
| **L4** Wallet + 1% Protocol Fee | ⏳ Active track | The toll-booth business model |

iOS preview is on the roadmap. Currently Android-only because Apple's
restrictions on background sensor collection and crypto-flavored apps make
the architecture meaningfully harder there. iPhone visitors hitting the
download button can join the waitlist on the site.

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
│   ├── kinetik-core/            # L1 trust-layer primitive (the moat)
│   │   └── src/                 #   identity · heartbeat · sensors ·
│   │                            #   proof · stableJson · wallet
│   ├── adapter-nodle/           # L3 adapter — Nodle Cash
│   ├── adapter-dimo/            # L3 adapter — DIMO Network
│   ├── adapter-hivemapper/      # L3 adapter — Hivemapper Honey Jar
│   ├── adapter-weatherxm/       # L3 adapter — WeatherXM Pro
│   └── adapter-geodnet/         # L3 adapter — Geodnet
│
├── landing/                     # getkinetik.app (Cloudflare Pages)
│   ├── index.html               #   marketing site
│   ├── app.js                   #   waitlist modal + APK download
│   ├── verify/                  #   public Ed25519 verifier (zero deps)
│   └── dimo-callback/           #   OAuth bounce page for DIMO login
│
├── functions/api/waitlist.js    # Cloudflare Pages Function — KV-backed
│
├── scripts/
│   └── mint-demo-proof.mjs      # Generate a live demo proof URL
│
├── PARTNER_EMAILS.md            # Outreach templates for DePIN partners
├── STATUS.md                    # Internal project handoff document
└── HANDOFF.md                   # Working session state
```

The TypeScript app and the browser-side verifier share a cryptographic
contract — `stableStringify`, `PROOF_ATTRIBUTION`, the artifact shape.
The verifier is intentionally a near-byte-for-byte mirror of
`packages/kinetik-core/src/proof.ts` and `heartbeat.ts`, so a proof
minted by the app and a proof verified by the browser cannot diverge
without one or both refusing to validate.

---

## For partners

We're an aggregator and trust layer, not a competitor. The integration
shape is:

- Read-only against the partner network's own API (we never custody
  earnings; tokens live in the user's wallet on the partner's network)
- Hardware-signed Proof of Origin attached to every node-side claim,
  via the L1 trust primitive
- Optional partner-side webhook integration (we forward signed
  attestations on every heartbeat — you can use them as a Sybil-
  resistance signal whether or not we're a paying integration)

Outreach materials and example pitches live in
[`PARTNER_EMAILS.md`](./PARTNER_EMAILS.md). Every template embeds a live,
verifier-ready Proof of Origin URL. Click it, verify it cryptographically
in your browser in 5 seconds — that's the highest-credibility move we have.

Direct contact: **eric@outfromnothingllc.com**.

---

## Honest disclosure

GETKINETIK is built on a **single key, on a single phone, no recovery**.
That's a deliberate design choice — no servers, no accounts, no custodians
means there's nobody to hand your identity back to you if you lose it.

If you uninstall the app, factory reset, or lose this phone:

- Your unique node identity is gone
- Every signed heartbeat ever produced is gone (your seniority resets)
- Every Proof of Origin you've minted goes orphaned — still
  cryptographically valid forever, but no longer attached to a live node
- Every signed receipt of every DePIN payout you've collected through
  GETKINETIK is gone

You **don't lose** your underlying DIMO / Hivemapper / WeatherXM / etc.
accounts. Those live in their own networks, in their own keys. We just
read them.

Seed-phrase backup (write down 12 words, restore on a new device, only
one device active at a time) ships in v1.4. Until then, treat the
device like a hardware wallet.

This warning is on the landing page directly above MINT MY NODE for the
same reason it's here: the worst version of "we're trustless" is the
one where users learn the consequences of trustlessness the hard way.

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
- Owner: OutFromNothing LLC

A Sovereign Node Protocol artifact. Not transferable.
