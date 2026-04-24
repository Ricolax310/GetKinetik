// ============================================================================
// SOVEREIGN MANIFESTO — a slow-scroll reading experience.
// ----------------------------------------------------------------------------
// This is deliberately a *ritual*, not a screen. Obsidian background, ruby
// hairlines between sections, sapphire accent on close, large body type
// with generous line-height. The user reads it once when they first open
// the app, and again when they want to remember what they bought into.
//
// The tone is prophetic-monastic by design — sentences short, weight heavy,
// claims absolute. A DePIN manifesto that sounds like a technical whitepaper
// will be skimmed and forgotten. One that sounds like a scripture gets
// re-read, screenshotted, and quoted.
//
// Nothing here is interactive besides scroll and close. No analytics. No
// settings. Pure brand surface.
// ============================================================================

import React, { useEffect } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { palette, typography } from '../theme/palette';

// ----------------------------------------------------------------------------
// The prose. Kept here as data so it can be localized or extended without
// touching the rendering code. Order is load-bearing — don't shuffle.
// ----------------------------------------------------------------------------
const SECTIONS: ReadonlyArray<{ title: string; body: string }> = [
  {
    title: 'THE PROMISE',
    body: 'Your device is not a terminal.\nIt is a sovereign node.\nIt answers to you alone.',
  },
  {
    title: 'WHAT MAKES A NODE REAL',
    body: 'A node is defined by what it can prove.\nNot by what it claims.\nProof is the only coin of this realm.',
  },
  {
    title: 'THE KEY',
    body: 'A private key was minted for this device.\nIt lives inside hardware that cannot be read remotely.\nIt does not travel. It does not back up.\nIt is sealed in silicon, and in silicon it ends.\nNo server holds it. No company holds it. You hold it.',
  },
  {
    title: 'THE CHAIN',
    body: 'Every thirty seconds, this node signs a statement.\nIt says: I exist. I am healthy. I am here.\nEach statement is hashed into the next.\nBending one breaks them all.\nUptime becomes mathematics.',
  },
  {
    title: 'THE STONE',
    body: 'The ruby is the node\u2019s face.\nIt reflects only when the hardware is well.\nWhen the battery fades, the pulse hastens.\nWhen the connection drops, the light dims.\nIt cannot be faked. It reports what is.',
  },
  {
    title: 'THE YIELD',
    body: 'KNT is a measure, not a promise.\nIt counts what has been proved, not what has been spent.\nReal tokens will come from real proof.\nUntil then, every unit is a vow kept.',
  },
  {
    title: 'THE COMPACT',
    body: 'You own this node.\nThe node owes nothing to anyone.\nIt does not seek permission.\nIt does not ask to be watched.\nIt simply persists \u2014\nand that, in this age, is a kind of defiance.',
  },
];

// ----------------------------------------------------------------------------
// Props.
// ----------------------------------------------------------------------------
type ManifestoProps = {
  visible: boolean;
  onClose: () => void;
};

// ----------------------------------------------------------------------------
// Component.
// ----------------------------------------------------------------------------
export function Manifesto({ visible, onClose }: ManifestoProps) {
  const { height } = useWindowDimensions();
  const progress = useSharedValue(0);

  // Slow, weighty slide-up on show. Slightly faster slide-down on dismiss
  // so the user isn't held hostage by their own close tap.
  useEffect(() => {
    progress.value = withTiming(visible ? 1 : 0, {
      duration: visible ? 520 : 320,
      easing: Easing.inOut(Easing.cubic),
    });
  }, [visible, progress]);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      { translateY: interpolate(progress.value, [0, 1], [height, 0]) },
    ],
  }));

  // Don't even mount content when fully hidden so background doesn't eat taps.
  if (!visible && progress.value === 0) {
    return (
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, styles.hidden]}
      />
    );
  }

  return (
    <Animated.View
      pointerEvents={visible ? 'auto' : 'none'}
      style={[StyleSheet.absoluteFill, overlayStyle]}
    >
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={styles.headerGlyph} />
            <Text style={styles.headerTitle}>SOVEREIGN</Text>
            <Pressable
              onPress={onClose}
              hitSlop={16}
              accessibilityRole="button"
              accessibilityLabel="Close manifesto"
              style={({ pressed }) => [
                styles.closeChip,
                pressed && styles.closeChipPressed,
              ]}
            >
              <Text style={styles.closeChipLabel}>CLOSE</Text>
            </Pressable>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            overScrollMode="never"
          >
            <Text style={styles.opening}>GETKINETIK</Text>
            <View style={styles.openingRule} />
            <Text style={styles.openingSub}>A note for the node-holder.</Text>

            {SECTIONS.map((section, i) => (
              <View key={section.title} style={styles.section}>
                <Text style={styles.sectionIndex}>
                  {String(i + 1).padStart(2, '0')}
                </Text>
                <Text style={styles.sectionTitle}>{section.title}</Text>
                <View style={styles.sectionRule} />
                <Text style={styles.sectionBody}>{section.body}</Text>
              </View>
            ))}

            <View style={styles.footer}>
              <View style={styles.footerDiamond} />
              <Text style={styles.footerLine}>
                SIGNED BY YOUR NODE. SEEN BY YOU ALONE.
              </Text>
            </View>
          </ScrollView>
        </View>
      </SafeAreaView>
    </Animated.View>
  );
}

