# DePIN Signal Brief — 2026-09-29

> 2026-09-29 · machine-driven signal publication · evidence first

## Today's Read

• Geodnet duplicate-coordinate groups rose from 1,000 to 1,004.
• WeatherXM over-capacity cells unchanged at 299.
• Geodnet entities on public map rose from 19,492 to 19,508.
• Helium Mobile entities on public map rose from 56,132 to 56,138.
• DIMO entities on public map rose from 158,705 to 158,711.

## Why It Matters

Today's signals show modest movement in registry, capacity, and concentration metrics. Telemetry and concentration readings are largely unchanged.
The observed changes are incremental rather than structural and remain reproducible from public data sources.
Observations span 6 networks — no single network dominates the index.

## Full Evidence

### What Changed Today

- **Geodnet** — exact (lat,lng) duplicate groups: 1,004 (+4 (+0.4%))
- **Geodnet** — entities on public map: 19,508 (+16 (+0.1%))
- **DIMO** — entities on public map: 158,711 (+6 (+0.0%))
- **Helium Mobile** — entities on public map: 56,138 (+6 (+0.0%))
- **WeatherXM** — 299 cells exceed designed capacity — §1 lists H3 indices + map centers for your review queue.
- **Hivemapper** — 52.30% of UI-reported HONEY sits in the top 20 visible SPL accounts (Solana RPC cap) — economic *shape* for treasury/MM review, not a contributor GPS read.

### Signal Type

- **Geodnet** — Registry duplication (`duplication_cluster`)
- **DIMO** — Uncategorized public observation (`device_backing_gap`)
- **Helium Mobile** — Registry duplication (`duplication_cluster`)
- **WeatherXM** — Capacity pressure (`capacity_violation`)
- **Hivemapper** — Economic concentration (`economic_concentration`)

### Signal Context

- Geodnet: duplicate or inconsistent registry entries are review-able from public data alone.
- DIMO: measurable public-data delta worth cross-checking with internal ops.
- Helium Mobile: duplicate or inconsistent registry entries are review-able from public data alone.
- WeatherXM: public cell capacity counts are a reproducible registry-pressure signal.
- Hivemapper: visible on-chain concentration is economic shape only — useful for custody reconciliation, not device claims.

### What We Don't Know

- **Geodnet** — Whether shared coordinates are legitimate co-located installs, shared-mount sites, or registry artifacts — public data can't tell without operator confirmation.
- **DIMO** — What the public feed cannot disambiguate without operator confirmation.
- **Helium Mobile** — Whether shared coordinates are legitimate co-located installs, shared-mount sites, or registry artifacts — public data can't tell without operator confirmation.
- **WeatherXM** — Whether over-capacity cells reflect real device density, registry double-counting, or expected reward-zone behavior — only the operator's internal registry settles it.
- **Hivemapper** — Whether the largest visible accounts are treasury, market-maker, exchange custody, or operators — on-chain shape doesn't label holder intent.

### Questions Worth Asking

- On the public cells view, do over-capacity H3 counts match your internal registry and rewards model?
- For stations sharing an exact coordinate pair on the public registry, is that expected registration behavior or a dedupe gap worth reconciling?
- Do the largest visible SPL accounts map to known treasury or market-maker custody labels on your side?
- Does the public read for DIMO match what your team sees internally, or is the public feed expected to look this way?
- Does the public read for Helium IoT match what your team sees internally, or is the public feed expected to look this way?

### Thread Seed

Public read on Geodnet: 1004 exact (lat,lng) duplicate groups on 19,508 public stations — each row in §1 is one coordinate pair your registry team can review today. — does that match your internal view, or is the public feed expected to behave this way?

### Sources & Methodology

- Public signal views: [getkinetik.app/signals](https://getkinetik.app/signals/)
- Reproduce scans: `node scripts/duplication-scan-<network>.mjs` (see each report header)
- **Geodnet:** `docs/reports/geodnet-duplication-report.md` · https://rtk.geodnet.com/api/v2/coverage_stations
- **DIMO:** `docs/reports/dimo-duplication-report.md` · https://identity-api.dimo.zone/query
- **Helium Mobile:** `docs/reports/helium-mobile-duplication-report.md` · https://entities.nft.helium.io/v2/hotspots?subnetwork=mobile
- **WeatherXM:** `docs/reports/weatherxm-duplication-report.md` · WeatherXM public cells API
- **Hivemapper:** `docs/reports/hivemapper-duplication-report.md` · Solana mainnet HONEY SPL mint (public RPC)
