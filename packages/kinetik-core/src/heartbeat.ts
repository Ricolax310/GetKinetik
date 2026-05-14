// ============================================================================
// Sovereign Node Heartbeat Log — hash-chained, Ed25519-signed uptime proofs.
// ----------------------------------------------------------------------------
// This is the second pillar of Phase 5 after identity. Every ~30 seconds
// while the node is LIVE (unlocked + online), the engine emits a signed
// heartbeat JSON payload:
//
//   {
//     v: 2,                       // bumped from 1 in the L2 schema bump
//     kind: "heartbeat",
//     nodeId: "KINETIK-NODE-A3F2B719",
//     pubkey: <64-char hex>,
//     seq: 142,
//     ts: 1714000000000,
//     stabilityPct: 97,
//     online: true,
//     charging: false,
//     prevHash: <16-char hex>,   // tip of previous heartbeat's message hash
//     sensors: {                  // L2 — three permission-free aggregates
//       lux: 348 | null,          // ambient light, integer lux
//       motionRms: 0.07 | null,   // RMS accel deviation over the window, g
//       pressureHpa: 1013.21 | null, // barometer point read, hPa
//     }
//   }
//
// SCHEMA HISTORY:
//   v:1 — identity, seq, prevHash, stability + online + charging telemetry.
//         Every heartbeat ever signed before 2026-04-25 is v:1.
//   v:2 — adds the `sensors` block above. Verifier accepts both v:1 and
//         v:2; existing v:1 chains remain valid forever. New chains start
//         at v:2 from the next reboot.
//
// The JSON is stably stringified (sorted keys) and signed with the node's
// Ed25519 secret key. `prevHash` chains each beat to the one before, which
// makes the log tamper-evident: flipping any past beat breaks the chain
// forward from that point. The chain TIP (last hash + last seq + lifetime
// count + first-ever timestamp) is persisted to SecureStore so the chain
// survives reboots.
//
// Storage shape — deliberately minimal so the entire persisted summary fits
// in a few SecureStore keys (Android's EncryptedSharedPreferences has a
// ~2KB soft limit per value). Key strings live in ./heartbeatPersist.ts.
//
// The full session ring of signed heartbeats lives in memory only. That's
// enough for Phase 5 Step 4's Proof of Origin card, which stamps the
// lifetime count + first timestamp + chain tip + current seq. Durable
// ring persistence can come later via expo-file-system (one more rebuild).
// ============================================================================

import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { sha256 } from '@noble/hashes/sha2.js';
import * as SecureStore from 'expo-secure-store';

import { type NodeIdentity, signMessage, verifyMessage } from './identity';
import {
  HEARTBEAT_KEYS,
  HEARTBEAT_CHAIN_PUBKEY_KEY,
  eraseHeartbeatLog,
} from './heartbeatPersist';
import {
  canonicalSensorBlock,
  type SensorReadout,
} from './sensors';
import { stableStringify } from './stableJson';

export { HEARTBEAT_KEYS, eraseHeartbeatLog } from './heartbeatPersist';

// ----------------------------------------------------------------------------
// Tunables. The default interval is 30s — cheap on battery, dense enough to
// make a meaningful uptime record, and the cadence the chain has been signed
// at since rung 2. Callers may pass a different `intervalMs` to useHeartbeat
// (see ./cadence.ts) to slow the cadence when the app is backgrounded /
// off-charger; that is policy, not part of the chain contract. The chain
// itself is order-only — variable cadence does not change any signature
// shape, any prevHash linkage, or the verifier's accept rules. SESSION_RING_MAX
// bounds in-memory ring size regardless of cadence.
// ----------------------------------------------------------------------------
export const HEARTBEAT_INTERVAL_MS = 30_000;
const SESSION_RING_MAX = 64;
// Hard floor on the heartbeat cadence. The chain itself doesn't care about
// the cadence, but `setInterval` with a value ≤ 0 (or NaN) collapses to a
// tight loop on most JS runtimes. Five seconds is plenty for tests and the
// shortest profile we ever ship (`active` = 30s).
const MIN_INTERVAL_MS = 5_000;

