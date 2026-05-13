// ============================================================================
// Local sanity check for the Genesis Score v1.1 algorithm in verify-device.js.
//
// Mirrors computeGenesisScoreV1 here so we can run it against known payload
// shapes without spinning up the Cloudflare Function. If this file drifts
// from verify-device.js, the API result is the source of truth.
//
// v1.1 hardening covered here:
//   - bureau-bounded chain age (firstBeatTs can't exceed bureau first-seen)
//   - beat-rate sanity (claimed beats / observed window must be plausible)
//   - chain rewind detection (later proof claiming fewer beats than peak)
//
// Run: node scripts/test-genesis-score.mjs
// ============================================================================

const MAX_BEAT_RATE_PER_MS = 1 / 25_000;

function computeGenesisScoreV1(payload, bureauContext) {
  let score = 200;
  const tamperFlags = [];

  const claimedFirstBeatTs =
    typeof payload.firstBeatTs === "number" ? payload.firstBeatTs : null;
  const referenceTs =
    typeof payload.issuedAt === "number"
      ? payload.issuedAt
      : typeof payload.mintedAt === "number"
        ? payload.mintedAt
        : Date.now();

  const bureauFirstSeenMs =
    bureauContext && typeof bureauContext.firstSeenMs === "number"
      ? bureauContext.firstSeenMs
      : referenceTs;

  const effectiveFirstBeatTs =
    claimedFirstBeatTs === null
      ? bureauFirstSeenMs
      : Math.max(claimedFirstBeatTs, bureauFirstSeenMs);

  if (effectiveFirstBeatTs <= referenceTs) {
    const ageDays = (referenceTs - effectiveFirstBeatTs) / 86_400_000;
    const ageScore = Math.min(300, Math.round((ageDays / 180) * 300));
    score += Math.max(0, ageScore);
  }

  const lifetimeBeats =
    typeof payload.lifetimeBeats === "number" && payload.lifetimeBeats >= 0
      ? payload.lifetimeBeats
      : 0;

  let beatRateOk = true;
  if (lifetimeBeats > 0) {
    const observedWindowMs = Math.max(1, referenceTs - bureauFirstSeenMs);
    if (lifetimeBeats / observedWindowMs > MAX_BEAT_RATE_PER_MS) {
      tamperFlags.push("beat_rate_implausible");
      beatRateOk = false;
    }
  }

  if (
    bureauContext &&
    typeof bureauContext.peakLifetimeBeats === "number" &&
    lifetimeBeats < bureauContext.peakLifetimeBeats
  ) {
    tamperFlags.push("chain_rewind");
  }

  if (lifetimeBeats > 0 && beatRateOk) {
    const beatScore = Math.min(
      300,
      Math.round(Math.log10(lifetimeBeats + 1) * 50),
    );
    score += beatScore;
  }

  const sensors =
    payload.sensors && typeof payload.sensors === "object"
      ? payload.sensors
      : null;
  if (sensors) {
    let sensorScore = 50;
    const { lux, motionRms, pressureHpa } = sensors;

    if (typeof lux === "number") {
      if (lux < 0 || lux > 200_000) tamperFlags.push("lux_implausible");
      else sensorScore += 50;
    }
    if (typeof motionRms === "number") {
      if (motionRms < 0 || motionRms > 50)
        tamperFlags.push("motion_implausible");
      else sensorScore += 50;
    }
    if (typeof pressureHpa === "number") {
      if (pressureHpa < 800 || pressureHpa > 1100)
        tamperFlags.push("pressure_implausible");
      else sensorScore += 50;
    }
    score += sensorScore;
  }

  if (tamperFlags.length > 0) score = Math.min(score, 199);
  score = Math.max(0, Math.min(1000, score));

  let scoreBand;
  if (tamperFlags.length > 0) scoreBand = "TAMPERED";
  else if (score < 500) scoreBand = "NEW";
  else if (score < 750) scoreBand = "STANDING";
  else if (score < 900) scoreBand = "STRONG";
  else scoreBand = "PREMIER";

  return { genesisScore: score, scoreBand, tamperFlags };
}

const dayMs = 86_400_000;
const now = Date.now();

