// ============================================================================
// WeatherXMAdapter — DepinAdapter implementation for the WeatherXM Network.
// ----------------------------------------------------------------------------
// WeatherXM turns personal weather stations into data-earning nodes on
// Arbitrum One. Station owners earn $WXM daily based on data quality (QoD
// score) and proof of location (PoL score). Rewards accumulate in a
// RewardPool smart contract via daily Merkle tree submissions; station owners
// must manually claim — they are NOT auto-transferred to the wallet.
//
// REWARD MECHANISM (docs.weatherxm.com/rewards/reward-mechanism):
//   · Daily: reward algorithm runs, creates Merkle tree, submits root hash
//     to RewardPool contract on Arbitrum One.
//   · User claims anytime via WeatherXM app or claim.weatherxm.com.
//     Any unclaimed WXM sits in the RewardPool until claimed.
//   · Claimed WXM lands in the user's Arbitrum One wallet (ERC-20 transfer).
//   · Eligibility: station must have QoD > threshold, PoL > threshold,
//     and an active wallet connected.
//
// INTEGRATION SHAPE: Arbitrum One RPC only. No native SDK, no native module.
//   1. User provides their Arbitrum One wallet address (Alert.prompt on iOS,
//      informational fallback on Android — same pattern as Hivemapper).
//   2. Arbitrum eth_call → balanceOf(walletAddress) on the WXM ERC-20 →
//      current CLAIMED balance (18 decimals).
//
// NOTE ON UNCLAIMED REWARDS: The allocated-but-unclaimed balance lives in the
// RewardPool contract and requires a Merkle proof to read accurately. For v0
// we read the wallet's settled WXM balance (post-claim). The allocatedGross
// field is marked zero until a WeatherXM API integration is added in a future
// session. This is the conservative approach — we never over-report earnings.
//
// DIFFERENCE FROM DIMO: WXM requires a manual claim (it does not
// auto-distribute). Users must claim via the WeatherXM app first, then
// GETKINETIK records the settled balance delta as a signed earning.
//
// NO CUSTODY: WXM lives in the user's Arbitrum wallet. GETKINETIK never
// touches it. We sign receipts for incremental balance deltas post-claim.
//
// WXM TOKEN (Arbitrum One):
//   Contract: 0xB6093B61544572Ab42A0E43AF08aBaFD41bf25A6
//   Decimals: 18 (standard ERC-20)
//   Also on: Base (0xf4bdd7042f4ea505838c2d432c787beb9f603274), Ethereum
//   Claim dApp: https://claim.weatherxm.com
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

/** WXM ERC-20 contract on Arbitrum One (primary reward chain). */
const WXM_CONTRACT_ADDRESS = '0xB6093B61544572Ab42A0E43AF08aBaFD41bf25A6';

/** WXM has 18 decimal places (standard ERC-20). */
const WXM_DECIMALS = 18;
const WXM_DIVISOR = BigInt(10 ** WXM_DECIMALS);

/** Public Arbitrum One RPC — no API key required for balanceOf(). */
const ARBITRUM_RPC_URL = 'https://arb1.arbitrum.io/rpc';

/** WeatherXM claim dApp — opened during registration so the user can claim first. */
const WXM_CLAIM_URL = 'https://claim.weatherxm.com';

/** SecureStore keys. */
const STORE_KEY_WALLET = 'kinetik.weatherxm.wallet.v1';
const STORE_KEY_LAST_BALANCE = 'kinetik.weatherxm.lastBalance.v1';

// ----------------------------------------------------------------------------
// Arbitrum eth_call — balanceOf(address).
// Standard ERC-20 balanceOf encoding, identical to the DIMO Polygon call.
// Selector: keccak256("balanceOf(address)")[:4] = 0x70a08231
// Argument: address zero-padded to 32 bytes.
// ----------------------------------------------------------------------------

function encodeBalanceOfCall(walletAddress: string): string {
  const addr = walletAddress.toLowerCase().replace('0x', '').padStart(64, '0');
  return `0x70a08231${addr}`;
}

