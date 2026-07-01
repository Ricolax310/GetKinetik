# Helium Mobile — sample read

> Public endpoints only. Not a verdict.

**As of:** 2026-07-01  
**Public source:** https://entities.nft.helium.io/v2/hotspots?subnetwork=mobile  
**Full report:** [docs/reports/helium-mobile-sybil-report.md](https://github.com/Ricolax310/GetKinetik/blob/main/docs/reports/helium-mobile-sybil-report.md)  
**Live terminal:** https://getkinetik.app/audits.html  
**Charter:** https://github.com/Ricolax310/GetKinetik/blob/main/NEUTRALITY.md

---

## Executive summary

1. 530 single-coordinate stacks of ≥10 hotspots on 54,767 located units — the largest stack holds 497 hotspots on one coordinate (§1 lists keys your registry team can grep today).
2. 1,903 hotspots exist on-chain with no asserted location — on the registry but not on the map.
3. Stacks are *expected* at small sizes (H3 snapping, dense buildings) — only review-worthy at this threshold; every number reproduces from the free public endpoint with no API key.

---

## Trend since last run

| Metric | This run | vs last run |
|---|---:|---|
| Hotspots with asserted coordinates | 54,767 | unchanged vs last run |
| Single-coordinate stacks (≥10 hotspots) | 530 | -1 (-0.2%) |
| Largest single-coordinate stack | 497 | unchanged vs last run |
| Fleet share flagged (any heuristic) | 20.58% | -0.02 pp (-0.1%) |

---

## What to cross-check

1. Registry dedupe: for each §1 stack, confirm how many physically separate radios actually occupy that coordinate.
2. Coverage model: confirm whether the unasserted-location population is expected (new units pre-assert) or stale registry entries.
3. Reproduce: `node scripts/sybil-scan-helium-mobile.mjs` — same public endpoint, no API key.

---

## Reproduce

```bash
node scripts/sybil-scan-helium-mobile.mjs
```

---

## Optional next step

Hardware-rooted trust sanity check: `POST https://getkinetik.app/api/verify-device` with a Proof of Origin URL.

— Eric · eric@outfromnothingllc.com · https://getkinetik.app/bureau/
