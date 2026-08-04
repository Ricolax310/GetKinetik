# Sybil Risk Scan — Geodnet RTK Network

> Independent public read by the GETKINETIK Bureau using only Geodnet's public station endpoint. **No internal Geodnet data was used.** Geodnet RTK stations are surveyed GNSS reference units — each one is supposed to be a unique, physically installed antenna at a fixed coordinate. The heuristics below treat that as the structural rule and flag exceptions.

- **As of:** 2026-08-04
- **Public source:** `https://rtk.geodnet.com/api/v2/coverage_stations`
- **Stations observed:** 19,573
- **Stations flagged (any heuristic):** 1,780 (9.09%)

## Executive summary

1. **6 exact (lat,lng) duplicate groups** on 19,573 public stations — each row in §1 is one coordinate pair your registry team can grep today.
2. **898 ≤10 m proximity clusters** — tighter than two physical RTK antennas; start with the largest counts in §2 (names + anchors included).
3. **9.1%** of the public fleet touches at least one heuristic — useful as a sampling denominator, not a verdict.

---

## Since last snapshot

| Metric | This run | vs last run |
|---|---:|---|
| Stations with coordinates | 19,573 | -6 (-0.0%) |
| Exact (lat,lng) duplicate groups | 6 | -2 (-25.0%) |
| Clusters within 10 m | 898 | -1 (-0.1%) |
| Clusters ≥4 within 100 m | 3 | unchanged vs last run |
| Low-precision coordinates (≤2 decimals) | 1 | -7 (-87.5%) |
| Fleet share flagged (any heuristic) | 9.09% | -0.03 pp (-0.3%) |

## What to cross-check this week

1. Registry dedupe: for each §1 coordinate pair, confirm whether multiple station IDs should share one surveyed antenna location.
2. Field ops: spot-check §3 tight clusters (≥4 within 100 m) — industrial campus vs duplicate registrations.
3. Data quality: stations in §4 with ≤2 decimal places should not appear as RTK references until coordinates are re-surveyed.
4. Reproduce: `node scripts/sybil-scan-geodnet.mjs` — same public endpoint, no API key.

> Public-data read. Re-run: script in `scripts/`, source URL in report header.

---

## Headline findings

1. **6 groups of stations share an exact (lat, lng) pair.** For a CORS / RTK reference network, two stations at identical coordinates is structurally undefined — there is no second-antenna position to triangulate from.
2. **898 clusters of stations sit within 10 m of each other.** That's tighter than the physical separation of two real RTK installs.
3. **3 clusters have ≥4 stations within 100 m.** Plausible for an industrial campus or surveying yard, but the names + counts are worth reviewing.
4. **1 stations publish coordinates with ≤ 2 decimal places** (≥ 1 km uncertainty). For RTK that's structurally wrong; coordinates should be 5+ decimals.

---

## 1. Exact-coordinate duplicates — 6 groups

| Coordinates | Station count | Names |
|---|---:|---|
| `33.946857, -78.317587` | 2 | `****20C40`, `****20C40` |
| `49.638582, 9.349571` | 2 | `****5302D`, `****6A80A` |
| `52.914742, 6.600212` | 2 | `****0WSRA`, `****0WSRT` |
| `41.612705, -93.539994` | 2 | `****E2162`, `****E2162` |
| `29.396653, -98.432773` | 2 | `****CAE6C`, `****CAE6C` |
| `35.208887, -82.2507` | 2 | `****6E64A`, `****6E64A` |

## 2. Near-duplicate stations within 10 m — 898 clusters

| Anchor (lat, lng) | Station count | Names (truncated) |
|---|---:|---|
| 40.36875, -111.93406 | 4 | `****20126`, `****31838`, `****C8D82`, `****6A19E` |
| 40.77759, 29.68482 | 3 | `****2186D`, `****81599`, `****3B246` |
| 36.25953, -115.18007 | 3 | `****20C14`, `****C8749`, `****6A1AA` |
| 37.40004, -121.99027 | 3 | `****7AE7D`, `****60485`, `G001` |
| 35.20888, -82.25068 | 3 | `****2F569`, `****6E64A`, `****6E64A` |
| -27.54779, 153.07972 | 3 | `****EE73D`, `****FBE61`, `****60459` |
| 31.45669, -100.45861 | 2 | `****22B9A`, `****116F9` |
| 40.95835, 24.99170 | 2 | `****316E8`, `****E7695` |
| 54.85898, 23.90661 | 2 | `****10D7D`, `****90379` |
| 53.31433, -0.93958 | 2 | `****E1E39`, `****008D5` |

_…and 888 more in the snapshot file._

## 3. Tight clusters (≥4 within 100 m) — 3 clusters

| Anchor (lat, lng) | Station count |
|---|---:|
| 37.40004, -121.99027 | 5 |
| 40.36873, -111.93426 | 5 |
| 43.01595, -82.34633 | 4 |

## 4. Stations with ≤ 2 decimal places of coordinate precision — 1

| Name | Lat | Lng |
|---|---:|---:|
| `****EBAC5` | 43.33 | -75.108931 |

---

## Methodology

Each finding is grounded in how a real CORS / RTK network is physically supposed to look:
- A surveyed GNSS reference station occupies one antenna at one coordinate. Two stations at the same point is structurally undefined.
- Honest sites at ≤ 10 m of each other are vanishingly rare — that's inside the cone of a single antenna mount.
- Clusters of ≥ 4 stations in 100 m can be honest (industrial campus, surveying lab) but justify a manual look.
- An RTK base claiming a position with ≤ 2 decimal places (≥ 1 km uncertainty) is not a real CORS station; the public network shouldn't surface them.

For an authoritative per-device GETKINETIK grade (hardware-rooted signature, chain age, tamper flags), the network or operator can POST a Proof of Origin URL to `https://getkinetik.app/api/verify-device`.

Contact: **eric@outfromnothingllc.com** · https://getkinetik.app/bureau/ · https://getkinetik.app/api/docs/
