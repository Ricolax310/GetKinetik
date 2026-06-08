# Daily DePIN Signal Brief

> 2026-06-08 · automated cross-network pipeline · evidence not verdicts

## Today's Read

• Geodnet duplicate-coordinate groups rose from 8 to 11.
• WeatherXM over-capacity cells declined from 289 to 288.
• Geodnet entities on public map declined from 19,676 to 19,616.
• Nodle duplicate-coordinate groups unchanged at 15.
• Dawn Network duplicate-coordinate groups unchanged at 15.
• Grass / Titan duplicate-coordinate groups unchanged at 0.

## Why It Matters

Today's signals show movement in concentration metrics, with at least one high-severity read observable on public data.
The observed changes are reproducible from public endpoints and remain non-conclusive without operator confirmation.
Observations span 6 networks — no single network dominates the index.

## Full Evidence

### Cross-Network Summary

| Sector | Signals | Networks | Top severity |
|---|---:|---|---|
| Registry & identity integrity | 12 | Dawn Network, Geodnet, Nodle | high |
| Network health & capacity | 7 | Grass / Titan, WeatherXM | medium |
| Coverage growth | 1 | WeatherXM | low |
| Token economics | 2 | Hivemapper | medium |

_Totals: 22 signal(s) across 6/8 networks._

### What Changed Today

**Registry & identity integrity**
- **Geodnet** — 11 exact (lat,lng) duplicate groups on 19,616 public stations — each row in §1 is one coordinate pair your registry team can grep today. _(medium · conf 0.70)_
- **Geodnet** — exact (lat,lng) duplicate groups: 11 (+3 (+37.5%)) _(high · conf 0.85)_
- **Geodnet** — entities on public map: 19,616 (-60 (-0.3%)) _(low · conf 0.85)_
- **Geodnet** — fleet share flagged (any heuristic): 9.34% (-0.00 pp (-0.0%)) _(low · conf 0.85)_
- **Nodle** — Flagged Emulator Nodes: 25 (38.5% of pool) _(medium · conf 0.70)_
- **Nodle** — exact (lat,lng) duplicate groups: 15 (_(first snapshot — baseline recorded)_) _(low · conf 0.55)_
- **Nodle** — entities on public map: 65 (_(first snapshot — baseline recorded)_) _(low · conf 0.55)_
- **Nodle** — fleet share flagged (any heuristic): 38.46% (_(first snapshot — baseline recorded)_) _(low · conf 0.55)_
- **Dawn Network** — Flagged Anomalous Nodes: 25 (45.5% of pool) _(medium · conf 0.70)_
- **Dawn Network** — exact (lat,lng) duplicate groups: 15 (_(first snapshot — baseline recorded)_) _(low · conf 0.55)_
- **Dawn Network** — entities on public map: 55 (_(first snapshot — baseline recorded)_) _(low · conf 0.55)_
- **Dawn Network** — fleet share flagged (any heuristic): 45.45% (_(first snapshot — baseline recorded)_) _(low · conf 0.55)_

**Network health & capacity**
- **WeatherXM** — 288 cells exceed designed capacity — §1 lists H3 indices + map centers for your ops queue. _(medium · conf 0.70)_
- **WeatherXM** — cells over designed capacity: 288 (-1 (-0.3%)) _(low · conf 0.85)_
- **WeatherXM** — share of map over capacity: 3.39% (-0.01 pp (-0.4%)) _(low · conf 0.85)_
- **Grass / Titan** — Flagged Anomalies: 1 (16.7%) _(medium · conf 0.70)_
- **Grass / Titan** — exact (lat,lng) duplicate groups: 0 (_(first snapshot — baseline recorded)_) _(low · conf 0.55)_
- **Grass / Titan** — entities on public map: 200 (_(first snapshot — baseline recorded)_) _(low · conf 0.55)_
- **Grass / Titan** — fleet share flagged (any heuristic): 45.00% (_(first snapshot — baseline recorded)_) _(low · conf 0.55)_

**Coverage growth**
- **WeatherXM** — entities on public map: 8,492 (+3 (+0.0%)) _(low · conf 0.85)_

**Token economics**
- **Hivemapper** — 49.13% of UI-reported HONEY sits in the top 20 visible SPL accounts (Solana RPC cap) — economic *shape* for treasury/MM review, not a contributor GPS read. _(medium · conf 0.70)_
- **Hivemapper** — top-20 SPL share of UI supply: 49.13% (-0.02 pp (-0.0%)) _(low · conf 0.85)_

### Signal Type

