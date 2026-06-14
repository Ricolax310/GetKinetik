# Daily DePIN Signal Brief

> 2026-06-14 · automated cross-network pipeline · evidence not verdicts

## Today's Read

• Geodnet duplicate-coordinate groups rose from 8 to 13.
• WeatherXM over-capacity cells declined from 289 to 287.
• Helium IoT entities on public map rose from 1,008,023 to 1,008,034.
• Geodnet entities on public map rose from 19,614 to 19,623.

## Why It Matters

Today's signals show movement in concentration metrics, with at least one high-severity read observable on public data.
The observed changes are reproducible from public endpoints and remain non-conclusive without operator confirmation.
Observations span 5 networks — no single network dominates the index.

## Full Evidence

### Cross-Network Summary

| Sector | Signals | Networks | Top severity |
|---|---:|---|---|
| Registry & identity integrity | 7 | Geodnet, Helium IoT, Helium Mobile | high |
| Network health & capacity | 3 | WeatherXM | medium |
| Coverage growth | 4 | Geodnet, Helium IoT, Helium Mobile, WeatherXM | low |
| Token economics | 2 | Hivemapper | medium |

_Totals: 16 signal(s) across 5/7 networks._

### What Changed Today

**Registry & identity integrity**
- **Geodnet** — 13 exact (lat,lng) duplicate groups on 19,623 public stations — each row in §1 is one coordinate pair your registry team can grep today. _(medium · conf 0.70)_
- **Geodnet** — exact (lat,lng) duplicate groups: 13 (+5 (+62.5%)) _(high · conf 0.85)_
- **Geodnet** — fleet share flagged (any heuristic): 9.31% (+0.03 pp (+0.3%)) _(low · conf 0.85)_
- **Helium IoT** — 4,857 single-coordinate stacks of ≥10 hotspots on 1,008,034 located units — the largest stack holds 501 hotspots on one coordinate (§1 lists keys your registry team can grep today). _(medium · conf 0.70)_
- **Helium IoT** — single-coordinate stacks (≥10 hotspots): 4,857 (+1 (+0.0%)) _(low · conf 0.85)_
- **Helium Mobile** — 529 single-coordinate stacks of ≥10 hotspots on 54,691 located units — the largest stack holds 497 hotspots on one coordinate (§1 lists keys your registry team can grep today). _(medium · conf 0.70)_
- **Helium Mobile** — fleet share flagged (any heuristic): 20.57% (-0.00 pp (-0.0%)) _(low · conf 0.85)_

**Network health & capacity**
- **WeatherXM** — 287 cells exceed designed capacity — §1 lists H3 indices + map centers for your ops queue. _(medium · conf 0.70)_
- **WeatherXM** — cells over designed capacity: 287 (-2 (-0.7%)) _(low · conf 0.85)_
- **WeatherXM** — share of map over capacity: 3.38% (-0.02 pp (-0.7%)) _(low · conf 0.85)_

**Coverage growth**
- **Geodnet** — entities on public map: 19,623 (+9 (+0.0%)) _(low · conf 0.85)_
- **WeatherXM** — entities on public map: 8,498 (+1 (+0.0%)) _(low · conf 0.85)_
- **Helium IoT** — entities on public map: 1,008,034 (+11 (+0.0%)) _(low · conf 0.85)_
- **Helium Mobile** — entities on public map: 54,691 (+2 (+0.0%)) _(low · conf 0.85)_

**Token economics**
- **Hivemapper** — 49.18% of UI-reported HONEY sits in the top 20 visible SPL accounts (Solana RPC cap) — economic *shape* for treasury/MM review, not a contributor GPS read. _(medium · conf 0.70)_
- **Hivemapper** — top-20 SPL share of UI supply: 49.18% (-0.02 pp (-0.0%)) _(low · conf 0.85)_

### Signal Type

- **Registry & identity integrity** (`integrity`) — 7 signal(s) across 3 network(s): Geodnet, Helium IoT, Helium Mobile
- **Network health & capacity** (`health`) — 3 signal(s) across 1 network(s): WeatherXM
- **Coverage growth** (`growth`) — 4 signal(s) across 4 network(s): Geodnet, Helium IoT, Helium Mobile, WeatherXM
- **Token economics** (`economics`) — 2 signal(s) across 1 network(s): Hivemapper

