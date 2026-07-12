# DIMO — sample read

> Public endpoints only. Not a verdict.

**As of:** 2026-07-12  
**Public source:** https://identity-api.dimo.zone/query  
**Full report:** [docs/reports/dimo-sybil-report.md](https://github.com/Ricolax310/GetKinetik/blob/main/docs/reports/dimo-sybil-report.md)  
**Live terminal:** https://getkinetik.app/audits.html  
**Charter:** https://github.com/Ricolax310/GetKinetik/blob/main/NEUTRALITY.md

---

## Executive summary

1. Of 158,239 DIMO vehicle identities, 40,622 (25.7%) are backed by physical hardware; 31,416 (19.9%) connect via software/synthetic devices, and 86,201 (54.5%) show no connected device on the public registry.
2. Only 45.5% of vehicle identities have any connected device (hardware or software) on the public registry — the rest are minted identities without an active device link.
3. This is *composition*, not fraud: synthetic (software) connections and recently-minted vehicles awaiting setup are expected. The neutral question is how many reward-eligible identities map to real, active devices — answerable from public data alone.

---

## Trend since last run

| Metric | This run | vs last run |
|---|---:|---|
| Vehicle identities minted | 158,239 | +2 (+0.0%) |
| Physical hardware devices | 40,622 | unchanged vs last run |
| Software/synthetic devices | 31,416 | unchanged vs last run |
| Share backed by hardware | 25.67% | -0.00 pp (-0.0%) |
| Share with no connected device | 54.48% | +0.00 pp (+0.0%) |

---

## What to cross-check

1. Confirm how many vehicle identities are expected to exist without an active device (pre-onboarding, churned, or deregistered) vs. counted as active.
2. Cross-check whether reward eligibility requires an active device link, and how the registry treats long-idle identities.
3. Reproduce the counts from the public Identity API and compare against internal active-device tallies.

---

## Reproduce

```bash
node scripts/sybil-scan-dimo.mjs
```

---

## Optional next step

Hardware-rooted trust sanity check: `POST https://getkinetik.app/api/verify-device` with a Proof of Origin URL.

— Eric · eric@outfromnothingllc.com · https://getkinetik.app/bureau/
