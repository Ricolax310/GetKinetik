# GETKINETIK — DePIN Partner Outreach Templates

> **v3 — April 2026.** Pivoted away from generic "DePIN aggregator"
> framing toward partner-side trust-layer value. Each email now leads with a
> live, signed Proof-of-Origin URL — anyone can click, verify cryptographically
> in their browser, and immediately see we ship receipts not pitches. That's
> the highest-credibility move we have.
>
> **The one-line pitch that works with crypto-native partners:**
> "Yearn Finance optimized DeFi yields — we do the same for the physical
> layer. Your hardware's signed attestations route to whoever's paying most
> this hour." Use this when you have 15 seconds or a Twitter DM. Don't
> paste it verbatim into a cold email — it's for conversations, not
> openers.
>
> **Replace `[NAME]` before sending.** The five templates each lead with a
> different angle — DePINs don't all benefit from the same value prop.
> Do not send the generic version; recipients can tell instantly.
>
> **Send from:** `eric@outfromnothingllc.com` (company domain — better
> deliverability + signals legitimacy over a personal address).
> **CC:** no one. Keep replies one-on-one.
>
> **Format hygiene:** Gmail dark mode poisons pasted markdown into white-on-
> black on the recipient's side. Before sending, paste the template through
> **Notepad first**, then copy out of Notepad into Gmail's compose. That
> strips the formatting bytes. (We learned this the hard way last week.)

---

## The shared receipt link

Every template below links to the same demonstration Proof-of-Origin. It
points at the live verifier on `getkinetik.app/verify/`. The URL fragment
holds a self-contained signed artifact — the verifier never phones home,
never persists anything, and runs the four-check Ed25519 contract entirely
in the recipient's browser:

```
https://getkinetik.app/verify/#proof=eyJwYXlsb2FkIjp7InYiOjIsImtpbmQiOiJwcm9vZi1vZi1vcmlnaW4iLCJub2RlSWQiOiJLSU5FVElLLU5PREUtMTBCOTMwOTkiLCJwdWJrZXkiOiI5MjM2NTBkOWRkZDFhNWU4OGU0OGI4NTY3ZWQzNjJjYmY3ZWNjYjcyNjc1NDllM2NiYzljMmMwMGU0YWU2NWI5IiwibWludGVkQXQiOjE3NzY2MzMzNjgxNTQsImlzc3VlZEF0IjoxNzc3NDEwOTY4MTU0LCJsaWZldGltZUJlYXRzIjoyNTg0NywiZmlyc3RCZWF0VHMiOjE3NzY2MzMzNzMxNTQsImNoYWluVGlwIjoiMWE1NmViNWQyOTgwODY4NSIsImF0dHJpYnV0aW9uIjoiR0VUS0lORVRJSyBieSBPdXRGcm9tTm90aGluZyBMTEMiLCJzZW5zb3JzIjp7Imx1eCI6NDEyLCJtb3Rpb25SbXMiOjAuMDYsInByZXNzdXJlSHBhIjoxMDE0LjA3fX0sInNpZ25hdHVyZSI6IjFkYzhkNTRkOGVmOTQ4ZjkwZjg0MTcyYzJjMGRjNWYwNmFiZDdiZGYzNjQ0MDI4NWFiNmFmZDE4ZWE5MmFjMWQ3ODNkYjY2YzM3NzliY2Y4NGFiNjcwNmY2MDI2OGViOGMzNzVhYjk2ZTUwODE2ZGYyODE2ZDRjMmMwZTQ3NDA2In0
```

What the recipient sees on click:
- A v:2 Proof of Origin (`KINETIK-NODE-10B93099`)
- 9 days of signed uptime, 25,847 hash-chained beats
- A real sensor block (lux / motionRms / pressureHpa)
- A green VALID badge confirming the Ed25519 signature checks out

To regenerate the URL (e.g. with fresher timestamps):

```powershell
node scripts/mint-demo-proof.mjs
```

---

## 1. Nodle  ·  *Force Multiplier*

**To:** `partnerships@nodle.com`
**Subject:** GETKINETIK × Nodle — hardware-attested identity for every Nodle node

---

Hi Nodle team,

I'm Eric, building **GETKINETIK** — a sovereign identity layer for DePIN phones, live on Android at `getkinetik.app`. Every device generates a hardware-backed Ed25519 keypair on first unlock, signs a hash-chained heartbeat log, and emits **Proof-of-Origin cards** any third party can verify in a browser without trusting us.

