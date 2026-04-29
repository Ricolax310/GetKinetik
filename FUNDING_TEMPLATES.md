# GETKINETIK — Funding Application Templates

> Three ready-to-use templates for non-dilutive funding: grant applications,
> hackathon submissions, and direct foundation outreach. Replace `[BRACKETS]`
> with the recipient's name + tweak emphasis to match their priorities.
>
> **Strategic note:** every template leads with the live verifier URL —
> proof beats prose. A grant reviewer who clicks `getkinetik.app/verify/`
> sees the math run in their browser within five seconds. That's the
> highest-credibility move we have.

---

## TEMPLATE 1 — Grant Application

> Use for: Optimism RetroPGF, Solana Foundation, Polygon Village, Arbitrum
> DAO, Gitcoin Grants, IoTeX DePIN Grants, Coinbase Ventures Developer
> Grants. Each foundation has slightly different forms — this is the
> reusable content block to paste into their fields.

### Project Name
GETKINETIK

### One-line description
The verified-user identity layer for DePIN — hardware-attested cryptographic proofs that any partner can audit in a browser, eliminating Sybil attacks at the source.

### Project URL
https://getkinetik.app

### Public verifier (proves we ship, not just pitch)
https://getkinetik.app/verify/

### GitHub
https://github.com/Ricolax310/GetKinetik

### Category / type of grant
- Public goods / open infrastructure (the verifier is open and auditable)
- Developer tools / SDK (the kinetik-core package is reusable identity primitive)
- DePIN ecosystem (5 adapters live: Nodle, DIMO, Hivemapper, WeatherXM, Geodnet)
- Anti-Sybil / identity (hardware-attested keypairs in secure enclave)

### Problem we solve
DePIN networks lose 10–30% of their token issuance to Sybil attacks — bots, sock-puppet accounts, fake nodes farming rewards meant for real users. Existing solutions (KYC, captchas, social graph analysis) are either privacy-invasive, low-quality, or expensive to operate.

GETKINETIK provides hardware-attested cryptographic proofs that a real, unique smartphone is generating the data. Keys are sealed in the device's secure enclave (Apple Secure Enclave / Android Keystore) and cannot be extracted, cloned, or faked from a server. Every heartbeat extends a hash chain that proves continuous single-device presence. Every Proof of Origin can be verified by anyone, in any browser, in five seconds, with zero trust required.

### What we've already built (proof of execution)
- **Live Android app** (v1.3.0 publicly released, v1.3.3 in build queue) with Ed25519 keypair generation in hardware-backed secure storage
- **Hash-chained heartbeat log** signing every 60 seconds since first launch
- **Proof of Origin v:2** schema with sensor block (lux, motion RMS, barometric pressure)
- **Public verifier** (`getkinetik.app/verify/`) — vendored cryptography, zero server calls, runs entirely client-side
- **Five DePIN adapter integrations** — Nodle, DIMO, Hivemapper, WeatherXM, Geodnet — reading earnings into a signed local ledger
- **Cloudflare-hosted landing page + waitlist + DIMO OAuth bounce page**
- **CI smoketest** ensuring the app's signing pipeline and the browser verifier never drift apart

All code is in active production use. Nothing in this application is vaporware.

### What we'll build with this grant
[CUSTOMIZE PER FOUNDATION — pick the bullet that matches their priorities]

