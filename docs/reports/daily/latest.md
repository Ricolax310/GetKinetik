# Daily DePIN Signal Brief

> 2026-09-14 · automated cross-network pipeline · evidence not verdicts

## Today's Read

• Geodnet duplicate-coordinate groups rose from 1,012 to 1,014.
• WeatherXM over-capacity cells rose from 298 to 299.
• Geodnet entities on public map rose from 19,481 to 19,503.
• DIMO entities on public map rose from 158,656 to 158,666.

## Why It Matters

Today's signals show modest movement in concentration metrics. Telemetry and concentration readings are largely unchanged.
The observed changes are incremental rather than structural and remain reproducible from public data sources.
Observations span 6 networks — no single network dominates the index.

## Full Evidence

### Cross-Network Summary

| Sector | Signals | Networks | Top severity |
|---|---:|---|---|
| Registry & identity integrity | 4 | Geodnet, Helium IoT, Helium Mobile | medium |
| Network health & capacity | 3 | DIMO, WeatherXM | medium |
| Coverage growth | 2 | DIMO, Geodnet | low |
| Token economics | 1 | Hivemapper | medium |

_Totals: 10 signal(s) across 6/7 networks._

### What Changed Today

**Registry & identity integrity**
- **Geodnet** — 1014 exact (lat,lng) duplicate groups on 19,503 public stations — each row in §1 is one coordinate pair your registry team can grep today. _(medium · conf 0.70)_
- **Geodnet** — exact (lat,lng) duplicate groups: 1,014 (+2 (+0.2%)) _(low · conf 0.85)_
- **Helium IoT** — 4,861 single-coordinate stacks of ≥10 hotspots on 1,008,248 located units — the largest stack holds 501 hotspots on one coordinate (§1 lists keys your registry team can grep today). _(medium · conf 0.70)_
- **Helium Mobile** — 531 single-coordinate stacks of ≥10 hotspots on 56,003 located units — the largest stack holds 540 hotspots on one coordinate (§1 lists keys your registry team can grep today). _(medium · conf 0.70)_

**Network health & capacity**
- **WeatherXM** — 299 cells exceed designed capacity — §1 lists H3 indices + map centers for your ops queue. _(medium · conf 0.70)_
- **WeatherXM** — cells over designed capacity: 299 (+1 (+0.3%)) _(low · conf 0.85)_
- **DIMO** — Of 158,666 DIMO vehicle identities, 40,622 (25.6%) are backed by physical hardware; 31,437 (19.8%) connect via software/synthetic devices, and 86,607 (54.6%) show no connected device on the public registry. _(medium · conf 0.70)_

**Coverage growth**
- **Geodnet** — entities on public map: 19,503 (+22 (+0.1%)) _(low · conf 0.85)_
- **DIMO** — entities on public map: 158,666 (+10 (+0.0%)) _(low · conf 0.85)_

**Token economics**
- **Hivemapper** — 52.63% of UI-reported HONEY sits in the top 20 visible SPL accounts (Solana RPC cap) — economic *shape* for treasury/MM review, not a contributor GPS read. _(medium · conf 0.70)_

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
- [integrity] 1014 exact (lat,lng) duplicate groups on 19,503 public stations — each row in §1 is one coordinate pair your registry team can grep today. _(medium · conf 0.70)_
- [integrity] exact (lat,lng) duplicate groups: 1,014 (+2 (+0.2%)) _(low · conf 0.85)_
- [growth] entities on public map: 19,503 (+22 (+0.1%)) _(low · conf 0.85)_

### WeatherXM
- [health] 299 cells exceed designed capacity — §1 lists H3 indices + map centers for your ops queue. _(medium · conf 0.70)_
- [health] cells over designed capacity: 299 (+1 (+0.3%)) _(low · conf 0.85)_

### Hivemapper
- [economics] 52.63% of UI-reported HONEY sits in the top 20 visible SPL accounts (Solana RPC cap) — economic *shape* for treasury/MM review, not a contributor GPS read. _(medium · conf 0.70)_

### NATIX
- _No qualifying public finding in latest snapshot._

### Helium IoT
- [integrity] 4,861 single-coordinate stacks of ≥10 hotspots on 1,008,248 located units — the largest stack holds 501 hotspots on one coordinate (§1 lists keys your registry team can grep today). _(medium · conf 0.70)_

### Helium Mobile
- [integrity] 531 single-coordinate stacks of ≥10 hotspots on 56,003 located units — the largest stack holds 540 hotspots on one coordinate (§1 lists keys your registry team can grep today). _(medium · conf 0.70)_

### DIMO
- [health] Of 158,666 DIMO vehicle identities, 40,622 (25.6%) are backed by physical hardware; 31,437 (19.8%) connect via software/synthetic devices, and 86,607 (54.6%) show no connected device on the public registry. _(medium · conf 0.70)_
- [growth] entities on public map: 158,666 (+10 (+0.0%)) _(low · conf 0.85)_

## Methodology

- Automated pipeline: ingest public data → detect standardized signals → cross-network aggregate → publish.
- Cross-network first by contract; per-network breakdown is secondary and never volume-ranked.
- Signals are reproducible public reads (`scripts/sybil-scan-*.mjs`). Evidence, not verdicts.
- Feed JSON: `signals/<cadence>/latest.json` · API: `/api/signals/latest.json`
