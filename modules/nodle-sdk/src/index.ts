// ============================================================================
// NodleSdkModule — JS surface for the Nodle Android SDK native bridge.
// ----------------------------------------------------------------------------
// TODAY: this is a stub. Every method is a no-op that resolves immediately.
// The stub lets the adapter and UI compile and run without an EAS build.
//
// SWAP PATH (Session D / after Nodle partnership confirmed):
//   Replace the stub body below with a real Expo native module that wraps
//   io.nodle.sdk.android.Nodle via a Kotlin ExpoModule + config plugin.
//   The adapter (packages/adapter-nodle/src/index.ts) imports only from
//   this file — nothing else changes when the real bridge lands.
//
// REAL BRIDGE CONTRACT (what the Kotlin module will implement):
//   start(ss58PublicKey: string): Promise<void>
//     — calls Nodle().start("ss58:" + ss58PublicKey) on the main thread.
//       Requires: BLUETOOTH_SCAN, ACCESS_FINE_LOCATION,
//                 ACCESS_BACKGROUND_LOCATION permissions granted.
//   stop(): Promise<void>
//     — calls Nodle().stop(). Safe to call even if not started.
//   isRunning(): Promise<boolean>
//     — returns Nodle().isStarted() && Nodle().isScanning().
// ============================================================================

import { Platform } from 'react-native';

const IS_ANDROID = Platform.OS === 'android';

export const NodleSdkModule = {
  /**
   * Start the Nodle SDK. The supplied key is the SS58-encoded Ed25519 public
   * key for the current user — NODL rewards accrue to that Nodle address.
   * No-op stub today; real Kotlin bridge starts BLE scanning.
   */
  async start(ss58PublicKey: string): Promise<void> {
    if (!IS_ANDROID) return;
    console.log('[nodle-sdk] start (stub) —', ss58PublicKey.slice(0, 12) + '…');
  },

  /**
   * Stop the Nodle SDK. Call when the user unregisters or the app backgrounds
   * beyond the window where scanning is permitted.
   */
  async stop(): Promise<void> {
    if (!IS_ANDROID) return;
    console.log('[nodle-sdk] stop (stub)');
  },

  /**
   * Returns true if the SDK is started and actively scanning BLE.
   * Stub always returns false — will return Nodle().isScanning() in real bridge.
   */
  async isRunning(): Promise<boolean> {
    return false;
  },
};
