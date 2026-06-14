# DePIN Signal Intelligence — Week 24

> Week 24 · machine-driven signal publication · evidence first

## Executive Summary

• Week 24: cross-network signal index updated from public infrastructure reads.
• 1 publishable signal(s) across 1 network(s) met the weekly confidence gate.
• 11 cross-network pattern(s) tagged: IDENTITY, IDENTITY, IDENTITY, INFRASTRUCTURE, CAPACITY, INFRASTRUCTURE, CAPACITY, ECONOMICS, INFRASTRUCTURE, INFRASTRUCTURE, INFRASTRUCTURE.
• 11 systemic-scope pattern(s) recorded with multi-network support.

## This Week In Signals

Cross-network summary: 1 signal(s) across 1 network(s) from public infrastructure reads.

**Geodnet**
- Geodnet: 9.3% flagged pct (+0 pp)


## Cross-Network Patterns

Taxonomy v2: CAPACITY · IDENTITY · CONSISTENCY · ECONOMICS · BEHAVIORAL · INFRASTRUCTURE

### Geodnet: repeated exactDupGroups observation

- **Category:** IDENTITY
- **Scope:** systemic
- **Classification:** repetition
- **Networks:** Geodnet

Observed Geodnet exactDupGroups on 7 of 7 recorded days.

### Geodnet: repeated flaggedPct observation

- **Category:** IDENTITY
- **Scope:** systemic
- **Classification:** repetition
- **Networks:** Geodnet

Observed Geodnet flaggedPct on 6 of 7 recorded days.

### Helium Mobile: repeated flaggedPct observation

- **Category:** IDENTITY
- **Scope:** systemic
- **Classification:** repetition
- **Networks:** Helium Mobile

Observed Helium Mobile flaggedPct on 5 of 7 recorded days.

### Geodnet: repeated observed observation

- **Category:** INFRASTRUCTURE
- **Scope:** systemic
- **Classification:** repetition
- **Networks:** Geodnet

Observed Geodnet observed on 7 of 7 recorded days.

### WeatherXM: repeated overCapacityCells observation

- **Category:** CAPACITY
- **Scope:** systemic
- **Classification:** repetition
- **Networks:** WeatherXM

Observed WeatherXM overCapacityCells on 7 of 7 recorded days.

### WeatherXM: repeated observed observation

- **Category:** INFRASTRUCTURE
- **Scope:** systemic
- **Classification:** repetition
- **Networks:** WeatherXM

Observed WeatherXM observed on 7 of 7 recorded days.

### WeatherXM: repeated overCapacityPct observation

- **Category:** CAPACITY
- **Scope:** systemic
- **Classification:** repetition
- **Networks:** WeatherXM

Observed WeatherXM overCapacityPct on 7 of 7 recorded days.

### Hivemapper: repeated top20ShareOfSupply observation

- **Category:** ECONOMICS
- **Scope:** systemic
- **Classification:** repetition
- **Networks:** Hivemapper

Observed Hivemapper top20ShareOfSupply on 7 of 7 recorded days.

### Helium IoT: repeated stackedSpots observation

- **Category:** INFRASTRUCTURE
- **Scope:** systemic
- **Classification:** repetition
- **Networks:** Helium IoT

Observed Helium IoT stackedSpots on 5 of 7 recorded days.

### Helium Mobile: repeated stackedSpots observation

- **Category:** INFRASTRUCTURE
- **Scope:** systemic
- **Classification:** repetition
- **Networks:** Helium Mobile

Observed Helium Mobile stackedSpots on 5 of 7 recorded days.

### Helium Mobile: repeated observed observation

- **Category:** INFRASTRUCTURE
- **Scope:** systemic
- **Classification:** repetition
- **Networks:** Helium Mobile

Observed Helium Mobile observed on 4 of 7 recorded days.

### Geodnet: identity registry stress signal detected

- **Category:** IDENTITY
- **Scope:** localized
- **Classification:** drift
- **Networks:** Geodnet

Observed identity signal on Geodnet (flaggedPct).



## Systemic Observations

- Geodnet: repeated exactDupGroups observation: Observed Geodnet exactDupGroups on 7 of 7 recorded days.
- Geodnet: repeated flaggedPct observation: Observed Geodnet flaggedPct on 6 of 7 recorded days.
- Helium Mobile: repeated flaggedPct observation: Observed Helium Mobile flaggedPct on 5 of 7 recorded days.
- Geodnet: repeated observed observation: Observed Geodnet observed on 7 of 7 recorded days.
- WeatherXM: repeated overCapacityCells observation: Observed WeatherXM overCapacityCells on 7 of 7 recorded days.
- WeatherXM: repeated observed observation: Observed WeatherXM observed on 7 of 7 recorded days.
- WeatherXM: repeated overCapacityPct observation: Observed WeatherXM overCapacityPct on 7 of 7 recorded days.
- Hivemapper: repeated top20ShareOfSupply observation: Observed Hivemapper top20ShareOfSupply on 7 of 7 recorded days.
- Helium IoT: repeated stackedSpots observation: Observed Helium IoT stackedSpots on 5 of 7 recorded days.
- Helium Mobile: repeated stackedSpots observation: Observed Helium Mobile stackedSpots on 5 of 7 recorded days.
- Helium Mobile: repeated observed observation: Observed Helium Mobile observed on 4 of 7 recorded days.


## Data Appendix

### What Changed Today

_Latest reading: 2026-06-14_

- **Geodnet** — exact (lat,lng) duplicate groups: 13 (+5 (+62.5%))
- **Geodnet** — entities on public map: 19,623 (+9 (+0.0%))
- **Geodnet** — fleet share flagged (any heuristic): 9.31% (+0.03 pp (+0.3%))
- **WeatherXM** — entities on public map: 8,498 (+1 (+0.0%))
- **WeatherXM** — cells over designed capacity: 287 (-2 (-0.7%))
- **WeatherXM** — share of map over capacity: 3.38% (-0.02 pp (-0.7%))
- **Hivemapper** — top-20 SPL share of UI supply: 49.18% (-0.02 pp (-0.0%))
- **Helium IoT** — entities on public map: 1,008,034 (+11 (+0.0%))
- **Helium IoT** — single-coordinate stacks (≥10 hotspots): 4,857 (+1 (+0.0%))
- **Helium Mobile** — entities on public map: 54,691 (+2 (+0.0%))
- **Helium Mobile** — fleet share flagged (any heuristic): 20.57% (-0.00 pp (-0.0%))

### Signals To Watch

- On the public cells view, do over-capacity H3 counts match your internal registry and rewards model?
- For stations sharing an exact coordinate pair on the public registry, is that expected registration behavior or a dedupe gap worth reconciling?
- Do the largest visible SPL accounts map to known treasury or market-maker custody labels on your side?
- Does the public read for Helium IoT match what your team sees internally, or is the public feed expected to look this way?
- Does the public read for Helium Mobile match what your team sees internally, or is the public feed expected to look this way?
- Is the public Coverage Map metrics feed expected to show flat KM mapped / zero detections while driver registrations keep rising?

### Sources & Methodology

- Weekly report aggregates **daily signal briefs** and latest signal view snapshots.
- Patterns lead; network detail and raw evidence follow. Narratives appear only when tied to observations above.
- Public scans: `scripts/duplication-scan-*.mjs` · Index: `scripts/data/signal index-signal view-index.json`