**For public-goods funders (Optimism RetroPGF, Gitcoin):**
- Open the `kinetik-core` cryptographic identity package as a reusable npm module any DePIN project can consume
- Publish the verifier as an embeddable widget (one `<script>` tag, drop into any partner's docs)
- Write integration guides for the four largest DePIN networks
- Add iOS support (currently Android-only due to Apple sensor restrictions)

**For ecosystem-specific funders (Solana, Polygon, Arbitrum, Base):**
- Deploy a thin smart contract on [their chain] that anchors device public keys on-chain, enabling permissionless Sybil-resistance lookups for any project building on their stack
- Migrate the appropriate DePIN adapter (e.g. Hivemapper for Solana grants, DIMO for Polygon grants, WeatherXM for Base grants) to use the on-chain anchor

**For DePIN-specific funders (IoTeX, Helium Foundation, Coinbase Ventures):**
- Open-source the adapter interface contract so other DePIN aggregators can interoperate
- Build a public dashboard showing fraud reduction metrics across integrated networks

### Why GETKINETIK and not someone else
- **We ship.** Working Android app, live verifier, five integrations — none of this is a roadmap. It's running today.
- **We're cryptographically honest.** Every claim is backed by a verifiable proof. We have no bots, no fake metrics, no vaporware features.
- **We're solo-founded and fast.** No committees, no co-founder approval cycles. Decisions land in code in days, not quarters.
- **Our verifier is intentionally auditable.** We *want* you to inspect the cryptography. The math is the witness.
- **Our messaging is conservative.** We have not promised any token, made any return claims, or quoted any unbacked metrics. That posture matters when grants are on the line.

### Funding ask
$[X] (typical range: $5K–$50K depending on foundation tier)

### Use of funds
- 60% engineering time (founder runway to ship the deliverables above)
- 20% one-time costs (iOS Developer Program, audit prep, smart contract gas if applicable)
- 10% documentation + community (integration guides, developer onboarding)
- 10% legal review (IP cleanup, code-license clarification)

### Timeline
- **Weeks 1–4:** [Core deliverable from "What we'll build" section]
- **Weeks 5–8:** [Secondary deliverable]
- **Weeks 9–12:** Public release, integration guides, post-mortem report

### Team
**Eric (Kinetik_Rick) — Founder / sole developer**
- Built the entire stack solo: cryptographic identity, hash-chained heartbeat log, browser verifier, five DePIN adapters, landing page, waitlist infrastructure, partner OAuth bounces
- Operating under OutFromNothing LLC (Wyoming-incorporated)
- Full-time on GETKINETIK
- Reachable: eric@outfromnothingllc.com · GitHub: @Ricolax310

### Conflicts of interest / prior funding
None. No prior grants, no investor capital, no token presale. This would be the first external funding GETKINETIK has accepted.

### Closing line
Click the verifier URL above. Scan the live Proof of Origin with your phone camera if you want — the QR encodes the same payload. The math runs in your browser in under five seconds. That's what we're building, and that's the proof we're not blowing smoke.

---

## TEMPLATE 2 — Hackathon Submission

> Use for: Solana Breakpoint Hackathon, EthGlobal events, Aptos Code
> Collision, network-specific hackathons. Most hackathons want a short
> pitch + demo URL + repo. This is the reusable content block.

### Project Title
GETKINETIK — Hardware-Attested Identity for DePIN

### Tagline (one sentence)
Stop chasing the work. Let the work compete for you — with cryptographic proof every signed receipt is real.

### Track / Category
- DePIN
- Identity / Sybil resistance
- Public goods
- Mobile / consumer crypto
[Pick whichever the hackathon offers — usually all four apply]

### Demo URL
https://getkinetik.app

### Live Cryptographic Proof (let judges verify in their browser)
https://getkinetik.app/verify/
(Click any link from `node scripts/mint-demo-proof.mjs` — verifies Ed25519 signature, shows sensor block, runs in <5 seconds with zero server calls.)

### GitHub Repo
https://github.com/Ricolax310/GetKinetik

### What it does
GETKINETIK turns any Android phone into a sovereign DePIN node. The phone generates an Ed25519 keypair sealed in its hardware secure enclave on first launch, signs a hash-chained heartbeat every 60 seconds, and aggregates earnings from five DePIN networks (Nodle, DIMO, Hivemapper, WeatherXM, Geodnet) into one cryptographically verifiable local ledger. Every receipt is signed. Every Proof of Origin can be audited by anyone in any browser without trusting us — the math is the witness.

### What problem it solves
DePIN networks lose 10–30% of their token issuance to Sybil attacks. There is currently no industry-standard way to prove "this user is a real human running real hardware on a single device" without invasive KYC. GETKINETIK is that proof, deployed across the entire DePIN ecosystem from one phone-side install.

### What's novel
1. **Hardware attestation in the secure enclave.** Bots running on servers literally cannot produce these signatures. The cryptographic guarantee is rooted in the silicon.
2. **Hash-chained heartbeat log.** Continuous-presence proof that's fork-resistant, locally verifiable, and independent of any blockchain.
3. **Public browser verifier with vendored cryptography.** Auditable in dev tools, runs offline, makes zero network calls. Trust is unnecessary — anyone can verify the math themselves.
4. **Adapter-agnostic earnings ledger.** All five DePIN integrations write to the same signed log via one common interface (`DepinAdapter`). Adding a new network is one package drop.

### Tech Stack
- React Native + Expo (Android-first preview build)
- @noble/ed25519 + @noble/hashes (audited best-in-class cryptography)
- expo-secure-store → Android Keystore (hardware-backed key storage)
- Cloudflare Pages + Functions (landing, verifier, waitlist KV, OAuth bounce)
- TypeScript end-to-end with shared canonical-JSON signing contract between mobile and browser

### What we built during the hackathon
[CUSTOMIZE PER HACKATHON — describe what was added during the event window]

**If submitting an existing project:**
GETKINETIK was already in development before this hackathon. During the event window we shipped:
- [New feature 1, e.g. "Verified-User Premium webhook"]
- [New feature 2, e.g. "Token foundation grant integration for Solana"]
- [New feature 3]

### Demo video / screenshots
[Attach 60-second screen recording showing: open app → mint Proof of Origin → tap share → paste URL into browser → green VALID badge appears with sensor block]

### How to test it yourself in 30 seconds
1. Open https://getkinetik.app/verify/ in any browser
2. Run `node scripts/mint-demo-proof.mjs` (or use the pre-minted URL in our README)
3. Paste the resulting URL into the verifier
4. Watch the math run client-side, zero server calls, green VALID badge

### Team
**Eric (Kinetik_Rick)** — Solo founder, full-stack developer
- Built the entire project (mobile app, browser verifier, landing site, all five adapters)
- OutFromNothing LLC, Wyoming
- eric@outfromnothingllc.com · @Ricolax310

### Why we deserve to win
- We ship working code, not pitch decks
- Our cryptographic primitive is novel and auditable in real-time
- We've integrated five separate DePIN networks already — most hackathon projects integrate zero
- We're solo-founded and indie — every dollar of prize money goes directly into more building, not into VC pockets

---

## TEMPLATE 3 — Direct Foundation Outreach

> Use for: emailing DePIN network foundations directly (Helium Foundation,
> DIMO Foundation, Hivemapper Foundation, WeatherXM Foundation, etc.)
> asking for builder-grants from their discretionary funds. These are
> usually 1-on-1 conversations, not formal applications.

### Subject
GETKINETIK × [Network Name] — builder grant request, $[X]K

### Body

Hi [Name / Foundation team],

I'm Eric, building **GETKINETIK** — a hardware-attested identity layer for DePIN at `getkinetik.app`. We've integrated [Network Name] into our v1.3 Android build and are reading [their token, e.g. NODL / $DIMO / HONEY / WXM / GEOD] balances into a signed local earnings ledger. Adapter is ~[N] lines of TypeScript and plays nice with your public APIs.

The reason I'm reaching out: we're requesting a **$[X]K builder grant** from your foundation's discretionary fund to deepen the [Network Name] integration over the next 90 days.

Don't take my word for any of this — here's a live signed Proof of Origin from one of our nodes, browser-verifiable in five seconds with zero server calls:

`https://getkinetik.app/verify/#proof=...` (full URL on request)

**What the grant funds:**
1. Deeper [Network Name] integration — [specific deliverable: e.g. "active polling of HONEY rewards every 6 hours" / "DIMO vehicle-event subscription via webhook"]
2. Documentation showing other [Network Name] users how to plug GETKINETIK in alongside their existing setup
3. Co-marketing materials — case study, "Verified by [Network Name]" badge, joint blog post

**Why this is good for [Network Name]:**
- Every [Network Name] node connecting through GETKINETIK is hardware-attested — provably a real device, not a script. That's a Sybil-resistance signal you'd otherwise have to build yourself.
- We surface [Network Name] to a cross-DePIN audience that may not know about you yet (we have integrations with four other networks, so users discover [Network Name] through us).
- The integration is fully read-only on your side. No SDK changes. No infrastructure burden. We just consume your existing public APIs more thoughtfully than the average dashboard.

**Who I am:**
Eric (Kinetik_Rick), solo founder, OutFromNothing LLC. Built the entire stack myself — cryptographic identity layer, browser verifier, five DePIN adapters, landing site. No VC funding, no token presale, no co-founders. Indie crypto-native operator who ships.

A 15-minute call if it makes sense, or feel free to send the request to whoever handles builder grants on your end. Adapter source available on request.

Eric (Kinetik_Rick)
eric@outfromnothingllc.com
`getkinetik.app` · GitHub: @Ricolax310

---

## QUICK REFERENCE — Where to send what

| Foundation / Source | Best template | Realistic ask | Application URL |
|---|---|---|---|
| Optimism RetroPGF | #1 (public goods angle) | $10K–$100K | retropgf.optimism.io |
| Solana Foundation | #1 (Solana-chain angle) | $5K–$250K | solana.com/grants |
| Polygon Village | #1 (Polygon-chain angle) | $5K–$100K | polygon.technology/grants |
| Arbitrum DAO Grants | #1 | $5K–$200K | arbitrum.foundation/grants |
| Gitcoin Grants | #1 (open-source angle) | $1K–$50K | grants.gitcoin.co |
| IoTeX DePIN Grants | #1 (DePIN angle) | $5K–$50K | iotex.io/grants |
| Coinbase Ventures Dev Grants | #1 (Base/exchange angle) | $10K–$100K | Direct corp-dev outreach |
| Helium Foundation | #3 | $5K–$25K | foundation.helium.com |
| DIMO Foundation | #3 | $5K–$25K | dimo.zone/dao |
| Hivemapper Foundation | #3 | $5K–$25K | hivemapper.com (DM team) |
| WeatherXM Foundation | #3 | $5K–$25K | weatherxm.com (DM team) |
| Geodnet (no formal foundation) | #3 | $5K–$15K | info@geodnet.com |
| Solana Breakpoint Hackathon | #2 | $5K–$50K | solana.com/breakpoint |
| EthGlobal hackathons | #2 | $1K–$25K per track | ethglobal.com |
| Aptos Code Collision | #2 | $5K–$50K | aptosfoundation.org |

---

## STRATEGIC NOTES

**Apply in parallel, not sequentially.** Every grant takes 2–8 weeks to evaluate. Don't apply to one and wait — apply to 5–7 in the same week.

**One foundation says yes ≠ everyone says yes.** Even strong projects get rejected. Aim for 5–10 applications to land 1–3 yes responses.

**Don't reveal grant size in initial outreach.** Let them tell you their normal range. Asking for $50K when their max is $25K just makes you look unprepared.

**Track everything in a simple spreadsheet:** foundation name, contact, date applied, amount asked, status, follow-up date. After two months you'll start to see patterns in who's responsive.

**Follow up once at the 3-week mark.** Two follow-ups feel pushy. One is professional.

**The verifier URL is your secret weapon.** Lead with it. Most applicants pitch with text; we pitch with cryptographic proof a reviewer can run in their browser. That's a 10x credibility differential.
