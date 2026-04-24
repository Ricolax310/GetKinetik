import React from 'react';
import { StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { palette } from './src/theme/palette';
import { VaultPanel } from './src/components/VaultPanel';

export default function App() {
  return (
    <SafeAreaProvider>
      <View style={styles.root}>
        <StatusBar style="light" translucent backgroundColor="transparent" />
        <SafeAreaView style={styles.safe} edges={['top', 'bottom', 'left', 'right']}>
          <VaultPanel />
        </SafeAreaView>
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.obsidian,
  },
  safe: {
    flex: 1,
    backgroundColor: palette.obsidian,
  },
});
