// ============================================================================
// priceFeed.ts — CoinGecko free-tier token price fetcher with 5-min cache.
// ----------------------------------------------------------------------------
// Fetches USD prices for every DePIN token GETKINETIK tracks. Cached for
// 5 minutes so repeated calls (e.g. from every AdapterCard poll cycle) hit
// the network at most once per window.
//
// Falls back to the last known prices if CoinGecko is down or rate-limited.
// The fallback is intentionally stale-but-safe: the optimizer will
// UNDER-estimate USD value when stale, leading to conservative (no-claim)
// decisions rather than aggressive (over-claim) ones. The safer failure mode.
//
// CoinGecko free endpoint — no API key required, 10–50 req/min:
//   https://api.coingecko.com/api/v3/simple/price?ids=...&vs_currencies=usd
//
// Token → CoinGecko ID mapping is explicit and pinned here so a CoinGecko
// ID change doesn't silently drop a currency to $0.
// ============================================================================

/** A single token's USD price with metadata. */
export type TokenPrice = {
  /** Adapter currency symbol, e.g. 'NODL'. */
  symbol: string;
  /** CoinGecko coin ID used for the API call. */
  coinId: string;
  /** USD price per 1 token unit. 0 if unknown. */
  usd: number;
  /** Unix ms timestamp of when this price was fetched. */
  fetchedAt: number;
};

/** Full result from one fetchTokenPrices() call. */
export type PriceFeedResult = {
  /** Map from currency symbol → TokenPrice. */
  prices: Record<string, TokenPrice>;
  /** True if the data came from the in-memory cache, not a fresh API call. */
  fromCache: boolean;
  /** True if the API call failed and we returned the last known prices. */
  fromFallback: boolean;
  /** Unix ms of this result. */
  fetchedAt: number;
};

// ----------------------------------------------------------------------------
// CoinGecko ID mapping — every adapter currency that GETKINETIK tracks.
// Keeping this explicit and readable (not dynamically derived) so a typo
// or a CoinGecko rename is obvious at code-review time.
// ----------------------------------------------------------------------------
const COIN_ID_MAP: Record<string, string> = {
  NODL:  'nodle-network',
  HONEY: 'hivemapper',
  DIMO:  'dimo',
  WXM:   'weatherxm',
  GEOD:  'geodnet',
};

const COINGECKO_BASE = 'https://api.coingecko.com/api/v3/simple/price';
const CACHE_TTL_MS   = 5 * 60_000; // 5 minutes
const FETCH_TIMEOUT  = 8_000;       // 8 second hard timeout

// In-memory cache — survives for the lifetime of the app session.
// Each entry is a full PriceFeedResult keyed by the sorted currency list.
let _cache: PriceFeedResult | null = null;

// ---------------------------------------------------------------------------
// fetchTokenPrices — the public entry point.
//
// `currencies` is the list of adapter currency symbols to look up, e.g.
// ['NODL', 'HONEY', 'DIMO']. Symbols not in COIN_ID_MAP are silently skipped
// (they will not appear in the result prices map) — this avoids blowing up
// on a new adapter whose token isn't indexed yet.
// ---------------------------------------------------------------------------
export async function fetchTokenPrices(
  currencies: string[],
): Promise<PriceFeedResult> {
  const now = Date.now();

  // Return cached result if it is fresh enough.
  if (_cache && now - _cache.fetchedAt < CACHE_TTL_MS) {
    return { ..._cache, fromCache: true };
  }

  // Build the CoinGecko IDs list from the requested currencies.
  const ids = currencies
    .map((c) => COIN_ID_MAP[c.toUpperCase()])
    .filter(Boolean);

  if (ids.length === 0) {
    // No recognisable currencies — return empty result.
    const empty: PriceFeedResult = {
      prices: {},
      fromCache: false,
      fromFallback: false,
      fetchedAt: now,
    };
    return empty;
  }

  const url = `${COINGECKO_BASE}?ids=${ids.join(',')}&vs_currencies=usd`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    const resp = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!resp.ok) throw new Error(`CoinGecko HTTP ${resp.status}`);

    const data = await resp.json() as Record<string, { usd?: number }>;

    const prices: Record<string, TokenPrice> = {};
    for (const [symbol, coinId] of Object.entries(COIN_ID_MAP)) {
      const raw = data[coinId];
      const usd = raw?.usd ?? 0;
      prices[symbol] = { symbol, coinId, usd, fetchedAt: now };
    }

    const result: PriceFeedResult = {
      prices,
      fromCache: false,
      fromFallback: false,
      fetchedAt: now,
    };
    _cache = result;
    return result;
  } catch {
    // API failure — return cached (possibly stale) data if available.
    if (_cache) {
      return { ..._cache, fromCache: true, fromFallback: true };
    }
    // No cache at all — return zeros so the optimizer degrades gracefully.
    const fallback: Record<string, TokenPrice> = {};
    for (const [symbol, coinId] of Object.entries(COIN_ID_MAP)) {
      fallback[symbol] = { symbol, coinId, usd: 0, fetchedAt: 0 };
    }
    return {
      prices: fallback,
      fromCache: false,
      fromFallback: true,
      fetchedAt: now,
    };
  }
}

/** Synchronous lookup of a single token's USD price from the current cache.
 *  Returns 0 if the cache is empty or the symbol is unknown. */
export function getCachedPrice(symbol: string): number {
  return _cache?.prices[symbol.toUpperCase()]?.usd ?? 0;
}

/** Clear the in-memory price cache — useful for testing. */
export function invalidatePriceCache(): void {
  _cache = null;
}
