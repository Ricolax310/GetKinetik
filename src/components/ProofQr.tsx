// ============================================================================
// ProofQr — QR code renderer for the Proof of Origin card.
// ----------------------------------------------------------------------------
// Why Skia and not <View> cells:
//   A ~750-char proof URL encodes to QR version ~18 at medium error
//   correction, which is ~85 modules per side. That's ~7,225 cells. Rendering
//   each as a React <View> would create ~7,000 native views per frame —
//   visibly slow on Android, and a memory pig on iOS. Instead we build a
//   single Skia path containing every dark cell, then draw it once.
//
// Why medium ('M') error correction:
//   L = 7% recovery (densest, least forgiving if scratched/compressed)
//   M = 15% recovery      ← chosen
//   Q = 25% recovery
//   H = 30% recovery (sparsest, eats into data capacity)
//   Medium gives us comfortable recovery against screenshot JPEG
//   artifacts and phone-camera tilt without making the QR much denser.
//
// Why pure-JS qrcode-generator:
//   Zero native modules → no dev-client rebuild required to ship this
//   feature. Adding any react-native-* QR library would force a new EAS
//   build, which we do not need.
//
// The QR is deliberately NOT animated. It's a document artifact — it
// should render once, hold still, and be screenshot-stable.
// ============================================================================

import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Canvas, Path, Skia } from '@shopify/react-native-skia';
import qrcode from 'qrcode-generator';

import { palette } from '../theme/palette';

type ProofQrProps = {
  /** The full verifier URL or any string payload to encode. */
  value: string;
  /** Final rendered size (px). Both sides of the square. */
  size?: number;
  /** Quiet-zone padding in modules. QR spec calls for at least 4. */
  quietZone?: number;
};

// ----------------------------------------------------------------------------
// buildQrPath — turn the value into a single Skia path covering every
// dark cell. qrcode-generator auto-selects the smallest QR version that
// fits the input at the requested error correction level.
// ----------------------------------------------------------------------------
const buildQrPath = (value: string, quietZone: number) => {
  // typeNumber = 0 asks the library to auto-size. 'M' = medium ECC.
  const qr = qrcode(0, 'M');
  qr.addData(value);
  qr.make();
  const count = qr.getModuleCount();
  const total = count + quietZone * 2;

  const path = Skia.Path.Make();
  for (let row = 0; row < count; row++) {
    for (let col = 0; col < count; col++) {
      if (qr.isDark(row, col)) {
        const x = col + quietZone;
        const y = row + quietZone;
        path.addRect({ x, y, width: 1, height: 1 });
      }
    }
  }
  return { path, total };
};

export function ProofQr({ value, size = 220, quietZone = 4 }: ProofQrProps) {
  // Memoize both the Skia path AND the total module count — re-encoding a
  // QR for a 700-char payload costs a few ms and we render this inside a
  // modal that could re-mount under other props.
  const { path, total } = useMemo(
    () => buildQrPath(value, quietZone),
    [value, quietZone],
  );

  // Scale transform: map (0..total) module coordinates onto (0..size) px.
  // Doing this on the Skia side keeps the underlying path in clean integer
  // module coordinates — easy to reason about, and sharp at any size.
  const scale = size / total;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {/*
        The white backdrop is MANDATORY for QR scanners — dark modules on
        a light background is how the spec defines contrast. We render it
        as a real View behind the Canvas (instead of a Skia Rect) so that
        a screenshot of just the QR region always has a clean background,
        even if Skia ever decides to anti-alias the edge differently.
      */}
      <View style={[styles.backdrop, { width: size, height: size }]} />
      <Canvas style={{ width: size, height: size }}>
        <Path
          path={path}
          color={palette.obsidian}
          transform={[{ scale }]}
        />
      </Canvas>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    backgroundColor: '#ffffff',
    borderRadius: 10,
  },
});
