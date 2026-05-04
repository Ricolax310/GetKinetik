// ============================================================================
// OptimizationReport — weekly savings proof modal.
// ----------------------------------------------------------------------------
// Opens once per week (or on demand via the optimizer badge in AggregatorPanel)
// and shows the user a concrete comparison of their earnings with vs without
// GETKINETIK. Every number comes from real optimizer data — nothing is
// fabricated. The modal is designed to be the single most compelling "why
// should I use this app" moment in the product.
//
// LAYOUT:
//   ┌─────────────────────────────────────────────────────┐
//   │  THIS WEEK · GETKINETIK vs STANDALONE               │
//   │─────────────────────────────────────────────────────│
//   │  Gas fees avoided          $0.47                    │
//   │  Battery hours saved       2.3 hrs                  │
//   │  New networks added        1 (DIMO)                 │
//   │  Verified-user premium     $1.20  (when active)     │
//   │─────────────────────────────────────────────────────│
//   │  Standalone earnings       $3.91                    │
//   │  Your earnings             $5.58                    │
//   │  ─────────────────────────────────────────────────  │
//   │  +$1.67 extra  (+43%)                               │
//   │─────────────────────────────────────────────────────│
//   │  90-day projection: +$22.40 with GETKINETIK         │
//   │─────────────────────────────────────────────────────│
//   │  [Adapter recommendation cards]                     │
//   └─────────────────────────────────────────────────────┘
//
// CLAIM RECOMMENDATIONS:
//   Each scored adapter gets a recommendation card showing whether to claim
//   now or wait, and why. The gas cost ratio is shown so users understand
//   the math behind the decision.
// ============================================================================

import React, { useEffect, useRef } from 'react';
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
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { palette, typography } from '../theme/palette';
import type { OptimizationResult, ScoredAdapter } from '../../packages/optimizer/src/scorer';
import { computeWeeklySavings } from '../../packages/optimizer/src/savings';

// ---------------------------------------------------------------------------
// Types.
// ---------------------------------------------------------------------------

type OptimizationReportProps = {
  visible: boolean;
  onClose: () => void;
  result: OptimizationResult;
  /** How many adapters are currently active (for battery savings calc). */
  activeAdapterCount: number;
  /** How many adapters were active last week (for "new networks" count). */
  previousAdapterCount?: number;
  /** Verified-user premium earned this period (0 until first partner activates). */
  verifiedUserPremiumUsd?: number;
};

// ---------------------------------------------------------------------------
// Helpers.
// ---------------------------------------------------------------------------

function fmtUsd(n: number, showPlus = false): string {
  if (n === 0) return '$0.00';
  const prefix = showPlus && n > 0 ? '+' : '';
  return `${prefix}$${Math.abs(n).toFixed(2)}`;
}

function fmtPct(n: number, showPlus = false): string {
  if (!Number.isFinite(n)) return '—';
  const prefix = showPlus && n > 0 ? '+' : '';
  return `${prefix}${n.toFixed(1)}%`;
}

function recommendationColor(adapter: ScoredAdapter): string {
  if (adapter.shouldClaim) return '#34C759';       // green — claim now
  if (adapter.pendingUsd > 0) return palette.sapphire.glow; // blue — hold
  return palette.graphite;                          // grey — inactive
}