The reason I'm reaching out specifically: every Nodle node running through GETKINETIK has a hardware-attested identity, so your enterprise data customers can verify it didn't come from a script. That's a force multiplier on what you already do — same network, same BLE coverage, but each contributing device now ships with a cryptographic provenance trail.

Don't take my word for it — here's a live signed proof from one of my nodes (browser verifier, no install, no signup):

`https://getkinetik.app/verify/#proof=...` (full URL above)

A few quick questions:
1. Is there a developer program or partnership track for adding hardware attestation to nodes that opt in?
2. Would Nodle be open to being listed as a featured integration on `getkinetik.app`? Nodle is the first adapter we built.
3. Any interest in a 15-minute call to walk through the L1 trust contract?

Eric (Kinetik_Rick)
`getkinetik.app`

---

## 2. DIMO  ·  *Already Wired In*

**To:** `partnerships@dimo.zone`
**Subject:** GETKINETIK × DIMO — Login With DIMO is live, exploring a featured-integration slot

---

Hi DIMO team,

I'm Eric, building **GETKINETIK** at `getkinetik.app`. We provide a hardware-backed identity and Proof-of-Origin layer for DePIN phones — every node owns an Ed25519 keypair in keystore, signs a hash-chained heartbeat log, and emits artifacts any browser can verify against the open verifier we host.

**DIMO is already wired into the live build.** As of v1.3 we have:
- Login With DIMO via `expo-web-browser` against `login.dimo.org`
- Developer License #986 registered against our `eric@outfromnothingllc.com`
- HTTPS bounce-page redirect (`getkinetik.app/dimo-callback`) — added to the License's authorized URIs today
- On-chain `$DIMO` balance reads against the Polygon contract via public RPC, signed into our local earnings ledger as Ed25519 receipts. No custody, no token movement — just signed deltas the user can audit.

Here's a live Proof-of-Origin from one of our nodes; opens the browser verifier directly, no install:

`https://getkinetik.app/verify/#proof=...` (full URL above)

Two asks:
1. Could GETKINETIK be considered for a featured-integration listing in DIMO ecosystem materials?
2. Is there a partnerships engineer I could send a clean technical brief to (~1 page, no fluff)?

Adapter is ~250 lines of TypeScript and I'm happy to share the source.

Eric (Kinetik_Rick)
`getkinetik.app`

---

## 3. Hivemapper  ·  *Phone-Side Provenance*

**To:** `partnerships@hivemapper.com`
**Subject:** GETKINETIK × Hivemapper — phone-side identity attestation for HONEY recipients

---

Hi Hivemapper team,

I'm Eric, building **GETKINETIK** (`getkinetik.app`) — a hardware-backed identity and Proof-of-Origin layer for DePIN phones. Every device runs a sovereign Ed25519 keypair in keystore, signs a hash-chained heartbeat log, and ships artifacts any third party can independently verify.

I'm not pitching a dashcam replacement — Bee and Hivemapper One own that surface and own it well. Where we may be useful: the **identity side** of the recipient. Every wallet that pulls HONEY rewards is currently just an address — there's no trustless way to tell whether it belongs to a real human running real hardware. We provide that proof. A user signs in via GETKINETIK, links their Solana address, and any third party (you, an exchange, a partner) can verify the address is bound to a real, hash-chained, sensor-emitting node.

Live signed proof from one of our nodes (browser verifier, runs entirely client-side):

`https://getkinetik.app/verify/#proof=...` (full URL above)

Two questions, low-stakes:
1. Is there an official channel or developer program for third-party apps reading a user's HONEY rewards balance via Solana RPC?
2. Would Hivemapper be open to GETKINETIK being listed as a Hivemapper-compatible partner once we ship the adapter to public users?

No SDK changes required on your end. The integration is fully read-only.

Eric (Kinetik_Rick)
`getkinetik.app`

---

## 4. WeatherXM  ·  *Provenance for Station Owners*

**To:** `partner@weatherxm.com`
**Subject:** GETKINETIK × WeatherXM — cryptographic receipts for WXM rewards

---

Hi WeatherXM team,

I'm Eric, building **GETKINETIK** at `getkinetik.app`. We're a hardware-backed identity layer for DePIN phones — every node has an Ed25519 keypair in keystore, signs a hash-chained heartbeat log, and emits Proof-of-Origin artifacts that any third party can verify in a browser.

