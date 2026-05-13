// ============================================================================
// useGenesisScore — fetches the bureau Genesis Score for this node.
// ----------------------------------------------------------------------------
// STRATEGY
//
//   1. GET /api/score/:nodeId — reads from the bureau's KV cache.
//      This is the fast path: sub-100ms, no fresh proof needed.
//
//   2. If 404 (node not yet scored), mint a fresh Proof of Origin and
//      POST /api/verify-device to score + cache it.  Self-verification
//      is valid — the bureau verifies the signature; it doesn't care
//      who posts.  This seeds the KV cache for all future calls
//      (including from partners).
//
// The hook runs once when the node has its first heartbeat, then
// refreshes every REFRESH_MS.  It does NOT persist to SecureStore —
// the bureau is the source of truth.  Network errors surface as
// `error: true` and are silently retried on the next refresh cycle.
//
// DEPENDENCY ARRAY RATIONALE
//
//   We depend on identity?.nodeId (stable across renders), the boolean
//   of lifetimeBeats > 0 (fires once on first beat, never again), and
//   !!chainTip (same).  We intentionally exclude raw lifetimeBeats and
//   chainTip so the hook doesn't re-mount the interval on every
//   heartbeat tick.  The 5-minute refresh interval picks up changes
//   without causing unnecessary re-fires.
// ============================================================================

import { useEffect, useRef, useState } from 'react';
import {
  buildVerifierUrl,
  createProofOfOrigin,
  type NodeIdentity,
  type SensorReadout,
} from '../../packages/kinetik-core/src';

// ---------------------------------------------------------------------------
// Public API.
// ---------------------------------------------------------------------------

export type GenesisScoreResult = {
  score: number;
  band: string;
  methodologyVersion: string;
  asOf: string;
};

export type UseGenesisScoreReturn = {
  result: GenesisScoreResult | null;
  loading: boolean;
  error: boolean;
};

type GenesisScorePayload = {
  genesisScore: number;
  scoreBand: string;
  methodologyVersion: string;
  asOf?: string;
};

// ---------------------------------------------------------------------------
// Internal constants.
// ---------------------------------------------------------------------------

const SCORE_ENDPOINT = (nodeId: string) =>
  `https://getkinetik.app/api/score/${nodeId}`;
const VERIFY_ENDPOINT = 'https://getkinetik.app/api/verify-device';
const REFRESH_MS = 5 * 60 * 1_000; // 5 min

function toGenesisScoreResult(payload: unknown): GenesisScoreResult | null {
  if (!payload || typeof payload !== 'object') return null;

  const data = payload as Partial<GenesisScorePayload>;
  if (
    typeof data.genesisScore !== 'number' ||
    typeof data.scoreBand !== 'string' ||
    typeof data.methodologyVersion !== 'string'
  ) {
    return null;
  }

  return {
    score:              data.genesisScore,
    band:               data.scoreBand,
    methodologyVersion: data.methodologyVersion,
    asOf:               typeof data.asOf === 'string' ? data.asOf : new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Hook.
// ---------------------------------------------------------------------------

/**
 * Resolves the bureau Genesis Score for a Sovereign Node.
 *
 * @param identity    NodeIdentity from getOrCreateNodeIdentity().
 * @param lifetimeBeats  Lifetime heartbeat count (0 until first beat).
 * @param firstBeatTs    Timestamp of first heartbeat (null until first beat).
 * @param chainTip       Most recent heartbeat hash (null until first beat).
 * @param lastSensors    Sensor block from most recent signed beat.
 */
export function useGenesisScore(
  identity: NodeIdentity | null,
  lifetimeBeats: number,
  firstBeatTs: number | null,
  chainTip: string | null,
  lastSensors: SensorReadout | null,
): UseGenesisScoreReturn {
  const [result, setResult] = useState<GenesisScoreResult | null>(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(false);

  // Guards against concurrent fetches (e.g. interval fires while the
  // previous request is still in flight).
  const fetchingRef  = useRef(false);
  const intervalRef  = useRef<ReturnType<typeof setInterval> | null>(null);

  // Keep a stable ref to the latest stats so the interval callback can
  // always read the freshest values without being in its own dep array.
  const statsRef = useRef({ lifetimeBeats, firstBeatTs, chainTip, lastSensors });
  useEffect(() => {
    statsRef.current = { lifetimeBeats, firstBeatTs, chainTip, lastSensors };
  }, [lifetimeBeats, firstBeatTs, chainTip, lastSensors]);

  // Keep a stable ref to identity for the same reason.
  const identityRef = useRef(identity);
  useEffect(() => {
    identityRef.current = identity;
  }, [identity]);

  const runFetch = async () => {
    const id    = identityRef.current;
    const stats = statsRef.current;
    if (!id || stats.lifetimeBeats === 0 || !stats.chainTip) return;
    if (fetchingRef.current) return;

    fetchingRef.current = true;
    setLoading(true);
    setError(false);

    try {
      // ── Fast path: cached score ──────────────────────────────────────
      const cacheRes = await fetch(SCORE_ENDPOINT(id.nodeId));
      if (cacheRes.ok) {
        const parsed = toGenesisScoreResult(await cacheRes.json());
        if (parsed) {
          setResult(parsed);
          return;
        }
      }

      // ── Slow path: self-verify to seed the bureau cache ──────────────
      if (cacheRes.status === 404) {
        const proof = await createProofOfOrigin(id, stats);
        const proofUrl = buildVerifierUrl(proof);
        const verifyRes = await fetch(VERIFY_ENDPOINT, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ proofUrl }),
        });
        if (verifyRes.ok) {
          const data = await verifyRes.json();
          if (
            data &&
            typeof data === 'object' &&
            (data as { valid?: unknown }).valid === true
          ) {
            const parsed = toGenesisScoreResult(data);
            if (parsed) {
              setResult(parsed);
              return;
            }
          }
        }
      }

      // Any unexpected status: mark error, keep previous result displayed.
      setError(true);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  };

  useEffect(() => {
    if (!identity || lifetimeBeats === 0 || !chainTip) return;

    void runFetch();

    intervalRef.current = setInterval(() => void runFetch(), REFRESH_MS);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
    // Intentional: only re-fire when the node first becomes scorable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [identity?.nodeId, lifetimeBeats > 0, !!chainTip]);

  return { result, loading, error };
}
