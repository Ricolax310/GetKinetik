// ============================================================================
// GenesisScoreTicker — bureau Genesis Score chip + info sheet.
// ----------------------------------------------------------------------------
// Compact home-surface chip that shows the node's current bureau grade.
// Tapping it opens a bottom sheet explaining the score scale and bands.
//
// Visual language:
//   · Ruby border/tones — bureau / identity surface (distinct from the
//     sapphire telemetry surfaces and the graphite credits chip).
//   · Same chip geometry as GenesisCreditsTicker so the two sit together
//     without visual competition.
//   · Score band displayed as a right-aligned badge so the number +
//     band are readable at a glance without opening the sheet.
//
// Layout (compact chip):
//
//   ┌──────────────────────────────────────────────┐
//   │  GENESIS SCORE                    [STANDING] │
//   │  636                         0 — 1000 SCALE  │
//   └──────────────────────────────────────────────┘
//
// Score bands (from docs/methodology/GENESIS_SCORE.md):
//   TAMPERED   ≤ 199   — invalid signature / impossible inputs. Do not pay.
//   NEW        200–499 — insufficient evidence. Not necessarily bad.
//   STANDING   500–749 — real device confirmed. Reasonable baseline.
//   STRONG     750–899 — long, continuous, sensor-coherent record.
//   PREMIER    900–999 — top tier. Multi-input attested + clean disclosure.
// ============================================================================

import React, { useEffect, useState } from 'react';
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
import type { GenesisScoreResult } from '../hooks/useGenesisScore';

// ---------------------------------------------------------------------------
// Score band metadata.
// ---------------------------------------------------------------------------

type BandMeta = {
  name: string;
  range: string;
  desc: string;
  color: string;
};

const BANDS: BandMeta[] = [
  {
    name:  'TAMPERED',
    range: '≤ 199',
    desc:  'Physically impossible inputs or invalid signature detected. Partners should not pay.',
    color: '#ff7474',
  },
  {
    name:  'NEW',
    range: '200 – 499',
    desc:  'Insufficient signed evidence yet. Keep the node running — the score rises with time.',
    color: '#8e8e94',
  },
  {
    name:  'STANDING',
    range: '500 – 749',
    desc:  'Real-device operation confirmed. Reasonable baseline for partner reward eligibility.',
    color: '#ffd28a',
  },
  {
    name:  'STRONG',
    range: '750 – 899',
    desc:  'Long, continuous, sensor-coherent record. Qualifies for most partner premium tiers.',
    color: '#ffb199',
  },
  {
    name:  'PREMIER',
    range: '900 – 999',
    desc:  'Top tier. Multi-input attested with clean disclosure. Highest partner premium access.',
    color: '#ff1430',
  },
];

// ---------------------------------------------------------------------------
// Helpers.
// ---------------------------------------------------------------------------

function bandColor(band: string | null): string {
  return BANDS.find((b) => b.name === band?.toUpperCase())?.color ?? palette.graphite;
}