const cases = [
  // Baseline v1.0 cases (still pass after v1.1 hardening)
  {
    name: "Brand new node, no beats, no sensors",
    payload: { firstBeatTs: now - 100, issuedAt: now, lifetimeBeats: 0 },
    bureauContext: null,
    expect: "NEW",
  },
  {
    name: "9-day node, 25k beats, full sensors, never seen by bureau",
    payload: {
      firstBeatTs: now - 9 * dayMs,
      issuedAt: now,
      lifetimeBeats: 25_847,
      sensors: { lux: 412, motionRms: 0.06, pressureHpa: 1014.07 },
    },
    bureauContext: null, // first time bureau sees it → first-seen = now
    expect: "TAMPERED", // 25k beats in 0 observed time = implausible rate
  },
  {
    name: "9-day node, 25k beats, full sensors, bureau saw it 9 days ago",
    payload: {
      firstBeatTs: now - 9 * dayMs,
      issuedAt: now,
      lifetimeBeats: 25_847,
      sensors: { lux: 412, motionRms: 0.06, pressureHpa: 1014.07 },
    },
    bureauContext: {
      firstSeenMs: now - 9 * dayMs,
      peakLifetimeBeats: 24_000,
    },
    expect: "STANDING",
  },
  {
    name: "365-day node, 1M beats, bureau saw it 365 days ago",
    payload: {
      firstBeatTs: now - 365 * dayMs,
      issuedAt: now,
      lifetimeBeats: 1_000_000, // ~1 beat / 31s — within 25s threshold
      sensors: { lux: 5000, motionRms: 0.3, pressureHpa: 1015 },
    },
    bureauContext: {
      firstSeenMs: now - 365 * dayMs,
      peakLifetimeBeats: 999_000,
    },
    expect: "PREMIER",
  },
  {
    name: "100-day node, 250k beats, bureau saw it 100 days ago",
    payload: {
      firstBeatTs: now - 100 * dayMs,
      issuedAt: now,
      lifetimeBeats: 250_000,
      sensors: { lux: 800, motionRms: 0.12, pressureHpa: 1010 },
    },
    bureauContext: {
      firstSeenMs: now - 100 * dayMs,
      peakLifetimeBeats: 249_000,
    },
    expect: "STRONG",
  },
  {
    name: "Tampered: negative pressure",
    payload: {
      firstBeatTs: now - 90 * dayMs,
      issuedAt: now,
      lifetimeBeats: 50_000,
      sensors: { lux: 400, motionRms: 0.1, pressureHpa: -50 },
    },
    bureauContext: { firstSeenMs: now - 90 * dayMs, peakLifetimeBeats: 0 },
    expect: "TAMPERED",
  },

  // ── v1.1 hardening ─────────────────────────────────────────────────────────
  {
    name: "ATTACK: fresh keypair claims firstBeatTs 6 months ago, no beats",
    payload: {
      firstBeatTs: now - 180 * dayMs,
      issuedAt: now,
      lifetimeBeats: 0,
    },
    bureauContext: null, // first time bureau sees it
    expect: "NEW", // age clamped to bureau-first-seen → 0 days credit
  },
  {
    name: "ATTACK: fresh keypair claims 1M beats and 6mo age (impossible rate)",
    payload: {
      firstBeatTs: now - 180 * dayMs,
      issuedAt: now,
      lifetimeBeats: 1_000_000,
      sensors: { lux: 400, motionRms: 0.1, pressureHpa: 1014 },
    },
    bureauContext: null, // bureau hasn't seen it → observed window = 0ms
    expect: "TAMPERED", // beat_rate_implausible
  },
  {
    name: "ATTACK: chain rewind — claims fewer beats than bureau previously saw",
    payload: {
      firstBeatTs: now - 30 * dayMs,
      issuedAt: now,
      lifetimeBeats: 50_000, // claim 50k now
      sensors: { lux: 400, motionRms: 0.1, pressureHpa: 1014 },
    },
    bureauContext: {
      firstSeenMs: now - 30 * dayMs,
      peakLifetimeBeats: 100_000, // bureau previously saw 100k
    },
    expect: "TAMPERED", // chain_rewind
  },
  {
    name: "Honest re-verification — same beats as last time",
    payload: {
      firstBeatTs: now - 30 * dayMs,
      issuedAt: now,
      lifetimeBeats: 100_000,
      sensors: { lux: 400, motionRms: 0.1, pressureHpa: 1014 },
    },
    bureauContext: {
      firstSeenMs: now - 30 * dayMs,
      peakLifetimeBeats: 100_000, // matches, no rewind
    },
    expect: "STANDING", // 30 days too young to hit STRONG; still clean
  },
];

let passes = 0;
for (const c of cases) {
  const out = computeGenesisScoreV1(c.payload, c.bureauContext);
  const ok = out.scoreBand === c.expect;
  console.log(
    `${ok ? "PASS" : "FAIL"}  ${c.name}\n  -> score=${out.genesisScore} band=${out.scoreBand} (expected ${c.expect}) flags=${JSON.stringify(out.tamperFlags)}`,
  );
  if (ok) passes++;
}

console.log(`\n${passes}/${cases.length} cases pass.`);
process.exit(passes === cases.length ? 0 : 1);
