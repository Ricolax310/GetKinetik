# Daily DePIN Signal Brief

> 2026-08-26 · automated cross-network pipeline · evidence not verdicts

## Today's Read

• Geodnet duplicate-coordinate groups rose from 8 to 1,007.
• Geodnet flagged fleet share rose from 9% to 27% of visible supply.
• Hivemapper visible HONEY concentration rose from 48% to 51% of visible supply.
• WeatherXM over-capacity cells unchanged at 292.
• DIMO entities on public map rose from 158,587 to 158,600.
• WeatherXM entities on public map rose from 8,505 to 8,513.

## Why It Matters

Today's signals show movement in concentration metrics, with at least one high-severity read observable on public data.
The observed changes are reproducible from public endpoints and remain non-conclusive without operator confirmation.
Observations span 6 networks — no single network dominates the index.

## Full Evidence

### Cross-Network Summary

| Sector | Signals | Networks | Top severity |
|---|---:|---|---|
| Registry & identity integrity | 5 | Geodnet, Helium IoT, Helium Mobile | high |
| Network health & capacity | 2 | DIMO, WeatherXM | medium |
| Coverage growth | 3 | DIMO, Helium Mobile, WeatherXM | low |
| Token economics | 2 | Hivemapper | high |

_Totals: 12 signal(s) across 6/7 networks._

### What Changed Today

**Registry & identity integrity**
- **Geodnet** — 1007 exact (lat,lng) duplicate groups on 19,508 public stations — each row in §1 is one coordinate pair your registry team can grep today. _(medium · conf 0.70)_
- **Geodnet** — exact (lat,lng) duplicate groups: 1,007 (+999 (+12487.5%)) _(high · conf 0.85)_
- **Geodnet** — fleet share flagged (any heuristic): 27.37% (+18.16 pp (+197.3%)) _(high · conf 0.85)_
- **Helium IoT** — 4,860 single-coordinate stacks of ≥10 hotspots on 1,008,190 located units — the largest stack holds 501 hotspots on one coordinate (§1 lists keys your registry team can grep today). _(medium · conf 0.70)_
- **Helium Mobile** — 529 single-coordinate stacks of ≥10 hotspots on 55,549 located units — the largest stack holds 540 hotspots on one coordinate (§1 lists keys your registry team can grep today). _(medium · conf 0.70)_

**Network health & capacity**
- **WeatherXM** — 292 cells exceed designed capacity — §1 lists H3 indices + map centers for your ops queue. _(medium · conf 0.70)_
- **DIMO** — Of 158,600 DIMO vehicle identities, 40,622 (25.6%) are backed by physical hardware; 31,449 (19.8%) connect via software/synthetic devices, and 86,529 (54.6%) show no connected device on the public registry. _(medium · conf 0.70)_

**Coverage growth**
- **WeatherXM** — entities on public map: 8,513 (+8 (+0.1%)) _(low · conf 0.85)_
- **Helium Mobile** — entities on public map: 55,549 (+8 (+0.0%)) _(low · conf 0.85)_
- **DIMO** — entities on public map: 158,600 (+13 (+0.0%)) _(low · conf 0.85)_

**Token economics**
- **Hivemapper** — 50.67% of UI-reported HONEY sits in the top 20 visible SPL accounts (Solana RPC cap) — economic *shape* for treasury/MM review, not a contributor GPS read. _(medium · conf 0.70)_
- **Hivemapper** — top-20 SPL share of UI supply: 50.67% (+2.88 pp (+6.0%)) _(high · conf 0.85)_

### Signal Type

- **Registry & identity integrity** (`integrity`) — 5 signal(s) across 3 network(s): Geodnet, Helium IoT, Helium Mobile
- **Network health & capacity** (`health`) — 2 signal(s) across 2 network(s): DIMO, WeatherXM
- **Coverage growth** (`growth`) — 3 signal(s) across 3 network(s): DIMO, Helium Mobile, WeatherXM
- **Token economics** (`economics`) — 2 signal(s) across 1 network(s): Hivemapper

### Signal Context

_Operational context for observed metrics — not verdicts._
- **Registry & identity integrity** — public integrity signals across Geodnet, Helium IoT, Helium Mobile.
- **Network health & capacity** — public health signals across DIMO, WeatherXM.
- **Coverage growth** — public growth signals across DIMO, Helium Mobile, WeatherXM.
- **Token economics** — public economics signals across Hivemapper.

### What We Don't Know

- **Registry & identity integrity** — Whether shared/duplicated identifiers are legitimate co-located installs or registry artifacts — only operator confirmation settles it.
- **Network health & capacity** — Whether capacity or telemetry anomalies reflect real on-the-ground activity, ETL/display behavior, or registry double-counting — the public feed alone can't say.
- **Coverage growth** — Whether registry growth reflects new physical deployments or registration churn — counts alone don't prove device reality.
- **Token economics** — Whether the largest visible accounts are treasury, market-maker, exchange custody, or operators — on-chain shape doesn't label holder intent.

### Network Breakdown

### Geodnet
- [integrity] 1007 exact (lat,lng) duplicate groups on 19,508 public stations — each row in §1 is one coordinate pair your registry team can grep today. _(medium · conf 0.70)_
- [integrity] exact (lat,lng) duplicate groups: 1,007 (+999 (+12487.5%)) _(high · conf 0.85)_
- [integrity] fleet share flagged (any heuristic): 27.37% (+18.16 pp (+197.3%)) _(high · conf 0.85)_

### WeatherXM
- [health] 292 cells exceed designed capacity — §1 lists H3 indices + map centers for your ops queue. _(medium · conf 0.70)_
- [growth] entities on public map: 8,513 (+8 (+0.1%)) _(low · conf 0.85)_

### Hivemapper
- [economics] 50.67% of UI-reported HONEY sits in the top 20 visible SPL accounts (Solana RPC cap) — economic *shape* for treasury/MM review, not a contributor GPS read. _(medium · conf 0.70)_
- [economics] top-20 SPL share of UI supply: 50.67% (+2.88 pp (+6.0%)) _(high · conf 0.85)_

### NATIX
- _No qualifying public finding in latest snapshot._

### Helium IoT
- [integrity] 4,860 single-coordinate stacks of ≥10 hotspots on 1,008,190 located units — the largest stack holds 501 hotspots on one coordinate (§1 lists keys your registry team can grep today). _(medium · conf 0.70)_

### Helium Mobile
- [integrity] 529 single-coordinate stacks of ≥10 hotspots on 55,549 located units — the largest stack holds 540 hotspots on one coordinate (§1 lists keys your registry team can grep today). _(medium · conf 0.70)_
- [growth] entities on public map: 55,549 (+8 (+0.0%)) _(low · conf 0.85)_

### DIMO
- [health] Of 158,600 DIMO vehicle identities, 40,622 (25.6%) are backed by physical hardware; 31,449 (19.8%) connect via software/synthetic devices, and 86,529 (54.6%) show no connected device on the public registry. _(medium · conf 0.70)_
- [growth] entities on public map: 158,600 (+13 (+0.0%)) _(low · conf 0.85)_

## Methodology

- Automated pipeline: ingest public data → detect standardized signals → cross-network aggregate → publish.
- Cross-network first by contract; per-network breakdown is secondary and never volume-ranked.
- Signals are reproducible public reads (`scripts/sybil-scan-*.mjs`). Evidence, not verdicts.
- Feed JSON: `signals/<cadence>/latest.json` · API: `/api/signals/latest.json`
