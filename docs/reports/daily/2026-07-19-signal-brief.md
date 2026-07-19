# Daily Signal Brief

> 2026-07-19 · derived from public audit snapshots only. Signals → report (not narrative-first).

## Today's Read

• Hivemapper visible HONEY concentration remains near 51% of visible supply.
• DIMO entities on public map rose from 158,292 to 158,299.
• Geodnet entities on public map rose from 19,578 to 19,594.

## Why It Matters

Today's signals show modest movement in infrastructure metrics. Telemetry and concentration readings are largely unchanged.
The observed changes are incremental rather than structural and remain reproducible from public data sources.
Observations span 4 networks — no single network dominates the index.

## Full Evidence

### What Changed Today

- **Geodnet** — entities on public map: 19,594 (+16 (+0.1%))
- **Hivemapper** — top-20 SPL share of UI supply: 50.95% (+0.28 pp (+0.6%))
- **DIMO** — entities on public map: 158,299 (+7 (+0.0%))
- **WeatherXM** — 288 cells exceed designed capacity — §1 lists H3 indices + map centers for your ops queue.

### Signal Type

- **Geodnet** — Registry duplication (`duplication_cluster`)
- **Hivemapper** — Economic concentration (`economic_concentration`)
- **DIMO** — Uncategorized public observation (`device_backing_gap`)
- **WeatherXM** — Capacity pressure (`capacity_violation`)

### Signal Context

- Geodnet: duplicate or inconsistent registry entries are grep-able from public data alone.
- Hivemapper: visible on-chain concentration is economic shape only — useful for custody reconciliation, not device claims.
- DIMO: measurable public-data delta worth cross-checking with internal ops.
- WeatherXM: public cell capacity counts are a reproducible registry-pressure signal.

### What We Don't Know

- **Geodnet** — Whether shared coordinates are legitimate co-located installs, shared-mount sites, or registry artifacts — public data can't tell without operator confirmation.
- **Hivemapper** — Whether the largest visible accounts are treasury, market-maker, exchange custody, or operators — on-chain shape doesn't label holder intent.
- **DIMO** — What the public feed cannot disambiguate without operator confirmation.
- **WeatherXM** — Whether over-capacity cells reflect real device density, registry double-counting, or expected reward-zone behavior — only the operator's internal registry settles it.

### Questions Worth Asking

- On the public cells view, do over-capacity H3 counts match your internal registry and rewards model?
- For stations sharing an exact coordinate pair on the public registry, is that expected registration behavior or a dedupe gap worth reconciling?
- Do the largest visible SPL accounts map to known treasury or market-maker custody labels on your side?
- Does the public read for DIMO match what your team sees internally, or is the public feed expected to look this way?
- Does the public read for Helium IoT match what your team sees internally, or is the public feed expected to look this way?

### Thread Seed

Public read on Geodnet: 8 exact (lat,lng) duplicate groups on 19,578 public stations — each row in §1 is one coordinate pair your registry team can grep today. — does that match your internal view, or is the public feed expected to behave this way?

### Sources & Methodology

- Public signal views: [getkinetik.app/signals](https://getkinetik.app/signals/)
- Reproduce scans: `node scripts/sybil-scan-<network>.mjs` (see each report header)
- **Geodnet:** `docs/reports/geodnet-sybil-report.md` · https://rtk.geodnet.com/api/v2/coverage_stations
- **Hivemapper:** `docs/reports/hivemapper-sybil-report.md` · Solana mainnet HONEY SPL mint (public RPC)
- **DIMO:** `docs/reports/dimo-sybil-report.md` · https://identity-api.dimo.zone/query
- **WeatherXM:** `docs/reports/weatherxm-sybil-report.md` · WeatherXM public cells API
