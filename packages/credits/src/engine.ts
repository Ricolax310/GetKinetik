// ============================================================================
// Genesis Credits Engine — loyalty points for Sovereign Node operators.
// ----------------------------------------------------------------------------
// Genesis Credits (GC) are an internal loyalty/reputation system, NOT a token.
// They are earned automatically as a user runs their node.
//
// ⚠️  LEGAL WARNING: Copy for this feature must NEVER use words like
//     "investment", "earnings", "returns", "profit", "yield", "interest",
//     "redeemable for cash", or "guaranteed value". GC are access points and
//     loyalty rewards, nothing more. Violating this principle creates SEC risk.
//
// EARNING RATES (initial, tunable via RATES below):
//   · Each signed heartbeat (60s):           1  GC
//   · Each L2 sensor attestation:            5  GC
//   · Each Proof of Origin minted/shared:    100 GC
//   · Each day with 24h continuous uptime:   500 GC
//   · Each DePIN network connected (once):   1,000 GC
//   · First 10K users (Genesis Tier):        2× multiplier forever
//
// STORAGE:
//   · Local: SecureStore keys (same pattern as heartbeat + wallet)
//   · Remote: Cloudflare KV via POST /api/credits (sync every 30 minutes)
//   · The remote sync ensures credits survive device loss. The local copy
//     is the source of truth; remote is a backup.
//
// The engine is designed to be called from the heartbeat loop in the app,
// not from the UI. The UI component (GenesisCreditsTicker) reads from
// SecureStore directly via loadCreditsSummary().
// ============================================================================

import * as SecureStore from 'expo-secure-store';

// ---------------------------------------------------------------------------
// Earning rates — tunable without changing storage schema.
// ---------------------------------------------------------------------------
export const CREDIT_RATES = {
  heartbeat:        1,
  sensorAttestation: 5,
  proofOfOrigin:    100,
  dailyUptime:      500,
  networkConnected: 1_000,
  genesisTierMultiplier: 2,
} as const;

/** The Genesis Tier cap. First N users get the 2× multiplier forever. */
export const GENESIS_TIER_CAP = 10_000;

// ---------------------------------------------------------------------------
// SecureStore keys.
// ---------------------------------------------------------------------------
export const CREDITS_KEYS = {
  /** Total Genesis Credits accumulated (integer string). */
  total: 'kinetik.credits.total.v1',
  /** Lifetime heartbeat count that earned credits (to detect resumption). */
  heartbeatsRecorded: 'kinetik.credits.heartbeats.v1',
  /** ISO timestamp of last daily uptime bonus. */
  lastDailyBonus: 'kinetik.credits.lastDailyBonus.v1',
  /** Comma-separated list of network IDs that already earned the one-time bonus. */
  networksBonus: 'kinetik.credits.networksBonus.v1',
  /** Unix ms of last sync to Cloudflare KV. */
  lastSync: 'kinetik.credits.lastSync.v1',
  /** True if this device is in Genesis Tier (2× multiplier). */
  genesisTier: 'kinetik.credits.genesisTier.v1',
} as const;

// ---------------------------------------------------------------------------
// Types.
// ---------------------------------------------------------------------------

export type CreditEvent =
  | 'heartbeat'
  | 'sensorAttestation'
  | 'proofOfOrigin'
  | 'dailyUptime'
  | 'networkConnected';

export type CreditsSummary = {
  total: number;
  isGenesisTier: boolean;
  /** Effective multiplier (1 or 2). */
  multiplier: number;
  lastSyncAt: number | null;
};

// ---------------------------------------------------------------------------
// Helpers.
// ---------------------------------------------------------------------------

async function readInt(key: string, defaultVal = 0): Promise<number> {
  try {
    const raw = await SecureStore.getItemAsync(key);
    if (!raw) return defaultVal;
    const n = parseInt(raw, 10);
    return Number.isFinite(n) ? n : defaultVal;
  } catch {
    return defaultVal;
  }
}

async function writeInt(key: string, value: number): Promise<void> {
  try {
    await SecureStore.setItemAsync(key, String(Math.floor(value)));
  } catch { /* non-critical */ }
}

