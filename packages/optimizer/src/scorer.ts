// ============================================================================
// scorer.ts — yield scoring + claim timing decisions.
// ----------------------------------------------------------------------------
// Given a set of adapter snapshots, token prices, and gas prices, the scorer
// produces a ranked list of adapters with a concrete claim recommendation for
// each. The output drives both the OptimizationReport UI and the claim buttons
// in AdapterCard.
//
// DECISION RULE (Gas-Optimised Claim Timing):
//   Only claim when:  pendingUsd  >  gasCostUsd × CLAIM_GAS_RATIO
//
//   CLAIM_GAS_RATIO = 5 means the pending earnings must be worth ≥5× the gas
//   cost before we recommend claiming. Result: the user spends <20% of the
//   claim value on gas. This is the core "gas savings" optimisation.
//
// ADAPTERS WITHOUT A CLAIM STEP:
//   Nodle auto-deposits, Hivemapper auto-mints — no gas cost, always "claim"
//   when any positive balance exists. The scorer simply returns a high score.
//
// SAVINGS COMPUTATION:
//   gasFeesAvoided   = Σ gasCostUsd for adapters where shouldClaim = false
//                      (i.e., savings from waiting = gas we didn't spend)
//   Standalone would claim every poll cycle; we claim once threshold is hit.
// ============================================================================

import type { EarningSnapshot } from '../../kinetik-core/src/adapter';
import type { TokenPrice }      from './priceFeed';
import type { GasPrice }        from './gasFeed';

// ---------------------------------------------------------------------------
// Tuning constants — exposed so tests + future settings can override.
// ---------------------------------------------------------------------------

/** Minimum pendingUsd / gasCostUsd ratio before a claim is recommended. */
export const CLAIM_GAS_RATIO = 5;

/**
 * Which chain each adapter settles on. Used to look up the right gas price.
 * Adapters with chain: null have no on-chain claim step (auto-deposit).
 */
const ADAPTER_CHAIN: Record<string, 'polygon' | 'base' | null> = {
  nodle:      null,       // Nodle auto-deposits; no gas cost
  dimo:       'polygon',
  hivemapper: null,       // HONEY auto-mints weekly on Solana; fees are ~$0
  weatherxm:  'base',
  geodnet:    'base',
};

/**
 * Estimated gas units consumed by each adapter's claim() call.
 * ERC-20 token transfers are ~65k gas; complex claim contracts can be more.
 * Using conservative estimates — lean toward over-estimating cost.
 */
const ADAPTER_GAS_UNITS: Record<string, number> = {
  dimo:      65_000,
  weatherxm: 65_000,
  geodnet:   80_000,
};

// ---------------------------------------------------------------------------
// Types.
// ---------------------------------------------------------------------------

export type ScoredAdapter = {
  /** Matches adapter.id. */
  adapterId: string;
  /** Pending earnings in USD. */
  pendingUsd: number;
  /** Estimated gas cost for claim() in USD. 0 for auto-deposit adapters. */
  gasCostUsd: number;
  /** pendingUsd / gasCostUsd, or Infinity for gas-free adapters. */
  gasCostRatio: number;
  /** True when the adapter has a pending balance worth claiming now. */
  shouldClaim: boolean;
  /**
   * Human-readable one-line recommendation shown in the OptimizationReport UI.
   * Examples:
   *   "Claim now — pending $4.20, gas only $0.28"
   *   "Hold — claim queued until pending reaches $1.50 (now $0.31)"
   *   "Auto-deposit — no claim step needed"
   */
  recommendation: string;
  /** Earnings score (0–100) for sorting adapters by priority. */
  score: number;
};

export type OptimizationResult = {
  /** All adapters, sorted by score descending. */
  scored: ScoredAdapter[];
  /** Total pending USD across all adapters. */
  totalPendingUsd: number;
  /** Total gas cost USD if every claimable adapter is claimed right now. */
  totalGasCostUsd: number;
  /** Gas USD saved by NOT claiming adapters below the threshold. */
  gasFeesAvoidedUsd: number;
  /** Net gain = (sum of pending for should-claim adapters) − their gas cost. */
  netGainIfClaimNow: number;
  /** Adapter IDs sorted by score — the recommended claim order. */
  bestClaimOrder: string[];
};

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function fmtUsd(n: number): string {
  if (n < 0.01) return '<$0.01';
  return `$${n.toFixed(2)}`;
}

