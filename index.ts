// ----------------------------------------------------------------------------
// CSPRNG polyfill — MUST be the first import in the app.
// ----------------------------------------------------------------------------
// Hermes in Expo SDK 54 does not expose `globalThis.crypto.getRandomValues`
// by default. `react-native-get-random-values` installs it as a global on
// app boot, routing to Android SecureRandom / iOS SecRandomCopyBytes. Every
// crypto-adjacent dep (@noble/ed25519, @noble/hashes, uuid, etc.) relies on
// this global, so it must be imported before any other module that touches
// randomness. Do not move or remove this line.
// ----------------------------------------------------------------------------
import 'react-native-get-random-values';

import { registerRootComponent } from 'expo';

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native
// build, the environment is set up appropriately.
registerRootComponent(App);
