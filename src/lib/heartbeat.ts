// ============================================================================
// Sovereign Node Heartbeat Log — hash-chained, Ed25519-signed uptime proofs.
// ----------------------------------------------------------------------------
// This is the second pillar of Phase 5 after identity. Every ~30 seconds
// while the node is LIVE (unlocked + online), the engine emits a signed
// heartbeat JSON payload:
//
//   {
//     v: 1,
//     kind: "heartbeat",
//     nodeId: "KINETIK-NODE-A3F2B719",
//     pubkey: <64-char hex>,
//     seq: 142,
//     ts: 1714000000000,
//     stabilityPct: 97,
//     online: true,
//     charging: false,
//     prevHash: <16-char hex>    // tip of previous heartbeat's message hash
//   }
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
// ~2KB soft limit per value):
//
//   kinetik.hb.seq.v1        last sequence number, monotonic across reboots
//   kinetik.hb.count.v1      lifetime heartbeat count
//   kinetik.hb.firstTs.v1    ms-since-epoch of the first-ever heartbeat
//   kinetik.hb.lastHash.v1   16-char hex of the tip hash (chain continuity)
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

import { type NodeIdentity, signMessage } from './identity';
import { stableStringify } from './stableJson';

// ----------------------------------------------------------------------------
// Tunables. Interval is conservative — 30s is cheap on battery and dense
// enough to make a meaningful uptime record. SESSION_RING_MAX bounds memory.
// ----------------------------------------------------------------------------
const HEARTBEAT_INTERVAL_MS = 30_000;
const SESSION_RING_MAX = 64;

export const HEARTBEAT_KEYS = {
  seq: 'kinetik.hb.seq.v1',
  count: 'kinetik.hb.count.v1',
  firstTs: 'kinetik.hb.firstTs.v1',
  lastHash: 'kinetik.hb.lastHash.v1',
} as const;

// ----------------------------------------------------------------------------
// Types.
// ----------------------------------------------------------------------------
export type HeartbeatPayload = {
  v: 1;
  kind: 'heartbeat';
  nodeId: string;
  pubkey: string;
  seq: number;
  ts: number;
  stabilityPct: number;
  online: boolean;
  charging: boolean;
  prevHash: string;
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
};

const EMPTY_SUMMARY: HeartbeatSummary = {
  seq: 0,
  sessionCount: 0,
  lifetimeCount: 0,
  firstTs: null,
  lastHash: null,
  lastSignature: null,
  lastTs: null,
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

const secureDelete = async (key: string): Promise<void> => {
  try {
    await SecureStore.deleteItemAsync(key);
  } catch (err) {
    console.warn('[heartbeat] SecureStore delete failed:', key, err);
  }
};

// ----------------------------------------------------------------------------
// eraseHeartbeatLog — for __kinetikResetSecureStore. Wiping identity without
// wiping the heartbeat summary would leave orphan seq/count under a new key.
// ----------------------------------------------------------------------------
export async function eraseHeartbeatLog(): Promise<void> {
  await secureDelete(HEARTBEAT_KEYS.seq);
  await secureDelete(HEARTBEAT_KEYS.count);
  await secureDelete(HEARTBEAT_KEYS.firstTs);
  await secureDelete(HEARTBEAT_KEYS.lastHash);
}

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
  const { verifyMessage } = await import('./identity');
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
) {
  const [summary, setSummary] = useState<HeartbeatSummary>(EMPTY_SUMMARY);
  const summaryRef = useRef<HeartbeatSummary>(EMPTY_SUMMARY);
  const ringRef = useRef<SignedHeartbeat[]>([]);
  const hydratedRef = useRef(false);
  const inFlightRef = useRef(false);
  const snapshotRef = useRef(getSnapshot);

  // Keep the latest getSnapshot closure in a ref so the interval body always
  // sees current telemetry without re-binding the interval on every prop change.
  useEffect(() => {
    snapshotRef.current = getSnapshot;
  }, [getSnapshot]);

  // Commit summary updates to both state (for UI) and ref (for async reads).
  const commitSummary = useCallback((next: HeartbeatSummary) => {
    summaryRef.current = next;
    setSummary(next);
  }, []);

  // Hydrate persisted summary exactly once.
  useEffect(() => {
    (async () => {
      const [seqRaw, countRaw, firstRaw, lastHashRaw] = await Promise.all([
        secureGet(HEARTBEAT_KEYS.seq),
        secureGet(HEARTBEAT_KEYS.count),
        secureGet(HEARTBEAT_KEYS.firstTs),
        secureGet(HEARTBEAT_KEYS.lastHash),
      ]);
      const seq = Number(seqRaw);
      const count = Number(countRaw);
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
      });
      hydratedRef.current = true;
    })();
  }, [commitSummary]);

  // The actual beat emit. Extracted so we can call it from both the interval
  // and AppState change handlers without duplicating the signing pipeline.
  const emitHeartbeat = useCallback(async () => {
    if (!identity || !hydratedRef.current) return;
    if (inFlightRef.current) return; // never queue: one beat at a time
    inFlightRef.current = true;
    try {
      const snap = snapshotRef.current();
      const prev = summaryRef.current;
      const nextSeq = prev.seq + 1;
      const now = Date.now();

      const payload: HeartbeatPayload = {
        v: 1,
        kind: 'heartbeat',
        nodeId: identity.nodeId,
        pubkey: identity.publicKeyHex,
        seq: nextSeq,
        ts: now,
        stabilityPct: Math.round(snap.stabilityPct),
        online: snap.online,
        charging: snap.charging,
        prevHash: prev.lastHash ?? '0000000000000000',
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
      };
      commitSummary(nextSummary);

      // Persist the bits that must survive a reboot. Fire-and-forget — a
      // failed write warns but does not block the next beat.
      void secureSet(HEARTBEAT_KEYS.seq, nextSeq);
      void secureSet(HEARTBEAT_KEYS.count, nextSummary.lifetimeCount);
      void secureSet(HEARTBEAT_KEYS.lastHash, hash);
      if (prev.firstTs === null) {
        void secureSet(HEARTBEAT_KEYS.firstTs, now);
      }
    } catch (err) {
      console.warn('[heartbeat] emit failed:', err);
    } finally {
      inFlightRef.current = false;
    }
  }, [identity, commitSummary]);

  // Start/stop the interval whenever `active` toggles or identity first
  // materializes. We also emit one beat immediately on activation so the
  // DIAG panel reflects liveness without a 30s wait.
  useEffect(() => {
    if (!identity || !active) return;
    void emitHeartbeat();
    const id = setInterval(() => {
      void emitHeartbeat();
    }, HEARTBEAT_INTERVAL_MS);
    return () => clearInterval(id);
  }, [identity, active, emitHeartbeat]);

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
        }
      }
    });
    return () => sub.remove();
  }, []);

  const getRing = useCallback((): readonly SignedHeartbeat[] => ringRef.current, []);

  return { summary, getRing };
}
