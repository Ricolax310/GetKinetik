# DePIN Signal Brief — 2026-06-13

> 2026-06-13 · machine-driven signal publication · evidence first

## Today's Read

• Geodnet duplicate-coordinate groups declined from 10 to 8.
• WeatherXM over-capacity cells rose from 287 to 289.
• Geodnet entities on public map rose from 19,597 to 19,614.

## Why It Matters

Today's signals show modest movement in registry, capacity, and concentration metrics. Telemetry and concentration readings are largely unchanged.
The observed changes are incremental rather than structural and remain reproducible from public data sources.
Observations span 5 networks — no single network dominates the index.

## Full Evidence

### What Changed Today

- **Geodnet** — exact (lat,lng) duplicate groups: 8 (-2 (-20.0%))
- **Geodnet** — entities on public map: 19,614 (+17 (+0.1%))
- **Geodnet** — fleet share flagged (any heuristic): 9.27% (-0.04 pp (-0.4%))
- **WeatherXM** — entities on public map: 8,497 (+3 (+0.0%))
- **WeatherXM** — cells over designed capacity: 289 (+2 (+0.7%))
- **WeatherXM** — share of map over capacity: 3.40% (+0.02 pp (+0.7%))
- **Hivemapper** — top-20 SPL share of UI supply: 49.20% (-0.01 pp (-0.0%))
- **Helium IoT** — entities on public map: 1,008,023 (+1 (+0.0%))
- **Helium IoT** — fleet share flagged (any heuristic): 6.91% (-0.00 pp (-0.0%))
- **Helium Mobile** — entities on public map: 54,689 (+1 (+0.0%))
- **Helium Mobile** — fleet share flagged (any heuristic): 20.57% (-0.00 pp (-0.0%))

### Signal Type

- **Geodnet** — Registry duplication (`duplication_cluster`)
- **WeatherXM** — Capacity pressure (`capacity_violation`)
- **Hivemapper** — Economic concentration (`economic_concentration`)
- **Helium IoT** — Registry duplication (`duplication_cluster`)
- **Helium Mobile** — Registry duplication (`duplication_cluster`)

### Signal Context

- Geodnet: duplicate or inconsistent registry entries are review-able from public data alone.
- WeatherXM: public cell capacity counts are a reproducible registry-pressure signal.
- Hivemapper: visible on-chain concentration is economic shape only — useful for custody reconciliation, not device claims.
- Helium IoT: duplicate or inconsistent registry entries are review-able from public data alone.
- Helium Mobile: duplicate or inconsistent registry entries are review-able from public data alone.

### What We Don't Know

- **Geodnet** — Whether shared coordinates are legitimate co-located installs, shared-mount sites, or registry artifacts — public data can't tell without operator confirmation.
- **WeatherXM** — Whether over-capacity cells reflect real device density, registry double-counting, or expected reward-zone behavior — only the operator's internal registry settles it.
- **Hivemapper** — Whether the largest visible accounts are treasury, market-maker, exchange custody, or operators — on-chain shape doesn't label holder intent.
- **Helium IoT** — Whether shared coordinates are legitimate co-located installs, shared-mount sites, or registry artifacts — public data can't tell without operator confirmation.
- **Helium Mobile** — Whether shared coordinates are legitimate co-located installs, shared-mount sites, or registry artifacts — public data can't tell without operator confirmation.

### Questions Worth Asking

- On the public cells view, do over-capacity H3 counts match your internal registry and rewards model?
- For stations sharing an exact coordinate pair on the public registry, is that expected registration behavior or a dedupe gap worth reconciling?
- Do the largest visible SPL accounts map to known treasury or market-maker custody labels on your side?
- Does the public read for Helium IoT match what your team sees internally, or is the public feed expected to look this way?
- Does the public read for Helium Mobile match what your team sees internally, or is the public feed expected to look this way?

### Thread Seed

Public read on Geodnet: 8 exact (lat,lng) duplicate groups on 19,604 public stations — each row in §1 is one coordinate pair — does that match your internal view, or is the public feed expected to behave this way?

### Sources & Methodology

- Public signal views: [getkinetik.app/signals](https://getkinetik.app/signals/)
- Reproduce scans: `node scripts/duplication-scan-<network>.mjs` (see each report header)
- **Geodnet:** `docs/reports/geodnet-duplication-report.md` · https://rtk.geodnet.com/api/v2/coverage_stations
- **WeatherXM:** `docs/reports/weatherxm-duplication-report.md` · WeatherXM public cells API
- **Hivemapper:** `docs/reports/hivemapper-duplication-report.md` · Solana mainnet HONEY SPL mint (public RPC)
- **Helium IoT:** `docs/reports/helium-iot-duplication-report.md` · https://entities.nft.helium.io/v2/hotspots?subnetwork=iot
- **Helium Mobile:** `docs/reports/helium-mobile-duplication-report.md` · https://entities.nft.helium.io/v2/hotspots?subnetwork=mobile
