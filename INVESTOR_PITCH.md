# GETKINETIK — Investor One-Pager

> **Stage:** Pre-seed
> **Founder:** Eric Guthmann (Kinetik_Rick) — eric@outfromnothingllc.com
> **Entity:** OutFromNothing LLC
> **Site:** getkinetik.app | **Repo:** github.com/Ricolax310/GetKinetik

---

## The Problem

DePIN networks — Helium, DIMO, Hivemapper, WeatherXM, Geodnet, Nodle — collectively
distribute hundreds of millions of dollars in token rewards to node operators every year.
They have no reliable way to know who is real.

Helium lost an estimated **$250M+** in rewards to fake hotspots before their fraud
became public. Hivemapper battles GPS spoofers. WeatherXM had to ship physical
hardware just to force device authenticity. Every DePIN network faces the same
structural problem: **you cannot grade your own users and remain credible.**
A bank cannot issue its own credit score. An automaker cannot write its own
safety rating. The grader must be independent.

There is no independent trust layer for DePIN. We are building it.

---

## The Solution

**GETKINETIK is the credit bureau for the decentralized physical economy.**

The same way Equifax grades borrowers and Carfax grades used cars — independently,
without conflict, with a public methodology — GETKINETIK grades DePIN nodes.

Every GETKINETIK user generates a hardware-sealed Ed25519 identity on their phone.
That identity accumulates a tamper-evident, hash-chained uptime record. The result
is a **Proof of Origin** — a cryptographically signed certificate that any party
can verify in a browser with no account, no API key, no server call.

Partners call one endpoint:

```
POST https://getkinetik.app/api/verify-device
{ "proofUrl": "<user's proof URL>" }
→ {
    "valid": true,
    "nodeId": "KINETIK-NODE-CDC262E7",
    "pubkey": "ff07e53d...",
    "lifetimeBeats": 25847,
    "firstBeatTs": 1777086288998,
    "genesisScore": 636,         ← THE BUREAU GRADE — live in production
    "scoreBand": "STANDING",     ← public 5-band scale (TAMPERED → PREMIER)
    "methodologyVersion": "v1.0",
    "tamperFlags": []
  }
```

That's it. One HTTP call. Returns real-or-fake, the device's age, **and a 0–1000
Genesis Score** computed from a published FICO-style methodology
(`docs/methodology/GENESIS_SCORE.md`). Works from any backend in any language.

Score bands are calibration anchors — partners pick a threshold appropriate
to their own fraud cost (e.g. 500 permissive, 750 strict, 900 premium tier).
We never decide the network's payout policy; we just publish the grade.

**What we never do:**
- We never issue a token
- We never hold equity in any network we grade
- We never take a cut of user earnings
- We never grade networks differently for money

That neutrality is the moat. It is constitutionally locked in `NEUTRALITY.md`
in our public repo — partners can audit it, investors can rely on it, regulators
can reference it.

---

## Market

| Layer | Market | Comparable |
|---|---|---|
| DePIN rewards market | ~$500M/yr in token distributions | Our primary integration target |
| Device identity / Sybil resistance | No incumbent | Greenfield |
| Credit bureau (traditional) | $12B global | Structural template |
| Chainlink (trust oracle — price feeds) | $10B+ market cap | Adjacent: they solved price trust, we solve device trust |

DePIN is growing fast. Helium, DIMO, Hivemapper, IoTeX, Peaq, Geodnet, and
WeatherXM collectively represent millions of active nodes and growing reward
pools. Every new network that ships adds to our TAM without us writing a single
new line of code — they need the same verification primitive.

The trust bureau market does not exist yet. We are the category.

---

## Business Model

All revenue in USD or USDC. No token exposure.

| Revenue Line | Who Pays | Shape |
|---|---|---|
| **Partner Verification API** | DePIN networks, lenders, insurers, exchanges | Per-call or monthly subscription |
| **Consumer Pro** | Node operators who want advanced analytics | Monthly subscription |
| **Enterprise Audit Access** | Foundations, exchanges, regulators needing audit trails | Annual contract |

Free tier (100 req/min, no key) gets partners integrated and building.
Paid tiers unlock volume, SLAs, batch attestation, and historical data.

---

## Traction — What's Real Today

