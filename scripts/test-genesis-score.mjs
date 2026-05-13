// ============================================================================
// Local sanity check for the Genesis Score v1 algorithm in verify-device.js.
//
// Mirrors computeGenesisScoreV1 here so we can run it against known payload
// shapes without spinning up the Cloudflare Function. If this file drifts
// from verify-device.js, the API result is the source of truth.
//
// Run: node scripts/test-genesis-score.mjs
// ============================================================================

function computeGenesisScoreV1(payload) {
  let score = 200;
  const tamperFlags = [];

  const firstBeatTs =
    typeof payload.firstBeatTs === "number" ? payload.firstBeatTs : null;
  const referenceTs =
    typeof payload.issuedAt === "number"
      ? payload.issuedAt
      : typeof payload.mintedAt === "number"
        ? payload.mintedAt
        : Date.now();
  if (firstBeatTs !== null && firstBeatTs <= referenceTs) {
    const ageDays = (referenceTs - firstBeatTs) / 86_400_000;
    const ageScore = Math.min(300, Math.round((ageDays / 180) * 300));
    score += Math.max(0, ageScore);
  }

  const lifetimeBeats =
    typeof payload.lifetimeBeats === "number" && payload.lifetimeBeats >= 0
      ? payload.lifetimeBeats
      : 0;
  if (lifetimeBeats > 0) {
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
  {
    name: "Brand new node, no beats, no sensors",
    payload: { firstBeatTs: now - 100, issuedAt: now, lifetimeBeats: 0 },
    expect: "NEW",
  },
  {
    name: "9-day node, 25k beats, full sensors (matches mint-demo-proof.mjs)",
    payload: {
      firstBeatTs: now - 9 * dayMs,
      issuedAt: now,
      lifetimeBeats: 25_847,
      sensors: { lux: 412, motionRms: 0.06, pressureHpa: 1014.07 },
    },
    expect: "STANDING",
  },
  {
    name: "90-day node, 250k beats, full sensors",
    payload: {
      firstBeatTs: now - 90 * dayMs,
      issuedAt: now,
      lifetimeBeats: 250_000,
      sensors: { lux: 800, motionRms: 0.12, pressureHpa: 1010 },
    },
    expect: "STRONG",
  },
  {
    name: "180-day node, 1M beats, full sensors",
    payload: {
      firstBeatTs: now - 180 * dayMs,
      issuedAt: now,
      lifetimeBeats: 1_000_000,
      sensors: { lux: 5000, motionRms: 0.3, pressureHpa: 1015 },
    },
    expect: "PREMIER",
  },
  {
    name: "Tampered: negative pressure",
    payload: {
      firstBeatTs: now - 90 * dayMs,
      issuedAt: now,
      lifetimeBeats: 50_000,
      sensors: { lux: 400, motionRms: 0.1, pressureHpa: -50 },
    },
    expect: "TAMPERED",
  },
];

let passes = 0;
for (const c of cases) {
  const out = computeGenesisScoreV1(c.payload);
  const ok = out.scoreBand === c.expect;
  console.log(
    `${ok ? "PASS" : "FAIL"}  ${c.name}\n  -> score=${out.genesisScore} band=${out.scoreBand} (expected ${c.expect}) flags=${JSON.stringify(out.tamperFlags)}`,
  );
  if (ok) passes++;
}

console.log(`\n${passes}/${cases.length} cases pass.`);
process.exit(passes === cases.length ? 0 : 1);
