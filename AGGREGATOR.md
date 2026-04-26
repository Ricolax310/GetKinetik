# GETKINETIK — Aggregator Track (L4 + L3 spine)

> **Status:** ACTIVE. Started 2026-04-25 night. This is the track where GETKINETIK stops being “signed phone” and starts being “Plaid for DePIN.”
>
> **Read first:** `STATUS.md` (the mission, four-layer architecture, and trust spine context). This document is scoped: it is **only** the aggregator/wallet/earnings track. It does not duplicate the L1/L2 narrative.

---

## The line in the sand

We have built the **trust spine** (L1 + first slice of L2). It is real, it is shipped, it is witnessed. But on its own it does **not** make money. Every additional polish on the trust spine — gyro, verifier null-rendering, EAS auto-increment, sensor permissions UX — is **optional** until **at least one DePIN pays through GETKINETIK**. From this point forward, polish is opportunistic; **integration + wallet is the critical path.**

The vision in one line: **one app, many DePIN networks earning into one sovereign wallet, GETKINETIK takes a fee on the way through.**

---

## Three pieces to build, in order

### 1. Wallet primitive — `packages/kinetik-core/src/wallet.ts`

A sovereign earnings ledger that lives in the same package as identity + heartbeat + proof. Same trust pattern, new domain.

**Address derivation (no new secret material):**

```
walletAddress = "kn1" + base32(sha256("kinetik-wallet-v1" || publicKey))[:32]
```

The wallet is **derived from the existing Ed25519 keypair**. There is no second secret to lose, no second device to back up. The Sovereign Node IS the wallet.

**Earnings ledger entry shape (v:1 to start):**

```ts
type EarningEntry = {
  v: 1;
  kind: 'earning';
  nodeId: string;
  pubkey: string;
  source: string;        // adapter id, e.g. 'nodle'
  externalRef: string;   // adapter-specific ID for dedup / dispute
  currency: string;      // 'NODL', 'HONEY', 'USD', etc.
  gross: number;         // raw payout from the network, in currency units
  fee: number;           // GETKINETIK protocol fee (1% of gross, signed in)
  net: number;           // gross - fee, what the user keeps
  ts: number;
  prevHash: string | null;
  attribution: 'GETKINETIK by OutFromNothing LLC';
};
```

**Same canonical signing contract as everything else** — `stableStringify` → Ed25519 signature → sha256 truncated to 16 hex. The earnings ledger IS a chain, just like heartbeats. Anyone can audit total earnings, total fees taken, and verify the attribution stamp.

**Persistence:** SecureStore, same pattern as heartbeat log. Optionally rolling-window in memory + persisted summary.

**HARD RULES (encoded in code, not just docs):**

- **No custody.** GETKINETIK never holds the user's tokens. The wallet ADDRESS is sovereign, the **payout flow is the adapter's responsibility** — it tells the user where their tokens went on the underlying network. We just sign a receipt for our records.
- **Fee is signed in.** Cannot be retroactively renegotiated. Stripping or editing `fee` invalidates the signature, same way `PROOF_ATTRIBUTION` works in `proof.ts`.
- **No fiat conversion in v0.** Tokens earned, tokens reported. Conversion is a later track (and probably a partner integration).

---

### 2. Adapter contract — `packages/kinetik-core/src/adapter.ts`

The **single TypeScript interface** every DePIN adapter implements. The aggregator UI iterates `adapters[]` and treats them all uniformly. Adding a new DePIN later = drop in a new package that implements this interface, register it in the aggregator panel.

**Sketch (will be refined when we touch real Nodle docs):**

