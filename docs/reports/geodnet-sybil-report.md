# Sybil Risk Scan — Geodnet RTK Network

> Independent public read by the GETKINETIK Bureau using only Geodnet's public station endpoint. **No internal Geodnet data was used.** Geodnet RTK stations are surveyed GNSS reference units — each one is supposed to be a unique, physically installed antenna at a fixed coordinate. The heuristics below treat that as the structural rule and flag exceptions.

- **As of:** 2026-07-13
- **Public source:** `https://rtk.geodnet.com/api/v2/coverage_stations`
- **Stations observed:** 19,560
- **Stations flagged (any heuristic):** 1,805 (9.23%)

## Executive summary

1. **10 exact (lat,lng) duplicate groups** on 19,560 public stations — each row in §1 is one coordinate pair your registry team can grep today.
2. **904 ≤10 m proximity clusters** — tighter than two physical RTK antennas; start with the largest counts in §2 (names + anchors included).
3. **9.2%** of the public fleet touches at least one heuristic — useful as a sampling denominator, not a verdict.

---

## Since last snapshot

| Metric | This run | vs last run |
|---|---:|---|
| Stations with coordinates | 19,560 | -9 (-0.0%) |
| Exact (lat,lng) duplicate groups | 10 | unchanged vs last run |
| Clusters within 10 m | 904 | -1 (-0.1%) |
| Clusters ≥4 within 100 m | 4 | unchanged vs last run |
| Low-precision coordinates (≤2 decimals) | 6 | +5 (+500.0%) |
| Fleet share flagged (any heuristic) | 9.23% | +0.02 pp (+0.2%) |

## What to cross-check this week

1. Registry dedupe: for each §1 coordinate pair, confirm whether multiple station IDs should share one surveyed antenna location.
2. Field ops: spot-check §3 tight clusters (≥4 within 100 m) — industrial campus vs duplicate registrations.
3. Data quality: stations in §4 with ≤2 decimal places should not appear as RTK references until coordinates are re-surveyed.
4. Reproduce: `node scripts/sybil-scan-geodnet.mjs` — same public endpoint, no API key.

> Public-data read. Re-run: script in `scripts/`, source URL in report header.

---

## Headline findings

1. **10 groups of stations share an exact (lat, lng) pair.** For a CORS / RTK reference network, two stations at identical coordinates is structurally undefined — there is no second-antenna position to triangulate from.
2. **904 clusters of stations sit within 10 m of each other.** That's tighter than the physical separation of two real RTK installs.
3. **4 clusters have ≥4 stations within 100 m.** Plausible for an industrial campus or surveying yard, but the names + counts are worth reviewing.
4. **6 stations publish coordinates with ≤ 2 decimal places** (≥ 1 km uncertainty). For RTK that's structurally wrong; coordinates should be 5+ decimals.

---

## 1. Exact-coordinate duplicates — 10 groups

| Coordinates | Station count | Names |
|---|---:|---|
| `42.372647, -71.181645` | 2 | `****C6D12`, `****C6D12` |
| `41.612886, -93.531225` | 2 | `****E2162`, `****E2162` |
| `11.321395, 124.951506` | 2 | `****00000`, `****00000` |
| `49.638763, 9.35834` | 2 | `****5302D`, `****6A80A` |
| `52.914922, 6.608981` | 2 | `****0WSRA`, `****0WSRT` |
| `45.867529, -108.770662` | 2 | `****10DA5`, `****3A7F8` |
| `43.069788, -89.555156` | 2 | `****18F55`, `****1C301` |
| `29.396833, -98.424005` | 2 | `****CAE6C`, `****CAE6C` |
| `33.947037, -78.308818` | 2 | `****20C40`, `****20C40` |
| `35.209068, -82.241931` | 2 | `****6E64A`, `****6E64A` |

## 2. Near-duplicate stations within 10 m — 904 clusters

| Anchor (lat, lng) | Station count | Names (truncated) |
|---|---:|---|
| 37.39883, -121.97454 | 6 | `****3D678`, `****22D48`, `****CBE10`, `****D1EF6`, `****0BA90`, `****0997A` |
| 37.39893, -121.97491 | 5 | `****6AAF0`, `****21B62`, `****CAE50`, `****CDEB0`, `****21B78` |
| 37.39874, -121.97451 | 4 | `****210CE`, `****22D48`, `****D1EF6`, `****0BA90` |
| 37.40022, -121.98150 | 4 | `****7AE7D`, `****67341`, `****60485`, `G001` |
| 40.36893, -111.92529 | 4 | `****20126`, `****31838`, `****C8D82`, `****6A19E` |
| 28.64435, 77.05278 | 3 | `****0ACC9`, `****326DE`, `****D3685` |
| 39.85380, -105.21369 | 3 | `****E9CD8`, `****ABCED`, `****6E588` |
| 30.05441, -99.14641 | 3 | `****21B94`, `****79F65`, `****6A182` |
| 35.20906, -82.24191 | 3 | `****2F569`, `****6E64A`, `****6E64A` |
| -27.54761, 153.08849 | 3 | `****EE73D`, `****FBE61`, `****60459` |

_…and 894 more in the snapshot file._

## 3. Tight clusters (≥4 within 100 m) — 4 clusters

| Anchor (lat, lng) | Station count |
|---|---:|
| 37.39893, -121.97491 | 15 |
| 37.40022, -121.98150 | 5 |
| 40.36891, -111.92549 | 5 |
| 43.01613, -82.33757 | 4 |

## 4. Stations with ≤ 2 decimal places of coordinate precision — 6

| Name | Lat | Lng |
|---|---:|---:|
| `QCLF` | -38.27 | 144.642573 |
| `****10315` | 45.290769 | 24.45 |
| `****CBDB6` | 51.56 | 9.931705 |
| `****9555D` | 36.82 | 29.539239 |
| `****C3895` | 46.69 | 27.819994 |
| `****20C26` | 39.858422 | -74.21 |

---

## Methodology

Each finding is grounded in how a real CORS / RTK network is physically supposed to look:
- A surveyed GNSS reference station occupies one antenna at one coordinate. Two stations at the same point is structurally undefined.
- Honest sites at ≤ 10 m of each other are vanishingly rare — that's inside the cone of a single antenna mount.
- Clusters of ≥ 4 stations in 100 m can be honest (industrial campus, surveying lab) but justify a manual look.
- An RTK base claiming a position with ≤ 2 decimal places (≥ 1 km uncertainty) is not a real CORS station; the public network shouldn't surface them.

For an authoritative per-device GETKINETIK grade (hardware-rooted signature, chain age, tamper flags), the network or operator can POST a Proof of Origin URL to `https://getkinetik.app/api/verify-device`.

Contact: **eric@outfromnothingllc.com** · https://getkinetik.app/bureau/ · https://getkinetik.app/api/docs/
