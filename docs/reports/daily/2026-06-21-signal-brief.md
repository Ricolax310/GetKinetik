# Daily Signal Brief

> 2026-06-21 · derived from public audit snapshots only. Signals → report (not narrative-first).

## Today's Read

• WeatherXM: 287 cells exceed designed capacity — §1 lists H3 indices + map centers for your ops queue.
• Geodnet: 10 exact (lat,lng) duplicate groups on 19,588 public stations — each row in §1 is one coordinate pair your registry team can grep today.
• Hivemapper: 49.18% of UI-reported HONEY sits in the top 20 visible SPL accounts (Solana RPC cap) — economic *shape* for treasury/MM review, not a con…

## Why It Matters

Today's infrastructure signals remain flat — no observable delta in the current public read.
The index records these as stability readings; evidence is retained in full below.
Observations span 3 networks — no single network dominates the index.

## Full Evidence

### What Changed Today

- **WeatherXM** — 287 cells exceed designed capacity — §1 lists H3 indices + map centers for your ops queue.
- **Geodnet** — 10 exact (lat,lng) duplicate groups on 19,588 public stations — each row in §1 is one coordinate pair your registry team can grep today.
- **Hivemapper** — 49.18% of UI-reported HONEY sits in the top 20 visible SPL accounts (Solana RPC cap) — economic *shape* for treasury/MM review, not a contributor GPS read.

### Signal Type

- **WeatherXM** — Capacity pressure (`capacity_violation`)
- **Geodnet** — Registry duplication (`duplication_cluster`)
- **Hivemapper** — Economic concentration (`economic_concentration`)

### Signal Context

- WeatherXM: public cell capacity counts are a reproducible registry-pressure signal.
- Geodnet: duplicate or inconsistent registry entries are grep-able from public data alone.
- Hivemapper: visible on-chain concentration is economic shape only — useful for custody reconciliation, not device claims.

### What We Don't Know

- **WeatherXM** — Whether over-capacity cells reflect real device density, registry double-counting, or expected reward-zone behavior — only the operator's internal registry settles it.
- **Geodnet** — Whether shared coordinates are legitimate co-located installs, shared-mount sites, or registry artifacts — public data can't tell without operator confirmation.
- **Hivemapper** — Whether the largest visible accounts are treasury, market-maker, exchange custody, or operators — on-chain shape doesn't label holder intent.

### Questions Worth Asking

- On the public cells view, do over-capacity H3 counts match your internal registry and rewards model?
- For stations sharing an exact coordinate pair on the public registry, is that expected registration behavior or a dedupe gap worth reconciling?
- Do the largest visible SPL accounts map to known treasury or market-maker custody labels on your side?
- Does the public read for Helium IoT match what your team sees internally, or is the public feed expected to look this way?
- Does the public read for Helium Mobile match what your team sees internally, or is the public feed expected to look this way?

### Thread Seed

Public read on Geodnet: 8 exact (lat,lng) duplicate groups on 19,604 public stations — each row in §1 is one coordinate pair your registry team can grep today. — does that match your internal view, or is the public feed expected to behave this way?

### Sources & Methodology

- Public signal views: [getkinetik.app/signals](https://getkinetik.app/signals/)
- Reproduce scans: `node scripts/sybil-scan-<network>.mjs` (see each report header)
- **WeatherXM:** `docs/reports/weatherxm-sybil-report.md` · WeatherXM public cells API
- **Geodnet:** `docs/reports/geodnet-sybil-report.md` · https://rtk.geodnet.com/api/v2/coverage_stations
- **Hivemapper:** `docs/reports/hivemapper-sybil-report.md` · Solana mainnet HONEY SPL mint (public RPC)
