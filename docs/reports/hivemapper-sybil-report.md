# Sybil Risk Scan — Hivemapper Network

> Independent public read by the GETKINETIK Bureau. **Part A** (when Solana RPC succeeds) reads on-chain state for the public HONEY SPL mint. **Part B** (optional) runs the same four geometry heuristics as `sybil-report.mjs` on a node list *you* supply. Hivemapper does not publish an unauthenticated global contributor JSON like WeatherXM's cells API or Geodnet's station list — use your own `SOLANA_RPC_URL` for reliable Part A, or attach `--nodes=` for the Geodnet-style pass.

- **As of:** 2026-07-23
- **Solana RPC used:** `https://mainnet.helius-rpc.com/?api-key=[REDACTED]`
- **HONEY mint:** `4vMsoUT2BWatFweudnQM1xedRLfJgJ7hswhcpz4xgBTy`
- **Reported circulating / UI supply:** 6,565,381,894.812 HONEY
- **Sum of top 20 largest SPL token accounts:** 3,221,912,162.622 HONEY (49.07% of UI supply)
- **No `--nodes=` file was supplied. For GPS / co-location style heuristics (same family as Geodnet / WeatherXM scans), obtain a public or partner-shared contributor snapshot with `lat` / `lng` and re-run with `--nodes=…` (schema: `scripts/sample-nodes.json`).**

## Executive summary

1. **49.07% of UI-reported HONEY** sits in the **top 20 visible SPL accounts** (Solana RPC cap) — economic *shape* for treasury/MM review, not a contributor GPS read.
2. **Top 5 accounts alone: 20.98%** of supply — see § Part A table for owner wallets to reconcile with custody labels.
3. For GPS-style reads, re-run with `--nodes=` when you can export lat/lng (schema: `scripts/sample-nodes.json`).

---

## Since last snapshot

| Metric | This run | vs last run |
|---|---:|---|
| Top-20 visible SPL accounts (% of UI supply) | 49.07% | -0.00 pp (-0.0%) |
| Sum of top-20 balances (HONEY) | 3,221,912,162.622 | -298,056.901 (-0.0%) |
| UI-reported supply (HONEY) | 6,565,381,894.812 | unchanged vs last run |

## What to cross-check this week

1. Label top SPL owner wallets (§ Part A) against treasury, MM, exchange, and contributor custody — concentration ≠ Sybil.
2. Compare cumulative top-N curve to your internal float map — RPC only returns 20 largest accounts per call.
3. If you export contributor coordinates, re-run with `--nodes=` for co-location / birth-burst heuristics.
4. Reproduce: `node scripts/sybil-scan-hivemapper.mjs` with `SOLANA_RPC_URL` in env.

> Public-data read. Re-run: script in `scripts/`, source URL in report header.

---

## Headline findings

1. **Top 20 visible SPL accounts hold 49.07% of UI-reported supply** (3,221,912,162.622 HONEY).
2. **Top 5 accounts: 20.98%** — worth matching to known custody before inferring contributor risk.
3. **Methodology cap:** Solana returns at most 20 largest token accounts per mint; tail concentration is a lower bound.

---

## Part A — On-chain HONEY concentration (Solana mainnet)

The Solana RPC `getTokenLargestAccounts` returns at most **20** token accounts per call. This is a *lower bound* on concentration insight (the tail is not enumerated here), but the headline numbers are still useful for partner conversations: how much of the visible float sits in the largest visible SPL accounts.

