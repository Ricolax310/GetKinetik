// ============================================================================
// HivemapperAdapter — DepinAdapter implementation for the Hivemapper Network.
// ----------------------------------------------------------------------------
// Hivemapper turns dashcams into map-earning nodes on Solana. Contributors
// earn HONEY weekly from the minted rewards pool (~proportional to coverage
// quality, freshness, and region progress). Rewards are auto-minted to the
// contributor's Solana wallet — no manual claim required.
//
// REWARD TYPES (from docs.hivemapper.com/honey-token/earning-honey/reward-types):
//   · Map Coverage (80.5%) — weekly mint based on quality + freshness
//   · Map Editing & QA (10%) — image labelling tasks
//   · Operational Reward (9.5%) — network infrastructure
//   · Consumption Reward — burn-and-mint when customers purchase map data
//   · HONEY Burst — targeted coverage incentives
//
// INTEGRATION SHAPE: Solana RPC only. No native SDK, no native module, no EAS
// build changes required. The entire integration is:
//   1. User provides their Solana wallet address (the one receiving HONEY).
//      We open Hivemapper's contributor page in a browser so they can copy it,
//      then capture it via Alert.prompt (iOS) or a SecureStore cached value.
//   2. Solana RPC getTokenAccountsByOwner → find the user's HONEY SPL token
//      account → read amount → convert from lamports (9 decimals) to HONEY.
//
// DIFFERENCE FROM DIMO: No OAuth redirect — Solana balances are public by
// default. The user just tells us which wallet to watch. We never hold keys.
//
// DIFFERENCE FROM NODLE: GETKINETIK is an earnings READER for Hivemapper,
// not an earnings GENERATOR. The user must already have a Hivemapper dashcam
// account and a connected Bee device. We read and sign what Hivemapper
// already distributes.
//
// NO CUSTODY: HONEY lives in the user's Solana wallet. GETKINETIK never
// touches it. We sign receipts for incremental balance deltas.
//
// HONEY TOKEN (Solana mainnet):
//   Mint: 4vMsoUT2BWatFweudnQM1xedRLfJgJ7hswhcpz4xgBTy
//   Decimals: 9
//   Supply: 10B HONEY max; ~4B allocated to contributor rewards
//   Contract type: SPL Token (standard Solana fungible token)
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

/** HONEY SPL token mint address on Solana mainnet. */
const HONEY_MINT = '4vMsoUT2BWatFweudnQM1xedRLfJgJ7hswhcpz4xgBTy';

/** HONEY uses 9 decimal places (standard Solana SPL). */
const HONEY_DECIMALS = 9;
const HONEY_DIVISOR = Math.pow(10, HONEY_DECIMALS);

/** Public Solana mainnet RPC — no API key required for balance reads. */
const SOLANA_RPC_URL = 'https://api.mainnet-beta.solana.com';

/** Hivemapper contributor dashboard — shown so the user can copy their wallet. */
const HIVEMAPPER_CONTRIBUTOR_URL = 'https://hivemapper.com/explorer';

/** SecureStore keys. */
const STORE_KEY_WALLET = 'kinetik.hivemapper.wallet.v1';
const STORE_KEY_LAST_BALANCE = 'kinetik.hivemapper.lastBalance.v1';

// ----------------------------------------------------------------------------
// Solana RPC — getTokenAccountsByOwner.
// Returns the SPL token balance (in raw lamports) for a given wallet address
// and mint. A wallet can have multiple HONEY accounts but almost always has
// one; we sum all of them for safety.
// ----------------------------------------------------------------------------

type RpcTokenAmount = {
  amount: string;
  decimals: number;
  uiAmount: number | null;
};

type RpcAccountValue = {
  account: {
    data: {
      parsed: {
        info: {
          tokenAmount: RpcTokenAmount;
        };
      };
    };
  };
};

type RpcResponse = {
  result?: { value: RpcAccountValue[] };
  error?: { message: string };
};

async function fetchHoneyBalance(walletAddress: string): Promise<number | null> {
  try {
    const response = await fetch(SOLANA_RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getTokenAccountsByOwner',
        params: [
          walletAddress,
          { mint: HONEY_MINT },
          { encoding: 'jsonParsed' },
        ],
      }),
    });

    if (!response.ok) return null;

    const json = await response.json() as RpcResponse;
    if (json.error || !json.result) return null;

    const accounts = json.result.value;
    if (!accounts || accounts.length === 0) return 0;

    // Sum all HONEY token accounts (almost always just one).
    let totalLamports = 0;
    for (const acct of accounts) {
      const raw = parseInt(
        acct.account.data.parsed.info.tokenAmount.amount,
        10,
      );
      if (Number.isFinite(raw)) totalLamports += raw;
    }

    return totalLamports / HONEY_DIVISOR;
  } catch {
    return null;
  }
}

