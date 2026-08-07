# Sybil Risk Scan — Geodnet RTK Network

> Independent public read by the GETKINETIK Bureau using only Geodnet's public station endpoint. **No internal Geodnet data was used.** Geodnet RTK stations are surveyed GNSS reference units — each one is supposed to be a unique, physically installed antenna at a fixed coordinate. The heuristics below treat that as the structural rule and flag exceptions.

- **As of:** 2026-08-07
- **Public source:** `https://rtk.geodnet.com/api/v2/coverage_stations`
- **Stations observed:** 19,577
- **Stations flagged (any heuristic):** 1,812 (9.26%)

## Executive summary

1. **6 exact (lat,lng) duplicate groups** on 19,577 public stations — each row in §1 is one coordinate pair your registry team can grep today.
2. **907 ≤10 m proximity clusters** — tighter than two physical RTK antennas; start with the largest counts in §2 (names + anchors included).
3. **9.3%** of the public fleet touches at least one heuristic — useful as a sampling denominator, not a verdict.

---

## Since last snapshot

| Metric | This run | vs last run |
|---|---:|---|
| Stations with coordinates | 19,577 | +5 (+0.0%) |
| Exact (lat,lng) duplicate groups | 6 | -1 (-14.3%) |
| Clusters within 10 m | 907 | +1 (+0.1%) |
| Clusters ≥4 within 100 m | 5 | unchanged vs last run |
| Low-precision coordinates (≤2 decimals) | 8 | +5 (+166.7%) |
| Fleet share flagged (any heuristic) | 9.26% | +0.04 pp (+0.4%) |

## What to cross-check this week

1. Registry dedupe: for each §1 coordinate pair, confirm whether multiple station IDs should share one surveyed antenna location.
2. Field ops: spot-check §3 tight clusters (≥4 within 100 m) — industrial campus vs duplicate registrations.
3. Data quality: stations in §4 with ≤2 decimal places should not appear as RTK references until coordinates are re-surveyed.
4. Reproduce: `node scripts/sybil-scan-geodnet.mjs` — same public endpoint, no API key.

> Public-data read. Re-run: script in `scripts/`, source URL in report header.

---

## Headline findings

1. **6 groups of stations share an exact (lat, lng) pair.** For a CORS / RTK reference network, two stations at identical coordinates is structurally undefined — there is no second-antenna position to triangulate from.
2. **907 clusters of stations sit within 10 m of each other.** That's tighter than the physical separation of two real RTK installs.
3. **5 clusters have ≥4 stations within 100 m.** Plausible for an industrial campus or surveying yard, but the names + counts are worth reviewing.
4. **8 stations publish coordinates with ≤ 2 decimal places** (≥ 1 km uncertainty). For RTK that's structurally wrong; coordinates should be 5+ decimals.

---

## 1. Exact-coordinate duplicates — 6 groups

| Coordinates | Station count | Names |
|---|---:|---|
| `49.638276, 9.357803` | 2 | `****5302D`, `****6A80A` |
| `52.914435, 6.608444` | 2 | `****0WSRA`, `****0WSRT` |
| `43.069301, -89.555693` | 2 | `****18F55`, `****1C301` |
| `41.612399, -93.531762` | 2 | `****E2162`, `****E2162` |
| `29.396346, -98.424542` | 2 | `****CAE6C`, `****CAE6C` |
| `35.208581, -82.242468` | 2 | `****6E64A`, `****6E64A` |

## 2. Near-duplicate stations within 10 m — 907 clusters

| Anchor (lat, lng) | Station count | Names (truncated) |
|---|---:|---|
| 37.39845, -121.97545 | 4 | `****0AB68`, `****1FCF2`, `****CFEE8`, `****6AAF0` |
| 40.36844, -111.92583 | 4 | `****20126`, `****31838`, `****C8D82`, `****6A19E` |
| 36.25923, -115.17184 | 3 | `****20C14`, `****C8749`, `****6A1AA` |
| 38.44185, 27.21032 | 3 | `****71041`, `****15B3D`, `****DB0B1` |
| 37.39974, -121.98204 | 3 | `****7AE7D`, `****60485`, `G001` |
| 35.20858, -82.24245 | 3 | `****2F569`, `****6E64A`, `****6E64A` |
| -27.54810, 153.08795 | 3 | `****EE73D`, `****FBE61`, `****60459` |
| 36.52637, 32.25256 | 2 | `****3268A`, `****C0265` |
| 41.75543, 26.59712 | 2 | `****2E852`, `****2019D` |
| 45.12144, 18.17614 | 2 | `****E3F39`, `****C7E1D` |

_…and 897 more in the snapshot file._

## 3. Tight clusters (≥4 within 100 m) — 5 clusters

| Anchor (lat, lng) | Station count |
|---|---:|
| 37.39845, -121.97545 | 10 |
| 37.39768, -121.97474 | 8 |
| 37.39974, -121.98204 | 5 |
| 40.36842, -111.92603 | 5 |
| 43.01564, -82.33810 | 4 |

## 4. Stations with ≤ 2 decimal places of coordinate precision — 8

| Name | Lat | Lng |
|---|---:|---:|
| `****29EEE` | 25.78 | -100.305722 |
| `****40EE9` | 6.61 | -75.00116 |
| `****06DA9` | 47.57 | 7.633351 |
| `****0IJMU` | 52.461798 | 4.56 |
| `****E34FD` | -6.898298 | 109.53 |
| `****E42ED` | 49.27 | 17.235839 |
| `****22BDC` | 33.140027 | -80.1 |
| `****98B25` | 34.346596 | -97.96 |

---

## Methodology

Each finding is grounded in how a real CORS / RTK network is physically supposed to look:
- A surveyed GNSS reference station occupies one antenna at one coordinate. Two stations at the same point is structurally undefined.
- Honest sites at ≤ 10 m of each other are vanishingly rare — that's inside the cone of a single antenna mount.
- Clusters of ≥ 4 stations in 100 m can be honest (industrial campus, surveying lab) but justify a manual look.
- An RTK base claiming a position with ≤ 2 decimal places (≥ 1 km uncertainty) is not a real CORS station; the public network shouldn't surface them.

For an authoritative per-device GETKINETIK grade (hardware-rooted signature, chain age, tamper flags), the network or operator can POST a Proof of Origin URL to `https://getkinetik.app/api/verify-device`.

Contact: **eric@outfromnothingllc.com** · https://getkinetik.app/bureau/ · https://getkinetik.app/api/docs/
