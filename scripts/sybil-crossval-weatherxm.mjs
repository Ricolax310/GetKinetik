#!/usr/bin/env node
/**
 * sybil-crossval-weatherxm.mjs
 *
 * Cross-validates GETKINETIK Bureau sybil-flagged devices against
 * WeatherXM's public rewards API (index.weatherxm.com, suggested
 * by @nikil511 / Manolis Nikiforakis on 2026-05-16).
 *
 * For each flagged device:
 *   - Fetches total_rewards and latest base_reward_score
 *   - Classifies as: EARNING | ZEROED | NEVER_EARNED
 *
 * No auth required. Public API only.
 * Usage: node scripts/sybil-crossval-weatherxm.mjs
 */

const BASE = 'https://api.weatherxm.com/api/v1/devices';
const DELAY_MS = 300; // be polite to the API

// Device IDs from weatherxm-sybil-report.md — all flagged with NO_LOCATION_DATA
// or appearing in the top over-capacity cells
const FLAGGED_DEVICES = [
  // Cell 874449b31ffffff — 10 devices, capacity 1, 10.0× — SW Arkansas
  { id: '24d95f90-438d-11ef-8e8d-b55568dc8e66', cell: '874449b31ffffff', pol_reason: 'NO_LOCATION_DATA', qod: 0 },
  { id: '244d9a50-438d-11ef-8e8d-b55568dc8e66', cell: '874449b31ffffff', pol_reason: 'NO_LOCATION_DATA', qod: 0 },
  { id: '25249960-438d-11ef-8e8d-b55568dc8e66', cell: '874449b31ffffff', pol_reason: 'NO_LOCATION_DATA', qod: 0 },
  { id: '34bd5dd0-438d-11ef-8e8d-b55568dc8e66', cell: '874449b31ffffff', pol_reason: 'NO_LOCATION_DATA', qod: 0 },
  { id: '288be040-438d-11ef-8e8d-b55568dc8e66', cell: '874449b31ffffff', pol_reason: 'NO_LOCATION_DATA', qod: 0 },
  { id: '335b35c0-438d-11ef-8e8d-b55568dc8e66', cell: '874449b31ffffff', pol_reason: 'NO_LOCATION_DATA', qod: 0 },
  { id: '30b17280-438d-11ef-8e8d-b55568dc8e66', cell: '874449b31ffffff', pol_reason: 'NO_LOCATION_DATA', qod: 0 },
  { id: '2bbc1190-438d-11ef-8e8d-b55568dc8e66', cell: '874449b31ffffff', pol_reason: 'NO_LOCATION_DATA', qod: 0 },
  { id: '334b7e50-438d-11ef-8e8d-b55568dc8e66', cell: '874449b31ffffff', pol_reason: 'NO_LOCATION_DATA', qod: 0 },
  { id: '3376ad00-438d-11ef-8e8d-b55568dc8e66', cell: '874449b31ffffff', pol_reason: 'NO_LOCATION_DATA', qod: 0 },
  // Cell 8726cdb66ffffff — 10 devices, capacity 1, 10.0× — East Texas
  { id: '2883a2e0-438d-11ef-8e8d-b55568dc8e66', cell: '8726cdb66ffffff', pol_reason: 'NO_LOCATION_DATA', qod: 0 },
  { id: '2515f360-438d-11ef-8e8d-b55568dc8e66', cell: '8726cdb66ffffff', pol_reason: 'NO_LOCATION_DATA', qod: 0 },
  { id: '250f3ca0-438d-11ef-8e8d-b55568dc8e66', cell: '8726cdb66ffffff', pol_reason: 'NO_LOCATION_DATA', qod: 0 },
  { id: '2be0b091-438d-11ef-8e8d-b55568dc8e66', cell: '8726cdb66ffffff', pol_reason: 'NO_LOCATION_DATA', qod: 0 },
  { id: '24355760-438d-11ef-8e8d-b55568dc8e66', cell: '8726cdb66ffffff', pol_reason: 'NO_LOCATION_DATA', qod: 0 },
  { id: '2683db41-438d-11ef-8e8d-b55568dc8e66', cell: '8726cdb66ffffff', pol_reason: 'NO_LOCATION_DATA', qod: 0 },
  { id: '33fe5390-438d-11ef-8e8d-b55568dc8e66', cell: '8726cdb66ffffff', pol_reason: 'NO_LOCATION_DATA', qod: 0 },
  { id: '2e198990-438d-11ef-8e8d-b55568dc8e66', cell: '8726cdb66ffffff', pol_reason: 'NO_LOCATION_DATA', qod: 0 },
  { id: '3359af20-438d-11ef-8e8d-b55568dc8e66', cell: '8726cdb66ffffff', pol_reason: 'NO_LOCATION_DATA', qod: 0 },
  { id: '25eb6bd0-438d-11ef-8e8d-b55568dc8e66', cell: '8726cdb66ffffff', pol_reason: 'NO_LOCATION_DATA', qod: 0 },
  // Cell 872b0e115ffffff — 9 devices, capacity 1, 9.0× — Nova Scotia
  { id: '23bcf310-438d-11ef-8e8d-b55568dc8e66', cell: '872b0e115ffffff', pol_reason: 'NO_LOCATION_DATA', qod: 0 },
  { id: '2409da90-438d-11ef-8e8d-b55568dc8e66', cell: '872b0e115ffffff', pol_reason: 'NO_LOCATION_DATA', qod: 0 },
  { id: '226a3450-438d-11ef-8e8d-b55568dc8e66', cell: '872b0e115ffffff', pol_reason: 'NO_LOCATION_DATA', qod: 0 },
  { id: '3366f590-438d-11ef-8e8d-b55568dc8e66', cell: '872b0e115ffffff', pol_reason: 'NO_LOCATION_DATA', qod: 0 },
  { id: '23f6a0b0-438d-11ef-8e8d-b55568dc8e66', cell: '872b0e115ffffff', pol_reason: 'NO_LOCATION_DATA', qod: 0 },
  { id: '2c414720-438d-11ef-8e8d-b55568dc8e66', cell: '872b0e115ffffff', pol_reason: 'NO_LOCATION_DATA', qod: 0 },
  { id: '2440c910-438d-11ef-8e8d-b55568dc8e66', cell: '872b0e115ffffff', pol_reason: 'NO_LOCATION_DATA', qod: 0 },
  { id: '24176f20-438d-11ef-8e8d-b55568dc8e66', cell: '872b0e115ffffff', pol_reason: 'NO_LOCATION_DATA', qod: 0 },
  { id: '2a6904b0-438d-11ef-8e8d-b55568dc8e66', cell: '872b0e115ffffff', pol_reason: 'NO_LOCATION_DATA', qod: 0 },
];

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function fetchRewards(deviceId) {
  const url = `${BASE}/${deviceId}/rewards`;
  const res = await fetch(url);
  if (!res.ok) return null;
  return res.json();
}

