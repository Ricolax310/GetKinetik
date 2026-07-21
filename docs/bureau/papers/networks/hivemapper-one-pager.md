# Hivemapper — sample read

> Public endpoints only. Not a verdict.

**As of:** 2026-07-21  
**Public source:** https://mainnet.helius-rpc.com/?api-key=[REDACTED]  
**Full report:** [docs/reports/hivemapper-sybil-report.md](https://github.com/Ricolax310/GetKinetik/blob/main/docs/reports/hivemapper-sybil-report.md)  
**Live terminal:** https://getkinetik.app/audits.html  
**Charter:** https://github.com/Ricolax310/GetKinetik/blob/main/NEUTRALITY.md

---

## Executive summary

1. 50.69% of UI-reported HONEY sits in the top 20 visible SPL accounts (Solana RPC cap) — economic *shape* for treasury/MM review, not a contributor GPS read.
2. Top 5 accounts alone: 22.58% of supply — see § Part A table for owner wallets to reconcile with custody labels.
3. For GPS-style reads, re-run with `--nodes=` when you can export lat/lng (schema: `scripts/sample-nodes.json`).

---

## Trend since last run

| Metric | This run | vs last run |
|---|---:|---|
| Top-20 visible SPL accounts (% of UI supply) | 50.69% | -0.02 pp (-0.0%) |
| Sum of top-20 balances (HONEY) | 3,326,784,898.585 | -1,021,197.588 (-0.0%) |
| UI-reported supply (HONEY) | 6,562,783,840.565 | -2.105 (-0.0%) |

---

## What to cross-check

1. Label top SPL owner wallets (§ Part A) against treasury, MM, exchange, and contributor custody — concentration ≠ Sybil.
2. Compare cumulative top-N curve to your internal float map — RPC only returns 20 largest accounts per call.
3. If you export contributor coordinates, re-run with `--nodes=` for co-location / birth-burst heuristics.
4. Reproduce: `node scripts/sybil-scan-hivemapper.mjs` with `SOLANA_RPC_URL` in env.

---

## Reproduce

```bash
node scripts/sybil-scan-hivemapper.mjs
```

---

## Optional next step

Hardware-rooted trust sanity check: `POST https://getkinetik.app/api/verify-device` with a Proof of Origin URL.

— Eric · eric@outfromnothingllc.com · https://getkinetik.app/bureau/
