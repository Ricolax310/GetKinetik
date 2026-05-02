// ============================================================================
// GeodnetAdapter — DepinAdapter implementation for the GEODNET Network.
// ----------------------------------------------------------------------------
// GEODNET turns GNSS reference stations into RTK-correction-earning nodes on
// Polygon. Station owners earn GEOD daily based on satellite count (SNR ≥ 32),
// online time, neighbor distance, and multipath quality (per GIP6, April 2025).
// Rewards are AUTO-DISTRIBUTED daily to the miner's Polygon wallet — no claim.
//
// REWARD CADENCE (geodnet.com/token.html):
//   · Daily on-chain deposit to the station's registered Polygon wallet.
//   · Max rewards halve annually on June 30:
//       Jul 2025 – Jun 2026: 12 GEOD/day (triple-band station)
//       Jul 2026 – Jun 2027: 6 GEOD/day
//   · Actual daily amount scales by RRR (Rolling Reward Rate) based on
//     effective satellite count, online time, multipath, and hex density.
//   · Deposit txs are verifiable at the GEOD Polygon contract address.
//
// INTEGRATION SHAPE: Polygon RPC only. Same pattern as DIMOAdapter:
//   1. User provides their Polygon wallet address (the one registered in the
//      GEODNET Console under Wallet settings).
//   2. Polygon eth_call → balanceOf(walletAddress) on the GEOD ERC-20 →
//      current settled balance (18 decimals).
//
// Because rewards auto-deposit daily, any positive balance delta between polls
// directly corresponds to GEOD earned since the last check.
//
// NO CUSTODY: GEOD lives in the user's Polygon wallet. GETKINETIK never
// touches it. We sign receipts for incremental balance deltas.
//
// GEOD TOKEN (Polygon mainnet):
//   Contract: 0xac0f66379a6d7801d7726d5a943356a172549adb
//   Decimals: 18 (standard ERC-20)
//   Also on: Solana (7JA5eZdCzztSfQbJvS8aVVxMFfd81Rs9VvwnocV1mKHu), IoTeX
//   Total supply: 1 billion GEOD
// ============================================================================

import { Alert, Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';

import { openWalletAddressPrompt } from '../../../src/lib/walletAddressPrompt';

import type {
  AdapterStatus,
  DepinAdapter,
  EarningSnapshot,
} from '../../kinetik-core/src/adapter';
import type { NodeIdentity } from '../../kinetik-core/src/identity';

// ----------------------------------------------------------------------------
// Constants.
// ----------------------------------------------------------------------------

/** GEOD ERC-20 contract on Polygon mainnet (primary mining reward chain). */
const GEOD_CONTRACT_ADDRESS = '0xac0f66379a6d7801d7726d5a943356a172549adb';

/** GEOD has 18 decimal places (standard ERC-20). */
const GEOD_DECIMALS = 18;
const GEOD_DIVISOR = BigInt(10 ** GEOD_DECIMALS);

/** Public Polygon RPC — same endpoint as DIMOAdapter, no API key required. */
const POLYGON_RPC_URL = 'https://polygon-rpc.com/';

/** GEODNET Console wallet settings — shown during registration. */
const GEODNET_CONSOLE_URL = 'https://console.geodnet.com';

/** SecureStore keys. */
const STORE_KEY_WALLET = 'kinetik.geodnet.wallet.v1';
const STORE_KEY_LAST_BALANCE = 'kinetik.geodnet.lastBalance.v1';

// ----------------------------------------------------------------------------
// Polygon eth_call — balanceOf(address).
// Identical encoding to DIMOAdapter (same chain, same standard).
// Selector: keccak256("balanceOf(address)")[:4] = 0x70a08231
// ----------------------------------------------------------------------------

function encodeBalanceOfCall(walletAddress: string): string {
  const addr = walletAddress.toLowerCase().replace('0x', '').padStart(64, '0');
  return `0x70a08231${addr}`;
}

async function fetchGeodBalance(walletAddress: string): Promise<number | null> {
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
            to: GEOD_CONTRACT_ADDRESS,
            data: encodeBalanceOfCall(walletAddress),
          },
          'latest',
        ],
      }),
    });

    if (!response.ok) return null;

    const json = await response.json() as { result?: string; error?: unknown };
    if (!json.result || json.result === '0x') return 0;

    const raw = BigInt(json.result);
    const whole = raw / GEOD_DIVISOR;
    const remainder = raw % GEOD_DIVISOR;
    const fraction = Number(remainder) / Number(GEOD_DIVISOR);
    return Number(whole) + fraction;
  } catch {
    return null;
  }
}

// ----------------------------------------------------------------------------
// Wallet capture — iOS Alert.prompt; Android uses openWalletAddressPrompt.
// ----------------------------------------------------------------------------

