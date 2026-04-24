import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { palette, typography } from '../theme/palette';

const PIN_LENGTH = 6;

type Mode = 'set' | 'enter';
type SetStage = 'initial' | 'confirm';

type Props = {
  /**
   * 'set'   — first run, no stored PIN. Collect digits twice (enter +
   *           confirm) before calling onSubmit with the chosen PIN.
   * 'enter' — a PIN exists in SecureStore; parent validates match and
   *           calls back via onSubmit. We don't know the stored PIN here;
   *           parent signals a mismatch by calling the `rejectionNonce`
   *           prop change so we can clear + buzz.
   */
  mode: Mode;
  onSubmit: (pin: string) => void;
  onCancel: () => void;
  /**
   * When the parent rejects a submitted PIN (ENTER mode mismatch), it
   * bumps this number. We watch for the change and clear the entry +
   * fire a heavy haptic + shake the dot row.
   */
  rejectionNonce?: number;
};

const softBuzz = async () => {
  try {
    await Haptics.selectionAsync();
  } catch {
    // haptics unavailable — silent fallback
  }
};

const heavyBuzz = async () => {
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  } catch {
    // haptics unavailable — silent fallback
  }
};

export function PinPad({ mode, onSubmit, onCancel, rejectionNonce = 0 }: Props) {
  const [entry, setEntry] = useState<string>('');
  const [stage, setStage] = useState<SetStage>('initial');
  const [firstPin, setFirstPin] = useState<string>('');
  const [mismatch, setMismatch] = useState<boolean>(false);

  const shake = useSharedValue(0);

  const triggerShake = useCallback(() => {
    shake.value = withSequence(
      withTiming(-10, { duration: 60, easing: Easing.out(Easing.quad) }),
      withTiming(10, { duration: 60, easing: Easing.inOut(Easing.quad) }),
      withTiming(-6, { duration: 60, easing: Easing.inOut(Easing.quad) }),
      withTiming(0, { duration: 80, easing: Easing.in(Easing.quad) }),
    );
  }, [shake]);

  // Parent rejected our ENTER submission — clear + shake + buzz.
  useEffect(() => {
    if (rejectionNonce <= 0) return;
    setEntry('');
    setMismatch(true);
    triggerShake();
    void heavyBuzz();
  }, [rejectionNonce, triggerShake]);

  const handleDigit = useCallback(
    (d: string) => {
      if (entry.length >= PIN_LENGTH) return;
      setMismatch(false);
      void softBuzz();
      const next = entry + d;
      setEntry(next);
      if (next.length === PIN_LENGTH) {
        if (mode === 'enter') {
          onSubmit(next);
          return;
        }
        if (stage === 'initial') {
          setFirstPin(next);
          setStage('confirm');
          setEntry('');
          return;
        }
        if (next === firstPin) {
          onSubmit(next);
        } else {
          setMismatch(true);
          setStage('initial');
          setFirstPin('');
          setEntry('');
          triggerShake();
          void heavyBuzz();
        }
      }
    },
    [entry, firstPin, mode, onSubmit, stage, triggerShake],
  );

  const handleBackspace = useCallback(() => {
    if (entry.length === 0) return;
    void softBuzz();
    setEntry((prev) => prev.slice(0, -1));
  }, [entry.length]);

  const dotsStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shake.value }],
  }));

  const headline =
    mode === 'enter'
      ? 'SOVEREIGN PIN'
      : stage === 'initial'
        ? 'SET SOVEREIGN PIN'
        : 'CONFIRM PIN';

  const subline = mismatch
    ? 'MISMATCH — ENTER SOVEREIGN PIN AGAIN'
    : mode === 'enter'
      ? 'ENTER 6-DIGIT CODE TO UNLOCK NODE'
      : stage === 'initial'
        ? 'CHOOSE A 6-DIGIT CODE'
        : 'RE-ENTER TO CONFIRM';

  return (
    <View style={styles.root} pointerEvents="auto">
      <View style={styles.header}>
        <Text style={styles.brand}>GETKINETIK</Text>
        <View style={styles.rule} />
        <Text style={styles.headline}>{headline}</Text>
      </View>

      <Animated.View style={[styles.dotsRow, dotsStyle]}>
        {Array.from({ length: PIN_LENGTH }).map((_, i) => {
          const filled = i < entry.length;
          return (
            <View
              key={`dot-${i}`}
              style={[
                styles.dot,
                filled && styles.dotFilled,
                mismatch && styles.dotError,
              ]}
            />
          );
        })}
      </Animated.View>

      <Text style={[styles.subline, mismatch && styles.sublineError]}>
        {subline}
      </Text>

      <View style={styles.keypad}>
        {[
          ['1', '2', '3'],
          ['4', '5', '6'],
          ['7', '8', '9'],
        ].map((row, rIdx) => (
          <View key={`row-${rIdx}`} style={styles.keyRow}>
            {row.map((d) => (
              <PinKey key={`k-${d}`} label={d} onPress={() => handleDigit(d)} />
            ))}
          </View>
        ))}
        <View style={styles.keyRow}>
          <PinKey
            label="CANCEL"
            variant="ghost"
            onPress={() => {
              void softBuzz();
              onCancel();
            }}
          />
          <PinKey label="0" onPress={() => handleDigit('0')} />
          <PinKey label="⌫" variant="ghost" onPress={handleBackspace} />
        </View>
      </View>
    </View>
  );
}

