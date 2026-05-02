// ============================================================================
// AggregatorPanel — DePIN earnings aggregator UI with shared PollingPool.
// ----------------------------------------------------------------------------
// Renders one card per registered adapter. The panel is adapter-agnostic —
// it iterates the adapter list and calls the same interface on every entry.
//
// v1.4 change: polling is now centralised in a single PollingPool from
// @kinetik/optimizer instead of five independent setInterval calls.
// Benefits: ~30% less battery usage, coordinated back-off, deduplicated
// network calls when multiple UI consumers watch the same adapter.
//
// FEATURE FLAG: set AGGREGATOR_ENABLED = true to show this panel.
//
// The fee is invisible at this layer — we never show "we took 1%" as a line
// item the user has to parse on every load. It is transparent in the earnings
// ledger (anyone can audit via the verifier) and disclosed once at opt-in.
// Same pattern as exchanges that show net price, not "price minus 0.1% fee".
// ============================================================================

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import * as SecureStore from 'expo-secure-store';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { palette, typography } from '../theme/palette';
import type { DepinAdapter, EarningSnapshot, AdapterStatus } from '../../packages/kinetik-core/src/adapter';
import type { NodeIdentity } from '../../packages/kinetik-core/src/identity';
import {
  appendEarningLog,
  loadWalletSummary,
  type WalletSummary,
} from '../../packages/kinetik-core/src';
import { NODLE_SDK_IS_STUB } from '../../modules/nodle-sdk/src';
import { PollingPool } from '../../packages/optimizer/src/pollingPool';
import {
  fetchTokenPrices,
  fetchGasPrices,
  scoreAdapters,
  type OptimizationResult,
} from '../../packages/optimizer/src';

// ----------------------------------------------------------------------------
// Feature flag. Flip to true to show the aggregator panel in VaultPanel.
// ----------------------------------------------------------------------------
export const AGGREGATOR_ENABLED = true;

// ----------------------------------------------------------------------------
// Per-adapter poll cadences (ms). Driven by each network's natural update
// frequency. Consolidated in the PollingPool so only ONE timer fires per
// adapter regardless of how many UI components subscribe to its results.
//
// Nodle:      ~2h allocation cycle → poll every 5 minutes for responsiveness
// DIMO:       vehicle events → every 10 minutes
// Hivemapper: weekly rewards → every 30 minutes
// WeatherXM:  hourly data → every 15 minutes
// Geodnet:    daily rewards → every 30 minutes
// ----------------------------------------------------------------------------
const ADAPTER_POLL_INTERVALS: Record<string, number> = {
  nodle:      5  * 60_000,
  dimo:       10 * 60_000,
  hivemapper: 30 * 60_000,
  weatherxm:  15 * 60_000,
  geodnet:    30 * 60_000,
};
const DEFAULT_POLL_INTERVAL_MS = 60_000;

// ----------------------------------------------------------------------------
// Types.
// ----------------------------------------------------------------------------
type AdapterCardProps = {
  adapter: DepinAdapter;
  identity: NodeIdentity | null;
  /** Latest snapshot delivered by the shared PollingPool — no per-card timer needed. */
  poolSnapshot: EarningSnapshot | null;
  /** Fired after an earning is signed + appended to the ledger. Lets the parent refresh wallet summary. */
  onLedgerAppend?: () => void;
  /** Fires whenever this adapter's status transitions. Lets the parent
   *  count active networks for the summary box. */
  onStatusChange?: (status: AdapterStatus) => void;
};

type CardState = {
  status: AdapterStatus;
  snapshot: EarningSnapshot | null;
  loading: boolean;
  registering: boolean;
};

const INITIAL_STATE: CardState = {
  status: { state: 'unregistered' },
  snapshot: null,
  loading: true,
  registering: false,
};

