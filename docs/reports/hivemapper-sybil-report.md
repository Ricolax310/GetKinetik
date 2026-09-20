# Sybil Risk Scan — Hivemapper Network

> Independent public read by the GETKINETIK Bureau. **Part A** (when Solana RPC succeeds) reads on-chain state for the public HONEY SPL mint. **Part B** (optional) runs the same four geometry heuristics as `sybil-report.mjs` on a node list *you* supply. Hivemapper does not publish an unauthenticated global contributor JSON like WeatherXM's cells API or Geodnet's station list — use your own `SOLANA_RPC_URL` for reliable Part A, or attach `--nodes=` for the Geodnet-style pass.

- **As of:** 2026-09-20
- **Solana RPC used:** `https://mainnet.helius-rpc.com/?api-key=[REDACTED]`
- **HONEY mint:** `4vMsoUT2BWatFweudnQM1xedRLfJgJ7hswhcpz4xgBTy`
- **Reported circulating / UI supply:** 6,551,738,828.466 HONEY
- **Sum of top 20 largest SPL token accounts:** 3,442,668,465.834 HONEY (52.55% of UI supply)
- **No `--nodes=` file was supplied. For GPS / co-location style heuristics (same family as Geodnet / WeatherXM scans), obtain a public or partner-shared contributor snapshot with `lat` / `lng` and re-run with `--nodes=…` (schema: `scripts/sample-nodes.json`).**

## Executive summary

1. **52.55% of UI-reported HONEY** sits in the **top 20 visible SPL accounts** (Solana RPC cap) — economic *shape* for treasury/MM review, not a contributor GPS read.
2. **Top 5 accounts alone: 24.00%** of supply — see § Part A table for owner wallets to reconcile with custody labels.
3. For GPS-style reads, re-run with `--nodes=` when you can export lat/lng (schema: `scripts/sample-nodes.json`).

---

## Since last snapshot

| Metric | This run | vs last run |
|---|---:|---|
| Top-20 visible SPL accounts (% of UI supply) | 52.55% | +0.00 pp (+0.0%) |
| Sum of top-20 balances (HONEY) | 3,442,668,465.834 | +156,107.249 (+0.0%) |
| UI-reported supply (HONEY) | 6,551,738,828.466 | unchanged vs last run |

## What to cross-check this week

1. Label top SPL owner wallets (§ Part A) against treasury, MM, exchange, and contributor custody — concentration ≠ Sybil.
2. Compare cumulative top-N curve to your internal float map — RPC only returns 20 largest accounts per call.
3. If you export contributor coordinates, re-run with `--nodes=` for co-location / birth-burst heuristics.
4. Reproduce: `node scripts/sybil-scan-hivemapper.mjs` with `SOLANA_RPC_URL` in env.

> Public-data read. Re-run: script in `scripts/`, source URL in report header.

---

## Headline findings

1. **Top 20 visible SPL accounts hold 52.55% of UI-reported supply** (3,442,668,465.834 HONEY).
2. **Top 5 accounts: 24.00%** — worth matching to known custody before inferring contributor risk.
3. **Methodology cap:** Solana returns at most 20 largest token accounts per mint; tail concentration is a lower bound.

---

## Part A — On-chain HONEY concentration (Solana mainnet)

The Solana RPC `getTokenLargestAccounts` returns at most **20** token accounts per call. This is a *lower bound* on concentration insight (the tail is not enumerated here), but the headline numbers are still useful for partner conversations: how much of the visible float sits in the largest visible SPL accounts.

