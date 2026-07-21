# Sybil Risk Scan — Hivemapper Network

> Independent public read by the GETKINETIK Bureau. **Part A** (when Solana RPC succeeds) reads on-chain state for the public HONEY SPL mint. **Part B** (optional) runs the same four geometry heuristics as `sybil-report.mjs` on a node list *you* supply. Hivemapper does not publish an unauthenticated global contributor JSON like WeatherXM's cells API or Geodnet's station list — use your own `SOLANA_RPC_URL` for reliable Part A, or attach `--nodes=` for the Geodnet-style pass.

- **As of:** 2026-07-21
- **Solana RPC used:** `https://mainnet.helius-rpc.com/?api-key=[REDACTED]`
- **HONEY mint:** `4vMsoUT2BWatFweudnQM1xedRLfJgJ7hswhcpz4xgBTy`
- **Reported circulating / UI supply:** 6,562,783,840.565 HONEY
- **Sum of top 20 largest SPL token accounts:** 3,326,784,898.585 HONEY (50.69% of UI supply)
- **No `--nodes=` file was supplied. For GPS / co-location style heuristics (same family as Geodnet / WeatherXM scans), obtain a public or partner-shared contributor snapshot with `lat` / `lng` and re-run with `--nodes=…` (schema: `scripts/sample-nodes.json`).**

## Executive summary

1. **50.69% of UI-reported HONEY** sits in the **top 20 visible SPL accounts** (Solana RPC cap) — economic *shape* for treasury/MM review, not a contributor GPS read.
2. **Top 5 accounts alone: 22.58%** of supply — see § Part A table for owner wallets to reconcile with custody labels.
3. For GPS-style reads, re-run with `--nodes=` when you can export lat/lng (schema: `scripts/sample-nodes.json`).

---

## Since last snapshot

| Metric | This run | vs last run |
|---|---:|---|
| Top-20 visible SPL accounts (% of UI supply) | 50.69% | -0.02 pp (-0.0%) |
| Sum of top-20 balances (HONEY) | 3,326,784,898.585 | -1,021,197.588 (-0.0%) |
| UI-reported supply (HONEY) | 6,562,783,840.565 | -2.105 (-0.0%) |

## What to cross-check this week

1. Label top SPL owner wallets (§ Part A) against treasury, MM, exchange, and contributor custody — concentration ≠ Sybil.
2. Compare cumulative top-N curve to your internal float map — RPC only returns 20 largest accounts per call.
3. If you export contributor coordinates, re-run with `--nodes=` for co-location / birth-burst heuristics.
4. Reproduce: `node scripts/sybil-scan-hivemapper.mjs` with `SOLANA_RPC_URL` in env.

> Public-data read. Re-run: script in `scripts/`, source URL in report header.

---

## Headline findings

1. **Top 20 visible SPL accounts hold 50.69% of UI-reported supply** (3,326,784,898.585 HONEY).
2. **Top 5 accounts: 22.58%** — worth matching to known custody before inferring contributor risk.
3. **Methodology cap:** Solana returns at most 20 largest token accounts per mint; tail concentration is a lower bound.

---

## Part A — On-chain HONEY concentration (Solana mainnet)

The Solana RPC `getTokenLargestAccounts` returns at most **20** token accounts per call. This is a *lower bound* on concentration insight (the tail is not enumerated here), but the headline numbers are still useful for partner conversations: how much of the visible float sits in the largest visible SPL accounts.

