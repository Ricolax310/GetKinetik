import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Battery from 'expo-battery';
import * as Haptics from 'expo-haptics';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { palette, typography } from '../theme/palette';
import {
  eraseNodeIdentity,
  getOrCreateNodeIdentity,
  type NodeIdentity,
} from '../lib/identity';
import {
  eraseHeartbeatLog,
  type HeartbeatSnapshot,
  useHeartbeat,
} from '../lib/heartbeat';
import {
  readSensorAggregate,
  startSensorSampler,
  stopSensorSampler,
} from '../lib/sensors';
import { Gemstone } from './Gemstone';
import { Manifesto } from './Manifesto';
import { PinPad } from './PinPad';
import { ProofOfOrigin } from './ProofOfOrigin';
import { Readouts } from './Readouts';

const COINBASE_SPOT_URL = 'https://api.coinbase.com/v2/prices/BTC-USD/spot';
const PRICE_REFRESH_MS = 60_000;

// ----------------------------------------------------------------------------
// SecureStore keys — v1-suffixed so we can migrate cleanly in the future
// without clobbering older on-device data.
// ----------------------------------------------------------------------------
const KEY_PIN = 'kinetik.pin.v1';
const KEY_YIELD = 'kinetik.yield.v1';
const KEY_YIELD_TS = 'kinetik.yield.ts.v1';

// Persistence cadence + charging hardening.
const YIELD_SAVE_MS = 15_000;
const CHARGING_GRACE_MS = 1_500;
const CHARGING_DEBOUNCE_MS = 400;

/**
 * SecureStore write helper — every value is explicitly wrapped in
 * `String(...)` (even when already a string) to sidestep occasional
 * SDK 54 / Node 22 type-stripping errors on raw numerics. All failures
 * are swallowed with console.warn so the app never crashes on a storage
 * hiccup.
 */
const secureSet = async (key: string, value: unknown): Promise<void> => {
  try {
    await SecureStore.setItemAsync(key, String(value));
  } catch (err) {
    console.warn('[VaultPanel] SecureStore write failed:', key, err);
  }
};

const secureGet = async (key: string): Promise<string | null> => {
  try {
    return await SecureStore.getItemAsync(key);
  } catch (err) {
    console.warn('[VaultPanel] SecureStore read failed:', key, err);
    return null;
  }
};

const secureDelete = async (key: string): Promise<void> => {
  try {
    await SecureStore.deleteItemAsync(key);
  } catch (err) {
    console.warn('[VaultPanel] SecureStore delete failed:', key, err);
  }
};

/**
 * VaultPanel composes the Sovereign Node UI:
 *   - Identity crest at the top (with diagnostic chip)
 *   - Gemstone at the optical center
 *   - Status line (live / dormant)
 *   - Sapphire Readouts at the bottom
 *   - PIN pad overlay when biometric is unavailable
 *
 * Battery level drives NODE STABILITY. Yield accrues while the node is
 * unlocked. Tilting the device shifts the ruby's internal fire. Yield +
 * PIN are persisted via expo-secure-store.
 */
