# Helium IoT — sample read

> Public endpoints only. Not a verdict.

**As of:** 2026-07-06  
**Public source:** https://entities.nft.helium.io/v2/hotspots?subnetwork=iot  
**Full report:** [docs/reports/helium-iot-sybil-report.md](https://github.com/Ricolax310/GetKinetik/blob/main/docs/reports/helium-iot-sybil-report.md)  
**Live terminal:** https://getkinetik.app/audits.html  
**Charter:** https://github.com/Ricolax310/GetKinetik/blob/main/NEUTRALITY.md

---

## Executive summary

1. 4,861 single-coordinate stacks of ≥10 hotspots on 1,008,093 located units — the largest stack holds 502 hotspots on one coordinate (§1 lists keys your registry team can grep today).
2. 27,406 hotspots exist on-chain with no asserted location — on the registry but not on the map.
3. Stacks are *expected* at small sizes (H3 snapping, dense buildings) — only review-worthy at this threshold; every number reproduces from the free public endpoint with no API key.

---

## Trend since last run

| Metric | This run | vs last run |
|---|---:|---|
| Hotspots with asserted coordinates | 1,008,093 | unchanged vs last run |
| Single-coordinate stacks (≥10 hotspots) | 4,861 | unchanged vs last run |
| Largest single-coordinate stack | 502 | unchanged vs last run |
| Fleet share flagged (any heuristic) | 6.91% | unchanged vs last run |

---

## What to cross-check

1. Registry dedupe: for each §1 stack, confirm how many physically separate radios actually occupy that coordinate.
2. Coverage model: confirm whether the unasserted-location population is expected (new units pre-assert) or stale registry entries.
3. Reproduce: `node scripts/sybil-scan-helium-iot.mjs` — same public endpoint, no API key.

---

## Reproduce

```bash
node scripts/sybil-scan-helium-iot.mjs
```

---

## Optional next step

Hardware-rooted trust sanity check: `POST https://getkinetik.app/api/verify-device` with a Proof of Origin URL.

— Eric · eric@outfromnothingllc.com · https://getkinetik.app/bureau/
