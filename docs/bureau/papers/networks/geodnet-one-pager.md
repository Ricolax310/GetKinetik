# Geodnet — sample read

> Public endpoints only. Not a verdict.

**As of:** 2026-06-25  
**Public source:** https://rtk.geodnet.com/api/v2/coverage_stations  
**Full report:** [docs/reports/geodnet-sybil-report.md](https://github.com/Ricolax310/GetKinetik/blob/main/docs/reports/geodnet-sybil-report.md)  
**Live terminal:** https://getkinetik.app/audits.html  
**Charter:** https://github.com/Ricolax310/GetKinetik/blob/main/NEUTRALITY.md

---

## Executive summary

1. 8 exact (lat,lng) duplicate groups on 19,585 public stations — each row in §1 is one coordinate pair your registry team can grep today.
2. 912 ≤10 m proximity clusters — tighter than two physical RTK antennas; start with the largest counts in §2 (names + anchors included).
3. 9.3% of the public fleet touches at least one heuristic — useful as a sampling denominator, not a verdict.

---

## Trend since last run

| Metric | This run | vs last run |
|---|---:|---|
| Stations with coordinates | 19,585 | -12 (-0.1%) |
| Exact (lat,lng) duplicate groups | 8 | +1 (+14.3%) |
| Clusters within 10 m | 912 | -1 (-0.1%) |
| Clusters ≥4 within 100 m | 4 | unchanged vs last run |
| Low-precision coordinates (≤2 decimals) | 5 | -4 (-44.4%) |
| Fleet share flagged (any heuristic) | 9.27% | -0.02 pp (-0.2%) |

---

## What to cross-check

1. Registry dedupe: for each §1 coordinate pair, confirm whether multiple station IDs should share one surveyed antenna location.
2. Field ops: spot-check §3 tight clusters (≥4 within 100 m) — industrial campus vs duplicate registrations.
3. Data quality: stations in §4 with ≤2 decimal places should not appear as RTK references until coordinates are re-surveyed.
4. Reproduce: `node scripts/sybil-scan-geodnet.mjs` — same public endpoint, no API key.

---

## Reproduce

```bash
node scripts/sybil-scan-geodnet.mjs
```

---

## Optional next step

Hardware-rooted trust sanity check: `POST https://getkinetik.app/api/verify-device` with a Proof of Origin URL.

— Eric · eric@outfromnothingllc.com · https://getkinetik.app/bureau/
