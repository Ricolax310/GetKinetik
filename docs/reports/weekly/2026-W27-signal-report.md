# Weekly DePIN Signal Report

> Week 2026-W27 · 2026-06-29 → 2026-07-04 · patterns first, then networks.

## Executive Summary

- Week 2026-W27: cross-network signal index updated from public infrastructure reads.
- 2 publishable signal(s) across 6 network(s) met the weekly confidence gate.
- 1 cross-network pattern(s) tagged: IDENTITY.
- 1 systemic-scope pattern(s) recorded with multi-network support.

## Cross-Network Patterns

Taxonomy v2: CAPACITY · IDENTITY · CONSISTENCY · ECONOMICS · BEHAVIORAL · INFRASTRUCTURE

### CAPACITY

**Observed in:**
- WeatherXM

**Signal:** Over-capacity H3 cells declined from 290 to 289.

**Scope:** localized

**Classification:** stability

**Unknown:** Public data cannot determine whether pressure reflects density, registry effects, or expected reward behavior.

### IDENTITY

**Observed in:**
- Geodnet
- Helium IoT
- Helium Mobile

**Signal:** Exact coordinate-duplicate groups observed at 9 on Geodnet.

**Scope:** systemic

**Classification:** stability

**Unknown:** Public data cannot confirm whether shared coordinates are distinct devices or one identity reused.

### ECONOMICS

**Observed in:**
- Hivemapper

**Signal:** Top-20 account share of supply observed near 49.04%.

**Scope:** localized

**Classification:** concentration

**Unknown:** Public data cannot determine whether concentrated holdings are treasury, market-maker, exchange custody, or operators.

## Network Watch

### WeatherXM

**What changed**
- cells over designed capacity: 289 (-1 (-0.3%))

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
- entities on public map: 19,564 (-9 (-0.0%))

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
- 49.04% of UI-reported HONEY sits in the top 20 visible SPL accounts (Solana RPC cap) — economic *shape* for treasury/MM review, not a contributor GPS read.

**Signal type**
- Economic concentration (`economic_concentration`)

**Trend**
- insufficient history

**Open question**
- Do the largest visible SPL accounts map to known treasury or market-maker custody labels on your side?

**What we don't know**
- Whether the largest visible accounts are treasury, market-maker, exchange custody, or operators — on-chain shape doesn't label holder intent.

### DIMO

**What changed**
- Of 158,194 DIMO vehicle identities, 40,622 (25.7%) are backed by physical hardware; 31,415 (19.9%) connect via software/synthetic devices, and 86,157 (54.5%) show no connected device on the public registry.

**Signal type**
- Uncategorized public observation (`device_backing_gap`)

**Trend**
- insufficient history

**Open question**
- Does the public read for DIMO match what your team sees internally, or is the public feed expected to look this way?

**What we don't know**
- What the public feed cannot disambiguate without operator confirmation.

### Helium IoT

**What changed**
- 4,861 single-coordinate stacks of ≥10 hotspots on 1,008,091 located units — the largest stack holds 502 hotspots on one coordinate (§1 lists keys your registry team can grep today).

**Signal type**
- Registry duplication (`duplication_cluster`)

**Trend**
- single delta observed

**Open question**
- Does the public read for Helium IoT match what your team sees internally, or is the public feed expected to look this way?

**What we don't know**
- Whether shared coordinates are legitimate co-located installs, shared-mount sites, or registry artifacts — public data can't tell without operator confirmation.

### Helium Mobile

**What changed**
- 530 single-coordinate stacks of ≥10 hotspots on 54,771 located units — the largest stack holds 497 hotspots on one coordinate (§1 lists keys your registry team can grep today).

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

_Latest reading: 2026-07-04_

- **Geodnet** — entities on public map: 19,564 (-9 (-0.0%))
- **WeatherXM** — cells over designed capacity: 289 (-1 (-0.3%))

### Signals To Watch

- On the public cells view, do over-capacity H3 counts match your internal registry and rewards model?
- For stations sharing an exact coordinate pair on the public registry, is that expected registration behavior or a dedupe gap worth reconciling?
- Do the largest visible SPL accounts map to known treasury or market-maker custody labels on your side?
- Does the public read for DIMO match what your team sees internally, or is the public feed expected to look this way?
- Does the public read for Helium IoT match what your team sees internally, or is the public feed expected to look this way?
- Does the public read for Helium Mobile match what your team sees internally, or is the public feed expected to look this way?

### Sources & Methodology

- Weekly report aggregates **daily signal briefs** and latest audit snapshots.
- Patterns lead; network detail and raw evidence follow. Narratives appear only when tied to observations above.
- Public scans: `scripts/sybil-scan-*.mjs` · Index: `scripts/data/bureau-audit-index.json`
