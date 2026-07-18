# Sybil Risk Scan — Geodnet RTK Network

> Independent public read by the GETKINETIK Bureau using only Geodnet's public station endpoint. **No internal Geodnet data was used.** Geodnet RTK stations are surveyed GNSS reference units — each one is supposed to be a unique, physically installed antenna at a fixed coordinate. The heuristics below treat that as the structural rule and flag exceptions.

- **As of:** 2026-07-18
- **Public source:** `https://rtk.geodnet.com/api/v2/coverage_stations`
- **Stations observed:** 19,578
- **Stations flagged (any heuristic):** 1,779 (9.09%)

## Executive summary

1. **8 exact (lat,lng) duplicate groups** on 19,578 public stations — each row in §1 is one coordinate pair your registry team can grep today.
2. **893 ≤10 m proximity clusters** — tighter than two physical RTK antennas; start with the largest counts in §2 (names + anchors included).
3. **9.1%** of the public fleet touches at least one heuristic — useful as a sampling denominator, not a verdict.

---

## Since last snapshot

| Metric | This run | vs last run |
|---|---:|---|
| Stations with coordinates | 19,578 | -4 (-0.0%) |
| Exact (lat,lng) duplicate groups | 8 | +2 (+33.3%) |
| Clusters within 10 m | 893 | +1 (+0.1%) |
| Clusters ≥4 within 100 m | 4 | unchanged vs last run |
| Low-precision coordinates (≤2 decimals) | 1 | -2 (-66.7%) |
| Fleet share flagged (any heuristic) | 9.09% | +0.01 pp (+0.1%) |

## What to cross-check this week

1. Registry dedupe: for each §1 coordinate pair, confirm whether multiple station IDs should share one surveyed antenna location.
2. Field ops: spot-check §3 tight clusters (≥4 within 100 m) — industrial campus vs duplicate registrations.
3. Data quality: stations in §4 with ≤2 decimal places should not appear as RTK references until coordinates are re-surveyed.
4. Reproduce: `node scripts/sybil-scan-geodnet.mjs` — same public endpoint, no API key.

> Public-data read. Re-run: script in `scripts/`, source URL in report header.

---

## Headline findings

1. **8 groups of stations share an exact (lat, lng) pair.** For a CORS / RTK reference network, two stations at identical coordinates is structurally undefined — there is no second-antenna position to triangulate from.
2. **893 clusters of stations sit within 10 m of each other.** That's tighter than the physical separation of two real RTK installs.
3. **4 clusters have ≥4 stations within 100 m.** Plausible for an industrial campus or surveying yard, but the names + counts are worth reviewing.
4. **1 stations publish coordinates with ≤ 2 decimal places** (≥ 1 km uncertainty). For RTK that's structurally wrong; coordinates should be 5+ decimals.

---

## 1. Exact-coordinate duplicates — 8 groups

| Coordinates | Station count | Names |
|---|---:|---|
| `45.866813, -108.779494` | 2 | `****3A7F8`, `****10DA5` |
| `49.638047, 9.349508` | 2 | `****5302D`, `****6A80A` |
| `52.914206, 6.600149` | 2 | `****0WSRA`, `****0WSRT` |
| `43.069072, -89.563988` | 2 | `****1C301`, `****18F55` |
| `41.61217, -93.540057` | 2 | `****E2162`, `****E2162` |
| `29.396117, -98.432837` | 2 | `****CAE6C`, `****CAE6C` |
| `33.946322, -78.31765` | 2 | `****20C40`, `****20C40` |
| `35.208352, -82.250763` | 2 | `****6E64A`, `****6E64A` |

## 2. Near-duplicate stations within 10 m — 893 clusters

| Anchor (lat, lng) | Station count | Names (truncated) |
|---|---:|---|
| 37.39824, -121.98375 | 5 | `****C2CAE`, `****17C8A`, `****C8E06`, `****C8DA8`, `****21B94` |
| 37.39813, -121.98339 | 4 | `****0997A`, `****0ECBE`, `****F9CCC`, `****CBDF2` |
| 40.36821, -111.93412 | 4 | `****20126`, `****31838`, `****C8D82`, `****6A19E` |
| 30.55073, -88.22301 | 3 | `****C3CFA`, `****FE291`, `****09A2E` |
| 40.77705, 29.68475 | 3 | `****81599`, `****3B246`, `****2186D` |
| 37.39951, -121.99033 | 3 | `****7AE7D`, `****60485`, `G001` |
| 35.20835, -82.25074 | 3 | `****2F569`, `****6E64A`, `****6E64A` |
| -27.54832, 153.07966 | 3 | `****EE73D`, `****FBE61`, `****60459` |
| 39.30872, -104.86705 | 2 | `****E3122`, `****1C449` |
| 44.81796, 7.29235 | 2 | `****0087D`, `****B14D2` |

_…and 883 more in the snapshot file._

## 3. Tight clusters (≥4 within 100 m) — 4 clusters

| Anchor (lat, lng) | Station count |
|---|---:|
| 37.39824, -121.98375 | 12 |
| 40.36819, -111.93433 | 5 |
| 37.39951, -121.99033 | 4 |
| 43.01541, -82.34640 | 4 |

## 4. Stations with ≤ 2 decimal places of coordinate precision — 1

| Name | Lat | Lng |
|---|---:|---:|
| `****BBAD6` | -18.61 | -40.484836 |

---

## Methodology

Each finding is grounded in how a real CORS / RTK network is physically supposed to look:
- A surveyed GNSS reference station occupies one antenna at one coordinate. Two stations at the same point is structurally undefined.
- Honest sites at ≤ 10 m of each other are vanishingly rare — that's inside the cone of a single antenna mount.
- Clusters of ≥ 4 stations in 100 m can be honest (industrial campus, surveying lab) but justify a manual look.
- An RTK base claiming a position with ≤ 2 decimal places (≥ 1 km uncertainty) is not a real CORS station; the public network shouldn't surface them.

For an authoritative per-device GETKINETIK grade (hardware-rooted signature, chain age, tamper flags), the network or operator can POST a Proof of Origin URL to `https://getkinetik.app/api/verify-device`.

Contact: **eric@outfromnothingllc.com** · https://getkinetik.app/bureau/ · https://getkinetik.app/api/docs/