| Rank | Owner wallet (best-effort) | Token account | Balance (HONEY) | % of UI supply |
|---:|---|---|---:|---:|
| 1 | `EyBXvV7NfMSTaekeaNiq6hMoXSQQ6rDSXziUH5C6dkQ3` | `2bMhpUUCFxjZ736Aswujn78cdrBMVyAVzDzq6wKLShjn` | 481,686,464 | 7.34% |
| 2 | `FZ9diFCJoPHaXKM7ik34YYAYHsEJ6oBvy9H74dVzqyjk` | `CYbBmhZnQZUNVPfVC5diwQmzqSNNJ9ZmmPgMrnsQ86fv` | 241,665,639.44 | 3.68% |
| 3 | `DRpa39yLaidzYx8x2UPZappkf6L17snCysDaJmmKMUuT` | `FahsdVSifGqmNFY5Vzpem4Pj9qnA1MXEBPTSzxgmAKFC` | 230,000,000 | 3.50% |
| 4 | `A6zNJCrSEZprWMMmRgdAiNY1jDmJnW1QfFnXWs6dUU3y` | `354T11domhX6Zgz4NPjsHwBsiA65tPtAX7FB91NbUjFa` | 225,862,595.23 | 3.44% |
| 5 | `F6yzh1xwRacfUZkjDQPPk1akLDvd11rZEBKKWjiJxx69` | `2ZQv35vRp7NFwzEYfLxx21WorwFMNy6qAA7WQ5vx2VpZ` | 198,510,802.6 | 3.02% |
| 6 | `6QGuxKCi9NC8cbdgHVWv3EcBnGJdW8FUMeAw62b8rBdd` | `ERs88VgAyUq6jhwH2nU8sFhMvggaYBySdxvgb7hujDCn` | 152,680,458.2 | 2.33% |
| 7 | `D99E2pr78DSVmBcjuDWETY8Nfm9X9ro3Grgc67mzfutA` | `5YdDSjuyGruE3DtHanLgJzUnY6rCUpHLNoH8uQw7C76n` | 144,565,038.56 | 2.20% |
| 8 | `HyW7x3gFHWLFA67a2DZVGeCcLNzuNTSG3yUyq2bSsuvA` | `4R4A1FhFuK6k9JqTnxcofhGv62QynMVfGbzTX69sqcEg` | 144,357,814.71 | 2.20% |
| 9 | `Fe3XYFYaXEo2LEy4ff1fdvp5TT5pJN5nbusNoSwBcmor` | `GiTt4njw786sWSMfrPgqjwWtDKqaVXDtouZKbE7j4H6q` | 129,877,731.15 | 1.98% |
| 10 | `Fqq49kW2eTtmhGtQuah9qsiwBsp4wdvnbFnACyhaTW8g` | `BMTrovbf7nreXq9tFhCyFKkPHPQiokxQKFxZUJwzBmK4` | 126,115,569.92 | 1.92% |
| 11 | `34zJz5hsgnQyyX9togBNtGBNvzASKPXn1qJ7oiMEaXXD` | `FC6XEMBmxNfcTnQqkT1jQJmKBgaU5NZtPjYt9uu3YNyB` | 125,902,272.47 | 1.92% |
| 12 | `HrUtFzvz5hYqGRpL39dCevoyon5MspmX9CJP2t7XuxYA` | `5kfUY2E2nfxCDvFJwcEZheBGPxJBnx4ri7tjygP3LWHs` | 122,188,491.44 | 1.86% |
| 13 | `BTAv2UhsPtMyjgAD9uV2nGXk7mHVDoVRn9ZGnHLWJWQ` | `CQVU39wiQmWiFJcoRcN8t7JCdt6CqKp79Z8Ba62xyrcS` | 118,977,879.25 | 1.81% |
| 14 | `8uKHW5ziCQ3d76ngRx8qzMHoRHnrEDp6d6Qaion3k9L6` | `Cqzftixeouye53GXjZd1MhPAX8TNxzNLY7EKYFEZjsRu` | 116,626,403.39 | 1.78% |
| 15 | `9DVfhyUroSMVAUR2XmuScYAVk6xRJ3MZwgaDSsJYkwAi` | `DPWm9aFNP9QT7rFCBqr5TFMMHewdQGeBiz3j6bcCFH3Y` | 113,214,993.3 | 1.72% |
| 16 | `6LY1JzAFVZsP2a2xKrtU6znQMQ5h4i7tocWdgrkZzkzF` | `HXLRfE7oKRyktLyVojzbckKpqWcGmdukrrrLXmXWrvrZ` | 112,587,093.93 | 1.71% |
| 17 | `5DesxJLv9ivBPEs8LwSdJjCDSyaD2hkmow8zyXhhN1en` | `8B8ySdpvmejqycAXvrzmYukTt4et6RSHyafZkRcX9eTt` | 112,201,886.1 | 1.71% |
| 18 | `8PcScPhjM2JkUww9RLJA4ANfiq5xzv5UzoGunnHBEhiR` | `B79hfHh3MQRwbrD46DXkDZ6MuLSaPwaLgneGTi8TYRnf` | 108,892,812.89 | 1.66% |
| 19 | `2MBgUeYxKfLTLvfqEY3iDBwaeKZ9RL1vXrnRQh5czqNL` | `5KK5nBX1SNyqFrqzHgtFSL1ohyK4ETQT2xX3B1o52YmU` | 108,373,535.11 | 1.65% |
| 20 | `4MHP4mLwSQrMY7mzWxcRLEH6UVzvdh7Q3uEgTxGKfrwi` | `FkX25QnoCuZGBKjsTJGX7hDJj42FviEgTMkjfiWmU5ZE` | 107,624,680.94 | 1.64% |

### Cumulative top-N (of the 20 returned)

| N | Cumulative HONEY | Cumulative % of UI supply |
|---:|---:|---:|
| 1 | 481,686,464 | 7.34% |
| 2 | 723,352,103.44 | 11.02% |
| 3 | 953,352,103.44 | 14.52% |
| 4 | 1,179,214,698.66 | 17.96% |
| 5 | 1,377,725,501.26 | 20.98% |
| 6 | 1,530,405,959.46 | 23.31% |
| 7 | 1,674,970,998.03 | 25.51% |
| 8 | 1,819,328,812.74 | 27.71% |
| 9 | 1,949,206,543.89 | 29.69% |
| 10 | 2,075,322,113.81 | 31.61% |
| 11 | 2,201,224,386.27 | 33.53% |
| 12 | 2,323,412,877.71 | 35.39% |
| 13 | 2,442,390,756.96 | 37.20% |
| 14 | 2,559,017,160.35 | 38.98% |
| 15 | 2,672,232,153.65 | 40.70% |
| 16 | 2,784,819,247.58 | 42.42% |
| 17 | 2,897,021,133.68 | 44.13% |
| 18 | 3,005,913,946.57 | 45.78% |
| 19 | 3,114,287,481.68 | 47.43% |
| 20 | 3,221,912,162.62 | 49.07% |

**Interpretation:** extreme concentration can correlate with treasury, MM, or exchange custody — *not* automatically Sybil. Treat as economic *shape* worth cross-checking against internal contributor analytics, not as fraud findings.

---

## Methodology

- **Part A:** `getTokenSupply` + `getTokenLargestAccounts` + `getMultipleAccounts` (jsonParsed) on Solana mainnet when RPC allows. Requires a dedicated `SOLANA_RPC_URL` on many networks due to public-RPC rate limits.
- **Part B (optional):** same four conservative heuristics as `sybil-report.mjs` (co-location, birth burst, beat-rate, metadata twins) on a JSON array you provide.
- For hardware-rooted per-node attestation, POST a Proof of Origin URL to `https://getkinetik.app/api/verify-device`.

Contact: **eric@outfromnothingllc.com** · https://getkinetik.app/bureau/ · https://getkinetik.app/api/docs/
