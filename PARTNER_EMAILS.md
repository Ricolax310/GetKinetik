# GETKINETIK — DePIN Partner Outreach Templates

> Personalize the `[NAME]` fields before sending. Each email has a different angle
> because each DePIN has a different value prop. Do not send the generic version —
> they can tell.
>
> Send from: your personal email with a clear name + link to getkinetik.app
> CC: no one. Keep it short. The goal is a reply, not a proposal deck.

---

## 1. DIMO

**To:** `partnerships@dimo.zone`
**Subject:** GETKINETIK × DIMO — Signed Earnings Aggregator

---

Hi DIMO team,

I'm building GETKINETIK — a sovereign identity layer for DePIN phones. Every device running GETKINETIK generates a hardware-backed Ed25519 keypair, signs a hash-chained uptime log, and can aggregate earnings from multiple DePIN networks into one verifiable ledger. Think Plaid, but for DePIN.

DIMO is our second integration (Nodle is first). The mechanics: we drive "Login with DIMO" via `expo-web-browser`, grab the user's Polygon wallet address, read their weekly $DIMO balance via `eth_call`, and record delta-earnings as signed Ed25519 entries in a local ledger. No custody, no token movement — we sign receipts. The 1% protocol fee is baked into every signature so it's publicly auditable.

Two things I'd love from you: (1) a DIMO Developer License for GETKINETIK so the consent screen shows our name instead of "unknown app," and (2) a conversation about whether DIMO wants to be listed as a featured integration in our launch materials.

Public verifier (what every earning entry looks like after signing): getkinetik.app/verify

Happy to share the adapter code — it's clean, ~200 lines, TypeScript.

Eric
getkinetik.app

---

## 2. Hivemapper

**To:** `partnerships@hivemapper.com`
**Subject:** GETKINETIK × Hivemapper — One Signed Ledger for All DePIN Earnings

---

Hi Hivemapper team,

I'm building GETKINETIK — a sovereign phone identity layer with a signed earnings aggregator. Every user has an Ed25519 keypair, a hash-chained uptime proof, and a wallet ledger that records DePIN earnings with cryptographic receipts. The pitch: one app, many DePIN networks, one place to audit what you earned and prove you earned it.

Hivemapper is on my short list of integrations. The angle with your dashcam network: HONEY rewards flow to the user's Solana address, and GETKINETIK can read that balance via public Solana RPC and sign it into our ledger — zero custody, just receipts. The user's device identity is already there (our Ed25519 key can be encoded as a Solana-compatible address). No SDK required, no app changes on your end.

What I'd like to understand: is there an official developer program or any restrictions on third-party apps reading a user's HONEY rewards balance? And is there interest in having GETKINETIK listed as a Hivemapper ecosystem partner?

Public verifier showing what our signed receipts look like: getkinetik.app/verify

Eric
getkinetik.app

---

## 3. WeatherXM

**To:** `info@weatherxm.com` (or `bd@weatherxm.com` if available)
**Subject:** GETKINETIK × WeatherXM — Aggregating DePIN Earnings, Starting with WXM

---

Hi WeatherXM team,

I'm building GETKINETIK, a sovereign identity and DePIN earnings aggregator for mobile. Every device signs a hash-chained uptime log (hardware-backed Ed25519) and can record DePIN earnings across networks into a tamper-evident local ledger with a 1% protocol fee baked into every signature.

WeatherXM is interesting to me because your reward model (WXM per station per week, based on data quality) is clean and queryable — the WXM token lives on Base and Arbitrum, so `balanceOf()` is all we need to read a station owner's earnings and record them in our ledger. No custody, no app changes required from you.

I'm reaching out because: (1) I want to make sure there's no policy issue with a third-party aggregator reading WXM balances on behalf of a user who's explicitly opted in, and (2) I'd love to explore whether WeatherXM wants to be a featured partner in our launch — we're targeting DePIN-native users who run multiple networks simultaneously and want one signed record of everything they've earned.

See the public verifier at getkinetik.app/verify — that's what a signed earning receipt looks like.

Eric
getkinetik.app

---

## 4. Geodnet

**To:** `info@geodnet.com`
**Subject:** GETKINETIK × Geodnet — Mobile Identity Layer + Signed Earnings Aggregator

---

Hi Geodnet team,

I'm building GETKINETIK — a sovereign identity platform for DePIN devices, starting with phones and expanding to fixed stations. The core idea: every node gets an Ed25519 keypair, a hash-chained uptime proof that anyone can verify, and a signed earnings ledger that records what each DePIN network paid and when. Plaid-style aggregation, but for DePIN.

Geodnet is on my radar because your GEOD token rewards structure (based on GNSS correction quality and uptime) is exactly the kind of data GETKINETIK can aggregate. The user connects their Geodnet node ID, we read their GEOD balance via your API or on-chain, and we sign a receipt into their GETKINETIK ledger. They get a verifiable record of every earning event across every network they participate in.

Questions: Does Geodnet have an API for querying node rewards by address or node ID? And is there a business development or partnerships contact I should loop in for a more formal conversation about integration?

getkinetik.app/verify — public verifier, shows what our signed receipts look like.

Eric
getkinetik.app

---

## Sending Order

Send these in this sequence (most partner-friendly first):

1. **DIMO** — today. They have a developer program, a developer console, and are actively recruiting integrations. The ask is concrete (Developer License). Fastest path to "yes."
2. **Nodle** — already sent. Awaiting reply.
3. **Hivemapper** — this week. No hard dependency on their reply to ship the adapter.
4. **WeatherXM** — this week. Clean token model, easy integration.
5. **Geodnet** — this week. More niche, good for demonstrating breadth.

---

## Follow-up template (if no reply after 5 business days)

**Subject:** Re: GETKINETIK × [Name] — Quick follow-up

Hi [Name],

Bumping this in case it got buried. Happy to share the adapter code directly — it's ~200 lines of TypeScript, public repo. The ask is just a conversation about being listed as a featured integration.

Eric
