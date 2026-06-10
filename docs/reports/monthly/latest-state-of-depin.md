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
- **Helium IoT** — entities on public map: 1,008,019 (_(first snapshot — baseline recorded)_)
- **Helium IoT** — single-coordinate stacks (≥10 hotspots): 4,855 (_(first snapshot — baseline recorded)_)
- **Helium IoT** — largest single-coordinate stack: 501 (_(first snapshot — baseline recorded)_)
- **Helium IoT** — fleet share flagged (any heuristic): 6.91% (_(first snapshot — baseline recorded)_)

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
- Helium IoT: 4,855 single-coordinate stacks of ≥10 hotspots on 1,008,019 located units — the largest stack holds 501 hotspots on one coordinate (§1 lists keys your registry team can grep today).
- Helium IoT: entities on public map 1,008,019 (_(first snapshot — baseline recorded)_)
- Helium IoT: single-coordinate stacks (≥10 hotspots) 4,855 (_(first snapshot — baseline recorded)_)
- Helium IoT: largest single-coordinate stack 501 (_(first snapshot — baseline recorded)_)
- Helium IoT: fleet share flagged (any heuristic) 6.91% (_(first snapshot — baseline recorded)_)
- Helium Mobile: 529 single-coordinate stacks of ≥10 hotspots on 54,682 located units — the largest stack holds 497 hotspots on one coordinate (§1 lists keys your registry team can grep today).

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
- **Helium IoT** — Registry duplication (`duplication_cluster`)
- **Helium Mobile** — Registry duplication (`duplication_cluster`)

## Network snapshot (public reads)

### WeatherXM
- 288 cells exceed designed capacity — §1 lists H3 indices + map centers for your ops queue.

### Geodnet
- 11 exact (lat,lng) duplicate groups on 19,616 public stations — each row in §1 is one coordinate pair your registry team can grep today.

### Hivemapper
- 49.13% of UI-reported HONEY sits in the top 20 visible SPL accounts (Solana RPC cap) — economic *shape* for treasury/MM review, not a contributor GPS read.

### Helium IoT
- 4,855 single-coordinate stacks of ≥10 hotspots on 1,008,019 located units — the largest stack holds 501 hotspots on one coordinate (§1 lists keys your registry team can grep today).

### Helium Mobile
- 529 single-coordinate stacks of ≥10 hotspots on 54,682 located units — the largest stack holds 497 hotspots on one coordinate (§1 lists keys your registry team can grep today).

## What We Don't Know

- **WeatherXM** — Whether over-capacity cells reflect real device density, registry double-counting, or expected reward-zone behavior — only the operator's internal registry settles it.
- **Geodnet** — Whether shared coordinates are legitimate co-located installs, shared-mount sites, or registry artifacts — public data can't tell without operator confirmation.
- **Hivemapper** — Whether the largest visible accounts are treasury, market-maker, exchange custody, or operators — on-chain shape doesn't label holder intent.
- **Helium IoT** — Whether shared coordinates are legitimate co-located installs, shared-mount sites, or registry artifacts — public data can't tell without operator confirmation.
- **Helium Mobile** — Whether shared coordinates are legitimate co-located installs, shared-mount sites, or registry artifacts — public data can't tell without operator confirmation.

## Methodology

- 8 daily signal record(s) in 2026-06.
- Themed sections appear only when observations exist in audit snapshots / daily signals.
- Full audit reports: [getkinetik.app/audits](https://getkinetik.app/audits.html)
