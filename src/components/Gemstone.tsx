import React, { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import {
  Canvas,
  Path,
  RadialGradient,
  LinearGradient,
  Circle,
  Group,
  Skia,
  vec,
} from '@shopify/react-native-skia';
import Animated, {
  useSharedValue,
  useDerivedValue,
  withTiming,
  withRepeat,
  withSequence,
  withDelay,
  cancelAnimation,
  Easing,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { Accelerometer } from 'expo-sensors';
import * as Haptics from 'expo-haptics';

// ============================================================================
// Geometry — hardcoded so the Canvas can never default to an undefined-sized
// red error box. 300×300 fits comfortably on iPhone 15 Pro Max & S24 Ultra.
// ============================================================================
const SIZE = 300;
const CX = SIZE / 2;
const CY = SIZE / 2;
const R = 105;

// ----------------------------------------------------------------------------
// Hexagonal brilliant cut — POINTY-TOP orientation (matches reference image).
//   Vertices start at 12 o'clock and step 60° clockwise:
//   top, upper-right, lower-right, bottom, lower-left, upper-left.
//   The gem has a sharp point at top AND bottom, with two slanted edges on
//   each side meeting at a mid-side vertex.
// ----------------------------------------------------------------------------
type Pt = { x: number; y: number };
const HEX_VERTS: Pt[] = Array.from({ length: 6 }, (_, i) => {
  const a = (Math.PI / 3) * i - Math.PI / 2;
  return { x: CX + R * Math.cos(a), y: CY + R * Math.sin(a) };
});

const HEX_PATH = `M ${HEX_VERTS[0].x.toFixed(2)} ${HEX_VERTS[0].y.toFixed(2)} ` +
  HEX_VERTS.slice(1).map((p) => `L ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ') +
  ' Z';

// SkPath instance of the hex — used as the clip region for the stone-masked
// group (internal UV glow + light blade). Falls back to the SVG string if
// MakeFromSVGString somehow fails so the gem still renders.
const HEX_CLIP = Skia.Path.MakeFromSVGString(HEX_PATH) ?? undefined;

// ----------------------------------------------------------------------------
// Inner "table" — the flat central face of a brilliant-cut hex. Sits at ~45%
// of the outer radius, same orientation. This is where the bright hot glow
// concentrates; the 6 crown facets wrap from the outer girdle down to it.
// ----------------------------------------------------------------------------
const INNER_R = R * 0.46;
const INNER_VERTS: Pt[] = Array.from({ length: 6 }, (_, i) => {
  const a = (Math.PI / 3) * i - Math.PI / 2;
  return { x: CX + INNER_R * Math.cos(a), y: CY + INNER_R * Math.sin(a) };
});

const INNER_HEX_PATH = `M ${INNER_VERTS[0].x.toFixed(2)} ${INNER_VERTS[0].y.toFixed(2)} ` +
  INNER_VERTS.slice(1).map((p) => `L ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ') +
  ' Z';

// 6 facet creases — thin lines from each outer vertex to the matching inner
// vertex (same angle). They stop at the table edge, giving the gem a flat
// central face rather than collapsing to a single center point.
const FACET_CREASES: string[] = HEX_VERTS.map(
  (v, i) =>
    `M ${v.x.toFixed(2)} ${v.y.toFixed(2)} L ${INNER_VERTS[i].x.toFixed(2)} ${INNER_VERTS[i].y.toFixed(2)}`,
);

// ----------------------------------------------------------------------------
// 6 wedge facets covering the full hex (each from a pair of adjacent outer
// vertices to the center). Used for per-facet "broken shine" — every wedge
// gets its own LinearGradient with a phase-offset along the beam axis so the
// light visibly staggers between walls instead of sliding flat across them.
// ----------------------------------------------------------------------------
const WEDGE_PATHS: Array<{ path: string; skPath: ReturnType<typeof Skia.Path.MakeFromSVGString> }> =
  HEX_VERTS.map((v, i) => {
    const next = HEX_VERTS[(i + 1) % 6];
    const path = `M ${v.x.toFixed(2)} ${v.y.toFixed(2)} L ${next.x.toFixed(2)} ${next.y.toFixed(2)} L ${CX} ${CY} Z`;
    return { path, skPath: Skia.Path.MakeFromSVGString(path) };
  });

// ----------------------------------------------------------------------------
// FACET_OFFSETS — Refractive phase shift per wedge (IP: "Broken Shine").
// ----------------------------------------------------------------------------
// WHY non-uniform alternating magnitudes:
//   A naive implementation would use uniform offsets (e.g. all 0.15) or a
//   strictly alternating pair (+0.2, -0.2, +0.2, …). Both read as either a
//   flat wipe or a cheap stroboscopic flicker.
//
//   Real faceted gemstones refract light at slightly different phase angles
//   on every wall because no two facets are geometrically identical — the
//   grinding angle, the orientation of the atomic lattice, and the surface
//   roughness all vary. We fake that by giving every wedge a DIFFERENT
//   magnitude (|0.12|..|0.22|) while still alternating the sign. The result
//   is that as the beam sweeps across the stone:
//     - adjacent facets show the bright band at offset positions (stagger)
//     - the stagger is non-periodic (no two seams look identical)
//     - the eye reads the discontinuity as 3D walls instead of a 2D flat.
//
// Units: multiples of R (facet-radius). Values beyond ~0.25 start to look
// jittery (the bright band misses the facet entirely); below ~0.08 the
// stagger is imperceptible. 0.12–0.22 is the tuned sweet spot.
const FACET_OFFSETS = [0.18, -0.22, 0.12, -0.18, 0.22, -0.12] as const;

// ----------------------------------------------------------------------------
// Starburst rays — 12 needles radiating from the catch-light point.
// Alternating lengths so the burst reads as organic, not mechanical.
// ----------------------------------------------------------------------------
// Catch-light lives dead-center on the table face.
const STAR_X = CX;
const STAR_Y = CY;

const RAY_LENGTHS = [2.3, 1.3, 1.7, 2.3, 1.7, 1.3, 2.1, 1.3, 1.7, 2.1, 1.7, 1.3];
const RAY_HALF_WIDTH = 2.2;

type Ray = { path: string; tipX: number; tipY: number };
const RAYS: Ray[] = Array.from({ length: 12 }, (_, i) => {
  const theta = (Math.PI / 6) * i - Math.PI / 2;
  const L = R * RAY_LENGTHS[i];
  const px = Math.cos(theta + Math.PI / 2) * RAY_HALF_WIDTH;
  const py = Math.sin(theta + Math.PI / 2) * RAY_HALF_WIDTH;
  const p1x = STAR_X + px;
  const p1y = STAR_Y + py;
  const p2x = STAR_X - px;
  const p2y = STAR_Y - py;
  const tipX = STAR_X + L * Math.cos(theta);
  const tipY = STAR_Y + L * Math.sin(theta);
  return {
    path: `M ${p1x.toFixed(2)} ${p1y.toFixed(2)} L ${p2x.toFixed(2)} ${p2y.toFixed(2)} L ${tipX.toFixed(2)} ${tipY.toFixed(2)} Z`,
    tipX,
    tipY,
  };
});

// 4-point catch-light star on the upper crown. Kept small + thin so it reads
// as a sparkle, not a blinding cross.
const STAR_ARM = R * 0.38;
const STAR_THICK = R * 0.022;
const STAR_HORIZONTAL = `M ${STAR_X - STAR_ARM} ${STAR_Y} L ${STAR_X} ${STAR_Y - STAR_THICK} L ${STAR_X + STAR_ARM} ${STAR_Y} L ${STAR_X} ${STAR_Y + STAR_THICK} Z`;
const STAR_VERTICAL = `M ${STAR_X} ${STAR_Y - STAR_ARM} L ${STAR_X + STAR_THICK} ${STAR_Y} L ${STAR_X} ${STAR_Y + STAR_ARM} L ${STAR_X - STAR_THICK} ${STAR_Y} Z`;

// ============================================================================
// Palette — Sovereign Ruby
// ============================================================================
const RUBY_DEEP = '#8B0000';
const RUBY_SHADOW = '#3A0209';
const RUBY_CORE = '#FF1430';
const SPARKLE = '#FFCCCC';
const NEON_UV = '#FF2A6D';
// Dormant: drained ruby — clearly still red, just quiet. NOT black.
// These tint the gem toward a dull burgundy without killing the hue.
const DORMANT_CORE = '#5C1018';
const DORMANT_MID = '#3A080F';
const DORMANT_DEEP = '#1F040A';
// Locked: cold desaturated stone — grey/charcoal. Reads as "secured / off-grid".
const LOCKED_CORE = '#4A4E55';
const LOCKED_MID = '#262A31';
const LOCKED_DEEP = '#0E1013';

type Props = {
  active: boolean;
  /**
   * When true the gem is "secured": facets desaturate to cold grey, all
   * decorative shine is suppressed, and the press handler triggers a
   * biometric auth handshake (wired from the parent via onToggle).
   */
  locked: boolean;
  /**
   * Battery level in the range [0, 1]. Drives the breathing pulse speed:
   *   - 1.0  → slow, deep breathing (≈ 2400 ms per cycle)
   *   - 0.0  → fast, urgent thermal pulse (≈ 520 ms per cycle)
   * Thermal Pulse reads the phone's actual stability — a low battery node
   * looks physically stressed.
   */
  batteryLevel: number;
  /**
   * When true the device is plugged in / charging. Forces "Hyper-Charge"
   * mode: the breathing pulse locks to a 350ms cadence regardless of
   * battery level — a sustained overclock visualization.
   */
  isCharging: boolean;
  onToggle: () => void;
};

// Thermal Pulse timing envelope — linear interpolation between fast/urgent
// at empty and slow/deep at full.
const PULSE_FAST_MS = 520;
const PULSE_SLOW_MS = 2400;
const PULSE_HYPER_MS = 350; // Hyper-Charge: locked-in overclock cadence.
const pulseDurationFor = (battery: number, charging: boolean): number => {
  if (charging) return PULSE_HYPER_MS;
  const b = Math.max(0, Math.min(1, battery));
  return PULSE_FAST_MS + b * (PULSE_SLOW_MS - PULSE_FAST_MS);
};

/**
 * Sovereign Ruby — hexagonal brilliant cut with a dramatic LIVE / DORMANT split.
 *
 *   LIVE   (active=true):  full crimson halo, pulsing neon-magenta UV aura,
 *                          starburst rays, catch-light star, saturated ruby
 *                          facets, breathing pulse, heavy haptic on tap.
 *   DORMANT (active=false): halos/rays/catch-light all fade to 0, facets
 *                          darken to a dried-blood shadow, breathing stops.
 *
 * The transition between states is a single Reanimated `withTiming(600ms)`
 * that cross-fades every decorative layer, so powering the node on/off looks
 * like the gem coming to life or falling asleep.
 *
 * All sensor modules (Accelerometer, Haptics) fail-soft with console.warn.
 */
export function Gemstone({ active, locked, batteryLevel, isCharging, onToggle }: Props) {
  const tiltX = useSharedValue(0);
  const tiltY = useSharedValue(0);
  // blade2Lag tracks tiltY with a ~90ms delay. Feeds Blade 2 (the secondary
  // reflection) so its beam lags the primary blade slightly — the eye reads
  // that temporal offset as internal refraction delay, i.e. light bouncing
  // around inside the stone before emerging on a second facet plane.
  const blade2Lag = useSharedValue(0);
  const pulse = useSharedValue(0);
  const beamSweep = useSharedValue(0);
  const activeAnim = useSharedValue(active ? 1 : 0);
  const lockedAnim = useSharedValue(locked ? 1 : 0);
  // Flare: one-shot spike that fires on unlock. Spikes UV glow / halos above
  // normal for ~800ms then decays back to 0. Always additive, so it has no
  // effect when idle.
  const flareAnim = useSharedValue(0);

  // Beam sweep — slow auto-wander. Always running so the beam has motion
  // when the phone is perfectly flat.
  useEffect(() => {
    beamSweep.value = withRepeat(
      withTiming(1, { duration: 4000, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
    return () => {
      cancelAnimation(beamSweep);
    };
  }, [beamSweep]);

  // Thermal Pulse — the ruby's breathing rate is tied to the phone's battery.
  // Full charge = slow, deep breathing. Low battery = fast, urgent pulse.
  // Hyper-Charge mode (plugged in) locks the cadence to 350ms.
  // We bucket the battery to 5% steps so the animation doesn't restart on
  // every minor OS battery-level change (avoids visible jitter).
  const batteryBucket = Math.round(Math.max(0, Math.min(1, batteryLevel)) * 20) / 20;
  useEffect(() => {
    // Hard reset — Hardware Heartbeat Debug. Cancel and zero the shared value
    // BEFORE re-initiating the repeat. This breaks any "stuck" worklet state
    // and guarantees the new cadence takes effect immediately.
    cancelAnimation(pulse);
    pulse.value = 0;
    const duration = pulseDurationFor(batteryBucket, isCharging);
    pulse.value = withRepeat(
      withTiming(1, { duration, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
    return () => {
      cancelAnimation(pulse);
    };
  }, [batteryBucket, isCharging, pulse]);

  // Power-on / power-off crossfade.
  useEffect(() => {
    activeAnim.value = withTiming(active ? 1 : 0, {
      duration: 650,
      easing: Easing.inOut(Easing.cubic),
    });
  }, [active, activeAnim]);

  // Lock crossfade + Flare handshake. When we transition from locked → unlocked,
  // fire a short sequence that slams UV glow / halos to super-bright then
  // decays. Runs in parallel with the grey veil dissolving.
  useEffect(() => {
    lockedAnim.value = withTiming(locked ? 1 : 0, {
      duration: 700,
      easing: Easing.inOut(Easing.cubic),
    });
    if (!locked) {
      flareAnim.value = 0;
      flareAnim.value = withSequence(
        withTiming(1, { duration: 180, easing: Easing.out(Easing.quad) }),
        withDelay(
          80,
          withTiming(0, { duration: 720, easing: Easing.inOut(Easing.cubic) }),
        ),
      );
    }
  }, [locked, lockedAnim, flareAnim]);

  useEffect(() => {
    let sub: { remove: () => void } | null = null;
    let cancelled = false;
    (async () => {
      try {
        const ok = await Accelerometer.isAvailableAsync();
        if (!ok || cancelled) {
          console.warn('[Gemstone] accelerometer unavailable — auto-sweep only');
          return;
        }
        Accelerometer.setUpdateInterval(40);
        sub = Accelerometer.addListener(({ x, y }) => {
          const cx = Math.max(-1, Math.min(1, x));
          const cy = Math.max(-1, Math.min(1, -y));
          tiltX.value = withTiming(cx, { duration: 120 });
          tiltY.value = withTiming(cy, { duration: 120 });
          // Blade 2 lag — a ~90ms catch-up ease. Purposely longer than the
          // primary tilt smoothing (120ms) so Blade 2 consistently trails
          // Blade 1 rather than arriving in phase with it.
          blade2Lag.value = withTiming(cy, { duration: 210 });
        });
      } catch (err) {
        console.warn('[Gemstone] accelerometer init failed:', err);
      }
    })();
    return () => {
      cancelled = true;
      if (sub) sub.remove();
    };
  }, [tiltX, tiltY, blade2Lag]);

  // Wrapper breathes only when active AND unlocked; locked gem holds still.
  const wrapperStyle = useAnimatedStyle(() => {
    const alive = activeAnim.value * (1 - lockedAnim.value);
    const baseScale = 0.94 + alive * 0.06;
    const amp = alive * 0.035;
    return {
      transform: [{ scale: baseScale + pulse.value * amp + flareAnim.value * 0.02 }],
    };
  });

  // ========================================================================
  // 4-STATE MACHINE — Locked → Dormant → Live → Hyper
  // ------------------------------------------------------------------------
  //   LOCKED   (locked=true):
  //     lockedAnim → 1  ⇒  alive = 0
  //     · every decorative layer (halos, rays, star, UV, beam) → 0
  //     · lockedVeilOpacity → 0.92 (cold grey/charcoal over the stone)
  //     · wrapper scale holds at 0.94 (no breathing)
  //     · tap: handlePress fires onToggle, parent runs auth handshake
  //
  //   DORMANT  (locked=false, active=false):
  //     lockedAnim → 0, activeAnim → 0  ⇒  alive = 0
  //     · decorative layers still 0, but dormantVeilOpacity → 0.8
  //       (dull burgundy — clearly ruby, just quiet. NOT black.)
  //     · wrapper scale holds at 0.94
  //
  //   LIVE     (locked=false, active=true):
  //     lockedAnim → 0, activeAnim → 1  ⇒  alive = 1
  //     · all decorative layers swing to full; pulse breathes at a rate
  //       determined by batteryLevel (520ms @ empty → 2400ms @ full).
  //     · dormantVeil & lockedVeil both 0, so the crown ruby shows through.
  //     · wrapper scale = 0.94 + 0.06 (alive) + pulse * 0.035 (breath).
  //
  //   HYPER    (LIVE + isCharging=true):
  //     Same opacities as LIVE. Pulse duration overrides to 350ms. The gem
  //     breathes hard and fast — a sustained overclock visualization.
  //
  // Every transition is a Reanimated withTiming crossfade (activeAnim 650ms,
  // lockedAnim 700ms), and unlock additionally triggers flareAnim: a one-
  // shot spike that adds an additive boost on top of the alive-gated layers
  // so the gem "ignites" coming out of the secured state.
  // ========================================================================
  // State-gated opacities — `alive` multiplies by both `active` AND
  // `(1 - locked)` so every decorative layer goes to 0 when the gem is
  // secured. `flareAnim` contributes an additive spike on unlock.
  const crimsonHaloOpacity = useDerivedValue(() => {
    const alive = activeAnim.value * (1 - lockedAnim.value);
    return (0.5 + pulse.value * 0.2) * alive + flareAnim.value * 0.6;
  });
  const neonHaloOpacity = useDerivedValue(() => {
    const alive = activeAnim.value * (1 - lockedAnim.value);
    return (0.15 + pulse.value * 0.7) * alive + flareAnim.value * 0.95;
  });
  const raysOpacity = useDerivedValue(() => {
    const alive = activeAnim.value * (1 - lockedAnim.value);
    return (0.22 + pulse.value * 0.18) * alive + flareAnim.value * 0.5;
  });
  const starOpacity = useDerivedValue(() => {
    const alive = activeAnim.value * (1 - lockedAnim.value);
    return (0.28 + pulse.value * 0.15) * alive + flareAnim.value * 0.4;
  });
  const hotspotOpacity = useDerivedValue(() => {
    const alive = activeAnim.value * (1 - lockedAnim.value);
    return (0.45 + pulse.value * 0.15) * alive + flareAnim.value * 0.45;
  });

  // Dormant veil (dull ruby) — only shows when unlocked AND inactive. When
  // locked, the grey veil takes over; we hide the dormant ruby so they
  // don't stack.
  const dormantVeilOpacity = useDerivedValue(
    () => (1 - activeAnim.value) * (1 - lockedAnim.value) * 0.8,
  );

  // Locked veil — cold grey overlay that fully covers the stone when secured.
  const lockedVeilOpacity = useDerivedValue(() => lockedAnim.value * 0.92);

  // Internal UV fluorescence — pulses intensely. Suppressed when locked, spiked
  // by flare on unlock.
  const uvInnerOpacity = useDerivedValue(() => {
    const alive = activeAnim.value * (1 - lockedAnim.value);
    return (0.35 + pulse.value * 0.55) * alive + flareAnim.value * 0.9;
  });

  // Light beam only shimmers when live AND unlocked.
  const beamLayerOpacity = useDerivedValue(
    () => activeAnim.value * (1 - lockedAnim.value),
  );

  // ------------------------------------------------------------------------
  // Tilt physics — beam parameterized by ANGLE + POSITION, not raw vectors.
  //   beamAngle    : direction of the gradient axis. Controlled by pitch
  //                  (tiltY) so the beam rotates as the phone pivots F/B.
  //   beamPosition : signed distance of the beam midpoint from the stone's
  //                  center along that axis. Controlled by roll (tiltX) so
  //                  the beam wipes L/R across the 6 facets. Auto-sweeps
  //                  when the phone is flat.
  // ------------------------------------------------------------------------
  const BEAM_AXIS_LEN = R * 2.2;
  const BEAM_BASE_ANGLE = Math.PI / 4; // 45° diagonal resting pose
  const beamAngle = useDerivedValue(
    () => BEAM_BASE_ANGLE + tiltY.value * 0.55,
  );
  const beamPosition = useDerivedValue(() => {
    const auto = (beamSweep.value - 0.5) * 0.9;
    const user = tiltX.value * 0.95;
    return user + auto * 0.35;
  });

  // ========================================================================
  // makeFacetStart / makeFacetEnd — Refraction projection (IP).
  // ------------------------------------------------------------------------
  // For each facet, we project the scalar `offset` (from FACET_OFFSETS) along
  // the current beam direction (dx, dy) = (cos θ, sin θ) to produce a 2D
  // displacement of the beam's midpoint on that wedge only. Then we extrude
  // ± BEAM_AXIS_LEN along the same direction to get the gradient endpoints.
  //
  //   mx = CX + cos(θ) · (beamPosition + offset) · R
  //   my = CY + sin(θ) · (beamPosition + offset) · R
  //   start = (mx − cos(θ)·L,  my − sin(θ)·L)
  //   end   = (mx + cos(θ)·L,  my + sin(θ)·L)
  //
  // WHY project along θ (not perpendicular):
  //   A perpendicular offset would just translate each facet's bright band
  //   sideways — which the eye reads as a weird parallax, not refraction.
  //   Projecting the offset ALONG the beam axis is what creates the phase
  //   shift: each wedge sees the bright band arrive EARLIER or LATER as the
  //   beam sweeps. That timing mismatch is what reads as light breaking
  //   over 3D walls.
  //
  // WHY six explicit hook calls (below):
  //   `useDerivedValue` must be invoked in a stable order on every render
  //   (rules-of-hooks). We could use a loop, but hooks-in-loops trips the
  //   linter and obscures intent. Six named pairs keep it explicit and make
  //   the per-facet mapping grep-able.
  // ========================================================================
  const makeFacetStart = (offset: number) =>
    useDerivedValue(() => {
      const a = beamAngle.value;
      const dx = Math.cos(a);
      const dy = Math.sin(a);
      const pos = beamPosition.value + offset;
      const mx = CX + dx * pos * R;
      const my = CY + dy * pos * R;
      return vec(mx - dx * BEAM_AXIS_LEN, my - dy * BEAM_AXIS_LEN);
    });
  const makeFacetEnd = (offset: number) =>
    useDerivedValue(() => {
      const a = beamAngle.value;
      const dx = Math.cos(a);
      const dy = Math.sin(a);
      const pos = beamPosition.value + offset;
      const mx = CX + dx * pos * R;
      const my = CY + dy * pos * R;
      return vec(mx + dx * BEAM_AXIS_LEN, my + dy * BEAM_AXIS_LEN);
    });

  /* eslint-disable react-hooks/rules-of-hooks */
  const facet0Start = makeFacetStart(FACET_OFFSETS[0]);
  const facet0End = makeFacetEnd(FACET_OFFSETS[0]);
  const facet1Start = makeFacetStart(FACET_OFFSETS[1]);
  const facet1End = makeFacetEnd(FACET_OFFSETS[1]);
  const facet2Start = makeFacetStart(FACET_OFFSETS[2]);
  const facet2End = makeFacetEnd(FACET_OFFSETS[2]);
  const facet3Start = makeFacetStart(FACET_OFFSETS[3]);
  const facet3End = makeFacetEnd(FACET_OFFSETS[3]);
  const facet4Start = makeFacetStart(FACET_OFFSETS[4]);
  const facet4End = makeFacetEnd(FACET_OFFSETS[4]);
  const facet5Start = makeFacetStart(FACET_OFFSETS[5]);
  const facet5End = makeFacetEnd(FACET_OFFSETS[5]);
  /* eslint-enable react-hooks/rules-of-hooks */
  const facetBeams = [
    { start: facet0Start, end: facet0End },
    { start: facet1Start, end: facet1End },
    { start: facet2Start, end: facet2End },
    { start: facet3Start, end: facet3End },
    { start: facet4Start, end: facet4End },
    { start: facet5Start, end: facet5End },
  ];

  // ========================================================================
  // BLADE 2 — Secondary Reflection (lagged, lower-intensity).
  // ------------------------------------------------------------------------
  // Blade 2 runs on its own beam axis derived from `blade2Lag` (the lagged
  // tiltY) and tiltX inverted. The lag + the sign flip makes Blade 2 sweep
  // along a slightly different axis and phase from Blade 1, which is what
  // produces the "two separate surfaces catching light simultaneously"
  // illusion — i.e. internal refraction off a hidden facet plane.
  //
  // We reuse `makeFacetStart`/`makeFacetEnd`, but point them at a separate
  // (angle, position) pair by inlining the math. Six fresh useDerivedValue
  // pairs keep rules-of-hooks happy.
  // ========================================================================
  const BLADE2_ANGLE_OFFSET = -0.18; // radians — ~10° rotated from Blade 1
  const makeBlade2Start = (offset: number) =>
    useDerivedValue(() => {
      const a = BEAM_BASE_ANGLE + blade2Lag.value * 0.55 + BLADE2_ANGLE_OFFSET;
      const dx = Math.cos(a);
      const dy = Math.sin(a);
      // Position driven by the INVERTED tiltX so Blade 2 slides opposite to
      // Blade 1. Auto-sweep is omitted here so the secondary blade feels
      // more "reactive" than the ambient Blade 1.
      const pos = -tiltX.value * 0.85 + offset;
      const mx = CX + dx * pos * R;
      const my = CY + dy * pos * R;
      return vec(mx - dx * BEAM_AXIS_LEN, my - dy * BEAM_AXIS_LEN);
    });
  const makeBlade2End = (offset: number) =>
    useDerivedValue(() => {
      const a = BEAM_BASE_ANGLE + blade2Lag.value * 0.55 + BLADE2_ANGLE_OFFSET;
      const dx = Math.cos(a);
      const dy = Math.sin(a);
      const pos = -tiltX.value * 0.85 + offset;
      const mx = CX + dx * pos * R;
      const my = CY + dy * pos * R;
      return vec(mx + dx * BEAM_AXIS_LEN, my + dy * BEAM_AXIS_LEN);
    });

  /* eslint-disable react-hooks/rules-of-hooks */
  const b2Start0 = makeBlade2Start(FACET_OFFSETS[0]);
  const b2End0 = makeBlade2End(FACET_OFFSETS[0]);
  const b2Start1 = makeBlade2Start(FACET_OFFSETS[1]);
  const b2End1 = makeBlade2End(FACET_OFFSETS[1]);
  const b2Start2 = makeBlade2Start(FACET_OFFSETS[2]);
  const b2End2 = makeBlade2End(FACET_OFFSETS[2]);
  const b2Start3 = makeBlade2Start(FACET_OFFSETS[3]);
  const b2End3 = makeBlade2End(FACET_OFFSETS[3]);
  const b2Start4 = makeBlade2Start(FACET_OFFSETS[4]);
  const b2End4 = makeBlade2End(FACET_OFFSETS[4]);
  const b2Start5 = makeBlade2Start(FACET_OFFSETS[5]);
  const b2End5 = makeBlade2End(FACET_OFFSETS[5]);
  /* eslint-enable react-hooks/rules-of-hooks */
  const blade2Beams = [
    { start: b2Start0, end: b2End0 },
    { start: b2Start1, end: b2End1 },
    { start: b2Start2, end: b2End2 },
    { start: b2Start3, end: b2End3 },
    { start: b2Start4, end: b2End4 },
    { start: b2Start5, end: b2End5 },
  ];

  // ========================================================================
  // BLADE 3 — Micro-Glint visibility gate.
  // ------------------------------------------------------------------------
  // The micro-glint only appears at the extremes of tilt (|tiltX| > 0.65
  // OR |tiltY| > 0.65) so the gem gets an extra sparkle right at the
  // moments a real faceted stone would kick back a hard highlight. At rest
  // it contributes nothing. Shares Blade 1's facet beams — the behavioral
  // difference is the threshold gate and the razor-thin stops.
  // ========================================================================
  const microGlintOpacity = useDerivedValue(() => {
    const alive = activeAnim.value * (1 - lockedAnim.value);
    const threshold =
      Math.abs(tiltX.value) > 0.65 || Math.abs(tiltY.value) > 0.65 ? 1 : 0;
    // Smooth the hard threshold slightly by mixing in tilt magnitude so
    // the glint fades in as the user approaches the tilt extreme rather
    // than popping on/off.
    const mag = Math.max(Math.abs(tiltX.value), Math.abs(tiltY.value));
    const soft = Math.max(0, (mag - 0.55) / 0.35);
    return alive * Math.min(1, Math.max(threshold * 0.6, soft));
  });

  const handlePress = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch (err) {
      console.warn('[Gemstone] haptics unavailable, continuing without buzz:', err);
    }
    onToggle();
  };

  return (
    <Pressable
      onPress={handlePress}
      hitSlop={24}
      accessibilityRole="button"
      accessibilityLabel="Toggle Sovereign Node"
    >
      <Animated.View
        style={[
          { width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' },
          wrapperStyle,
        ]}
      >
        <View style={{ width: SIZE, height: SIZE }}>
          <Canvas style={{ width: SIZE, height: SIZE }}>
            {/* 1. UV halo — deep crimson aura (live-gated) */}
            <Circle cx={CX} cy={CY} r={R * 1.55} opacity={crimsonHaloOpacity}>
              <RadialGradient
                c={vec(CX, CY)}
                r={R * 1.55}
                colors={[RUBY_DEEP, `${RUBY_DEEP}66`, 'rgba(139, 0, 0, 0)']}
                positions={[0, 0.55, 1]}
              />
            </Circle>

            {/* 2. UV halo — neon magenta-red fluorescence (pulses, live-gated) */}
            <Circle cx={CX} cy={CY} r={R * 1.4} opacity={neonHaloOpacity}>
              <RadialGradient
                c={vec(CX, CY)}
                r={R * 1.4}
                colors={[NEON_UV, `${NEON_UV}55`, 'rgba(255, 42, 109, 0)']}
                positions={[0, 0.5, 1]}
              />
            </Circle>

            {/* 3. Starburst rays (live-gated) */}
            <Group opacity={raysOpacity}>
              {RAYS.map((ray, i) => (
                <Path key={`ray-${i}`} path={ray.path}>
                  <LinearGradient
                    start={vec(STAR_X, STAR_Y)}
                    end={vec(ray.tipX, ray.tipY)}
                    colors={[
                      'rgba(255, 240, 235, 0.95)',
                      'rgba(255, 180, 190, 0.55)',
                      'rgba(255, 42, 109, 0)',
                    ]}
                    positions={[0, 0.35, 1]}
                  />
                </Path>
              ))}
            </Group>

            {/* ========================================================
                STONE-CLIPPED GROUP — everything inside renders only on
                the gem. Internal UV glow + light blade are masked so they
                can never spill onto the obsidian background.
                ======================================================== */}
            <Group clip={HEX_CLIP ?? HEX_PATH}>
              {/* 4a. Crown base — ruby-red shading, no bright center so
                  the table face remains the hero. */}
              <Path path={HEX_PATH}>
                <RadialGradient
                  c={vec(CX, CY - R * 0.15)}
                  r={R * 1.2}
                  colors={[RUBY_CORE, `${RUBY_CORE}DD`, RUBY_DEEP, RUBY_SHADOW]}
                  positions={[0, 0.35, 0.78, 1]}
                />
              </Path>

              {/* 4b. Internal UV fluorescence — masked to the stone via
                  the parent <Group clip={HEX_CLIP}>, so the glow physically
                  cannot escape the gem walls. Two stacked layers:
                    - WIDE crimson aura: deep RUBY_DEEP at the edges fading
                      to RUBY_CORE in the mid-zone. Sets the background
                      "lit from within" tone.
                    - HOT white-red core: tight #FFE2E5 → NEON_UV → RUBY_CORE
                      that breathes brighter than everything below it. This
                      is the "hotter at the center" enhancement. */}
              <Circle cx={CX} cy={CY} r={R * 1.0} opacity={uvInnerOpacity}>
                <RadialGradient
                  c={vec(CX, CY)}
                  r={R * 1.0}
                  colors={[
                    `${RUBY_CORE}E6`,
                    `${RUBY_DEEP}D0`,
                    `${RUBY_DEEP}40`,
                    `${RUBY_DEEP}00`,
                  ]}
                  positions={[0, 0.45, 0.8, 1]}
                />
              </Circle>
              <Circle cx={CX} cy={CY} r={R * 0.55} opacity={uvInnerOpacity}>
                <RadialGradient
                  c={vec(CX, CY)}
                  r={R * 0.55}
                  colors={[
                    'rgba(255, 226, 229, 0.95)',
                    NEON_UV,
                    `${RUBY_CORE}AA`,
                    `${RUBY_CORE}00`,
                  ]}
                  positions={[0, 0.35, 0.75, 1]}
                />
              </Circle>

              {/* 4c. Table face — the flat central hex where the hot
                  glow concentrates. */}
              <Path path={INNER_HEX_PATH}>
                <RadialGradient
                  c={vec(CX, CY)}
                  r={INNER_R * 1.15}
                  colors={[SPARKLE, RUBY_CORE, `${RUBY_DEEP}CC`]}
                  positions={[0, 0.55, 1]}
                />
              </Path>

              {/* 4d. Per-facet "BROKEN SHINE" — THREE-BLADE REFLECTION (IP).
                  Each of the 6 wedges stacks three razor-thin LinearGradients
                  ([0.45, 0.50, 0.55] ±0.02), all drawn with blendMode="screen"
                  so they build additively on the ruby underneath rather than
                  replacing it. Blend mode only applies to the shine layers —
                  the UV core below stays in normal blend.

                    Blade 1 — PRIMARY reflection. Intensity 1.0. Stops at
                      [0.45, 0.50, 0.55]. Driven by tiltX via facetBeams[i].
                      This is the hero blade the eye tracks first.

                    Blade 2 — SECONDARY reflection. Intensity 0.45. Stops
                      offset +0.02 to [0.47, 0.52, 0.57]. Driven by the
                      lagged tiltY (blade2Lag) on its own axis (see
                      BLADE2_ANGLE_OFFSET). The 90ms lag reads as internal
                      refraction delay.

                    Blade 3 — MICRO-GLINT. Intensity 0.12. Stops offset
                      -0.02 to [0.43, 0.48, 0.53] — razor thin. Visibility
                      gated on |tilt| > 0.65 so it only kicks in at tilt
                      extremes, the moment a real gemstone would flash a
                      hard highlight.

                  WHY three blades instead of one fatter gradient:
                    A single gradient slides as a single object and reads
                    as a 2D wipe. Three tight gradients on different axes
                    with slightly offset stops create interference patterns
                    the eye can't resolve as any single motion — it reads
                    as light bouncing off multiple internal surfaces. Same
                    principle as the six-facet stagger, escalated to the
                    per-blade layer. */}
              {WEDGE_PATHS.map((wedge, i) => (
                <React.Fragment key={`shine-${i}`}>
                  {/* Blade 1 — primary, full intensity, razor stops */}
                  <Path
                    path={wedge.path}
                    opacity={beamLayerOpacity}
                    blendMode="screen"
                  >
                    <LinearGradient
                      start={facetBeams[i].start}
                      end={facetBeams[i].end}
                      colors={[
                        'rgba(255, 255, 255, 0)',
                        'rgba(255, 255, 255, 0)',
                        'rgba(255, 255, 255, 1.0)',
                        'rgba(255, 255, 255, 0)',
                        'rgba(255, 255, 255, 0)',
                      ]}
                      positions={[0, 0.45, 0.5, 0.55, 1]}
                    />
                  </Path>

                  {/* Blade 2 — secondary, 45% intensity, lagged axis,
                      stops shifted +0.02 so it never stacks with Blade 1 */}
                  <Path
                    path={wedge.path}
                    opacity={beamLayerOpacity}
                    blendMode="screen"
                  >
                    <LinearGradient
                      start={blade2Beams[i].start}
                      end={blade2Beams[i].end}
                      colors={[
                        'rgba(255, 255, 255, 0)',
                        'rgba(255, 255, 255, 0)',
                        'rgba(255, 240, 245, 0.45)',
                        'rgba(255, 255, 255, 0)',
                        'rgba(255, 255, 255, 0)',
                      ]}
                      positions={[0, 0.47, 0.52, 0.57, 1]}
                    />
                  </Path>

                  {/* Blade 3 — micro-glint, 12% intensity, threshold gate,
                      stops shifted -0.02 so it never stacks with Blade 1.
                      Shares Blade 1's axis but opacity is gated via
                      microGlintOpacity — invisible until |tilt| > 0.65. */}
                  <Path
                    path={wedge.path}
                    opacity={microGlintOpacity}
                    blendMode="screen"
                  >
                    <LinearGradient
                      start={facetBeams[i].start}
                      end={facetBeams[i].end}
                      colors={[
                        'rgba(255, 255, 255, 0)',
                        'rgba(255, 255, 255, 0)',
                        'rgba(255, 250, 250, 0.12)',
                        'rgba(255, 255, 255, 0)',
                        'rgba(255, 255, 255, 0)',
                      ]}
                      positions={[0, 0.43, 0.48, 0.53, 1]}
                    />
                  </Path>
                </React.Fragment>
              ))}

              {/* 4e. Facet crease HIGHLIGHTS — thin bright lines along
                  each wall, drawn UNDER the dark breaks below. */}
              <Group opacity={0.22}>
                {FACET_CREASES.map((d, i) => (
                  <Path
                    key={`crease-hi-${i}`}
                    path={d}
                    style="stroke"
                    strokeWidth={1.2}
                    color={SPARKLE}
                  />
                ))}
              </Group>

              {/* 4f. Facet BREAKS — dark shadow strokes drawn ON TOP of
                  the blade. Where the beam crosses a wall, this shadow
                  interrupts the gradient so the shine visibly steps
                  between facets instead of reading as a flat 2D wipe. */}
              <Group opacity={0.55}>
                {FACET_CREASES.map((d, i) => (
                  <Path
                    key={`crease-break-${i}`}
                    path={d}
                    style="stroke"
                    strokeWidth={1.4}
                    color={RUBY_SHADOW}
                  />
                ))}
              </Group>

              {/* 4g. Table outline inside the clip so the edge is crisp
                  even under the blade. */}
              <Path
                path={INNER_HEX_PATH}
                style="stroke"
                strokeWidth={0.9}
                color={SPARKLE}
                opacity={0.5}
              />
            </Group>

            {/* 7. Crisp hex outline — drawn OUTSIDE the clip so the
                silhouette reads even when the gem is dormant. */}
            <Path
              path={HEX_PATH}
              style="stroke"
              strokeWidth={1.4}
              color={SPARKLE}
              opacity={0.38}
            />

            {/* 8. Catch-light — small, subtle sparkle (live-gated).
                Warm-pink (no pure white) so it kisses the crown without
                blowing out. */}
            <Group opacity={starOpacity}>
              <Path path={STAR_HORIZONTAL}>
                <RadialGradient
                  c={vec(STAR_X, STAR_Y)}
                  r={STAR_ARM}
                  colors={[
                    'rgba(255, 220, 225, 0.85)',
                    'rgba(255, 190, 200, 0.35)',
                    'rgba(255, 204, 204, 0)',
                  ]}
                  positions={[0, 0.5, 1]}
                />
              </Path>
              <Path path={STAR_VERTICAL}>
                <RadialGradient
                  c={vec(STAR_X, STAR_Y)}
                  r={STAR_ARM}
                  colors={[
                    'rgba(255, 220, 225, 0.85)',
                    'rgba(255, 190, 200, 0.35)',
                    'rgba(255, 204, 204, 0)',
                  ]}
                  positions={[0, 0.5, 1]}
                />
              </Path>
              <Circle cx={STAR_X} cy={STAR_Y} r={R * 0.07} opacity={hotspotOpacity}>
                <RadialGradient
                  c={vec(STAR_X, STAR_Y)}
                  r={R * 0.07}
                  colors={[
                    'rgba(255, 230, 230, 0.85)',
                    'rgba(255, 180, 190, 0.4)',
                    'rgba(255, 42, 109, 0)',
                  ]}
                  positions={[0, 0.5, 1]}
                />
              </Circle>
            </Group>

            {/* 9. Dormant veil — drains the gem to a dull burgundy when off.
                Kept clearly RUBY (no black), just desaturated + dim. */}
            <Path path={HEX_PATH} opacity={dormantVeilOpacity}>
              <RadialGradient
                c={vec(CX, CY)}
                r={R * 1.1}
                colors={[DORMANT_CORE, DORMANT_MID, DORMANT_DEEP]}
                positions={[0, 0.6, 1]}
              />
            </Path>

            {/* 10. Locked veil — cold grey/charcoal overlay that desaturates
                the stone when secured. Opacity = lockedAnim * 0.92 so the
                hex silhouette still reads but the ruby hue is drained. */}
            <Path path={HEX_PATH} opacity={lockedVeilOpacity}>
              <RadialGradient
                c={vec(CX, CY - R * 0.1)}
                r={R * 1.15}
                colors={[LOCKED_CORE, LOCKED_MID, LOCKED_DEEP]}
                positions={[0, 0.55, 1]}
              />
            </Path>
          </Canvas>
        </View>
      </Animated.View>
    </Pressable>
  );
}