| Rank | Owner wallet (best-effort) | Token account | Balance (HONEY) | % of UI supply |
|---:|---|---|---:|---:|
| 1 | `EyBXvV7NfMSTaekeaNiq6hMoXSQQ6rDSXziUH5C6dkQ3` | `2bMhpUUCFxjZ736Aswujn78cdrBMVyAVzDzq6wKLShjn` | 695,464,162.68 | 10.61% |
| 2 | `FZ9diFCJoPHaXKM7ik34YYAYHsEJ6oBvy9H74dVzqyjk` | `CYbBmhZnQZUNVPfVC5diwQmzqSNNJ9ZmmPgMrnsQ86fv` | 241,665,639.44 | 3.69% |
| 3 | `A6zNJCrSEZprWMMmRgdAiNY1jDmJnW1QfFnXWs6dUU3y` | `354T11domhX6Zgz4NPjsHwBsiA65tPtAX7FB91NbUjFa` | 225,862,595.23 | 3.45% |
| 4 | `AVPKzX2QZ8E23SWR728yhMTnnqr9UjAZdgemfaE3qHg5` | `6aesBmAAX4QaPy7hiv3PkGUwkhUFLxmiSKeM9qPa76g8` | 211,191,109 | 3.22% |
| 5 | `F6yzh1xwRacfUZkjDQPPk1akLDvd11rZEBKKWjiJxx69` | `2ZQv35vRp7NFwzEYfLxx21WorwFMNy6qAA7WQ5vx2VpZ` | 198,510,802.6 | 3.03% |
| 6 | `HyW7x3gFHWLFA67a2DZVGeCcLNzuNTSG3yUyq2bSsuvA` | `4R4A1FhFuK6k9JqTnxcofhGv62QynMVfGbzTX69sqcEg` | 184,357,814.71 | 2.81% |
| 7 | `6QGuxKCi9NC8cbdgHVWv3EcBnGJdW8FUMeAw62b8rBdd` | `ERs88VgAyUq6jhwH2nU8sFhMvggaYBySdxvgb7hujDCn` | 152,680,458.2 | 2.33% |
| 8 | `Fe3XYFYaXEo2LEy4ff1fdvp5TT5pJN5nbusNoSwBcmor` | `GiTt4njw786sWSMfrPgqjwWtDKqaVXDtouZKbE7j4H6q` | 129,877,731.15 | 1.98% |
| 9 | `Fqq49kW2eTtmhGtQuah9qsiwBsp4wdvnbFnACyhaTW8g` | `BMTrovbf7nreXq9tFhCyFKkPHPQiokxQKFxZUJwzBmK4` | 126,115,569.92 | 1.92% |
| 10 | `34zJz5hsgnQyyX9togBNtGBNvzASKPXn1qJ7oiMEaXXD` | `FC6XEMBmxNfcTnQqkT1jQJmKBgaU5NZtPjYt9uu3YNyB` | 125,902,272.47 | 1.92% |
| 11 | `D99E2pr78DSVmBcjuDWETY8Nfm9X9ro3Grgc67mzfutA` | `5YdDSjuyGruE3DtHanLgJzUnY6rCUpHLNoH8uQw7C76n` | 123,693,619.35 | 1.89% |
| 12 | `HrUtFzvz5hYqGRpL39dCevoyon5MspmX9CJP2t7XuxYA` | `5kfUY2E2nfxCDvFJwcEZheBGPxJBnx4ri7tjygP3LWHs` | 122,188,491.44 | 1.86% |
| 13 | `BTAv2UhsPtMyjgAD9uV2nGXk7mHVDoVRn9ZGnHLWJWQ` | `CQVU39wiQmWiFJcoRcN8t7JCdt6CqKp79Z8Ba62xyrcS` | 118,977,879.25 | 1.82% |
| 14 | `8uKHW5ziCQ3d76ngRx8qzMHoRHnrEDp6d6Qaion3k9L6` | `Cqzftixeouye53GXjZd1MhPAX8TNxzNLY7EKYFEZjsRu` | 116,626,403.39 | 1.78% |
| 15 | `6LY1JzAFVZsP2a2xKrtU6znQMQ5h4i7tocWdgrkZzkzF` | `HXLRfE7oKRyktLyVojzbckKpqWcGmdukrrrLXmXWrvrZ` | 115,157,747.88 | 1.76% |
| 16 | `9DVfhyUroSMVAUR2XmuScYAVk6xRJ3MZwgaDSsJYkwAi` | `DPWm9aFNP9QT7rFCBqr5TFMMHewdQGeBiz3j6bcCFH3Y` | 113,214,993.3 | 1.73% |
| 17 | `5DesxJLv9ivBPEs8LwSdJjCDSyaD2hkmow8zyXhhN1en` | `8B8ySdpvmejqycAXvrzmYukTt4et6RSHyafZkRcX9eTt` | 112,201,886.1 | 1.71% |
| 18 | `E2RvJg2myWpKcbkhBuF81gfhYr6KvmNcDbSmr5qnatYy` | `B2idk2MqoNiqo1fyrrbwU9MT852uAj14MeCY8judXbNT` | 111,712,941.73 | 1.71% |
| 19 | `8PcScPhjM2JkUww9RLJA4ANfiq5xzv5UzoGunnHBEhiR` | `B79hfHh3MQRwbrD46DXkDZ6MuLSaPwaLgneGTi8TYRnf` | 108,892,812.89 | 1.66% |
| 20 | `2MBgUeYxKfLTLvfqEY3iDBwaeKZ9RL1vXrnRQh5czqNL` | `5KK5nBX1SNyqFrqzHgtFSL1ohyK4ETQT2xX3B1o52YmU` | 108,373,535.11 | 1.65% |

### Cumulative top-N (of the 20 returned)

| N | Cumulative HONEY | Cumulative % of UI supply |
|---:|---:|---:|
| 1 | 695,464,162.68 | 10.61% |
| 2 | 937,129,802.12 | 14.30% |
| 3 | 1,162,992,397.34 | 17.75% |
| 4 | 1,374,183,506.34 | 20.97% |
| 5 | 1,572,694,308.94 | 24.00% |
| 6 | 1,757,052,123.65 | 26.82% |
| 7 | 1,909,732,581.85 | 29.15% |
| 8 | 2,039,610,313.01 | 31.13% |
| 9 | 2,165,725,882.92 | 33.06% |
| 10 | 2,291,628,155.39 | 34.98% |
| 11 | 2,415,321,774.74 | 36.87% |
| 12 | 2,537,510,266.18 | 38.73% |
| 13 | 2,656,488,145.43 | 40.55% |
| 14 | 2,773,114,548.82 | 42.33% |
| 15 | 2,888,272,296.7 | 44.08% |
| 16 | 3,001,487,290 | 45.81% |
| 17 | 3,113,689,176.1 | 47.52% |
| 18 | 3,225,402,117.83 | 49.23% |
| 19 | 3,334,294,930.72 | 50.89% |
| 20 | 3,442,668,465.83 | 52.55% |

**Interpretation:** extreme concentration can correlate with treasury, MM, or exchange custody — *not* automatically Sybil. Treat as economic *shape* worth cross-checking against internal contributor analytics, not as fraud findings.

---

## Methodology

- **Part A:** `getTokenSupply` + `getTokenLargestAccounts` + `getMultipleAccounts` (jsonParsed) on Solana mainnet when RPC allows. Requires a dedicated `SOLANA_RPC_URL` on many networks due to public-RPC rate limits.
- **Part B (optional):** same four conservative heuristics as `sybil-report.mjs` (co-location, birth burst, beat-rate, metadata twins) on a JSON array you provide.
- For hardware-rooted per-node attestation, POST a Proof of Origin URL to `https://getkinetik.app/api/verify-device`.

Contact: **eric@outfromnothingllc.com** · https://getkinetik.app/bureau/ · https://getkinetik.app/api/docs/