export function VaultPanel() {
  const [isLocked, setIsLocked] = useState(true);
  const [online, setOnline] = useState(false);
  const [batteryLevel, setBatteryLevel] = useState(1);
  const [isCharging, setIsCharging] = useState(false);
  const [yieldTokens, setYieldTokens] = useState(0);
  const [identity, setIdentity] = useState<NodeIdentity | null>(null);
  const [nodeId, setNodeId] = useState<string>('KINETIK-NODE-XXXXXXXX');
  const [btcPrice, setBtcPrice] = useState<number | null>(null);
  const [biometricEnrolled, setBiometricEnrolled] = useState<boolean | null>(null);
  const [storedPin, setStoredPin] = useState<string | null>(null);
  const [pinPadMode, setPinPadMode] = useState<'set' | 'enter' | null>(null);
  const [pinRejectionNonce, setPinRejectionNonce] = useState(0);
  const [diagOpen, setDiagOpen] = useState(false);
  const [manifestoOpen, setManifestoOpen] = useState(false);
  const [proofOpen, setProofOpen] = useState(false);

  const lastTick = useRef<number>(Date.now());
  const authInFlight = useRef(false);
  const yieldRef = useRef(0);
  const yieldHydrated = useRef(false);

  // Charging hardening — boot timestamp for the UNKNOWN grace window and a
  // debounce timer so a rapid plug/unplug flicker doesn't whip the UI.
  const bootAt = useRef<number>(Date.now());
  const chargingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevChargingRef = useRef<boolean>(false);

  // Diagnostic card expand/collapse animation.
  const diagAnim = useSharedValue(0);
  useEffect(() => {
    diagAnim.value = withTiming(diagOpen ? 1 : 0, {
      duration: 280,
      easing: Easing.inOut(Easing.cubic),
    });
  }, [diagOpen, diagAnim]);
  const diagStyle = useAnimatedStyle(() => ({
    opacity: diagAnim.value,
    // Sized for 15 rows (12 base + 3 L2 sensor rows). Each row is ~22px
    // tall (padding 4 + ~14px text); plus 28px of card padding. Bump on
    // any new row addition or this clips the bottom rows silently.
    maxHeight: interpolate(diagAnim.value, [0, 1], [0, 580]),
    transform: [
      { translateY: interpolate(diagAnim.value, [0, 1], [-6, 0]) },
    ],
  }));

  // Keep yieldRef in sync so background/interval persistence always sees
  // the latest token count without re-binding the effect.
  useEffect(() => {
    yieldRef.current = yieldTokens;
  }, [yieldTokens]);

  // --------------------------------------------------------------------------
  // Sovereign identity — Ed25519 keypair lives in keystore-backed SecureStore.
  // The NODE ID is the first 8 hex chars of SHA-256(publicKey); it is
  // deterministic from a secret that never leaves the device. See
  // src/lib/identity.ts for the full rationale.
  // --------------------------------------------------------------------------
  useEffect(() => {
    (async () => {
      try {
        const id = await getOrCreateNodeIdentity();
        setIdentity(id);
        setNodeId(id.nodeId);
      } catch (err) {
        console.warn('[VaultPanel] identity init failed:', err);
      }
    })();
  }, []);

  // --------------------------------------------------------------------------
  // L2 sensor sampler — accelerometer (motion RMS) + barometer + light at
  // app boot, torn down on unmount. The sampler is a process-wide singleton
  // (see src/lib/sensors.ts), so multiple mounts are idempotent. Hooking it
  // up at this layer means heartbeats automatically carry sensor aggregates
  // without VaultPanel having to construct them per beat.
  // --------------------------------------------------------------------------
  useEffect(() => {
    void startSensorSampler();
    return () => {
      stopSensorSampler();
    };
  }, []);

  // --------------------------------------------------------------------------
  // Biometric enrollment probe — surfaces BIO-AUTH status in the diagnostic
  // panel and also drives which fallback path handleGemPress takes.
  // --------------------------------------------------------------------------
  const refreshBiometricEnrollment = useCallback(async (): Promise<boolean> => {
    try {
      const [hasHardware, isEnrolled] = await Promise.all([
        LocalAuthentication.hasHardwareAsync(),
        LocalAuthentication.isEnrolledAsync(),
      ]);
      const ok = Boolean(hasHardware && isEnrolled);
      setBiometricEnrolled(ok);
      return ok;
    } catch (err) {
      console.warn('[VaultPanel] biometric probe failed:', err);
      setBiometricEnrolled(false);
      return false;
    }
  }, []);
  useEffect(() => {
    void refreshBiometricEnrollment();
  }, [refreshBiometricEnrollment]);

  // --------------------------------------------------------------------------
  // SecureStore hydration — restore stored PIN and accumulated yield on mount.
  // Values are parsed and validated with Number.isFinite so a corrupted write
  // can never seed NaN/Infinity into the UI.
  // --------------------------------------------------------------------------
  useEffect(() => {
    (async () => {
      const pinRaw = await secureGet(KEY_PIN);
      if (pinRaw && /^\d{6}$/.test(pinRaw)) {
        setStoredPin(pinRaw);
      }
      const yieldRaw = await secureGet(KEY_YIELD);
      const yieldNum = yieldRaw != null ? Number(yieldRaw) : NaN;
      if (Number.isFinite(yieldNum) && yieldNum >= 0) {
        setYieldTokens(yieldNum);
      }
      yieldHydrated.current = true;
    })();
  }, []);

  // --------------------------------------------------------------------------
  // BTC spot price ticker — refreshes every 60s.
  // --------------------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    const pull = async () => {
      try {
        const res = await fetch(COINBASE_SPOT_URL);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        const amount = parseFloat(json?.data?.amount);
        if (!cancelled && Number.isFinite(amount)) setBtcPrice(amount);
      } catch (err) {
        console.warn('[VaultPanel] coinbase spot fetch failed:', err);
      }
    };
    pull();
    const id = setInterval(pull, PRICE_REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  // --------------------------------------------------------------------------
  // Battery telemetry — level + charging state with hardening:
  //   · UNKNOWN is treated as not-charging EXCEPT in the first 1500ms after
  //     mount, where we preserve the previous value (avoids boot-time flash).
  //   · All transitions are debounced 400ms: a plug/unplug flicker has to
  //     hold the new state for 400ms before it commits to React state.
  // --------------------------------------------------------------------------
  const commitCharging = useCallback(
    (nextState: Battery.BatteryState) => {
      const isKnownCharge =
        nextState === Battery.BatteryState.CHARGING ||
        nextState === Battery.BatteryState.FULL;

      let target: boolean;
      if (nextState === Battery.BatteryState.UNKNOWN) {
        const withinGrace = Date.now() - bootAt.current < CHARGING_GRACE_MS;
        if (withinGrace) return; // hold previous value
        target = false;
      } else {
        target = isKnownCharge;
      }

      if (target === prevChargingRef.current) {
        if (chargingTimer.current) {
          clearTimeout(chargingTimer.current);
          chargingTimer.current = null;
        }
        return;
      }

      if (chargingTimer.current) clearTimeout(chargingTimer.current);
      chargingTimer.current = setTimeout(() => {
        prevChargingRef.current = target;
        setIsCharging(target);
        chargingTimer.current = null;
      }, CHARGING_DEBOUNCE_MS);
    },
    [],
  );

  useEffect(() => {
    let mounted = true;
    let lvlSub: { remove: () => void } | null = null;
    let stateSub: { remove: () => void } | null = null;
    try {
      Battery.getBatteryLevelAsync()
        .then((lvl) => {
          if (mounted && lvl >= 0) setBatteryLevel(lvl);
        })
        .catch((err) => {
          console.warn('[VaultPanel] battery level unavailable:', err);
        });
      Battery.getBatteryStateAsync()
        .then((state) => {
          if (mounted) commitCharging(state);
        })
        .catch((err) => {
          console.warn('[VaultPanel] battery state unavailable:', err);
        });
      lvlSub = Battery.addBatteryLevelListener(({ batteryLevel: lvl }) => {
        if (lvl >= 0) setBatteryLevel(lvl);
      });
      stateSub = Battery.addBatteryStateListener(({ batteryState }) => {
        commitCharging(batteryState);
      });
    } catch (err) {
      console.warn('[VaultPanel] battery module init failed:', err);
    }
    return () => {
      mounted = false;
      if (lvlSub) lvlSub.remove();
      if (stateSub) stateSub.remove();
      if (chargingTimer.current) {
        clearTimeout(chargingTimer.current);
        chargingTimer.current = null;
      }
    };
  }, [commitCharging]);

  // --------------------------------------------------------------------------
  // Yield accrual — only when the node is BOTH unlocked AND live (online).
  //   · LOCKED:            no interval, counter frozen
  //   · UNLOCKED + DORMANT: no interval, counter frozen (user intent)
  //   · UNLOCKED + LIVE:    accrues at baseRate, scaled by battery stability
  //
  // Rate scales with battery level (0.4 → 1.0 multiplier) so a fully charged
  // node earns ~2.5x a 20%-battery node — a subtle reward for keeping the
  // device healthy, which is the whole ethos of Sovereign Node hardware.
  //
  // lastTick is re-stamped inside the effect body so a DORMANT → LIVE
  // transition never credits the elapsed dormant time as earned yield.
  // --------------------------------------------------------------------------
  useEffect(() => {
    lastTick.current = Date.now();
    if (isLocked || !online) return;
    const id = setInterval(() => {
      const now = Date.now();
      const dt = (now - lastTick.current) / 1000;
      lastTick.current = now;
      const ratePerSec = 0.042 * (0.4 + batteryLevel * 0.6);
      setYieldTokens((prev) => prev + dt * ratePerSec);
    }, 250);
    return () => clearInterval(id);
  }, [isLocked, online, batteryLevel]);

  // --------------------------------------------------------------------------
  // Yield persistence — every 15s while unlocked, plus on AppState change to
  // background/inactive. Writes are debounced behind yieldHydrated so we
  // never clobber the stored value with 0 before the restore completes.
  // --------------------------------------------------------------------------
  const persistYield = useCallback(async () => {
    if (!yieldHydrated.current) return;
    const value = yieldRef.current;
    if (!Number.isFinite(value) || value < 0) return;
    await secureSet(KEY_YIELD, value);
    await secureSet(KEY_YIELD_TS, Date.now());
  }, []);

  useEffect(() => {
    if (isLocked) return;
    const id = setInterval(() => {
      void persistYield();
    }, YIELD_SAVE_MS);
    return () => clearInterval(id);
  }, [isLocked, persistYield]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'background' || next === 'inactive') {
        void persistYield();
      }
    });
    return () => sub.remove();
  }, [persistYield]);

  // --------------------------------------------------------------------------
  // Gemstone press — biometric first, PIN fallback second, nothing else.
  //   · locked + biometric available → LocalAuthentication prompt
  //   · locked + no biometric + no stored PIN → PinPad in SET mode
  //   · locked + no biometric + stored PIN → PinPad in ENTER mode
  //   · unlocked → toggle online state
  // --------------------------------------------------------------------------
  const handleGemPress = useCallback(async () => {
    if (!isLocked) {
      setOnline((o) => !o);
      return;
    }
    if (authInFlight.current) return;
    authInFlight.current = true;
    try {
      const enrolled = await refreshBiometricEnrollment();
      if (!enrolled) {
        setPinPadMode(storedPin ? 'enter' : 'set');
        return;
      }
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to activate Sovereign Node',
        fallbackLabel: 'Use Passcode',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      });
      if (result.success) {
        setIsLocked(false);
        setOnline(true);
      }
    } catch (err) {
      console.warn('[VaultPanel] auth error:', err);
    } finally {
      authInFlight.current = false;
    }
  }, [isLocked, refreshBiometricEnrollment, storedPin]);

  // --------------------------------------------------------------------------
  // PIN submit callbacks — SET persists, ENTER validates against storedPin.
  // --------------------------------------------------------------------------
  const handlePinSubmit = useCallback(
    async (pin: string) => {
      if (pinPadMode === 'set') {
        await secureSet(KEY_PIN, pin);
        setStoredPin(pin);
        setPinPadMode(null);
        setIsLocked(false);
        setOnline(true);
        return;
      }
      if (pinPadMode === 'enter') {
        if (pin === storedPin) {
          setPinPadMode(null);
          setIsLocked(false);
          setOnline(true);
        } else {
          setPinRejectionNonce((n) => n + 1);
        }
      }
    },
    [pinPadMode, storedPin],
  );

  const handlePinCancel = useCallback(() => {
    setPinPadMode(null);
  }, []);

  const stabilityPct = Math.max(0, Math.min(100, batteryLevel * 100));

  // --------------------------------------------------------------------------
  // Signed heartbeat log — emits an Ed25519-signed, hash-chained uptime
  // proof every 30s while the node is LIVE. The same gate as yield accrual:
  // the node only proves presence while it is actually working. See
  // src/lib/heartbeat.ts for the full rationale + storage shape.
  // --------------------------------------------------------------------------
  const heartbeatSnapshot = useCallback(
    (): HeartbeatSnapshot => ({
      stabilityPct,
      online,
      charging: isCharging,
    }),
    [stabilityPct, online, isCharging],
  );
  const { summary: heartbeat } = useHeartbeat(
    identity,
    !isLocked && online,
    heartbeatSnapshot,
    readSensorAggregate,
  );

  // --------------------------------------------------------------------------
  // Diagnostic panel rows.
  // --------------------------------------------------------------------------
  const bioAuthLabel =
    biometricEnrolled === null
      ? 'PROBING…'
      : biometricEnrolled
        ? 'ACTIVE'
        : 'BYPASSED (CRACKED GLASS OVERRIDE)';

  // Show the first 16 hex chars of the Ed25519 public key so the user can
  // visually confirm the real sovereign identity is live. The full 64-char
  // pubkey surfaces in the Proof-of-Origin card (Phase 5 Step 4).
  const pubkeyLabel = identity?.publicKeyHex
    ? `${identity.publicKeyHex.slice(0, 16).toUpperCase()}…`
    : '—';
  const mintedLabel = identity?.createdAt
    ? new Date(identity.createdAt).toISOString().slice(0, 10)
    : '—';

  // Heartbeat readouts — all derive from the persisted + session summary.
  // BEATS shows "session / lifetime"; SINCE shows the date of the first ever
  // heartbeat on this device; CHAIN shows the current tip hash; LAST SIG
  // shows the first 16 chars of the latest Ed25519 signature this session.
  const beatsLabel = heartbeat
    ? `${heartbeat.sessionCount} / ${heartbeat.lifetimeCount}`
    : '—';
  const sinceLabel = heartbeat?.firstTs
    ? new Date(heartbeat.firstTs).toISOString().slice(0, 10)
    : '—';
  const chainLabel = heartbeat?.lastHash
    ? heartbeat.lastHash.toUpperCase()
    : '—';
  const lastSigLabel = heartbeat?.lastSignature
    ? `${heartbeat.lastSignature.slice(0, 16).toUpperCase()}…`
    : '—';

  // L2 sensor readouts — surface the EXACT numbers that were committed to
  // the chain in the most recent signed beat, not the live sensor stream
  // between beats. That keeps the DIAG card and the verifier showing the
  // same bytes. See src/lib/sensors.ts for unit + rounding conventions.
  const sensors = heartbeat?.lastSensors ?? null;
  const motionLabel =
    sensors && typeof sensors.motionRms === 'number'
      ? `${sensors.motionRms.toFixed(2)} G`
      : '—';
  const pressureLabel =
    sensors && typeof sensors.pressureHpa === 'number'
      ? `${sensors.pressureHpa.toFixed(2)} HPA`
      : '—';
  const lightLabel =
    sensors && typeof sensors.lux === 'number'
      ? `${Math.round(sensors.lux)} LX`
      : '—';

  const diagRows: Array<{ label: string; value: string }> = [
    { label: 'NPU', value: 'PASS' },
    { label: 'TEE', value: 'LOCKED' },
    { label: 'BIO-AUTH', value: bioAuthLabel },
    { label: 'THERMAL', value: `${Math.round(batteryLevel * 100)}%` },
    { label: 'CHARGING', value: isCharging ? 'HYPER' : 'IDLE' },
    { label: 'NODE', value: nodeId },
    { label: 'PUBKEY', value: pubkeyLabel },
    { label: 'MINTED', value: mintedLabel },
    { label: 'BEATS', value: beatsLabel },
    { label: 'SINCE', value: sinceLabel },
    { label: 'CHAIN', value: chainLabel },
    { label: 'LAST SIG', value: lastSigLabel },
    { label: 'MOTION', value: motionLabel },
    { label: 'PRESSURE', value: pressureLabel },
    { label: 'LIGHT', value: lightLabel },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.crest}>
        {/*
          The GETKINETIK wordmark is itself a long-press gesture target —
          deliberately hidden, no visible affordance. The manifesto is a
          "secret door" you find, not a button you click. A long-press fires
          a Success notification haptic so the activation feels like a
          sovereign ritual, not a tap.
        */}
        <Pressable
          onLongPress={async () => {
            try {
              await Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success,
              );
            } catch {
              /* haptics unavailable — silent no-op */
            }
            setManifestoOpen(true);
          }}
          accessibilityRole="button"
          accessibilityLabel="Long-press to open Sovereign Manifesto"
          hitSlop={10}
        >
          <Text style={styles.brand}>GETKINETIK</Text>
        </Pressable>
        <View style={styles.rule} />
        {/*
          Symmetric to the GETKINETIK long-press → Manifesto: long-pressing
          the NODE ID opens the Proof of Origin card. Same "hidden door"
          pattern, different door — identity instead of philosophy. A
          Success haptic marks the reveal; the card itself mints a fresh
          Ed25519 signature on every open (see src/lib/proof.ts).
        */}
        <Pressable
          onLongPress={async () => {
            try {
              await Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success,
              );
            } catch {
              /* haptics unavailable — silent no-op */
            }
            setProofOpen(true);
          }}
          accessibilityRole="button"
          accessibilityLabel="Long-press to open Proof of Origin card"
          hitSlop={12}
        >
          <Text style={styles.subBrand}>{nodeId}</Text>
        </Pressable>
        {/*
          PROOF chip — visible mirror of DIAG on the opposite side of the
          crest. The long-press on the NODE ID below remains as the power-
          user ritual gesture; this is the discoverable door for every
          other user. Ruby-toned so it reads as a distinct surface (identity
          / ownership) rather than a duplicate of the sapphire DIAG chip
          (telemetry / diagnostics). A success-notification haptic fires on
          open, matching the long-press feel so both entry points land on
          the same emotional beat.
        */}
        <Pressable
          onPress={async () => {
            try {
              await Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success,
              );
            } catch {
              /* haptics unavailable — silent no-op */
            }
            setProofOpen(true);
          }}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Open Proof of Origin card"
          style={({ pressed }) => [
            styles.proofChip,
            pressed && styles.proofChipPressed,
          ]}
        >
          <Text style={styles.proofChipLabel}>PROOF</Text>
        </Pressable>
        <Pressable
          onPress={async () => {
            try {
              await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            } catch (err) {
              console.warn('Haptics unavailable:', err);
            }
            setDiagOpen((v) => !v);
          }}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Toggle diagnostic panel"
          style={({ pressed }) => [
            styles.diagChip,
            diagOpen && styles.diagChipActive,
            pressed && styles.diagChipPressed,
          ]}
        >
          <Text
            style={[styles.diagChipLabel, diagOpen && styles.diagChipLabelActive]}
          >
            DIAG
          </Text>
        </Pressable>
      </View>

      <Animated.View style={[styles.diagCard, diagStyle]} pointerEvents={diagOpen ? 'auto' : 'none'}>
        {diagRows.map((row) => (
          <View key={row.label} style={styles.diagRow}>
            <Text style={styles.diagLabel}>{row.label}</Text>
            <Text style={styles.diagValue} numberOfLines={1}>
              {row.value}
            </Text>
          </View>
        ))}
      </Animated.View>

      <View style={styles.stage}>
        <Gemstone
          active={online}
          locked={isLocked}
          batteryLevel={batteryLevel}
          isCharging={isCharging}
          onToggle={handleGemPress}
        />
        <View style={styles.statusRow}>
          <View
            style={[
              styles.dot,
              {
                backgroundColor: isLocked
                  ? palette.graphite
                  : online
                    ? palette.ruby.core
                    : palette.graphite,
              },
            ]}
          />
          <Text style={styles.statusText}>
            {isLocked
              ? 'NODE · SECURED'
              : online
                ? isCharging
                  ? 'NODE · LIVE · HYPER'
                  : 'NODE · LIVE'
                : 'NODE · DORMANT'}
          </Text>
        </View>
      </View>

      <Readouts
        stabilityPct={stabilityPct}
        yieldTokens={yieldTokens}
        online={online}
        locked={isLocked}
        nodeValuationUsd={btcPrice}
        isCharging={isCharging}
      />

      {pinPadMode ? (
        <PinPad
          mode={pinPadMode}
          onSubmit={handlePinSubmit}
          onCancel={handlePinCancel}
          rejectionNonce={pinRejectionNonce}
        />
      ) : null}

      <Manifesto
        visible={manifestoOpen}
        onClose={() => setManifestoOpen(false)}
      />

      <ProofOfOrigin
        visible={proofOpen}
        onClose={() => setProofOpen(false)}
        identity={identity}
        stats={{
          lifetimeBeats: heartbeat?.lifetimeCount ?? 0,
          firstBeatTs: heartbeat?.firstTs ?? null,
          chainTip: heartbeat?.lastHash ?? null,
        }}
      />
    </View>
  );
}