function fmtAsOf(iso: string | undefined): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    const mins = Math.floor((Date.now() - d.getTime()) / 60_000);
    if (mins < 1)  return 'updated just now';
    if (mins < 60) return `updated ${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24)  return `updated ${hrs}h ago`;
    return `updated ${Math.floor(hrs / 24)}d ago`;
  } catch {
    return '';
  }
}

// ---------------------------------------------------------------------------
// ScoreInfoSheet — explains the score and its bands.
// ---------------------------------------------------------------------------

function ScoreInfoSheet({
  visible,
  onClose,
  result,
}: {
  visible: boolean;
  onClose: () => void;
  result: GenesisScoreResult | null;
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

  const currentBandColor = result ? bandColor(result.band) : palette.graphite;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[StyleSheet.absoluteFillObject, styles.backdrop, backdropStyle]}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
      </Animated.View>

      <Animated.View style={[styles.sheet, sheetStyle]} pointerEvents="auto">
        <View style={styles.sheetHeader}>
          <View>
            <Text style={styles.sheetTitle}>GENESIS SCORE</Text>
            <Text style={styles.sheetSub}>THE BUREAU · INDEPENDENT GRADE</Text>
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
          {/* Current score */}
          <View style={styles.scoreBox}>
            {result ? (
              <>
                <Text style={styles.scoreValue}>{result.score}</Text>
                <Text style={[styles.scoreBand, { color: currentBandColor }]}>
                  {result.band}
                </Text>
                <Text style={styles.scoreScale}>0 – 1000 SCALE · {result.methodologyVersion}</Text>
                {result.asOf ? (
                  <Text style={styles.scoreAsOf}>{fmtAsOf(result.asOf)}</Text>
                ) : null}
              </>
            ) : (
              <>
                <Text style={styles.scoreValue}>—</Text>
                <Text style={styles.scoreScale}>COMPUTING…</Text>
              </>
            )}
          </View>

          {/* What is it? */}
          <View style={styles.explainerBox}>
            <Text style={styles.explainerTitle}>WHAT IS THE GENESIS SCORE?</Text>
            <Text style={styles.explainerText}>
              The Genesis Score is the bureau's public reputation grade for your node —
              like a credit score for a sovereign device. It's computed from hardware-signed
              evidence your device already produces: identity integrity, uptime continuity,
              sensor coherence, and network engagement.
            </Text>
            <Text style={styles.explainerText}>
              Partner networks read the score before paying verified-user premiums. A higher
              score means more evidence of real, continuous hardware operation — not gaming,
              not emulation. The score is public, non-transferable, and never priced.
            </Text>
            <Text style={styles.explainerText}>
              The methodology is public at{' '}
              <Text style={{ color: palette.ruby.ember }}>
                getkinetik.app/bureau/
              </Text>
              . Inputs and direction are published; weights are internal — same model as FICO.
            </Text>
          </View>

          {/* Score bands */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>SCORE BANDS</Text>
            {BANDS.map((band) => {
              const isActive = result?.band?.toUpperCase() === band.name;
              return (
                <View
                  key={band.name}
                  style={[styles.bandRow, isActive && styles.bandRowActive]}
                >
                  <View style={styles.bandLeft}>
                    <Text style={[styles.bandName, { color: band.color }]}>
                      {band.name}
                    </Text>
                    <Text style={styles.bandRange}>{band.range}</Text>
                  </View>
                  <Text style={styles.bandDesc}>{band.desc}</Text>
                </View>
              );
            })}
          </View>

          {/* Neutrality note */}
          <View style={styles.neutralityBox}>
            <Text style={styles.neutralityText}>
              GETKINETIK never issues a token, never holds equity in any graded network,
              and never accepts payment in a graded network's native asset. The bureau's
              credibility depends on that neutrality being structurally enforced — see
              NEUTRALITY.md in the public repo.
            </Text>
          </View>
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// GenesisScoreTicker — the home-surface compact chip.
// ---------------------------------------------------------------------------

type GenesisScoreTickerProps = {
  result: GenesisScoreResult | null;
  loading: boolean;
};

export function GenesisScoreTicker({ result, loading }: GenesisScoreTickerProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const scale = useSharedValue(1);

  const handlePress = async () => {
    scale.value = withSpring(0.93, {}, () => { scale.value = withSpring(1); });
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch { /* ignore */ }
    setSheetOpen(true);
  };

  const chipStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const currentBandColor = result ? bandColor(result.band) : palette.graphite;
  const scored = Boolean(result);
  const borderColor = scored ? 'rgba(255, 20, 48, 0.4)' : palette.hairline;

  const scoreLabel = loading && !result
    ? '…'
    : result
      ? String(result.score)
      : '—';

  const bandLabel = result?.band ?? (loading ? 'COMPUTING' : 'NOT YET GRADED');

  return (
    <>
      <Pressable
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityLabel="Genesis Score"
        accessibilityHint="Opens bureau score information"
      >
        <Animated.View style={[styles.chip, { borderColor }, chipStyle]}>
          <View style={styles.chipContent}>
            <Text style={[styles.chipLabel, { color: scored ? palette.ruby.ember : palette.graphite }]}>
              GENESIS SCORE
            </Text>
            <View style={styles.chipValueRow}>
              <Text style={styles.chipValue}>{scoreLabel}</Text>
              <Text style={styles.chipScale}>0 – 1000</Text>
            </View>
          </View>
          <View style={[styles.chipBadge, { borderColor: currentBandColor + '55' }]}>
            <Text style={[styles.chipBadgeText, { color: currentBandColor }]}>
              {bandLabel}
            </Text>
          </View>
        </Animated.View>
      </Pressable>

      <ScoreInfoSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        result={result}
      />
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
    gap: 10,
  },
  chipContent: {
    gap: 2,
    flex: 1,
  },
  chipLabel: {
    fontFamily: typography.mono,
    fontSize: 9,
    letterSpacing: 2.4,
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  chipValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  chipValue: {
    color: palette.platinum,
    fontFamily: typography.mono,
    fontSize: 20,
    letterSpacing: 1,
    fontWeight: '300',
  },
  chipScale: {
    color: palette.graphite,
    fontFamily: typography.mono,
    fontSize: 9,
    letterSpacing: 1.6,
    fontWeight: '400',
  },
  chipBadge: {
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: 'rgba(255, 20, 48, 0.06)',
  },
  chipBadgeText: {
    fontFamily: typography.mono,
    fontSize: 8,
    letterSpacing: 1.4,
    fontWeight: '600',
  },
  // Sheet styles.
  backdrop: {
    backgroundColor: '#000',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: '92%',
    backgroundColor: palette.obsidian,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 20, 48, 0.22)',
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
  sheetSub: {
    color: palette.ruby.ember,
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
  scoreBox: {
    alignItems: 'center',
    paddingVertical: 12,
    gap: 4,
  },
  scoreValue: {
    color: palette.platinum,
    fontFamily: typography.mono,
    fontSize: 64,
    letterSpacing: 2,
    fontWeight: '200',
    lineHeight: 72,
  },
  scoreBand: {
    fontFamily: typography.mono,
    fontSize: 14,
    letterSpacing: 4,
    fontWeight: '600',
    marginTop: 4,
  },
  scoreScale: {
    color: palette.graphite,
    fontFamily: typography.mono,
    fontSize: 9,
    letterSpacing: 2,
    marginTop: 2,
  },
  scoreAsOf: {
    color: palette.graphite,
    fontFamily: typography.mono,
    fontSize: 8,
    letterSpacing: 1.4,
    marginTop: 4,
    opacity: 0.6,
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
  bandRow: {
    backgroundColor: palette.obsidianSoft,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.hairline,
    padding: 12,
    gap: 4,
  },
  bandRowActive: {
    borderColor: 'rgba(255, 20, 48, 0.35)',
    backgroundColor: 'rgba(255, 20, 48, 0.05)',
  },
  bandLeft: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
  },
  bandName: {
    fontFamily: typography.mono,
    fontSize: 11,
    letterSpacing: 2.4,
    fontWeight: '700',
  },
  bandRange: {
    color: palette.graphite,
    fontFamily: typography.mono,
    fontSize: 9,
    letterSpacing: 1.4,
  },
  bandDesc: {
    color: palette.platinum,
    fontFamily: typography.mono,
    fontSize: 10,
    letterSpacing: 0.6,
    lineHeight: 15,
    opacity: 0.72,
  },
  neutralityBox: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.hairline,
    paddingTop: 12,
  },
  neutralityText: {
    color: palette.graphite,
    fontFamily: typography.mono,
    fontSize: 8,
    letterSpacing: 1.2,
    lineHeight: 14,
    opacity: 0.7,
    textAlign: 'center',
  },
});