async function fetchWxmBalance(walletAddress: string): Promise<number | null> {
  try {
    const response = await fetch(ARBITRUM_RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_call',
        params: [
          {
            to: WXM_CONTRACT_ADDRESS,
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
    const whole = raw / WXM_DIVISOR;
    const remainder = raw % WXM_DIVISOR;
    const fraction = Number(remainder) / Number(WXM_DIVISOR);
    return Number(whole) + fraction;
  } catch {
    return null;
  }
}

// ----------------------------------------------------------------------------
// Wallet address capture — iOS Alert.prompt; Android uses openWalletAddressPrompt.
// ----------------------------------------------------------------------------

function promptForWallet(): Promise<string | null> {
  return new Promise((resolve) => {
    if (Platform.OS === 'ios') {
      Alert.prompt(
        'Connect WeatherXM Wallet',
        'Enter your Arbitrum One wallet address to track WXM earnings.\n\nThis is the wallet linked to your WeatherXM station.',
        [
          { text: 'Cancel', onPress: () => resolve(null), style: 'cancel' },
          {
            text: 'Connect',
            onPress: (address?: string) => {
              const trimmed = address?.trim() ?? '';
              // Basic EVM address sanity: 0x + 40 hex chars = 42 total
              if (/^0x[0-9a-fA-F]{40}$/.test(trimmed)) {
                resolve(trimmed);
              } else {
                Alert.alert(
                  'Invalid Address',
                  'That does not look like an Arbitrum wallet address (0x + 40 hex chars). Please check and try again.',
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
        title: 'Connect WeatherXM Wallet',
        message:
          'Enter your Arbitrum One wallet address to track WXM earnings.\n\nThis is the wallet linked to your WeatherXM station.',
        placeholder: '0x… (42 characters)',
        validate: (trimmed) => {
          if (/^0x[0-9a-fA-F]{40}$/.test(trimmed)) return null;
          return 'Use an Arbitrum address: 0x plus 40 hex characters.';
        },
      }).then(resolve);
    }
  });
}

// ----------------------------------------------------------------------------
// WeatherXMAdapter.
// ----------------------------------------------------------------------------

class WeatherXMAdapter implements DepinAdapter {
  readonly id = 'weatherxm';
  readonly displayName = 'WeatherXM';
  readonly description = 'Personal weather station network. Earn WXM daily for quality data on Arbitrum.';
  readonly currency = 'WXM';

  private walletAddress: string | null = null;
  private lastEarnedAt: number | null = null;

  // --------------------------------------------------------------------------
  // isAvailable — true on iOS + Android; pure RPC, no native SDK.
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
  // register — opens WeatherXM claim dApp, then prompts for wallet address.
  // We open the claim dApp first so the user can claim pending rewards before
  // GETKINETIK records their settled balance as a starting watermark.
  // --------------------------------------------------------------------------

  async register(_identity: NodeIdentity): Promise<AdapterStatus> {
    if (Platform.OS === 'android') {
      void WebBrowser.openBrowserAsync(WXM_CLAIM_URL).catch(() => {});
    } else {
      try {
        await WebBrowser.openBrowserAsync(WXM_CLAIM_URL);
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
  // pollEarnings — Arbitrum eth_call balanceOf() on the WXM ERC-20.
  // Records deltas in the settled (post-claim) balance. Because WXM is
  // manually claimed, a balance increase = the user just claimed and the
  // tokens hit the wallet. We sign that delta as an earning entry.
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

    const balance = await fetchWxmBalance(addr);
    if (balance === null) {
      return {
        source: this.id,
        currency: this.currency,
        pendingGross: 0,
        lifetimeGross: cached ?? 0,
        lastEarnedAt: this.lastEarnedAt,
        externalRef: `weatherxm:wallet:${addr.slice(0, 10)}`,
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
      externalRef: `weatherxm:wallet:${addr.slice(0, 10)}`,
    };
  }

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
export const weatherxmAdapter = new WeatherXMAdapter();