```ts
export type AdapterStatus =
  | { state: 'unavailable'; reason: string }   // SDK missing, region blocked, etc.
  | { state: 'unregistered' }                  // adapter ready, user hasn't opted in
  | { state: 'registered'; externalNodeId: string }
  | { state: 'earning'; externalNodeId: string; lastEarnedAt: number };

export type EarningSnapshot = {
  source: string;
  currency: string;
  pendingGross: number;       // accrued in adapter, not yet claimed
  lifetimeGross: number;      // ever earned through this adapter
  externalRef?: string;
};

export interface DepinAdapter {
  readonly id: string;            // 'nodle', 'dimo', etc. — stable, used in earnings ledger
  readonly displayName: string;
  readonly description: string;
  readonly currency: string;

  isAvailable(): Promise<boolean>;
  getStatus(): Promise<AdapterStatus>;

  register(identity: NodeIdentity): Promise<AdapterStatus>;
  unregister(): Promise<void>;

  /**
   * Optional hook: the adapter may want to attest L2 sensor data into the
   * underlying network. Called once per signed heartbeat. Adapters that
   * don't care just no-op. NEVER raw streams; only what the adapter
   * needs for its own proof model.
   */
  attest?(beat: SignedHeartbeat): Promise<void>;

  /** Poll the underlying network for accrued / claimable balance. */
  pollEarnings(): Promise<EarningSnapshot>;

  /**
   * Trigger a claim. Returns the gross amount + an externalRef the
   * earnings ledger uses to record + dedupe. Adapter is responsible
   * for actually moving tokens on its own network — we just record.
   */
  claim?(): Promise<{ gross: number; externalRef: string } | null>;
}
```

**Why one interface:**
- Aggregator UI is **adapter-agnostic** — it iterates and renders, doesn't special-case.
- L3 routing optimizer (later) sits one level above and decides which adapter to feed sensor data to based on `pollEarnings()` curves.
- New integrations are **plug-in**, not fork-and-modify.

**This is the Plaid pattern.** Plaid does not care which bank it talks to; the adapter abstracts the bank's quirks. Our interface does the same for DePIN networks.

---

### 3. First adapter — `packages/adapter-nodle/`

**Why Nodle first** (locked in):

- Phone-only. No second device. The "one pocket, one app, one earning" loop is fully realized in one install.
- Passive contribution (BLE / connectivity scanning) — user does nothing new.
- Has a real token (NODL) and real payout flow.
- Easiest integration shape teaches us the pattern; the next 4 (DIMO, Hivemapper, WeatherXM, Helium Mobile) follow.

**Research task #1 (BEFORE writing adapter code):** answer these questions about Nodle's developer surface.

1. Does Nodle expose a **third-party SDK** that can run inside a non-Nodle Android app? (Look for `nodle/sdk-react-native`, Maven artifacts, NPM packages.)
2. If yes: license terms, attribution requirements, key/identity model — does Nodle require its own identity, or can it accept ours?
3. If no SDK: is there a **deep-link / hand-off** flow where GETKINETIK can register a user with the Nodle app and read accrued balance back?
4. Is there a public API / RPC for **querying earned NODL by node ID / wallet address** without their app?
5. **Where do the tokens actually go?** Nodle's own wallet, a generic Solana address, an EVM address? This determines whether our "no custody" rule means we hand the user a Nodle-network address they're responsible for, or we derive one from their Sovereign Identity.

**Until those answers are written down**, the adapter is unimplementable. Adapter code without those answers is fiction.

**Output of research phase:** a one-page `packages/adapter-nodle/RESEARCH.md` summarizing what Nodle exposes, what shape our integration takes (deep-link vs SDK vs API-only), and what limitations the v0 has. Then we decide whether to proceed or pivot to a different first adapter.

---

## What the aggregator UI looks like (sketch — not designed yet)

A new screen reachable from the Sovereign Node main view. Top of the screen: total lifetime earnings across all adapters (in their native units, no fiat). Below: a card per adapter showing:

```
┌────────────────────────────────────────────────────┐
│  NODLE                            [STATUS: EARNING]│
│  Background BLE attestation                        │
│  PENDING            12.3 NODL                      │
│  LIFETIME           487.2 NODL                     │
│  LAST EARNED        2 min ago                      │
│  [   CLAIM   ]                                     │
└────────────────────────────────────────────────────┘
```

The fee is **invisible at this layer** — we never show "we took 1%" as a line item the user has to digest every time. It's transparent in the **earnings ledger** (anyone can audit), and in a one-time disclosure during opt-in. Same pattern as exchanges that show net price, not "price minus 0.1% fee" everywhere.

---

## What we are NOT doing in v0 of this track