function promptForWallet(): Promise<string | null> {
  return new Promise((resolve) => {
    if (Platform.OS === 'ios') {
      Alert.prompt(
        'Connect GEODNET Wallet',
        'Enter your Polygon wallet address to track GEOD earnings.\n\nThis is the wallet registered in your GEODNET Console under "Wallet".',
        [
          { text: 'Cancel', onPress: () => resolve(null), style: 'cancel' },
          {
            text: 'Connect',
            onPress: (address?: string) => {
              const trimmed = address?.trim() ?? '';
              if (/^0x[0-9a-fA-F]{40}$/.test(trimmed)) {
                resolve(trimmed);
              } else {
                Alert.alert(
                  'Invalid Address',
                  'That does not look like a Polygon wallet address (0x + 40 hex chars). Please check and try again.',
                );
                resolve(null);
              }
            },
          },
        ],
        'plain-text',
        '',
      );
    } else {
      void openWalletAddressPrompt({
        title: 'Connect GEODNET Wallet',
        message:
          'Enter your Polygon wallet address to track GEOD earnings.\n\nThis is the wallet registered in your GEODNET Console under Wallet.',
        placeholder: '0x… (42 characters)',
        validate: (trimmed) => {
          if (/^0x[0-9a-fA-F]{40}$/.test(trimmed)) return null;
          return 'Use a Polygon address: 0x plus 40 hex characters.';
        },
      }).then(resolve);
    }
  });
}

// ----------------------------------------------------------------------------
// GeodnetAdapter.
// ----------------------------------------------------------------------------

class GeodnetAdapter implements DepinAdapter {
  readonly id = 'geodnet';
  readonly displayName = 'GEODNET';
  readonly description = 'GNSS reference station network. Earn GEOD daily for RTK correction data on Polygon.';
  readonly currency = 'GEOD';

  private walletAddress: string | null = null;
  private lastEarnedAt: number | null = null;

  // --------------------------------------------------------------------------
  // isAvailable — true on iOS + Android; pure Polygon RPC, no native SDK.
  // --------------------------------------------------------------------------

  async isAvailable(): Promise<boolean> {
    return Platform.OS === 'ios' || Platform.OS === 'android';
  }

  // --------------------------------------------------------------------------
  // getStatus — checks SecureStore for a persisted wallet address.
  // --------------------------------------------------------------------------

  async getStatus(): Promise<AdapterStatus> {
    const addr = await this._loadStoredWallet();
    if (!addr) return { state: 'unregistered' };

    this.walletAddress = addr;
    if (this.lastEarnedAt) {
      return { state: 'earning', externalNodeId: addr, lastEarnedAt: this.lastEarnedAt };
    }
    return { state: 'registered', externalNodeId: addr };
  }

  // --------------------------------------------------------------------------
  // register — opens GEODNET Console so user can confirm their wallet, then
  // prompts for the Polygon wallet address.
  // --------------------------------------------------------------------------

  async register(_identity: NodeIdentity): Promise<AdapterStatus> {
    if (Platform.OS === 'android') {
      void WebBrowser.openBrowserAsync(GEODNET_CONSOLE_URL).catch(() => {});
    } else {
      try {
        await WebBrowser.openBrowserAsync(GEODNET_CONSOLE_URL);
      } catch {
        // Browser unavailable — proceed to prompt.
      }
    }

    const addr = await promptForWallet();
    if (!addr) return { state: 'unregistered' };

    await SecureStore.setItemAsync(STORE_KEY_WALLET, addr).catch(() => {});
    this.walletAddress = addr;

    return { state: 'registered', externalNodeId: addr };
  }

  // --------------------------------------------------------------------------
  // unregister — clears SecureStore.
  // --------------------------------------------------------------------------

  async unregister(): Promise<void> {
    await SecureStore.deleteItemAsync(STORE_KEY_WALLET).catch(() => {});
    await SecureStore.deleteItemAsync(STORE_KEY_LAST_BALANCE).catch(() => {});
    this.walletAddress = null;
    this.lastEarnedAt = null;
  }

  // --------------------------------------------------------------------------
  // pollEarnings — Polygon eth_call balanceOf() on the GEOD ERC-20.
  // GEOD auto-deposits daily, so any balance increase is earned GEOD.
  // --------------------------------------------------------------------------

  async pollEarnings(): Promise<EarningSnapshot> {
    const addr = this.walletAddress ?? (await this._loadStoredWallet());
    const cached = await this._loadCachedBalance();

    if (!addr) {
      return {
        source: this.id,
        currency: this.currency,
        pendingGross: 0,
        lifetimeGross: 0,
        lastEarnedAt: null,
      };
    }

    const balance = await fetchGeodBalance(addr);
    if (balance === null) {
      return {
        source: this.id,
        currency: this.currency,
        pendingGross: 0,
        lifetimeGross: cached ?? 0,
        lastEarnedAt: this.lastEarnedAt,
        externalRef: `geodnet:wallet:${addr.slice(0, 10)}`,
      };
    }

    if (cached !== null && balance > cached) {
      this.lastEarnedAt = Date.now();
    }

    await SecureStore.setItemAsync(STORE_KEY_LAST_BALANCE, String(balance)).catch(() => {});

    return {
      source: this.id,
      currency: this.currency,
      pendingGross: Math.max(0, balance - (cached ?? 0)),
      lifetimeGross: balance,
      lastEarnedAt: this.lastEarnedAt,
      externalRef: `geodnet:wallet:${addr.slice(0, 10)}`,
    };
  }

  // --------------------------------------------------------------------------
  // claim — not implemented. GEOD auto-deposits daily to the registered wallet.
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

// Singleton — imported by VaultPanel.
export const geodnetAdapter = new GeodnetAdapter();
