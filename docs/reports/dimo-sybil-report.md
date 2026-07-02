# Sybil Risk Scan — DIMO Network

> Independent public read by the GETKINETIK Bureau using only DIMO's public Identity GraphQL API. **No internal DIMO data was used.** A DIMO *vehicle* is an on-chain identity; it only produces real telemetry when connected to a device — either an *aftermarket device* (physical hardware) or a *synthetic device* (software/API connection). This read reports composition, not allegations: software connections and freshly-minted vehicles are legitimate, but the gap between identities and connected hardware is a fair question to ask from public data.

- **As of:** 2026-07-02
- **Public source:** `https://identity-api.dimo.zone/query` (GraphQL, no auth)
- **Vehicle identities:** 158,173
- **Physical hardware devices (aftermarket):** 40,622 (25.7%)
- **Software/synthetic devices:** 31,410 (19.9%)
- **Vehicle identities with no connected device:** 86,141 (54.5%)

---

## Executive summary

1. **Of 158,173 DIMO vehicle identities, 40,622 (25.7%) are backed by physical hardware**; 31,410 (19.9%) connect via software/synthetic devices, and 86,141 (54.5%) show no connected device on the public registry.
2. **Only 45.5% of vehicle identities have any connected device** (hardware or software) on the public registry — the rest are minted identities without an active device link.
3. This is *composition*, not fraud: synthetic (software) connections and recently-minted vehicles awaiting setup are expected. The neutral question is how many reward-eligible identities map to real, active devices — answerable from public data alone.

---

## Since last snapshot

| Metric | This run | vs last run |
|---|---:|---|
| Vehicle identities minted | 158,173 | +5 (+0.0%) |
| Physical hardware devices | 40,622 | unchanged vs last run |
| Software/synthetic devices | 31,410 | +1 (+0.0%) |
| Share backed by hardware | 25.68% | -0.00 pp (-0.0%) |
| Share with no connected device | 54.46% | +0.00 pp (+0.0%) |


## 1. Device-backing composition

| Layer | Count | Share of vehicle identities |
|---|---:|---:|
| Vehicle identities (on-chain) | 158,173 | 100% |
| Physical hardware (aftermarket devices) | 40,622 | 25.7% |
| Software / synthetic devices | 31,410 | 19.9% |
| Any connected device | 72,032 | 45.5% |
| No connected device on registry | 86,141 | 54.5% |

## Methodology

- All four counts come from DIMO's public Identity GraphQL API (`vehicles`, `aftermarketDevices`, `syntheticDevices` connection `totalCount` fields). No API key, no internal data.
- `aftermarketDevices` are physical hardware dongles; `syntheticDevices` are software/API connections (e.g. an automaker cloud link). "No connected device" = vehicle identities minus both device classes; some are legitimately mid-onboarding.
- Reproduce: `node scripts/sybil-scan-dimo.mjs` — same public endpoint. The counts are point-in-time and move as vehicles/devices are minted.

## What to cross-check this week

1. Confirm how many vehicle identities are expected to exist without an active device (pre-onboarding, churned, or deregistered) vs. counted as active.
2. Cross-check whether reward eligibility requires an active device link, and how the registry treats long-idle identities.
3. Reproduce the counts from the public Identity API and compare against internal active-device tallies.

> Public-data read. Re-run: script in `scripts/`, source URL in report header.

---


For an authoritative per-device GETKINETIK grade (hardware-rooted signature, chain age, tamper flags), the network or operator can POST a Proof of Origin to `https://getkinetik.app/api/verify-device`.

Contact: **eric@outfromnothingllc.com** · https://getkinetik.app/bureau/ · https://getkinetik.app/api/docs/