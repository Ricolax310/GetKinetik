// ============================================================================
// @kinetik/credits — public API surface.
// ----------------------------------------------------------------------------
// Genesis Credits engine. NOT a token, NOT a monetary instrument.
// Internal loyalty/reputation points earned for running a Sovereign Node.
//
// ⚠️  COPY REVIEW REQUIRED: Any user-facing text referencing Genesis Credits
//     must be reviewed to ensure it contains no language that could be
//     construed as an investment product (no "earnings", "returns", "profit",
//     "redeemable for cash", "guaranteed value", "yield"). GC are loyalty
//     points and early-adopter access — nothing more.
//
// USAGE:
//   // Award credits on each heartbeat:
//   import { awardCredits } from '@kinetik/credits';
//   await awardCredits('heartbeat');
//
//   // Award on first network connection:
//   await awardCredits('networkConnected', 'nodle');
//
//   // Read for UI:
//   import { loadCreditsSummary } from '@kinetik/credits';
//   const { total, isGenesisTier } = await loadCreditsSummary();
//
//   // Daily sync to KV:
//   import { syncCreditsToKV } from '@kinetik/credits';
//   await syncCreditsToKV(identity.nodeId);
// ============================================================================

export {
  CREDIT_RATES,
  GENESIS_TIER_CAP,
  CREDITS_KEYS,
  type CreditEvent,
  type CreditsSummary,
  loadCreditsSummary,
  awardCredits,
  checkAndAwardDailyUptime,
  setGenesisTier,
  syncCreditsToKV,
} from './engine';