| Rank | Owner wallet (best-effort) | Token account | Balance (HONEY) | % of UI supply |
|---:|---|---|---:|---:|
| 1 | `EyBXvV7NfMSTaekeaNiq6hMoXSQQ6rDSXziUH5C6dkQ3` | `2bMhpUUCFxjZ736Aswujn78cdrBMVyAVzDzq6wKLShjn` | 481,686,464 | 7.34% |
| 2 | `FYPkrGtDG1BjmiUfBRuF7KunybBwXkeXo27qTrGB1x4r` | `eVPrGaGq5UzYW1occeZCwp3Dgu5Waq9PedWsZAbyQMn` | 334,366,061.14 | 5.09% |
| 3 | `FZ9diFCJoPHaXKM7ik34YYAYHsEJ6oBvy9H74dVzqyjk` | `CYbBmhZnQZUNVPfVC5diwQmzqSNNJ9ZmmPgMrnsQ86fv` | 241,665,639.44 | 3.68% |
| 4 | `A6zNJCrSEZprWMMmRgdAiNY1jDmJnW1QfFnXWs6dUU3y` | `354T11domhX6Zgz4NPjsHwBsiA65tPtAX7FB91NbUjFa` | 225,862,595.23 | 3.44% |
| 5 | `8MgKUjhQ1e38owDu8BR6783Z73r1TQk1YtmB6UbCiwfS` | `AXe9bm691cjF1K52rEPM7XpnBdGQFZRm5KHsc2xRwMf1` | 198,510,802.6 | 3.02% |
| 6 | `EAmeyPtAyFPLccyaEwoyAcYaLLjdhEeDoriDSSTjdT6i` | `7rvSRz6wHmBDDCJWpsF29az61PQUTtzbY3yCrovHJPLN` | 152,680,458.2 | 2.33% |
| 7 | `D99E2pr78DSVmBcjuDWETY8Nfm9X9ro3Grgc67mzfutA` | `5YdDSjuyGruE3DtHanLgJzUnY6rCUpHLNoH8uQw7C76n` | 144,565,038.56 | 2.20% |
| 8 | `HyW7x3gFHWLFA67a2DZVGeCcLNzuNTSG3yUyq2bSsuvA` | `4R4A1FhFuK6k9JqTnxcofhGv62QynMVfGbzTX69sqcEg` | 144,357,814.71 | 2.20% |
| 9 | `Fe3XYFYaXEo2LEy4ff1fdvp5TT5pJN5nbusNoSwBcmor` | `GiTt4njw786sWSMfrPgqjwWtDKqaVXDtouZKbE7j4H6q` | 129,877,731.15 | 1.98% |
| 10 | `FsAA2JoVBLin4CbGk16eCjQM4Etixz9cbT1smJvfC6NQ` | `6pK56g9cNW9BHBJMwCrsi1jXGSTMXoiGgA7peRrEt3Bn` | 126,115,569.92 | 1.92% |
| 11 | `3A6s38hSeXDrapWiAR7pRxyaJSiCbGLeKmEZSA9Tix4F` | `E3jfa6CVHYrF6A5MpziZP6oTuZqCkC5atzj1oekY9SNt` | 125,902,272.47 | 1.92% |
| 12 | `5YMPkRAQN6S6sVw3hLwPGqg8w9ZDiVDwFdYNFK2QYJzp` | `6tQjbHEGzucbt2E9mQauB284DC23aYdz8gXSpK31WpSs` | 122,188,491.44 | 1.86% |
| 13 | `H3irBLcGgpcBaFnGfHHoJxscu2XTwWFEFW8XtsvLNoUd` | `7jKRrmsZ7LvyDZi8ZDo8RFnqLYpqvJjyNHnhgwMUmXD7` | 118,977,879.25 | 1.81% |
| 14 | `Bs5QysM5PeazczEAU7UUbxYPbmLnP2KTTBM7KZuhsgvk` | `2a8gUEuwYtoTNitutmQ6HnXVg9HVRSDerxp8Vg3hFCsP` | 116,626,403.39 | 1.78% |
| 15 | `12WjqEN68bGFjs1pXVkr2vxoJaBkEdn5VceMb1zn7VeU` | `5VMaewfj6RZNCMRaMV5uUnSxgUBkwk7JfjKe1M6SC1uA` | 113,214,993.3 | 1.73% |
| 16 | `6LY1JzAFVZsP2a2xKrtU6znQMQ5h4i7tocWdgrkZzkzF` | `HXLRfE7oKRyktLyVojzbckKpqWcGmdukrrrLXmXWrvrZ` | 113,093,768.75 | 1.72% |
| 17 | `5DesxJLv9ivBPEs8LwSdJjCDSyaD2hkmow8zyXhhN1en` | `8B8ySdpvmejqycAXvrzmYukTt4et6RSHyafZkRcX9eTt` | 112,201,886.1 | 1.71% |
| 18 | `4cJE7tpenKc1ZLpio9NpsXApHh3zboNQomttr2dxeaQQ` | `GCsKvzeabNqjNo8Uq1zW5W4hfxqgJXARe2WHkzZEgs4D` | 108,892,812.89 | 1.66% |
| 19 | `2MBgUeYxKfLTLvfqEY3iDBwaeKZ9RL1vXrnRQh5czqNL` | `5KK5nBX1SNyqFrqzHgtFSL1ohyK4ETQT2xX3B1o52YmU` | 108,373,535.11 | 1.65% |
| 20 | `BqbRQHfzqBfLpibNQZdJQUyoyyTXR9kavdqwB81Lp4hk` | `72tThBt1X2qtQgkfwezoVhbihcStTbUaFgirjKEDmiae` | 107,624,680.94 | 1.64% |

### Cumulative top-N (of the 20 returned)

| N | Cumulative HONEY | Cumulative % of UI supply |
|---:|---:|---:|
| 1 | 481,686,464 | 7.34% |
| 2 | 816,052,525.15 | 12.43% |
| 3 | 1,057,718,164.58 | 16.12% |
| 4 | 1,283,580,759.81 | 19.56% |
| 5 | 1,482,091,562.41 | 22.58% |
| 6 | 1,634,772,020.61 | 24.91% |
| 7 | 1,779,337,059.17 | 27.11% |
| 8 | 1,923,694,873.88 | 29.31% |
| 9 | 2,053,572,605.03 | 31.29% |
| 10 | 2,179,688,174.95 | 33.21% |
| 11 | 2,305,590,447.42 | 35.13% |
| 12 | 2,427,778,938.86 | 36.99% |
| 13 | 2,546,756,818.1 | 38.81% |
| 14 | 2,663,383,221.5 | 40.58% |
| 15 | 2,776,598,214.8 | 42.31% |
| 16 | 2,889,691,983.54 | 44.03% |
| 17 | 3,001,893,869.64 | 45.74% |
| 18 | 3,110,786,682.53 | 47.40% |
| 19 | 3,219,160,217.64 | 49.05% |
| 20 | 3,326,784,898.59 | 50.69% |

**Interpretation:** extreme concentration can correlate with treasury, MM, or exchange custody — *not* automatically Sybil. Treat as economic *shape* worth cross-checking against internal contributor analytics, not as fraud findings.

---

## Methodology

- **Part A:** `getTokenSupply` + `getTokenLargestAccounts` + `getMultipleAccounts` (jsonParsed) on Solana mainnet when RPC allows. Requires a dedicated `SOLANA_RPC_URL` on many networks due to public-RPC rate limits.
- **Part B (optional):** same four conservative heuristics as `sybil-report.mjs` (co-location, birth burst, beat-rate, metadata twins) on a JSON array you provide.
- For hardware-rooted per-node attestation, POST a Proof of Origin URL to `https://getkinetik.app/api/verify-device`.

Contact: **eric@outfromnothingllc.com** · https://getkinetik.app/bureau/ · https://getkinetik.app/api/docs/
