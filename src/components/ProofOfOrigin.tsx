// ============================================================================
// Proof of Origin card — the Sovereign Node's exportable identity artifact.
// ----------------------------------------------------------------------------
// What this is: a screenshot-ready, cryptographically signed declaration
// that this device is a real Sovereign Node. When the card opens, we sign
// a FRESH payload over the current state — so a screenshot is a
// timestamped, verifiable proof, not a stale export.
//
// Design contract:
//   · Obsidian backdrop, centered card with ruby hairline border.
//   · Framed like a certificate: wordmark on top, data table in the
//     middle, public key + signature at the bottom, attribution at the
//     foot. Every element is there to make the screenshot itself feel
//     like a document.
//   · All data rows use the same mono-label / sapphire-value pair as the
//     DIAG panel so this feels native to the rest of the app.
//   · While signing, pubkey + signature render as centered hairline
//     placeholders ("· · · ·") — short enough (~5-10ms) that most users
//     will never see them, but correct UX if someone opens the card
//     before the signing finishes.
//
// What's NOT here (by design):
//   · No "share" / "copy" button yet. The export path for v1 is: user
//     screenshots. Native share sheets are a Step-5+ feature.
//   · No QR code. A future card will include one; today, the visible
//     hex IS the proof — it can be typed or OCR'd by a verifier.
//
// Ownership / attribution is stamped twice: once in the signed payload
// (via PROOF_ATTRIBUTION baked in by src/lib/proof.ts), and once as
// visible text on the card. The visible text IS part of the signed
// message, so it cannot be altered without breaking verification.
// ============================================================================

import React, { useEffect, useRef, useState } from 'react';
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
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { palette, typography } from '../theme/palette';
import { type NodeIdentity } from '../lib/identity';
import {
  createProofOfOrigin,
  PROOF_ATTRIBUTION,
  type SignedProofOfOrigin,
} from '../lib/proof';
import {
  buildVerifierUrl,
  shareProof,
  VERIFIER_ORIGIN,
} from '../lib/proofShare';
import { ProofQr } from './ProofQr';

// ----------------------------------------------------------------------------
// Props — controlled component; VaultPanel owns the open flag and passes in
// the identity + the stats the proof should reference.
// ----------------------------------------------------------------------------
type ProofOfOriginProps = {
  visible: boolean;
  onClose: () => void;
  identity: NodeIdentity | null;
  stats: {
    lifetimeBeats: number;
    firstBeatTs: number | null;
    chainTip: string | null;
  };
};

// ----------------------------------------------------------------------------
// Break a hex string into fixed-width chunks so long values (pubkey = 64,
// signature = 128) render cleanly in monospace without overflowing the card.
// Chunks are joined with a narrow space-like separator so screenshots
// preserve the visual rhythm.
// ----------------------------------------------------------------------------
const chunkHex = (hex: string, chunkSize: number): string => {
  const out: string[] = [];
  for (let i = 0; i < hex.length; i += chunkSize) {
    out.push(hex.slice(i, i + chunkSize));
  }
  return out.join('\n');
};

const fmtIsoDate = (ms: number | null | undefined): string =>
  ms == null ? '—' : new Date(ms).toISOString().slice(0, 10);

const fmtIsoDateTime = (ms: number): string =>
  new Date(ms).toISOString().replace('T', ' ').slice(0, 19) + 'Z';

// A hairline placeholder to render in slots that haven't been filled yet
// (pubkey + signature while signing is in flight). The dots are intentionally
// sparse so the reveal from placeholder → real hex feels like data arriving.
const PLACEHOLDER = '· · · · · · · · · · · · · · · ·';

