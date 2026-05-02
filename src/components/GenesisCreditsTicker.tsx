// ============================================================================
// GenesisCreditsTicker — visible Genesis Credits counter in the app.
// ----------------------------------------------------------------------------
// Shows the user their current Genesis Credits total, their tier status,
// and a breakdown of how they can earn more. Tapping opens an info sheet.
//
// ⚠️  COPY REVIEW: All text in this component has been written to avoid
//     any language that could be construed as investment/financial returns.
//     Genesis Credits are loyalty points only — NOT a token, NOT monetary.
//
// DESIGN:
//   Home surface (compact):
//     ┌──────────────────────────────────────────────────────┐
//     │  GENESIS CREDITS            [WAVE 0 · GENESIS TIER] │
//     │  12,450 GC                                           │
//     └──────────────────────────────────────────────────────┘
//
//   Info sheet (on tap):
//     · Earning breakdown (rates per activity)
//     · Tier status
//     · "What are Genesis Credits?" plain-language explainer
//     · Last sync status
// ============================================================================

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { palette, typography } from '../theme/palette';
import {
  CREDIT_RATES,
  GENESIS_TIER_CAP,
  loadCreditsSummary,
  type CreditsSummary,
} from '../../packages/credits/src';

// ---------------------------------------------------------------------------
// Constants.
// ---------------------------------------------------------------------------

const POLL_INTERVAL_MS = 30_000; // refresh credits every 30s

// ---------------------------------------------------------------------------
// Types.
// ---------------------------------------------------------------------------

type GenesisCreditsTicker = {
  /** Called when the user taps the ticker (e.g. to log an event for testing). */
  onPress?: () => void;
};

// ---------------------------------------------------------------------------
// Earning breakdown rows.
// ---------------------------------------------------------------------------
const EARNING_ROWS: { label: string; rate: number; unit: string }[] = [
  { label: 'Heartbeat (60s)',       rate: CREDIT_RATES.heartbeat,         unit: 'GC' },
  { label: 'Sensor attestation',    rate: CREDIT_RATES.sensorAttestation, unit: 'GC' },
  { label: 'Proof of Origin',       rate: CREDIT_RATES.proofOfOrigin,     unit: 'GC' },
  { label: 'Daily uptime (24h)',    rate: CREDIT_RATES.dailyUptime,       unit: 'GC' },
  { label: 'Network connected',     rate: CREDIT_RATES.networkConnected,  unit: 'GC (once)' },
];

// ---------------------------------------------------------------------------
// Helpers.
// ---------------------------------------------------------------------------

function fmtCredits(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '0';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 10_000)    return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function fmtSyncTime(ts: number | null): string {
  if (!ts) return 'never synced';
  const diff = Date.now() - ts;
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'synced just now';
  if (minutes < 60) return `synced ${minutes}m ago`;
  return `synced ${Math.floor(minutes / 60)}h ago`;
}

