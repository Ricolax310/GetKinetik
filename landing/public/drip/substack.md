# DePIN Signal Intelligence — Week 23

> Week 23 · machine-driven signal publication · evidence first

## Executive Summary

• Week 23: cross-network signal index updated from public infrastructure reads.
• 0 publishable signal(s) across 0 network(s) met the weekly confidence gate.
• 16 cross-network pattern(s) tagged: IDENTITY, CAPACITY, ECONOMICS, IDENTITY, INFRASTRUCTURE, IDENTITY, IDENTITY, INFRASTRUCTURE, IDENTITY, IDENTITY, INFRASTRUCTURE, IDENTITY, INFRASTRUCTURE, IDENTITY, INFRASTRUCTURE, CAPACITY.
• 16 systemic-scope pattern(s) recorded with multi-network support.

## This Week In Signals

No signals met the weekly confidence threshold (0.8) this window.

## Cross-Network Patterns

Taxonomy v2: CAPACITY · IDENTITY · CONSISTENCY · ECONOMICS · BEHAVIORAL · INFRASTRUCTURE

### Geodnet: repeated exactDupGroups observation

- **Category:** IDENTITY
- **Scope:** systemic
- **Classification:** repetition
- **Networks:** Geodnet

Observed Geodnet exactDupGroups on 6 of 6 recorded days.

### WeatherXM: repeated overCapacityCells observation

- **Category:** CAPACITY
- **Scope:** systemic
- **Classification:** repetition
- **Networks:** WeatherXM

Observed WeatherXM overCapacityCells on 6 of 6 recorded days.

### Hivemapper: repeated top20ShareOfSupply observation

- **Category:** ECONOMICS
- **Scope:** systemic
- **Classification:** repetition
- **Networks:** Hivemapper

Observed Hivemapper top20ShareOfSupply on 6 of 6 recorded days.

### Geodnet: repeated observed observation

- **Category:** INFRASTRUCTURE
- **Scope:** systemic
- **Classification:** repetition
- **Networks:** Geodnet

Observed Geodnet observed on 4 of 6 recorded days.

### Geodnet: repeated flaggedPct observation

- **Category:** IDENTITY
- **Scope:** systemic
- **Classification:** repetition
- **Networks:** Geodnet

Observed Geodnet flaggedPct on 4 of 6 recorded days.

### WeatherXM: repeated observed observation

- **Category:** INFRASTRUCTURE
- **Scope:** systemic
- **Classification:** repetition
- **Networks:** WeatherXM

Observed WeatherXM observed on 4 of 6 recorded days.

### WeatherXM: repeated overCapacityPct observation

- **Category:** CAPACITY
- **Scope:** systemic
- **Classification:** repetition
- **Networks:** WeatherXM

Observed WeatherXM overCapacityPct on 4 of 6 recorded days.



## Systemic Observations

- Geodnet: repeated exactDupGroups observation: Observed Geodnet exactDupGroups on 6 of 6 recorded days.
- WeatherXM: repeated overCapacityCells observation: Observed WeatherXM overCapacityCells on 6 of 6 recorded days.
- Hivemapper: repeated top20ShareOfSupply observation: Observed Hivemapper top20ShareOfSupply on 6 of 6 recorded days.
- Geodnet: repeated observed observation: Observed Geodnet observed on 4 of 6 recorded days.
- Geodnet: repeated flaggedPct observation: Observed Geodnet flaggedPct on 4 of 6 recorded days.
- WeatherXM: repeated observed observation: Observed WeatherXM observed on 4 of 6 recorded days.
- WeatherXM: repeated overCapacityPct observation: Observed WeatherXM overCapacityPct on 4 of 6 recorded days.


## Data Appendix

### Cross-Network Summary

| Sector | Signals | Networks | Top severity |
|---|---:|---|---|
| Coverage growth | 1 | WeatherXM | low |
| Token economics | 2 | Hivemapper | medium |

### What Changed Today