// ----------------------------------------------------------------------------
// Types.
// ----------------------------------------------------------------------------
export type HeartbeatPayload = {
  v: 2;
  kind: 'heartbeat';
  nodeId: string;
  pubkey: string;
  seq: number;
  ts: number;
  stabilityPct: number;
  online: boolean;
  charging: boolean;
  prevHash: string;
  /**
   * L2 sensor block — three permission-free, privacy-neutral aggregates.
   * Constructed via canonicalSensorBlock() so keys insert in lexicographic
   * order; that's what makes the byte sequence reproducible across the app
   * and the verifier without needing recursive sorting in stableStringify.
   * Any field may be null on devices missing that sensor (common: iOS has
   * no light sensor; budget Androids have no barometer).
   */
  sensors: SensorReadout;
};

export type SignedHeartbeat = {
  payload: HeartbeatPayload;
  /** stably-stringified JSON — what was actually signed */
  message: string;
  /** 128-char lowercase hex ed25519 signature */
  signature: string;
  /** 16-char lowercase hex truncation of sha256(message) — chain tip */
  hash: string;
};

export type HeartbeatSnapshot = {
  stabilityPct: number;
  online: boolean;
  charging: boolean;
};

export type HeartbeatSummary = {
  /** seq of the most recent heartbeat this session, or 0 if none yet */
  seq: number;
  /** count of heartbeats emitted in the current session */
  sessionCount: number;
  /** lifetime heartbeat count, persisted across reboots */
  lifetimeCount: number;
  /** first-ever heartbeat timestamp, persisted */
  firstTs: number | null;
  /** chain tip hash (16-char hex) from the most recent heartbeat, persisted */
  lastHash: string | null;
  /** last signature (128-char hex) from this session, in-memory only */
  lastSignature: string | null;
  /** last heartbeat timestamp this session */
  lastTs: number | null;
  /** sensor block from the most recent SIGNED beat, in-memory only. Surfaces
   *  the same numbers that were committed to the chain so the diagnostic
   *  panel shows what the verifier would see, not what the live sensors
   *  read between beats. */
  lastSensors: SensorReadout | null;
};

const EMPTY_SUMMARY: HeartbeatSummary = {
  seq: 0,
  sessionCount: 0,
  lifetimeCount: 0,
  firstTs: null,
  lastHash: null,
  lastSignature: null,
  lastTs: null,
  lastSensors: null,
};

// ----------------------------------------------------------------------------
// Helpers — local to the module so nothing in identity.ts has to change.
// ----------------------------------------------------------------------------
const toHex = (bytes: Uint8Array): string =>
  Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');

const secureGet = async (key: string): Promise<string | null> => {
  try {
    return await SecureStore.getItemAsync(key);
  } catch (err) {
    console.warn('[heartbeat] SecureStore read failed:', key, err);
    return null;
  }
};

const secureSet = async (key: string, value: unknown): Promise<void> => {
  try {
    await SecureStore.setItemAsync(key, String(value));
  } catch (err) {
    console.warn('[heartbeat] SecureStore write failed:', key, err);
  }
};

// ----------------------------------------------------------------------------
// Offline verification helper. Given a signed heartbeat and the emitting
// node's public key, confirm:
//   1. Signature is valid over the exact `message` string.
//   2. `hash` matches sha256(message) truncated to 16 hex chars.
//
// Step 4's Proof of Origin card will embed the chain tip; anyone can walk
// forward from there with this helper to audit every claim.
// ----------------------------------------------------------------------------
export async function verifyHeartbeat(
  beat: SignedHeartbeat,
  publicKeyHex: string,
): Promise<boolean> {
  const hashOk =
    toHex(sha256(new TextEncoder().encode(beat.message))).slice(0, 16) ===
    beat.hash;
  if (!hashOk) return false;
  return verifyMessage(beat.signature, beat.message, publicKeyHex);
}

