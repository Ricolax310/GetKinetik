# Sybil Risk Scan — Geodnet RTK Network

> Independent public read by the GETKINETIK Bureau using only Geodnet's public station endpoint. **No internal Geodnet data was used.** Geodnet RTK stations are surveyed GNSS reference units — each one is supposed to be a unique, physically installed antenna at a fixed coordinate. The heuristics below treat that as the structural rule and flag exceptions.

- **As of:** 2026-09-07
- **Public source:** `https://rtk.geodnet.com/api/v2/coverage_stations`
- **Stations observed:** 19,482
- **Stations flagged (any heuristic):** 5,342 (27.42%)

## Executive summary

1. **1008 exact (lat,lng) duplicate groups** on 19,482 public stations — each row in §1 is one coordinate pair your registry team can grep today.
2. **1,008 ≤10 m proximity clusters** — tighter than two physical RTK antennas; start with the largest counts in §2 (names + anchors included).
3. **27.4%** of the public fleet touches at least one heuristic — useful as a sampling denominator, not a verdict.

---

## Since last snapshot

| Metric | This run | vs last run |
|---|---:|---|
| Stations with coordinates | 19,482 | +9 (+0.0%) |
| Exact (lat,lng) duplicate groups | 1,008 | +1 (+0.1%) |
| Clusters within 10 m | 1,008 | +1 (+0.1%) |
| Clusters ≥4 within 100 m | 4 | unchanged vs last run |
| Low-precision coordinates (≤2 decimals) | 3,731 | +3 (+0.1%) |
| Fleet share flagged (any heuristic) | 27.42% | +0.00 pp (+0.0%) |

## What to cross-check this week

1. Registry dedupe: for each §1 coordinate pair, confirm whether multiple station IDs should share one surveyed antenna location.
2. Field ops: spot-check §3 tight clusters (≥4 within 100 m) — industrial campus vs duplicate registrations.
3. Data quality: stations in §4 with ≤2 decimal places should not appear as RTK references until coordinates are re-surveyed.
4. Reproduce: `node scripts/sybil-scan-geodnet.mjs` — same public endpoint, no API key.

> Public-data read. Re-run: script in `scripts/`, source URL in report header.

---

## Headline findings

1. **1,008 groups of stations share an exact (lat, lng) pair.** For a CORS / RTK reference network, two stations at identical coordinates is structurally undefined — there is no second-antenna position to triangulate from.
2. **1,008 clusters of stations sit within 10 m of each other.** That's tighter than the physical separation of two real RTK installs.
3. **4 clusters have ≥4 stations within 100 m.** Plausible for an industrial campus or surveying yard, but the names + counts are worth reviewing.
4. **3,731 stations publish coordinates with ≤ 2 decimal places** (≥ 1 km uncertainty). For RTK that's structurally wrong; coordinates should be 5+ decimals.

---

## 1. Exact-coordinate duplicates — 1,008 groups

| Coordinates | Station count | Names |
|---|---:|---|
| `37.4, -121.986` | 6 | `****3A778`, `****BFC96`, `****7AE7D`, `****67341`, `****60485`, `G001` |
| `40.369, -111.93` | 5 | `****31838`, `****6A19E`, `****0C6BD`, `****20126`, `****C8D82` |
| `38.004, -122.309` | 4 | `****7027A`, `****D4739`, `****C0A6E`, `****97A05` |
| `43.016, -82.342` | 4 | `****19CF5`, `****DFEE1`, `****DC6F5`, `****CAF4D` |
| `40.673, -80.165` | 3 | `****CB43D`, `****C4AE5`, `****C31CD` |
| `-27.548, 153.084` | 3 | `****60459`, `****EE73D`, `****FBE61` |
| `35.617, -117.692` | 3 | `****699C2`, `****1F341`, `****1FCBA` |
| `-35.316, 149.01` | 3 | `STR1`, `STR2`, `STR3` |
| `-28.234, 153.524` | 2 | `****A56A1`, `****6A15C` |
| `34.046, -117.775` | 2 | `****1ED4A`, `****675FD` |

_…and 998 more in the snapshot file._

## 2. Near-duplicate stations within 10 m — 1,008 clusters

| Anchor (lat, lng) | Station count | Names (truncated) |
|---|---:|---|
| 37.40000, -121.98600 | 6 | `****3A778`, `****BFC96`, `****7AE7D`, `****67341`, `****60485`, `G001` |
| 40.36900, -111.93000 | 5 | `****31838`, `****6A19E`, `****0C6BD`, `****20126`, `****C8D82` |
| 38.00400, -122.30900 | 4 | `****7027A`, `****D4739`, `****C0A6E`, `****97A05` |
| 43.01600, -82.34200 | 4 | `****19CF5`, `****DFEE1`, `****DC6F5`, `****CAF4D` |
| 40.67300, -80.16500 | 3 | `****CB43D`, `****C4AE5`, `****C31CD` |
| -27.54800, 153.08400 | 3 | `****60459`, `****EE73D`, `****FBE61` |
| 35.61700, -117.69200 | 3 | `****699C2`, `****1F341`, `****1FCBA` |
| -35.31600, 149.01000 | 3 | `STR1`, `STR2`, `STR3` |
| -28.23400, 153.52400 | 2 | `****A56A1`, `****6A15C` |
| 34.04600, -117.77500 | 2 | `****1ED4A`, `****675FD` |

_…and 998 more in the snapshot file._

## 3. Tight clusters (≥4 within 100 m) — 4 clusters

| Anchor (lat, lng) | Station count |
|---|---:|
| 37.40000, -121.98600 | 6 |
| 40.36900, -111.93000 | 5 |
| 38.00400, -122.30900 | 4 |
| 43.01600, -82.34200 | 4 |

## 4. Stations with ≤ 2 decimal places of coordinate precision — 3,731

| Name | Lat | Lng |
|---|---:|---:|
| `****CC221` | 7.948 | -80.78 |
| `****11141` | 52.01 | 5.041 |
| `****BFF39` | 37.02 | 29.166 |
| `****ED371` | 38.92 | -1.724 |
| `****D7AA1` | 50.437 | 2.2 |
| `****74395` | 10.381 | 78.82 |
| `****1C0F9` | 48.18 | 17.494 |
| `****DC1C9` | 17.283 | 74.17 |
| `****22204` | 37.07 | 35.129 |
| `****C0D0D` | -5.49 | 104.224 |

_…and 3721 more in the snapshot file._

---

## Methodology

Each finding is grounded in how a real CORS / RTK network is physically supposed to look:
- A surveyed GNSS reference station occupies one antenna at one coordinate. Two stations at the same point is structurally undefined.
- Honest sites at ≤ 10 m of each other are vanishingly rare — that's inside the cone of a single antenna mount.
- Clusters of ≥ 4 stations in 100 m can be honest (industrial campus, surveying lab) but justify a manual look.
- An RTK base claiming a position with ≤ 2 decimal places (≥ 1 km uncertainty) is not a real CORS station; the public network shouldn't surface them.

For an authoritative per-device GETKINETIK grade (hardware-rooted signature, chain age, tamper flags), the network or operator can POST a Proof of Origin URL to `https://getkinetik.app/api/verify-device`.

Contact: **eric@outfromnothingllc.com** · https://getkinetik.app/bureau/ · https://getkinetik.app/api/docs/