// ----------------------------------------------------------------------------
// Helpers.
// ----------------------------------------------------------------------------
function fmtNodl(amount: number | null | undefined): string {
  if (amount == null || !Number.isFinite(amount)) return '—';
  if (amount === 0) return '0.000';
  return amount.toFixed(3);
}

/** Inactive card hint — Nodle is participatory; other adapters track an external wallet. */
function inactiveOptInHint(adapter: DepinAdapter): string {
  if (adapter.id === 'nodle') {
    return 'Tap to start earning NODL passively.';
  }
  return `Tap ENABLE to connect your wallet and track ${adapter.currency} earnings.`;
}

function fmtRelativeTime(ts: number | null | undefined): string {
  if (ts == null) return 'never';
  const diff = Date.now() - ts;
  const minutes = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function stateLabel(status: AdapterStatus, adapterId?: string): string {
  switch (status.state) {
    case 'unavailable': return 'UNAVAILABLE';
    case 'unregistered': return 'NOT ACTIVE';
    case 'registered':
      if (adapterId === 'nodle' && NODLE_SDK_IS_STUB) return 'OPTED IN';
      return 'SCANNING';
    case 'earning': return 'EARNING';
  }
}

function stateColor(status: AdapterStatus): string {
  switch (status.state) {
    case 'unavailable': return palette.graphite;
    case 'unregistered': return palette.graphite;
    case 'registered': return palette.sapphire.glow;
    case 'earning': return '#34C759'; // system green
  }
}

// ----------------------------------------------------------------------------
// Per-adapter "lifetime watermark" — the highest balance we've ever observed
// and recorded as a signed earning. SecureStore key:
//   kinetik.adapter.<id>.recordedLifetime.v1
//
// INVARIANT (v0, balance-based recording):
//   · When current lifetimeGross > watermark, the delta is treated as a real
//     earning event: signEarning + appendEarningLog, watermark ratchets up.
//   · When current lifetimeGross < watermark (user withdrew on the underlying
//     network), we DO NOT record a negative entry. We DO reset the watermark
//     down to the new balance so subsequent earnings get caught.
//   · When equal — no-op.
//
// LIMITATION: this can under-count if a user withdraws between polls. The
// correct fix (Session E or later) is to query SubQuery for true lifetime
// inbound transfers, not current balance. For v0, under-count > over-count —
// we never want to mint a false earning.
// ----------------------------------------------------------------------------
const RECORDED_LIFETIME_KEY = (adapterId: string) =>
  `kinetik.adapter.${adapterId}.recordedLifetime.v1`;

/** Smallest delta we bother recording. Suppresses dust noise from polling jitter. */
const MIN_RECORDABLE_DELTA = 1e-8;

async function recordEarningDelta(
  adapter: DepinAdapter,
  snapshot: EarningSnapshot,
  identity: NodeIdentity,
): Promise<boolean> {
  if (!Number.isFinite(snapshot.lifetimeGross) || snapshot.lifetimeGross <= 0) {
    return false;
  }

  const key = RECORDED_LIFETIME_KEY(adapter.id);
  const prevRaw = await SecureStore.getItemAsync(key).catch(() => null);
  const prevLifetime = prevRaw ? parseFloat(prevRaw) : 0;
  const safePrev = Number.isFinite(prevLifetime) && prevLifetime >= 0 ? prevLifetime : 0;
  const curr = snapshot.lifetimeGross;
  const delta = curr - safePrev;

  // Down-ratchet on withdrawal — silently track the new floor, no entry.
  if (delta < 0) {
    await SecureStore.setItemAsync(key, String(curr)).catch(() => {});
    return false;
  }

  if (delta < MIN_RECORDABLE_DELTA) return false;

  // externalRef is auditable + dedup-friendly: anyone replaying the chain can
  // confirm the watermark sequence is monotonically increasing for this source.
  const ts = Date.now();
  const externalRef = `${adapter.id}:lifetime:${curr.toFixed(8)}:${ts}`;

  try {
    await appendEarningLog(identity, {
      source: adapter.id,
      externalRef,
      currency: adapter.currency,
      gross: delta,
    });
    await SecureStore.setItemAsync(key, String(curr)).catch(() => {});
    return true;
  } catch (err) {
    console.warn('[aggregator] failed to record earning delta:', err);
    return false;
  }
}

// ----------------------------------------------------------------------------
// AdapterCard — renders one adapter's status + earnings, with opt-in button.
// Snapshot data is delivered by the parent's PollingPool, not polled here.
// ----------------------------------------------------------------------------
function AdapterCard({
  adapter,
  identity,
  poolSnapshot,
  onLedgerAppend,
  onStatusChange,
}: AdapterCardProps) {
  const [state, setState] = useState<CardState>(INITIAL_STATE);

  // Notify the parent whenever this adapter's state transitions.
  useEffect(() => {
    onStatusChange?.(state.status);
  }, [state.status, onStatusChange]);

  // When the pool delivers a new snapshot, update local state and sign any
  // positive earning delta into the wallet ledger.
  useEffect(() => {
    if (!poolSnapshot) return;

    setState((prev) => ({
      ...prev,
      snapshot: poolSnapshot,
      loading: false,
    }));

    if (identity) {
      void recordEarningDelta(adapter, poolSnapshot, identity).then((recorded) => {
        if (recorded) onLedgerAppend?.();
      });
    }
  }, [poolSnapshot, adapter, identity, onLedgerAppend]);

  // Initial status load (no poll needed — pool handles data).
  const loadStatus = useCallback(async () => {
    try {
      const status = await adapter.getStatus();
      setState((prev) => ({ ...prev, status, loading: false }));
    } catch {
      setState((prev) => ({ ...prev, loading: false }));
    }
  }, [adapter]);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const handleOptIn = async () => {
    if (!identity || state.registering) return;
    setState((prev) => ({ ...prev, registering: true }));
    let newStatus: AdapterStatus | undefined;
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      newStatus = await adapter.register(identity);
    } catch {
      // Registration threw — clear spinner in `finally`.
    } finally {
      setState((prev) => ({
        ...prev,
        registering: false,
        ...(newStatus !== undefined ? { status: newStatus } : {}),
      }));
    }
    if (newStatus !== undefined) void loadStatus();
  };

  const handleOptOut = async () => {
    if (state.registering) return;
    setState((prev) => ({ ...prev, registering: true }));
    let cleared = false;
    try {
      await adapter.unregister();
      // Reset the recording watermark — if the user re-registers later, any
      // accrued balance is treated as a fresh starting point, not a missed
      // earning. The signed ledger entries already on chain are untouched.
      await SecureStore.deleteItemAsync(RECORDED_LIFETIME_KEY(adapter.id))
        .catch(() => {});
      cleared = true;
    } catch {
      // Leave prior status; spinner clears in `finally`.
    } finally {
      setState((prev) =>
        cleared
          ? {
              ...prev,
              status: { state: 'unregistered' },
              snapshot: null,
              registering: false,
            }
          : { ...prev, registering: false },
      );
    }
  };

  const { status, snapshot, loading } = state;
  const isActive = status.state === 'registered' || status.state === 'earning';
  const isUnavailable = status.state === 'unavailable';

  return (
    <View style={styles.card}>
      {/* Header row: adapter name + status badge */}
      <View style={styles.cardHeader}>
        <Text style={styles.adapterName}>{adapter.displayName.toUpperCase()}</Text>
        <View style={[styles.badge, { borderColor: stateColor(status) }]}>
          <Text style={[styles.badgeText, { color: stateColor(status) }]}>
            {stateLabel(status, adapter.id)}
          </Text>
        </View>
      </View>

      {/* Description */}
      <Text style={styles.description}>{adapter.description}</Text>

      <View style={styles.divider} />

      {/* Earnings rows */}
      {isActive ? (
        <>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>PENDING</Text>
            {loading ? (
              <ActivityIndicator size="small" color={palette.sapphire.glow} />
            ) : (
              <Text style={styles.rowValue}>
                {fmtNodl(snapshot?.pendingGross)} {adapter.currency}
              </Text>
            )}
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>LIFETIME</Text>
            <Text style={styles.rowValue}>
              {fmtNodl(snapshot?.lifetimeGross)} {adapter.currency}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>LAST EARNED</Text>
            <Text style={styles.rowValue}>
              {fmtRelativeTime(snapshot?.lastEarnedAt)}
            </Text>
          </View>
        </>
      ) : (
        <View style={styles.row}>
          <Text style={styles.rowLabel}>
            {isUnavailable
              ? (status as { state: 'unavailable'; reason: string }).reason
              : inactiveOptInHint(adapter)}
          </Text>
        </View>
      )}

      {/* Action button */}
      {!isUnavailable && (
        <>
          <View style={styles.divider} />
          <Pressable
            style={({ pressed }) => [
              styles.actionBtn,
              isActive && styles.actionBtnActive,
              pressed && styles.actionBtnPressed,
            ]}
            onPress={isActive ? handleOptOut : handleOptIn}
            disabled={state.registering}
            accessibilityRole="button"
            accessibilityLabel={
              isActive
                ? `Stop earning with ${adapter.displayName}`
                : `Start earning with ${adapter.displayName}`
            }
          >
            {state.registering ? (
              <ActivityIndicator size="small" color={palette.platinum} />
            ) : (
              <Text style={styles.actionBtnLabel}>
                {isActive ? 'STOP' : 'ENABLE'}
              </Text>
            )}
          </Pressable>
        </>
      )}
    </View>
  );
}

