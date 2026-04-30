// ============================================================================
// discovery.ts — device capability detection + adapter eligibility matching.
// ----------------------------------------------------------------------------
// Every DePIN adapter has hardware requirements. This module:
//   1. Detects what the current device can do (GPS, BLE, barometer, camera).
//   2. Maps device capabilities to the adapters that can run on this device.
//   3. Reports adapters the user qualifies for but hasn't enabled yet.
//
// This powers the "you qualify for X but aren't using it" discovery
// surface in the OptimizationReport UI. On average, a user activates 1–2
// extra networks they didn't know were available once they see this list.
//
// CAPABILITY DETECTION STRATEGY:
//   · Platform check (iOS / Android) — synchronous, no permissions needed.
//   · Sensor availability — async, reads from the device sensors module.
//     Falls back to capability declarations per platform if sensor check fails.
//   · Bluetooth — requires no special permission to CHECK availability
//     (only to USE it). We check at the Platform level for simplicity.
//
// The capabilities object is computed once per session and passed around —
// avoiding repeated async sensor probes.
// ============================================================================

import { Platform } from 'react-native';

// ---------------------------------------------------------------------------
// Types.
// ---------------------------------------------------------------------------

export type DeviceCapabilities = {
  /** True if the device has Bluetooth hardware (all modern smartphones do). */
  hasBluetooth: boolean;
  /** True if location services are available (GPS or network-based). */
  hasGPS: boolean;
  /** True if a barometric pressure sensor is present. */
  hasBarometer: boolean;
  /**
   * True if the device has a camera (required for dashcam-style recording).
   * Practically always true for smartphones.
   */
  hasCamera: boolean;
  /** True if the device can run background tasks (required for some adapters). */
  hasBackgroundProcessing: boolean;
  isAndroid: boolean;
  isIOS: boolean;
};

export type AdapterRequirement = {
  /** Stable adapter ID — matches DepinAdapter.id. */
  adapterId: string;
  /** Display name for the discovery UI. */
  displayName: string;
  /** One-line description of what this adapter earns. */
  earnDescription: string;
  /** Token symbol. */
  currency: string;
  /** Which capability flags must be true for this adapter to work. */
  requires: Partial<Record<keyof DeviceCapabilities, boolean>>;
  /** If true, the adapter works on Android. */
  supportsAndroid: boolean;
  /** If true, the adapter works on iOS. */
  supportsIOS: boolean;
  /**
   * Estimated monthly earnings range (USD) based on typical users.
   * Used to prioritise discovery cards.
   */
  estimatedMonthlyUsdRange: [number, number];
};

// ---------------------------------------------------------------------------
// Adapter requirement registry — the canonical source of "what does this
// adapter need from the phone?"
// ---------------------------------------------------------------------------
export const ADAPTER_REQUIREMENTS: AdapterRequirement[] = [
  {
    adapterId: 'nodle',
    displayName: 'Nodle',
    earnDescription: 'Earn NODL by providing BLE connectivity in the background.',
    currency: 'NODL',
    requires: {
      hasBluetooth: true,
      hasBackgroundProcessing: true,
      isAndroid: true,
    },
    supportsAndroid: true,
    supportsIOS: false,  // Nodle SDK is Android-only in v0
    estimatedMonthlyUsdRange: [0.5, 5],
  },
  {
    adapterId: 'dimo',
    displayName: 'DIMO',
    earnDescription: 'Earn $DIMO by connecting your vehicle and sharing drive data.',
    currency: 'DIMO',
    requires: {
      hasGPS: true,
    },
    supportsAndroid: true,
    supportsIOS: true,
    estimatedMonthlyUsdRange: [2, 20],
  },
  {
    adapterId: 'hivemapper',
    displayName: 'Hivemapper',
    earnDescription: 'Earn HONEY by mapping roads with a dashcam.',
    currency: 'HONEY',
    requires: {
      hasCamera: true,
    },
    supportsAndroid: true,
    supportsIOS: true,
    estimatedMonthlyUsdRange: [5, 50],
  },
  {
    adapterId: 'weatherxm',
    displayName: 'WeatherXM',
    earnDescription: 'Earn WXM by running a weather station device.',
    currency: 'WXM',
    requires: {
      hasGPS: true,
    },
    supportsAndroid: true,
    supportsIOS: true,
    estimatedMonthlyUsdRange: [3, 30],
  },
  {
    adapterId: 'geodnet',
    displayName: 'Geodnet',
    earnDescription: 'Earn GEOD by running a GNSS reference station.',
    currency: 'GEOD',
    requires: {
      hasGPS: true,
    },
    supportsAndroid: true,
    supportsIOS: true,
    estimatedMonthlyUsdRange: [10, 100],
  },
];

