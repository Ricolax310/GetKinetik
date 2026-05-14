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

import { useCallback, useEffect, useRef, useState } from 'react';
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
  /**
   * Force an immediate refetch of the bureau Genesis Score. Wired into
   * ProofOfOrigin so the chip updates the moment a user mints a fresh
   * proof — previously the user had to wait up to 5 minutes for the
   * interval tick. v1.5.0 shipped without this and we saw users report
   * "I verified and nothing changed".
   */
  refresh: () => Promise<void>;
};

// ---------------------------------------------------------------------------
// Internal constants.
// ---------------------------------------------------------------------------

const SCORE_ENDPOINT = (nodeId: string) =>
  `https://getkinetik.app/api/score/${nodeId}`;
const VERIFY_ENDPOINT = 'https://getkinetik.app/api/verify-device';
const REFRESH_MS = 5 * 60 * 1_000; // 5 min

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
  // Tracks whether the host component is still mounted. We never want to
  // call setResult/setLoading/setError after unmount — the fetch/json
  // awaits can settle after the user has already left the screen.
  const mountedRef   = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

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

  // ── Response parser ────────────────────────────────────────────────
  // v1.x bureau: `{ valid:true, genesisScore, scoreBand, methodologyVersion }`.
  // v2 bureau:   `{ valid:true, derived:{ score, tier, policyVersion }, ... }`
  //              and GET /api/score returns `{ derived, asOf, ... }` (no `valid`).
  // We accept both shapes so the app stays compatible across deployments.
  const parseScore = (data: unknown): GenesisScoreResult | null => {
    if (!data || typeof data !== 'object') return null;
    const d = data as Record<string, unknown>;
    if ('error' in d && d.error) return null;
    if ('valid' in d && d.valid === false) return null;

    const derived =
      d.derived && typeof d.derived === 'object'
        ? (d.derived as Record<string, unknown>)
        : null;

    let score: number | null = null;
    let band: string | null = null;

    if (typeof d.genesisScore === 'number' && Number.isFinite(d.genesisScore)) {
      score = d.genesisScore;
      band = typeof d.scoreBand === 'string' ? d.scoreBand : null;
    } else if (
      derived &&
      typeof derived.score === 'number' &&
      Number.isFinite(derived.score)
    ) {
      score = derived.score;
      band = typeof derived.tier === 'string' ? derived.tier : null;
    }

    if (score === null) return null;

    let methodologyVersion = 'v1.0';
    if (typeof d.methodologyVersion === 'string' && d.methodologyVersion) {
      methodologyVersion = d.methodologyVersion;
    } else if (
      derived &&
      typeof derived.policyVersion === 'string' &&
      derived.policyVersion
    ) {
      methodologyVersion = derived.policyVersion;
    } else if (derived) {
      methodologyVersion = 'v2.0.2';
    }

    return {
      score,
      band: band ?? 'UNGRADED',
      methodologyVersion,
      asOf:
        typeof d.asOf === 'string'
          ? (d.asOf as string)
          : new Date().toISOString(),
    };
  };

  const runFetch = useCallback(async () => {
    const id    = identityRef.current;
    const stats = statsRef.current;
    if (!id || stats.lifetimeBeats === 0 || !stats.chainTip) return;
    if (fetchingRef.current) return;

    fetchingRef.current = true;
    if (mountedRef.current) {
      setLoading(true);
      setError(false);
    }

    try {
      // ── Fast path: cached score ──────────────────────────────────────
      const cacheRes = await fetch(SCORE_ENDPOINT(id.nodeId));
      if (!mountedRef.current) return;
      if (cacheRes.ok) {
        let data: unknown = null;
        try {
          data = await cacheRes.json();
        } catch {
          /* 200 with empty/garbled body — treat as not-yet-graded */
        }
        if (!mountedRef.current) return;
        const parsed = parseScore(data);
        if (parsed) {
          setResult(parsed);
          return;
        }
        // 200 with no usable score: fall through to self-verify so we
        // can seed the bureau cache rather than leaving the chip stuck
        // on the empty body forever.
      }

      // ── Slow path: self-verify to seed the bureau cache ──────────────
      // Triggered on 404 (no cache) OR on a malformed 200 (empty body /
      // missing fields). Self-verification is valid — the bureau verifies
      // the signature; it doesn't care who posts.
      if (cacheRes.status === 404 || cacheRes.ok) {
        const proof = await createProofOfOrigin(id, stats);
        const proofUrl = buildVerifierUrl(proof);
        const verifyRes = await fetch(VERIFY_ENDPOINT, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ proofUrl }),
        });
        if (!mountedRef.current) return;
        if (verifyRes.ok) {
          let vdata: unknown = null;
          try {
            vdata = await verifyRes.json();
          } catch {
            /* shape error — drop to error state below */
          }
          if (!mountedRef.current) return;
          const parsed = parseScore(vdata);
          if (parsed) {
            setResult(parsed);
            return;
          }
        }
      }

      // Any other branch: mark error, keep previous result displayed.
      if (mountedRef.current) setError(true);
    } catch {
      if (mountedRef.current) setError(true);
    } finally {
      if (mountedRef.current) setLoading(false);
      fetchingRef.current = false;
    }
  }, []);

  const refresh = useCallback(async () => {
    await runFetch();
  }, [runFetch]);

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

  return { result, loading, error, refresh };
}
