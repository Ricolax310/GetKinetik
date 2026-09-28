# Sybil Risk Scan — Geodnet RTK Network

> Independent public read by the GETKINETIK Bureau using only Geodnet's public station endpoint. **No internal Geodnet data was used.** Geodnet RTK stations are surveyed GNSS reference units — each one is supposed to be a unique, physically installed antenna at a fixed coordinate. The heuristics below treat that as the structural rule and flag exceptions.

- **As of:** 2026-09-28
- **Public source:** `https://rtk.geodnet.com/api/v2/coverage_stations`
- **Stations observed:** 19,492
- **Stations flagged (any heuristic):** 5,325 (27.32%)

## Executive summary

1. **1000 exact (lat,lng) duplicate groups** on 19,492 public stations — each row in §1 is one coordinate pair your registry team can grep today.
2. **1,000 ≤10 m proximity clusters** — tighter than two physical RTK antennas; start with the largest counts in §2 (names + anchors included).
3. **27.3%** of the public fleet touches at least one heuristic — useful as a sampling denominator, not a verdict.

---

## Since last snapshot

| Metric | This run | vs last run |
|---|---:|---|
| Stations with coordinates | 19,492 | -5 (-0.0%) |
| Exact (lat,lng) duplicate groups | 1,000 | -1 (-0.1%) |
| Clusters within 10 m | 1,000 | -1 (-0.1%) |
| Clusters ≥4 within 100 m | 3 | unchanged vs last run |
| Low-precision coordinates (≤2 decimals) | 3,705 | unchanged vs last run |
| Fleet share flagged (any heuristic) | 27.32% | -0.00 pp (-0.0%) |

## What to cross-check this week

1. Registry dedupe: for each §1 coordinate pair, confirm whether multiple station IDs should share one surveyed antenna location.
2. Field ops: spot-check §3 tight clusters (≥4 within 100 m) — industrial campus vs duplicate registrations.
3. Data quality: stations in §4 with ≤2 decimal places should not appear as RTK references until coordinates are re-surveyed.
4. Reproduce: `node scripts/sybil-scan-geodnet.mjs` — same public endpoint, no API key.

> Public-data read. Re-run: script in `scripts/`, source URL in report header.

---

## Headline findings

1. **1,000 groups of stations share an exact (lat, lng) pair.** For a CORS / RTK reference network, two stations at identical coordinates is structurally undefined — there is no second-antenna position to triangulate from.
2. **1,000 clusters of stations sit within 10 m of each other.** That's tighter than the physical separation of two real RTK installs.
3. **3 clusters have ≥4 stations within 100 m.** Plausible for an industrial campus or surveying yard, but the names + counts are worth reviewing.
4. **3,705 stations publish coordinates with ≤ 2 decimal places** (≥ 1 km uncertainty). For RTK that's structurally wrong; coordinates should be 5+ decimals.

---

## 1. Exact-coordinate duplicates — 1,000 groups

| Coordinates | Station count | Names |
|---|---:|---|
| `-22.521, -55.714` | 12 | `****CA139`, `****7CB9D`, `****CAA25`, `****83EED`, `****C91ED`, `****C933D`, `****C3241`, `****C4279`, `****C2711`, `****C5721`, `****C7CE9`, `****C89B9` |
| `37.4, -121.986` | 6 | `****3A778`, `****BFC96`, `****7AE7D`, `****67341`, `****60485`, `G001` |
| `38.004, -122.309` | 4 | `****D47F5`, `****D4D8D`, `****C0A6E`, `****97A05` |
| `36.321, -94.15` | 3 | `****69A4E`, `****C319D`, `****ADB39` |
| `38.674, -121.313` | 3 | `****D0E4C`, `****10EF1`, `****69DE6` |
| `46.513, 5.227` | 3 | `****CFF04`, `****FEE2C`, `****1C2C1` |
| `41.666, 26.593` | 3 | `****7230D`, `****BC2FD`, `****DB359` |
| `43.016, -82.342` | 3 | `****DFEE1`, `****CAF4D`, `****DC6F5` |
| `35.617, -117.692` | 3 | `****699C2`, `****1F341`, `****1FCBA` |
| `-35.316, 149.01` | 3 | `STR2`, `STR1`, `STR3` |

_…and 990 more in the snapshot file._

## 2. Near-duplicate stations within 10 m — 1,000 clusters

| Anchor (lat, lng) | Station count | Names (truncated) |
|---|---:|---|
| -22.52100, -55.71400 | 12 | `****CA139`, `****7CB9D`, `****CAA25`, `****83EED`, `****C91ED`, `****C933D` …(+6) |
| 37.40000, -121.98600 | 6 | `****3A778`, `****BFC96`, `****7AE7D`, `****67341`, `****60485`, `G001` |
| 38.00400, -122.30900 | 4 | `****D47F5`, `****D4D8D`, `****C0A6E`, `****97A05` |
| 36.32100, -94.15000 | 3 | `****69A4E`, `****C319D`, `****ADB39` |
| 38.67400, -121.31300 | 3 | `****D0E4C`, `****10EF1`, `****69DE6` |
| 46.51300, 5.22700 | 3 | `****CFF04`, `****FEE2C`, `****1C2C1` |
| 41.66600, 26.59300 | 3 | `****7230D`, `****BC2FD`, `****DB359` |
| 43.01600, -82.34200 | 3 | `****DFEE1`, `****CAF4D`, `****DC6F5` |
| 35.61700, -117.69200 | 3 | `****699C2`, `****1F341`, `****1FCBA` |
| -35.31600, 149.01000 | 3 | `STR2`, `STR1`, `STR3` |

_…and 990 more in the snapshot file._

## 3. Tight clusters (≥4 within 100 m) — 3 clusters

| Anchor (lat, lng) | Station count |
|---|---:|
| -22.52100, -55.71400 | 12 |
| 37.40000, -121.98600 | 6 |
| 38.00400, -122.30900 | 4 |

## 4. Stations with ≤ 2 decimal places of coordinate precision — 3,705

| Name | Lat | Lng |
|---|---:|---:|
| `****E40F1` | 37.26 | 35.055 |
| `****F2E01` | 41.03 | 37.182 |
| `****2AA2D` | 32.74 | -97.143 |
| `****14BAD` | -8.18 | 114.436 |
| `****D7AA1` | 50.437 | 2.2 |
| `****5D6F9` | 45.48 | -68.139 |
| `****69A4E` | 36.321 | -94.15 |
| `****67449` | 44.8 | 20.495 |
| `****D2F1A` | -12.98 | -38.451 |
| `****898C1` | 52.537 | -1.89 |

_…and 3695 more in the snapshot file._

---

## Methodology

Each finding is grounded in how a real CORS / RTK network is physically supposed to look:
- A surveyed GNSS reference station occupies one antenna at one coordinate. Two stations at the same point is structurally undefined.
- Honest sites at ≤ 10 m of each other are vanishingly rare — that's inside the cone of a single antenna mount.
- Clusters of ≥ 4 stations in 100 m can be honest (industrial campus, surveying lab) but justify a manual look.
- An RTK base claiming a position with ≤ 2 decimal places (≥ 1 km uncertainty) is not a real CORS station; the public network shouldn't surface them.

For an authoritative per-device GETKINETIK grade (hardware-rooted signature, chain age, tamper flags), the network or operator can POST a Proof of Origin URL to `https://getkinetik.app/api/verify-device`.

Contact: **eric@outfromnothingllc.com** · https://getkinetik.app/bureau/ · https://getkinetik.app/api/docs/
