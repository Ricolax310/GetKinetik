# Sybil Risk Scan — Geodnet RTK Network

> Independent public read by the GETKINETIK Bureau using only Geodnet's public station endpoint. **No internal Geodnet data was used.** Geodnet RTK stations are surveyed GNSS reference units — each one is supposed to be a unique, physically installed antenna at a fixed coordinate. The heuristics below treat that as the structural rule and flag exceptions.

- **As of:** 2026-08-29
- **Public source:** `https://rtk.geodnet.com/api/v2/coverage_stations`
- **Stations observed:** 19,477
- **Stations flagged (any heuristic):** 5,337 (27.40%)

## Executive summary

1. **1007 exact (lat,lng) duplicate groups** on 19,477 public stations — each row in §1 is one coordinate pair your registry team can grep today.
2. **1,007 ≤10 m proximity clusters** — tighter than two physical RTK antennas; start with the largest counts in §2 (names + anchors included).
3. **27.4%** of the public fleet touches at least one heuristic — useful as a sampling denominator, not a verdict.

---

## Since last snapshot

| Metric | This run | vs last run |
|---|---:|---|
| Stations with coordinates | 19,477 | -5 (-0.0%) |
| Exact (lat,lng) duplicate groups | 1,007 | unchanged vs last run |
| Clusters within 10 m | 1,007 | unchanged vs last run |
| Clusters ≥4 within 100 m | 3 | unchanged vs last run |
| Low-precision coordinates (≤2 decimals) | 3,723 | +2 (+0.1%) |
| Fleet share flagged (any heuristic) | 27.40% | +0.02 pp (+0.1%) |

## What to cross-check this week

1. Registry dedupe: for each §1 coordinate pair, confirm whether multiple station IDs should share one surveyed antenna location.
2. Field ops: spot-check §3 tight clusters (≥4 within 100 m) — industrial campus vs duplicate registrations.
3. Data quality: stations in §4 with ≤2 decimal places should not appear as RTK references until coordinates are re-surveyed.
4. Reproduce: `node scripts/sybil-scan-geodnet.mjs` — same public endpoint, no API key.

> Public-data read. Re-run: script in `scripts/`, source URL in report header.

---

## Headline findings

1. **1,007 groups of stations share an exact (lat, lng) pair.** For a CORS / RTK reference network, two stations at identical coordinates is structurally undefined — there is no second-antenna position to triangulate from.
2. **1,007 clusters of stations sit within 10 m of each other.** That's tighter than the physical separation of two real RTK installs.
3. **3 clusters have ≥4 stations within 100 m.** Plausible for an industrial campus or surveying yard, but the names + counts are worth reviewing.
4. **3,723 stations publish coordinates with ≤ 2 decimal places** (≥ 1 km uncertainty). For RTK that's structurally wrong; coordinates should be 5+ decimals.

---

## 1. Exact-coordinate duplicates — 1,007 groups

| Coordinates | Station count | Names |
|---|---:|---|
| `37.4, -121.986` | 5 | `****BFC96`, `****7AE7D`, `****67341`, `****60485`, `G001` |
| `40.369, -111.93` | 5 | `****31838`, `****6A19E`, `****0C6BD`, `****20126`, `****C8D82` |
| `43.016, -82.342` | 4 | `****19CF5`, `****DFEE1`, `****CAF4D`, `****DC6F5` |
| `4.31, 101.143` | 3 | `****CADA9`, `****69EAA`, `****E3675` |
| `36.259, -115.176` | 3 | `****20C14`, `****6A1AA`, `****C8749` |
| `47.092, 26.803` | 3 | `****685BD`, `****EB9C4`, `****23C4D` |
| `35.617, -117.692` | 3 | `****699C2`, `****1F341`, `****1FCBA` |
| `35.209, -82.246` | 3 | `****6E64A`, `****2F569`, `****6E64A` |
| `-35.316, 149.01` | 3 | `STR2`, `STR1`, `STR3` |
| `-27.548, 153.084` | 3 | `****EE73D`, `****FBE61`, `****60459` |

_…and 997 more in the snapshot file._

## 2. Near-duplicate stations within 10 m — 1,007 clusters

| Anchor (lat, lng) | Station count | Names (truncated) |
|---|---:|---|
| 37.40000, -121.98600 | 5 | `****BFC96`, `****7AE7D`, `****67341`, `****60485`, `G001` |
| 40.36900, -111.93000 | 5 | `****31838`, `****6A19E`, `****0C6BD`, `****20126`, `****C8D82` |
| 43.01600, -82.34200 | 4 | `****19CF5`, `****DFEE1`, `****CAF4D`, `****DC6F5` |
| 4.31000, 101.14300 | 3 | `****CADA9`, `****69EAA`, `****E3675` |
| 36.25900, -115.17600 | 3 | `****20C14`, `****6A1AA`, `****C8749` |
| 47.09200, 26.80300 | 3 | `****685BD`, `****EB9C4`, `****23C4D` |
| 35.61700, -117.69200 | 3 | `****699C2`, `****1F341`, `****1FCBA` |
| 35.20900, -82.24600 | 3 | `****6E64A`, `****2F569`, `****6E64A` |
| -35.31600, 149.01000 | 3 | `STR2`, `STR1`, `STR3` |
| -27.54800, 153.08400 | 3 | `****EE73D`, `****FBE61`, `****60459` |

_…and 997 more in the snapshot file._

## 3. Tight clusters (≥4 within 100 m) — 3 clusters

| Anchor (lat, lng) | Station count |
|---|---:|
| 37.40000, -121.98600 | 5 |
| 40.36900, -111.93000 | 5 |
| 43.01600, -82.34200 | 4 |

## 4. Stations with ≤ 2 decimal places of coordinate precision — 3,723

| Name | Lat | Lng |
|---|---:|---:|
| `****F2E01` | 41.03 | 37.182 |
| `****73CC1` | 51.64 | -8.837 |
| `****EBA88` | 40.697 | -99.1 |
| `****CADA9` | 4.31 | 101.143 |
| `****10C31` | 53.48 | -9.912 |
| `****F354D` | 44.296 | -78.38 |
| `****23365` | -8.21 | 113.936 |
| `****79EC5` | 50.081 | 5.22 |
| `****3F506` | 46.015 | 16.54 |
| `****BE139` | 40.79 | -74.881 |

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