- **Multiple adapters.** One real integration first. "Plaid for DePIN" with one bank is still Plaid for DePIN; "Plaid for DePIN" with zero banks is a slide deck.
- **L3 routing optimizer.** Cannot route between fewer than 2 things. After adapter #2 lands.
- **Token custody.** Ever. Adapters claim into the user's own address on the underlying network. We sign receipts.
- **Cross-network swaps / fiat conversion.** Different track entirely. Likely a partner (Coinbase, MoonPay, etc.) when the time comes.
- **Premium tier ($5/mo).** Until earnings are real, premium is theoretical.
- **The "second app for data sales"** track from the late-night design conversation. That is a parallel product with a separate identity system and is not blocked by aggregator work — but it is also not part of this track.

---

## Sequence the next sessions should follow

**Session A — Research (no code, ~1 hr):**
1. Read everything publicly available about Nodle's developer surface.
2. Write `packages/adapter-nodle/RESEARCH.md` answering the 5 questions above.
3. Decide: SDK-embed integration, deep-link integration, API-only integration, or pivot to a different first adapter.

**Session B — Wallet primitive (~2-3 hrs):**
1. Create `packages/kinetik-core/src/wallet.ts` with `walletAddress` derivation + `EarningEntry` schema + `signEarning` + `verifyEarning` + `appendEarningLog`.
2. Mirror the heartbeat persistence pattern.
3. Extend `packages/kinetik-core/src/index.ts` to export the new surface.
4. Write smoketests in `landing/verify/smoketest.mjs` for `v:1 earning` happy path + tampered-fee rejection + sequential chain integrity.
5. Update `landing/verify/verifier.js` to recognize and render `kind: 'earning'` artifacts (third kind alongside `heartbeat` and `proof-of-origin`).

**Session C — First adapter (depends on Session A's output):**
1. Scaffold `packages/adapter-nodle/` with `package.json`, `src/index.ts`, `RESEARCH.md` (already written).
2. Implement the `DepinAdapter` interface based on whatever surface Nodle actually exposes.
3. Wire a feature-flagged AggregatorPanel into the app to render the single adapter card.
4. End-to-end: install GETKINETIK → see Nodle adapter status → see first earning tick into the signed earnings log.

**Session D — Demonstration:**
1. Cold smoke-test on device.
2. Capture: a screenshot, the signed earnings entry, the QR-scannable artifact through `getkinetik.app/verify/`.
3. This is the **rung 6** completion artifact. Update STATUS.md.

---

## Where this leaves the trust-spine polish backlog

Parked, not forgotten. Pick these up between Sessions A/B/C as filler if the aggregator track is blocked on external research:

- Verifier shows `—` rows for v:2 PoO with `sensors: null` (currently hides them entirely; minor UX inconsistency)
- `eas.json` preview profile `autoIncrement: true` (so future side-by-side Android upgrades install in place)
- Gate the PROOF chip until at least one heartbeat has fired (prevents minting `sensors: null` PoOs)
- Gyro aggregate added to `SensorReadout`
- Reanimated strict-mode warning (cosmetic, dev-only)

None of these block the aggregator track. None of them generate revenue. Pick them up when there is a natural pause.

---

## Hard rules for whoever picks this up

1. **Never break the trust spine for aggregator features.** L1 + L2 contracts are sealed. The wallet primitive is a NEW chain (kind: `earning`), it does NOT modify heartbeats or proofs.
2. **No custody.** Re-read this every time you feel tempted.
3. **Adapter contract is the boundary.** Aggregator core knows nothing about Nodle. Nodle adapter knows nothing about other DePINs. Cross-contamination is technical debt that compounds.
4. **`packages/kinetik-core/src/index.ts` is still the front door.** Add new exports there for `wallet` + `adapter`; never reach past it.
5. **Schemas get versioned.** The earnings ledger is `v:1`. When it bumps, bump explicitly and update the verifier with backward compat — same way the heartbeat and PoO did.
6. **Smoketests are the test harness.** Every cryptographic primitive in this track gets a smoketest before it ships. The verifier is the single source of truth for "does the contract hold."

---

*Sovereign Node was the cathedral. The aggregator is the marketplace built around it. Neither works alone.*
