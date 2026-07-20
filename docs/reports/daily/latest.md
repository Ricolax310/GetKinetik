# Daily DePIN Signal Brief

> 2026-07-20 · automated cross-network pipeline · evidence not verdicts

## Today's Read

• Hivemapper visible HONEY concentration remains near 51% of visible supply.
• Geodnet duplicate-coordinate groups unchanged at 7.
• WeatherXM over-capacity cells unchanged at 289.
• Geodnet entities on public map declined from 19,600 to 19,593.
• WeatherXM entities on public map declined from 8,498 to 8,492.

## Why It Matters

Today's signals show modest movement in concentration metrics. Telemetry and concentration readings are largely unchanged.
The observed changes are incremental rather than structural and remain reproducible from public data sources.
Observations span 6 networks — no single network dominates the index.

## Full Evidence

### Cross-Network Summary

| Sector | Signals | Networks | Top severity |
|---|---:|---|---|
| Registry & identity integrity | 4 | Geodnet, Helium IoT, Helium Mobile | medium |
| Network health & capacity | 3 | DIMO, WeatherXM | medium |
| Token economics | 2 | Hivemapper | medium |

_Totals: 9 signal(s) across 6/7 networks._

### What Changed Today

**Registry & identity integrity**
- **Geodnet** — 7 exact (lat,lng) duplicate groups on 19,593 public stations — each row in §1 is one coordinate pair your registry team can grep today. _(medium · conf 0.70)_
- **Geodnet** — entities on public map: 19,593 (-7 (-0.0%)) _(low · conf 0.85)_
- **Helium IoT** — 4,858 single-coordinate stacks of ≥10 hotspots on 1,008,122 located units — the largest stack holds 502 hotspots on one coordinate (§1 lists keys your registry team can grep today). _(medium · conf 0.70)_
- **Helium Mobile** — 528 single-coordinate stacks of ≥10 hotspots on 54,837 located units — the largest stack holds 497 hotspots on one coordinate (§1 lists keys your registry team can grep today). _(medium · conf 0.70)_

**Network health & capacity**
- **WeatherXM** — 289 cells exceed designed capacity — §1 lists H3 indices + map centers for your ops queue. _(medium · conf 0.70)_
- **WeatherXM** — entities on public map: 8,492 (-6 (-0.1%)) _(low · conf 0.85)_
- **DIMO** — Of 158,306 DIMO vehicle identities, 40,622 (25.7%) are backed by physical hardware; 31,416 (19.8%) connect via software/synthetic devices, and 86,268 (54.5%) show no connected device on the public registry. _(medium · conf 0.70)_

**Token economics**
- **Hivemapper** — 50.67% of UI-reported HONEY sits in the top 20 visible SPL accounts (Solana RPC cap) — economic *shape* for treasury/MM review, not a contributor GPS read. _(medium · conf 0.70)_
- **Hivemapper** — top-20 SPL share of UI supply: 50.67% (-0.28 pp (-0.6%)) _(low · conf 0.85)_

### Signal Type

- **Registry & identity integrity** (`integrity`) — 4 signal(s) across 3 network(s): Geodnet, Helium IoT, Helium Mobile
- **Network health & capacity** (`health`) — 3 signal(s) across 2 network(s): DIMO, WeatherXM
- **Token economics** (`economics`) — 2 signal(s) across 1 network(s): Hivemapper

### Signal Context

_Operational context for observed metrics — not verdicts._
- **Registry & identity integrity** — public integrity signals across Geodnet, Helium IoT, Helium Mobile.
- **Network health & capacity** — public health signals across DIMO, WeatherXM.
- **Token economics** — public economics signals across Hivemapper.

### What We Don't Know

- **Registry & identity integrity** — Whether shared/duplicated identifiers are legitimate co-located installs or registry artifacts — only operator confirmation settles it.
- **Network health & capacity** — Whether capacity or telemetry anomalies reflect real on-the-ground activity, ETL/display behavior, or registry double-counting — the public feed alone can't say.
- **Token economics** — Whether the largest visible accounts are treasury, market-maker, exchange custody, or operators — on-chain shape doesn't label holder intent.

### Network Breakdown

### Geodnet
- [integrity] 7 exact (lat,lng) duplicate groups on 19,593 public stations — each row in §1 is one coordinate pair your registry team can grep today. _(medium · conf 0.70)_
- [integrity] entities on public map: 19,593 (-7 (-0.0%)) _(low · conf 0.85)_

### WeatherXM
- [health] 289 cells exceed designed capacity — §1 lists H3 indices + map centers for your ops queue. _(medium · conf 0.70)_
- [health] entities on public map: 8,492 (-6 (-0.1%)) _(low · conf 0.85)_

### Hivemapper
- [economics] 50.67% of UI-reported HONEY sits in the top 20 visible SPL accounts (Solana RPC cap) — economic *shape* for treasury/MM review, not a contributor GPS read. _(medium · conf 0.70)_
- [economics] top-20 SPL share of UI supply: 50.67% (-0.28 pp (-0.6%)) _(low · conf 0.85)_

### NATIX
- _No qualifying public finding in latest snapshot._

### Helium IoT
- [integrity] 4,858 single-coordinate stacks of ≥10 hotspots on 1,008,122 located units — the largest stack holds 502 hotspots on one coordinate (§1 lists keys your registry team can grep today). _(medium · conf 0.70)_

### Helium Mobile
- [integrity] 528 single-coordinate stacks of ≥10 hotspots on 54,837 located units — the largest stack holds 497 hotspots on one coordinate (§1 lists keys your registry team can grep today). _(medium · conf 0.70)_

### DIMO
- [health] Of 158,306 DIMO vehicle identities, 40,622 (25.7%) are backed by physical hardware; 31,416 (19.8%) connect via software/synthetic devices, and 86,268 (54.5%) show no connected device on the public registry. _(medium · conf 0.70)_

## Methodology

- Automated pipeline: ingest public data → detect standardized signals → cross-network aggregate → publish.
- Cross-network first by contract; per-network breakdown is secondary and never volume-ranked.
- Signals are reproducible public reads (`scripts/sybil-scan-*.mjs`). Evidence, not verdicts.
- Feed JSON: `signals/<cadence>/latest.json` · API: `/api/signals/latest.json`
