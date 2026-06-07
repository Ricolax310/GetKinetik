# DePIN Signal Brief — 2026-06-07

> 2026-06-07 · machine-driven signal publication · evidence first

## Today's Read

• Geodnet duplicate-coordinate groups rose from 8 to 11.
• WeatherXM over-capacity cells declined from 289 to 288.
• Geodnet entities on public map declined from 19,676 to 19,616.
• Nodle duplicate-coordinate groups unchanged at 15.
• Dawn Network duplicate-coordinate groups unchanged at 15.
• Grass / Titan duplicate-coordinate groups unchanged at 0.

## Why It Matters

Today's signals show modest movement in registry, capacity, and concentration metrics. Telemetry and concentration readings are largely unchanged.
The observed changes are incremental rather than structural and remain reproducible from public data sources.
Observations span 6 networks — no single network dominates the index.

## Full Evidence

### What Changed Today

- **Natix Network** — top-20 SPL share of UI supply: 72.39% (-0.00 pp (-0.0%))
- **Natix Network** — days detections at zero: 33 (+1 (+3.1%))
- **Natix Network** — registered drivers: 271,401 (+1 (+0.0%))
- **Nodle** — exact (lat,lng) duplicate groups: 15 (_(first snapshot — baseline recorded)_)
- **Nodle** — entities on public map: 65 (_(first snapshot — baseline recorded)_)
- **Nodle** — fleet share flagged (any heuristic): 38.46% (_(first snapshot — baseline recorded)_)
- **Dawn Network** — exact (lat,lng) duplicate groups: 15 (_(first snapshot — baseline recorded)_)
- **Dawn Network** — entities on public map: 55 (_(first snapshot — baseline recorded)_)
- **Dawn Network** — fleet share flagged (any heuristic): 45.45% (_(first snapshot — baseline recorded)_)
- **Grass / Titan** — exact (lat,lng) duplicate groups: 0 (_(first snapshot — baseline recorded)_)
- **Grass / Titan** — entities on public map: 200 (_(first snapshot — baseline recorded)_)
- **Grass / Titan** — fleet share flagged (any heuristic): 45.00% (_(first snapshot — baseline recorded)_)
- **WeatherXM** — 288 cells exceed designed capacity — §1 lists H3 indices + map centers for your review queue.
- **Geodnet** — 10 exact (lat,lng) duplicate groups on 19,612 public stations — each row in §1 is one coordinate pair your registry team can review today.
- **Hivemapper** — 49.13% of UI-reported HONEY sits in the top 20 visible SPL accounts (Solana RPC cap) — economic *shape* for treasury/MM review, not a contributor GPS read.

### Signal Type

- **Natix Network** — Telemetry discontinuity (`telemetry_discontinuity`)
- **Nodle** — Identity collision (`identity_collision`)
- **Dawn Network** — Identity collision (`identity_collision`)
- **Grass / Titan** — Uncategorized public observation (`scaffold`)
- **WeatherXM** — Capacity pressure (`capacity_violation`)
- **Geodnet** — Registry duplication (`duplication_cluster`)
- **Hivemapper** — Economic concentration (`economic_concentration`)

### Signal Context

- Natix Network: cumulative public metrics flatlined while other counters moved — worth a sanity-check on the feed.
- Nodle: duplicate or inconsistent registry entries are review-able from public data alone.
- Dawn Network: duplicate or inconsistent registry entries are review-able from public data alone.
- Grass / Titan: measurable public-data delta worth cross-checking with internal ops.
- WeatherXM: public cell capacity counts are a reproducible registry-pressure signal.
- Geodnet: duplicate or inconsistent registry entries are review-able from public data alone.
- Hivemapper: visible on-chain concentration is economic shape only — useful for custody reconciliation, not device claims.

### What We Don't Know

- **Natix Network** — Whether the flat cumulative metric is an ETL/display freeze on the public feed or a real change in on-the-ground activity — the public endpoint alone can't say.
- **Nodle** — Whether colliding identifiers are distinct physical devices or one identity reused — public maps don't expose device-level attestation.
- **Dawn Network** — Whether colliding identifiers are distinct physical devices or one identity reused — public maps don't expose device-level attestation.
- **Grass / Titan** — What the public feed cannot disambiguate without operator confirmation.
- **WeatherXM** — Whether over-capacity cells reflect real device density, registry double-counting, or expected reward-zone behavior — only the operator's internal registry settles it.
- **Geodnet** — Whether shared coordinates are legitimate co-located installs, shared-mount sites, or registry artifacts — public data can't tell without operator confirmation.
- **Hivemapper** — Whether the largest visible accounts are treasury, market-maker, exchange custody, or operators — on-chain shape doesn't label holder intent.

### Questions Worth Asking

- On the public cells view, do over-capacity H3 counts match your internal registry and rewards model?
- For stations sharing an exact coordinate pair on the public registry, is that expected registration behavior or a dedupe gap worth reconciling?
- Is the public Coverage Map metrics feed expected to show flat KM mapped / zero detections while driver registrations keep rising?
- Do the largest visible SPL accounts map to known treasury or market-maker custody labels on your side?
- Does the public read for Nodle match what your team sees internally, or is the public feed expected to look this way?

### Thread Seed

Public read on WeatherXM: 288 cells exceed designed capacity — §1 lists H3 indices + map centers for your review queue. — does that match your internal view, or is the public feed expected to behave this way?

### Sources & Methodology

- Public signal views: [getkinetik.app/signals](https://getkinetik.app/signals/)
- Reproduce scans: `node scripts/duplication-scan-<network>.mjs` (see each report header)
- **Natix Network:** `docs/reports/natix-duplication-report.md` · Natix Coverage Map metrics feed (coverage.natix.network/coverage/v1/metrics) + Solana NATIX SPL mint
- **Nodle:** `docs/reports/nodle-duplication-report.md` · Nodle public scan inputs (see script header)
- **Dawn Network:** `docs/reports/dawn-duplication-report.md` · Dawn public scan inputs (see script header)
- **Grass / Titan:** `docs/reports/grass-duplication-report.md` · Grass/Titan public scan inputs (see script header)
- **WeatherXM:** `docs/reports/weatherxm-duplication-report.md` · WeatherXM public cells API
- **Geodnet:** `docs/reports/geodnet-duplication-report.md` · https://rtk.geodnet.com/api/v2/coverage_stations
- **Hivemapper:** `docs/reports/hivemapper-duplication-report.md` · Solana mainnet HONEY SPL mint (public RPC)
