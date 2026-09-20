# Sybil Risk Scan — Geodnet RTK Network

> Independent public read by the GETKINETIK Bureau using only Geodnet's public station endpoint. **No internal Geodnet data was used.** Geodnet RTK stations are surveyed GNSS reference units — each one is supposed to be a unique, physically installed antenna at a fixed coordinate. The heuristics below treat that as the structural rule and flag exceptions.

- **As of:** 2026-09-20
- **Public source:** `https://rtk.geodnet.com/api/v2/coverage_stations`
- **Stations observed:** 19,499
- **Stations flagged (any heuristic):** 5,339 (27.38%)

## Executive summary

1. **1006 exact (lat,lng) duplicate groups** on 19,499 public stations — each row in §1 is one coordinate pair your registry team can grep today.
2. **1,006 ≤10 m proximity clusters** — tighter than two physical RTK antennas; start with the largest counts in §2 (names + anchors included).
3. **27.4%** of the public fleet touches at least one heuristic — useful as a sampling denominator, not a verdict.

---

## Since last snapshot

| Metric | This run | vs last run |
|---|---:|---|
| Stations with coordinates | 19,499 | +5 (+0.0%) |
| Exact (lat,lng) duplicate groups | 1,006 | +1 (+0.1%) |
| Clusters within 10 m | 1,006 | +1 (+0.1%) |
| Clusters ≥4 within 100 m | 2 | unchanged vs last run |
| Low-precision coordinates (≤2 decimals) | 3,723 | +1 (+0.0%) |
| Fleet share flagged (any heuristic) | 27.38% | +0.01 pp (+0.0%) |

## What to cross-check this week

1. Registry dedupe: for each §1 coordinate pair, confirm whether multiple station IDs should share one surveyed antenna location.
2. Field ops: spot-check §3 tight clusters (≥4 within 100 m) — industrial campus vs duplicate registrations.
3. Data quality: stations in §4 with ≤2 decimal places should not appear as RTK references until coordinates are re-surveyed.
4. Reproduce: `node scripts/sybil-scan-geodnet.mjs` — same public endpoint, no API key.

> Public-data read. Re-run: script in `scripts/`, source URL in report header.

---

## Headline findings

1. **1,006 groups of stations share an exact (lat, lng) pair.** For a CORS / RTK reference network, two stations at identical coordinates is structurally undefined — there is no second-antenna position to triangulate from.
2. **1,006 clusters of stations sit within 10 m of each other.** That's tighter than the physical separation of two real RTK installs.
3. **2 clusters have ≥4 stations within 100 m.** Plausible for an industrial campus or surveying yard, but the names + counts are worth reviewing.
4. **3,723 stations publish coordinates with ≤ 2 decimal places** (≥ 1 km uncertainty). For RTK that's structurally wrong; coordinates should be 5+ decimals.

---

## 1. Exact-coordinate duplicates — 1,006 groups

| Coordinates | Station count | Names |
|---|---:|---|
| `37.4, -121.986` | 6 | `****3A778`, `****BFC96`, `****7AE7D`, `****67341`, `****60485`, `G001` |
| `40.369, -111.93` | 5 | `****31838`, `****6A19E`, `****0C6BD`, `****20126`, `****C8D82` |
| `-26.222, -52.682` | 3 | `****CA911`, `****C482D`, `****C8C65` |
| `37.399, -121.979` | 3 | `****52DB9`, `****AC445`, `****1C2B5` |
| `40.777, 29.689` | 3 | `****B82E1`, `****81599`, `****3B246` |
| `43.016, -82.342` | 3 | `****DFEE1`, `****DC6F5`, `****CAF4D` |
| `35.617, -117.692` | 3 | `****699C2`, `****1F341`, `****1FCBA` |
| `-35.316, 149.01` | 3 | `STR1`, `STR2`, `STR3` |
| `-27.548, 153.084` | 3 | `****EE73D`, `****FBE61`, `****60459` |
| `40.911, 30.194` | 2 | `****38E2A`, `****33EE9` |

_…and 996 more in the snapshot file._

## 2. Near-duplicate stations within 10 m — 1,006 clusters

| Anchor (lat, lng) | Station count | Names (truncated) |
|---|---:|---|
| 37.40000, -121.98600 | 6 | `****3A778`, `****BFC96`, `****7AE7D`, `****67341`, `****60485`, `G001` |
| 40.36900, -111.93000 | 5 | `****31838`, `****6A19E`, `****0C6BD`, `****20126`, `****C8D82` |
| -26.22200, -52.68200 | 3 | `****CA911`, `****C482D`, `****C8C65` |
| 37.39900, -121.97900 | 3 | `****52DB9`, `****AC445`, `****1C2B5` |
| 40.77700, 29.68900 | 3 | `****B82E1`, `****81599`, `****3B246` |
| 43.01600, -82.34200 | 3 | `****DFEE1`, `****DC6F5`, `****CAF4D` |
| 35.61700, -117.69200 | 3 | `****699C2`, `****1F341`, `****1FCBA` |
| -35.31600, 149.01000 | 3 | `STR1`, `STR2`, `STR3` |
| -27.54800, 153.08400 | 3 | `****EE73D`, `****FBE61`, `****60459` |
| 40.91100, 30.19400 | 2 | `****38E2A`, `****33EE9` |

_…and 996 more in the snapshot file._

## 3. Tight clusters (≥4 within 100 m) — 2 clusters

| Anchor (lat, lng) | Station count |
|---|---:|
| 37.40000, -121.98600 | 6 |
| 40.36900, -111.93000 | 5 |

## 4. Stations with ≤ 2 decimal places of coordinate precision — 3,723

| Name | Lat | Lng |
|---|---:|---:|
| `****DC1B5` | 23.59 | 87.204 |
| `****1CF1D` | 13.15 | 77.568 |
| `****231C9` | 49.74 | 7.316 |
| `****B6DF0` | -23.58 | -47.062 |
| `****70C11` | 6.733 | 81.1 |
| `****166D9` | -29.752 | 31.06 |
| `****CA8AD` | 21.684 | 69.76 |
| `****10E15` | 6.65 | 3.151 |
| `****C3CE4` | 44.254 | 12.07 |
| `****702D4` | 41.72 | -73.919 |

_…and 3713 more in the snapshot file._

---

## Methodology

Each finding is grounded in how a real CORS / RTK network is physically supposed to look:
- A surveyed GNSS reference station occupies one antenna at one coordinate. Two stations at the same point is structurally undefined.
- Honest sites at ≤ 10 m of each other are vanishingly rare — that's inside the cone of a single antenna mount.
- Clusters of ≥ 4 stations in 100 m can be honest (industrial campus, surveying lab) but justify a manual look.
- An RTK base claiming a position with ≤ 2 decimal places (≥ 1 km uncertainty) is not a real CORS station; the public network shouldn't surface them.

For an authoritative per-device GETKINETIK grade (hardware-rooted signature, chain age, tamper flags), the network or operator can POST a Proof of Origin URL to `https://getkinetik.app/api/verify-device`.

Contact: **eric@outfromnothingllc.com** · https://getkinetik.app/bureau/ · https://getkinetik.app/api/docs/
