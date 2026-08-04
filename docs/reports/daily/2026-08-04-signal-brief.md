# Daily Signal Brief

> 2026-08-04 · derived from public audit snapshots only. Signals → report (not narrative-first).

## Today's Read

• WeatherXM over-capacity cells rose from 287 to 289.
• Hivemapper visible HONEY concentration declined from 49% to 48% of visible supply.
• Geodnet entities on public map declined from 19,585 to 19,579.
• Helium Mobile entities on public map rose from 54,873 to 54,883.
• WeatherXM entities on public map declined from 8,505 to 8,499.

## Why It Matters

Today's signals show modest movement in infrastructure metrics. Telemetry and concentration readings are largely unchanged.
The observed changes are incremental rather than structural and remain reproducible from public data sources.
Observations span 4 networks — no single network dominates the index.

## Full Evidence

### What Changed Today

- **Geodnet** — entities on public map: 19,579 (-6 (-0.0%))
- **WeatherXM** — entities on public map: 8,499 (-6 (-0.1%))
- **WeatherXM** — cells over designed capacity: 289 (+2 (+0.7%))
- **Hivemapper** — top-20 SPL share of UI supply: 48.29% (-0.77 pp (-1.6%))
- **Helium Mobile** — entities on public map: 54,883 (+10 (+0.0%))

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
- Does the public read for DIMO match what your team sees internally, or is the public feed expected to look this way?
- Does the public read for Helium IoT match what your team sees internally, or is the public feed expected to look this way?

### Thread Seed

Public read on Geodnet: 8 exact (lat,lng) duplicate groups on 19,585 public stations — each row in §1 is one coordinate pair your registry team can grep today. — does that match your internal view, or is the public feed expected to behave this way?

### Sources & Methodology

- Public signal views: [getkinetik.app/signals](https://getkinetik.app/signals/)
- Reproduce scans: `node scripts/sybil-scan-<network>.mjs` (see each report header)
- **Geodnet:** `docs/reports/geodnet-sybil-report.md` · https://rtk.geodnet.com/api/v2/coverage_stations
- **WeatherXM:** `docs/reports/weatherxm-sybil-report.md` · WeatherXM public cells API
- **Hivemapper:** `docs/reports/hivemapper-sybil-report.md` · Solana mainnet HONEY SPL mint (public RPC)
- **Helium Mobile:** `docs/reports/helium-mobile-sybil-report.md` · https://entities.nft.helium.io/v2/hotspots?subnetwork=mobile
