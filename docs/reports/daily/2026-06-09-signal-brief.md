# Daily Signal Brief

> 2026-06-09 · derived from public audit snapshots only. Signals → report (not narrative-first).

## Today's Read

• Dawn Network duplicate-coordinate groups unchanged at 15.
• Geodnet duplicate-coordinate groups rose from 8 to 11.
• Grass / Titan duplicate-coordinate groups unchanged at 0.
• Nodle duplicate-coordinate groups unchanged at 15.
• WeatherXM over-capacity cells declined from 289 to 288.
• Geodnet entities on public map declined from 19,676 to 19,616.

## Why It Matters

Today's signals show modest movement in infrastructure metrics. Telemetry and concentration readings are largely unchanged.
The observed changes are incremental rather than structural and remain reproducible from public data sources.
Observations span 6 networks — no single network dominates the index.

## Full Evidence

### What Changed Today

- **Geodnet** — exact (lat,lng) duplicate groups: 11 (+3 (+37.5%))
- **Geodnet** — entities on public map: 19,616 (-60 (-0.3%))
- **Geodnet** — fleet share flagged (any heuristic): 9.34% (-0.00 pp (-0.0%))
- **WeatherXM** — entities on public map: 8,492 (+3 (+0.0%))
- **WeatherXM** — cells over designed capacity: 288 (-1 (-0.3%))
- **WeatherXM** — share of map over capacity: 3.39% (-0.01 pp (-0.4%))
- **Hivemapper** — top-20 SPL share of UI supply: 49.13% (-0.02 pp (-0.0%))
- **Nodle** — exact (lat,lng) duplicate groups: 15 (_(first snapshot — baseline recorded)_)
- **Nodle** — entities on public map: 65 (_(first snapshot — baseline recorded)_)
- **Nodle** — fleet share flagged (any heuristic): 38.46% (_(first snapshot — baseline recorded)_)
- **Dawn Network** — exact (lat,lng) duplicate groups: 15 (_(first snapshot — baseline recorded)_)
- **Dawn Network** — entities on public map: 55 (_(first snapshot — baseline recorded)_)
- **Dawn Network** — fleet share flagged (any heuristic): 45.45% (_(first snapshot — baseline recorded)_)
- **Grass / Titan** — exact (lat,lng) duplicate groups: 0 (_(first snapshot — baseline recorded)_)
- **Grass / Titan** — entities on public map: 200 (_(first snapshot — baseline recorded)_)
- **Grass / Titan** — fleet share flagged (any heuristic): 45.00% (_(first snapshot — baseline recorded)_)

### Signal Type

- **Geodnet** — Registry duplication (`duplication_cluster`)
- **WeatherXM** — Capacity pressure (`capacity_violation`)
- **Hivemapper** — Economic concentration (`economic_concentration`)
- **Nodle** — Identity collision (`identity_collision`)
- **Dawn Network** — Identity collision (`identity_collision`)
- **Grass / Titan** — Uncategorized public observation (`scaffold`)

### Signal Context

- Geodnet: duplicate or inconsistent registry entries are grep-able from public data alone.
- WeatherXM: public cell capacity counts are a reproducible registry-pressure signal.
- Hivemapper: visible on-chain concentration is economic shape only — useful for custody reconciliation, not device claims.
- Nodle: duplicate or inconsistent registry entries are grep-able from public data alone.
- Dawn Network: duplicate or inconsistent registry entries are grep-able from public data alone.
- Grass / Titan: measurable public-data delta worth cross-checking with internal ops.

### What We Don't Know

- **Geodnet** — Whether shared coordinates are legitimate co-located installs, shared-mount sites, or registry artifacts — public data can't tell without operator confirmation.
- **WeatherXM** — Whether over-capacity cells reflect real device density, registry double-counting, or expected reward-zone behavior — only the operator's internal registry settles it.
- **Hivemapper** — Whether the largest visible accounts are treasury, market-maker, exchange custody, or operators — on-chain shape doesn't label holder intent.
- **Nodle** — Whether colliding identifiers are distinct physical devices or one identity reused — public maps don't expose device-level attestation.
- **Dawn Network** — Whether colliding identifiers are distinct physical devices or one identity reused — public maps don't expose device-level attestation.
- **Grass / Titan** — What the public feed cannot disambiguate without operator confirmation.

### Questions Worth Asking

- On the public cells view, do over-capacity H3 counts match your internal registry and rewards model?
- For stations sharing an exact coordinate pair on the public registry, is that expected registration behavior or a dedupe gap worth reconciling?
- Do the largest visible SPL accounts map to known treasury or market-maker custody labels on your side?
- Does the public read for Nodle match what your team sees internally, or is the public feed expected to look this way?
- Does the public read for Dawn Network match what your team sees internally, or is the public feed expected to look this way?

### Thread Seed

Public read on Geodnet: 11 exact (lat,lng) duplicate groups on 19,616 public stations — each row in §1 is one coordinate pai — does that match your internal view, or is the public feed expected to behave this way?

### Sources & Methodology

- Public signal views: [getkinetik.app/signals](https://getkinetik.app/signals/)
- Reproduce scans: `node scripts/sybil-scan-<network>.mjs` (see each report header)
- **Geodnet:** `docs/reports/geodnet-sybil-report.md` · https://rtk.geodnet.com/api/v2/coverage_stations
- **WeatherXM:** `docs/reports/weatherxm-sybil-report.md` · WeatherXM public cells API
- **Hivemapper:** `docs/reports/hivemapper-sybil-report.md` · Solana mainnet HONEY SPL mint (public RPC)
- **Nodle:** `docs/reports/nodle-sybil-report.md` · Nodle public scan inputs (see script header)
- **Dawn Network:** `docs/reports/dawn-sybil-report.md` · Dawn public scan inputs (see script header)
- **Grass / Titan:** `docs/reports/grass-sybil-report.md` · Grass/Titan public scan inputs (see script header)