**Registry & identity integrity**
- **Geodnet** — 11 exact (lat,lng) duplicate groups on 19,616 public stations — each row in §1 is one coordinate pair your registry team can review today. _(medium · conf 0.70)_
- **Geodnet** — exact (lat,lng) duplicate groups: 11 (+3 (+37.5%)) _(high · conf 0.85)_
- **Geodnet** — entities on public map: 19,616 (-60 (-0.3%)) _(low · conf 0.85)_
- **Geodnet** — fleet share flagged (any heuristic): 9.34% (-0.00 pp (-0.0%)) _(low · conf 0.85)_

**Network health & capacity**
- **WeatherXM** — 288 cells exceed designed capacity — §1 lists H3 indices + map centers for your review queue. _(medium · conf 0.70)_
- **WeatherXM** — cells over designed capacity: 288 (-1 (-0.3%)) _(low · conf 0.85)_
- **WeatherXM** — share of map over capacity: 3.39% (-0.01 pp (-0.4%)) _(low · conf 0.85)_

**Coverage growth**
- **WeatherXM** — entities on public map: 8,492 (+3 (+0.0%)) _(low · conf 0.85)_

**Token economics**
- **Hivemapper** — 49.13% of UI-reported HONEY sits in the top 20 visible SPL accounts (Solana RPC cap) — economic *shape* for treasury/MM review, not a contributor GPS read. _(medium · conf 0.70)_
- **Hivemapper** — top-20 SPL share of UI supply: 49.13% (-0.02 pp (-0.0%)) _(low · conf 0.85)_

### Trends

_Comparing 2026-06-02 → 2026-06-07 (6 runs)._

- **integrity**: 1 → 12 ▲ (+11)
- **health**: 5 → 7 ▲ (+2)
- **growth**: 0 → 1 ▲ (+1)
- **economics**: 1 → 2 ▲ (+1)

### Signal Type

- **Coverage growth** (`growth`) — 1 signal(s) across 1 network(s): WeatherXM
- **Token economics** (`economics`) — 2 signal(s) across 1 network(s): Hivemapper

### What We Don't Know

- **Registry & identity integrity** — Whether shared/duplicated identifiers are legitimate co-located installs or registry artifacts — only operator confirmation settles it.
- **Network health & capacity** — Whether capacity or telemetry anomalies reflect real on-the-ground activity, ETL/display behavior, or registry double-counting — the public feed alone can't say.
- **Coverage growth** — Whether registry growth reflects new physical deployments or registration churn — counts alone don't prove device reality.
- **Token economics** — Whether the largest visible accounts are treasury, market-maker, exchange custody, or operators — on-chain shape doesn't label holder intent.

### Network Watch

### Geodnet
- [integrity] 11 exact (lat,lng) duplicate groups on 19,616 public stations — each row in §1 is one coordinate pair your registry team can review today. _(medium · conf 0.70)_
- [integrity] exact (lat,lng) duplicate groups: 11 (+3 (+37.5%)) _(high · conf 0.85)_
- [integrity] entities on public map: 19,616 (-60 (-0.3%)) _(low · conf 0.85)_
- [integrity] fleet share flagged (any heuristic): 9.34% (-0.00 pp (-0.0%)) _(low · conf 0.85)_

### WeatherXM
- [health] 288 cells exceed designed capacity — §1 lists H3 indices + map centers for your review queue. _(medium · conf 0.70)_
- [growth] entities on public map: 8,492 (+3 (+0.0%)) _(low · conf 0.85)_
- [health] cells over designed capacity: 288 (-1 (-0.3%)) _(low · conf 0.85)_
- [health] share of map over capacity: 3.39% (-0.01 pp (-0.4%)) _(low · conf 0.85)_

### Hivemapper
- [economics] 49.13% of UI-reported HONEY sits in the top 20 visible SPL accounts (Solana RPC cap) — economic *shape* for treasury/MM review, not a contributor GPS read. _(medium · conf 0.70)_
- [economics] top-20 SPL share of UI supply: 49.13% (-0.02 pp (-0.0%)) _(low · conf 0.85)_

### NATIX
- _No qualifying public finding in latest snapshot._

### DIMO
- _No public scanner wired yet — included for cross-network coverage._

