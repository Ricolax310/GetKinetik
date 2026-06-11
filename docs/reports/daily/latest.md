# Daily DePIN Signal Brief

> 2026-06-11 · automated cross-network pipeline · evidence not verdicts

## Today's Read

• WeatherXM over-capacity cells rose from 286 to 290.
• Geodnet duplicate-coordinate groups unchanged at 8.
• Geodnet entities on public map declined from 19,604 to 19,595.

## Why It Matters

Today's signals show modest movement in concentration metrics. Telemetry and concentration readings are largely unchanged.
The observed changes are incremental rather than structural and remain reproducible from public data sources.
Observations span 5 networks — no single network dominates the index.

## Full Evidence

### Cross-Network Summary

| Sector | Signals | Networks | Top severity |
|---|---:|---|---|
| Registry & identity integrity | 5 | Geodnet, Helium IoT, Helium Mobile | medium |
| Network health & capacity | 4 | WeatherXM | medium |
| Token economics | 2 | Hivemapper | medium |

_Totals: 11 signal(s) across 5/7 networks._

### What Changed Today

**Registry & identity integrity**
- **Geodnet** — 8 exact (lat,lng) duplicate groups on 19,604 public stations — each row in §1 is one coordinate pair your registry team can grep today. _(medium · conf 0.70)_
- **Geodnet** — entities on public map: 19,595 (-9 (-0.0%)) _(low · conf 0.85)_
- **Helium IoT** — 4,855 single-coordinate stacks of ≥10 hotspots on 1,008,019 located units — the largest stack holds 501 hotspots on one coordinate (§1 lists keys your registry team can grep today). _(medium · conf 0.70)_
- **Helium Mobile** — 529 single-coordinate stacks of ≥10 hotspots on 54,683 located units — the largest stack holds 497 hotspots on one coordinate (§1 lists keys your registry team can grep today). _(medium · conf 0.70)_
- **Helium Mobile** — fleet share flagged (any heuristic): 20.57% (-0.00 pp (-0.0%)) _(low · conf 0.85)_

**Network health & capacity**
- **WeatherXM** — 286 cells exceed designed capacity — §1 lists H3 indices + map centers for your ops queue. _(medium · conf 0.70)_
- **WeatherXM** — entities on public map: 8,495 (-3 (-0.0%)) _(low · conf 0.85)_
- **WeatherXM** — cells over designed capacity: 290 (+4 (+1.4%)) _(medium · conf 0.85)_
- **WeatherXM** — share of map over capacity: 3.41% (+0.05 pp (+1.4%)) _(medium · conf 0.85)_

**Token economics**
- **Hivemapper** — 49.20% of UI-reported HONEY sits in the top 20 visible SPL accounts (Solana RPC cap) — economic *shape* for treasury/MM review, not a contributor GPS read. _(medium · conf 0.70)_
- **Hivemapper** — top-20 SPL share of UI supply: 49.21% (+0.01 pp (+0.0%)) _(low · conf 0.85)_

### Signal Type

- **Registry & identity integrity** (`integrity`) — 5 signal(s) across 3 network(s): Geodnet, Helium IoT, Helium Mobile
- **Network health & capacity** (`health`) — 4 signal(s) across 1 network(s): WeatherXM
- **Token economics** (`economics`) — 2 signal(s) across 1 network(s): Hivemapper

### Signal Context

_Operational context for observed metrics — not verdicts._
- **Registry & identity integrity** — public integrity signals across Geodnet, Helium IoT, Helium Mobile.
- **Network health & capacity** — public health signals across WeatherXM.
- **Token economics** — public economics signals across Hivemapper.

### What We Don't Know

- **Registry & identity integrity** — Whether shared/duplicated identifiers are legitimate co-located installs or registry artifacts — only operator confirmation settles it.
- **Network health & capacity** — Whether capacity or telemetry anomalies reflect real on-the-ground activity, ETL/display behavior, or registry double-counting — the public feed alone can't say.
- **Token economics** — Whether the largest visible accounts are treasury, market-maker, exchange custody, or operators — on-chain shape doesn't label holder intent.

### Network Breakdown

### Geodnet
- [integrity] 8 exact (lat,lng) duplicate groups on 19,604 public stations — each row in §1 is one coordinate pair your registry team can grep today. _(medium · conf 0.70)_
- [integrity] entities on public map: 19,595 (-9 (-0.0%)) _(low · conf 0.85)_

### WeatherXM
- [health] 286 cells exceed designed capacity — §1 lists H3 indices + map centers for your ops queue. _(medium · conf 0.70)_
- [health] entities on public map: 8,495 (-3 (-0.0%)) _(low · conf 0.85)_
- [health] cells over designed capacity: 290 (+4 (+1.4%)) _(medium · conf 0.85)_
- [health] share of map over capacity: 3.41% (+0.05 pp (+1.4%)) _(medium · conf 0.85)_

### Hivemapper
- [economics] 49.20% of UI-reported HONEY sits in the top 20 visible SPL accounts (Solana RPC cap) — economic *shape* for treasury/MM review, not a contributor GPS read. _(medium · conf 0.70)_
- [economics] top-20 SPL share of UI supply: 49.21% (+0.01 pp (+0.0%)) _(low · conf 0.85)_

### NATIX
- _No qualifying public finding in latest snapshot._

### Helium IoT
- [integrity] 4,855 single-coordinate stacks of ≥10 hotspots on 1,008,019 located units — the largest stack holds 501 hotspots on one coordinate (§1 lists keys your registry team can grep today). _(medium · conf 0.70)_

### Helium Mobile
- [integrity] 529 single-coordinate stacks of ≥10 hotspots on 54,683 located units — the largest stack holds 497 hotspots on one coordinate (§1 lists keys your registry team can grep today). _(medium · conf 0.70)_
- [integrity] fleet share flagged (any heuristic): 20.57% (-0.00 pp (-0.0%)) _(low · conf 0.85)_

### DIMO
- _No public scanner wired yet — included for cross-network coverage._

## Methodology

- Automated pipeline: ingest public data → detect standardized signals → cross-network aggregate → publish.
- Cross-network first by contract; per-network breakdown is secondary and never volume-ranked.
- Signals are reproducible public reads (`scripts/sybil-scan-*.mjs`). Evidence, not verdicts.
- Feed JSON: `signals/<cadence>/latest.json` · API: `/api/signals/latest.json`
