# Daily Signal Brief

> 2026-06-11 · derived from public audit snapshots only. Signals → report (not narrative-first).

## Today's Read

• WeatherXM over-capacity cells rose from 286 to 290.
• Geodnet entities on public map declined from 19,604 to 19,595.
• WeatherXM entities on public map declined from 8,498 to 8,495.

## Why It Matters

Today's signals show modest movement in infrastructure metrics. Telemetry and concentration readings are largely unchanged.
The observed changes are incremental rather than structural and remain reproducible from public data sources.
Observations span 4 networks — no single network dominates the index.

## Full Evidence

### What Changed Today

- **Geodnet** — entities on public map: 19,595 (-9 (-0.0%))
- **WeatherXM** — entities on public map: 8,495 (-3 (-0.0%))
- **WeatherXM** — cells over designed capacity: 290 (+4 (+1.4%))
- **WeatherXM** — share of map over capacity: 3.41% (+0.05 pp (+1.4%))
- **Hivemapper** — top-20 SPL share of UI supply: 49.21% (+0.01 pp (+0.0%))
- **Helium Mobile** — fleet share flagged (any heuristic): 20.57% (-0.00 pp (-0.0%))

### Signal Type

- **Geodnet** — Registry duplication (`duplication_cluster`)
- **WeatherXM** — Capacity pressure (`capacity_violation`)
- **Hivemapper** — Economic concentration (`economic_concentration`)
- **Helium Mobile** — Registry duplication (`duplication_cluster`)

### Signal Context

- Geodnet: duplicate or inconsistent registry entries are grep-able from public data alone.
- WeatherXM: public cell capacity counts are a reproducible registry-pressure signal.
- Hivemapper: visible on-chain concentration is economic shape only — useful for custody reconciliation, not device claims.
- Helium Mobile: duplicate or inconsistent registry entries are grep-able from public data alone.

### What We Don't Know

- **Geodnet** — Whether shared coordinates are legitimate co-located installs, shared-mount sites, or registry artifacts — public data can't tell without operator confirmation.
- **WeatherXM** — Whether over-capacity cells reflect real device density, registry double-counting, or expected reward-zone behavior — only the operator's internal registry settles it.
- **Hivemapper** — Whether the largest visible accounts are treasury, market-maker, exchange custody, or operators — on-chain shape doesn't label holder intent.
- **Helium Mobile** — Whether shared coordinates are legitimate co-located installs, shared-mount sites, or registry artifacts — public data can't tell without operator confirmation.

### Questions Worth Asking

- On the public cells view, do over-capacity H3 counts match your internal registry and rewards model?
- For stations sharing an exact coordinate pair on the public registry, is that expected registration behavior or a dedupe gap worth reconciling?
- Do the largest visible SPL accounts map to known treasury or market-maker custody labels on your side?
- Does the public read for Helium IoT match what your team sees internally, or is the public feed expected to look this way?
- Does the public read for Helium Mobile match what your team sees internally, or is the public feed expected to look this way?

### Thread Seed

Public read on Geodnet: 8 exact (lat,lng) duplicate groups on 19,595 public stations — each row in §1 is one coordinate pair — does that match your internal view, or is the public feed expected to behave this way?

### Sources & Methodology

- Public signal views: [getkinetik.app/signals](https://getkinetik.app/signals/)
- Reproduce scans: `node scripts/sybil-scan-<network>.mjs` (see each report header)
- **Geodnet:** `docs/reports/geodnet-sybil-report.md` · https://rtk.geodnet.com/api/v2/coverage_stations
- **WeatherXM:** `docs/reports/weatherxm-sybil-report.md` · WeatherXM public cells API
- **Hivemapper:** `docs/reports/hivemapper-sybil-report.md` · Solana mainnet HONEY SPL mint (public RPC)
- **Helium Mobile:** `docs/reports/helium-mobile-sybil-report.md` · https://entities.nft.helium.io/v2/hotspots?subnetwork=mobile
