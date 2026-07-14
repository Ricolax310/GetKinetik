# Sybil Risk Scan — Geodnet RTK Network

> Independent public read by the GETKINETIK Bureau using only Geodnet's public station endpoint. **No internal Geodnet data was used.** Geodnet RTK stations are surveyed GNSS reference units — each one is supposed to be a unique, physically installed antenna at a fixed coordinate. The heuristics below treat that as the structural rule and flag exceptions.

- **As of:** 2026-07-14
- **Public source:** `https://rtk.geodnet.com/api/v2/coverage_stations`
- **Stations observed:** 19,565
- **Stations flagged (any heuristic):** 1,804 (9.22%)

## Executive summary

1. **8 exact (lat,lng) duplicate groups** on 19,565 public stations — each row in §1 is one coordinate pair your registry team can grep today.
2. **904 ≤10 m proximity clusters** — tighter than two physical RTK antennas; start with the largest counts in §2 (names + anchors included).
3. **9.2%** of the public fleet touches at least one heuristic — useful as a sampling denominator, not a verdict.

---

## Since last snapshot

| Metric | This run | vs last run |
|---|---:|---|
| Stations with coordinates | 19,565 | +5 (+0.0%) |
| Exact (lat,lng) duplicate groups | 8 | -2 (-20.0%) |
| Clusters within 10 m | 904 | unchanged vs last run |
| Clusters ≥4 within 100 m | 4 | unchanged vs last run |
| Low-precision coordinates (≤2 decimals) | 4 | -2 (-33.3%) |
| Fleet share flagged (any heuristic) | 9.22% | -0.01 pp (-0.1%) |

## What to cross-check this week

1. Registry dedupe: for each §1 coordinate pair, confirm whether multiple station IDs should share one surveyed antenna location.
2. Field ops: spot-check §3 tight clusters (≥4 within 100 m) — industrial campus vs duplicate registrations.
3. Data quality: stations in §4 with ≤2 decimal places should not appear as RTK references until coordinates are re-surveyed.
4. Reproduce: `node scripts/sybil-scan-geodnet.mjs` — same public endpoint, no API key.

> Public-data read. Re-run: script in `scripts/`, source URL in report header.

---

## Headline findings

1. **8 groups of stations share an exact (lat, lng) pair.** For a CORS / RTK reference network, two stations at identical coordinates is structurally undefined — there is no second-antenna position to triangulate from.
2. **904 clusters of stations sit within 10 m of each other.** That's tighter than the physical separation of two real RTK installs.
3. **4 clusters have ≥4 stations within 100 m.** Plausible for an industrial campus or surveying yard, but the names + counts are worth reviewing.
4. **4 stations publish coordinates with ≤ 2 decimal places** (≥ 1 km uncertainty). For RTK that's structurally wrong; coordinates should be 5+ decimals.

---

## 1. Exact-coordinate duplicates — 8 groups

| Coordinates | Station count | Names |
|---|---:|---|
| `42.371952, -71.181287` | 2 | `****C6D12`, `****C6D12` |
| `41.612191, -93.530867` | 2 | `****E2162`, `****E2162` |
| `11.3207, 124.951864` | 2 | `****00000`, `****00000` |
| `52.914227, 6.609339` | 2 | `****0WSRA`, `****0WSRT` |
| `43.069093, -89.554798` | 2 | `****1C301`, `****18F55` |
| `29.396138, -98.423646` | 2 | `****CAE6C`, `****CAE6C` |
| `33.946343, -78.30846` | 2 | `****20C40`, `****20C40` |
| `35.208373, -82.241572` | 2 | `****6E64A`, `****6E64A` |

## 2. Near-duplicate stations within 10 m — 904 clusters

| Anchor (lat, lng) | Station count | Names (truncated) |
|---|---:|---|
| 37.39813, -121.97418 | 6 | `****3D678`, `****22D48`, `****CBE10`, `****D1EF6`, `****0BA90`, `****0997A` |
| 37.39826, -121.97456 | 6 | `****21B62`, `****CAE50`, `****CDEB0`, `****21B78`, `****C2CAE`, `****17C8A` |
| 37.39804, -121.97415 | 4 | `****210CE`, `****22D48`, `****D1EF6`, `****0BA90` |
| 37.39953, -121.98114 | 4 | `****7AE7D`, `****67341`, `****60485`, `G001` |
| 40.36823, -111.92493 | 4 | `****20126`, `****31838`, `****C8D82`, `****6A19E` |
| 28.64366, 77.05314 | 3 | `****0ACC9`, `****326DE`, `****D3685` |
| 39.85310, -105.21333 | 3 | `****E9CD8`, `****ABCED`, `****6E588` |
| 30.05371, -99.14605 | 3 | `****21B94`, `****79F65`, `****6A182` |
| 30.55075, -88.21382 | 3 | `****C3CFA`, `****FE291`, `****09A2E` |
| 35.20837, -82.24155 | 3 | `****2F569`, `****6E64A`, `****6E64A` |

_…and 894 more in the snapshot file._

## 3. Tight clusters (≥4 within 100 m) — 4 clusters

| Anchor (lat, lng) | Station count |
|---|---:|
| 37.39804, -121.97415 | 16 |
| 37.39953, -121.98114 | 5 |
| 40.36821, -111.92513 | 5 |
| 43.01543, -82.33721 | 4 |

## 4. Stations with ≤ 2 decimal places of coordinate precision — 4

| Name | Lat | Lng |
|---|---:|---:|
| `****D3DE1` | 37.66 | 34.282609 |
| `****B78F1` | 46.84 | 23.720097 |
| `****64E05` | 42.385493 | -88.34 |
| `****E4385` | 1.696792 | 104.11 |

---

## Methodology

Each finding is grounded in how a real CORS / RTK network is physically supposed to look:
- A surveyed GNSS reference station occupies one antenna at one coordinate. Two stations at the same point is structurally undefined.
- Honest sites at ≤ 10 m of each other are vanishingly rare — that's inside the cone of a single antenna mount.
- Clusters of ≥ 4 stations in 100 m can be honest (industrial campus, surveying lab) but justify a manual look.
- An RTK base claiming a position with ≤ 2 decimal places (≥ 1 km uncertainty) is not a real CORS station; the public network shouldn't surface them.

For an authoritative per-device GETKINETIK grade (hardware-rooted signature, chain age, tamper flags), the network or operator can POST a Proof of Origin URL to `https://getkinetik.app/api/verify-device`.

Contact: **eric@outfromnothingllc.com** · https://getkinetik.app/bureau/ · https://getkinetik.app/api/docs/
