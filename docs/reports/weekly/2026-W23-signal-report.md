# Weekly DePIN Signal Report

> Week 2026-W23 · 2026-06-01 → 2026-06-07 · patterns first, then networks.

## Executive Summary

- Week 2026-W23: cross-network signal index updated from public infrastructure reads.
- 16 publishable signal(s) across 6 network(s) met the weekly confidence gate.
- 1 cross-network pattern(s) tagged: IDENTITY.
- 1 systemic-scope pattern(s) recorded with multi-network support.

## Cross-Network Patterns

Taxonomy v2: CAPACITY · IDENTITY · CONSISTENCY · ECONOMICS · BEHAVIORAL · INFRASTRUCTURE

### CAPACITY

**Observed in:**
- WeatherXM

**Signal:** Over-capacity H3 cells declined from 289 to 288.

**Scope:** localized

**Classification:** stability

**Unknown:** Public data cannot determine whether pressure reflects density, registry effects, or expected reward behavior.

### IDENTITY

**Observed in:**
- Geodnet
- Nodle
- Dawn Network

**Signal:** Exact coordinate-duplicate groups rose from 8 to 11 on Geodnet.

**Scope:** systemic

**Classification:** escalation

**Unknown:** Public data cannot confirm whether shared coordinates are distinct devices or one identity reused.

### ECONOMICS

**Observed in:**
- Hivemapper

**Signal:** Top-20 account share of supply observed near 49.13%.

**Scope:** localized

**Classification:** concentration

**Unknown:** Public data cannot determine whether concentrated holdings are treasury, market-maker, exchange custody, or operators.

## Network Watch

### WeatherXM

**What changed**
- entities on public map: 8,492 (+3 (+0.0%))
- cells over designed capacity: 288 (-1 (-0.3%))
- share of map over capacity: 3.39% (-0.01 pp (-0.4%))

**Signal type**
- Capacity pressure (`capacity_violation`)

**Trend**
- multiple deltas observed

**Open question**
- On the public cells view, do over-capacity H3 counts match your internal registry and rewards model?

**What we don't know**
- Whether over-capacity cells reflect real device density, registry double-counting, or expected reward-zone behavior — only the operator's internal registry settles it.

### Geodnet

**What changed**
- exact (lat,lng) duplicate groups: 11 (+3 (+37.5%))
- entities on public map: 19,616 (-60 (-0.3%))
- fleet share flagged (any heuristic): 9.34% (-0.00 pp (-0.0%))

**Signal type**
- Registry duplication (`duplication_cluster`)

**Trend**
- multiple deltas observed

**Open question**
- For stations sharing an exact coordinate pair on the public registry, is that expected registration behavior or a dedupe gap worth reconciling?

**What we don't know**
- Whether shared coordinates are legitimate co-located installs, shared-mount sites, or registry artifacts — public data can't tell without operator confirmation.

### Natix Network

_No public signal this week — scan not run or no headline finding._

### Hivemapper

**What changed**
- top-20 SPL share of UI supply: 49.13% (-0.02 pp (-0.0%))

**Signal type**
- Economic concentration (`economic_concentration`)

**Trend**
- multiple deltas observed

**Open question**
- Do the largest visible SPL accounts map to known treasury or market-maker custody labels on your side?

**What we don't know**
- Whether the largest visible accounts are treasury, market-maker, exchange custody, or operators — on-chain shape doesn't label holder intent.

### Nodle

**What changed**
- exact (lat,lng) duplicate groups: 15 (_(first snapshot — baseline recorded)_)
- entities on public map: 65 (_(first snapshot — baseline recorded)_)
- fleet share flagged (any heuristic): 38.46% (_(first snapshot — baseline recorded)_)

**Signal type**
- Identity collision (`identity_collision`)

**Trend**
- flat week

**Open question**
- Does the public read for Nodle match what your team sees internally, or is the public feed expected to look this way?

**What we don't know**
- Whether colliding identifiers are distinct physical devices or one identity reused — public maps don't expose device-level attestation.

### Dawn Network

**What changed**
- exact (lat,lng) duplicate groups: 15 (_(first snapshot — baseline recorded)_)
- entities on public map: 55 (_(first snapshot — baseline recorded)_)
- fleet share flagged (any heuristic): 45.45% (_(first snapshot — baseline recorded)_)

**Signal type**
- Identity collision (`identity_collision`)

**Trend**
- flat week

**Open question**
- Does the public read for Dawn Network match what your team sees internally, or is the public feed expected to look this way?

**What we don't know**
- Whether colliding identifiers are distinct physical devices or one identity reused — public maps don't expose device-level attestation.

### Grass / Titan

**What changed**
- exact (lat,lng) duplicate groups: 0 (_(first snapshot — baseline recorded)_)
- entities on public map: 200 (_(first snapshot — baseline recorded)_)
- fleet share flagged (any heuristic): 45.00% (_(first snapshot — baseline recorded)_)

**Signal type**
- Uncategorized public observation (`scaffold`)

**Trend**
- flat week

**Open question**
- Does the public read for Grass / Titan match what your team sees internally, or is the public feed expected to look this way?

**What we don't know**
- What the public feed cannot disambiguate without operator confirmation.

## Data Appendix

### What Changed Today

_Latest reading: 2026-06-07_

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

### Signals To Watch

- On the public cells view, do over-capacity H3 counts match your internal registry and rewards model?
- For stations sharing an exact coordinate pair on the public registry, is that expected registration behavior or a dedupe gap worth reconciling?
- Is the public Coverage Map metrics feed expected to show flat KM mapped / zero detections while driver registrations keep rising?
- Do the largest visible SPL accounts map to known treasury or market-maker custody labels on your side?
- Does the public read for Nodle match what your team sees internally, or is the public feed expected to look this way?
- Does the public read for Dawn Network match what your team sees internally, or is the public feed expected to look this way?

### Sources & Methodology

- Weekly report aggregates **daily signal briefs** and latest audit snapshots.
- Patterns lead; network detail and raw evidence follow. Narratives appear only when tied to observations above.
- Public scans: `scripts/sybil-scan-*.mjs` · Index: `scripts/data/bureau-audit-index.json`
