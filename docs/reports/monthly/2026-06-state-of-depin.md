# State of DePIN

> 2026-06 · narratives derived from accumulated public observations only.

_Rule: signals create reports; reports create narratives. Observations below precede any narrative label._

## What Changed Today

_Latest reading: 2026-06-10_

- **Geodnet** — exact (lat,lng) duplicate groups: 11 (+3 (+37.5%))
- **Geodnet** — entities on public map: 19,616 (-60 (-0.3%))
- **Geodnet** — fleet share flagged (any heuristic): 9.34% (-0.00 pp (-0.0%))
- **WeatherXM** — entities on public map: 8,492 (+3 (+0.0%))
- **WeatherXM** — cells over designed capacity: 288 (-1 (-0.3%))
- **WeatherXM** — share of map over capacity: 3.39% (-0.01 pp (-0.4%))
- **Hivemapper** — top-20 SPL share of UI supply: 49.13% (-0.02 pp (-0.0%))
- **Nodle** — exact (lat,lng) duplicate groups: 15 (_(first snapshot — baseline recorded)_)
- **Nodle** — entities on public map: 65 (_(first snapshot — baseline recorded)_)
- **Nodle** — fleet share flagged (any heuristic): 38.46% (_(first snapshot — baseline recorded)_)
- **Dawn Network** — exact (lat,lng) duplicate groups: 15 (_(first snapshot — baseline recorded)_)
- **Dawn Network** — entities on public map: 55 (_(first snapshot — baseline recorded)_)
- **Dawn Network** — fleet share flagged (any heuristic): 45.45% (_(first snapshot — baseline recorded)_)
- **Grass / Titan** — exact (lat,lng) duplicate groups: 0 (_(first snapshot — baseline recorded)_)
- **Grass / Titan** — entities on public map: 200 (_(first snapshot — baseline recorded)_)
- **Grass / Titan** — fleet share flagged (any heuristic): 45.00% (_(first snapshot — baseline recorded)_)

## Capacity pressure

**Supporting observations**
- WeatherXM: 288 cells exceed designed capacity — §1 lists H3 indices + map centers for your ops queue.
- WeatherXM: cells over designed capacity 288 (-1 (-0.3%))
- WeatherXM: share of map over capacity 3.39% (-0.01 pp (-0.4%))

## Registry quality

**Supporting observations**
- Geodnet: 11 exact (lat,lng) duplicate groups on 19,616 public stations — each row in §1 is one coordinate pair your registry team can grep today.
- Geodnet: exact (lat,lng) duplicate groups 11 (+3 (+37.5%))
- Geodnet: entities on public map 19,616 (-60 (-0.3%))
- Geodnet: fleet share flagged (any heuristic) 9.34% (-0.00 pp (-0.0%))
- Nodle: Flagged Emulator Nodes: 25 (38.5% of pool)
- Nodle: exact (lat,lng) duplicate groups 15 (_(first snapshot — baseline recorded)_)
- Nodle: entities on public map 65 (_(first snapshot — baseline recorded)_)
- Nodle: fleet share flagged (any heuristic) 38.46% (_(first snapshot — baseline recorded)_)
- Dawn Network: Flagged Anomalous Nodes: 25 (45.5% of pool)
- Dawn Network: exact (lat,lng) duplicate groups 15 (_(first snapshot — baseline recorded)_)
- Dawn Network: entities on public map 55 (_(first snapshot — baseline recorded)_)
- Dawn Network: fleet share flagged (any heuristic) 45.45% (_(first snapshot — baseline recorded)_)

## Geographic expansion

**Supporting observations**
- WeatherXM: entities on public map 8,492 (+3 (+0.0%))

## Reward concentration

**Supporting observations**
- Hivemapper: 49.13% of UI-reported HONEY sits in the top 20 visible SPL accounts (Solana RPC cap) — economic *shape* for treasury/MM review, not a contributor GPS read.
- Hivemapper: top-20 SPL share of UI supply 49.13% (-0.02 pp (-0.0%))

## Signal Type

- **WeatherXM** — Capacity pressure (`capacity_violation`)
- **Geodnet** — Registry duplication (`duplication_cluster`)
- **Hivemapper** — Economic concentration (`economic_concentration`)
- **Nodle** — Identity collision (`identity_collision`)
- **Dawn Network** — Identity collision (`identity_collision`)
- **Grass / Titan** — Uncategorized public observation (`scaffold`)

## Network snapshot (public reads)

### WeatherXM
- 288 cells exceed designed capacity — §1 lists H3 indices + map centers for your ops queue.

### Geodnet
- 11 exact (lat,lng) duplicate groups on 19,616 public stations — each row in §1 is one coordinate pair your registry team can grep today.

### Hivemapper
- 49.13% of UI-reported HONEY sits in the top 20 visible SPL accounts (Solana RPC cap) — economic *shape* for treasury/MM review, not a contributor GPS read.

### Nodle
- Flagged Emulator Nodes: 25 (38.5% of pool)

### Dawn Network
- Flagged Anomalous Nodes: 25 (45.5% of pool)

### Grass / Titan
- Flagged Anomalies: 1 (16.7%)

## What We Don't Know

- **WeatherXM** — Whether over-capacity cells reflect real device density, registry double-counting, or expected reward-zone behavior — only the operator's internal registry settles it.
- **Geodnet** — Whether shared coordinates are legitimate co-located installs, shared-mount sites, or registry artifacts — public data can't tell without operator confirmation.
- **Hivemapper** — Whether the largest visible accounts are treasury, market-maker, exchange custody, or operators — on-chain shape doesn't label holder intent.
- **Nodle** — Whether colliding identifiers are distinct physical devices or one identity reused — public maps don't expose device-level attestation.
- **Dawn Network** — Whether colliding identifiers are distinct physical devices or one identity reused — public maps don't expose device-level attestation.
- **Grass / Titan** — What the public feed cannot disambiguate without operator confirmation.

## Methodology

- 8 daily signal record(s) in 2026-06.
- Themed sections appear only when observations exist in audit snapshots / daily signals.
- Full audit reports: [getkinetik.app/audits](https://getkinetik.app/audits.html)
