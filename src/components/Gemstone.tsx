import React, { useEffect, useMemo } from 'react';
import { Pressable } from 'react-native';
import {
  Canvas,
  Path,
  Skia,
  RadialGradient,
  LinearGradient,
  Group,
  BlurMask,
  Circle,
  vec,
} from '@shopify/react-native-skia';
import Animated, {
  useSharedValue,
  useDerivedValue,
  withTiming,
  withRepeat,
  cancelAnimation,
  Easing,
  useAnimatedStyle,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Accelerometer } from 'expo-sensors';

import { palette } from '../theme/palette';

export const GEMSTONE_SIZE = 280;

type Props = {
  size?: number;
  active: boolean;
  onToggle: () => void;
};

/**
 * The Sovereign Node core: a hexagonal brilliant-cut ruby rendered in Skia.
 * - RadialGradient "fire" center is driven by the device accelerometer.
 * - Breathing scale + glow is driven by react-native-reanimated (4.x).
 * - Heavy haptic fires on toggle.
 */
export function Gemstone({ size = GEMSTONE_SIZE, active, onToggle }: Props) {
  const center = size / 2;
  const radius = size * 0.38;

  const tiltX = useSharedValue(0);
  const tiltY = useSharedValue(0);
  const breath = useSharedValue(1);
  const glow = useSharedValue(active ? 1 : 0.35);

  useEffect(() => {
    Accelerometer.setUpdateInterval(40);
    const sub = Accelerometer.addListener(({ x, y }) => {
      const nx = Math.max(-1, Math.min(1, x));
      const ny = Math.max(-1, Math.min(1, -y));
      tiltX.value = withTiming(nx, { duration: 140 });
      tiltY.value = withTiming(ny, { duration: 140 });
    });
    return () => sub.remove();
  }, [tiltX, tiltY]);

  useEffect(() => {
    breath.value = withRepeat(
      withTiming(active ? 1.045 : 1.018, {
        duration: active ? 1400 : 2600,
        easing: Easing.inOut(Easing.quad),
      }),
      -1,
      true,
    );
    glow.value = withTiming(active ? 1 : 0.35, { duration: 600 });
    return () => {
      cancelAnimation(breath);
      cancelAnimation(glow);
    };
  }, [active, breath, glow]);

  const gradientCenter = useDerivedValue(() => {
    const dx = tiltX.value * radius * 0.5;
    const dy = tiltY.value * radius * 0.5;
    return vec(center + dx, center + dy);
  }, [center, radius]);

  const tableCenter = useDerivedValue(() => {
    const dx = tiltX.value * radius * 0.25;
    const dy = tiltY.value * radius * 0.25;
    return vec(center + dx, center + dy);
  }, [center, radius]);

  const haloOpacity = useDerivedValue(() => 0.25 + glow.value * 0.35);

  const wrapperStyle = useAnimatedStyle(() => ({
    transform: [{ scale: breath.value }],
    opacity: 0.85 + glow.value * 0.15,
  }));

  const hexPath = useMemo(() => {
    const p = Skia.Path.Make();
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i - Math.PI / 2;
      const x = center + radius * Math.cos(a);
      const y = center + radius * Math.sin(a);
      if (i === 0) p.moveTo(x, y);
      else p.lineTo(x, y);
    }
    p.close();
    return p;
  }, [center, radius]);

  const innerHexPath = useMemo(() => {
    const p = Skia.Path.Make();
    const ir = radius * 0.5;
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i - Math.PI / 2;
      const x = center + ir * Math.cos(a);
      const y = center + ir * Math.sin(a);
      if (i === 0) p.moveTo(x, y);
      else p.lineTo(x, y);
    }
    p.close();
    return p;
  }, [center, radius]);

  const facets = useMemo(() => {
    const ir = radius * 0.5;
    const verts = (rad: number) =>
      Array.from({ length: 6 }, (_, i) => {
        const a = (Math.PI / 3) * i - Math.PI / 2;
        return { x: center + rad * Math.cos(a), y: center + rad * Math.sin(a) };
      });
    const outer = verts(radius);
    const inner = verts(ir);
    return Array.from({ length: 6 }, (_, i) => {
      const p = Skia.Path.Make();
      const o1 = outer[i];
      const o2 = outer[(i + 1) % 6];
      const i1 = inner[i];
      const i2 = inner[(i + 1) % 6];
      p.moveTo(o1.x, o1.y);
      p.lineTo(o2.x, o2.y);
      p.lineTo(i2.x, i2.y);
      p.lineTo(i1.x, i1.y);
      p.close();
      return { path: p, a: o1, b: i2 };
    });
  }, [center, radius]);

  const handlePress = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch {
      // haptics unavailable — silently continue
    }
    onToggle();
  };

  return (
    <Pressable onPress={handlePress} hitSlop={24} accessibilityRole="button" accessibilityLabel="Toggle Sovereign Node">
      <Animated.View style={[{ width: size, height: size }, wrapperStyle]}>
        <Canvas style={{ width: size, height: size }}>
          <Circle cx={center} cy={center} r={radius * 1.55} color={palette.ruby.deep} opacity={haloOpacity}>
            <BlurMask blur={44} style="normal" />
          </Circle>

          <Group>
            <Path path={hexPath}>
              <RadialGradient
                c={gradientCenter}
                r={radius * 1.25}
                colors={[
                  palette.ruby.ember,
                  palette.ruby.core,
                  palette.ruby.mid,
                  palette.ruby.deep,
                  palette.ruby.shadow,
                ]}
                positions={[0, 0.25, 0.55, 0.85, 1]}
              />
            </Path>

            {facets.map((f, i) => (
              <Path key={`facet-${i}`} path={f.path} opacity={0.5}>
                <LinearGradient
                  start={vec(f.a.x, f.a.y)}
                  end={vec(f.b.x, f.b.y)}
                  colors={[
                    'rgba(255, 220, 215, 0.55)',
                    'rgba(255, 20, 48, 0.0)',
                    'rgba(58, 2, 9, 0.55)',
                  ]}
                  positions={[0, 0.55, 1]}
                />
              </Path>
            ))}

            <Path path={innerHexPath} opacity={0.9}>
              <RadialGradient
                c={tableCenter}
                r={radius * 0.55}
                colors={[palette.ruby.ember, palette.ruby.core, 'rgba(255, 20, 48, 0)']}
                positions={[0, 0.45, 1]}
              />
            </Path>

            <Circle
              cx={center - radius * 0.28}
              cy={center - radius * 0.38}
              r={radius * 0.16}
              color="rgba(255,255,255,0.55)"
            >
              <BlurMask blur={16} style="normal" />
            </Circle>
          </Group>

          <Path
            path={hexPath}
            style="stroke"
            strokeWidth={1}
            color="rgba(255, 177, 153, 0.35)"
          />
        </Canvas>
      </Animated.View>
    </Pressable>
  );
}
