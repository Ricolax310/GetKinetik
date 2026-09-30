# Sybil Risk Scan — Geodnet RTK Network

> Independent public read by the GETKINETIK Bureau using only Geodnet's public station endpoint. **No internal Geodnet data was used.** Geodnet RTK stations are surveyed GNSS reference units — each one is supposed to be a unique, physically installed antenna at a fixed coordinate. The heuristics below treat that as the structural rule and flag exceptions.

- **As of:** 2026-09-30
- **Public source:** `https://rtk.geodnet.com/api/v2/coverage_stations`
- **Stations observed:** 19,523
- **Stations flagged (any heuristic):** 5,341 (27.36%)

## Executive summary

1. **1003 exact (lat,lng) duplicate groups** on 19,523 public stations — each row in §1 is one coordinate pair your registry team can grep today.
2. **1,003 ≤10 m proximity clusters** — tighter than two physical RTK antennas; start with the largest counts in §2 (names + anchors included).
3. **27.4%** of the public fleet touches at least one heuristic — useful as a sampling denominator, not a verdict.

---

## Since last snapshot

| Metric | This run | vs last run |
|---|---:|---|
| Stations with coordinates | 19,523 | +1 (+0.0%) |
| Exact (lat,lng) duplicate groups | 1,003 | -1 (-0.1%) |
| Clusters within 10 m | 1,003 | -1 (-0.1%) |
| Clusters ≥4 within 100 m | 3 | unchanged vs last run |
| Low-precision coordinates (≤2 decimals) | 3,721 | +4 (+0.1%) |
| Fleet share flagged (any heuristic) | 27.36% | +0.01 pp (+0.0%) |

## What to cross-check this week

1. Registry dedupe: for each §1 coordinate pair, confirm whether multiple station IDs should share one surveyed antenna location.
2. Field ops: spot-check §3 tight clusters (≥4 within 100 m) — industrial campus vs duplicate registrations.
3. Data quality: stations in §4 with ≤2 decimal places should not appear as RTK references until coordinates are re-surveyed.
4. Reproduce: `node scripts/sybil-scan-geodnet.mjs` — same public endpoint, no API key.

> Public-data read. Re-run: script in `scripts/`, source URL in report header.

---

## Headline findings

1. **1,003 groups of stations share an exact (lat, lng) pair.** For a CORS / RTK reference network, two stations at identical coordinates is structurally undefined — there is no second-antenna position to triangulate from.
2. **1,003 clusters of stations sit within 10 m of each other.** That's tighter than the physical separation of two real RTK installs.
3. **3 clusters have ≥4 stations within 100 m.** Plausible for an industrial campus or surveying yard, but the names + counts are worth reviewing.
4. **3,721 stations publish coordinates with ≤ 2 decimal places** (≥ 1 km uncertainty). For RTK that's structurally wrong; coordinates should be 5+ decimals.

---

## 1. Exact-coordinate duplicates — 1,003 groups

| Coordinates | Station count | Names |
|---|---:|---|
| `-22.521, -55.714` | 11 | `****7CB9D`, `****CAA25`, `****83EED`, `****C91ED`, `****C933D`, `****C3241`, `****C4279`, `****C2711`, `****C5721`, `****C7CE9`, `****C89B9` |
| `37.4, -121.986` | 6 | `****3A778`, `****BFC96`, `****7AE7D`, `****67341`, `****60485`, `G001` |
| `38.004, -122.309` | 4 | `****D47F5`, `****D4D8D`, `****C0A6E`, `****97A05` |
| `38.674, -121.313` | 3 | `****D0E4C`, `****10EF1`, `****69DE6` |
| `46.513, 5.227` | 3 | `****CFF04`, `****FEE2C`, `****1C2C1` |
| `41.666, 26.593` | 3 | `****7230D`, `****BC2FD`, `****DB359` |
| `43.016, -82.342` | 3 | `****DFEE1`, `****CAF4D`, `****DC6F5` |
| `35.617, -117.692` | 3 | `****699C2`, `****1F341`, `****1FCBA` |
| `-35.316, 149.01` | 3 | `STR2`, `STR1`, `STR3` |
| `-27.548, 153.084` | 3 | `****EE73D`, `****FBE61`, `****60459` |

_…and 993 more in the snapshot file._

## 2. Near-duplicate stations within 10 m — 1,003 clusters

| Anchor (lat, lng) | Station count | Names (truncated) |
|---|---:|---|
| -22.52100, -55.71400 | 11 | `****7CB9D`, `****CAA25`, `****83EED`, `****C91ED`, `****C933D`, `****C3241` …(+5) |
| 37.40000, -121.98600 | 6 | `****3A778`, `****BFC96`, `****7AE7D`, `****67341`, `****60485`, `G001` |
| 38.00400, -122.30900 | 4 | `****D47F5`, `****D4D8D`, `****C0A6E`, `****97A05` |
| 38.67400, -121.31300 | 3 | `****D0E4C`, `****10EF1`, `****69DE6` |
| 46.51300, 5.22700 | 3 | `****CFF04`, `****FEE2C`, `****1C2C1` |
| 41.66600, 26.59300 | 3 | `****7230D`, `****BC2FD`, `****DB359` |
| 43.01600, -82.34200 | 3 | `****DFEE1`, `****CAF4D`, `****DC6F5` |
| 35.61700, -117.69200 | 3 | `****699C2`, `****1F341`, `****1FCBA` |
| -35.31600, 149.01000 | 3 | `STR2`, `STR1`, `STR3` |
| -27.54800, 153.08400 | 3 | `****EE73D`, `****FBE61`, `****60459` |

_…and 993 more in the snapshot file._

## 3. Tight clusters (≥4 within 100 m) — 3 clusters

| Anchor (lat, lng) | Station count |
|---|---:|
| -22.52100, -55.71400 | 11 |
| 37.40000, -121.98600 | 6 |
| 38.00400, -122.30900 | 4 |

## 4. Stations with ≤ 2 decimal places of coordinate precision — 3,721

| Name | Lat | Lng |
|---|---:|---:|
| `****D44A1` | -7.367 | 106.54 |
| `****C319D` | 36.321 | -94.15 |
| `****64EE5` | 43.259 | 26.69 |
| `****FCB11` | 37.434 | 35.83 |
| `****BF101` | -29.33 | 29.917 |
| `****DB789` | 41.43 | -8.302 |
| `****32819` | 43.35 | -79.819 |
| `****CF849` | 32.77 | -17.212 |
| `****E2FDD` | 2.583 | 102.6 |
| `****65FD1` | 28.694 | 77.19 |

_…and 3711 more in the snapshot file._

---

## Methodology

Each finding is grounded in how a real CORS / RTK network is physically supposed to look:
- A surveyed GNSS reference station occupies one antenna at one coordinate. Two stations at the same point is structurally undefined.
- Honest sites at ≤ 10 m of each other are vanishingly rare — that's inside the cone of a single antenna mount.
- Clusters of ≥ 4 stations in 100 m can be honest (industrial campus, surveying lab) but justify a manual look.
- An RTK base claiming a position with ≤ 2 decimal places (≥ 1 km uncertainty) is not a real CORS station; the public network shouldn't surface them.

For an authoritative per-device GETKINETIK grade (hardware-rooted signature, chain age, tamper flags), the network or operator can POST a Proof of Origin URL to `https://getkinetik.app/api/verify-device`.

Contact: **eric@outfromnothingllc.com** · https://getkinetik.app/bureau/ · https://getkinetik.app/api/docs/
