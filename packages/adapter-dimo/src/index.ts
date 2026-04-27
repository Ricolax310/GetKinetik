// ============================================================================
// DIMOAdapter — DepinAdapter implementation for the DIMO Network.
// ----------------------------------------------------------------------------
// DIMO turns vehicles into data-earning nodes on Polygon. Vehicle owners earn
// weekly $DIMO distributions from the DIMO Baseline Issuance pool (~600K DIMO/
// week as of 2026, decreasing 15% annually) based on connection quality,
// streak level, and staking boost. Rewards auto-transfer to the user's Polygon
// wallet every Monday at 5 AM UTC — no manual claim.
//
// INTEGRATION SHAPE: API-only. No native SDK, no native module, no EAS build
// required. The entire integration is:
//   1. "Login with DIMO" OAuth via expo-web-browser → gets user's Polygon
//      wallet address (the address that owns their Vehicle NFTs and receives
//      DIMO rewards).
//   2. Polygon eth_call → balanceOf(walletAddress) on the $DIMO ERC-20
//      contract → current balance in wei (18 decimals).
//
// DIFFERENCE FROM NODLE: GETKINETIK is an earnings READER for DIMO, not an
// earnings GENERATOR. The user must already have a DIMO account and a
// connected vehicle. We read and sign what DIMO already distributes.
// This is the Plaid pattern — Plaid reads bank balances; we read DIMO balances.
//
// NO CUSTODY: $DIMO lives in the user's Polygon wallet. GETKINETIK never
// touches it. We sign receipts for incremental balance deltas.
//
// RESEARCH: See packages/adapter-dimo/RESEARCH.md for full developer surface
// analysis — auth flow, token contract, reward cadence, license registration.
//
// CREDENTIALS (console.dimo.org/license/986):
//   client_id: 0x6eF481b692a4b0bC930c1B971EBDA4402c73725D
//   redirect_uri: getkinetik.app
// ============================================================================

import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

import type {
  AdapterStatus,
  DepinAdapter,
  EarningSnapshot,
} from '../../kinetik-core/src/adapter';
import type { NodeIdentity } from '../../kinetik-core/src/identity';
import { DIMO_CLIENT_ID, DIMO_REDIRECT_URI } from '../config';

// ----------------------------------------------------------------------------
// Constants.
// ----------------------------------------------------------------------------

/** $DIMO ERC-20 token contract on Polygon mainnet. */
const DIMO_TOKEN_ADDRESS = '0xE261D618a959aFfFd53168Cd07D12E37B26761db';

/** $DIMO has 18 decimal places (standard ERC-20). */
const DIMO_DECIMALS = 18;
const DIMO_DIVISOR = BigInt(10 ** DIMO_DECIMALS);

/** Public Polygon RPC — no API key required for balanceOf(). */
const POLYGON_RPC_URL = 'https://polygon-rpc.com/';

/** DIMO auth endpoint — drives the "Login with DIMO" OAuth consent flow. */
const DIMO_AUTH_URL = 'https://accounts.dimo.org';

/** SecureStore keys. */
const STORE_KEY_WALLET = 'kinetik.dimo.wallet.v1';
const STORE_KEY_LAST_BALANCE = 'kinetik.dimo.lastBalance.v1';

// ----------------------------------------------------------------------------
// Polygon balanceOf() helper.
// Standard eth_call encoding for ERC-20 balanceOf(address):
//   function selector: keccak256("balanceOf(address)")[:4] = 0x70a08231
//   argument: address zero-padded to 32 bytes
// ----------------------------------------------------------------------------

function encodeBalanceOfCall(walletAddress: string): string {
  const addr = walletAddress.toLowerCase().replace('0x', '').padStart(64, '0');
  return `0x70a08231${addr}`;
}

async function fetchDimoBalance(walletAddress: string): Promise<number | null> {
  try {
    const response = await fetch(POLYGON_RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_call',
        params: [
          {
            to: DIMO_TOKEN_ADDRESS,
            data: encodeBalanceOfCall(walletAddress),
          },
          'latest',
        ],
      }),
    });

    if (!response.ok) return null;

    const json = await response.json() as { result?: string; error?: unknown };
    if (!json.result || json.result === '0x') return 0;

    // result is a hex-encoded uint256 (wei units, 18 decimals)
    const raw = BigInt(json.result);
    // Convert to DIMO with 6dp precision to avoid BigInt/float mismatch
    const whole = raw / DIMO_DIVISOR;
    const remainder = raw % DIMO_DIVISOR;
    const fraction = Number(remainder) / Number(DIMO_DIVISOR);
    return Number(whole) + fraction;
  } catch {
    return null;
  }
}

// ----------------------------------------------------------------------------
// "Login with DIMO" — OAuth redirect via expo-web-browser.
// Opens accounts.dimo.org in a browser tab. On success, DIMO redirects to
// getkinetik.app with the user's wallet address as a query param.
//
// In the stub phase (before deep-link handling is implemented), we open the
// browser and extract walletAddress from the redirect URL returned by
// WebBrowser.openAuthSessionAsync. This works in Expo Go and in production
// builds without any additional native config.
// ----------------------------------------------------------------------------