| What | Status |
|---|---|
| Android app live | v1.4.0 — sideload APK on GitHub Releases |
| Ed25519 sovereign identity | Ships on every install. Key never leaves device. |
| Hash-chained heartbeat log | Running on real hardware. Tamper-evident. Thousands of beats on chain across active nodes. |
| Adaptive cadence (battery-aware) | Active 30s / background 5min / sleep 30min — shipped in `packages/kinetik-core/src/cadence.ts` |
| Proof of Origin verified by external device | Rung 3 confirmed — iPhone scanned Android QR → VALID |
| 5 DePIN network adapters | Nodle, DIMO, Hivemapper, WeatherXM, Geodnet |
| Partner verification webhook | Live at `getkinetik.app/api/verify-device` (POST: verify proof, GET: API discovery JSON) |
| **Genesis Score v1.0 LIVE** | Public 0–1000 reputation grade returned on every verify call. Methodology + score bands published. |
| Partner score lookup API | `GET /api/score/:nodeId` — partners look up a graded node without re-submitting a fresh proof. KV-cached, 30-day TTL. |
| Partner attestation channel | `POST /api/attest` — networks feed signed observations into the bureau (planned v1.1 score input) |
| Bureau landing page | `getkinetik.app/bureau/` — score bands, methodology, sample response, neutrality + privacy charters |
| `@getkinetik/verify` npm package | Publish-ready (`publishConfig.access: public`). 27/27 smoketests passing. Runbook at `docs/PUBLISHING_VERIFY.md`. |
| Public verifier | `getkinetik.app/verify` — runs fully client-side, no server, no telemetry |
| Optimizer engine | Gas-aware claim timing across all 5 networks |
| DIMO integration | Login with DIMO wired, earnings flow into signed ledger |
| NEUTRALITY.md + PRIVACY.md + GENESIS_SCORE.md | Three public charters: no token, no equity, no data sale, FICO-style methodology |
| 5-minute integration quickstart | `docs/QUICKSTART.md` — live demo proof + curl recipe + code examples |

**Outreach sent:** DIMO (Discord DM + grants@dimo.zone), Hivemapper (MIP-26 Discord).
Awaiting response. WeatherXM, Geodnet, Nodle (bureau-reframe) outreach in progress.
Bureau positioning materials (`PITCH.md`, `OUTREACH_MESSAGES.md`, `NEUTRALITY.md`,
`PRIVACY.md`, `GENESIS_SCORE.md`, `CLIENT_SDK_DESIGN.md`) all shipped and consistent.

---

## Why Now

Three forces converging:

1. **DePIN fraud is becoming public.** Helium's fake-hotspot crisis, Hivemapper's
   GPS spoofing wave, and WeatherXM's hardware-shipping workaround are on-record.
   Networks are actively looking for a neutral verification solution.

2. **The infrastructure exists.** Ed25519, secure enclaves, Cloudflare Workers —
   everything needed to build this would have been impossible at reasonable cost
   five years ago. It is not impossible now.

3. **No competitor.** Search for "DePIN Sybil resistance as a service" or
   "device attestation for DePIN" — nothing comes up. This is a wide-open
   category with a clear structural precedent (credit bureaus) and a clear
   target customer (every DePIN network that pays rewards).

---

## Team

**Eric Guthmann (Kinetik_Rick)** — Founder, sole technical and commercial lead.
Built the entire L1 trust layer (Ed25519 identity, hash-chained heartbeat, public
verifier, partner webhook, 5-network adapter layer) from scratch.
Background: [brief version of your background here — 1–2 sentences].

Hiring plan with first capital: one senior mobile engineer (Android/RN),
one BD hire with DePIN network relationships.

---

## The Ask

**Raising:** $250,000 (pre-seed, safe or equity)

**Use of funds:**
| Line | % | Purpose |
|---|---|---|
| Engineering | 55% | Senior Android/RN engineer, 6 months. Ship `@getkinetik/sdk-react-native`, iOS port, first production partner integration |
| BD + travel | 25% | Close first paying partner. DePIN conferences (Token2049, ETH Denver, Permissionless) |
| Legal + IP | 10% | USPTO trademark Class 9+42, IP assignment formalization, partnership agreements |
| Ops + infra | 10% | Cloudflare Workers paid tier, AWS, tooling |

**Milestones this capital unlocks:**
1. First production partner integration (verified-user premium live on one network)
2. `@getkinetik/verify` published on npm with a real consumer
3. `@getkinetik/sdk-react-native` v1.0 — "Sign in with Kinetik" deep-link flow
4. 1,000 active authenticated nodes
5. First enterprise audit contract or second paying partner → Series A conversation

---

## Exit Thesis

GETKINETIK is a strategic acquisition target for any company that needs neutral
device trust at scale:

- **Payments / risk infrastructure:** Stripe, Plaid, Visa — they are building
  into crypto on-ramps and need identity primitives
- **Credit bureau adjacencies:** Equifax, TransUnion, S&P — DePIN node
  reputation is a new asset class they will eventually want to grade
- **Exchanges:** Coinbase, Kraken — KYC-light verified operator pools are
  valuable for DePIN-adjacent products
- **DePIN foundations / consortiums:** A network or consortium acquires the
  trust layer to lock in the primitive before a competitor does

At 100K+ active authenticated nodes, the database itself is the asset —
irrespective of revenue. Every node is a signed, tamper-evident identity
that no one else has.

---

## Why We Win

We are not building a DePIN aggregator. We are building the thing every
DePIN aggregator, every DePIN network, every DePIN insurer, and every DePIN
lender will eventually need. We win by being **first, neutral, and open** —
the same formula that made Equifax, Carfax, and Stripe indispensable
before anyone realized they were building a category.

The infrastructure is live. The product works. The market is wide open.
We need capital to close the first partnership and publish the SDK.

---

**Contact:** eric@outfromnothingllc.com
**Proof (live demo):** getkinetik.app/verify
**Webhook (test it now):** POST getkinetik.app/api/verify-device
**Code:** github.com/Ricolax310/GetKinetik

*OutFromNothing LLC · GETKINETIK · Pre-Seed Investment Materials · May 2026*