function classify(data) {
  if (!data) return 'API_ERROR';
  const total = data.total_rewards ?? 0;
  const latest = data.latest?.base_reward_score ?? 0;
  if (latest > 0) return 'EARNING';
  if (total > 0) return 'ZEROED';
  return 'NEVER_EARNED';
}

async function main() {
  console.log('# WeatherXM Sybil Cross-Validation');
  console.log(`# Generated: ${new Date().toISOString()}`);
  console.log(`# Suggested by @nikil511 (Manolis Nikiforakis) on 2026-05-16`);
  console.log(`# Source: GETKINETIK Bureau — weatherxm-sybil-report.md flagged devices\n`);

  const results = [];

  for (const device of FLAGGED_DEVICES) {
    const data = await fetchRewards(device.id);
    const status = classify(data);
    const total = data?.total_rewards ?? 0;
    const latestScore = data?.latest?.base_reward_score ?? 0;
    results.push({ ...device, status, total_rewards: total, latest_score: latestScore });
    process.stderr.write(`  ${status.padEnd(12)} ${device.id}  total=${total.toFixed(2)}\n`);
    await sleep(DELAY_MS);
  }

  // Summary
  const earning    = results.filter(r => r.status === 'EARNING');
  const zeroed     = results.filter(r => r.status === 'ZEROED');
  const never      = results.filter(r => r.status === 'NEVER_EARNED');
  const errored    = results.filter(r => r.status === 'API_ERROR');

  const totalHistoric = results.reduce((s, r) => s + r.total_rewards, 0);

  console.log('## Summary\n');
  console.log(`- **Devices queried:** ${results.length}`);
  console.log(`- **Still earning rewards (EARNING):** ${earning.length}`);
  console.log(`- **Previously earned, now zeroed (ZEROED):** ${zeroed.length}`);
  console.log(`- **Never earned (NEVER_EARNED):** ${never.length}`);
  console.log(`- **API errors:** ${errored.length}`);
  console.log(`- **Total historic WXM earned across flagged devices:** ${totalHistoric.toFixed(2)} WXM\n`);

  if (earning.length > 0) {
    console.log('## ⚠️  Devices still earning despite NO_LOCATION_DATA flag\n');
    console.log('| Device ID | Cell | Total WXM | Latest score |');
    console.log('|---|---|---:|---:|');
    for (const r of earning) {
      console.log(`| \`${r.id}\` | \`${r.cell}\` | ${r.total_rewards.toFixed(2)} | ${r.latest_score} |`);
    }
    console.log();
  }

  if (zeroed.length > 0) {
    console.log('## ✅  Devices previously earning, now zeroed (WXM pipeline working)\n');
    console.log('| Device ID | Cell | Total WXM earned (historic) |');
    console.log('|---|---|---:|');
    for (const r of zeroed) {
      console.log(`| \`${r.id}\` | \`${r.cell}\` | ${r.total_rewards.toFixed(2)} |`);
    }
    console.log();
  }

  console.log('## Interpretation\n');
  if (earning.length > 0) {
    console.log(`**${earning.length} flagged device(s) are still receiving rewards** — WXM's pipeline has not yet zeroed them despite the NO_LOCATION_DATA flag.`);
  } else {
    console.log('WXM\'s reward pipeline has correctly zeroed all flagged devices — no flagged device is currently earning.');
  }
  console.log(`\nHowever, **all ${zeroed.length + never.length + earning.length} flagged devices remain registered** and still count toward cell capacity. The over-capacity signal is a registration-layer issue, not just a reward-layer issue.\n`);
  console.log('For hardware-rooted per-device attestation, POST a Proof of Origin URL to `https://getkinetik.app/api/verify-device`.');
  console.log('\nContact: eric@outfromnothingllc.com · https://getkinetik.app/bureau/');
}

main().catch(console.error);
