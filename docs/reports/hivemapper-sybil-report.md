# Sybil Risk Scan — Hivemapper Network

> Independent public read by the GETKINETIK Bureau. **Part A** (when Solana RPC succeeds) reads on-chain state for the public HONEY SPL mint. **Part B** (optional) runs the same four geometry heuristics as `sybil-report.mjs` on a node list *you* supply. Hivemapper does not publish an unauthenticated global contributor JSON like WeatherXM's cells API or Geodnet's station list — use your own `SOLANA_RPC_URL` for reliable Part A, or attach `--nodes=` for the Geodnet-style pass.

- **As of:** 2026-09-23
- **Solana RPC used:** `https://mainnet.helius-rpc.com/?api-key=[REDACTED]`
- **HONEY mint:** `4vMsoUT2BWatFweudnQM1xedRLfJgJ7hswhcpz4xgBTy`
- **Reported circulating / UI supply:** 6,551,738,819.879 HONEY
- **Sum of top 20 largest SPL token accounts:** 3,416,198,222.052 HONEY (52.14% of UI supply)
- **No `--nodes=` file was supplied. For GPS / co-location style heuristics (same family as Geodnet / WeatherXM scans), obtain a public or partner-shared contributor snapshot with `lat` / `lng` and re-run with `--nodes=…` (schema: `scripts/sample-nodes.json`).**

## Executive summary

1. **52.14% of UI-reported HONEY** sits in the **top 20 visible SPL accounts** (Solana RPC cap) — economic *shape* for treasury/MM review, not a contributor GPS read.
2. **Top 5 accounts alone: 23.70%** of supply — see § Part A table for owner wallets to reconcile with custody labels.
3. For GPS-style reads, re-run with `--nodes=` when you can export lat/lng (schema: `scripts/sample-nodes.json`).

---

## Since last snapshot

| Metric | This run | vs last run |
|---|---:|---|
| Top-20 visible SPL accounts (% of UI supply) | 52.14% | -0.14 pp (-0.3%) |
| Sum of top-20 balances (HONEY) | 3,416,198,222.052 | -9,048,536.543 (-0.3%) |
| UI-reported supply (HONEY) | 6,551,738,819.879 | unchanged vs last run |

## What to cross-check this week

1. Label top SPL owner wallets (§ Part A) against treasury, MM, exchange, and contributor custody — concentration ≠ Sybil.
2. Compare cumulative top-N curve to your internal float map — RPC only returns 20 largest accounts per call.
3. If you export contributor coordinates, re-run with `--nodes=` for co-location / birth-burst heuristics.
4. Reproduce: `node scripts/sybil-scan-hivemapper.mjs` with `SOLANA_RPC_URL` in env.

> Public-data read. Re-run: script in `scripts/`, source URL in report header.

---

## Headline findings

1. **Top 20 visible SPL accounts hold 52.14% of UI-reported supply** (3,416,198,222.052 HONEY).
2. **Top 5 accounts: 23.70%** — worth matching to known custody before inferring contributor risk.
3. **Methodology cap:** Solana returns at most 20 largest token accounts per mint; tail concentration is a lower bound.

---

## Part A — On-chain HONEY concentration (Solana mainnet)

The Solana RPC `getTokenLargestAccounts` returns at most **20** token accounts per call. This is a *lower bound* on concentration insight (the tail is not enumerated here), but the headline numbers are still useful for partner conversations: how much of the visible float sits in the largest visible SPL accounts.

