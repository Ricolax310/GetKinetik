# Daily DePIN Signal Brief

> 2026-09-25 · automated cross-network pipeline · evidence not verdicts

## Today's Read

• Helium Mobile largest hotspot stack rose from 565 to 631.
• Geodnet duplicate-coordinate groups declined from 1,003 to 1,002.
• WeatherXM over-capacity cells unchanged at 300.

## Why It Matters

Today's signals show movement in concentration metrics, with at least one high-severity read observable on public data.
The observed changes are reproducible from public endpoints and remain non-conclusive without operator confirmation.
Observations span 6 networks — no single network dominates the index.

## Full Evidence

### Cross-Network Summary

| Sector | Signals | Networks | Top severity |
|---|---:|---|---|
| Registry & identity integrity | 6 | Geodnet, Helium IoT, Helium Mobile | high |
| Network health & capacity | 2 | DIMO, WeatherXM | medium |
| Token economics | 1 | Hivemapper | medium |

_Totals: 9 signal(s) across 6/7 networks._

### What Changed Today

**Registry & identity integrity**
- **Geodnet** — 1002 exact (lat,lng) duplicate groups on 19,490 public stations — each row in §1 is one coordinate pair your registry team can grep today. _(medium · conf 0.70)_
- **Geodnet** — exact (lat,lng) duplicate groups: 1,002 (-1 (-0.1%)) _(low · conf 0.85)_
- **Helium IoT** — 4,861 single-coordinate stacks of ≥10 hotspots on 1,008,267 located units — the largest stack holds 501 hotspots on one coordinate (§1 lists keys your registry team can grep today). _(medium · conf 0.70)_
- **Helium Mobile** — 530 single-coordinate stacks of ≥10 hotspots on 56,118 located units — the largest stack holds 631 hotspots on one coordinate (§1 lists keys your registry team can grep today). _(medium · conf 0.70)_
- **Helium Mobile** — single-coordinate stacks (≥10 hotspots): 530 (-1 (-0.2%)) _(low · conf 0.85)_
- **Helium Mobile** — largest single-coordinate stack: 631 (+66 (+11.7%)) _(high · conf 0.85)_

**Network health & capacity**
- **WeatherXM** — 300 cells exceed designed capacity — §1 lists H3 indices + map centers for your ops queue. _(medium · conf 0.70)_
- **DIMO** — Of 158,688 DIMO vehicle identities, 40,622 (25.6%) are backed by physical hardware; 31,406 (19.8%) connect via software/synthetic devices, and 86,660 (54.6%) show no connected device on the public registry. _(medium · conf 0.70)_

**Token economics**
- **Hivemapper** — 52.46% of UI-reported HONEY sits in the top 20 visible SPL accounts (Solana RPC cap) — economic *shape* for treasury/MM review, not a contributor GPS read. _(medium · conf 0.70)_

### Signal Type

- **Registry & identity integrity** (`integrity`) — 6 signal(s) across 3 network(s): Geodnet, Helium IoT, Helium Mobile
- **Network health & capacity** (`health`) — 2 signal(s) across 2 network(s): DIMO, WeatherXM
- **Token economics** (`economics`) — 1 signal(s) across 1 network(s): Hivemapper

### Signal Context

_Operational context for observed metrics — not verdicts._
- **Registry & identity integrity** — public integrity signals across Geodnet, Helium IoT, Helium Mobile.
- **Network health & capacity** — public health signals across DIMO, WeatherXM.
- **Token economics** — public economics signals across Hivemapper.

### What We Don't Know

- **Registry & identity integrity** — Whether shared/duplicated identifiers are legitimate co-located installs or registry artifacts — only operator confirmation settles it.
- **Network health & capacity** — Whether capacity or telemetry anomalies reflect real on-the-ground activity, ETL/display behavior, or registry double-counting — the public feed alone can't say.
- **Token economics** — Whether the largest visible accounts are treasury, market-maker, exchange custody, or operators — on-chain shape doesn't label holder intent.

### Network Breakdown

### Geodnet
- [integrity] 1002 exact (lat,lng) duplicate groups on 19,490 public stations — each row in §1 is one coordinate pair your registry team can grep today. _(medium · conf 0.70)_
- [integrity] exact (lat,lng) duplicate groups: 1,002 (-1 (-0.1%)) _(low · conf 0.85)_

### WeatherXM
- [health] 300 cells exceed designed capacity — §1 lists H3 indices + map centers for your ops queue. _(medium · conf 0.70)_

### Hivemapper
- [economics] 52.46% of UI-reported HONEY sits in the top 20 visible SPL accounts (Solana RPC cap) — economic *shape* for treasury/MM review, not a contributor GPS read. _(medium · conf 0.70)_

### NATIX
- _No qualifying public finding in latest snapshot._

### Helium IoT
- [integrity] 4,861 single-coordinate stacks of ≥10 hotspots on 1,008,267 located units — the largest stack holds 501 hotspots on one coordinate (§1 lists keys your registry team can grep today). _(medium · conf 0.70)_

### Helium Mobile
- [integrity] 530 single-coordinate stacks of ≥10 hotspots on 56,118 located units — the largest stack holds 631 hotspots on one coordinate (§1 lists keys your registry team can grep today). _(medium · conf 0.70)_
- [integrity] single-coordinate stacks (≥10 hotspots): 530 (-1 (-0.2%)) _(low · conf 0.85)_
- [integrity] largest single-coordinate stack: 631 (+66 (+11.7%)) _(high · conf 0.85)_

### DIMO
- [health] Of 158,688 DIMO vehicle identities, 40,622 (25.6%) are backed by physical hardware; 31,406 (19.8%) connect via software/synthetic devices, and 86,660 (54.6%) show no connected device on the public registry. _(medium · conf 0.70)_

## Methodology

- Automated pipeline: ingest public data → detect standardized signals → cross-network aggregate → publish.
- Cross-network first by contract; per-network breakdown is secondary and never volume-ranked.
- Signals are reproducible public reads (`scripts/sybil-scan-*.mjs`). Evidence, not verdicts.
- Feed JSON: `signals/<cadence>/latest.json` · API: `/api/signals/latest.json`