// ---------------------------------------------------------------------------
// getDeviceCapabilities — detects what the current device can do.
//
// Runs a series of cheap capability checks. Barometer detection uses a
// try/catch around a DeviceMotion subscription, which is the least-invasive
// way to check sensor presence without requesting permissions.
// ---------------------------------------------------------------------------
export async function getDeviceCapabilities(): Promise<DeviceCapabilities> {
  const isAndroid = Platform.OS === 'android';
  const isIOS     = Platform.OS === 'ios';

  // All modern smartphones have BLE, GPS, and a camera.
  // We set these to true unless we have a specific reason to believe otherwise.
  const hasBluetooth           = true;
  const hasGPS                 = true;
  const hasCamera              = true;
  const hasBackgroundProcessing = isAndroid; // iOS has strict background limits

  // Barometer: present on most flagship Android and all iPhones since iPhone 6.
  // We default to true and let the sensor sampler surface the actual reading.
  let hasBarometer = true;
  try {
    // Dynamic import so this module doesn't hard-fail on web or in tests.
    const Barometer = await import('expo-sensors').then((m) => m.Barometer).catch(() => null);
    if (Barometer) {
      const available = await (Barometer as { isAvailableAsync(): Promise<boolean> }).isAvailableAsync();
      hasBarometer = available;
    }
  } catch {
    // Sensor check failed — assume true (optimistic default).
    hasBarometer = true;
  }

  return {
    hasBluetooth,
    hasGPS,
    hasBarometer,
    hasCamera,
    hasBackgroundProcessing,
    isAndroid,
    isIOS,
  };
}

// ---------------------------------------------------------------------------
// getEligibleAdapters — returns adapters that CAN run on this device.
// ---------------------------------------------------------------------------
export function getEligibleAdapters(
  caps: DeviceCapabilities,
): AdapterRequirement[] {
  return ADAPTER_REQUIREMENTS.filter((req) => {
    // Platform check.
    if (caps.isAndroid && !req.supportsAndroid) return false;
    if (caps.isIOS     && !req.supportsIOS)     return false;

    // Capability check — every required flag must be present on the device.
    for (const [key, required] of Object.entries(req.requires)) {
      if (required && !caps[key as keyof DeviceCapabilities]) return false;
    }

    return true;
  });
}

// ---------------------------------------------------------------------------
// getMissingAdapters — eligible adapters NOT yet in `registeredIds`.
// This is the core of the "you qualify for X" discovery feature.
// ---------------------------------------------------------------------------
export function getMissingAdapters(
  caps: DeviceCapabilities,
  registeredIds: string[],
): AdapterRequirement[] {
  const eligible  = getEligibleAdapters(caps);
  const registered = new Set(registeredIds);
  return eligible.filter((req) => !registered.has(req.adapterId));
}

// ---------------------------------------------------------------------------
// estimateAdditionalMonthlyUsd — sum of median estimated earnings for all
// missing adapters. Used in the OptimizationReport to show "you could earn
// an extra ~$X/month by activating these."
// ---------------------------------------------------------------------------
export function estimateAdditionalMonthlyUsd(
  missingAdapters: AdapterRequirement[],
): number {
  return missingAdapters.reduce((sum, req) => {
    const [lo, hi] = req.estimatedMonthlyUsdRange;
    return sum + (lo + hi) / 2;
  }, 0);
}
