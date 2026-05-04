// ============================================================================
// Adaptive heartbeat cadence — pick a sane interval for the current device
// state instead of pinging the chain on a fixed 30s timer regardless of
// whether the app is foreground, charging, or buried in the background.
// ----------------------------------------------------------------------------
// MOTIVATION
//
// The first version of useHeartbeat fired every 30s while the node was LIVE,
// full stop. That's the right cadence when the user has the app open or the
// device is on a charger, but it's overkill when the app is backgrounded on
// battery — and it's the single biggest contributor to "GETKINETIK shows up
// at the top of Battery Usage" feedback. If the user uninstalls before they
// ever earn a high Genesis Score, the bureau loses the node forever.
//
// The fix is policy, not crypto. The chain contract (Ed25519 signing,
// stableStringify, prevHash linkage, sha256[:16] tip) does NOT depend on
// the cadence — beats just need to be ordered. Slowing the cadence down
// when the device is asleep doesn't break any signature, doesn't invalidate
// any prior beat, and stays compatible with v:1 and v:2 schemas. It just
// produces fewer beats per real-world hour, which the bureau's Genesis
// Score methodology already accounts for via calendar-age and cadence-
// consistency signals (see docs/methodology/GENESIS_SCORE.md §3.2).
//
// PROFILES
//
//   active     30 s   — foreground OR charging+online. The original cadence.
//   background 5 min  — backgrounded recently, on battery, screen off.
//   sleep      30 min — backgrounded for > 10 minutes, on battery, OR offline.
//
// PROFILE SELECTION
//
//   if !active            → sleep      (gate above the chain itself; caller
//                                       passes !isLocked && online)
//   if !online            → sleep      (no point waking the radio just to
//                                       miss the next sync window)
//   if appState='active'  → active
//   if charging           → active     (battery isn't the constraint)
//   if backgroundedFor>10m → sleep
//   otherwise              → background
//
// LIMITATIONS
//
// 1. On Android, when the app is fully backgrounded by Doze or by the user
//    swiping it away, setInterval may not fire at all. The cadence policy
//    here gives us a sane default for foreground, charging, and short-
//    background states — those are the ones that show up in Battery Usage.
//    True deep-background uptime requires a foreground service (Notification
//    + service binding) or a BLE-style attestation, neither of which we
//    ship today. This module is honest about that limitation rather than
//    pretending to control it.
//
// 2. The cadence is selected by the device, not by the bureau. Networks
//    that want a guaranteed minimum cadence for partner SLAs negotiate
//    that separately — the chain accepts beats at any cadence, the
//    methodology just down-weights cadence inconsistency over time.
//
// 3. Profiles are coarse on purpose. We do NOT expose a continuously-
//    tunable interval to the UI; we want exactly three honest states
//    that map to user-explainable conditions. Drift correction lives in
//    the methodology, not in the device.
// ============================================================================

import { useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

// ---------------------------------------------------------------------------
// Profiles. Exposed so a partner SDK or test fixture can read the canonical
// values without having to call the React hook. ms numbers are deliberately
// round so they show up cleanly in any future "current cadence" diagnostic.
// ---------------------------------------------------------------------------
export const CADENCE_PROFILES = {
  active: 30_000,        // 30 s
  background: 300_000,   // 5 min
  sleep: 1_800_000,      // 30 min
} as const;

export type CadenceProfile = keyof typeof CADENCE_PROFILES;

/** ms threshold past which a backgrounded app drops from 'background' to 'sleep'. */
export const SLEEP_AFTER_BACKGROUND_MS = 10 * 60 * 1000; // 10 min

// ---------------------------------------------------------------------------
// Pure policy function. Same inputs → same profile, deterministic, easy to
// test, easy to explain in the methodology doc. Anyone can audit the policy
// by reading exactly this function — no hidden React state, no env-dependent
// branching.
// ---------------------------------------------------------------------------
export type CadenceInputs = {
  /** AppState reading from React Native. */
  appState: AppStateStatus;
  /** Whether the device is plugged in. */
  charging: boolean;
  /** Whether the node is gated open (network online + unlocked). */
  active: boolean;
  /** Optional: how long the app has been in background or inactive (ms). */
  backgroundedForMs?: number;
};

export function selectCadenceProfile(inputs: CadenceInputs): CadenceProfile {
  if (!inputs.active) return 'sleep';
  if (inputs.appState === 'active') return 'active';
  if (inputs.charging) return 'active';
  const bgMs = inputs.backgroundedForMs ?? 0;
  if (bgMs > SLEEP_AFTER_BACKGROUND_MS) return 'sleep';
  return 'background';
}

export function selectCadenceMs(inputs: CadenceInputs): number {
  return CADENCE_PROFILES[selectCadenceProfile(inputs)];
}

// ---------------------------------------------------------------------------
// useAdaptiveCadenceMs — React hook that wraps the policy function with the
// AppState subscription and a coarse re-evaluation timer so the consumer
// (useHeartbeat) sees an updated cadence when the device state changes.
//
// Returns: ms number, suitable for setInterval.
//
// Inputs:
//   active   — caller passes !isLocked && online (the same "should I be
//              signing beats at all?" gate). When false, returns sleep.
//   charging — battery plug state.
//
// The hook deliberately does NOT inspect SecureStore, the network adapter
// pool, or any state outside its three knobs. The cadence policy is pure
// in the inputs above; everything else stays out so the policy is easy to
// reason about in isolation.
// ---------------------------------------------------------------------------
export function useAdaptiveCadenceMs(
  active: boolean,
  charging: boolean,
): number {
  // Track AppState in component-level state so the hook re-renders when it
  // changes. AppState.currentState is a string at all times in RN 0.74+.
  const [appState, setAppState] = useState<AppStateStatus>(
    AppState.currentState as AppStateStatus,
  );
  const backgroundedAtRef = useRef<number | null>(
    AppState.currentState === 'active' ? null : Date.now(),
  );

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      setAppState(next);
      if (next === 'background' || next === 'inactive') {
        if (backgroundedAtRef.current === null) {
          backgroundedAtRef.current = Date.now();
        }
      } else if (next === 'active') {
        backgroundedAtRef.current = null;
      }
    });
    return () => sub.remove();
  }, []);

  // While the app is backgrounded we still need to cross the "10-minute
  // SLEEP threshold" eventually — without a periodic re-render the hook
  // would keep returning 'background' forever. A 60s tick is cheap and
  // doesn't itself emit beats; it just nudges the consumer to re-check.
  // When the app is foreground we don't need the tick: state changes
  // (charging plug-in/out, online flips) re-render naturally.
  const [, setTick] = useState(0);
  useEffect(() => {
    if (appState === 'active') return;
    const id = setInterval(() => setTick((t) => (t + 1) & 0x3fffffff), 60_000);
    return () => clearInterval(id);
  }, [appState]);

  const backgroundedForMs =
    backgroundedAtRef.current !== null
      ? Date.now() - backgroundedAtRef.current
      : 0;

  return selectCadenceMs({
    appState,
    charging,
    active,
    backgroundedForMs,
  });
}