// ----------------------------------------------------------------------------
// Styles — intentionally generous spacing and large line-heights. The
// manifesto should feel like a page in a leather-bound volume, not an app
// screen. Mono for headers matches the DIAG visual language; body uses the
// default serif-ish system font at a display size.
// ----------------------------------------------------------------------------
const styles = StyleSheet.create({
  hidden: { opacity: 0 },
  safe: {
    flex: 1,
    backgroundColor: palette.obsidian,
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    paddingBottom: 12,
  },
  headerGlyph: {
    width: 10,
    height: 10,
    backgroundColor: palette.ruby.core,
    transform: [{ rotate: '45deg' }],
    opacity: 0.85,
  },
  headerTitle: {
    color: palette.platinum,
    fontFamily: typography.mono,
    fontSize: 11,
    letterSpacing: 5,
    fontWeight: '500',
  },
  closeChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.sapphire.deep,
    backgroundColor: 'rgba(0, 42, 102, 0.18)',
  },
  closeChipPressed: {
    opacity: 0.7,
  },
  closeChipLabel: {
    color: palette.sapphire.glow,
    fontFamily: typography.mono,
    fontSize: 9,
    letterSpacing: 2.4,
    fontWeight: '600',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 40,
    paddingBottom: 80,
  },
  opening: {
    color: palette.platinum,
    fontSize: 22,
    letterSpacing: 8,
    fontWeight: '400',
    textAlign: 'center',
  },
  openingRule: {
    alignSelf: 'center',
    width: 32,
    height: StyleSheet.hairlineWidth,
    backgroundColor: palette.ruby.core,
    opacity: 0.7,
    marginTop: 14,
    marginBottom: 14,
  },
  openingSub: {
    color: palette.graphite,
    fontFamily: typography.mono,
    fontSize: 10,
    letterSpacing: 3,
    textAlign: 'center',
    marginBottom: 56,
    textTransform: 'uppercase',
  },
  section: {
    marginBottom: 56,
  },
  sectionIndex: {
    color: palette.ruby.core,
    fontFamily: typography.mono,
    fontSize: 10,
    letterSpacing: 2,
    opacity: 0.9,
    marginBottom: 8,
  },
  sectionTitle: {
    color: palette.platinum,
    fontFamily: typography.mono,
    fontSize: 13,
    letterSpacing: 4,
    fontWeight: '600',
    marginBottom: 14,
  },
  sectionRule: {
    width: 24,
    height: StyleSheet.hairlineWidth,
    backgroundColor: palette.hairline,
    marginBottom: 20,
  },
  sectionBody: {
    color: palette.platinum,
    fontSize: 19,
    lineHeight: 32,
    fontWeight: '300',
    letterSpacing: 0.2,
  },
  footer: {
    alignItems: 'center',
    paddingTop: 24,
  },
  footerDiamond: {
    width: 6,
    height: 6,
    backgroundColor: palette.ruby.core,
    transform: [{ rotate: '45deg' }],
    opacity: 0.7,
    marginBottom: 18,
  },
  footerLine: {
    color: palette.graphite,
    fontFamily: typography.mono,
    fontSize: 9,
    letterSpacing: 3,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
});