// ---------------------------------------------------------------------------
// InfoSheet — the full-screen breakdown (opens on ticker tap).
// ---------------------------------------------------------------------------
function InfoSheet({
  visible,
  onClose,
  summary,
}: {
  visible: boolean;
  onClose: () => void;
  summary: CreditsSummary;
}) {
  const opacity    = useSharedValue(0);
  const translateY = useSharedValue(50);

  useEffect(() => {
    if (visible) {
      opacity.value    = withTiming(1,  { duration: 260, easing: Easing.out(Easing.cubic) });
      translateY.value = withTiming(0,  { duration: 280, easing: Easing.out(Easing.cubic) });
    } else {
      opacity.value    = withTiming(0,  { duration: 200 });
      translateY.value = withTiming(50, { duration: 220 });
    }
  }, [visible, opacity, translateY]);

  const backdropStyle = useAnimatedStyle(() => ({ opacity: opacity.value * 0.65 }));
  const sheetStyle    = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const tierLabel = summary.isGenesisTier
    ? `WAVE 0 · GENESIS TIER · ${summary.multiplier}× MULTIPLIER`
    : 'STANDARD TIER';
  const tierColor = summary.isGenesisTier ? palette.ruby.core : palette.graphite;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[StyleSheet.absoluteFillObject, styles.backdrop, backdropStyle]}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
      </Animated.View>
      <Animated.View style={[styles.sheet, sheetStyle]} pointerEvents="auto">
        <View style={styles.sheetHeader}>
          <View>
            <Text style={styles.sheetTitle}>GENESIS CREDITS</Text>
            <Text style={[styles.tierLabel, { color: tierColor }]}>{tierLabel}</Text>
          </View>
          <Pressable onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>✕</Text>
          </Pressable>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Current total */}
          <View style={styles.totalBox}>
            <Text style={styles.totalValue}>{fmtCredits(summary.total)}</Text>
            <Text style={styles.totalUnit}>GENESIS CREDITS</Text>
          </View>

          {/* What are GC? */}
          <View style={styles.explainerBox}>
            <Text style={styles.explainerTitle}>WHAT ARE GENESIS CREDITS?</Text>
            <Text style={styles.explainerText}>
              Genesis Credits are loyalty points you earn for keeping your Sovereign Node running.
              They track your contribution to the network and mark you as an early builder.
            </Text>
            <Text style={styles.explainerText}>
              Genesis Credits are NOT a token, NOT redeemable, NOT transferable, and carry
              no monetary value — by charter, not by accident. They are a public reputation
              grade about your node — the bureau's record that you were here from the
              beginning, used by partner networks to inform verified-user offers.
            </Text>
            {summary.isGenesisTier && (
              <Text style={[styles.explainerText, { color: palette.ruby.ember, marginTop: 4 }]}>
                You are in the Genesis Tier (first {GENESIS_TIER_CAP.toLocaleString()} nodes).
                Your {summary.multiplier}× multiplier is locked in forever.
              </Text>
            )}
          </View>

          {/* Earning breakdown */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>HOW YOU EARN</Text>
            {EARNING_ROWS.map((row) => {
              const effectiveRate = Math.floor(row.rate * summary.multiplier);
              return (
                <View key={row.label} style={styles.earningRow}>
                  <Text style={styles.earningLabel}>{row.label}</Text>
                  <Text style={styles.earningRate}>
                    {effectiveRate.toLocaleString()} {row.unit}
                    {summary.multiplier > 1 && ` (${summary.multiplier}×)`}
                  </Text>
                </View>
              );
            })}
          </View>

          {/* Sync status */}
          <Text style={styles.syncNote}>
            Cloud backup: {fmtSyncTime(summary.lastSyncAt)}
          </Text>
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// GenesisCreditsTicker — the home-surface compact chip.
// ---------------------------------------------------------------------------
export function GenesisCreditsTicker({ onPress }: GenesisCreditsTicker) {
  const [summary, setSummary]       = useState<CreditsSummary | null>(null);
  const [sheetOpen, setSheetOpen]   = useState(false);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scale = useSharedValue(1);

  const refresh = useCallback(async () => {
    try {
      const s = await loadCreditsSummary();
      setSummary(s);
    } catch { /* non-critical */ }
  }, []);

  useEffect(() => {
    void refresh();
    pollTimerRef.current = setInterval(() => void refresh(), POLL_INTERVAL_MS);
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [refresh]);

  const handlePress = async () => {
    scale.value = withSpring(0.93, {}, () => { scale.value = withSpring(1); });
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch { /* ignore */ }
    onPress?.();
    setSheetOpen(true);
  };

  const chipStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  if (!summary) return null;

  const isGenesis = summary.isGenesisTier;
  const borderColor = isGenesis ? palette.ruby.mid : palette.hairline;
  const labelColor  = isGenesis ? palette.ruby.ember : palette.graphite;

  return (
    <>
      <Pressable onPress={handlePress} accessibilityRole="button" accessibilityLabel="Genesis Credits">
        <Animated.View style={[styles.chip, { borderColor }, chipStyle]}>
          <View style={styles.chipContent}>
            <Text style={[styles.chipLabel, { color: labelColor }]}>
              {isGenesis ? 'GENESIS TIER' : 'GENESIS CREDITS'}
            </Text>
            <Text style={styles.chipValue}>
              {fmtCredits(summary.total)}
              <Text style={styles.chipUnit}> GC</Text>
            </Text>
          </View>
          {isGenesis && (
            <View style={styles.chipBadge}>
              <Text style={styles.chipBadgeText}>{summary.multiplier}×</Text>
            </View>
          )}
        </Animated.View>
      </Pressable>

      {summary && (
        <InfoSheet
          visible={sheetOpen}
          onClose={() => setSheetOpen(false)}
          summary={summary}
        />
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Styles.
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: palette.obsidianSoft,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
  },
  chipContent: {
    gap: 2,
  },
  chipLabel: {
    fontFamily: typography.mono,
    fontSize: 9,
    letterSpacing: 2.4,
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  chipValue: {
    color: palette.platinum,
    fontFamily: typography.mono,
    fontSize: 20,
    letterSpacing: 1,
    fontWeight: '300',
  },
  chipUnit: {
    color: palette.graphite,
    fontFamily: typography.mono,
    fontSize: 11,
    letterSpacing: 2,
    fontWeight: '500',
  },
  chipBadge: {
    backgroundColor: palette.ruby.deep,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  chipBadgeText: {
    color: palette.ruby.ember,
    fontFamily: typography.mono,
    fontSize: 11,
    letterSpacing: 1,
    fontWeight: '600',
  },
  // InfoSheet styles.
  backdrop: {
    backgroundColor: '#000',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: '88%',
    backgroundColor: palette.obsidian,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: palette.hairline,
    shadowColor: '#000',
    shadowOpacity: 0.7,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -4 },
    elevation: 24,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.hairline,
  },
  sheetTitle: {
    color: palette.platinum,
    fontFamily: typography.mono,
    fontSize: 13,
    letterSpacing: 3,
    fontWeight: '600',
  },
  tierLabel: {
    fontFamily: typography.mono,
    fontSize: 8,
    letterSpacing: 2,
    marginTop: 3,
  },
  closeBtn: { padding: 4 },
  closeBtnText: {
    color: palette.graphite,
    fontFamily: typography.mono,
    fontSize: 14,
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    gap: 16,
    paddingBottom: 40,
  },
  totalBox: {
    alignItems: 'center',
    paddingVertical: 12,
    gap: 4,
  },
  totalValue: {
    color: palette.platinum,
    fontFamily: typography.mono,
    fontSize: 48,
    letterSpacing: 2,
    fontWeight: '200',
  },
  totalUnit: {
    color: palette.graphite,
    fontFamily: typography.mono,
    fontSize: 11,
    letterSpacing: 3,
    fontWeight: '500',
  },
  explainerBox: {
    backgroundColor: palette.obsidianSoft,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.hairline,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 8,
  },
  explainerTitle: {
    color: palette.graphite,
    fontFamily: typography.mono,
    fontSize: 9,
    letterSpacing: 2.4,
    fontWeight: '500',
  },
  explainerText: {
    color: palette.platinum,
    fontFamily: typography.mono,
    fontSize: 10,
    letterSpacing: 0.8,
    lineHeight: 16,
    opacity: 0.85,
  },
  section: { gap: 8 },
  sectionLabel: {
    color: palette.graphite,
    fontFamily: typography.mono,
    fontSize: 9,
    letterSpacing: 2.4,
    fontWeight: '500',
    marginBottom: 2,
  },
  earningRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 3,
  },
  earningLabel: {
    color: palette.graphite,
    fontFamily: typography.mono,
    fontSize: 10,
    letterSpacing: 1.2,
    flex: 1,
  },
  earningRate: {
    color: palette.sapphire.glow,
    fontFamily: typography.mono,
    fontSize: 10,
    letterSpacing: 1.4,
    fontWeight: '500',
    textAlign: 'right',
  },
  syncNote: {
    color: palette.graphite,
    fontFamily: typography.mono,
    fontSize: 8,
    letterSpacing: 1.4,
    textAlign: 'center',
    opacity: 0.6,
    marginTop: 8,
  },
});
