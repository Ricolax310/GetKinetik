# GETKINETIK — DePIN Adapter Contract

> **Audience:** Partner integrators, new adapter authors.
> This is the interface every DePIN network integration must implement.

---

## The Pattern

GETKINETIK uses the **Plaid pattern** for DePIN integrations. Plaid doesn't care which bank it talks to — each bank is abstracted behind the same interface. GETKINETIK does the same for DePIN networks.

The aggregator UI iterates `adapters[]` and treats every adapter identically. It calls the same `pollEarnings()` method on Nodle as it does on DIMO. Adding a new DePIN = drop a new package that satisfies the `DepinAdapter` interface and register it in the adapter list.

---

## Interface

```typescript
// packages/kinetik-core/src/adapter.ts

interface DepinAdapter {
  // ── Identity ────────────────────────────────────────────────────────────
  readonly id: string;          // STABLE. Lowercase. Never rename after launch.
                                // Used as `source` in every EarningEntry.
  readonly displayName: string; // Human-readable name for the UI.
  readonly description: string; // One-line description for the adapter card.
  readonly currency: string;    // Native token symbol, e.g. 'NODL'.
  readonly rateMetadata?: AdapterRateMetadata;  // Optional pricing hint (below).

  // ── Lifecycle ───────────────────────────────────────────────────────────
  isAvailable(): Promise<boolean>;
  // Fast check — no network, no native module init. Called before register().
  // Return false if the platform/region/hardware can't support this adapter.

  getStatus(): Promise<AdapterStatus>;
  // Returns the current lifecycle state: unavailable | unregistered |
  // registered | earning. Reads from SecureStore — no network call.

  register(identity: NodeIdentity): Promise<AdapterStatus>;
  // Opt the user in. Derive any network-specific address from identity,
  // start the underlying SDK or register with the network's API, and
  // persist the registration so it survives app restarts.

  unregister(): Promise<void>;
  // Opt the user out. Stop the underlying SDK and clear persisted state.

  // ── Data ────────────────────────────────────────────────────────────────
  pollEarnings(): Promise<EarningSnapshot>;
  // Poll the underlying network for accrued / claimable balance.
  // Should be cheap (cached or single RPC call). The PollingPool calls
  // this at the adapter's natural cadence. Must never throw — return 0s.

  claim?(): Promise<{ gross: number; externalRef: string } | null>;
  // Optional: trigger a manual claim on the underlying network.
  // Omit for auto-deposit adapters (Nodle, Hivemapper).

  attest?(beat: SignedHeartbeat): Promise<void>;
  // Optional: attest L2 sensor data to the underlying network.
  // Called once per signed heartbeat. Only implement if the network's
  // proof model requires sensor data.
}
```

---

## AdapterRateMetadata

Optional. Implement this to participate in the optimizer's gas-aware claim timing and the verified-user premium programme.

```typescript
type AdapterRateMetadata = {
  standardRateUsd?: number;      // Approximate USD per token unit (optimizer hint)
  premiumRateUsd?: number;       // Premium rate (when partner activates it)
  premiumBasisPoints?: number;   // Premium above standard in basis points
  claimChain?: 'polygon' | 'base' | 'solana' | null;  // null = auto-deposit
};
```

If `claimChain` is `null` (auto-deposit), the optimizer will never recommend a manual claim for this adapter. If it's `'polygon'` or `'base'`, the optimizer will look up the current gas price on that chain and hold the claim until `pendingUsd > gasCostUsd × 5`.

---

## AdapterStatus

```typescript
type AdapterStatus =
  | { state: 'unavailable'; reason: string }
  | { state: 'unregistered' }
  | { state: 'registered'; externalNodeId: string }
  | { state: 'earning'; externalNodeId: string; lastEarnedAt: number };
```

---

## EarningSnapshot

```typescript
type EarningSnapshot = {
  source: string;          // adapter.id
  currency: string;        // e.g. 'NODL'
  pendingGross: number;    // Accrued but not yet recorded as a signed entry
  lifetimeGross: number;   // Lifetime total earned on this device
  lastEarnedAt: number | null;
  externalRef?: string;    // Adapter-specific dedup ID
};
```

---

## Invariants

**NEVER violate these:**

1. `adapter.id` is **stable and lowercase**. It is used as the `source` field in every EarningEntry, forever. Renaming it after launch breaks the signed ledger.

2. Adapters **NEVER hold user tokens**. Token movement is the underlying network's responsibility. The adapter reports what happened (via `externalRef`) so the earnings ledger can record + deduplicate.

3. `pollEarnings()` must **never throw**. Return 0 values on failure. The PollingPool catches errors, but a crash in pollEarnings brings down the whole adapter card.

4. `isAvailable()` must be **fast and offline**. It is called before any SDK init. Return false based on Platform.OS checks, not a network call.

---

## Example: Minimum Viable Adapter

```typescript
// packages/adapter-example/src/index.ts
import type { DepinAdapter, AdapterStatus, EarningSnapshot } from '@kinetik/core';
import type { NodeIdentity } from '@kinetik/core';
import * as SecureStore from 'expo-secure-store';

const STORE_KEY = 'kinetik.example.addr.v1';

class ExampleAdapter implements DepinAdapter {
  readonly id          = 'example';            // NEVER change this
  readonly displayName = 'Example Network';
  readonly description = 'Earn EXAMPLE tokens passively.';
  readonly currency    = 'EXAMPLE';
  readonly rateMetadata = { claimChain: 'base' as const };

  async isAvailable() {
    return true; // available on all platforms
  }

  async getStatus(): Promise<AdapterStatus> {
    const addr = await SecureStore.getItemAsync(STORE_KEY).catch(() => null);
    if (!addr) return { state: 'unregistered' };
    return { state: 'registered', externalNodeId: addr };
  }

  async register(identity: NodeIdentity): Promise<AdapterStatus> {
    const addr = deriveAddress(identity.publicKey);  // your derivation logic
    await SecureStore.setItemAsync(STORE_KEY, addr);
    return { state: 'registered', externalNodeId: addr };
  }

  async unregister(): Promise<void> {
    await SecureStore.deleteItemAsync(STORE_KEY).catch(() => {});
  }

  async pollEarnings(): Promise<EarningSnapshot> {
    const addr = await SecureStore.getItemAsync(STORE_KEY).catch(() => null);
    if (!addr) {
      return { source: this.id, currency: this.currency, pendingGross: 0, lifetimeGross: 0, lastEarnedAt: null };
    }
    const balance = await fetchBalance(addr).catch(() => 0);
    return { source: this.id, currency: this.currency, pendingGross: balance, lifetimeGross: balance, lastEarnedAt: balance > 0 ? Date.now() : null };
  }
}

export const exampleAdapter = new ExampleAdapter();
```

---

## Registration in VaultPanel

Add your adapter to the adapters array in `src/components/VaultPanel.tsx` (or wherever the adapter list is initialised). The AggregatorPanel and PollingPool pick it up automatically.

---

## Verified-User Premium (v1.5)

Once the `/api/verify-device` webhook is live and a partner is ready to pay the premium:

1. Implement `rateMetadata.premiumBasisPoints` and `premiumRateUsd`.
2. In your adapter's `pollEarnings()`, check whether the partner has confirmed premium status for this node (via a partner API call or a stored flag).
3. Pass `premiumBasisPoints`, `standardRate`, and `premiumRate` to `appendEarningLog()` when recording the earning. These fields are signed into the receipt.

See `docs/api/verify-device.md` for the partner-side webhook spec.
