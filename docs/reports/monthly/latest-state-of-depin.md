# State of DePIN

> 2026-06 · narratives derived from accumulated public observations only.

_Rule: signals create reports; reports create narratives. Observations below precede any narrative label._

## What Changed Today

_Latest reading: 2026-06-16_

- **Geodnet** — exact (lat,lng) duplicate groups: 10 (-1 (-9.1%))
- **WeatherXM** — entities on public map: 8,502 (+6 (+0.1%))
- **WeatherXM** — cells over designed capacity: 284 (-1 (-0.4%))
- **Helium IoT** — entities on public map: 1,008,046 (+6 (+0.0%))
- **Helium IoT** — largest single-coordinate stack: 502 (+1 (+0.2%))

## Capacity pressure

**Supporting observations**
- WeatherXM: 284 cells exceed designed capacity — §1 lists H3 indices + map centers for your ops queue.
- WeatherXM: cells over designed capacity 284 (-1 (-0.4%))

## Registry quality

**Supporting observations**
- Geodnet: 10 exact (lat,lng) duplicate groups on 19,618 public stations — each row in §1 is one coordinate pair your registry team can grep today.
- Geodnet: exact (lat,lng) duplicate groups 10 (-1 (-9.1%))
- Helium IoT: 4,858 single-coordinate stacks of ≥10 hotspots on 1,008,046 located units — the largest stack holds 502 hotspots on one coordinate (§1 lists keys your registry team can grep today).
- Helium IoT: largest single-coordinate stack 502 (+1 (+0.2%))
- Helium Mobile: 529 single-coordinate stacks of ≥10 hotspots on 54,703 located units — the largest stack holds 497 hotspots on one coordinate (§1 lists keys your registry team can grep today).

## Geographic expansion

**Supporting observations**
- WeatherXM: entities on public map 8,502 (+6 (+0.1%))
- Helium IoT: entities on public map 1,008,046 (+6 (+0.0%))

## Reward concentration

**Supporting observations**
- Hivemapper: 49.17% of UI-reported HONEY sits in the top 20 visible SPL accounts (Solana RPC cap) — economic *shape* for treasury/MM review, not a contributor GPS read.

## Signal Type

- **WeatherXM** — Capacity pressure (`capacity_violation`)
- **Geodnet** — Registry duplication (`duplication_cluster`)
- **Hivemapper** — Economic concentration (`economic_concentration`)
- **Helium IoT** — Registry duplication (`duplication_cluster`)
- **Helium Mobile** — Registry duplication (`duplication_cluster`)

## Network snapshot (public reads)

### WeatherXM
- 284 cells exceed designed capacity — §1 lists H3 indices + map centers for your ops queue.

### Geodnet
- 10 exact (lat,lng) duplicate groups on 19,618 public stations — each row in §1 is one coordinate pair your registry team can grep today.

### Hivemapper
- 49.17% of UI-reported HONEY sits in the top 20 visible SPL accounts (Solana RPC cap) — economic *shape* for treasury/MM review, not a contributor GPS read.

### Helium IoT
- 4,858 single-coordinate stacks of ≥10 hotspots on 1,008,046 located units — the largest stack holds 502 hotspots on one coordinate (§1 lists keys your registry team can grep today).

### Helium Mobile
- 529 single-coordinate stacks of ≥10 hotspots on 54,703 located units — the largest stack holds 497 hotspots on one coordinate (§1 lists keys your registry team can grep today).

## What We Don't Know

- **WeatherXM** — Whether over-capacity cells reflect real device density, registry double-counting, or expected reward-zone behavior — only the operator's internal registry settles it.
- **Geodnet** — Whether shared coordinates are legitimate co-located installs, shared-mount sites, or registry artifacts — public data can't tell without operator confirmation.
- **Hivemapper** — Whether the largest visible accounts are treasury, market-maker, exchange custody, or operators — on-chain shape doesn't label holder intent.
- **Helium IoT** — Whether shared coordinates are legitimate co-located installs, shared-mount sites, or registry artifacts — public data can't tell without operator confirmation.
- **Helium Mobile** — Whether shared coordinates are legitimate co-located installs, shared-mount sites, or registry artifacts — public data can't tell without operator confirmation.

## Methodology

- 14 daily signal record(s) in 2026-06.
- Themed sections appear only when observations exist in audit snapshots / daily signals.
- Full audit reports: [getkinetik.app/audits](https://getkinetik.app/audits.html)
