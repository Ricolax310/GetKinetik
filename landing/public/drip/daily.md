# DePIN Signal Brief — 2026-07-04

> 2026-07-04 · machine-driven signal publication · evidence first

## Today's Read

• WeatherXM over-capacity cells declined from 290 to 289.
• Geodnet duplicate-coordinate groups unchanged at 9.
• Hivemapper visible HONEY concentration remains near 49% of visible supply.

## Why It Matters

Today's signals show modest movement in registry, capacity, and concentration metrics. Telemetry and concentration readings are largely unchanged.
The observed changes are incremental rather than structural and remain reproducible from public data sources.
Observations span 5 networks — no single network dominates the index.

## Full Evidence

### What Changed Today

- **Geodnet** — entities on public map: 19,564 (-9 (-0.0%))
- **WeatherXM** — cells over designed capacity: 289 (-1 (-0.3%))
- **Hivemapper** — 49.04% of UI-reported HONEY sits in the top 20 visible SPL accounts (Solana RPC cap) — economic *shape* for treasury/MM review, not a contributor GPS read.

### Signal Type

- **Geodnet** — Registry duplication (`duplication_cluster`)
- **WeatherXM** — Capacity pressure (`capacity_violation`)
- **Hivemapper** — Economic concentration (`economic_concentration`)

### Signal Context

- Geodnet: duplicate or inconsistent registry entries are review-able from public data alone.
- WeatherXM: public cell capacity counts are a reproducible registry-pressure signal.
- Hivemapper: visible on-chain concentration is economic shape only — useful for custody reconciliation, not device claims.

### What We Don't Know

- **Geodnet** — Whether shared coordinates are legitimate co-located installs, shared-mount sites, or registry artifacts — public data can't tell without operator confirmation.
- **WeatherXM** — Whether over-capacity cells reflect real device density, registry double-counting, or expected reward-zone behavior — only the operator's internal registry settles it.
- **Hivemapper** — Whether the largest visible accounts are treasury, market-maker, exchange custody, or operators — on-chain shape doesn't label holder intent.

### Questions Worth Asking

- On the public cells view, do over-capacity H3 counts match your internal registry and rewards model?
- For stations sharing an exact coordinate pair on the public registry, is that expected registration behavior or a dedupe gap worth reconciling?
- Do the largest visible SPL accounts map to known treasury or market-maker custody labels on your side?
- Does the public read for DIMO match what your team sees internally, or is the public feed expected to look this way?
- Does the public read for Helium IoT match what your team sees internally, or is the public feed expected to look this way?

### Thread Seed

Public read on Geodnet: 9 exact (lat,lng) duplicate groups on 19,564 public stations — each row in §1 is one coordinate pair your registry team can review today. — does that match your internal view, or is the public feed expected to behave this way?

### Sources & Methodology

- Public signal views: [getkinetik.app/signals](https://getkinetik.app/signals/)
- Reproduce scans: `node scripts/duplication-scan-<network>.mjs` (see each report header)
- **Geodnet:** `docs/reports/geodnet-duplication-report.md` · https://rtk.geodnet.com/api/v2/coverage_stations
- **WeatherXM:** `docs/reports/weatherxm-duplication-report.md` · WeatherXM public cells API
- **Hivemapper:** `docs/reports/hivemapper-duplication-report.md` · Solana mainnet HONEY SPL mint (public RPC)
