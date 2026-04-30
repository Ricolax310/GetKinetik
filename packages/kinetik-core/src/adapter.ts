// ============================================================================
// DepinAdapter — the single contract every DePIN integration implements.
// ----------------------------------------------------------------------------
// This is the L3 boundary layer. The aggregator UI iterates adapters[] and
// treats every adapter identically — it does not special-case Nodle vs DIMO
// vs Hivemapper. Adding a new DePIN = drop in a new package that satisfies
// this interface, register it in the adapter list.
//
// This is the Plaid pattern. Plaid does not care which bank it talks to; the
// adapter abstracts the bank's quirks. This interface does the same for DePIN
// networks.
//
// CONTRACTS:
//   · Adapters NEVER hold user tokens. Token movement is the underlying
//     network's responsibility. The adapter reports what happened, via
//     externalRef, so the earnings ledger can record + dedupe.
//   · `id` is stable and lowercase — used as the `source` field in every
//     EarningEntry. Never rename it after launch.
//   · `claim()` is optional — adapters that auto-deposit (like Nodle v0)
//     do not implement it. The earnings ledger records incremental balance
//     deltas instead.
//   · `attest()` is optional — adapters that do not need L2 sensor data
//     just skip the hook. NEVER pass raw sensor streams; only what the
//     adapter's own proof model requires.
// ============================================================================

import type { NodeIdentity } from './identity';
import type { SignedHeartbeat } from './heartbeat';

// ----------------------------------------------------------------------------
// AdapterStatus — the four states of a DePIN adapter lifecycle.
// ----------------------------------------------------------------------------
export type AdapterStatus =
  /** SDK missing, platform not supported, region blocked, etc. */
  | { state: 'unavailable'; reason: string }
  /** Adapter is ready but the user has not opted in yet. */
  | { state: 'unregistered' }
  /** User is registered; the adapter is active but no earning confirmed yet. */
  | { state: 'registered'; externalNodeId: string }
  /** Adapter is active and at least one earning event has been observed. */
  | { state: 'earning'; externalNodeId: string; lastEarnedAt: number };

// ----------------------------------------------------------------------------
// EarningSnapshot — a point-in-time view of what an adapter has accrued.
// Returned by pollEarnings(). The aggregator UI renders this without knowing
// the underlying network.
// ----------------------------------------------------------------------------
export type EarningSnapshot = {
  /** Matches the adapter's `id` — used to look up entries in the earnings ledger. */
  source: string;
  /** Native currency of the network, e.g. 'NODL', 'HONEY'. */
  currency: string;
  /** Amount accrued on the underlying network, not yet recorded as an EarningEntry. */
  pendingGross: number;
  /** Lifetime total ever earned through this adapter on this device. */
  lifetimeGross: number;
  /** Timestamp of the most recent earning event, or null if none yet. */
  lastEarnedAt: number | null;
  /** Adapter-specific identifier for the most recent earning event. */
  externalRef?: string;
};

// ----------------------------------------------------------------------------
// AdapterRateMetadata — optional per-adapter pricing metadata used by the
// optimizer to compute USD value of pending earnings and to record verified-
// user premium receipts. Adapters that cannot supply this leave it undefined;
// the optimizer falls back to the CoinGecko price feed.
// ----------------------------------------------------------------------------
export type AdapterRateMetadata = {
  /**
   * Standard reward rate for this adapter in USD per token unit.
   * May be approximate — the optimizer uses this for quick comparisons
   * before hitting the price feed. Leave undefined if unknown.
   */
  standardRateUsd?: number;
  /**
   * Premium reward rate paid by the partner to hardware-attested nodes,
   * in USD per token unit. Present only when the partner has activated the
   * verified-user premium programme for this adapter.
   */
  premiumRateUsd?: number;
  /**
   * Premium above standard in basis points (100 bp = 1%).
   * e.g. 1500 = 15% premium. Present only when premiumRateUsd is defined.
   */
  premiumBasisPoints?: number;
  /**
   * Which EVM chain this adapter's claim() settles on.
   * Used by the gas-aware scorer in packages/optimizer to look up the
   * correct gas price. null = auto-deposit (no claim step).
   */
  claimChain?: 'polygon' | 'base' | 'solana' | null;
};

// ----------------------------------------------------------------------------
// DepinAdapter — the interface.
// ----------------------------------------------------------------------------
export interface DepinAdapter {
  /** Stable lowercase identifier. Used as `source` in every EarningEntry. Never rename. */
  readonly id: string;
  /** Human-readable name for the aggregator UI. */
  readonly displayName: string;
  /** One-line description shown in the adapter card. */
  readonly description: string;
  /** Native currency token symbol, e.g. 'NODL'. */
  readonly currency: string;
  /**
   * Optional pricing + premium metadata for the optimizer engine.
   * Adapters that cannot supply this leave it undefined; the optimizer
   * falls back to the CoinGecko price feed in priceFeed.ts.
   * Implement this to participate in gas-aware claim timing and the
   * verified-user premium programme.
   */
  readonly rateMetadata?: AdapterRateMetadata;

  /**
   * Returns true if the adapter can function on this device/platform.
   * Fast check — no network, no native module init. Called before register().
   */
  isAvailable(): Promise<boolean>;

  /** Returns the current lifecycle state of this adapter. */
  getStatus(): Promise<AdapterStatus>;

  /**
   * Opt the user in. Derives any network-specific address from `identity`,
   * starts the underlying SDK or registers with the network's API, and
   * persists the registration so it survives app restarts.
   */
  register(identity: NodeIdentity): Promise<AdapterStatus>;

  /** Opt the user out. Stops the underlying SDK and clears persisted state. */
  unregister(): Promise<void>;

  /**
   * Optional: attest L2 sensor data to the underlying network.
   * Called once per signed heartbeat. Adapters that don't need sensor
   * attestation just omit this method. NEVER pass raw sensor streams —
   * only the aggregate fields the adapter's proof model requires.
   */
  attest?(beat: SignedHeartbeat): Promise<void>;

  /**
   * Poll the underlying network for accrued / claimable balance.
   * Should be cheap (cached or single RPC call). The aggregator UI
   * calls this on a timer to refresh the card display.
   */
  pollEarnings(): Promise<EarningSnapshot>;

  /**
   * Optional: trigger a manual claim on the underlying network.
   * Returns the gross amount and an externalRef the earnings ledger
   * uses to record + deduplicate the entry. Adapters that auto-deposit
   * (like Nodle v0) do not implement this — the ledger records incremental
   * balance deltas from pollEarnings() instead.
   */
  claim?(): Promise<{ gross: number; externalRef: string } | null>;
}