| Rank | Owner wallet (best-effort) | Token account | Balance (HONEY) | % of UI supply |
|---:|---|---|---:|---:|
| 1 | `EyBXvV7NfMSTaekeaNiq6hMoXSQQ6rDSXziUH5C6dkQ3` | `2bMhpUUCFxjZ736Aswujn78cdrBMVyAVzDzq6wKLShjn` | 695,464,162.68 | 10.61% |
| 2 | `FZ9diFCJoPHaXKM7ik34YYAYHsEJ6oBvy9H74dVzqyjk` | `CYbBmhZnQZUNVPfVC5diwQmzqSNNJ9ZmmPgMrnsQ86fv` | 241,665,639.44 | 3.69% |
| 3 | `A6zNJCrSEZprWMMmRgdAiNY1jDmJnW1QfFnXWs6dUU3y` | `354T11domhX6Zgz4NPjsHwBsiA65tPtAX7FB91NbUjFa` | 225,862,595.23 | 3.45% |
| 4 | `F6yzh1xwRacfUZkjDQPPk1akLDvd11rZEBKKWjiJxx69` | `2ZQv35vRp7NFwzEYfLxx21WorwFMNy6qAA7WQ5vx2VpZ` | 198,510,802.6 | 3.03% |
| 5 | `AVPKzX2QZ8E23SWR728yhMTnnqr9UjAZdgemfaE3qHg5` | `6aesBmAAX4QaPy7hiv3PkGUwkhUFLxmiSKeM9qPa76g8` | 190,972,905 | 2.91% |
| 6 | `HyW7x3gFHWLFA67a2DZVGeCcLNzuNTSG3yUyq2bSsuvA` | `4R4A1FhFuK6k9JqTnxcofhGv62QynMVfGbzTX69sqcEg` | 184,357,814.71 | 2.81% |
| 7 | `6QGuxKCi9NC8cbdgHVWv3EcBnGJdW8FUMeAw62b8rBdd` | `ERs88VgAyUq6jhwH2nU8sFhMvggaYBySdxvgb7hujDCn` | 152,680,458.2 | 2.33% |
| 8 | `Fe3XYFYaXEo2LEy4ff1fdvp5TT5pJN5nbusNoSwBcmor` | `GiTt4njw786sWSMfrPgqjwWtDKqaVXDtouZKbE7j4H6q` | 129,877,731.15 | 1.98% |
| 9 | `Fqq49kW2eTtmhGtQuah9qsiwBsp4wdvnbFnACyhaTW8g` | `BMTrovbf7nreXq9tFhCyFKkPHPQiokxQKFxZUJwzBmK4` | 126,115,569.92 | 1.92% |
| 10 | `34zJz5hsgnQyyX9togBNtGBNvzASKPXn1qJ7oiMEaXXD` | `FC6XEMBmxNfcTnQqkT1jQJmKBgaU5NZtPjYt9uu3YNyB` | 125,902,272.47 | 1.92% |
| 11 | `D99E2pr78DSVmBcjuDWETY8Nfm9X9ro3Grgc67mzfutA` | `5YdDSjuyGruE3DtHanLgJzUnY6rCUpHLNoH8uQw7C76n` | 123,693,619.35 | 1.89% |
| 12 | `HrUtFzvz5hYqGRpL39dCevoyon5MspmX9CJP2t7XuxYA` | `5kfUY2E2nfxCDvFJwcEZheBGPxJBnx4ri7tjygP3LWHs` | 122,188,491.44 | 1.86% |
| 13 | `BTAv2UhsPtMyjgAD9uV2nGXk7mHVDoVRn9ZGnHLWJWQ` | `CQVU39wiQmWiFJcoRcN8t7JCdt6CqKp79Z8Ba62xyrcS` | 118,977,879.25 | 1.82% |
| 14 | `8uKHW5ziCQ3d76ngRx8qzMHoRHnrEDp6d6Qaion3k9L6` | `Cqzftixeouye53GXjZd1MhPAX8TNxzNLY7EKYFEZjsRu` | 116,626,403.39 | 1.78% |
| 15 | `9DVfhyUroSMVAUR2XmuScYAVk6xRJ3MZwgaDSsJYkwAi` | `DPWm9aFNP9QT7rFCBqr5TFMMHewdQGeBiz3j6bcCFH3Y` | 113,214,993.3 | 1.73% |
| 16 | `5DesxJLv9ivBPEs8LwSdJjCDSyaD2hkmow8zyXhhN1en` | `8B8ySdpvmejqycAXvrzmYukTt4et6RSHyafZkRcX9eTt` | 112,201,886.1 | 1.71% |
| 17 | `E2RvJg2myWpKcbkhBuF81gfhYr6KvmNcDbSmr5qnatYy` | `B2idk2MqoNiqo1fyrrbwU9MT852uAj14MeCY8judXbNT` | 111,712,941.73 | 1.71% |
| 18 | `6LY1JzAFVZsP2a2xKrtU6znQMQ5h4i7tocWdgrkZzkzF` | `HXLRfE7oKRyktLyVojzbckKpqWcGmdukrrrLXmXWrvrZ` | 108,905,708.1 | 1.66% |
| 19 | `8PcScPhjM2JkUww9RLJA4ANfiq5xzv5UzoGunnHBEhiR` | `B79hfHh3MQRwbrD46DXkDZ6MuLSaPwaLgneGTi8TYRnf` | 108,892,812.89 | 1.66% |
| 20 | `2MBgUeYxKfLTLvfqEY3iDBwaeKZ9RL1vXrnRQh5czqNL` | `5KK5nBX1SNyqFrqzHgtFSL1ohyK4ETQT2xX3B1o52YmU` | 108,373,535.11 | 1.65% |

### Cumulative top-N (of the 20 returned)

| N | Cumulative HONEY | Cumulative % of UI supply |
|---:|---:|---:|
| 1 | 695,464,162.68 | 10.61% |
| 2 | 937,129,802.12 | 14.30% |
| 3 | 1,162,992,397.34 | 17.75% |
| 4 | 1,361,503,199.94 | 20.78% |
| 5 | 1,552,476,104.94 | 23.70% |
| 6 | 1,736,833,919.65 | 26.51% |
| 7 | 1,889,514,377.85 | 28.84% |
| 8 | 2,019,392,109.01 | 30.82% |
| 9 | 2,145,507,678.92 | 32.75% |
| 10 | 2,271,409,951.39 | 34.67% |
| 11 | 2,395,103,570.74 | 36.56% |
| 12 | 2,517,292,062.18 | 38.42% |
| 13 | 2,636,269,941.43 | 40.24% |
| 14 | 2,752,896,344.82 | 42.02% |
| 15 | 2,866,111,338.12 | 43.75% |
| 16 | 2,978,313,224.22 | 45.46% |
| 17 | 3,090,026,165.95 | 47.16% |
| 18 | 3,198,931,874.05 | 48.83% |
| 19 | 3,307,824,686.94 | 50.49% |
| 20 | 3,416,198,222.05 | 52.14% |

**Interpretation:** extreme concentration can correlate with treasury, MM, or exchange custody — *not* automatically Sybil. Treat as economic *shape* worth cross-checking against internal contributor analytics, not as fraud findings.

---

## Methodology

- **Part A:** `getTokenSupply` + `getTokenLargestAccounts` + `getMultipleAccounts` (jsonParsed) on Solana mainnet when RPC allows. Requires a dedicated `SOLANA_RPC_URL` on many networks due to public-RPC rate limits.
- **Part B (optional):** same four conservative heuristics as `sybil-report.mjs` (co-location, birth burst, beat-rate, metadata twins) on a JSON array you provide.
- For hardware-rooted per-node attestation, POST a Proof of Origin URL to `https://getkinetik.app/api/verify-device`.

Contact: **eric@outfromnothingllc.com** · https://getkinetik.app/bureau/ · https://getkinetik.app/api/docs/
