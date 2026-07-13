# DePIN Signal Brief — 2026-07-13

> 2026-07-13 · machine-driven signal publication · evidence first

## Today's Read

• Geodnet duplicate-coordinate groups unchanged at 10.
• WeatherXM over-capacity cells unchanged at 289.
• Geodnet entities on public map declined from 19,569 to 19,560.

## Why It Matters

Today's signals show modest movement in registry, capacity, and concentration metrics. Telemetry and concentration readings are largely unchanged.
The observed changes are incremental rather than structural and remain reproducible from public data sources.
Observations span 5 networks — no single network dominates the index.

## Full Evidence

### What Changed Today

- **Geodnet** — entities on public map: 19,560 (-9 (-0.0%))
- **DIMO** — entities on public map: 158,252 (+13 (+0.0%))
- **WeatherXM** — 289 cells exceed designed capacity — §1 lists H3 indices + map centers for your review queue.
- **Hivemapper** — 50.60% of UI-reported HONEY sits in the top 20 visible SPL accounts (Solana RPC cap) — economic *shape* for treasury/MM review, not a contributor GPS read.

### Signal Type

- **Geodnet** — Registry duplication (`duplication_cluster`)
- **DIMO** — Uncategorized public observation (`device_backing_gap`)
- **WeatherXM** — Capacity pressure (`capacity_violation`)
- **Hivemapper** — Economic concentration (`economic_concentration`)

### Signal Context

- Geodnet: duplicate or inconsistent registry entries are review-able from public data alone.
- DIMO: measurable public-data delta worth cross-checking with internal ops.
- WeatherXM: public cell capacity counts are a reproducible registry-pressure signal.
- Hivemapper: visible on-chain concentration is economic shape only — useful for custody reconciliation, not device claims.

### What We Don't Know

- **Geodnet** — Whether shared coordinates are legitimate co-located installs, shared-mount sites, or registry artifacts — public data can't tell without operator confirmation.
- **DIMO** — What the public feed cannot disambiguate without operator confirmation.
- **WeatherXM** — Whether over-capacity cells reflect real device density, registry double-counting, or expected reward-zone behavior — only the operator's internal registry settles it.
- **Hivemapper** — Whether the largest visible accounts are treasury, market-maker, exchange custody, or operators — on-chain shape doesn't label holder intent.

### Questions Worth Asking

- On the public cells view, do over-capacity H3 counts match your internal registry and rewards model?
- For stations sharing an exact coordinate pair on the public registry, is that expected registration behavior or a dedupe gap worth reconciling?
- Do the largest visible SPL accounts map to known treasury or market-maker custody labels on your side?
- Does the public read for DIMO match what your team sees internally, or is the public feed expected to look this way?
- Does the public read for Helium IoT match what your team sees internally, or is the public feed expected to look this way?

### Thread Seed

Public read on Geodnet: 10 exact (lat,lng) duplicate groups on 19,560 public stations — each row in §1 is one coordinate pair your registry team can review today. — does that match your internal view, or is the public feed expected to behave this way?

### Sources & Methodology

- Public signal views: [getkinetik.app/signals](https://getkinetik.app/signals/)
- Reproduce scans: `node scripts/duplication-scan-<network>.mjs` (see each report header)
- **Geodnet:** `docs/reports/geodnet-duplication-report.md` · https://rtk.geodnet.com/api/v2/coverage_stations
- **DIMO:** `docs/reports/dimo-duplication-report.md` · https://identity-api.dimo.zone/query
- **WeatherXM:** `docs/reports/weatherxm-duplication-report.md` · WeatherXM public cells API
- **Hivemapper:** `docs/reports/hivemapper-duplication-report.md` · Solana mainnet HONEY SPL mint (public RPC)
