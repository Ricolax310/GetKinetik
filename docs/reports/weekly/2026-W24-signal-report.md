# Weekly DePIN Signal Report

> Week 2026-W24 · 2026-06-08 → 2026-06-13 · patterns first, then networks.

## Executive Summary

- Week 2026-W24: cross-network signal index updated from public infrastructure reads.
- 11 publishable signal(s) across 5 network(s) met the weekly confidence gate.
- 1 cross-network pattern(s) tagged: IDENTITY.
- 1 systemic-scope pattern(s) recorded with multi-network support.

## Cross-Network Patterns

Taxonomy v2: CAPACITY · IDENTITY · CONSISTENCY · ECONOMICS · BEHAVIORAL · INFRASTRUCTURE

### CAPACITY

**Observed in:**
- WeatherXM

**Signal:** Over-capacity H3 cells rose from 287 to 289.

**Scope:** localized

**Classification:** escalation

**Unknown:** Public data cannot determine whether pressure reflects density, registry effects, or expected reward behavior.

### IDENTITY

**Observed in:**
- Geodnet
- Helium IoT
- Helium Mobile

**Signal:** Exact coordinate-duplicate groups declined from 10 to 8 on Geodnet.

**Scope:** systemic

**Classification:** stability

**Unknown:** Public data cannot confirm whether shared coordinates are distinct devices or one identity reused.

### ECONOMICS

**Observed in:**
- Hivemapper

**Signal:** Top-20 account share of supply observed near 49.20%.

**Scope:** localized

**Classification:** concentration

**Unknown:** Public data cannot determine whether concentrated holdings are treasury, market-maker, exchange custody, or operators.

## Network Watch

### WeatherXM

**What changed**
- entities on public map: 8,497 (+3 (+0.0%))
- cells over designed capacity: 289 (+2 (+0.7%))
- share of map over capacity: 3.40% (+0.02 pp (+0.7%))

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
- exact (lat,lng) duplicate groups: 8 (-2 (-20.0%))
- entities on public map: 19,614 (+17 (+0.1%))
- fleet share flagged (any heuristic): 9.27% (-0.04 pp (-0.4%))

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
- top-20 SPL share of UI supply: 49.20% (-0.01 pp (-0.0%))

**Signal type**
- Economic concentration (`economic_concentration`)

**Trend**
- multiple deltas observed

**Open question**
- Do the largest visible SPL accounts map to known treasury or market-maker custody labels on your side?

**What we don't know**
- Whether the largest visible accounts are treasury, market-maker, exchange custody, or operators — on-chain shape doesn't label holder intent.

### Helium IoT

**What changed**
- entities on public map: 1,008,023 (+1 (+0.0%))
- fleet share flagged (any heuristic): 6.91% (-0.00 pp (-0.0%))

**Signal type**
- Registry duplication (`duplication_cluster`)

**Trend**
- multiple deltas observed

**Open question**
- Does the public read for Helium IoT match what your team sees internally, or is the public feed expected to look this way?

**What we don't know**
- Whether shared coordinates are legitimate co-located installs, shared-mount sites, or registry artifacts — public data can't tell without operator confirmation.

### Helium Mobile

**What changed**
- entities on public map: 54,689 (+1 (+0.0%))
- fleet share flagged (any heuristic): 20.57% (-0.00 pp (-0.0%))

**Signal type**
- Registry duplication (`duplication_cluster`)

**Trend**
- multiple deltas observed

**Open question**
- Does the public read for Helium Mobile match what your team sees internally, or is the public feed expected to look this way?

**What we don't know**
- Whether shared coordinates are legitimate co-located installs, shared-mount sites, or registry artifacts — public data can't tell without operator confirmation.

## Data Appendix

### What Changed Today

_Latest reading: 2026-06-13_

- **Geodnet** — exact (lat,lng) duplicate groups: 8 (-2 (-20.0%))
- **Geodnet** — entities on public map: 19,614 (+17 (+0.1%))
- **Geodnet** — fleet share flagged (any heuristic): 9.27% (-0.04 pp (-0.4%))
- **WeatherXM** — entities on public map: 8,497 (+3 (+0.0%))
- **WeatherXM** — cells over designed capacity: 289 (+2 (+0.7%))
- **WeatherXM** — share of map over capacity: 3.40% (+0.02 pp (+0.7%))
- **Hivemapper** — top-20 SPL share of UI supply: 49.20% (-0.01 pp (-0.0%))
- **Helium IoT** — entities on public map: 1,008,023 (+1 (+0.0%))
- **Helium IoT** — fleet share flagged (any heuristic): 6.91% (-0.00 pp (-0.0%))
- **Helium Mobile** — entities on public map: 54,689 (+1 (+0.0%))
- **Helium Mobile** — fleet share flagged (any heuristic): 20.57% (-0.00 pp (-0.0%))

### Signals To Watch

- On the public cells view, do over-capacity H3 counts match your internal registry and rewards model?
- For stations sharing an exact coordinate pair on the public registry, is that expected registration behavior or a dedupe gap worth reconciling?
- Do the largest visible SPL accounts map to known treasury or market-maker custody labels on your side?
- Does the public read for Helium IoT match what your team sees internally, or is the public feed expected to look this way?
- Does the public read for Helium Mobile match what your team sees internally, or is the public feed expected to look this way?
- Is the public Coverage Map metrics feed expected to show flat KM mapped / zero detections while driver registrations keep rising?

### Sources & Methodology

- Weekly report aggregates **daily signal briefs** and latest audit snapshots.
- Patterns lead; network detail and raw evidence follow. Narratives appear only when tied to observations above.
- Public scans: `scripts/sybil-scan-*.mjs` · Index: `scripts/data/bureau-audit-index.json`