WeatherXM stood out to me because the WXM token model is one of the cleanest in DePIN — `balanceOf()` on Base is all we need to record a station owner's rewards. Where GETKINETIK adds value to your side: **provenance**. Today, when a WXM data buyer (insurer, agtech, etc.) wants to know "is this station owner a real entity," there's no cryptographic answer. We provide one — the station owner's earnings receipts are signed by a hardware-attested identity, not just a wallet address.

Here's a live signed proof from one of our nodes; opens the verifier directly, runs entirely in the browser:

`https://getkinetik.app/verify/#proof=...` (full URL above)

Two questions:
1. Is there a policy issue with a third-party app reading WXM balances on behalf of an opted-in user?
2. Would WeatherXM be open to a featured-partner slot? We're targeting DePIN-native users who run multiple networks at once and want one signed source of truth across all of them.

Eric (Kinetik_Rick)
`getkinetik.app`

---

## 5. Geodnet  ·  *Mobile-Side Identity Adjacency*

**To:** `info@geodnet.com`
**Subject:** GETKINETIK × Geodnet — signed earning receipts for GEOD recipients

---

Hi Geodnet team,

I'm Eric, building **GETKINETIK** (`getkinetik.app`) — a sovereign identity and Proof-of-Origin layer for DePIN phones. Every node runs a hardware-backed Ed25519 keypair, signs a hash-chained heartbeat log, and emits artifacts any third party can independently verify in a browser.

I'm not trying to displace your fixed-station hardware — your network is the GNSS correction layer and that's not a phone-side game. What we **can** add: phone-side identity for the people who own those stations. Every Geodnet node owner can connect their address through GETKINETIK, get a cryptographic receipt for every GEOD reward event, and prove (without a centralized database) the wallet pulling rewards is bound to a real human running real hardware.

Live signed proof from one of our nodes, browser-verifiable:

`https://getkinetik.app/verify/#proof=...` (full URL above)

Two questions:
1. Is there an API or on-chain endpoint we can use to read GEOD rewards by node ID or recipient address?
2. Is there a business-development contact for ecosystem-partnership conversations?

Eric (Kinetik_Rick)
`getkinetik.app`

---

## Sending order + status (April–May 2026)

| Partner | Status | Next action |
|---|---|---|
| **Nodle** | Sent (pre-verify-URL version) | Send v3 refresh with verify link; 5-day follow-up timer starts on send |
| **DIMO** | Discord DM + public `#build-on-dimo` post done; email sent to `partnerships@dimo.zone` | 5-day follow-up if no reply |
| **Hivemapper** | Auto-triage reply received ("high ticket volume, Bee hardware FAQ") — counts as acknowledged, not a real read | 5-day follow-up from auto-triage date |
| **WeatherXM** | Partner intake form submitted + email sent to `partner@weatherxm.com` | 7-day follow-up (they said "high volume") |
| **Geodnet** | Discord builder post + email sent to `info@geodnet.com` | 5-day follow-up if no reply |

---

## Follow-up template (5 business days, no reply)

**Subject:** Re: GETKINETIK × [Name] — quick bump

---

Hi [Name],

Bumping in case the original thread got buried. The fastest way to evaluate what we're doing is to click the verifier link below — it's a live signed Proof of Origin from one of our nodes, runs entirely in your browser, and takes about three seconds:

`https://getkinetik.app/verify/#proof=...` (full URL above)

If a 15-minute call makes sense, I'm easy to find at `eric@outfromnothingllc.com`. If it doesn't, no offense taken — just point me to the right person if you can.

Eric (Kinetik_Rick)
`getkinetik.app`

---

## Things this template set deliberately does NOT do

- **No fabricated metrics** ("20%+ fraud reduction" etc.). If we don't have data, we don't quote a number. Partner technical leads notice instantly when a number isn't backed by a study.
- **No vaporware features** ("Brand Attestor anchoring", token mechanics, etc.). The Brand Attestor is on the L1 roadmap but not built — pitching it as live would unravel in 30 seconds of follow-up.
- **No raw `STATUS.md` attachments**. That document is internal — has private TODOs, brand decisions, and roadmap trade-offs not meant for partners. If a partner asks for technical depth, we write a fresh one-pager for them.
- **No deck**. The verifier URL replaces the deck. If they want one after they click, we'll write one.