- **Registry & identity integrity** (`integrity`) — 12 signal(s) across 3 network(s): Dawn Network, Geodnet, Nodle
- **Network health & capacity** (`health`) — 7 signal(s) across 2 network(s): Grass / Titan, WeatherXM
- **Coverage growth** (`growth`) — 1 signal(s) across 1 network(s): WeatherXM
- **Token economics** (`economics`) — 2 signal(s) across 1 network(s): Hivemapper

### Signal Context

_Operational context for observed metrics — not verdicts._
- **Registry & identity integrity** — public integrity signals across Dawn Network, Geodnet, Nodle.
- **Network health & capacity** — public health signals across Grass / Titan, WeatherXM.
- **Coverage growth** — public growth signals across WeatherXM.
- **Token economics** — public economics signals across Hivemapper.

### What We Don't Know

- **Registry & identity integrity** — Whether shared/duplicated identifiers are legitimate co-located installs or registry artifacts — only operator confirmation settles it.
- **Network health & capacity** — Whether capacity or telemetry anomalies reflect real on-the-ground activity, ETL/display behavior, or registry double-counting — the public feed alone can't say.
- **Coverage growth** — Whether registry growth reflects new physical deployments or registration churn — counts alone don't prove device reality.
- **Token economics** — Whether the largest visible accounts are treasury, market-maker, exchange custody, or operators — on-chain shape doesn't label holder intent.

### Network Breakdown

### Geodnet
- [integrity] 11 exact (lat,lng) duplicate groups on 19,616 public stations — each row in §1 is one coordinate pair your registry team can grep today. _(medium · conf 0.70)_
- [integrity] exact (lat,lng) duplicate groups: 11 (+3 (+37.5%)) _(high · conf 0.85)_
- [integrity] entities on public map: 19,616 (-60 (-0.3%)) _(low · conf 0.85)_
- [integrity] fleet share flagged (any heuristic): 9.34% (-0.00 pp (-0.0%)) _(low · conf 0.85)_

### WeatherXM
- [health] 288 cells exceed designed capacity — §1 lists H3 indices + map centers for your ops queue. _(medium · conf 0.70)_
- [growth] entities on public map: 8,492 (+3 (+0.0%)) _(low · conf 0.85)_
- [health] cells over designed capacity: 288 (-1 (-0.3%)) _(low · conf 0.85)_
- [health] share of map over capacity: 3.39% (-0.01 pp (-0.4%)) _(low · conf 0.85)_

### Hivemapper
- [economics] 49.13% of UI-reported HONEY sits in the top 20 visible SPL accounts (Solana RPC cap) — economic *shape* for treasury/MM review, not a contributor GPS read. _(medium · conf 0.70)_
- [economics] top-20 SPL share of UI supply: 49.13% (-0.02 pp (-0.0%)) _(low · conf 0.85)_

### NATIX
- _No qualifying public finding in latest snapshot._

### Nodle
- [integrity] Flagged Emulator Nodes: 25 (38.5% of pool) _(medium · conf 0.70)_
- [integrity] exact (lat,lng) duplicate groups: 15 (_(first snapshot — baseline recorded)_) _(low · conf 0.55)_
- [integrity] entities on public map: 65 (_(first snapshot — baseline recorded)_) _(low · conf 0.55)_
- [integrity] fleet share flagged (any heuristic): 38.46% (_(first snapshot — baseline recorded)_) _(low · conf 0.55)_

### Dawn Network
- [integrity] Flagged Anomalous Nodes: 25 (45.5% of pool) _(medium · conf 0.70)_
- [integrity] exact (lat,lng) duplicate groups: 15 (_(first snapshot — baseline recorded)_) _(low · conf 0.55)_
- [integrity] entities on public map: 55 (_(first snapshot — baseline recorded)_) _(low · conf 0.55)_
- [integrity] fleet share flagged (any heuristic): 45.45% (_(first snapshot — baseline recorded)_) _(low · conf 0.55)_

### DIMO
- _No public scanner wired yet — included for cross-network coverage._

### Grass / Titan
- [health] Flagged Anomalies: 1 (16.7%) _(medium · conf 0.70)_
- [health] exact (lat,lng) duplicate groups: 0 (_(first snapshot — baseline recorded)_) _(low · conf 0.55)_
- [health] entities on public map: 200 (_(first snapshot — baseline recorded)_) _(low · conf 0.55)_
- [health] fleet share flagged (any heuristic): 45.00% (_(first snapshot — baseline recorded)_) _(low · conf 0.55)_

## Methodology

- Automated pipeline: ingest public data → detect standardized signals → cross-network aggregate → publish.
- Cross-network first by contract; per-network breakdown is secondary and never volume-ranked.
- Signals are reproducible public reads (`scripts/sybil-scan-*.mjs`). Evidence, not verdicts.
- Feed JSON: `signals/<cadence>/latest.json` · API: `/api/signals/latest.json`
