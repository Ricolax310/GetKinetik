# Daily DePIN Signal Brief

> 2026-08-19 · automated cross-network pipeline · evidence not verdicts

## Today's Read

• Geodnet duplicate-coordinate groups declined from 6 to 5.
• WeatherXM over-capacity cells declined from 290 to 285.
• WeatherXM over-capacity share remains near 3% of visible supply.
• Helium Mobile entities on public map rose from 54,915 to 54,964.

## Why It Matters

Today's signals show movement in concentration metrics, with at least one high-severity read observable on public data.
The observed changes are reproducible from public endpoints and remain non-conclusive without operator confirmation.
Observations span 6 networks — no single network dominates the index.

## Full Evidence

### Cross-Network Summary

| Sector | Signals | Networks | Top severity |
|---|---:|---|---|
| Registry & identity integrity | 4 | Geodnet, Helium IoT, Helium Mobile | high |
| Network health & capacity | 4 | DIMO, WeatherXM | medium |
| Coverage growth | 1 | Helium Mobile | low |
| Token economics | 1 | Hivemapper | medium |

_Totals: 10 signal(s) across 6/7 networks._

### What Changed Today

**Registry & identity integrity**
- **Geodnet** — 5 exact (lat,lng) duplicate groups on 19,486 public stations — each row in §1 is one coordinate pair your registry team can grep today. _(medium · conf 0.70)_
- **Geodnet** — exact (lat,lng) duplicate groups: 5 (-1 (-16.7%)) _(high · conf 0.85)_
- **Helium IoT** — 4,860 single-coordinate stacks of ≥10 hotspots on 1,008,185 located units — the largest stack holds 501 hotspots on one coordinate (§1 lists keys your registry team can grep today). _(medium · conf 0.70)_
- **Helium Mobile** — 526 single-coordinate stacks of ≥10 hotspots on 54,964 located units — the largest stack holds 540 hotspots on one coordinate (§1 lists keys your registry team can grep today). _(medium · conf 0.70)_

**Network health & capacity**
- **WeatherXM** — 285 cells exceed designed capacity — §1 lists H3 indices + map centers for your ops queue. _(medium · conf 0.70)_
- **WeatherXM** — cells over designed capacity: 285 (-5 (-1.7%)) _(medium · conf 0.85)_
- **WeatherXM** — share of map over capacity: 3.35% (-0.06 pp (-1.8%)) _(medium · conf 0.85)_
- **DIMO** — Of 158,542 DIMO vehicle identities, 40,622 (25.6%) are backed by physical hardware; 31,451 (19.8%) connect via software/synthetic devices, and 86,469 (54.5%) show no connected device on the public registry. _(medium · conf 0.70)_

**Coverage growth**
- **Helium Mobile** — entities on public map: 54,964 (+49 (+0.1%)) _(low · conf 0.85)_

**Token economics**
- **Hivemapper** — 47.73% of UI-reported HONEY sits in the top 20 visible SPL accounts (Solana RPC cap) — economic *shape* for treasury/MM review, not a contributor GPS read. _(medium · conf 0.70)_

### Signal Type

- **Registry & identity integrity** (`integrity`) — 4 signal(s) across 3 network(s): Geodnet, Helium IoT, Helium Mobile
- **Network health & capacity** (`health`) — 4 signal(s) across 2 network(s): DIMO, WeatherXM
- **Coverage growth** (`growth`) — 1 signal(s) across 1 network(s): Helium Mobile
- **Token economics** (`economics`) — 1 signal(s) across 1 network(s): Hivemapper

### Signal Context

_Operational context for observed metrics — not verdicts._
- **Registry & identity integrity** — public integrity signals across Geodnet, Helium IoT, Helium Mobile.
- **Network health & capacity** — public health signals across DIMO, WeatherXM.
- **Coverage growth** — public growth signals across Helium Mobile.
- **Token economics** — public economics signals across Hivemapper.

### What We Don't Know

- **Registry & identity integrity** — Whether shared/duplicated identifiers are legitimate co-located installs or registry artifacts — only operator confirmation settles it.
- **Network health & capacity** — Whether capacity or telemetry anomalies reflect real on-the-ground activity, ETL/display behavior, or registry double-counting — the public feed alone can't say.
- **Coverage growth** — Whether registry growth reflects new physical deployments or registration churn — counts alone don't prove device reality.
- **Token economics** — Whether the largest visible accounts are treasury, market-maker, exchange custody, or operators — on-chain shape doesn't label holder intent.

### Network Breakdown

### Geodnet
- [integrity] 5 exact (lat,lng) duplicate groups on 19,486 public stations — each row in §1 is one coordinate pair your registry team can grep today. _(medium · conf 0.70)_
- [integrity] exact (lat,lng) duplicate groups: 5 (-1 (-16.7%)) _(high · conf 0.85)_

### WeatherXM
- [health] 285 cells exceed designed capacity — §1 lists H3 indices + map centers for your ops queue. _(medium · conf 0.70)_
- [health] cells over designed capacity: 285 (-5 (-1.7%)) _(medium · conf 0.85)_
- [health] share of map over capacity: 3.35% (-0.06 pp (-1.8%)) _(medium · conf 0.85)_

### Hivemapper
- [economics] 47.73% of UI-reported HONEY sits in the top 20 visible SPL accounts (Solana RPC cap) — economic *shape* for treasury/MM review, not a contributor GPS read. _(medium · conf 0.70)_

### NATIX
- _No qualifying public finding in latest snapshot._

### Helium IoT
- [integrity] 4,860 single-coordinate stacks of ≥10 hotspots on 1,008,185 located units — the largest stack holds 501 hotspots on one coordinate (§1 lists keys your registry team can grep today). _(medium · conf 0.70)_

### Helium Mobile
- [integrity] 526 single-coordinate stacks of ≥10 hotspots on 54,964 located units — the largest stack holds 540 hotspots on one coordinate (§1 lists keys your registry team can grep today). _(medium · conf 0.70)_
- [growth] entities on public map: 54,964 (+49 (+0.1%)) _(low · conf 0.85)_

### DIMO
- [health] Of 158,542 DIMO vehicle identities, 40,622 (25.6%) are backed by physical hardware; 31,451 (19.8%) connect via software/synthetic devices, and 86,469 (54.5%) show no connected device on the public registry. _(medium · conf 0.70)_

## Methodology

- Automated pipeline: ingest public data → detect standardized signals → cross-network aggregate → publish.
- Cross-network first by contract; per-network breakdown is secondary and never volume-ranked.
- Signals are reproducible public reads (`scripts/sybil-scan-*.mjs`). Evidence, not verdicts.
- Feed JSON: `signals/<cadence>/latest.json` · API: `/api/signals/latest.json`
