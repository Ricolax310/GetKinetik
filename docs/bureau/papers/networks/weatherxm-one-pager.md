# WeatherXM — sample read

> Public endpoints only. Not a verdict.

**As of:** 2026-07-09  
**Public source:** https://api.weatherxm.com/api/v1/cells  
**Full report:** [docs/reports/weatherxm-sybil-report.md](https://github.com/Ricolax310/GetKinetik/blob/main/docs/reports/weatherxm-sybil-report.md)  
**Live terminal:** https://getkinetik.app/audits.html  
**Charter:** https://github.com/Ricolax310/GetKinetik/blob/main/NEUTRALITY.md

---

## Executive summary

1. 289 cells exceed designed capacity — §1 lists H3 indices + map centers for your ops queue.
2. 108 devices in the hottest cells carry WeatherXM's own `NO_LOCATION_DATA` flag — compare to your internal pol pipeline, not ours.
3. 128 drilled devices sit below qod 30 while still counted toward cell saturation.

---

## Trend since last run

| Metric | This run | vs last run |
|---|---:|---|
| Cells on public map | 8,496 | +2 (+0.0%) |
| Cells ≥1.5× capacity | 289 | unchanged vs last run |
| Share of map over capacity | 3.40% | -0.00 pp (-0.0%) |
| `NO_LOCATION_DATA` in drilled set | 108 | +24 (+28.6%) |
| Devices with qod < 30 (drilled) | 128 | +31 (+32.0%) |

---

## What to cross-check

1. Capacity policy: for §1 top H3 cells, confirm whether device_count should exceed capacity or inactive devices should drop off the cell tally.
2. Proof-of-location: reconcile §2 `pol_reason` histogram with your dashboard — we only read what the public API returns.
3. Hardware mix: §3 bundle counts inside over-capacity cells — popular kit vs single-operator fleet is for you to judge.
4. Reproduce: `node scripts/sybil-scan-weatherxm.mjs` — public cells API, no auth.

---

## Reproduce

```bash
node scripts/sybil-scan-weatherxm.mjs
```

---

## Optional next step

Hardware-rooted trust sanity check: `POST https://getkinetik.app/api/verify-device` with a Proof of Origin URL.

— Eric · eric@outfromnothingllc.com · https://getkinetik.app/bureau/