// ----------------------------------------------------------------------------
// AggregatorPanel — single summary box on the home screen, plus a slide-up
// drawer that reveals one AdapterCard per registered DePIN.
//
// HOME SURFACE (always visible):
//   ┌─────────────────────────────┐
//   │ EARNINGS              ⌃     │
//   │ 12 SIGNED ENTRIES · 2/5     │
//   │ NETWORKS ACTIVE             │
//   └─────────────────────────────┘
//
// The drawer is ALWAYS mounted (translated offscreen when closed) so that
// each AdapterCard's poll interval keeps running and signed earnings keep
// flowing into the ledger even when the user never opens the drawer.
// ----------------------------------------------------------------------------
type AggregatorPanelProps = {
  adapters: DepinAdapter[];
  identity: NodeIdentity | null;
  /** Called when the user taps the optimizer badge — opens OptimizationReport. */
  onOpenOptimizationReport?: (result: OptimizationResult) => void;
};

export function AggregatorPanel({ adapters, identity, onOpenOptimizationReport }: AggregatorPanelProps) {
  const [summary, setSummary] = useState<WalletSummary | null>(null);
  const [statuses, setStatuses] = useState<Record<string, AdapterStatus>>({});
  const [snapshots, setSnapshots] = useState<Record<string, EarningSnapshot | null>>({});
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [optimizationResult, setOptimizationResult] = useState<OptimizationResult | null>(null);

  // -------------------------------------------------------------------------
  // Shared PollingPool — one pool for all adapters, lives for the lifetime
  // of this component. Replaces the individual setInterval in each AdapterCard.
  // -------------------------------------------------------------------------
  const poolRef = useRef<PollingPool | null>(null);

  useEffect(() => {
    if (adapters.length === 0) return;

    const pool = new PollingPool();
    poolRef.current = pool;

    adapters.forEach((adapter) => {
      const intervalMs =
        ADAPTER_POLL_INTERVALS[adapter.id] ?? DEFAULT_POLL_INTERVAL_MS;

      pool.register(adapter, intervalMs, (snapshot) => {
        if (!snapshot) return;
        setSnapshots((prev) => {
          const cur = prev[adapter.id];
          if (
            cur &&
            snapshot &&
            cur.lifetimeGross === snapshot.lifetimeGross &&
            cur.pendingGross  === snapshot.pendingGross
          ) {
            return prev; // skip identical snapshots to avoid render churn
          }
          return { ...prev, [adapter.id]: snapshot };
        });
      });
    });

    pool.start();
    return () => {
      pool.stop();
      poolRef.current = null;
    };
  }, [adapters]);

  // -------------------------------------------------------------------------
  // Optimizer refresh — runs after every snapshot batch to score adapters
  // and surface gas-saving recommendations.
  // -------------------------------------------------------------------------
  useEffect(() => {
    const snapshotList = Object.values(snapshots).filter(Boolean) as EarningSnapshot[];
    if (snapshotList.length === 0) return;

    void (async () => {
      try {
        const currencies = [...new Set(snapshotList.map((s) => s.currency))];
        const [priceResult, gasResult] = await Promise.all([
          fetchTokenPrices(currencies),
          fetchGasPrices(),
        ]);
        const result = scoreAdapters(snapshotList, priceResult.prices, gasResult.prices);
        setOptimizationResult(result);
      } catch {
        // Non-critical — optimizer unavailable, UI degrades gracefully.
      }
    })();
  }, [snapshots]);

  const refreshSummary = useCallback(async () => {
    if (!identity) return;
    try {
      const s = await loadWalletSummary(identity);
      setSummary(s);
    } catch {
      // ignore — summary stays stale rather than crashing the panel
    }
  }, [identity]);

  useEffect(() => {
    void refreshSummary();
  }, [refreshSummary]);

  // Per-adapter status + snapshot callbacks — keyed by adapter id so
  // duplicate fires collapse cleanly. Memoised per adapter so the child's
  // effect doesn't see a "new" callback every render.
  const onStatusChangeFor = useMemo(() => {
    const map: Record<string, (s: AdapterStatus) => void> = {};
    adapters.forEach((a) => {
      map[a.id] = (s: AdapterStatus) => {
        setStatuses((prev) => {
          if (prev[a.id]?.state === s.state) return prev;
          return { ...prev, [a.id]: s };
        });
      };
    });
    return map;
  }, [adapters]);

  if (!AGGREGATOR_ENABLED || adapters.length === 0) return null;

  const activeCount = Object.values(statuses).filter(
    (s) => s.state === 'registered' || s.state === 'earning',
  ).length;
  const totalCount = adapters.length;
  const entryCount = summary?.count ?? 0;

  // Aggregate lifetime earnings by currency.
  const totalsByCurrency = new Map<string, number>();
  for (const snap of Object.values(snapshots)) {
    if (!snap) continue;
    if (!Number.isFinite(snap.lifetimeGross) || snap.lifetimeGross <= 0) continue;
    totalsByCurrency.set(
      snap.currency,
      (totalsByCurrency.get(snap.currency) ?? 0) + snap.lifetimeGross,
    );
  }
  const totalRows = Array.from(totalsByCurrency.entries());

  // Optimizer summary: how many adapters should claim now?
  const claimNowCount = optimizationResult?.bestClaimOrder.length ?? 0;
  const gasAvoidedUsd = optimizationResult?.gasFeesAvoidedUsd ?? 0;

  const openDrawer = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      /* haptics unavailable */
    }
    setDrawerOpen(true);
  };

  const handleOptimizerTap = async () => {
    if (optimizationResult && onOpenOptimizationReport) {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch { /* ignore */ }
      onOpenOptimizationReport(optimizationResult);
    }
  };

  return (
    <>
      <Pressable
        onPress={openDrawer}
        accessibilityRole="button"
        accessibilityLabel="Open earnings detail drawer"
        style={({ pressed }) => [styles.summaryBox, pressed && styles.summaryBoxPressed]}
      >
        <View style={styles.summaryHeaderRow}>
          <Text style={styles.panelHeader}>EARNINGS</Text>
          <Text style={styles.summaryChevron}>⌃</Text>
        </View>

        {/* Hero row — total lifetime earnings per currency. */}
        {totalRows.length > 0 ? (
          <View style={styles.totalsBlock}>
            {totalRows.map(([currency, amount]) => (
              <View key={currency} style={styles.totalsRow}>
                <Text style={styles.totalsAmount}>{fmtNodl(amount)}</Text>
                <Text style={styles.totalsCurrency}>{currency}</Text>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.totalsBlock}>
            <View style={styles.totalsRow}>
              <Text style={styles.totalsAmount}>—</Text>
              <Text style={styles.totalsCurrency}>NOTHING EARNED YET</Text>
            </View>
          </View>
        )}

        <View style={styles.summaryBody}>
          <Text style={styles.summaryStat}>
            {entryCount} {entryCount === 1 ? 'SIGNED ENTRY' : 'SIGNED ENTRIES'}
          </Text>
          <Text style={styles.summaryDot}>·</Text>
          <Text style={styles.summaryStat}>
            {activeCount}/{totalCount} NETWORKS ACTIVE
          </Text>
        </View>

        {/* Optimizer badge — shown when the optimizer has a recommendation. */}
        {(claimNowCount > 0 || gasAvoidedUsd > 0) && (
          <Pressable
            onPress={handleOptimizerTap}
            style={({ pressed }) => [styles.optimizerBadge, pressed && { opacity: 0.6 }]}
            accessibilityRole="button"
            accessibilityLabel="View optimization report"
          >
            {claimNowCount > 0 && (
              <Text style={styles.optimizerBadgeText}>
                {claimNowCount} READY TO CLAIM
              </Text>
            )}
            {gasAvoidedUsd > 0 && (
              <Text style={styles.optimizerBadgeText}>
                ${gasAvoidedUsd.toFixed(2)} GAS SAVED
              </Text>
            )}
          </Pressable>
        )}

        {summary?.lastHash ? (
          <Text style={styles.summaryHash}>
            CHAIN · {summary.lastHash.slice(0, 12).toUpperCase()}
          </Text>
        ) : null}
      </Pressable>

      <EarningsDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        adapters={adapters}
        identity={identity}
        snapshots={snapshots}
        onLedgerAppend={refreshSummary}
        onStatusChangeFor={onStatusChangeFor}
      />
    </>
  );
}

// ----------------------------------------------------------------------------
// EarningsDrawer — bottom-sheet that owns every AdapterCard.
//
// Mounted unconditionally so polling never pauses; pointerEvents are gated
// on `open` so the sheet doesn't intercept touches while hidden.
//
// Animation: a single sharedValue `progress` ∈ [0, 1] drives translateY
// (offscreen → resting position) and the backdrop opacity. PanResponder
// handles vertical drag; releases below threshold snap-close, otherwise
// snap-open.
// ----------------------------------------------------------------------------
type EarningsDrawerProps = {
  open: boolean;
  onClose: () => void;
  adapters: DepinAdapter[];
  identity: NodeIdentity | null;
  snapshots: Record<string, EarningSnapshot | null>;
  onLedgerAppend: () => void;
  onStatusChangeFor: Record<string, (status: AdapterStatus) => void>;
};

const SCREEN_HEIGHT = Dimensions.get('window').height;
const DRAWER_HEIGHT = Math.round(SCREEN_HEIGHT * 0.78);
const DRAG_DISMISS_THRESHOLD = 0.25; // 25% of drawer height

function EarningsDrawer({
  open,
  onClose,
  adapters,
  identity,
  snapshots,
  onLedgerAppend,
  onStatusChangeFor,
}: EarningsDrawerProps) {
  // progress: 0 = fully closed (offscreen), 1 = fully open (resting).
  const progress = useSharedValue(0);
  // dragOffset: live drag delta in pixels (clamped to [0, DRAWER_HEIGHT]).
  const dragOffset = useSharedValue(0);

  // Animate progress whenever `open` flips.
  useEffect(() => {
    progress.value = withTiming(open ? 1 : 0, {
      duration: 320,
      easing: Easing.inOut(Easing.cubic),
    });
    if (!open) dragOffset.value = 0;
  }, [open, progress, dragOffset]);

  const sheetStyle = useAnimatedStyle(() => {
    const closedTranslate = DRAWER_HEIGHT;
    const openTranslate = 0;
    const baseTranslate =
      closedTranslate - (closedTranslate - openTranslate) * progress.value;
    return {
      transform: [{ translateY: baseTranslate + dragOffset.value }],
    };
  });

  const backdropStyle = useAnimatedStyle(() => {
    const opacity = progress.value * 0.55;
    return { opacity };
  });

  // PanResponder for drag-to-dismiss on the drag handle area.
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 4,
        onPanResponderMove: (_, g) => {
          if (g.dy > 0) {
            dragOffset.value = Math.min(g.dy, DRAWER_HEIGHT);
          }
        },
        onPanResponderRelease: (_, g) => {
          if (g.dy > DRAWER_HEIGHT * DRAG_DISMISS_THRESHOLD || g.vy > 1.2) {
            // Snap closed: animate dragOffset back to 0 in parallel with the
            // parent open→closed transition.
            dragOffset.value = withTiming(0, { duration: 220 });
            runOnJS(onClose)();
          } else {
            dragOffset.value = withTiming(0, { duration: 220 });
          }
        },
      }),
    [dragOffset, onClose],
  );

  return (
    <View
      style={StyleSheet.absoluteFill}
      pointerEvents={open ? 'auto' : 'none'}
    >
      <Animated.View
        style={[StyleSheet.absoluteFillObject, styles.backdrop, backdropStyle]}
        pointerEvents={open ? 'auto' : 'none'}
      >
        <Pressable
          style={StyleSheet.absoluteFillObject}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close earnings drawer"
        />
      </Animated.View>

      <Animated.View
        style={[styles.sheet, sheetStyle]}
        pointerEvents={open ? 'auto' : 'none'}
      >
        <View {...panResponder.panHandlers} style={styles.sheetGrip}>
          <View style={styles.dragHandle} />
          <Text style={styles.sheetTitle}>EARNINGS</Text>
          <Text style={styles.sheetSubtitle}>
            {adapters.length} NETWORKS · SWIPE DOWN TO CLOSE
          </Text>
        </View>
        <ScrollView
          style={styles.sheetScroll}
          contentContainerStyle={styles.sheetScrollContent}
          showsVerticalScrollIndicator={false}
        >
          {adapters.map((adapter) => (
            <AdapterCard
              key={adapter.id}
              adapter={adapter}
              identity={identity}
              poolSnapshot={snapshots[adapter.id] ?? null}
              onLedgerAppend={onLedgerAppend}
              onStatusChange={onStatusChangeFor[adapter.id]}
            />
          ))}
        </ScrollView>
      </Animated.View>
    </View>
  );
}

