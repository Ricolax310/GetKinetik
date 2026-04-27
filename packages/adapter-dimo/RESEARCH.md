# DIMO Adapter — Research (Session E)

> **Date:** 2026-04-26
> **Researcher:** AI agent (automated web research, DIMO developer docs, DIMO GitHub)
> **Template:** Same 5 questions used for `packages/adapter-nodle/RESEARCH.md`

---

## Q1 — Does DIMO expose a third-party SDK that can run inside a non-DIMO app?

**Yes, and it is pure TypeScript/REST — no native bridge required.**

DIMO publishes an official TypeScript data SDK:

```
npm install @dimo-network/data-sdk
```

GitHub: `DIMO-Network/data-sdk`
License: Apache-2.0 (confirmed — permissive, no EULA gating)

The SDK wraps DIMO's REST and GraphQL APIs. It runs in any JS environment (Node, browser, React Native). There is no native Android or iOS SDK, no BLE scanning, no SDK embed. The entire integration is over HTTPS:

- **Identity API** — GraphQL — `https://identity-api.dimo.zone/query` — public, no auth for balance queries
- **Telemetry API** — GraphQL — `https://telemetry-api.dimo.zone/query` — requires Vehicle JWT
- **Token Exchange API** — REST — `https://token-exchange-api.dimo.zone/v1/tokens/exchange` — requires Developer JWT
- **Rewards contract** — Polygon EVM — readable via standard ERC-20 `balanceOf()`, no SDK needed

For GETKINETIK, we only need `balanceOf()` on the Polygon Rewards contract to read earnings. No SDK install required for the core use case; the SDK would only be needed if we wanted to read vehicle telemetry (not in scope for v0).

---

## Q2 — License terms, attribution, identity model

**License:** Apache-2.0. No attribution requirement in product UI, no EULA, no publisher agreement. Developer registration is free via DIMO Console (`console.dimo.org`). Requires a "Developer License" — a lightweight on-chain registration that takes ~5 minutes and costs nothing today (DIMO covers gas via their paymaster on Polygon).

