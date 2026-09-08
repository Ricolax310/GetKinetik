# Sybil Risk Scan — Geodnet RTK Network

> Independent public read by the GETKINETIK Bureau using only Geodnet's public station endpoint. **No internal Geodnet data was used.** Geodnet RTK stations are surveyed GNSS reference units — each one is supposed to be a unique, physically installed antenna at a fixed coordinate. The heuristics below treat that as the structural rule and flag exceptions.

- **As of:** 2026-09-08
- **Public source:** `https://rtk.geodnet.com/api/v2/coverage_stations`
- **Stations observed:** 19,629
- **Stations flagged (any heuristic):** 5,446 (27.74%)

## Executive summary

1. **1146 exact (lat,lng) duplicate groups** on 19,629 public stations — each row in §1 is one coordinate pair your registry team can grep today.
2. **1,145 ≤10 m proximity clusters** — tighter than two physical RTK antennas; start with the largest counts in §2 (names + anchors included).
3. **27.7%** of the public fleet touches at least one heuristic — useful as a sampling denominator, not a verdict.

---

## Since last snapshot

| Metric | This run | vs last run |
|---|---:|---|
| Stations with coordinates | 19,629 | +149 (+0.8%) |
| Exact (lat,lng) duplicate groups | 1,146 | +139 (+13.8%) |
| Clusters within 10 m | 1,145 | +138 (+13.7%) |
| Clusters ≥4 within 100 m | 4 | unchanged vs last run |
| Low-precision coordinates (≤2 decimals) | 3,758 | +30 (+0.8%) |
| Fleet share flagged (any heuristic) | 27.74% | +0.34 pp (+1.2%) |

## What to cross-check this week

1. Registry dedupe: for each §1 coordinate pair, confirm whether multiple station IDs should share one surveyed antenna location.
2. Field ops: spot-check §3 tight clusters (≥4 within 100 m) — industrial campus vs duplicate registrations.
3. Data quality: stations in §4 with ≤2 decimal places should not appear as RTK references until coordinates are re-surveyed.
4. Reproduce: `node scripts/sybil-scan-geodnet.mjs` — same public endpoint, no API key.

> Public-data read. Re-run: script in `scripts/`, source URL in report header.

---

## Headline findings

1. **1,146 groups of stations share an exact (lat, lng) pair.** For a CORS / RTK reference network, two stations at identical coordinates is structurally undefined — there is no second-antenna position to triangulate from.
2. **1,145 clusters of stations sit within 10 m of each other.** That's tighter than the physical separation of two real RTK installs.
3. **4 clusters have ≥4 stations within 100 m.** Plausible for an industrial campus or surveying yard, but the names + counts are worth reviewing.
4. **3,758 stations publish coordinates with ≤ 2 decimal places** (≥ 1 km uncertainty). For RTK that's structurally wrong; coordinates should be 5+ decimals.

---

## 1. Exact-coordinate duplicates — 1,146 groups

| Coordinates | Station count | Names |
|---|---:|---|
| `37.4, -121.986` | 6 | `****3A778`, `****BFC96`, `****7AE7D`, `****67341`, `****60485`, `G001` |
| `40.369, -111.93` | 5 | `****31838`, `****6A19E`, `****0C6BD`, `****20126`, `****C8D82` |
| `38.004, -122.309` | 4 | `****7027A`, `****D4739`, `****C0A6E`, `****97A05` |
| `43.016, -82.342` | 4 | `****19CF5`, `****DFEE1`, `****DC6F5`, `****CAF4D` |
| `38.442, 27.206` | 3 | `****184F9`, `****3A7DA`, `****DB0B1` |
| `40.673, -80.165` | 3 | `****CB43D`, `****C4AE5`, `****C31CD` |
| `47.25, 14.359` | 3 | `****10B45`, `****2E7FA`, `****10B45` |
| `43.893, 22.523` | 3 | `****1C25D`, `****2B912`, `****1C25D` |
| `46.737, 22.094` | 3 | `****AB999`, `****6E65E`, `****AB999` |
| `46.556, 15.54` | 3 | `****1C0BD`, `****E211C`, `****1C0BD` |

_…and 1136 more in the snapshot file._

## 2. Near-duplicate stations within 10 m — 1,145 clusters

| Anchor (lat, lng) | Station count | Names (truncated) |
|---|---:|---|
| 37.40000, -121.98600 | 6 | `****3A778`, `****BFC96`, `****7AE7D`, `****67341`, `****60485`, `G001` |
| 40.36900, -111.93000 | 5 | `****31838`, `****6A19E`, `****0C6BD`, `****20126`, `****C8D82` |
| 38.00400, -122.30900 | 4 | `****7027A`, `****D4739`, `****C0A6E`, `****97A05` |
| 43.01600, -82.34200 | 4 | `****19CF5`, `****DFEE1`, `****DC6F5`, `****CAF4D` |
| 38.44200, 27.20600 | 3 | `****184F9`, `****3A7DA`, `****DB0B1` |
| 40.67300, -80.16500 | 3 | `****CB43D`, `****C4AE5`, `****C31CD` |
| 47.25000, 14.35900 | 3 | `****10B45`, `****2E7FA`, `****10B45` |
| 43.89300, 22.52300 | 3 | `****1C25D`, `****2B912`, `****1C25D` |
| 46.73700, 22.09400 | 3 | `****AB999`, `****6E65E`, `****AB999` |
| 46.55600, 15.54000 | 3 | `****1C0BD`, `****E211C`, `****1C0BD` |

_…and 1135 more in the snapshot file._

## 3. Tight clusters (≥4 within 100 m) — 4 clusters

| Anchor (lat, lng) | Station count |
|---|---:|
| 37.40000, -121.98600 | 6 |
| 40.36900, -111.93000 | 5 |
| 38.00400, -122.30900 | 4 |
| 43.01600, -82.34200 | 4 |

## 4. Stations with ≤ 2 decimal places of coordinate precision — 3,758

| Name | Lat | Lng |
|---|---:|---:|
| `****1BB76` | 45.766 | -111.17 |
| `****6063D` | 45.494 | -122.61 |
| `****2109A` | 32.75 | -98.123 |
| `****65E15` | 42.11 | -80.127 |
| `****1BA1D` | 40.74 | -3.575 |
| `****0C799` | 51.354 | -0.14 |
| `****7A081` | 51.354 | -0.14 |
| `****20741` | 34.51 | 135.513 |
| `****2A5CD` | 47.36 | 8.528 |
| `****DB235` | 40.18 | -74.967 |

_…and 3748 more in the snapshot file._

---

## Methodology

Each finding is grounded in how a real CORS / RTK network is physically supposed to look:
- A surveyed GNSS reference station occupies one antenna at one coordinate. Two stations at the same point is structurally undefined.
- Honest sites at ≤ 10 m of each other are vanishingly rare — that's inside the cone of a single antenna mount.
- Clusters of ≥ 4 stations in 100 m can be honest (industrial campus, surveying lab) but justify a manual look.
- An RTK base claiming a position with ≤ 2 decimal places (≥ 1 km uncertainty) is not a real CORS station; the public network shouldn't surface them.

For an authoritative per-device GETKINETIK grade (hardware-rooted signature, chain age, tamper flags), the network or operator can POST a Proof of Origin URL to `https://getkinetik.app/api/verify-device`.

Contact: **eric@outfromnothingllc.com** · https://getkinetik.app/bureau/ · https://getkinetik.app/api/docs/
