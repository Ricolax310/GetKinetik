# Daily Signal Brief

> 2026-08-31 · derived from public audit snapshots only. Signals → report (not narrative-first).

## Today's Read

• WeatherXM over-capacity cells rose from 290 to 291.
• Hivemapper visible HONEY concentration remains near 51% of visible supply.
• Geodnet: 1002 exact (lat,lng) duplicate groups on 19,479 public stations — each row in §1 is one coordinate pair your registry team can grep today.

## Why It Matters

Today's signals show modest movement in infrastructure metrics. Telemetry and concentration readings are largely unchanged.
The observed changes are incremental rather than structural and remain reproducible from public data sources.
Observations span 3 networks — no single network dominates the index.

## Full Evidence

### What Changed Today

- **WeatherXM** — cells over designed capacity: 291 (+1 (+0.3%))
- **Hivemapper** — top-20 SPL share of UI supply: 51.27% (+0.38 pp (+0.8%))
- **Geodnet** — 1002 exact (lat,lng) duplicate groups on 19,479 public stations — each row in §1 is one coordinate pair your registry team can grep today.

### Signal Type

- **WeatherXM** — Capacity pressure (`capacity_violation`)
- **Hivemapper** — Economic concentration (`economic_concentration`)
- **Geodnet** — Registry duplication (`duplication_cluster`)

### Signal Context

- WeatherXM: public cell capacity counts are a reproducible registry-pressure signal.
- Hivemapper: visible on-chain concentration is economic shape only — useful for custody reconciliation, not device claims.
- Geodnet: duplicate or inconsistent registry entries are grep-able from public data alone.

### What We Don't Know

- **WeatherXM** — Whether over-capacity cells reflect real device density, registry double-counting, or expected reward-zone behavior — only the operator's internal registry settles it.
- **Hivemapper** — Whether the largest visible accounts are treasury, market-maker, exchange custody, or operators — on-chain shape doesn't label holder intent.
- **Geodnet** — Whether shared coordinates are legitimate co-located installs, shared-mount sites, or registry artifacts — public data can't tell without operator confirmation.

### Questions Worth Asking

- On the public cells view, do over-capacity H3 counts match your internal registry and rewards model?
- For stations sharing an exact coordinate pair on the public registry, is that expected registration behavior or a dedupe gap worth reconciling?
- Do the largest visible SPL accounts map to known treasury or market-maker custody labels on your side?
- Does the public read for DIMO match what your team sees internally, or is the public feed expected to look this way?
- Does the public read for Helium IoT match what your team sees internally, or is the public feed expected to look this way?

### Thread Seed

Public read on Geodnet: 1002 exact (lat,lng) duplicate groups on 19,477 public stations — each row in §1 is one coordinate pair your registry team can grep today. — does that match your internal view, or is the public feed expected to behave this way?

### Sources & Methodology

- Public signal views: [getkinetik.app/signals](https://getkinetik.app/signals/)
- Reproduce scans: `node scripts/sybil-scan-<network>.mjs` (see each report header)
- **WeatherXM:** `docs/reports/weatherxm-sybil-report.md` · WeatherXM public cells API
- **Hivemapper:** `docs/reports/hivemapper-sybil-report.md` · Solana mainnet HONEY SPL mint (public RPC)
- **Geodnet:** `docs/reports/geodnet-sybil-report.md` · https://rtk.geodnet.com/api/v2/coverage_stations
