# Sybil Risk Scan — Geodnet RTK Network

> Independent public read by the GETKINETIK Bureau using only Geodnet's public station endpoint. **No internal Geodnet data was used.** Geodnet RTK stations are surveyed GNSS reference units — each one is supposed to be a unique, physically installed antenna at a fixed coordinate. The heuristics below treat that as the structural rule and flag exceptions.

- **As of:** 2026-07-11
- **Public source:** `https://rtk.geodnet.com/api/v2/coverage_stations`
- **Stations observed:** 19,561
- **Stations flagged (any heuristic):** 1,799 (9.20%)

## Executive summary

1. **7 exact (lat,lng) duplicate groups** on 19,561 public stations — each row in §1 is one coordinate pair your registry team can grep today.
2. **903 ≤10 m proximity clusters** — tighter than two physical RTK antennas; start with the largest counts in §2 (names + anchors included).
3. **9.2%** of the public fleet touches at least one heuristic — useful as a sampling denominator, not a verdict.

---

## Since last snapshot

| Metric | This run | vs last run |
|---|---:|---|
| Stations with coordinates | 19,561 | +2 (+0.0%) |
| Exact (lat,lng) duplicate groups | 7 | -3 (-30.0%) |
| Clusters within 10 m | 903 | -1 (-0.1%) |
| Clusters ≥4 within 100 m | 4 | unchanged vs last run |
| Low-precision coordinates (≤2 decimals) | 2 | -5 (-71.4%) |
| Fleet share flagged (any heuristic) | 9.20% | -0.04 pp (-0.4%) |

## What to cross-check this week

1. Registry dedupe: for each §1 coordinate pair, confirm whether multiple station IDs should share one surveyed antenna location.
2. Field ops: spot-check §3 tight clusters (≥4 within 100 m) — industrial campus vs duplicate registrations.
3. Data quality: stations in §4 with ≤2 decimal places should not appear as RTK references until coordinates are re-surveyed.
4. Reproduce: `node scripts/sybil-scan-geodnet.mjs` — same public endpoint, no API key.

> Public-data read. Re-run: script in `scripts/`, source URL in report header.

---

## Headline findings

1. **7 groups of stations share an exact (lat, lng) pair.** For a CORS / RTK reference network, two stations at identical coordinates is structurally undefined — there is no second-antenna position to triangulate from.
2. **903 clusters of stations sit within 10 m of each other.** That's tighter than the physical separation of two real RTK installs.
3. **4 clusters have ≥4 stations within 100 m.** Plausible for an industrial campus or surveying yard, but the names + counts are worth reviewing.
4. **2 stations publish coordinates with ≤ 2 decimal places** (≥ 1 km uncertainty). For RTK that's structurally wrong; coordinates should be 5+ decimals.

---

## 1. Exact-coordinate duplicates — 7 groups

| Coordinates | Station count | Names |
|---|---:|---|
| `42.372689, -71.182223` | 2 | `****C6D12`, `****C6D12` |
| `45.86757, -108.771239` | 2 | `****3A7F8`, `****10DA5` |
| `52.914964, 6.608403` | 2 | `****0WSRA`, `****0WSRT` |
| `41.612927, -93.531803` | 2 | `****E2162`, `****E2162` |
| `29.396875, -98.424582` | 2 | `****CAE6C`, `****CAE6C` |
| `33.947079, -78.309395` | 2 | `****20C40`, `****20C40` |
| `35.209109, -82.242508` | 2 | `****6E64A`, `****6E64A` |

## 2. Near-duplicate stations within 10 m — 903 clusters

| Anchor (lat, lng) | Station count | Names (truncated) |
|---|---:|---|
| 37.39887, -121.97512 | 6 | `****3D678`, `****22D48`, `****CBE10`, `****D1EF6`, `****0BA90`, `****0997A` |
| 37.39897, -121.97549 | 5 | `****6AAF0`, `****21B62`, `****CAE50`, `****CDEB0`, `****21B78` |
| 37.39878, -121.97509 | 4 | `****210CE`, `****22D48`, `****D1EF6`, `****0BA90` |
| 37.40027, -121.98208 | 4 | `****7AE7D`, `****67341`, `****60485`, `G001` |
| 40.36897, -111.92587 | 4 | `****20126`, `****31838`, `****C8D82`, `****6A19E` |
| 39.85384, -105.21427 | 3 | `****E9CD8`, `****ABCED`, `****6E588` |
| 30.05445, -99.14699 | 3 | `****21B94`, `****79F65`, `****6A182` |
| 35.20911, -82.24249 | 3 | `****2F569`, `****6E64A`, `****6E64A` |
| -27.54757, 153.08791 | 3 | `****EE73D`, `****FBE61`, `****60459` |
| 30.55147, -88.21476 | 3 | `****FE291`, `****C3CFA`, `****09A2E` |

_…and 893 more in the snapshot file._

## 3. Tight clusters (≥4 within 100 m) — 4 clusters

| Anchor (lat, lng) | Station count |
|---|---:|
| 37.39897, -121.97549 | 15 |
| 37.40027, -121.98208 | 5 |
| 40.36895, -111.92607 | 5 |
| 43.01617, -82.33814 | 4 |

## 4. Stations with ≤ 2 decimal places of coordinate precision — 2

| Name | Lat | Lng |
|---|---:|---:|
| `****67409` | 17.864551 | -98.14 |
| `****65A35` | 40.33 | -74.030868 |

---

## Methodology

Each finding is grounded in how a real CORS / RTK network is physically supposed to look:
- A surveyed GNSS reference station occupies one antenna at one coordinate. Two stations at the same point is structurally undefined.
- Honest sites at ≤ 10 m of each other are vanishingly rare — that's inside the cone of a single antenna mount.
- Clusters of ≥ 4 stations in 100 m can be honest (industrial campus, surveying lab) but justify a manual look.
- An RTK base claiming a position with ≤ 2 decimal places (≥ 1 km uncertainty) is not a real CORS station; the public network shouldn't surface them.

For an authoritative per-device GETKINETIK grade (hardware-rooted signature, chain age, tamper flags), the network or operator can POST a Proof of Origin URL to `https://getkinetik.app/api/verify-device`.

Contact: **eric@outfromnothingllc.com** · https://getkinetik.app/bureau/ · https://getkinetik.app/api/docs/
