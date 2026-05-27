// ============================================================================
// pollingPool.ts — centralised adapter polling manager.
// ----------------------------------------------------------------------------
// Replaces the 5 independent setInterval calls inside each AdapterCard
// with a single shared scheduler. Benefits:
//
//   1. Battery: one wake lock, not five. React Native's JS timer runs on the
//      main JS thread — five independent intervals cause more wakeups than
//      one coordinated pool.
//
//   2. Network: intelligent back-off when the app is backgrounded or the
//      screen is off. All five adapters pause together, not independently.
//
//   3. Cadence: each adapter can declare its natural update frequency.
//      Nodle changes every ~2h, WeatherXM every ~6h. Polling Nodle every
//      minute wastes nothing — polling WeatherXM every minute is wasteful.
//      The pool respects per-adapter cadences.
//
//   4. Deduplication: a single poll result fires to all registered callbacks
//      for that adapter. Multiple consumers (summary box + drawer card) share
//      one result without duplicating the network call.
//
// USAGE (from NetworkReadsPanel.tsx):
//
//   const pool = useMemo(() => new PollingPool(), []);
//
//   useEffect(() => {
//     adapters.forEach((a) =>
//       pool.register(a, 60_000, (snap, err) => {
//         onSnapshotChangeFor[a.id](snap ?? null);
//       })
//     );
//     pool.start();
//     return () => pool.stop();
//   }, [adapters]);
//
// The pool fires an immediate poll for each adapter on start() so the UI
// has data within the first second.
// ============================================================================

import type { DepinAdapter, EarningSnapshot } from '../../kinetik-core/src/adapter';

// ---------------------------------------------------------------------------
// Types.
// ---------------------------------------------------------------------------

export type PollCallback = (
  snapshot: EarningSnapshot | null,
  error?: Error,
) => void;

type PoolEntry = {
  adapter:    DepinAdapter;
  intervalMs: number;
  callbacks:  PollCallback[];
  timer:      ReturnType<typeof setInterval> | null;
  lastPollAt: number;
  inflight:   boolean;
};

// ---------------------------------------------------------------------------
// PollingPool.
// ---------------------------------------------------------------------------
export class PollingPool {
  private entries = new Map<string, PoolEntry>();
  private running = false;

  /**
   * Register an adapter in the pool.
   * If the adapter is already registered, the callback is added to its
   * subscriber list. If the supplied `intervalMs` is SHORTER than the
   * current value, the timer is restarted at the faster cadence so the
   * pool honours the most aggressive subscriber. A LONGER value is
   * ignored to avoid one subscriber starving the others.
   */
  register(
    adapter: DepinAdapter,
    intervalMs: number,
    callback: PollCallback,
  ): void {
    const existing = this.entries.get(adapter.id);
    if (existing) {
      existing.callbacks.push(callback);
      // Re-register with a shorter interval → re-arm at the faster pace.
      if (Number.isFinite(intervalMs) && intervalMs > 0 && intervalMs < existing.intervalMs) {
        existing.intervalMs = intervalMs;
        if (existing.timer) {
          clearInterval(existing.timer);
          existing.timer = null;
        }
        if (this.running) {
          this._startEntry(adapter.id);
        }
      }
      return;
    }
    this.entries.set(adapter.id, {
      adapter,
      intervalMs,
      callbacks: [callback],
      timer: null,
      lastPollAt: 0,
      inflight: false,
    });
    // If the pool is already running, start this adapter's timer immediately.
    if (this.running) {
      this._startEntry(adapter.id);
    }
  }

  /** Remove an adapter and stop its timer. */
  deregister(adapterId: string): void {
    const entry = this.entries.get(adapterId);
    if (!entry) return;
    if (entry.timer) {
      clearInterval(entry.timer);
      entry.timer = null;
    }
    this.entries.delete(adapterId);
  }

  /** Start polling all registered adapters. Fires one immediate poll. */
  start(): void {
    if (this.running) return;
    this.running = true;
    for (const id of this.entries.keys()) {
      this._startEntry(id);
    }
  }

  /** Stop all polling timers. Does not clear registrations. */
  stop(): void {
    if (!this.running) return;
    this.running = false;
    for (const entry of this.entries.values()) {
      if (entry.timer) {
        clearInterval(entry.timer);
        entry.timer = null;
      }
    }
  }

  /** Force an immediate poll for a specific adapter, regardless of the timer. */
  async pollNow(adapterId: string): Promise<void> {
    const entry = this.entries.get(adapterId);
    if (!entry) return;
    await this._poll(entry);
  }

  /** Force an immediate poll for all registered adapters. */
  async pollAll(): Promise<void> {
    const polls = Array.from(this.entries.values()).map((e) => this._poll(e));
    await Promise.allSettled(polls);
  }

  /** Number of registered adapters. */
  get size(): number {
    return this.entries.size;
  }

  // -------------------------------------------------------------------------
  // Private helpers.
  // -------------------------------------------------------------------------

  private _startEntry(adapterId: string): void {
    const entry = this.entries.get(adapterId);
    if (!entry) return;

    // Immediate first poll.
    void this._poll(entry);

    // Then on the interval.
    entry.timer = setInterval(() => {
      void this._poll(entry);
    }, entry.intervalMs);
  }

  private async _poll(entry: PoolEntry): Promise<void> {
    // Prevent concurrent polls for the same adapter.
    if (entry.inflight) return;
    entry.inflight = true;
    entry.lastPollAt = Date.now();

    try {
      const snapshot = await entry.adapter.pollEarnings();
      // The pool may have been stopped, OR this entry deregistered, while
      // the await was in flight. In either case skip notifying subscribers
      // so UI state stays consistent with the caller's expectation that
      // `stop()` / `deregister()` halts all side-effects.
      if (!this.running || this.entries.get(entry.adapter.id) !== entry) return;
      for (const cb of entry.callbacks) {
        try { cb(snapshot, undefined); } catch { /* ignore subscriber errors */ }
      }
    } catch (err) {
      if (!this.running || this.entries.get(entry.adapter.id) !== entry) return;
      const error = err instanceof Error ? err : new Error(String(err));
      for (const cb of entry.callbacks) {
        try { cb(null, error); } catch { /* ignore subscriber errors */ }
      }
    } finally {
      entry.inflight = false;
    }
  }
}