// ----------------------------------------------------------------------------
// Styles — palette-consistent with the rest of VaultPanel.
// ----------------------------------------------------------------------------
const styles = StyleSheet.create({
  // Home-surface summary box (always visible).
  summaryBox: {
    backgroundColor: palette.obsidianSoft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.hairline,
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 14,
    gap: 6,
  },
  summaryBoxPressed: {
    opacity: 0.7,
  },
  summaryHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryChevron: {
    color: palette.sapphire.glow,
    fontFamily: typography.mono,
    fontSize: 14,
    letterSpacing: 0,
    fontWeight: '600',
    transform: [{ rotate: '0deg' }],
  },
  totalsBlock: {
    paddingVertical: 8,
    gap: 4,
  },
  totalsRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  totalsAmount: {
    color: palette.platinum,
    fontFamily: typography.mono,
    fontSize: 22,
    letterSpacing: 1,
    fontWeight: '300',
  },
  totalsCurrency: {
    color: palette.sapphire.glow,
    fontFamily: typography.mono,
    fontSize: 11,
    letterSpacing: 2,
    fontWeight: '500',
  },
  summaryBody: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  summaryStat: {
    color: palette.sapphire.glow,
    fontFamily: typography.mono,
    fontSize: 11,
    letterSpacing: 1.6,
    fontWeight: '500',
  },
  summaryDot: {
    color: palette.graphite,
    fontFamily: typography.mono,
    fontSize: 11,
    letterSpacing: 1.6,
    fontWeight: '500',
  },
  summaryHash: {
    color: palette.graphite,
    fontFamily: typography.mono,
    fontSize: 9,
    letterSpacing: 1.4,
    fontWeight: '500',
  },
  panelHeader: {
    color: palette.graphite,
    fontFamily: typography.mono,
    fontSize: 10,
    letterSpacing: 2.4,
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  optimizerBadge: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(52, 199, 89, 0.10)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(52, 199, 89, 0.35)',
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  optimizerBadgeText: {
    color: '#34C759',
    fontFamily: typography.mono,
    fontSize: 9,
    letterSpacing: 1.8,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  // Drawer surfaces.
  backdrop: {
    backgroundColor: '#000000',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: DRAWER_HEIGHT,
    backgroundColor: palette.obsidian,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: palette.hairline,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.6,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -4 },
    elevation: 24,
  },
  sheetGrip: {
    paddingTop: 10,
    paddingBottom: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.hairline,
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: palette.graphite,
    opacity: 0.6,
    marginBottom: 10,
  },
  sheetTitle: {
    color: palette.platinum,
    fontFamily: typography.mono,
    fontSize: 12,
    letterSpacing: 3,
    fontWeight: '600',
  },
  sheetSubtitle: {
    color: palette.graphite,
    fontFamily: typography.mono,
    fontSize: 9,
    letterSpacing: 1.6,
    fontWeight: '500',
    marginTop: 4,
  },
  sheetScroll: {
    flex: 1,
  },
  sheetScrollContent: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 32,
    gap: 12,
  },
  card: {
    backgroundColor: palette.obsidianSoft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.hairline,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  adapterName: {
    color: palette.platinum,
    fontFamily: typography.mono,
    fontSize: 13,
    letterSpacing: 2,
    fontWeight: '600',
  },
  badge: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  badgeText: {
    fontFamily: typography.mono,
    fontSize: 8,
    letterSpacing: 1.8,
    fontWeight: '600',
  },
  description: {
    color: palette.graphite,
    fontFamily: typography.mono,
    fontSize: 10,
    letterSpacing: 1.2,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: palette.hairline,
    marginVertical: 2,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  rowLabel: {
    color: palette.graphite,
    fontFamily: typography.mono,
    fontSize: 9,
    letterSpacing: 2,
    fontWeight: '500',
    textTransform: 'uppercase',
    flex: 1,
    flexWrap: 'wrap',
  },
  rowValue: {
    color: palette.sapphire.glow,
    fontFamily: typography.mono,
    fontSize: 11,
    letterSpacing: 1.4,
    fontWeight: '500',
    textAlign: 'right',
  },
  actionBtn: {
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.sapphire.glow,
    backgroundColor: 'rgba(0, 123, 255, 0.08)',
    marginTop: 2,
  },
  actionBtnActive: {
    borderColor: palette.graphite,
    backgroundColor: 'transparent',
  },
  actionBtnPressed: {
    opacity: 0.6,
  },
  actionBtnLabel: {
    color: palette.platinum,
    fontFamily: typography.mono,
    fontSize: 10,
    letterSpacing: 2.4,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
});
