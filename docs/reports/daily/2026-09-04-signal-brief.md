# Daily Signal Brief

> 2026-09-04 · derived from public audit snapshots only. Signals → report (not narrative-first).

## Today's Read

• Geodnet duplicate-coordinate groups rose from 1,006 to 1,008.
• Hivemapper visible HONEY concentration remains near 51% of visible supply.
• WeatherXM: 294 cells exceed designed capacity — §1 lists H3 indices + map centers for your ops queue.

## Why It Matters

Today's signals show modest movement in infrastructure metrics. Telemetry and concentration readings are largely unchanged.
The observed changes are incremental rather than structural and remain reproducible from public data sources.
Observations span 3 networks — no single network dominates the index.

## Full Evidence

### What Changed Today

- **Geodnet** — exact (lat,lng) duplicate groups: 1,008 (+2 (+0.2%))
- **Hivemapper** — top-20 SPL share of UI supply: 51.21% (+0.32 pp (+0.6%))
- **WeatherXM** — 294 cells exceed designed capacity — §1 lists H3 indices + map centers for your ops queue.

### Signal Type

- **Geodnet** — Registry duplication (`duplication_cluster`)
- **Hivemapper** — Economic concentration (`economic_concentration`)
- **WeatherXM** — Capacity pressure (`capacity_violation`)

### Signal Context

- Geodnet: duplicate or inconsistent registry entries are grep-able from public data alone.
- Hivemapper: visible on-chain concentration is economic shape only — useful for custody reconciliation, not device claims.
- WeatherXM: public cell capacity counts are a reproducible registry-pressure signal.

### What We Don't Know

- **Geodnet** — Whether shared coordinates are legitimate co-located installs, shared-mount sites, or registry artifacts — public data can't tell without operator confirmation.
- **Hivemapper** — Whether the largest visible accounts are treasury, market-maker, exchange custody, or operators — on-chain shape doesn't label holder intent.
- **WeatherXM** — Whether over-capacity cells reflect real device density, registry double-counting, or expected reward-zone behavior — only the operator's internal registry settles it.

### Questions Worth Asking

- On the public cells view, do over-capacity H3 counts match your internal registry and rewards model?
- For stations sharing an exact coordinate pair on the public registry, is that expected registration behavior or a dedupe gap worth reconciling?
- Do the largest visible SPL accounts map to known treasury or market-maker custody labels on your side?
- Does the public read for DIMO match what your team sees internally, or is the public feed expected to look this way?
- Does the public read for Helium IoT match what your team sees internally, or is the public feed expected to look this way?

### Thread Seed

Public read on Geodnet: 1006 exact (lat,lng) duplicate groups on 19,478 public stations — each row in §1 is one coordinate pair your registry team can grep today. — does that match your internal view, or is the public feed expected to behave this way?

### Sources & Methodology

- Public signal views: [getkinetik.app/signals](https://getkinetik.app/signals/)
- Reproduce scans: `node scripts/sybil-scan-<network>.mjs` (see each report header)
- **Geodnet:** `docs/reports/geodnet-sybil-report.md` · https://rtk.geodnet.com/api/v2/coverage_stations
- **Hivemapper:** `docs/reports/hivemapper-sybil-report.md` · Solana mainnet HONEY SPL mint (public RPC)
- **WeatherXM:** `docs/reports/weatherxm-sybil-report.md` · WeatherXM public cells API
