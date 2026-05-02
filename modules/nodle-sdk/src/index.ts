// ============================================================================
// NodleSdkModule — JS surface for the Nodle Android SDK native bridge.
// ----------------------------------------------------------------------------
// With a dev-client / EAS build, `ExpoNodleSdk` native code loads the real
// Nodle SDK. In Expo Go or web, the native module is absent and calls no-op.
// ============================================================================

import { Platform } from 'react-native';
import { requireNativeModule } from 'expo-modules-core';

const IS_ANDROID = Platform.OS === 'android';

type NativeNodle = {
  start(key: string): Promise<void>;
  stop(): Promise<void>;
  isRunning(): Promise<boolean>;
};

function tryLoadNative(): NativeNodle | null {
  if (!IS_ANDROID) return null;
  try {
    return requireNativeModule<NativeNodle>('ExpoNodleSdk');
  } catch {
    return null;
  }
}

const native = tryLoadNative();

/** False when the Kotlin `ExpoNodleSdkModule` is linked (real BLE path). */
export const NODLE_SDK_IS_STUB = native == null;

function ss58StartArg(addressOrKey: string): string {
  const t = addressOrKey.trim();
  return t.startsWith('ss58:') ? t : `ss58:${t}`;
}

export const NodleSdkModule = {
  async start(ss58PublicKey: string): Promise<void> {
    if (!IS_ANDROID) return;
    const arg = ss58StartArg(ss58PublicKey);
    if (native) {
      await native.start(arg);
      return;
    }
    console.log('[nodle-sdk] start (no native) —', arg.slice(0, 18) + '…');
  },

  async stop(): Promise<void> {
    if (!IS_ANDROID) return;
    if (native) {
      await native.stop();
      return;
    }
    console.log('[nodle-sdk] stop (no native)');
  },

  async isRunning(): Promise<boolean> {
    if (!IS_ANDROID) return false;
    if (native) return native.isRunning();
    return false;
  },
};