**Identity model:**
- User has a **DIMO account** with an EVM wallet (Polygon mainnet). This wallet owns their Vehicle NFT(s).
- Developer gets a `client_id` and `api_key` from DIMO Console.
- Auth flow: **"Login with DIMO"** — an OAuth2-like popup/redirect that delivers a short-lived JWT containing `walletAddress`, `email`, and vehicle permissions.
- Vehicle data requires a **Vehicle JWT** (exchanged via Token Exchange API using the user's permission grant).

**Critical difference from Nodle:**
DIMO is *vehicle-data monetization*, not *phone-as-a-node*. GETKINETIK cannot make a phone earn DIMO without the user already having a DIMO account and a connected vehicle. The DIMO adapter is an **earnings reader** (aggregates what DIMO already pays) rather than an earnings generator (like Nodle, where GETKINETIK initiates the earning).

This is fine — it's still the Plaid pattern. Plaid doesn't generate bank deposits; it reads them. The DIMO adapter reads DIMO deposits and records them in the GETKINETIK signed earnings ledger.

---

## Q3 — Deep-link / hand-off flow

**Yes — "Login with DIMO" is exactly this.**

DIMO provides `@dimo-network/login-with-dimo` (React component SDK) for web/React, and their OAuth flow works in any browser window, including WebView / expo-web-browser on mobile. The flow:

1. GETKINETIK opens `accounts.dimo.org` (or uses the SDK) in a popup/browser tab
2. User authenticates with their DIMO credentials (email + wallet)
3. On success, DIMO returns: `{ isAuthenticated, walletAddress, getValidJWT() }`
4. GETKINETIK extracts `walletAddress` (Polygon address) and stores it
5. GETKINETIK can now query that address's $DIMO balance on Polygon — no Vehicle JWT needed for balance-only

For v0 (earnings-only, no telemetry), GETKINETIK uses `expo-web-browser` to drive the "Login with DIMO" redirect, grabs `walletAddress` from the callback, and then reads the on-chain $DIMO balance directly. No `@dimo-network/data-sdk` install required.

---

## Q4 — Public API for querying DIMO earnings by address (no auth)

**Yes — two options, both auth-free for balance queries:**

### Option A: Polygon ERC-20 `balanceOf()` (preferred for v0)
$DIMO is an ERC-20 token on Polygon. The token contract address:
```
0xE261D618a959aFfFd53168Cd07D12E37B26761db
```
Standard `eth_call` against any public Polygon RPC reads the balance with zero auth:
```
POST https://polygon-rpc.com/
{
  "jsonrpc": "2.0", "method": "eth_call",
  "params": [{ "to": "0xE261D618a959aFfFd53168Cd07D12E37B26761db",
               "data": "0x70a08231000000000000000000000000<walletAddress>" }, "latest"],
  "id": 1
}
```
Returns hex-encoded balance. $DIMO has 18 decimal places.

### Option B: DIMO Identity API (GraphQL, public, no auth)
```graphql
# https://identity-api.dimo.zone/query
query Vehicles($wallet: Address!) {
  vehicles(filterBy: { owner: $wallet }, first: 10) {
    nodes { tokenId, definition { make, model, year } }
  }
}
```
This surfaces what vehicles the user has, which can be used to display DIMO context in the UI (e.g., "2021 Tesla Model 3"). Useful for the adapter card — not needed for earnings.

### Earnings reward contract (on-chain, Polygon)
Weekly $DIMO distributions go to the user's Polygon wallet via a batch transfer from the rewards contract. `balanceOf()` on the ERC-20 captures accumulated balance. There is no "pending unclaimed" concept — rewards are auto-transferred weekly by the DIMO protocol.

**Conclusion:** `pollEarnings()` = `balanceOf(walletAddress)` on Polygon. One HTTP call, no auth, no SDK. Same pattern as the Nodle Subscan query.

---

## Q5 — Where do the tokens actually go?

**EVM wallet on Polygon — the user's own address, derived from their DIMO account.**

Weekly $DIMO rewards are batch-transferred by DIMO's on-chain rewards contract to the user's Polygon wallet (the same address that owns their Vehicle NFTs). The user controls this address — DIMO never custodies earned tokens.

**Key implication for GETKINETIK identity:**
Unlike Nodle (where we can *derive* a new SS58 address from the user's existing Ed25519 key), DIMO requires an *existing* EVM address that the user set up when they created their DIMO account. GETKINETIK cannot generate a DIMO-compatible wallet from the Ed25519 keypair — the user already has a Polygon wallet via the DIMO app (Metamask, Rainbow, or DIMO's embedded wallet on ZeroDev).

**Therefore:**
- v0 DIMO adapter asks the user to *connect* their existing DIMO account via "Login with DIMO"
- GETKINETIK reads and records earnings at that address — it does not generate the address
- The `externalRef` in each `EarningEntry` is `dimo:addr:<polygon-address>:<tx-or-week>`
- No custody. DIMO moves tokens to the user's Polygon wallet; we sign a receipt.

---

## Integration Shape Decision

**API-only + Login with DIMO OAuth (no SDK install, no native module)**

| Layer | Implementation |
|---|---|
| Auth | `expo-web-browser` → `accounts.dimo.org` → returns `walletAddress` |
| Balance | `eth_call balanceOf()` on Polygon via `https://polygon-rpc.com/` |
| Identity | User's existing DIMO Polygon wallet (not derived from Ed25519) |
| Earnings | Auto-transferred weekly — no manual claim |
| `pollEarnings()` | Single Polygon RPC call, no auth |
| `claim()` | Not implemented — DIMO auto-transfers weekly |

---

## Limitations (v0)

1. **Requires user to already have a DIMO account and connected vehicle.** GETKINETIK is an earnings aggregator here, not an earnings generator. A user with no DIMO account sees "tap to connect DIMO account" and gets redirected to DIMO's onboarding — that part is DIMO's funnel, not ours.
2. **No vehicle telemetry.** We read earnings only. Telemetry (speed, location, battery) requires a Vehicle JWT and is explicitly out of scope for v0.
3. **Weekly resolution.** DIMO distributes weekly, so `lifetimeGross` changes at most once per week. The earnings card will show a stable number most of the week, then tick up on Mondays (5 AM UTC).
4. **Polygon wallet is separate from kn1 wallet.** The user's DIMO earnings sit in their Polygon wallet, not in the GETKINETIK sovereign wallet. GETKINETIK records signed receipts — it does not move tokens.
5. **Developer License required for production.** The "Login with DIMO" consent screen names the developer's app. Before shipping, we register GETKINETIK on DIMO Console (free, 5 minutes). Until then, the adapter runs in developer-preview mode showing `dev` in the DIMO consent screen.

---

## Open Questions (non-blocking for adapter code)

- Developer Console registration — create account at `console.dimo.org`, register GETKINETIK as an app, get `client_id`. Not needed to write the code, only to activate the consent screen with GETKINETIK's name.
- Polygon RPC reliability — `polygon-rpc.com` is public but rate-limited. For production, substitute Alchemy or QuickNode. The adapter's RPC URL should be configurable (env or config file).

---

## Partner Email Target

> `partnerships@dimo.zone` or via `console.dimo.org` Developer Discord
>
> **Subject:** GETKINETIK × DIMO — Aggregator Integration (DePIN Plaid Thesis)
>
> Angle: GETKINETIK is the identity + signed earnings layer every DePIN needs. DIMO users who also earn on other DePIN networks (Nodle, WeatherXM, etc.) want one signed ledger for all earnings. GETKINETIK is that ledger. DIMO is our second integration; Nodle is first. We'd love to be listed as a DIMO ecosystem partner.

---

*Session F will implement the DIMOAdapter code following this research, mirroring the Nodle adapter pattern with API-only integration.*