// ----------------------------------------------------------------------------
// useHeartbeat — the React hook the VaultPanel will consume.
// ----------------------------------------------------------------------------
// Responsibilities:
//   · Hydrate persisted summary (seq/count/firstTs/lastHash) on mount.
//   · Start an interval that emits + signs + chains heartbeats every
//     HEARTBEAT_INTERVAL_MS, gated on `active` (caller passes !isLocked && online).
//   · Keep a bounded in-memory ring of the last SESSION_RING_MAX signed beats.
//   · Persist summary updates after each beat + on AppState background.
//   · Return a `summary` snapshot for the UI and a `getRing()` accessor for
//     future exporters (Proof of Origin card).
// ----------------------------------------------------------------------------
export function useHeartbeat(
  identity: NodeIdentity | null,
  active: boolean,
  getSnapshot: () => HeartbeatSnapshot,
  getSensors?: () => Promise<SensorReadout>,
  /**
   * Optional cadence in ms. Defaults to HEARTBEAT_INTERVAL_MS (30s) so
   * existing callers see no behavior change. When set, the interval
   * re-binds whenever the value changes, so consumers can pass an
   * adaptive cadence from useAdaptiveCadenceMs (see ./cadence.ts) to
   * slow down on battery / in background. The chain contract is
   * unaffected — beats just need to be ordered.
   */
  intervalMs: number = HEARTBEAT_INTERVAL_MS,
) {
  const [summary, setSummary] = useState<HeartbeatSummary>(EMPTY_SUMMARY);
  const summaryRef = useRef<HeartbeatSummary>(EMPTY_SUMMARY);
  const ringRef = useRef<SignedHeartbeat[]>([]);
  /** False until SecureStore chain is loaded for the current `identity` pubkey. */
  const [chainReady, setChainReady] = useState(false);
  const inFlightRef = useRef(false);
  const snapshotRef = useRef(getSnapshot);
  const sensorsRef = useRef<typeof getSensors>(getSensors);
  const identityRef = useRef(identity);

  useEffect(() => {
    identityRef.current = identity;
  }, [identity]);

  // Keep the latest getSnapshot / getSensors closures in refs so the interval
  // body always sees current accessors without re-binding the interval on
  // every prop change. Avoids ping-pong subscriptions.
  useEffect(() => {
    snapshotRef.current = getSnapshot;
  }, [getSnapshot]);
  useEffect(() => {
    sensorsRef.current = getSensors;
  }, [getSensors]);

  // Commit summary updates to both state (for UI) and ref (for async reads).
  const commitSummary = useCallback((next: HeartbeatSummary) => {
    summaryRef.current = next;
    setSummary(next);
  }, []);

  // Hydrate persisted summary whenever the node's signing pubkey changes.
  // Waits for `identity` so we never flash another node's lifetime count from
  // global SecureStore keys before the real identity has mounted.
  useEffect(() => {
    if (!identity?.publicKeyHex) {
      commitSummary(EMPTY_SUMMARY);
      setChainReady(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const pub = identity.publicKeyHex;
      const [seqRaw, countRaw, firstRaw, lastHashRaw, chainPubRaw] =
        await Promise.all([
          secureGet(HEARTBEAT_KEYS.seq),
          secureGet(HEARTBEAT_KEYS.count),
          secureGet(HEARTBEAT_KEYS.firstTs),
          secureGet(HEARTBEAT_KEYS.lastHash),
          secureGet(HEARTBEAT_CHAIN_PUBKEY_KEY),
        ]);
      if (cancelled) return;

      const count = Number(countRaw);
      const hasChain = Number.isFinite(count) && count > 0;
      if (
        hasChain &&
        typeof chainPubRaw === 'string' &&
        /^[0-9a-f]{64}$/i.test(chainPubRaw) &&
        chainPubRaw.toLowerCase() !== pub.toLowerCase()
      ) {
        await eraseHeartbeatLog();
        if (cancelled) return;
        commitSummary(EMPTY_SUMMARY);
        setChainReady(true);
        return;
      }

      const seq = Number(seqRaw);
      const firstTs = Number(firstRaw);
      const validHash =
        typeof lastHashRaw === 'string' && /^[0-9a-f]{16}$/i.test(lastHashRaw)
          ? lastHashRaw.toLowerCase()
          : null;

      commitSummary({
        seq: Number.isFinite(seq) && seq > 0 ? seq : 0,
        sessionCount: 0,
        lifetimeCount: Number.isFinite(count) && count > 0 ? count : 0,
        firstTs: Number.isFinite(firstTs) && firstTs > 0 ? firstTs : null,
        lastHash: validHash,
        lastSignature: null,
        lastTs: null,
        lastSensors: null,
      });
      setChainReady(true);
    })().catch((err) => {
      console.warn('[heartbeat] hydrate failed:', err);
      if (!cancelled) setChainReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [identity?.publicKeyHex, commitSummary, identity]);

  // The actual beat emit. Extracted so we can call it from both the interval
  // and AppState change handlers without duplicating the signing pipeline.
  const emitHeartbeat = useCallback(async () => {
    if (!identity || !chainReady) return;
    if (inFlightRef.current) return; // never queue: one beat at a time
    inFlightRef.current = true;
    try {
      const snap = snapshotRef.current();
      // Sensors are optional — a hook caller without a sampler still gets
      // valid v:2 beats, just with all sensor fields null. Schema stability
      // matters more than always having data: the verifier renders nulls as
      // "—" and the chain stays consistent.
      const rawSensors: SensorReadout = sensorsRef.current
        ? await sensorsRef.current()
        : { motionRms: null, pressureHpa: null, lux: null };
      const sensors = canonicalSensorBlock(rawSensors);
      const prev = summaryRef.current;
      const nextSeq = prev.seq + 1;
      const now = Date.now();

      const payload: HeartbeatPayload = {
        v: 2,
        kind: 'heartbeat',
        nodeId: identity.nodeId,
        pubkey: identity.publicKeyHex,
        seq: nextSeq,
        ts: now,
        stabilityPct: Math.round(snap.stabilityPct),
        online: snap.online,
        charging: snap.charging,
        prevHash: prev.lastHash ?? '0000000000000000',
        sensors,
      };

      const message = stableStringify(payload as unknown as Record<string, unknown>);
      const signature = await signMessage(identity, message);
      const hash = toHex(sha256(new TextEncoder().encode(message))).slice(0, 16);

      const beat: SignedHeartbeat = { payload, message, signature, hash };

      // Append to session ring, drop oldest when over capacity.
      const ring = ringRef.current;
      ring.push(beat);
      if (ring.length > SESSION_RING_MAX) ring.shift();

      const nextSummary: HeartbeatSummary = {
        seq: nextSeq,
        sessionCount: prev.sessionCount + 1,
        lifetimeCount: prev.lifetimeCount + 1,
        firstTs: prev.firstTs ?? now,
        lastHash: hash,
        lastSignature: signature,
        lastTs: now,
        lastSensors: sensors,
      };
      commitSummary(nextSummary);

      // Persist the bits that must survive a reboot. Fire-and-forget — a
      // failed write warns but does not block the next beat.
      void secureSet(HEARTBEAT_KEYS.seq, nextSeq);
      void secureSet(HEARTBEAT_KEYS.count, nextSummary.lifetimeCount);
      void secureSet(HEARTBEAT_KEYS.lastHash, hash);
      void secureSet(HEARTBEAT_CHAIN_PUBKEY_KEY, identity.publicKeyHex);
      if (prev.firstTs === null) {
        void secureSet(HEARTBEAT_KEYS.firstTs, now);
      }
    } catch (err) {
      console.warn('[heartbeat] emit failed:', err);
    } finally {
      inFlightRef.current = false;
    }
  }, [identity, chainReady, commitSummary]);

  // Start/stop the interval whenever `active` toggles, identity materializes,
  // or the cadence changes. We also emit one beat immediately on activation
  // so the DIAG panel reflects liveness without a full cadence wait. When
  // intervalMs changes (e.g. AppState dropped from foreground to background
  // and useAdaptiveCadenceMs returned a slower value), the effect re-runs:
  // the previous interval is cleared and a new one starts at the new cadence.
  // The pending beat from the previous cadence is allowed to settle via the
  // inFlightRef guard — we never overlap two emit calls.
  useEffect(() => {
    if (!identity || !active) return;
    void emitHeartbeat();
    // Defensive clamp: if a caller (or a bug) ever hands us 0 / NaN /
    // negative, fall back to the default cadence rather than spinning.
    const safeInterval = Number.isFinite(intervalMs) && intervalMs >= MIN_INTERVAL_MS
      ? intervalMs
      : HEARTBEAT_INTERVAL_MS;
    const id = setInterval(() => {
      void emitHeartbeat();
    }, safeInterval);
    return () => clearInterval(id);
  }, [identity, active, intervalMs, emitHeartbeat]);

  // Persist a final summary when the app backgrounds — if the interval is
  // cut off mid-cycle we still want the seq/count/firstTs/lastHash written.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'background' || next === 'inactive') {
        const s = summaryRef.current;
        if (s.seq > 0) {
          void secureSet(HEARTBEAT_KEYS.seq, s.seq);
          void secureSet(HEARTBEAT_KEYS.count, s.lifetimeCount);
          if (s.lastHash) void secureSet(HEARTBEAT_KEYS.lastHash, s.lastHash);
          if (s.firstTs) void secureSet(HEARTBEAT_KEYS.firstTs, s.firstTs);
          const pk = identityRef.current?.publicKeyHex;
          if (pk) void secureSet(HEARTBEAT_CHAIN_PUBKEY_KEY, pk);
        }
      }
    });
    return () => sub.remove();
  }, []);

  const getRing = useCallback((): readonly SignedHeartbeat[] => ringRef.current, []);

  return { summary, getRing };
}
