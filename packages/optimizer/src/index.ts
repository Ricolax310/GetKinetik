// ============================================================================
// @kinetik/optimizer — public API surface.
// ----------------------------------------------------------------------------
// The optimizer engine: gas-aware claim timing, shared adapter polling,
// device capability discovery, yield scoring, and weekly savings reporting.
//
// Everything exported from this file is part of the package's public API.
// Internal helpers (e.g., chain-specific fetch logic) are NOT re-exported.
//
// USAGE:
//
//   // Price + gas feeds
//   import { fetchTokenPrices, fetchGasPrices } from '@kinetik/optimizer';
//
//   // Yield scoring
//   import { scoreAdapters } from '@kinetik/optimizer';
//
//   // Device discovery
//   import { getDeviceCapabilities, getMissingAdapters } from '@kinetik/optimizer';
//
//   // Shared polling pool (replaces individual setIntervals in AdapterCards)
//   import { PollingPool } from '@kinetik/optimizer';
//
//   // Weekly savings report for OptimizationReport.tsx modal
//   import { computeWeeklySavings } from '@kinetik/optimizer';
// ============================================================================

// ----- Price feeds -----------------------------------------------------------
export {
  type TokenPrice,
  type PriceFeedResult,
  fetchTokenPrices,
  getCachedPrice,
  invalidatePriceCache,
} from './priceFeed';

// ----- Gas feeds -------------------------------------------------------------
export {
  type GasPrice,
  type GasFeedResult,
  fetchGasPrices,
  getCachedGasPrice,
  invalidateGasCache,
} from './gasFeed';

// ----- Yield scorer ----------------------------------------------------------
export {
  CLAIM_GAS_RATIO,
  type ScoredAdapter,
  type OptimizationResult,
  scoreAdapters,
} from './scorer';

// ----- Device capability discovery -------------------------------------------
export {
  type DeviceCapabilities,
  type AdapterRequirement,
  ADAPTER_REQUIREMENTS,
  getDeviceCapabilities,
  getEligibleAdapters,
  getMissingAdapters,
  estimateAdditionalMonthlyUsd,
} from './discovery';

// ----- Shared polling pool ---------------------------------------------------
export {
  type PollCallback,
  PollingPool,
} from './pollingPool';

// ----- Weekly savings report -------------------------------------------------
export {
  type WeeklySavings,
  computeWeeklySavings,
} from './savings';