// Exposed for debugging — not wired into the UI. Lets a dev wipe the stored
// PIN, yield, AND the sovereign Ed25519 keypair without a full reinstall.
// Kept adjacent to the SecureStore helpers so it's obvious where the keys
// live. Wiping the identity also detaches every previously signed heartbeat,
// which is exactly what you want during dev churn — never in production.
export const __kinetikResetSecureStore = async () => {
  await secureDelete(KEY_PIN);
  await secureDelete(KEY_YIELD);
  await secureDelete(KEY_YIELD_TS);
  await eraseNodeIdentity();
  await eraseHeartbeatLog();
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 24,
  },
  crest: {
    alignItems: 'center',
    gap: 10,
    position: 'relative',
  },
  brand: {
    color: palette.platinum,
    fontSize: 18,
    letterSpacing: 6,
    fontWeight: '500',
  },
  rule: {
    width: 38,
    height: StyleSheet.hairlineWidth,
    backgroundColor: palette.ruby.core,
    opacity: 0.7,
  },
  subBrand: {
    color: palette.graphite,
    ...typography.label,
  },
  proofChip: {
    position: 'absolute',
    left: 0,
    top: 0,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.ruby.core,
    backgroundColor: 'rgba(160, 20, 40, 0.18)',
  },
  proofChipPressed: {
    opacity: 0.7,
  },
  proofChipLabel: {
    color: palette.ruby.ember,
    fontFamily: typography.mono,
    fontSize: 9,
    letterSpacing: 2.4,
    fontWeight: '600',
  },
  diagChip: {
    position: 'absolute',
    right: 0,
    top: 0,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.sapphire.deep,
    backgroundColor: 'rgba(0, 42, 102, 0.18)',
  },
  diagChipActive: {
    backgroundColor: 'rgba(0, 123, 255, 0.28)',
    borderColor: palette.sapphire.glow,
  },
  diagChipPressed: {
    opacity: 0.7,
  },
  diagChipLabel: {
    color: palette.sapphire.glow,
    fontFamily: typography.mono,
    fontSize: 9,
    letterSpacing: 2.4,
    fontWeight: '600',
  },
  diagChipLabelActive: {
    color: palette.platinum,
  },
  diagCard: {
    marginTop: 12,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: palette.obsidianSoft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.hairline,
    overflow: 'hidden',
  },
  diagRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  diagLabel: {
    color: palette.graphite,
    fontFamily: typography.mono,
    fontSize: 10,
    letterSpacing: 2.4,
    fontWeight: '500',
  },
  diagValue: {
    color: palette.sapphire.glow,
    fontFamily: typography.mono,
    fontSize: 11,
    letterSpacing: 1.8,
    fontWeight: '500',
    maxWidth: '60%',
    textAlign: 'right',
  },
  stage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 28,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    color: palette.platinum,
    ...typography.label,
  },
});