export function ProofOfOrigin({
  visible,
  onClose,
  identity,
  stats,
}: ProofOfOriginProps) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();

  // Fresh signed proof every time the user opens the card. `proof` is null
  // until signing finishes (typically 5-10ms). signingRef protects against
  // double-signs if the modal is re-opened rapidly.
  const [proof, setProof] = useState<SignedProofOfOrigin | null>(null);
  const signingRef = useRef(false);

  // When the card becomes visible, mint a fresh signed proof. We take the
  // identity + stats snapshot at open time; closing the card discards
  // `proof` so the next open produces a brand new, newly-signed artifact
  // (each screenshot is therefore a unique timestamped claim).
  useEffect(() => {
    if (!visible) {
      setProof(null);
      return;
    }
    if (!identity || signingRef.current) return;
    signingRef.current = true;
    (async () => {
      try {
        const p = await createProofOfOrigin(identity, stats);
        setProof(p);
      } catch (err) {
        console.warn('[ProofOfOrigin] sign failed:', err);
        setProof(null);
      } finally {
        signingRef.current = false;
      }
    })();
  }, [visible, identity, stats]);

  // Presentation — same 360ms inOut(cubic) curve as the Manifesto so the
  // two hidden surfaces share a visual grammar on open/dismiss.
  const presence = useSharedValue(0);
  useEffect(() => {
    presence.value = withTiming(visible ? 1 : 0, {
      duration: 360,
      easing: Easing.inOut(Easing.cubic),
    });
  }, [visible, presence]);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: presence.value,
    transform: [
      { translateY: (1 - presence.value) * Math.min(height * 0.06, 40) },
    ],
  }));

  const handleClose = () => {
    (async () => {
      try {
        await Haptics.selectionAsync();
      } catch {
        /* haptics unavailable — silent no-op */
      }
    })();
    onClose();
  };

  if (!visible && presence.value === 0) return null;

  // Derived display values. Fall back to em-dash when the data isn't
  // available yet (e.g. no heartbeats emitted on this device).
  const nodeId = identity?.nodeId ?? 'KINETIK-NODE-XXXXXXXX';
  const pubkey = identity?.publicKeyHex ?? '';
  const mintedLabel = fmtIsoDate(identity?.createdAt);
  const sinceLabel = fmtIsoDate(stats.firstBeatTs);
  const chainTipLabel = stats.chainTip
    ? stats.chainTip.toUpperCase()
    : '—';
  const beatsLabel = String(stats.lifetimeBeats);

  const issuedLabel = proof ? fmtIsoDateTime(proof.payload.issuedAt) : '—';
  const hashLabel = proof ? proof.hash.toUpperCase() : '—';

  // --------------------------------------------------------------------------
  // Verifier URL + share handler. Both are recomputed whenever `proof`
  // materializes (i.e. right after the async sign completes). We DO NOT
  // memoize — signing already gates re-work, and base64url-encoding ~500
  // bytes of JSON is ~microsecond-cheap.
  // --------------------------------------------------------------------------
  const verifyUrl = proof ? buildVerifierUrl(proof) : VERIFIER_ORIGIN;

  const handleShare = async () => {
    if (!proof) return;
    try {
      await Haptics.selectionAsync();
    } catch {
      /* haptics unavailable — silent no-op */
    }
    try {
      await shareProof(proof);
    } catch (err) {
      console.warn('[ProofOfOrigin] share failed:', err);
    }
  };

  const pubkeyBlock = proof
    ? chunkHex(pubkey, 16)
    : PLACEHOLDER + '\n' + PLACEHOLDER;
  const signatureBlock = proof
    ? chunkHex(proof.signature.toUpperCase(), 32)
    : PLACEHOLDER + '\n' + PLACEHOLDER + '\n' + PLACEHOLDER + '\n' + PLACEHOLDER;

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, containerStyle]}
      pointerEvents={visible ? 'auto' : 'none'}
    >
      <View style={styles.backdrop} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + 56,
            paddingBottom: insets.bottom + 72,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <Text style={styles.eyebrow}>PROOF OF ORIGIN</Text>
          <View style={styles.rule} />

          <Text style={styles.brand}>GETKINETIK</Text>
          <Text style={styles.subBrand}>SOVEREIGN NODE · v1</Text>

          <View style={styles.divider} />

          <View style={styles.dataBlock}>
            <Row label="NODE" value={nodeId} />
            <Row label="MINTED" value={mintedLabel} />
            <Row label="BEATS" value={beatsLabel} />
            <Row label="SINCE" value={sinceLabel} />
            <Row label="CHAIN TIP" value={chainTipLabel} />
            <Row label="ISSUED" value={issuedLabel} />
            <Row label="HASH" value={hashLabel} />
          </View>

          <View style={styles.divider} />

          <Text style={styles.fieldHeader}>PUBLIC KEY</Text>
          <Text style={styles.hexBlock} selectable>
            {pubkeyBlock}
          </Text>

          <Text style={[styles.fieldHeader, styles.fieldHeaderSpaced]}>
            SIGNATURE
          </Text>
          <Text style={styles.hexBlockMuted} selectable>
            {signatureBlock}
          </Text>

          <View style={styles.divider} />

          {/*
            Verify section — the QR carries a compact-form {payload, signature}
            wrapped in a #proof=<base64url> fragment pointing at the canonical
            verifier. A scanner opens verify page → verifier auto-decodes,
            re-derives the message via stableStringify, and shows a green seal.
            The URL beneath is selectable on the card for manual paste. The
            SHARE button uses the native share sheet to hand off the FULL
            JSON artifact (including message + hash) into any messenger.
          */}
          {proof ? (
            <View style={styles.verifySection}>
              <Text style={styles.fieldHeader}>VERIFY AT</Text>
              <View style={styles.qrWrap}>
                <ProofQr value={verifyUrl} size={208} quietZone={4} />
              </View>
              <Text style={styles.verifyUrl} selectable numberOfLines={2}>
                {VERIFIER_ORIGIN}
              </Text>
              <Pressable
                onPress={handleShare}
                accessibilityRole="button"
                accessibilityLabel="Share signed Proof of Origin"
                style={({ pressed }) => [
                  styles.shareButton,
                  pressed && styles.shareButtonPressed,
                ]}
              >
                <Text style={styles.shareButtonLabel}>SHARE SIGNED JSON</Text>
              </Pressable>
            </View>
          ) : null}

          <View style={styles.divider} />

          {/*
            Attribution is rendered twice by design: once visibly here so a
            screenshot is self-describing, and once inside the signed
            payload (via PROOF_ATTRIBUTION in src/lib/proof.ts). Any attempt
            to strip or alter the attribution invalidates the signature,
            because the exact string was part of the signed message.
          */}
          <Text style={styles.attribution}>{PROOF_ATTRIBUTION}</Text>
          <Text style={styles.attributionSub}>
            A Sovereign Node artifact · not transferable
          </Text>
        </View>
      </ScrollView>

      <Pressable
        onPress={handleClose}
        hitSlop={16}
        accessibilityRole="button"
        accessibilityLabel="Close proof of origin"
        style={({ pressed }) => [
          styles.close,
          { top: insets.top + 18 },
          pressed && styles.closePressed,
        ]}
      >
        <Text style={styles.closeGlyph}>×</Text>
      </Pressable>
    </Animated.View>
  );
}