function computeGasCostUsd(
  adapterId: string,
  gasPrices: GasPrice[],
  gasUnits: number,
): number {
  const chain = ADAPTER_CHAIN[adapterId];
  if (!chain) return 0; // auto-deposit — no gas cost

  const gasEntry = gasPrices.find((g) => g.chain === chain);
  if (!gasEntry) return 0;

  // Use per-adapter gas units if known, otherwise fall back to simple transfer.
  const units = gasUnits || 21_000;
  // gasCostUsd = gasUnits × gweiPrice × nativeTokenUsd / 1e9 (gwei → ETH/POL)
  // simpleTransferUsd is already computed for 21_000 gas. Scale from that:
  return (units / 21_000) * gasEntry.simpleTransferUsd;
}

// ---------------------------------------------------------------------------
// scoreAdapters — the public function.
// ---------------------------------------------------------------------------

export function scoreAdapters(
  snapshots: EarningSnapshot[],
  prices: Record<string, TokenPrice>,
  gasPrices: GasPrice[],
): OptimizationResult {
  const scored: ScoredAdapter[] = [];
  let totalPendingUsd = 0;
  let totalGasCostUsd = 0;
  let gasFeesAvoidedUsd = 0;
  let netGainIfClaimNow = 0;

  for (const snap of snapshots) {
    const priceEntry = prices[snap.currency.toUpperCase()];
    const usdPerToken = priceEntry?.usd ?? 0;
    const pendingUsd = snap.pendingGross * usdPerToken;

    const gasUnits = ADAPTER_GAS_UNITS[snap.source] ?? 21_000;
    const gasCostUsd = computeGasCostUsd(snap.source, gasPrices, gasUnits);

    const chain = ADAPTER_CHAIN[snap.source];
    const isAutoDeposit = chain === null;

    const gasCostRatio = gasCostUsd > 0 ? pendingUsd / gasCostUsd : Infinity;
    const shouldClaim =
      isAutoDeposit
        ? snap.pendingGross > 0  // auto-deposit: always "active" if earning
        : pendingUsd > 0 && gasCostRatio >= CLAIM_GAS_RATIO;

    // Score: log-scale USD pending, boosted by high ratio.
    const baseScore = Math.log10(Math.max(pendingUsd, 0.001) + 1) * 20;
    const ratioBoost = isAutoDeposit ? 30 : Math.min(gasCostRatio / CLAIM_GAS_RATIO, 2) * 20;
    const score = Math.round(Math.min(baseScore + ratioBoost, 100));

    let recommendation: string;
    if (isAutoDeposit) {
      recommendation = snap.pendingGross > 0
        ? `Auto-deposit active — ${fmtUsd(pendingUsd)} accrued, no claim needed`
        : 'Auto-deposit — earnings accrue automatically';
    } else if (pendingUsd === 0) {
      recommendation = 'No pending balance yet';
    } else if (shouldClaim) {
      recommendation = `Claim now — pending ${fmtUsd(pendingUsd)}, gas only ${fmtUsd(gasCostUsd)}`;
    } else {
      const targetUsd = gasCostUsd * CLAIM_GAS_RATIO;
      recommendation = `Hold — claim queued until ${fmtUsd(targetUsd)} pending (now ${fmtUsd(pendingUsd)})`;
    }

    if (shouldClaim && !isAutoDeposit) {
      netGainIfClaimNow += pendingUsd - gasCostUsd;
    }
    if (!shouldClaim && !isAutoDeposit && gasCostUsd > 0) {
      gasFeesAvoidedUsd += gasCostUsd;
    }

    totalPendingUsd += pendingUsd;
    if (!isAutoDeposit) totalGasCostUsd += gasCostUsd;

    scored.push({
      adapterId: snap.source,
      pendingUsd,
      gasCostUsd,
      gasCostRatio: isAutoDeposit ? Infinity : gasCostRatio,
      shouldClaim,
      recommendation,
      score,
    });
  }

  scored.sort((a, b) => b.score - a.score);

  return {
    scored,
    totalPendingUsd,
    totalGasCostUsd,
    gasFeesAvoidedUsd,
    netGainIfClaimNow,
    bestClaimOrder: scored
      .filter((a) => a.shouldClaim)
      .map((a) => a.adapterId),
  };
}
