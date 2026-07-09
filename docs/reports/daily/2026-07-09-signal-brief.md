# Daily Signal Brief

> 2026-07-09 · derived from public audit snapshots only. Signals → report (not narrative-first).

## Today's Read

• WeatherXM over-capacity cells declined from 290 to 289.
• DIMO entities on public map rose from 158,217 to 158,223.
• Helium Mobile single-coordinate hotspot stacks declined from 530 to 528.

## Why It Matters

Today's signals show modest movement in infrastructure metrics. Telemetry and concentration readings are largely unchanged.
The observed changes are incremental rather than structural and remain reproducible from public data sources.
Observations span 5 networks — no single network dominates the index.

## Full Evidence

### What Changed Today

- **WeatherXM** — cells over designed capacity: 289 (-1 (-0.3%))
- **DIMO** — entities on public map: 158,223 (+6 (+0.0%))
- **Helium Mobile** — single-coordinate stacks (≥10 hotspots): 528 (-2 (-0.4%))
- **Geodnet** — 9 exact (lat,lng) duplicate groups on 19,558 public stations — each row in §1 is one coordinate pair your registry team can grep today.
- **Hivemapper** — 49.10% of UI-reported HONEY sits in the top 20 visible SPL accounts (Solana RPC cap) — economic *shape* for treasury/MM review, not a contributor GPS read.

### Signal Type

- **WeatherXM** — Capacity pressure (`capacity_violation`)
- **DIMO** — Uncategorized public observation (`device_backing_gap`)
- **Helium Mobile** — Registry duplication (`duplication_cluster`)
- **Geodnet** — Registry duplication (`duplication_cluster`)
- **Hivemapper** — Economic concentration (`economic_concentration`)

### Signal Context

- WeatherXM: public cell capacity counts are a reproducible registry-pressure signal.
- DIMO: measurable public-data delta worth cross-checking with internal ops.
- Helium Mobile: duplicate or inconsistent registry entries are grep-able from public data alone.
- Geodnet: duplicate or inconsistent registry entries are grep-able from public data alone.
- Hivemapper: visible on-chain concentration is economic shape only — useful for custody reconciliation, not device claims.

### What We Don't Know

- **WeatherXM** — Whether over-capacity cells reflect real device density, registry double-counting, or expected reward-zone behavior — only the operator's internal registry settles it.
- **DIMO** — What the public feed cannot disambiguate without operator confirmation.
- **Helium Mobile** — Whether shared coordinates are legitimate co-located installs, shared-mount sites, or registry artifacts — public data can't tell without operator confirmation.
- **Geodnet** — Whether shared coordinates are legitimate co-located installs, shared-mount sites, or registry artifacts — public data can't tell without operator confirmation.
- **Hivemapper** — Whether the largest visible accounts are treasury, market-maker, exchange custody, or operators — on-chain shape doesn't label holder intent.

### Questions Worth Asking

- On the public cells view, do over-capacity H3 counts match your internal registry and rewards model?
- For stations sharing an exact coordinate pair on the public registry, is that expected registration behavior or a dedupe gap worth reconciling?
- Do the largest visible SPL accounts map to known treasury or market-maker custody labels on your side?
- Does the public read for DIMO match what your team sees internally, or is the public feed expected to look this way?
- Does the public read for Helium IoT match what your team sees internally, or is the public feed expected to look this way?

### Thread Seed

Public read on Geodnet: 9 exact (lat,lng) duplicate groups on 19,558 public stations — each row in §1 is one coordinate pair your registry team can grep today. — does that match your internal view, or is the public feed expected to behave this way?

### Sources & Methodology

- Public signal views: [getkinetik.app/signals](https://getkinetik.app/signals/)
- Reproduce scans: `node scripts/sybil-scan-<network>.mjs` (see each report header)
- **WeatherXM:** `docs/reports/weatherxm-sybil-report.md` · WeatherXM public cells API
- **DIMO:** `docs/reports/dimo-sybil-report.md` · https://identity-api.dimo.zone/query
- **Helium Mobile:** `docs/reports/helium-mobile-sybil-report.md` · https://entities.nft.helium.io/v2/hotspots?subnetwork=mobile
- **Geodnet:** `docs/reports/geodnet-sybil-report.md` · https://rtk.geodnet.com/api/v2/coverage_stations
- **Hivemapper:** `docs/reports/hivemapper-sybil-report.md` · Solana mainnet HONEY SPL mint (public RPC)
