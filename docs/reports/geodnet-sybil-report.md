# Sybil Risk Scan — Geodnet RTK Network

> Independent public read by the GETKINETIK Bureau using only Geodnet's public station endpoint. **No internal Geodnet data was used.** Geodnet RTK stations are surveyed GNSS reference units — each one is supposed to be a unique, physically installed antenna at a fixed coordinate. The heuristics below treat that as the structural rule and flag exceptions.

- **As of:** 2026-08-11
- **Public source:** `https://rtk.geodnet.com/api/v2/coverage_stations`
- **Stations observed:** 19,566
- **Stations flagged (any heuristic):** 1,808 (9.24%)

## Executive summary

1. **6 exact (lat,lng) duplicate groups** on 19,566 public stations — each row in §1 is one coordinate pair your registry team can grep today.
2. **906 ≤10 m proximity clusters** — tighter than two physical RTK antennas; start with the largest counts in §2 (names + anchors included).
3. **9.2%** of the public fleet touches at least one heuristic — useful as a sampling denominator, not a verdict.

---

## Since last snapshot

| Metric | This run | vs last run |
|---|---:|---|
| Stations with coordinates | 19,566 | -1 (-0.0%) |
| Exact (lat,lng) duplicate groups | 6 | unchanged vs last run |
| Clusters within 10 m | 906 | -3 (-0.3%) |
| Clusters ≥4 within 100 m | 6 | unchanged vs last run |
| Low-precision coordinates (≤2 decimals) | 5 | unchanged vs last run |
| Fleet share flagged (any heuristic) | 9.24% | -0.03 pp (-0.3%) |

## What to cross-check this week

1. Registry dedupe: for each §1 coordinate pair, confirm whether multiple station IDs should share one surveyed antenna location.
2. Field ops: spot-check §3 tight clusters (≥4 within 100 m) — industrial campus vs duplicate registrations.
3. Data quality: stations in §4 with ≤2 decimal places should not appear as RTK references until coordinates are re-surveyed.
4. Reproduce: `node scripts/sybil-scan-geodnet.mjs` — same public endpoint, no API key.

> Public-data read. Re-run: script in `scripts/`, source URL in report header.

---

## Headline findings

1. **6 groups of stations share an exact (lat, lng) pair.** For a CORS / RTK reference network, two stations at identical coordinates is structurally undefined — there is no second-antenna position to triangulate from.
2. **906 clusters of stations sit within 10 m of each other.** That's tighter than the physical separation of two real RTK installs.
3. **6 clusters have ≥4 stations within 100 m.** Plausible for an industrial campus or surveying yard, but the names + counts are worth reviewing.
4. **5 stations publish coordinates with ≤ 2 decimal places** (≥ 1 km uncertainty). For RTK that's structurally wrong; coordinates should be 5+ decimals.

---

## 1. Exact-coordinate duplicates — 6 groups

| Coordinates | Station count | Names |
|---|---:|---|
| `49.63878, 9.358528` | 2 | `****5302D`, `****6A80A` |
| `52.91494, 6.609169` | 2 | `****0WSRA`, `****0WSRT` |
| `43.069805, -89.554968` | 2 | `****18F55`, `****1C301` |
| `41.612903, -93.531037` | 2 | `****E2162`, `****E2162` |
| `29.39685, -98.423816` | 2 | `****CAE6C`, `****CAE6C` |
| `35.209085, -82.241743` | 2 | `****6E64A`, `****6E64A` |

## 2. Near-duplicate stations within 10 m — 906 clusters

| Anchor (lat, lng) | Station count | Names (truncated) |
|---|---:|---|
| 40.36895, -111.92510 | 4 | `****20126`, `****31838`, `****C8D82`, `****6A19E` |
| 53.64318, 11.41342 | 3 | `****C9E46`, `****4F21B`, `****21BD8` |
| 37.39893, -121.97472 | 3 | `****1FCF2`, `****CFEE8`, `****6AAF0` |
| 38.44235, 27.21105 | 3 | `****71041`, `****15B3D`, `****DB0B1` |
| 37.71282, -113.03568 | 3 | `****BF509`, `****21339`, `****6E56A` |
| 40.77779, 29.69377 | 3 | `****2186D`, `****81599`, `****3B246` |
| 37.40024, -121.98131 | 3 | `****7AE7D`, `****60485`, `G001` |
| 35.20908, -82.24172 | 3 | `****2F569`, `****6E64A`, `****6E64A` |
| -27.54759, 153.08868 | 3 | `****EE73D`, `****FBE61`, `****60459` |
| 47.37810, 19.04541 | 2 | `****2D88C`, `****7752D` |

_…and 896 more in the snapshot file._

## 3. Tight clusters (≥4 within 100 m) — 6 clusters

| Anchor (lat, lng) | Station count |
|---|---:|
| 37.39893, -121.97472 | 9 |
| 37.39819, -121.97402 | 8 |
| 37.40024, -121.98131 | 5 |
| 40.36892, -111.92530 | 5 |
| 38.44235, 27.21105 | 4 |
| 43.01614, -82.33738 | 4 |

## 4. Stations with ≤ 2 decimal places of coordinate precision — 5

| Name | Lat | Lng |
|---|---:|---:|
| `****EE59D` | 46.972162 | 27.63 |
| `****208ED` | -26.49422 | 29.19 |
| `****72275` | 38.862742 | 38.67 |
| `****18965` | 44.11 | 27.209737 |
| `****AF676` | 36.48 | 127.155887 |

---

## Methodology

Each finding is grounded in how a real CORS / RTK network is physically supposed to look:
- A surveyed GNSS reference station occupies one antenna at one coordinate. Two stations at the same point is structurally undefined.
- Honest sites at ≤ 10 m of each other are vanishingly rare — that's inside the cone of a single antenna mount.
- Clusters of ≥ 4 stations in 100 m can be honest (industrial campus, surveying lab) but justify a manual look.
- An RTK base claiming a position with ≤ 2 decimal places (≥ 1 km uncertainty) is not a real CORS station; the public network shouldn't surface them.

For an authoritative per-device GETKINETIK grade (hardware-rooted signature, chain age, tamper flags), the network or operator can POST a Proof of Origin URL to `https://getkinetik.app/api/verify-device`.

Contact: **eric@outfromnothingllc.com** · https://getkinetik.app/bureau/ · https://getkinetik.app/api/docs/