### Signal Context

_Operational context for observed metrics — not verdicts._
- **Registry & identity integrity** — public integrity signals across Geodnet, Helium IoT, Helium Mobile.
- **Network health & capacity** — public health signals across WeatherXM.
- **Coverage growth** — public growth signals across Geodnet, Helium IoT, Helium Mobile, WeatherXM.
- **Token economics** — public economics signals across Hivemapper.

### What We Don't Know

- **Registry & identity integrity** — Whether shared/duplicated identifiers are legitimate co-located installs or registry artifacts — only operator confirmation settles it.
- **Network health & capacity** — Whether capacity or telemetry anomalies reflect real on-the-ground activity, ETL/display behavior, or registry double-counting — the public feed alone can't say.
- **Coverage growth** — Whether registry growth reflects new physical deployments or registration churn — counts alone don't prove device reality.
- **Token economics** — Whether the largest visible accounts are treasury, market-maker, exchange custody, or operators — on-chain shape doesn't label holder intent.

### Network Breakdown

### Geodnet
- [integrity] 13 exact (lat,lng) duplicate groups on 19,623 public stations — each row in §1 is one coordinate pair your registry team can grep today. _(medium · conf 0.70)_
- [integrity] exact (lat,lng) duplicate groups: 13 (+5 (+62.5%)) _(high · conf 0.85)_
- [growth] entities on public map: 19,623 (+9 (+0.0%)) _(low · conf 0.85)_
- [integrity] fleet share flagged (any heuristic): 9.31% (+0.03 pp (+0.3%)) _(low · conf 0.85)_

### WeatherXM
- [health] 287 cells exceed designed capacity — §1 lists H3 indices + map centers for your ops queue. _(medium · conf 0.70)_
- [growth] entities on public map: 8,498 (+1 (+0.0%)) _(low · conf 0.85)_
- [health] cells over designed capacity: 287 (-2 (-0.7%)) _(low · conf 0.85)_
- [health] share of map over capacity: 3.38% (-0.02 pp (-0.7%)) _(low · conf 0.85)_

### Hivemapper
- [economics] 49.18% of UI-reported HONEY sits in the top 20 visible SPL accounts (Solana RPC cap) — economic *shape* for treasury/MM review, not a contributor GPS read. _(medium · conf 0.70)_
- [economics] top-20 SPL share of UI supply: 49.18% (-0.02 pp (-0.0%)) _(low · conf 0.85)_

### NATIX
- _No qualifying public finding in latest snapshot._

### Helium IoT
- [integrity] 4,857 single-coordinate stacks of ≥10 hotspots on 1,008,034 located units — the largest stack holds 501 hotspots on one coordinate (§1 lists keys your registry team can grep today). _(medium · conf 0.70)_
- [growth] entities on public map: 1,008,034 (+11 (+0.0%)) _(low · conf 0.85)_
- [integrity] single-coordinate stacks (≥10 hotspots): 4,857 (+1 (+0.0%)) _(low · conf 0.85)_

### Helium Mobile
- [integrity] 529 single-coordinate stacks of ≥10 hotspots on 54,691 located units — the largest stack holds 497 hotspots on one coordinate (§1 lists keys your registry team can grep today). _(medium · conf 0.70)_
- [growth] entities on public map: 54,691 (+2 (+0.0%)) _(low · conf 0.85)_
- [integrity] fleet share flagged (any heuristic): 20.57% (-0.00 pp (-0.0%)) _(low · conf 0.85)_

### DIMO
- _No public scanner wired yet — included for cross-network coverage._

## Methodology

- Automated pipeline: ingest public data → detect standardized signals → cross-network aggregate → publish.
- Cross-network first by contract; per-network breakdown is secondary and never volume-ranked.
- Signals are reproducible public reads (`scripts/sybil-scan-*.mjs`). Evidence, not verdicts.
- Feed JSON: `signals/<cadence>/latest.json` · API: `/api/signals/latest.json`
