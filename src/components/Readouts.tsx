import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { palette, typography } from '../theme/palette';

type ReadoutProps = {
  label: string;
  value: string;
  suffix?: string;
  fill: number;
  pulse?: boolean;
};

function Readout({ label, value, suffix, fill, pulse }: ReadoutProps) {
  const clamped = Math.max(0, Math.min(1, fill));
  const pulseValue = useSharedValue(0);

  useEffect(() => {
    if (!pulse) {
      pulseValue.value = 0;
      return;
    }
    pulseValue.value = withRepeat(
      withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
  }, [pulse, pulseValue]);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: 0.4 + pulseValue.value * 0.6,
  }));

  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.valueRow}>
        <Text style={styles.value}>{value}</Text>
        {suffix ? <Text style={styles.suffix}>{suffix}</Text> : null}
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${clamped * 100}%` }]}>
          <Animated.View style={[styles.fillGlow, glowStyle]} />
        </View>
      </View>
    </View>
  );
}

type Props = {
  stabilityPct: number;
  yieldTokens: number;
  online: boolean;
  /**
   * When the vault is locked, the sapphire data is blurred + dimmed so the
   * figures can't be read until the user authenticates on the ruby.
   */
  locked?: boolean;
  /** Live BTC spot price in USD. Null until the first fetch resolves. */
  nodeValuationUsd?: number | null;
  /** True when the device is plugged in — Hyper-Charge mode indicator. */
  isCharging?: boolean;
};

const formatUsd = (n: number): string => {
  // 0 decimals, comma thousands separator. e.g. 43261 → "43,261"
  return n.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

export function Readouts({
  stabilityPct,
  yieldTokens,
  online,
  locked = false,
  nodeValuationUsd,
  isCharging: _isCharging = false,
}: Props) {
  const stabilityFill = stabilityPct / 100;
  const yieldFill = Math.min(1, (yieldTokens % 1000) / 1000);

  return (
    <View style={styles.panel}>
      {/* Node Valuation ticker — live BTC spot price as the node's
          reference USD valuation. Sits above the data row. */}
      <View style={styles.ticker}>
        <Text style={styles.tickerLabel}>NODE · VALUATION</Text>
        <Text style={styles.tickerValue}>
          {nodeValuationUsd != null ? `$ ${formatUsd(nodeValuationUsd)}` : '$ —'}
        </Text>
      </View>

      <View style={styles.row}>
        <Readout
          label="Stability"
          value={`${Math.round(stabilityPct)}`}
          suffix="%"
          fill={stabilityFill}
          pulse={online && !locked}
        />
        <View style={styles.divider} />
        <Readout
          label="Yield"
          value={yieldTokens.toFixed(3)}
          suffix="KNT"
          fill={yieldFill}
          pulse={online && !locked}
        />
      </View>

      {locked ? (
        <BlurView
          intensity={28}
          tint="dark"
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        >
          <View style={styles.lockVeil} pointerEvents="none">
            <Text style={styles.lockedLabel}>SECURED</Text>
          </View>
        </BlurView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 12,
    borderRadius: 18,
    backgroundColor: palette.obsidianSoft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.hairline,
    shadowColor: palette.sapphire.deep,
    shadowOpacity: 0.25,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    overflow: 'hidden',
    position: 'relative',
  },
  ticker: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingBottom: 10,
    marginBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.hairline,
  },
  tickerLabel: {
    color: palette.graphite,
    ...typography.label,
  },
  tickerValue: {
    color: palette.sapphire.glow,
    fontSize: 16,
    letterSpacing: 1.5,
    fontWeight: '500',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 14,
  },
  lockVeil: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(10, 10, 10, 0.35)',
  },
  lockedLabel: {
    color: palette.platinum,
    ...typography.label,
    opacity: 0.65,
  },
  card: {
    flex: 1,
    justifyContent: 'space-between',
    minHeight: 78,
  },
  divider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: palette.hairline,
    marginHorizontal: 4,
  },
  label: {
    color: palette.graphite,
    ...typography.label,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 4,
    marginBottom: 10,
  },
  value: {
    color: palette.sapphire.core,
    ...typography.value,
  },
  suffix: {
    color: palette.sapphire.glow,
    marginLeft: 6,
    fontSize: 12,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  track: {
    height: 2,
    backgroundColor: 'rgba(0, 123, 255, 0.12)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: palette.sapphire.core,
  },
  fillGlow: {
    position: 'absolute',
    right: 0,
    top: -3,
    bottom: -3,
    width: 24,
    backgroundColor: palette.sapphire.glow,
    shadowColor: palette.sapphire.glow,
    shadowOpacity: 1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
});
