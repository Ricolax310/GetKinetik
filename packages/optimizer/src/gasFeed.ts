// ============================================================================
// gasFeed.ts — Polygon + Base gas price polling via public JSON-RPC.
// ----------------------------------------------------------------------------
// Used by the scorer to determine whether it is worth triggering a claim()
// on adapters that require an on-chain transaction. The decision rule is:
//
//   claimable only when pendingEarningsUsd > gasCostUsd × 5
//
// This means users save at least 80% of the claim value in gas, matching
// the "15–30% saved per claim" estimate in the plan. The 5× threshold is
// conservative and tunable via CLAIM_GAS_RATIO in scorer.ts.
//
// Two chains are polled because different adapters settle on different chains:
//   · Polygon PoS   — DIMO
//   · Base          — WeatherXM, Geodnet (planned), potential future adapters
//   · Solana        — Hivemapper (HONEY) — Solana fees are near-zero, skipped
//   · Nodle Parachain — auto-deposit, no claim step, skipped
//
// Public endpoints — no API key required, no rate limiting concern at our
// polling frequency (once per 2 minutes).
// ============================================================================

/** A single chain's current gas price. */
export type GasPrice = {
  /** Which chain this reading is for. */
  chain: 'polygon' | 'base';
  /** Gas price in gwei (10^9 wei). */
  gweiPrice: number;
  /** Approximate USD cost for a simple ERC-20 transfer (21,000 gas). */
  simpleTransferUsd: number;
  /** Unix ms timestamp of this reading. */
  fetchedAt: number;
};

export type GasFeedResult = {
  prices: GasPrice[];
  fromCache: boolean;
  fromFallback: boolean;
  fetchedAt: number;
};

// ---------------------------------------------------------------------------
// Chain config.
// ---------------------------------------------------------------------------
const CHAINS = [
  {
    chain: 'polygon' as const,
    rpc: 'https://polygon-rpc.com',
    // ETH price on Polygon is POL (~$0.50 range). We approximate using a
    // fixed POL price since fetching a second price adds latency. The scorer
    // uses this purely for order-of-magnitude decisions, not exact accounting.
    nativeTokenUsd: 0.50,
  },
  {
    chain: 'base' as const,
    rpc: 'https://mainnet.base.org',
    // Base uses ETH as gas token. Approximated here — priceFeed can supply
    // a more accurate value if ETH is added to COIN_ID_MAP in the future.
    nativeTokenUsd: 3000,
  },
];

const SIMPLE_TRANSFER_GAS = 21_000;
const CACHE_TTL_MS         = 2 * 60_000; // 2 minutes (gas changes faster than prices)
const FETCH_TIMEOUT        = 5_000;

let _cache: GasFeedResult | null = null;

// ---------------------------------------------------------------------------
// fetchGasPrice — single chain eth_gasPrice RPC call.
// Returns gwei price or null on failure.
// ---------------------------------------------------------------------------
async function fetchGasPrice(
  rpcUrl: string,
  nativeTokenUsd: number,
): Promise<{ gweiPrice: number; simpleTransferUsd: number } | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    const resp = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_gasPrice',
        params: [],
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!resp.ok) return null;

    const json = await resp.json() as { result?: string; error?: unknown };
    if (json.error || !json.result) return null;

    // result is '0x...' hex string representing wei.
    const weiPrice = parseInt(json.result, 16);
    if (!Number.isFinite(weiPrice) || weiPrice <= 0) return null;

    const gweiPrice = weiPrice / 1e9;
    // Cost = gas × gasPrice × nativeTokenUsd, converted from wei to ETH/POL.
    const simpleTransferUsd =
      (SIMPLE_TRANSFER_GAS * weiPrice * nativeTokenUsd) / 1e18;

    return { gweiPrice, simpleTransferUsd };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// fetchGasPrices — poll all chains, return cached result if fresh.
// ---------------------------------------------------------------------------
export async function fetchGasPrices(): Promise<GasFeedResult> {
  const now = Date.now();

  if (_cache && now - _cache.fetchedAt < CACHE_TTL_MS) {
    return { ..._cache, fromCache: true };
  }

  const results = await Promise.allSettled(
    CHAINS.map(async ({ chain, rpc, nativeTokenUsd }) => {
      const data = await fetchGasPrice(rpc, nativeTokenUsd);
      if (!data) return null;
      const price: GasPrice = {
        chain,
        gweiPrice: data.gweiPrice,
        simpleTransferUsd: data.simpleTransferUsd,
        fetchedAt: now,
      };
      return price;
    }),
  );

  const prices: GasPrice[] = [];
  for (const r of results) {
    if (r.status === 'fulfilled' && r.value) prices.push(r.value);
  }

  // If we got nothing from the API and have a stale cache, use it.
  if (prices.length === 0 && _cache) {
    return { ..._cache, fromCache: true, fromFallback: true };
  }

  // Fill in missing chains with conservative defaults so the scorer
  // always has a value to work with.
  const presentChains = new Set(prices.map((p) => p.chain));
  if (!presentChains.has('polygon')) {
    prices.push({
      chain: 'polygon',
      gweiPrice: 50,             // conservative default
      simpleTransferUsd: 0.003,  // ~$0.003 per simple transfer at 50 gwei
      fetchedAt: 0,              // stale sentinel
    });
  }
  if (!presentChains.has('base')) {
    prices.push({
      chain: 'base',
      gweiPrice: 0.1,            // Base is very cheap
      simpleTransferUsd: 0.0002,
      fetchedAt: 0,
    });
  }

  const result: GasFeedResult = {
    prices,
    fromCache: false,
    fromFallback: prices.some((p) => p.fetchedAt === 0),
    fetchedAt: now,
  };
  _cache = result;
  return result;
}

/** Get the gas price for a specific chain from the current cache.
 *  Returns a conservative default if no cache entry exists. */
export function getCachedGasPrice(chain: 'polygon' | 'base'): GasPrice {
  const cached = _cache?.prices.find((p) => p.chain === chain);
  if (cached) return cached;
  // Conservative defaults — lean toward NOT claiming.
  return {
    chain,
    gweiPrice: chain === 'polygon' ? 50 : 0.1,
    simpleTransferUsd: chain === 'polygon' ? 0.003 : 0.0002,
    fetchedAt: 0,
  };
}

export function invalidateGasCache(): void {
  _cache = null;
}