async function readString(key: string): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// loadCreditsSummary — lightweight read for the UI ticker.
// ---------------------------------------------------------------------------
export async function loadCreditsSummary(): Promise<CreditsSummary> {
  const [total, genesisTierRaw, lastSyncRaw] = await Promise.all([
    readInt(CREDITS_KEYS.total),
    readString(CREDITS_KEYS.genesisTier),
    readString(CREDITS_KEYS.lastSync),
  ]);

  const isGenesisTier = genesisTierRaw === 'true';
  const multiplier    = isGenesisTier ? CREDIT_RATES.genesisTierMultiplier : 1;
  const lastSyncAt    = lastSyncRaw ? parseInt(lastSyncRaw, 10) : null;

  return {
    total,
    isGenesisTier,
    multiplier,
    lastSyncAt: lastSyncAt && Number.isFinite(lastSyncAt) ? lastSyncAt : null,
  };
}

// ---------------------------------------------------------------------------
// awardCredits — the core earning function.
//
// Called by the heartbeat loop, the Proof of Origin minter, and the adapter
// registration flow. Returns the new total after the award.
// ---------------------------------------------------------------------------
export async function awardCredits(
  event: CreditEvent,
  /** For 'networkConnected', pass the adapter ID to enforce one-time bonus. */
  networkId?: string,
): Promise<number> {
  const [current, isGenesisTierRaw] = await Promise.all([
    readInt(CREDITS_KEYS.total),
    readString(CREDITS_KEYS.genesisTier),
  ]);

  const isGenesisTier = isGenesisTierRaw === 'true';
  const multiplier    = isGenesisTier ? CREDIT_RATES.genesisTierMultiplier : 1;

  let baseAmount = 0;

  switch (event) {
    case 'heartbeat':
      baseAmount = CREDIT_RATES.heartbeat;
      break;

    case 'sensorAttestation':
      baseAmount = CREDIT_RATES.sensorAttestation;
      break;

    case 'proofOfOrigin':
      baseAmount = CREDIT_RATES.proofOfOrigin;
      break;

    case 'dailyUptime': {
      // Only one daily bonus per calendar day.
      const lastBonus = await readString(CREDITS_KEYS.lastDailyBonus);
      const today = new Date().toISOString().slice(0, 10);
      if (lastBonus === today) return current; // already claimed today
      await SecureStore.setItemAsync(CREDITS_KEYS.lastDailyBonus, today).catch(() => {});
      baseAmount = CREDIT_RATES.dailyUptime;
      break;
    }

    case 'networkConnected': {
      if (!networkId) return current;
      const bonusRaw = await readString(CREDITS_KEYS.networksBonus);
      const bonusSet = new Set(bonusRaw ? bonusRaw.split(',') : []);
      if (bonusSet.has(networkId)) return current; // one-time only
      bonusSet.add(networkId);
      await SecureStore.setItemAsync(
        CREDITS_KEYS.networksBonus,
        Array.from(bonusSet).join(','),
      ).catch(() => {});
      baseAmount = CREDIT_RATES.networkConnected;
      break;
    }
  }

  const earned   = Math.floor(baseAmount * multiplier);
  const newTotal = current + earned;

  await writeInt(CREDITS_KEYS.total, newTotal);
  return newTotal;
}

// ---------------------------------------------------------------------------
// checkAndAwardDailyUptime — call once per session to award the daily bonus
// if 24h has passed since the last award. Safe to call multiple times.
// ---------------------------------------------------------------------------
export async function checkAndAwardDailyUptime(): Promise<void> {
  await awardCredits('dailyUptime');
}

// ---------------------------------------------------------------------------
// setGenesisTier — marks this node as Genesis Tier (2× multiplier).
// Should be called once after the server confirms the node is within the
// first GENESIS_TIER_CAP registrations.
// ---------------------------------------------------------------------------
export async function setGenesisTier(isGenesis: boolean): Promise<void> {
  try {
    await SecureStore.setItemAsync(
      CREDITS_KEYS.genesisTier,
      isGenesis ? 'true' : 'false',
    );
  } catch { /* non-critical */ }
}

// ---------------------------------------------------------------------------
// syncCreditsToKV — POST the current total to Cloudflare KV via
// /api/credits so credits survive device loss.
// Rate-limited to once per 30 minutes in app code — this function does
// not enforce the rate limit; the caller is responsible.
// ---------------------------------------------------------------------------
export async function syncCreditsToKV(
  nodeId: string,
  apiBase = 'https://getkinetik.app',
): Promise<boolean> {
  try {
    const total = await readInt(CREDITS_KEYS.total);
    const resp  = await fetch(`${apiBase}/api/credits`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nodeId, total }),
    });
    if (resp.ok) {
      await SecureStore.setItemAsync(
        CREDITS_KEYS.lastSync,
        String(Date.now()),
      ).catch(() => {});
      return true;
    }
    return false;
  } catch {
    return false;
  }
}
