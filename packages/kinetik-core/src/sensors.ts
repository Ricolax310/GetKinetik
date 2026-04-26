// ============================================================================
// Sovereign Node Sensor Sampler — L2 (sensor capture + signing) groundwork.
// ----------------------------------------------------------------------------
// This module owns three permission-free, privacy-neutral phone sensors and
// distills them into a single SensorReadout per heartbeat:
//
//   · Accelerometer  → motionRms    (RMS of |a| − mean|a| over the window, g)
//   · Barometer      → pressureHpa  (single point reading at beat time, hPa)
//   · LightSensor    → lux          (single point reading at beat time, lux)
//
// WHY only aggregates, never raw streams:
//   The chain ledgers SUMMARIES, not surveillance. A 1Hz accelerometer
//   stream signed beat-after-beat would let an adversary reconstruct the
//   user's gait, typing cadence, and intimate motion. A single RMS scalar
//   per 30s window proves "this device experienced motion" without
//   revealing what kind. Same principle as Rung 5's "Never sign raw
//   mic/GPS content — only aggregates" rule (STATUS.md), applied across
//   the board from day one.
//
// WHY zero new permissions:
//   None of these three sensors require a runtime permission prompt on
//   modern Android (or iOS, where light is unavailable). Every one is
//   low-power. The accelerometer is already running for the Gemstone
//   tilt animation; barometer + light each draw < 1 mA at the cadences
//   below. This keeps the "non-fungible battery" promise from L1 intact.
//
// Module shape — explicitly module-scoped state, not a class:
//   The sampler is a process-wide singleton. Multiple components subscribing
//   to the same physical sensor would just multiply battery cost for no
//   benefit. The module-level rings + subscriptions mean a single
//   startSensorSampler() at app boot is enough; readSensorAggregate() can
//   be called from anywhere (heartbeat hook, future L3 optimizer, debug UI).
//
// All sensor inits fail-soft: a missing barometer (common on budget phones)
// returns `pressureHpa: null` indefinitely. The signed payload still carries
// the field — schema stays consistent — but its value is null, which the
// verifier renders as "—". Never crash on a missing sensor.
// ============================================================================

import { Accelerometer, Barometer, LightSensor } from 'expo-sensors';

// ----------------------------------------------------------------------------
// Tunables. Conservative on battery — these rates are deliberately low.
// Accelerometer at 1Hz gives ~30 samples per heartbeat window; that's plenty
// of resolution to distinguish "phone in pocket on a walk" from "phone at
// rest on a desk" without producing a streamable trace of the user's motion.
// ----------------------------------------------------------------------------
const ACCEL_INTERVAL_MS = 1000;
const BARO_INTERVAL_MS = 5000;
const LIGHT_INTERVAL_MS = 5000;

// Bound the accel ring to two heartbeat windows of headroom. If the heartbeat
// hook misses a tick we still get a representative aggregate; if it goes
// completely silent we don't memory-leak forever.
const ACCEL_RING_MAX = 80;

// ----------------------------------------------------------------------------
// Types — exported so heartbeat.ts and the verifier can describe the same
// shape end-to-end.
// ----------------------------------------------------------------------------
export type SensorReadout = {
  /**
   * RMS of (|acceleration| − mean|acceleration|) over the most recent
   * window, expressed in g (gravities). Subtracting the mean removes the
   * standing 1g pull of gravity so the value is ~0 when stationary, and
   * rises with motion. Two-decimal rounding keeps the chain compact.
   */
  motionRms: number | null;
  /** Last barometer reading at aggregate time, in hPa. Two-decimal rounded. */
  pressureHpa: number | null;
  /** Last ambient light reading at aggregate time, in lux. Integer rounded. */
  lux: number | null;
};

// ----------------------------------------------------------------------------
// Module state — singleton sampler.
// ----------------------------------------------------------------------------
const accelRing: number[] = [];
let lastPressureHpa: number | null = null;
let lastLux: number | null = null;

let accelSub: { remove: () => void } | null = null;
let baroSub: { remove: () => void } | null = null;
let lightSub: { remove: () => void } | null = null;

let accelAvailable = false;
let baroAvailable = false;
let lightAvailable = false;

let started = false;

