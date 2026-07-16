# Daily DePIN Signal Brief

> 2026-07-16 · automated cross-network pipeline · evidence not verdicts

## Today's Read

• Geodnet duplicate-coordinate groups rose from 7 to 8.
• WeatherXM over-capacity cells rose from 287 to 290.
• DIMO entities on public map rose from 158,273 to 158,282.
• Geodnet entities on public map rose from 19,574 to 19,582.

## Why It Matters

Today's signals show movement in concentration metrics, with at least one high-severity read observable on public data.
The observed changes are reproducible from public endpoints and remain non-conclusive without operator confirmation.
Observations span 6 networks — no single network dominates the index.

## Full Evidence

### Cross-Network Summary

| Sector | Signals | Networks | Top severity |
|---|---:|---|---|
| Registry & identity integrity | 4 | Geodnet, Helium IoT, Helium Mobile | high |
| Network health & capacity | 3 | DIMO, WeatherXM | medium |
| Coverage growth | 2 | DIMO, Geodnet | low |
| Token economics | 1 | Hivemapper | medium |

_Totals: 10 signal(s) across 6/7 networks._

### What Changed Today

**Registry & identity integrity**
- **Geodnet** — 8 exact (lat,lng) duplicate groups on 19,582 public stations — each row in §1 is one coordinate pair your registry team can grep today. _(medium · conf 0.70)_
- **Geodnet** — exact (lat,lng) duplicate groups: 8 (+1 (+14.3%)) _(high · conf 0.85)_
- **Helium IoT** — 4,859 single-coordinate stacks of ≥10 hotspots on 1,008,116 located units — the largest stack holds 502 hotspots on one coordinate (§1 lists keys your registry team can grep today). _(medium · conf 0.70)_
- **Helium Mobile** — 528 single-coordinate stacks of ≥10 hotspots on 54,800 located units — the largest stack holds 497 hotspots on one coordinate (§1 lists keys your registry team can grep today). _(medium · conf 0.70)_

**Network health & capacity**
- **WeatherXM** — 290 cells exceed designed capacity — §1 lists H3 indices + map centers for your ops queue. _(medium · conf 0.70)_
- **WeatherXM** — cells over designed capacity: 290 (+3 (+1.0%)) _(medium · conf 0.85)_
- **DIMO** — Of 158,282 DIMO vehicle identities, 40,622 (25.7%) are backed by physical hardware; 31,420 (19.9%) connect via software/synthetic devices, and 86,240 (54.5%) show no connected device on the public registry. _(medium · conf 0.70)_

**Coverage growth**
- **Geodnet** — entities on public map: 19,582 (+8 (+0.0%)) _(low · conf 0.85)_
- **DIMO** — entities on public map: 158,282 (+9 (+0.0%)) _(low · conf 0.85)_

**Token economics**
- **Hivemapper** — 50.65% of UI-reported HONEY sits in the top 20 visible SPL accounts (Solana RPC cap) — economic *shape* for treasury/MM review, not a contributor GPS read. _(medium · conf 0.70)_

### Signal Type

- **Registry & identity integrity** (`integrity`) — 4 signal(s) across 3 network(s): Geodnet, Helium IoT, Helium Mobile
- **Network health & capacity** (`health`) — 3 signal(s) across 2 network(s): DIMO, WeatherXM
- **Coverage growth** (`growth`) — 2 signal(s) across 2 network(s): DIMO, Geodnet
- **Token economics** (`economics`) — 1 signal(s) across 1 network(s): Hivemapper

### Signal Context

_Operational context for observed metrics — not verdicts._
- **Registry & identity integrity** — public integrity signals across Geodnet, Helium IoT, Helium Mobile.
- **Network health & capacity** — public health signals across DIMO, WeatherXM.
- **Coverage growth** — public growth signals across DIMO, Geodnet.
- **Token economics** — public economics signals across Hivemapper.

### What We Don't Know

- **Registry & identity integrity** — Whether shared/duplicated identifiers are legitimate co-located installs or registry artifacts — only operator confirmation settles it.
- **Network health & capacity** — Whether capacity or telemetry anomalies reflect real on-the-ground activity, ETL/display behavior, or registry double-counting — the public feed alone can't say.
- **Coverage growth** — Whether registry growth reflects new physical deployments or registration churn — counts alone don't prove device reality.
- **Token economics** — Whether the largest visible accounts are treasury, market-maker, exchange custody, or operators — on-chain shape doesn't label holder intent.

### Network Breakdown

### Geodnet
- [integrity] 8 exact (lat,lng) duplicate groups on 19,582 public stations — each row in §1 is one coordinate pair your registry team can grep today. _(medium · conf 0.70)_
- [integrity] exact (lat,lng) duplicate groups: 8 (+1 (+14.3%)) _(high · conf 0.85)_
- [growth] entities on public map: 19,582 (+8 (+0.0%)) _(low · conf 0.85)_

### WeatherXM
- [health] 290 cells exceed designed capacity — §1 lists H3 indices + map centers for your ops queue. _(medium · conf 0.70)_
- [health] cells over designed capacity: 290 (+3 (+1.0%)) _(medium · conf 0.85)_

### Hivemapper
- [economics] 50.65% of UI-reported HONEY sits in the top 20 visible SPL accounts (Solana RPC cap) — economic *shape* for treasury/MM review, not a contributor GPS read. _(medium · conf 0.70)_

### NATIX
- _No qualifying public finding in latest snapshot._

### Helium IoT
- [integrity] 4,859 single-coordinate stacks of ≥10 hotspots on 1,008,116 located units — the largest stack holds 502 hotspots on one coordinate (§1 lists keys your registry team can grep today). _(medium · conf 0.70)_

### Helium Mobile
- [integrity] 528 single-coordinate stacks of ≥10 hotspots on 54,800 located units — the largest stack holds 497 hotspots on one coordinate (§1 lists keys your registry team can grep today). _(medium · conf 0.70)_

### DIMO
- [health] Of 158,282 DIMO vehicle identities, 40,622 (25.7%) are backed by physical hardware; 31,420 (19.9%) connect via software/synthetic devices, and 86,240 (54.5%) show no connected device on the public registry. _(medium · conf 0.70)_
- [growth] entities on public map: 158,282 (+9 (+0.0%)) _(low · conf 0.85)_

## Methodology

- Automated pipeline: ingest public data → detect standardized signals → cross-network aggregate → publish.
- Cross-network first by contract; per-network breakdown is secondary and never volume-ranked.
- Signals are reproducible public reads (`scripts/sybil-scan-*.mjs`). Evidence, not verdicts.
- Feed JSON: `signals/<cadence>/latest.json` · API: `/api/signals/latest.json`