// ---------------------------------------------------------------------------
// RecommendationCard — one row per adapter.
// ---------------------------------------------------------------------------
function RecommendationCard({ adapter }: { adapter: ScoredAdapter }) {
  const color = recommendationColor(adapter);
  return (
    <View style={styles.recCard}>
      <View style={styles.recHeader}>
        <Text style={styles.recAdapterId}>
          {adapter.adapterId.toUpperCase()}
        </Text>
        <View style={[styles.recBadge, { borderColor: color }]}>
          <Text style={[styles.recBadgeText, { color }]}>
            {adapter.shouldClaim ? 'CLAIM NOW' : adapter.pendingUsd > 0 ? 'HOLD' : 'INACTIVE'}
          </Text>
        </View>
      </View>
      <Text style={styles.recRecommendation}>{adapter.recommendation}</Text>
      {adapter.gasCostUsd > 0 && (
        <Text style={styles.recGasCost}>
          Gas cost: {fmtUsd(adapter.gasCostUsd)} · Ratio: {
            Number.isFinite(adapter.gasCostRatio)
              ? `${adapter.gasCostRatio.toFixed(1)}×`
              : '∞'
          }
        </Text>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// OptimizationReport — the modal.
// ---------------------------------------------------------------------------
export function OptimizationReport({
  visible,
  onClose,
  result,
  activeAdapterCount,
  previousAdapterCount = 0,
  verifiedUserPremiumUsd = 0,
}: OptimizationReportProps) {
  const opacity  = useSharedValue(0);
  const translateY = useSharedValue(60);
  const hasFiredHaptic = useRef(false);

  useEffect(() => {
    if (visible) {
      opacity.value    = withTiming(1,  { duration: 280, easing: Easing.out(Easing.cubic) });
      translateY.value = withTiming(0,  { duration: 300, easing: Easing.out(Easing.cubic) });
      if (!hasFiredHaptic.current) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        hasFiredHaptic.current = true;
      }
    } else {
      opacity.value    = withTiming(0,  { duration: 200 });
      translateY.value = withTiming(60, { duration: 220 });
      hasFiredHaptic.current = false;
    }
  }, [visible, opacity, translateY]);

  const backdropStyle = useAnimatedStyle(() => ({ opacity: opacity.value * 0.65 }));
  const sheetStyle    = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const savings = computeWeeklySavings(
    result,
    activeAdapterCount,
    previousAdapterCount,
    verifiedUserPremiumUsd,
  );

  const isPositive = savings.extraEarningsUsd > 0;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Backdrop */}
      <Animated.View
        style={[StyleSheet.absoluteFillObject, styles.backdrop, backdropStyle]}
        pointerEvents="auto"
      >
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
      </Animated.View>

      {/* Sheet */}
      <Animated.View style={[styles.sheet, sheetStyle]} pointerEvents="auto">
        {/* Header */}
        <View style={styles.sheetHeader}>
          <View>
            <Text style={styles.sheetTitle}>THIS WEEK</Text>
            <Text style={styles.sheetSubtitle}>GETKINETIK vs STANDALONE</Text>
          </View>
          <Pressable
            onPress={onClose}
            style={styles.closeBtn}
            accessibilityRole="button"
            accessibilityLabel="Close optimization report"
          >
            <Text style={styles.closeBtnText}>✕</Text>
          </Pressable>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Savings breakdown */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>SAVINGS BREAKDOWN</Text>

            <SavingsRow
              label="Gas fees avoided"
              value={fmtUsd(savings.gasFeesAvoidedUsd)}
              active={savings.gasFeesAvoidedUsd > 0}
            />
            <SavingsRow
              label="Battery hours saved"
              value={`${savings.batteryHoursExtra} hrs`}
              active={savings.batteryHoursExtra > 0}
            />
            <SavingsRow
              label="New networks added"
              value={savings.newNetworksDiscovered > 0
                ? `${savings.newNetworksDiscovered}`
                : '—'}
              active={savings.newNetworksDiscovered > 0}
            />
            <SavingsRow
              label="Verified-user premium"
              value={savings.verifiedUserPremiumUsd > 0
                ? fmtUsd(savings.verifiedUserPremiumUsd)
                : 'coming soon'}
              active={savings.verifiedUserPremiumUsd > 0}
              muted={savings.verifiedUserPremiumUsd === 0}
            />
          </View>

          <View style={styles.divider} />

          {/* Earnings comparison */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>REWARDS COMPARISON</Text>

            <SavingsRow
              label="Standalone earnings"
              value={fmtUsd(savings.standaloneEarningsUsd)}
              active={false}
            />
            <SavingsRow
              label="Your earnings"
              value={fmtUsd(savings.kinetikEarningsUsd)}
              active={savings.kinetikEarningsUsd > savings.standaloneEarningsUsd}
            />

            <View style={styles.totalDivider} />

            <View style={styles.totalRow}>
              <Text style={[
                styles.totalLabel,
                { color: isPositive ? '#34C759' : palette.graphite },
              ]}>
                {fmtUsd(savings.extraEarningsUsd, true)} EXTRA
              </Text>
              <Text style={[
                styles.totalPct,
                { color: isPositive ? '#34C759' : palette.graphite },
              ]}>
                ({fmtPct(savings.extraEarningsPct, true)})
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* 90-day projection */}
          <View style={styles.projectionBox}>
            <Text style={styles.projectionLabel}>90-DAY PROJECTION</Text>
            <Text style={styles.projectionValue}>
              {fmtUsd(savings.ninetyDayExtraUsdProjection, true)} with GETKINETIK
            </Text>
            <Text style={styles.projectionNote}>
              Based on this week's savings × 13 weeks
            </Text>
          </View>

          <View style={styles.divider} />

          {/* Adapter recommendations */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>ADAPTER RECOMMENDATIONS</Text>
            {result.scored.map((a) => (
              <RecommendationCard key={a.adapterId} adapter={a} />
            ))}
          </View>

          {/* Footer trust line */}
          <Text style={styles.trustNote}>
            All receipts are signed. Verify at getkinetik.app/verify/
          </Text>
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// SavingsRow — a single comparison row with optional colour highlight.
// ---------------------------------------------------------------------------
function SavingsRow({
  label,
  value,
  active,
  muted = false,
}: {
  label: string;
  value: string;
  active: boolean;
  muted?: boolean;
}) {
  const valueColor = muted
    ? palette.graphite
    : active
      ? '#34C759'
      : palette.platinum;

  return (
    <View style={styles.savingsRow}>
      <Text style={styles.savingsLabel}>{label}</Text>
      <Text style={[styles.savingsValue, { color: valueColor }]}>{value}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles.
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: '#000',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: '90%',
    backgroundColor: palette.obsidian,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: palette.hairline,
    shadowColor: '#000',
    shadowOpacity: 0.7,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: -4 },
    elevation: 28,
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
  sheetSubtitle: {
    color: palette.graphite,
    fontFamily: typography.mono,
    fontSize: 9,
    letterSpacing: 2,
    marginTop: 3,
  },
  closeBtn: {
    padding: 4,
  },
  closeBtnText: {
    color: palette.graphite,
    fontFamily: typography.mono,
    fontSize: 14,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    gap: 16,
    paddingBottom: 40,
  },
  section: {
    gap: 10,
  },
  sectionLabel: {
    color: palette.graphite,
    fontFamily: typography.mono,
    fontSize: 9,
    letterSpacing: 2.4,
    fontWeight: '500',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  savingsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  savingsLabel: {
    color: palette.graphite,
    fontFamily: typography.mono,
    fontSize: 10,
    letterSpacing: 1.4,
    flex: 1,
  },
  savingsValue: {
    fontFamily: typography.mono,
    fontSize: 11,
    letterSpacing: 1.4,
    fontWeight: '500',
    textAlign: 'right',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: palette.hairline,
  },
  totalDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: palette.hairline,
    marginVertical: 6,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    paddingTop: 4,
  },
  totalLabel: {
    fontFamily: typography.mono,
    fontSize: 18,
    letterSpacing: 1,
    fontWeight: '300',
  },
  totalPct: {
    fontFamily: typography.mono,
    fontSize: 12,
    letterSpacing: 1.4,
    fontWeight: '500',
  },
  projectionBox: {
    backgroundColor: palette.obsidianSoft,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.hairline,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 4,
  },
  projectionLabel: {
    color: palette.graphite,
    fontFamily: typography.mono,
    fontSize: 9,
    letterSpacing: 2.4,
    fontWeight: '500',
  },
  projectionValue: {
    color: '#34C759',
    fontFamily: typography.mono,
    fontSize: 16,
    letterSpacing: 1,
    fontWeight: '300',
  },
  projectionNote: {
    color: palette.graphite,
    fontFamily: typography.mono,
    fontSize: 8,
    letterSpacing: 1.2,
    marginTop: 2,
  },
  // Recommendation cards.
  recCard: {
    backgroundColor: palette.obsidianSoft,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.hairline,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 4,
  },
  recHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recAdapterId: {
    color: palette.platinum,
    fontFamily: typography.mono,
    fontSize: 11,
    letterSpacing: 2,
    fontWeight: '600',
  },
  recBadge: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  recBadgeText: {
    fontFamily: typography.mono,
    fontSize: 7,
    letterSpacing: 1.8,
    fontWeight: '600',
  },
  recRecommendation: {
    color: palette.graphite,
    fontFamily: typography.mono,
    fontSize: 9,
    letterSpacing: 1.2,
    lineHeight: 14,
  },
  recGasCost: {
    color: palette.graphite,
    fontFamily: typography.mono,
    fontSize: 8,
    letterSpacing: 1.2,
    opacity: 0.7,
  },
  trustNote: {
    color: palette.graphite,
    fontFamily: typography.mono,
    fontSize: 8,
    letterSpacing: 1.4,
    textAlign: 'center',
    opacity: 0.6,
    marginTop: 8,
  },
});
