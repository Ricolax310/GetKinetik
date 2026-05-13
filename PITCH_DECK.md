# GETKINETIK — Pitch Deck Script
# 10 Slides · Pre-Seed · May 2026

> Use this as your script when building slides in Canva, Pitch, or Google Slides.
> Design note: dark background (#0A0A0A obsidian), ruby red (#FF1430) accents,
> platinum white text. Same palette as the app. One idea per slide. No walls of text.

---

## SLIDE 1 — Cover

**Visual:** The ruby gemstone from the app. Centered. No other decoration.

**Text:**
```
GETKINETIK
The Independent Trust Layer for DePIN

Eric Guthmann (Kinetik_Rick)
eric@outfromnothingllc.com
getkinetik.app
```

**Speaker note:** Say nothing. Let the gem speak. Move on.

---

## SLIDE 2 — The Problem (30 seconds)

**Visual:** Three logos side by side — Helium, Hivemapper, WeatherXM.
Below each: one devastating fact.

```
HELIUM          HIVEMAPPER        WEATHERXM
$250M+          GPS spoofers      Shipped physical
lost to         undermining       hardware just to
fake hotspots   map quality       verify devices
```

**Headline:**
> "Every DePIN network pays rewards it cannot verify."

**Speaker note:** These aren't edge cases. Fake nodes are the business model
for a subset of every DePIN operator base. The networks know it. They can't
fix it. A bank can't grade its own borrowers. A car company can't rate its own
cars. The grader has to be independent.

---

## SLIDE 3 — The Insight

**Visual:** Two columns. Left: what DePIN networks do. Right: what bureaus do.

```
DePIN NETWORKS               CREDIT BUREAUS
Grade their own users   →    Cannot — conflict of interest
No neutral third party  →    Equifax, Experian, TransUnion
Fraud bleeds rewards    →    Fraud triggers bureau flags
Each network starts over →   One bureau serves every lender
```

**Headline:**
> "DePIN needs its Equifax. We are building it."

**Speaker note:** Equifax doesn't care which bank you borrow from. Carfax
doesn't care which dealer sold the car. We don't care which network the node
is on. That neutrality is the product.

---

## SLIDE 4 — The Solution

**Visual:** Phone showing the GETKINETIK app — the Proof of Origin card,
the QR code, and the VERIFIED seal on getkinetik.app/verify.

**Headline:**
> "One signed certificate. Verifiable by anyone. In any browser. No account."

**Three bullets:**
```
→  Hardware-sealed Ed25519 identity — sealed in the phone's secure enclave
→  Hash-chained uptime log — tamper-evident, growing with every heartbeat
→  Proof of Origin — scan a QR, get cryptographic VALID or INVALID in seconds
```

**Speaker note:** Every GETKINETIK user already has this. 289+ heartbeats
on chain on my own device right now. The product is not a wireframe.

---

## SLIDE 5 — The Partner API (The Revenue Motion)

**Visual:** Code block, white on dark background. Clean. Nothing else.

```
POST https://getkinetik.app/api/verify-device
Content-Type: application/json
{ "proofUrl": "<user's proof URL>" }

→ { "valid": true, "nodeId": "KINETIK-NODE-A3F2B719",
    "pubkey": "a3f2b719...", "mintedAt": 1714000000000 }
```

**Below the code block:**
```
No auth required.  No SDK dependency.  Test it right now.
```

**Speaker note:** This is the monetization path. Partners call this before
paying rewards. If valid — pay. If invalid — investigate. One call. Works
from any backend. Free during preview. Paid at production volume.

---

## SLIDE 6 — Traction

**Visual:** Two-column grid. Left: what's built. Right: proof it's real.

```
BUILT                          PROOF IT'S REAL
────────────────────────────────────────────────────────
Android app v1.4.0             Sideload APK on GitHub now
Ed25519 sovereign identity     External iPhone verified QR → VALID
289+ heartbeats on chain       Hash-chained, tamper-evident
5 DePIN adapters               Nodle, DIMO, Hivemapper, WeatherXM, Geodnet
Partner webhook live           getkinetik.app/api/verify-device
@getkinetik/verify npm package    27/27 smoketests passing
DIMO OAuth wired               Login with DIMO working
Public verifier                getkinetik.app/verify — no server, pure math
```

**Speaker note:** Rung 3 is confirmed — an external human on a separate device
verified a proof minted on my phone. That's the first wild-hardware validation.
This is not a prototype. The infrastructure is live.

---

## SLIDE 7 — Market

**Visual:** Three concentric circles (TAM/SAM/SOM style). Keep it simple.

```
TAM:  $12B+ credit bureau industry
      (device trust is a new asset class within it)

SAM:  ~$500M/yr in DePIN reward distributions
      (networks that pay rewards need verification)

SOM:  5 networks integrated, outreach sent to DIMO + Hivemapper
      First paying partner = proof of concept for the category
```

**Headline:**
> "No competitor. Wide-open category. Clear structural precedent."

**Speaker note:** Search for "DePIN Sybil resistance as a service."
Nothing comes up. We are the category. The comparable is Chainlink —
they solved price trust, $10B market cap. We solve device trust.
The category does not exist yet.

---

## SLIDE 8 — Business Model

**Visual:** Simple three-row table.

```
REVENUE LINE              WHO PAYS                    SHAPE
──────────────────────────────────────────────────────────────────
Partner Verification API  DePIN networks, exchanges   Per-call / monthly
Consumer Pro              Node operators              Monthly subscription
Enterprise Audit          Foundations, regulators     Annual contract
```

**Below the table:**
> "All revenue in USD or USDC. No token. No swap fees. No take-rate."

**Speaker note:** We don't compete with the networks we grade. We don't
touch their token. We charge for verification, not for being in the ecosystem.
That's why the neutrality holds — there's no financial incentive to grade
anyone differently.

---

## SLIDE 9 — The Ask

**Visual:** Clean. Numbers only. Dark slide.

```
RAISING: $250,000 (pre-seed, SAFE or equity)

USE OF FUNDS
────────────────────────────────────
55%  Engineering        Senior Android/RN engineer, 6 months
25%  BD + conferences   Token2049, ETH Denver, Permissionless
10%  Legal + IP         USPTO trademark, partnership agreements
10%  Ops + infra        Cloudflare paid tier, tooling

MILESTONES
────────────────────────────────────
→  First production partner integration (verified-user premium live)
→  @getkinetik/verify published on npm with a real consumer
→  1,000 active authenticated nodes
→  Series A conversation
```

---

## SLIDE 10 — Why Us / Close

**Visual:** Single quote, large, centered. Ruby red accent line above it.

> *"The grader must be independent. The infrastructure is live. The market is wide open. We are first."*

**Below:**
```
Test the webhook now:
POST getkinetik.app/api/verify-device

Download the app:
github.com/Ricolax310/GetKinetik/releases/latest

Eric Guthmann (Kinetik_Rick)
eric@outfromnothingllc.com
getkinetik.app
```

**Speaker note:** I'm going to give you a proof URL right now.
Open your browser. Go to getkinetik.app/verify. Paste the URL.
You'll see VALID in three seconds. That's the product. That's the infrastructure.
That's what $250K turns into the first paying partner.

---

## DESIGN NOTES FOR SLIDE BUILDER

- **Font:** Courier or any monospace for all data / code. Clean sans-serif for headlines.
- **Colors:**
  - Background: `#0A0A0A` (obsidian black)
  - Headline text: `#E6E8EC` (platinum white)
  - Accent / highlights: `#FF1430` (ruby red)
  - Data labels: `#6A6C72` (graphite)
- **Images to get:**
  - Screenshot of the app (PROOF card open, QR visible)
  - Screenshot of getkinetik.app/verify showing VERIFIED seal
  - Screenshot of the terminal / curl showing API response
  - The ruby gem (extract from app screenshot or use icon.png)
- **One idea per slide.** If you're adding a third bullet to a slide, you're adding a second slide.
- **No animations.** The product is serious infrastructure. Animate nothing.

---

*OutFromNothing LLC · GETKINETIK · Pitch Deck Script · Pre-Seed · May 2026*