async function loginWithDimo(): Promise<string | null> {
  try {
    const authUrl =
      `${DIMO_AUTH_URL}?` +
      `client_id=${DIMO_CLIENT_ID}` +
      `&redirect_uri=${encodeURIComponent(`https://${DIMO_REDIRECT_URI}`)}` +
      `&response_type=code` +
      `&scope=openid+email+profile`;

    const result = await WebBrowser.openAuthSessionAsync(
      authUrl,
      `https://${DIMO_REDIRECT_URI}`,
    );

    if (result.type !== 'success') return null;

    // Extract wallet address from the redirect URL params.
    // DIMO returns: ?wallet=0x...&code=...&email=...
    const url = new URL(result.url);
    const wallet = url.searchParams.get('wallet') ?? url.searchParams.get('walletAddress');
    if (wallet && /^0x[0-9a-fA-F]{40}$/.test(wallet)) return wallet;

    // Fallback: if no wallet param, the user authenticated but we need to
    // query the DIMO Identity API with the code. For v0, store null and let
    // the user try again — the balance query path will still work if they
    // paste their wallet address manually in a future UI flow.
    return null;
  } catch {
    return null;
  }
}

// ----------------------------------------------------------------------------
// DIMOAdapter — the DepinAdapter implementation.
// ----------------------------------------------------------------------------

export class DIMOAdapter implements DepinAdapter {
  readonly id = 'dimo';
  readonly displayName = 'DIMO';
  readonly description = 'Vehicle data earnings';
  readonly currency = 'DIMO';

  private walletAddress: string | null = null;
  private lastKnownBalance = 0;
  private lastEarnedAt: number | null = null;

  // --------------------------------------------------------------------------
  // isAvailable — DIMO works on both iOS and Android (pure REST, no native SDK)
  // --------------------------------------------------------------------------
  async isAvailable(): Promise<boolean> {
    return Platform.OS === 'ios' || Platform.OS === 'android';
  }

  // --------------------------------------------------------------------------
  // getStatus — reads the persisted Polygon wallet address.
  // --------------------------------------------------------------------------
  async getStatus(): Promise<AdapterStatus> {
    const stored = await this._loadStoredWallet();
    if (!stored) return { state: 'unregistered' };

    this.walletAddress = stored;

    if (this.lastEarnedAt !== null) {
      return {
        state: 'earning',
        externalNodeId: stored,
        lastEarnedAt: this.lastEarnedAt,
      };
    }
    return { state: 'registered', externalNodeId: stored };
  }

  // --------------------------------------------------------------------------
  // register — drives "Login with DIMO" OAuth, extracts the user's Polygon
  // wallet address, and persists it. The NodeIdentity is accepted for interface
  // compatibility but not used — DIMO identity is the user's Polygon wallet,
  // not their GETKINETIK Ed25519 key.
  // --------------------------------------------------------------------------
  async register(_identity: NodeIdentity): Promise<AdapterStatus> {
    const wallet = await loginWithDimo();

    if (!wallet) {
      // OAuth was cancelled or wallet param not returned — stay unregistered.
      return { state: 'unregistered' };
    }

    this.walletAddress = wallet;
    await SecureStore.setItemAsync(STORE_KEY_WALLET, wallet);

    console.log('[dimo] registered — wallet:', wallet.slice(0, 10) + '…');
    return { state: 'registered', externalNodeId: wallet };
  }

  // --------------------------------------------------------------------------
  // unregister — clears persisted wallet address.
  // --------------------------------------------------------------------------
  async unregister(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(STORE_KEY_WALLET);
      await SecureStore.deleteItemAsync(STORE_KEY_LAST_BALANCE);
    } catch {
      // ignore
    }
    this.walletAddress = null;
    this.lastKnownBalance = 0;
    this.lastEarnedAt = null;
  }

  // --------------------------------------------------------------------------
  // pollEarnings — reads $DIMO balance via Polygon eth_call.
  //
  // DIMO distributes weekly on Mondays. Balance is effectively stable 6 days/
  // week and then ticks up. The 60-second poll loop in AggregatorPanel will
  // catch the Monday distribution within one minute of it landing.
  // --------------------------------------------------------------------------
  async pollEarnings(): Promise<EarningSnapshot> {
    const source = this.id;
    const currency = this.currency;

    const addr = this.walletAddress ?? await this._loadStoredWallet();
    if (!addr) {
      return { source, currency, pendingGross: 0, lifetimeGross: 0, lastEarnedAt: null };
    }

    const balance = await fetchDimoBalance(addr);

    if (balance !== null) {
      if (balance > this.lastKnownBalance && balance > 0) {
        this.lastEarnedAt = Date.now();
      }
      this.lastKnownBalance = balance;
      void SecureStore.setItemAsync(STORE_KEY_LAST_BALANCE, String(balance)).catch(() => {});
    } else {
      // Load cached value on failure.
      const cached = await this._loadCachedBalance();
      if (cached !== null) this.lastKnownBalance = cached;
    }

    return {
      source,
      currency,
      pendingGross: this.lastKnownBalance,
      lifetimeGross: this.lastKnownBalance, // SubQuery lifetime query in Session G
      lastEarnedAt: this.lastEarnedAt,
      externalRef: addr ? `dimo:wallet:${addr.slice(0, 10)}` : undefined,
    };
  }

  // --------------------------------------------------------------------------
  // claim — not implemented. DIMO auto-distributes weekly; no manual claim.
  // --------------------------------------------------------------------------

  // --------------------------------------------------------------------------
  // Private helpers.
  // --------------------------------------------------------------------------

  private async _loadStoredWallet(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(STORE_KEY_WALLET);
    } catch {
      return null;
    }
  }

  private async _loadCachedBalance(): Promise<number | null> {
    try {
      const raw = await SecureStore.getItemAsync(STORE_KEY_LAST_BALANCE);
      if (!raw) return null;
      const n = parseFloat(raw);
      return Number.isFinite(n) ? n : null;
    } catch {
      return null;
    }
  }
}

// Singleton — imported by AggregatorPanel.
export const dimoAdapter = new DIMOAdapter();