// ----------------------------------------------------------------------------
// Wallet address capture — iOS uses Alert.prompt; Android uses
// openWalletAddressPrompt (modal TextInput at app root).
// ----------------------------------------------------------------------------

function promptForWallet(): Promise<string | null> {
  return new Promise((resolve) => {
    if (Platform.OS === 'ios') {
      Alert.prompt(
        'Connect Hivemapper Wallet',
        'Enter your Solana wallet address to track HONEY earnings.\n\nYour address is shown in the Hivemapper app under your profile.',
        [
          { text: 'Cancel', onPress: () => resolve(null), style: 'cancel' },
          {
            text: 'Connect',
            onPress: (address?: string) => {
              const trimmed = address?.trim() ?? '';
              // Basic Solana address sanity check: 32–44 Base58 chars
              if (trimmed.length >= 32 && trimmed.length <= 44) {
                resolve(trimmed);
              } else {
                Alert.alert(
                  'Invalid Address',
                  'That does not look like a Solana address. Please check and try again.',
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
        title: 'Connect Hivemapper Wallet',
        message:
          'Enter your Solana wallet address to track HONEY earnings.\n\nYour address is shown in the Hivemapper app under your profile.',
        placeholder: 'Solana address',
        validate: (trimmed) => {
          if (trimmed.length >= 32 && trimmed.length <= 44) return null;
          return 'That does not look like a Solana address (32–44 characters).';
        },
      }).then(resolve);
    }
  });
}

// ----------------------------------------------------------------------------
// HivemapperAdapter.
// ----------------------------------------------------------------------------

class HivemapperAdapter implements DepinAdapter {
  readonly id = 'hivemapper';
  readonly displayName = 'Hivemapper';
  readonly description = 'Dashcam mapping network. Earn HONEY for road coverage on Solana.';
  readonly currency = 'HONEY';

  private walletAddress: string | null = null;
  private lastEarnedAt: number | null = null;

  // --------------------------------------------------------------------------
  // isAvailable — true on iOS + Android; pure RPC, no native SDK required.
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
  // register — opens Hivemapper contributor page, then prompts for wallet.
  // --------------------------------------------------------------------------

  async register(_identity: NodeIdentity): Promise<AdapterStatus> {
    // Open the Hivemapper explorer so the user can copy their wallet address.
    // On Android, awaiting openBrowserAsync can hang until the Custom Tab is
    // dismissed; never block register() on that — show the wallet prompt anyway.
    if (Platform.OS === 'android') {
      void WebBrowser.openBrowserAsync(HIVEMAPPER_CONTRIBUTOR_URL).catch(() => {});
    } else {
      try {
        await WebBrowser.openBrowserAsync(HIVEMAPPER_CONTRIBUTOR_URL);
      } catch {
        // Browser open failed — proceed to prompt anyway.
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
  // pollEarnings — single Solana RPC call: getTokenAccountsByOwner.
  // HONEY is auto-minted weekly — no claim needed. We record the balance delta
  // each poll; any increase is a new earning event.
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

    const balance = await fetchHoneyBalance(addr);
    if (balance === null) {
      // RPC failed — return cached value so UI stays stable.
      return {
        source: this.id,
        currency: this.currency,
        pendingGross: 0,
        lifetimeGross: cached ?? 0,
        lastEarnedAt: this.lastEarnedAt,
        externalRef: addr ? `hivemapper:wallet:${addr.slice(0, 10)}` : undefined,
      };
    }

    // Positive balance increase = new earning event.
    if (cached !== null && balance > cached) {
      this.lastEarnedAt = Date.now();
    }

    await SecureStore.setItemAsync(STORE_KEY_LAST_BALANCE, String(balance)).catch(
      () => {},
    );

    return {
      source: this.id,
      currency: this.currency,
      pendingGross: Math.max(0, balance - (cached ?? 0)),
      lifetimeGross: balance,
      lastEarnedAt: this.lastEarnedAt,
      externalRef: addr ? `hivemapper:wallet:${addr.slice(0, 10)}` : undefined,
    };
  }

  // --------------------------------------------------------------------------
  // claim — not implemented. Hivemapper auto-mints weekly; no manual claim.
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
export const hivemapperAdapter = new HivemapperAdapter();
