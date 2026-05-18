import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { palette, typography } from '../theme/palette';
import {
  restoreIdentityFromMnemonic,
  validateMnemonic,
  type NodeIdentity,
} from '../../packages/kinetik-core/src';

type Props = {
  visible: boolean;
  onClose: () => void;
  onRestoreSuccess: (identity: NodeIdentity) => void;
};

export function RestoreNodeModal({ visible, onClose, onRestoreSuccess }: Props) {
  const insets = useSafeAreaInsets();
  const [mnemonic, setMnemonic] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleRestore = async () => {
    const cleaned = mnemonic.trim().toLowerCase().replace(/\s+/g, ' ');
    
    if (!cleaned) {
      setError('PLEASE ENTER YOUR 12-WORD PHRASE');
      void triggerErrorHaptic();
      return;
    }

    if (!validateMnemonic(cleaned)) {
      setError('INVALID CHECKSUM OR SPURIOUS WORD DETECTED');
      void triggerErrorHaptic();
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const restored = await restoreIdentityFromMnemonic(cleaned);
      
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {
        // silent no-op
      }

      onRestoreSuccess(restored);
      setMnemonic('');
      onClose();
    } catch (err) {
      setError(String(err).replace('[identity] ', '').toUpperCase());
      void triggerErrorHaptic();
    } finally {
      setLoading(false);
    }
  };

  const triggerErrorHaptic = async () => {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } catch {
      // silent no-op
    }
  };

  const handleCancel = () => {
    try {
      Haptics.selectionAsync().catch(() => undefined);
    } catch {
      // silent no-op
    }
    setMnemonic('');
    setError(null);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleCancel}
    >
      <View style={styles.container}>
        <View style={styles.backdrop} />
        <View
          style={[
            styles.content,
            {
              paddingTop: insets.top + 32,
              paddingBottom: insets.bottom + 32,
            },
          ]}
        >
          <View style={styles.card}>
            <Text style={styles.eyebrow}>SOVEREIGN RECOVERY</Text>
            <View style={styles.rule} />

            <Text style={styles.title}>RESTORE NODE</Text>
            <Text style={styles.subline}>
              INPUT YOUR 12-WORD SOVEREIGN RECOVERY PHRASE TO RE-DERIVE YOUR NODE ID AND REPUTATION
            </Text>

            <View style={styles.inputWrap}>
              <TextInput
                style={[
                  styles.input,
                  error ? styles.inputError : null,
                ]}
                placeholder="abandon ability able about above absent absorb abstract absurd abuse access accident..."
                placeholderTextColor={palette.graphite}
                multiline={true}
                numberOfLines={3}
                value={mnemonic}
                onChangeText={(text) => {
                  setMnemonic(text);
                  setError(null);
                }}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardAppearance="dark"
              />
            </View>

            {error ? (
              <Text style={styles.errorText}>{error}</Text>
            ) : (
              <Text style={styles.infoText}>
                STRETCHED VIA PBKDF2-SHA512 · CANNOT BE SPARKED OR INTERCEPTED
              </Text>
            )}

            <View style={styles.actions}>
              <Pressable
                onPress={handleCancel}
                style={({ pressed }) => [
                  styles.btn,
                  styles.btnCancel,
                  pressed && styles.btnPressed,
                ]}
              >
                <Text style={styles.btnLabelCancel}>CANCEL</Text>
              </Pressable>

              <Pressable
                onPress={handleRestore}
                disabled={loading}
                style={({ pressed }) => [
                  styles.btn,
                  styles.btnConfirm,
                  pressed && styles.btnPressed,
                ]}
              >
                <Text style={styles.btnLabelConfirm}>
                  {loading ? 'RESTORING…' : 'RESTORE'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: palette.obsidian,
    opacity: 0.95,
  },
  content: {
    width: '100%',
    maxWidth: 360,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: palette.obsidianSoft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0, 123, 255, 0.22)',
    borderRadius: 18,
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
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
    width: 32,
    height: StyleSheet.hairlineWidth,
    backgroundColor: palette.sapphire.core,
    opacity: 0.7,
    marginTop: 12,
    marginBottom: 22,
  },
  title: {
    color: palette.platinum,
    fontSize: 22,
    letterSpacing: 5,
    fontWeight: '400',
    textAlign: 'center',
  },
  subline: {
    color: palette.graphite,
    fontFamily: typography.mono,
    fontSize: 9,
    letterSpacing: 2,
    lineHeight: 15,
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 24,
  },
  inputWrap: {
    width: '100%',
    marginBottom: 16,
  },
  input: {
    backgroundColor: 'rgba(0, 42, 102, 0.12)',
    borderWidth: 1,
    borderColor: palette.sapphire.deep,
    borderRadius: 12,
    color: palette.platinum,
    fontFamily: typography.mono,
    fontSize: 12,
    letterSpacing: 1.2,
    lineHeight: 18,
    padding: 14,
    minHeight: 88,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: palette.ruby.ember,
    backgroundColor: 'rgba(160, 20, 40, 0.08)',
  },
  errorText: {
    color: palette.ruby.ember,
    fontFamily: typography.mono,
    fontSize: 9,
    letterSpacing: 2.2,
    textAlign: 'center',
    marginBottom: 24,
  },
  infoText: {
    color: palette.graphite,
    fontFamily: typography.mono,
    fontSize: 8,
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: 24,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  btn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnCancel: {
    borderColor: palette.hairline,
    backgroundColor: 'transparent',
  },
  btnConfirm: {
    borderColor: palette.sapphire.glow,
    backgroundColor: 'rgba(0, 123, 255, 0.14)',
  },
  btnPressed: {
    opacity: 0.6,
  },
  btnLabelCancel: {
    color: palette.graphite,
    fontFamily: typography.mono,
    fontSize: 10,
    letterSpacing: 2.8,
    fontWeight: '600',
  },
  btnLabelConfirm: {
    color: palette.sapphire.glow,
    fontFamily: typography.mono,
    fontSize: 10,
    letterSpacing: 2.8,
    fontWeight: '600',
  },
});
