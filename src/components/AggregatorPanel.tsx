// ============================================================================
// AggregatorPanel — feature-flagged DePIN earnings aggregator UI.
// ----------------------------------------------------------------------------
// Renders one card per registered adapter. In v0, exactly one adapter exists:
// Nodle. The panel is intentionally adapter-agnostic — it iterates the adapter
// list and calls the same interface on every entry.
//
// FEATURE FLAG: set AGGREGATOR_ENABLED = true to show this panel.
// Currently false so the existing VaultPanel layout is undisturbed.
//
// The fee is invisible at this layer — we never show "we took 1%" as a line
// item the user has to parse on every load. It is transparent in the earnings
// ledger (anyone can audit via the verifier) and disclosed once at opt-in.
// Same pattern as exchanges that show net price, not "price minus 0.1% fee".
// ============================================================================

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import * as Haptics from 'expo-haptics';

import { palette, typography } from '../theme/palette';
import type { DepinAdapter, EarningSnapshot, AdapterStatus } from '../../packages/kinetik-core/src/adapter';
import type { NodeIdentity } from '../../packages/kinetik-core/src/identity';

// ----------------------------------------------------------------------------
// Feature flag. Flip to true to show the aggregator panel in VaultPanel.
// Keep false until the Nodle native bridge is active and producing real data.
// ----------------------------------------------------------------------------
export const AGGREGATOR_ENABLED = false;

// ----------------------------------------------------------------------------
// Poll interval — how often each adapter's pollEarnings() is called when the
// panel is visible. 60s is cheap (single HTTP call per adapter) and dense
// enough that the user sees NODL allocations within ~1 minute of them landing
// on-chain (Nodle allocates every ~2 hours, but we poll so we catch it fast).
// ----------------------------------------------------------------------------
const POLL_INTERVAL_MS = 60_000;

// ----------------------------------------------------------------------------
// Types.
// ----------------------------------------------------------------------------
type AdapterCardProps = {
  adapter: DepinAdapter;
  identity: NodeIdentity | null;
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

function stateLabel(status: AdapterStatus): string {
  switch (status.state) {
    case 'unavailable': return 'UNAVAILABLE';
    case 'unregistered': return 'NOT ACTIVE';
    case 'registered': return 'SCANNING';
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
// AdapterCard — renders one adapter's status + earnings, with opt-in button.
// ----------------------------------------------------------------------------
function AdapterCard({ adapter, identity }: AdapterCardProps) {
  const [state, setState] = useState<CardState>(INITIAL_STATE);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [status, snapshot] = await Promise.all([
        adapter.getStatus(),
        adapter.pollEarnings().catch(() => null),
      ]);
      setState((prev) => ({ ...prev, status, snapshot, loading: false }));
    } catch {
      setState((prev) => ({ ...prev, loading: false }));
    }
  }, [adapter]);

  // Initial load + polling when registered.
  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const isActive =
      state.status.state === 'registered' || state.status.state === 'earning';
    if (isActive && !pollTimerRef.current) {
      pollTimerRef.current = setInterval(() => {
        void refresh();
      }, POLL_INTERVAL_MS);
    } else if (!isActive && pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [state.status.state, refresh]);

  const handleOptIn = async () => {
    if (!identity || state.registering) return;
    setState((prev) => ({ ...prev, registering: true }));
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const newStatus = await adapter.register(identity);
      setState((prev) => ({ ...prev, status: newStatus, registering: false }));
      void refresh();
    } catch {
      setState((prev) => ({ ...prev, registering: false }));
    }
  };

  const handleOptOut = async () => {
    if (state.registering) return;
    setState((prev) => ({ ...prev, registering: true }));
    try {
      await adapter.unregister();
      setState((prev) => ({
        ...prev,
        status: { state: 'unregistered' },
        snapshot: null,
        registering: false,
      }));
    } catch {
      setState((prev) => ({ ...prev, registering: false }));
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
            {stateLabel(status)}
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
              : 'Tap to start earning NODL passively.'}
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
            accessibilityLabel={isActive ? 'Stop earning with Nodle' : 'Start earning with Nodle'}
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
// AggregatorPanel — the list of adapter cards. Adapters[] is the registry;
// adding a new DePIN later = append to this list, zero other changes.
// ----------------------------------------------------------------------------
type AggregatorPanelProps = {
  adapters: DepinAdapter[];
  identity: NodeIdentity | null;
};

export function AggregatorPanel({ adapters, identity }: AggregatorPanelProps) {
  if (!AGGREGATOR_ENABLED || adapters.length === 0) return null;

  return (
    <View style={styles.panel}>
      <Text style={styles.panelHeader}>EARNINGS</Text>
      {adapters.map((adapter) => (
        <AdapterCard key={adapter.id} adapter={adapter} identity={identity} />
      ))}
    </View>
  );
}

// ----------------------------------------------------------------------------
// Styles — palette-consistent with the rest of VaultPanel.
// ----------------------------------------------------------------------------
const styles = StyleSheet.create({
  panel: {
    gap: 10,
    paddingTop: 4,
  },
  panelHeader: {
    color: palette.graphite,
    fontFamily: typography.mono,
    fontSize: 10,
    letterSpacing: 2.4,
    fontWeight: '500',
    textTransform: 'uppercase',
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