type PinKeyProps = {
  label: string;
  onPress: () => void;
  variant?: 'digit' | 'ghost';
};

function PinKey({ label, onPress, variant = 'digit' }: PinKeyProps) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [
        styles.key,
        variant === 'ghost' && styles.keyGhost,
        pressed && styles.keyPressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`PIN key ${label}`}
    >
      <Text
        style={[
          styles.keyLabel,
          variant === 'ghost' && styles.keyLabelGhost,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const KEY_SIZE = 68;

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: palette.obsidian,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 48,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  brand: {
    color: palette.platinum,
    fontFamily: typography.mono,
    fontSize: 14,
    letterSpacing: 6,
    fontWeight: '500',
  },
  rule: {
    width: 40,
    height: 1,
    backgroundColor: palette.sapphire.core,
    marginVertical: 10,
    opacity: 0.8,
  },
  headline: {
    color: palette.sapphire.glow,
    fontFamily: typography.mono,
    fontSize: 10,
    letterSpacing: 3.6,
    fontWeight: '600',
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 16,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: palette.graphite,
    backgroundColor: 'transparent',
  },
  dotFilled: {
    backgroundColor: palette.ruby.core,
    borderColor: palette.ruby.core,
    shadowColor: palette.ruby.core,
    shadowOpacity: 0.9,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
  dotError: {
    borderColor: palette.ruby.ember,
  },
  subline: {
    color: palette.graphite,
    fontFamily: typography.mono,
    fontSize: 10,
    letterSpacing: 2.4,
    marginBottom: 40,
  },
  sublineError: {
    color: palette.ruby.ember,
  },
  keypad: {
    gap: 14,
  },
  keyRow: {
    flexDirection: 'row',
    gap: 18,
  },
  key: {
    width: KEY_SIZE,
    height: KEY_SIZE,
    borderRadius: KEY_SIZE / 2,
    borderWidth: 1,
    borderColor: palette.sapphire.deep,
    backgroundColor: 'rgba(0, 42, 102, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyGhost: {
    backgroundColor: 'transparent',
    borderColor: palette.hairline,
  },
  keyPressed: {
    backgroundColor: 'rgba(0, 123, 255, 0.35)',
    borderColor: palette.sapphire.glow,
  },
  keyLabel: {
    color: palette.sapphire.glow,
    fontFamily: typography.mono,
    fontSize: 22,
    fontWeight: '300',
    letterSpacing: 1,
  },
  keyLabelGhost: {
    color: palette.graphite,
    fontSize: 11,
    letterSpacing: 2,
    fontWeight: '500',
  },
});
