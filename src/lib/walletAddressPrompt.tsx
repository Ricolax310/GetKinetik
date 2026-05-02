/**
 * Imperative Android (and fallback) wallet-address entry.
 *
 * iOS adapters use Alert.prompt; Android has no Alert.prompt — this modal is
 * shown from adapters via `openWalletAddressPrompt(...)`. The host component
 * (`WalletAddressPromptHost`) must be mounted once at the app root.
 *
 * Design notes:
 *   · Single in-flight request — concurrent `openWalletAddressPrompt(...)`
 *     calls receive `null` immediately (no queue, no surprise modals).
 *   · Inner `<PromptDialog />` is keyed by request id so React reuses zero
 *     state across opens — no stale text leaking from a previous prompt.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  Keyboard,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { palette, typography } from '../theme/palette';

export type WalletPromptConfig = {
  title: string;
  message: string;
  placeholder?: string;
  /** Return null if valid; otherwise a short error message for the user. */
  validate: (trimmed: string) => string | null;
};

type PromptRequest = WalletPromptConfig & {
  id: number;
  resolve: (value: string | null) => void;
};

let nextId = 1;
let pending: PromptRequest | null = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => {
    try {
      l();
    } catch {
      // ignore listener errors so one bad subscriber cannot break the host
    }
  });
}

export function openWalletAddressPrompt(
  config: WalletPromptConfig,
): Promise<string | null> {
  return new Promise((resolve) => {
    if (pending) {
      // Concurrent prompts are not supported — fail closed instead of stacking.
      resolve(null);
      return;
    }
    pending = { id: nextId++, ...config, resolve };
    emit();
  });
}

function closePending(result: string | null) {
  const cur = pending;
  if (!cur) return;
  pending = null;
  emit();
  Keyboard.dismiss();
  cur.resolve(result);
}

export function WalletAddressPromptHost() {
  // Mirror module-level `pending` into local state so React rerenders.
  const [req, setReq] = useState<PromptRequest | null>(pending);
  useEffect(() => {
    const sub = () => setReq(pending);
    listeners.add(sub);
    sub();
    return () => {
      listeners.delete(sub);
    };
  }, []);

  if (!req) return null;
  return <PromptDialog key={req.id} req={req} onResolve={closePending} />;
}

function PromptDialog({
  req,
  onResolve,
}: {
  req: PromptRequest;
  onResolve: (result: string | null) => void;
}) {
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  const onCancel = useCallback(() => onResolve(null), [onResolve]);
  const onConnect = useCallback(() => {
    const trimmed = value.trim();
    const err = req.validate(trimmed);
    if (err) {
      setError(err);
      return;
    }
    onResolve(trimmed);
  }, [onResolve, req, value]);

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable
        style={styles.backdrop}
        onPress={onCancel}
        accessibilityRole="button"
        accessibilityLabel="Dismiss wallet prompt"
      >
        <Pressable style={styles.sheet} onPress={() => {}}>
          <Text style={styles.title}>{req.title}</Text>
          <Text style={styles.message}>{req.message}</Text>
          <TextInput
            style={styles.input}
            value={value}
            onChangeText={(t) => {
              setValue(t);
              if (error) setError(null);
            }}
            placeholder={req.placeholder ?? 'Wallet address'}
            placeholderTextColor={palette.graphite}
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
            returnKeyType="done"
            onSubmitEditing={onConnect}
            accessibilityLabel="Wallet address"
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <View style={styles.actions}>
            <Pressable
              style={({ pressed }) => [
                styles.btn,
                styles.btnGhost,
                pressed && styles.pressed,
              ]}
              onPress={onCancel}
              accessibilityRole="button"
              accessibilityLabel="Cancel"
            >
              <Text style={styles.btnGhostLabel}>Cancel</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.btn,
                styles.btnPrimary,
                pressed && styles.pressed,
              ]}
              onPress={onConnect}
              accessibilityRole="button"
              accessibilityLabel="Connect wallet"
            >
              <Text style={styles.btnPrimaryLabel}>Connect</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  sheet: {
    backgroundColor: palette.obsidianSoft,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.hairline,
    padding: 20,
  },
  title: {
    ...typography.label,
    color: palette.platinum,
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    color: palette.graphite,
    marginBottom: 16,
  },
  input: {
    fontFamily: typography.mono,
    fontSize: 14,
    color: palette.platinum,
    borderWidth: 1,
    borderColor: palette.hairline,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  error: {
    fontSize: 12,
    color: palette.ruby.core,
    marginBottom: 8,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 8,
  },
  btn: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
    minWidth: 88,
    alignItems: 'center',
  },
  pressed: {
    opacity: 0.85,
  },
  btnGhost: {
    borderWidth: 1,
    borderColor: palette.hairline,
  },
  btnGhostLabel: {
    ...typography.label,
    fontSize: 11,
    color: palette.graphite,
  },
  btnPrimary: {
    backgroundColor: palette.sapphire.core,
  },
  btnPrimaryLabel: {
    ...typography.label,
    fontSize: 11,
    color: palette.platinum,
  },
});