// ----------------------------------------------------------------------------
// Row — internal presentational component. Shares the mono-label +
// sapphire-value style with the DIAG panel so the whole app reads as
// one typographic system.
// ----------------------------------------------------------------------------
function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: palette.obsidian,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  // The card itself. Max width keeps the layout tight on tablets, while
  // the hairline ruby border gives the screenshot its "certificate" frame.
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: palette.obsidianSoft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 20, 48, 0.22)',
    borderRadius: 18,
    paddingVertical: 32,
    paddingHorizontal: 24,
  },
  eyebrow: {
    color: palette.sapphire.glow,
    fontFamily: typography.mono,
    fontSize: 10,
    letterSpacing: 4.2,
    textAlign: 'center',
    fontWeight: '500',
  },
  rule: {
    alignSelf: 'center',
    width: 32,
    height: StyleSheet.hairlineWidth,
    backgroundColor: palette.ruby.core,
    opacity: 0.7,
    marginTop: 12,
    marginBottom: 22,
  },
  brand: {
    color: palette.platinum,
    fontSize: 22,
    letterSpacing: 7,
    fontWeight: '400',
    textAlign: 'center',
  },
  subBrand: {
    color: palette.graphite,
    fontFamily: typography.mono,
    fontSize: 9,
    letterSpacing: 3,
    textAlign: 'center',
    marginTop: 8,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: palette.hairline,
    marginVertical: 22,
  },
  dataBlock: {
    gap: 6,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 3,
  },
  rowLabel: {
    color: palette.graphite,
    fontFamily: typography.mono,
    fontSize: 10,
    letterSpacing: 2.4,
    fontWeight: '500',
  },
  rowValue: {
    color: palette.sapphire.glow,
    fontFamily: typography.mono,
    fontSize: 11,
    letterSpacing: 1.6,
    fontWeight: '500',
    maxWidth: '62%',
    textAlign: 'right',
  },
  fieldHeader: {
    color: palette.sapphire.glow,
    fontFamily: typography.mono,
    fontSize: 9,
    letterSpacing: 3,
    fontWeight: '500',
    marginBottom: 10,
  },
  fieldHeaderSpaced: {
    marginTop: 22,
  },
  hexBlock: {
    color: palette.platinum,
    fontFamily: typography.mono,
    fontSize: 12,
    letterSpacing: 1.4,
    lineHeight: 20,
    textAlign: 'center',
  },
  hexBlockMuted: {
    color: palette.graphite,
    fontFamily: typography.mono,
    fontSize: 10,
    letterSpacing: 1.2,
    lineHeight: 18,
    textAlign: 'center',
  },
  verifySection: {
    alignItems: 'center',
    gap: 14,
  },
  qrWrap: {
    padding: 10,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifyUrl: {
    color: palette.sapphire.glow,
    fontFamily: typography.mono,
    fontSize: 10,
    letterSpacing: 1.4,
    textAlign: 'center',
    paddingHorizontal: 4,
  },
  shareButton: {
    marginTop: 4,
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.sapphire.glow,
    backgroundColor: 'rgba(0, 123, 255, 0.14)',
  },
  shareButtonPressed: {
    opacity: 0.7,
  },
  shareButtonLabel: {
    color: palette.sapphire.glow,
    fontFamily: typography.mono,
    fontSize: 10,
    letterSpacing: 2.8,
    fontWeight: '600',
    textAlign: 'center',
  },
  attribution: {
    color: palette.platinum,
    fontSize: 11,
    letterSpacing: 2.2,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 2,
  },
  attributionSub: {
    color: palette.graphite,
    fontFamily: typography.mono,
    fontSize: 8,
    letterSpacing: 2,
    textAlign: 'center',
    marginTop: 8,
  },
  close: {
    position: 'absolute',
    right: 24,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.hairline,
    backgroundColor: 'rgba(255, 20, 48, 0.06)',
  },
  closePressed: {
    opacity: 0.6,
  },
  closeGlyph: {
    color: palette.platinum,
    fontSize: 22,
    lineHeight: 24,
    fontWeight: '200',
  },
});
