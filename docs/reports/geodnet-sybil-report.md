# Sybil Risk Scan — Geodnet RTK Network

> Independent public read by the GETKINETIK Bureau using only Geodnet's public station endpoint. **No internal Geodnet data was used.** Geodnet RTK stations are surveyed GNSS reference units — each one is supposed to be a unique, physically installed antenna at a fixed coordinate. The heuristics below treat that as the structural rule and flag exceptions.

- **As of:** 2026-07-09
- **Public source:** `https://rtk.geodnet.com/api/v2/coverage_stations`
- **Stations observed:** 19,556
- **Stations flagged (any heuristic):** 1,793 (9.17%)

## Executive summary

1. **9 exact (lat,lng) duplicate groups** on 19,556 public stations — each row in §1 is one coordinate pair your registry team can grep today.
2. **899 ≤10 m proximity clusters** — tighter than two physical RTK antennas; start with the largest counts in §2 (names + anchors included).
3. **9.2%** of the public fleet touches at least one heuristic — useful as a sampling denominator, not a verdict.

---

## Since last snapshot

| Metric | This run | vs last run |
|---|---:|---|
| Stations with coordinates | 19,556 | -2 (-0.0%) |
| Exact (lat,lng) duplicate groups | 9 | unchanged vs last run |
| Clusters within 10 m | 899 | unchanged vs last run |
| Clusters ≥4 within 100 m | 4 | unchanged vs last run |
| Low-precision coordinates (≤2 decimals) | 7 | +5 (+250.0%) |
| Fleet share flagged (any heuristic) | 9.17% | +0.03 pp (+0.3%) |

## What to cross-check this week

1. Registry dedupe: for each §1 coordinate pair, confirm whether multiple station IDs should share one surveyed antenna location.
2. Field ops: spot-check §3 tight clusters (≥4 within 100 m) — industrial campus vs duplicate registrations.
3. Data quality: stations in §4 with ≤2 decimal places should not appear as RTK references until coordinates are re-surveyed.
4. Reproduce: `node scripts/sybil-scan-geodnet.mjs` — same public endpoint, no API key.

> Public-data read. Re-run: script in `scripts/`, source URL in report header.

---

## Headline findings

1. **9 groups of stations share an exact (lat, lng) pair.** For a CORS / RTK reference network, two stations at identical coordinates is structurally undefined — there is no second-antenna position to triangulate from.
2. **899 clusters of stations sit within 10 m of each other.** That's tighter than the physical separation of two real RTK installs.
3. **4 clusters have ≥4 stations within 100 m.** Plausible for an industrial campus or surveying yard, but the names + counts are worth reviewing.
4. **7 stations publish coordinates with ≤ 2 decimal places** (≥ 1 km uncertainty). For RTK that's structurally wrong; coordinates should be 5+ decimals.

---

## 1. Exact-coordinate duplicates — 9 groups

| Coordinates | Station count | Names |
|---|---:|---|
| `42.371839, -71.18774` | 2 | `****C6D12`, `****C6D12` |
| `49.637955, 9.352245` | 2 | `****5302D`, `****6A80A` |
| `52.914114, 6.602886` | 2 | `****0WSRA`, `****0WSRT` |
| `45.866721, -108.776757` | 2 | `****10DA5`, `****3A7F8` |
| `43.06898, -89.561251` | 2 | `****1C301`, `****18F55` |
| `41.612078, -93.53732` | 2 | `****E2162`, `****E2162` |
| `29.396025, -98.4301` | 2 | `****CAE6C`, `****CAE6C` |
| `33.94623, -78.314913` | 2 | `****20C40`, `****20C40` |
| `35.20826, -82.248026` | 2 | `****6E64A`, `****6E64A` |

## 2. Near-duplicate stations within 10 m — 899 clusters

| Anchor (lat, lng) | Station count | Names (truncated) |
|---|---:|---|
| 37.39802, -121.98064 | 5 | `****3D678`, `****22D48`, `****CBE10`, `****D1EF6`, `****0BA90` |
| 37.39793, -121.98061 | 4 | `****210CE`, `****22D48`, `****D1EF6`, `****0BA90` |
| 37.39942, -121.98759 | 4 | `****7AE7D`, `****67341`, `****60485`, `G001` |
| 40.36812, -111.93139 | 4 | `****20126`, `****31838`, `****C8D82`, `****6A19E` |
| 37.39812, -121.98100 | 3 | `****6AAF0`, `****21B62`, `****CAE50` |
| 35.20826, -82.24801 | 3 | `****2F569`, `****6E64A`, `****6E64A` |
| -27.54842, 153.08240 | 3 | `****EE73D`, `****FBE61`, `****60459` |
| 30.55062, -88.22028 | 3 | `****FE291`, `****C3CFA`, `****09A2E` |
| 40.61719, 26.46203 | 2 | `****FC23D`, `****34901` |
| 38.97824, -0.17671 | 2 | `****E3152`, `****B6D94` |

_…and 889 more in the snapshot file._

## 3. Tight clusters (≥4 within 100 m) — 4 clusters

| Anchor (lat, lng) | Station count |
|---|---:|
| 37.39812, -121.98100 | 10 |
| 37.39942, -121.98759 | 5 |
| 40.36810, -111.93159 | 5 |
| 43.01532, -82.34366 | 4 |

## 4. Stations with ≤ 2 decimal places of coordinate precision — 7

| Name | Lat | Lng |
|---|---:|---:|
| `****EE595` | 43.037511 | -88.02 |
| `****ADB7D` | 46.619548 | -111.91 |
| `****AB0A5` | 50.8 | 12.067619 |
| `****DA3C1` | 43.82 | 27.136367 |
| `****20BD0` | 41.560015 | -80.28 |
| `****BE23D` | 37.8 | -2.546419 |
| `****B7E02` | 5.083656 | -75.69 |

---

## Methodology

Each finding is grounded in how a real CORS / RTK network is physically supposed to look:
- A surveyed GNSS reference station occupies one antenna at one coordinate. Two stations at the same point is structurally undefined.
- Honest sites at ≤ 10 m of each other are vanishingly rare — that's inside the cone of a single antenna mount.
- Clusters of ≥ 4 stations in 100 m can be honest (industrial campus, surveying lab) but justify a manual look.
- An RTK base claiming a position with ≤ 2 decimal places (≥ 1 km uncertainty) is not a real CORS station; the public network shouldn't surface them.

For an authoritative per-device GETKINETIK grade (hardware-rooted signature, chain age, tamper flags), the network or operator can POST a Proof of Origin URL to `https://getkinetik.app/api/verify-device`.

Contact: **eric@outfromnothingllc.com** · https://getkinetik.app/bureau/ · https://getkinetik.app/api/docs/