// ----------------------------------------------------------------------------
// startSensorSampler — idempotent. Safe to call multiple times; only the
// first invocation actually wires native subscriptions. Each sensor probes
// availability independently and degrades gracefully on failure.
// ----------------------------------------------------------------------------
export async function startSensorSampler(): Promise<void> {
  if (started) return;
  started = true;

  try {
    accelAvailable = await Accelerometer.isAvailableAsync();
    if (accelAvailable) {
      Accelerometer.setUpdateInterval(ACCEL_INTERVAL_MS);
      accelSub = Accelerometer.addListener(({ x, y, z }) => {
        const m = Math.sqrt(x * x + y * y + z * z);
        if (Number.isFinite(m)) {
          accelRing.push(m);
          if (accelRing.length > ACCEL_RING_MAX) accelRing.shift();
        }
      });
    }
  } catch (err) {
    console.warn('[sensors] accelerometer init failed:', err);
    accelAvailable = false;
  }

  try {
    baroAvailable = await Barometer.isAvailableAsync();
    if (baroAvailable) {
      Barometer.setUpdateInterval(BARO_INTERVAL_MS);
      baroSub = Barometer.addListener(({ pressure }) => {
        if (typeof pressure === 'number' && Number.isFinite(pressure)) {
          lastPressureHpa = pressure;
        }
      });
    }
  } catch (err) {
    console.warn('[sensors] barometer init failed:', err);
    baroAvailable = false;
  }

  try {
    lightAvailable = await LightSensor.isAvailableAsync();
    if (lightAvailable) {
      LightSensor.setUpdateInterval(LIGHT_INTERVAL_MS);
      lightSub = LightSensor.addListener(({ illuminance }) => {
        if (typeof illuminance === 'number' && Number.isFinite(illuminance)) {
          lastLux = illuminance;
        }
      });
    }
  } catch (err) {
    // LightSensor is Android-only; on iOS this throws "unavailable", which
    // is the expected case, not a bug. Warn at low volume.
    console.warn('[sensors] light sensor init failed (expected on iOS):', err);
    lightAvailable = false;
  }
}

// ----------------------------------------------------------------------------
// stopSensorSampler — tear down every subscription and zero the rings. Used
// on unmount and from __kinetikResetSecureStore for hygiene.
// ----------------------------------------------------------------------------
export function stopSensorSampler(): void {
  if (accelSub) {
    accelSub.remove();
    accelSub = null;
  }
  if (baroSub) {
    baroSub.remove();
    baroSub = null;
  }
  if (lightSub) {
    lightSub.remove();
    lightSub = null;
  }
  accelRing.length = 0;
  lastPressureHpa = null;
  lastLux = null;
  accelAvailable = false;
  baroAvailable = false;
  lightAvailable = false;
  started = false;
}

// ----------------------------------------------------------------------------
// readSensorAggregate — drain the accel ring into a single RMS, snapshot
// the latest baro + lux readings, and return all three as a SensorReadout.
//
// The ring is DRAINED on read (not just snapshotted) so each heartbeat sees
// the motion energy from EXACTLY its own window — no double-counting, no
// stale samples bleeding across beats. Baro + lux are snapshots because
// pressure + ambient light are point measurements, not time integrals.
// ----------------------------------------------------------------------------
export async function readSensorAggregate(): Promise<SensorReadout> {
  let motionRms: number | null = null;
  if (accelAvailable && accelRing.length > 0) {
    const samples = accelRing.slice();
    accelRing.length = 0;
    let sum = 0;
    for (const v of samples) sum += v;
    const mean = sum / samples.length;
    let sumSq = 0;
    for (const v of samples) {
      const d = v - mean;
      sumSq += d * d;
    }
    const rms = Math.sqrt(sumSq / samples.length);
    motionRms = Math.round(rms * 100) / 100;
  }

  const pressureHpa =
    baroAvailable && lastPressureHpa != null
      ? Math.round(lastPressureHpa * 100) / 100
      : null;
  const lux =
    lightAvailable && lastLux != null ? Math.round(lastLux) : null;

  return { motionRms, pressureHpa, lux };
}

// ----------------------------------------------------------------------------
// canonicalSensorBlock — construct the sensors object with keys inserted in
// LEXICOGRAPHIC order (lux, motionRms, pressureHpa). Critical for chain
// integrity: stableStringify shallow-sorts top-level keys but JSON.stringify
// preserves insertion order for nested objects. Forcing alphabetical
// insertion here means the byte sequence is reproducible regardless of
// where the readout came from. If/when stableStringify ever switches to
// recursive sorting, no migration is needed.
// ----------------------------------------------------------------------------
export function canonicalSensorBlock(r: SensorReadout): SensorReadout {
  return {
    lux: r.lux,
    motionRms: r.motionRms,
    pressureHpa: r.pressureHpa,
  };
}
