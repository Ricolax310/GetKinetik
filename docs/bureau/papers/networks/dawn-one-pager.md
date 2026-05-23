# Dawn Network — Bureau sample read (one-pager)

> **GETKINETIK neutral DePIN bureau** — friendly second read, not a verdict. 
> Your verifier still runs. No internal network data used unless noted in the full report.

**Generated:** 2026-05-23T17:31:59.374Z  
**Public source:** Dawn public scan inputs (see script header)  
**Full report:** [docs/reports/dawn-sybil-report.md](https://github.com/Ricolax310/GetKinetik/blob/main/docs/reports/dawn-sybil-report.md)  
**Live terminal:** https://getkinetik.app/audits.html  
**Charter:** https://github.com/Ricolax310/GetKinetik/blob/main/NEUTRALITY.md

---

## Executive summary

1. Beat-Rate Synchronicity (Jitter Analysis) ⏱️
2. Hardware AppID Metadata Twin Clashes 👯
3. IP Co-Location & Datacenter Sources 🌐

---

## Trend since last run

_First run or no prior snapshot — deltas appear after the next weekly scan._

---

## What to cross-check

1. Compare headline patterns in the full report against your internal registry.
2. Reproduce: `node scripts/sybil-scan-dawn.mjs` — public methodology, no API key required unless noted.

---

## Reproduce

```bash
node scripts/sybil-scan-dawn.mjs
```

---

## Optional next step

Hardware-rooted trust sanity check: `POST https://getkinetik.app/api/verify-device` with a Proof of Origin URL.

— Eric · eric@outfromnothingllc.com · https://getkinetik.app/bureau/
