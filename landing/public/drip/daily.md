# DePIN Signal Brief — 2026-06-05

> 2026-06-05 · machine-driven signal publication · evidence first

## Today's Read

• Geodnet duplicate-coordinate groups rose from 8 to 11.
• WeatherXM over-capacity cells declined from 289 to 288.
• Geodnet entities on public map declined from 19,676 to 19,616.
• Nodle duplicate-coordinate groups unchanged at 15.
• Dawn Network duplicate-coordinate groups unchanged at 15.
• Grass / Titan duplicate-coordinate groups unchanged at 0.

## Why It Matters

Today's signals show modest movement in registry, capacity, and concentration metrics. Telemetry and concentration readings are largely unchanged.
The observed changes are incremental rather than structural and remain reproducible from public data sources.
Observations span 6 networks — no single network dominates the index.

## Full Evidence

### What Changed Today

- **Geodnet** — exact (lat,lng) duplicate groups: 11 (+3 (+37.5%))
- **Geodnet** — entities on public map: 19,616 (-60 (-0.3%))
- **Geodnet** — fleet share flagged (any heuristic): 9.34% (-0.00 pp (-0.0%))
- **WeatherXM** — entities on public map: 8,492 (+3 (+0.0%))
- **WeatherXM** — cells over designed capacity: 288 (-1 (-0.3%))
- **WeatherXM** — share of map over capacity: 3.39% (-0.01 pp (-0.4%))
- **Hivemapper** — top-20 SPL share of UI supply: 49.13% (-0.02 pp (-0.0%))

### Signal Type

- **Geodnet** — Uncategorized public observation (`undefined`)
- **WeatherXM** — Uncategorized public observation (`undefined`)
- **Hivemapper** — Uncategorized public observation (`undefined`)

### Signal Context

- Geodnet: measurable public-data delta worth cross-checking with internal ops.
- WeatherXM: measurable public-data delta worth cross-checking with internal ops.
- Hivemapper: measurable public-data delta worth cross-checking with internal ops.

### What We Don't Know

- **Geodnet** — What the public feed cannot disambiguate without operator confirmation.
- **WeatherXM** — What the public feed cannot disambiguate without operator confirmation.
- **Hivemapper** — What the public feed cannot disambiguate without operator confirmation.

### Questions Worth Asking

- On the public cells view, do over-capacity H3 counts match your internal registry and rewards model?
- For stations sharing an exact coordinate pair on the public registry, is that expected registration behavior or a dedupe gap worth reconciling?
- Do the largest visible SPL accounts map to known treasury or market-maker custody labels on your side?

### Thread Seed

_No new thread seed today — all observable signals may already be in live threads._

### Sources & Methodology

- Public signal views: [getkinetik.app/signals](https://getkinetik.app/signals/)
- Reproduce scans: `node scripts/duplication-scan-<network>.mjs` (see each report header)
- **Geodnet:** `docs/reports/geodnet-duplication-report.md` · https://rtk.geodnet.com/api/v2/coverage_stations
- **WeatherXM:** `docs/reports/weatherxm-duplication-report.md` · WeatherXM public cells API
- **Hivemapper:** `docs/reports/hivemapper-duplication-report.md` · Solana mainnet HONEY SPL mint (public RPC)
