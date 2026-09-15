# Sybil Risk Scan — Geodnet RTK Network

> Independent public read by the GETKINETIK Bureau using only Geodnet's public station endpoint. **No internal Geodnet data was used.** Geodnet RTK stations are surveyed GNSS reference units — each one is supposed to be a unique, physically installed antenna at a fixed coordinate. The heuristics below treat that as the structural rule and flag exceptions.

- **As of:** 2026-09-15
- **Public source:** `https://rtk.geodnet.com/api/v2/coverage_stations`
- **Stations observed:** 19,496
- **Stations flagged (any heuristic):** 5,360 (27.49%)

## Executive summary

1. **1019 exact (lat,lng) duplicate groups** on 19,496 public stations — each row in §1 is one coordinate pair your registry team can grep today.
2. **1,019 ≤10 m proximity clusters** — tighter than two physical RTK antennas; start with the largest counts in §2 (names + anchors included).
3. **27.5%** of the public fleet touches at least one heuristic — useful as a sampling denominator, not a verdict.

---

## Since last snapshot

| Metric | This run | vs last run |
|---|---:|---|
| Stations with coordinates | 19,496 | -4 (-0.0%) |
| Exact (lat,lng) duplicate groups | 1,019 | unchanged vs last run |
| Clusters within 10 m | 1,019 | unchanged vs last run |
| Clusters ≥4 within 100 m | 4 | unchanged vs last run |
| Low-precision coordinates (≤2 decimals) | 3,721 | -1 (-0.0%) |
| Fleet share flagged (any heuristic) | 27.49% | +0.00 pp (+0.0%) |

## What to cross-check this week

1. Registry dedupe: for each §1 coordinate pair, confirm whether multiple station IDs should share one surveyed antenna location.
2. Field ops: spot-check §3 tight clusters (≥4 within 100 m) — industrial campus vs duplicate registrations.
3. Data quality: stations in §4 with ≤2 decimal places should not appear as RTK references until coordinates are re-surveyed.
4. Reproduce: `node scripts/sybil-scan-geodnet.mjs` — same public endpoint, no API key.

> Public-data read. Re-run: script in `scripts/`, source URL in report header.

---

## Headline findings

1. **1,019 groups of stations share an exact (lat, lng) pair.** For a CORS / RTK reference network, two stations at identical coordinates is structurally undefined — there is no second-antenna position to triangulate from.
2. **1,019 clusters of stations sit within 10 m of each other.** That's tighter than the physical separation of two real RTK installs.
3. **4 clusters have ≥4 stations within 100 m.** Plausible for an industrial campus or surveying yard, but the names + counts are worth reviewing.
4. **3,721 stations publish coordinates with ≤ 2 decimal places** (≥ 1 km uncertainty). For RTK that's structurally wrong; coordinates should be 5+ decimals.

---

## 1. Exact-coordinate duplicates — 1,019 groups

| Coordinates | Station count | Names |
|---|---:|---|
| `37.4, -121.986` | 6 | `****3A778`, `****BFC96`, `****7AE7D`, `****67341`, `****60485`, `G001` |
| `49.439, 6.853` | 5 | `****DF559`, `****60159`, `****BCEA9`, `****64E45`, `****79375` |
| `40.369, -111.93` | 5 | `****31838`, `****6A19E`, `****0C6BD`, `****20126`, `****C8D82` |
| `43.016, -82.342` | 4 | `****19CF5`, `****DFEE1`, `****DC6F5`, `****CAF4D` |
| `38.442, 27.206` | 3 | `****3A7DA`, `****184F9`, `****DB0B1` |
| `31.457, -100.454` | 3 | `****09BE6`, `****116F9`, `****22B9A` |
| `47.092, 26.803` | 3 | `****23C4D`, `****685BD`, `****EB9C4` |
| `-26.222, -52.682` | 3 | `****CA911`, `****C482D`, `****C8C65` |
| `35.617, -117.692` | 3 | `****699C2`, `****1F341`, `****1FCBA` |
| `-35.316, 149.01` | 3 | `STR1`, `STR2`, `STR3` |

_…and 1009 more in the snapshot file._

## 2. Near-duplicate stations within 10 m — 1,019 clusters

| Anchor (lat, lng) | Station count | Names (truncated) |
|---|---:|---|
| 37.40000, -121.98600 | 6 | `****3A778`, `****BFC96`, `****7AE7D`, `****67341`, `****60485`, `G001` |
| 49.43900, 6.85300 | 5 | `****DF559`, `****60159`, `****BCEA9`, `****64E45`, `****79375` |
| 40.36900, -111.93000 | 5 | `****31838`, `****6A19E`, `****0C6BD`, `****20126`, `****C8D82` |
| 43.01600, -82.34200 | 4 | `****19CF5`, `****DFEE1`, `****DC6F5`, `****CAF4D` |
| 38.44200, 27.20600 | 3 | `****3A7DA`, `****184F9`, `****DB0B1` |
| 31.45700, -100.45400 | 3 | `****09BE6`, `****116F9`, `****22B9A` |
| 47.09200, 26.80300 | 3 | `****23C4D`, `****685BD`, `****EB9C4` |
| -26.22200, -52.68200 | 3 | `****CA911`, `****C482D`, `****C8C65` |
| 35.61700, -117.69200 | 3 | `****699C2`, `****1F341`, `****1FCBA` |
| -35.31600, 149.01000 | 3 | `STR1`, `STR2`, `STR3` |

_…and 1009 more in the snapshot file._

## 3. Tight clusters (≥4 within 100 m) — 4 clusters

| Anchor (lat, lng) | Station count |
|---|---:|
| 37.40000, -121.98600 | 6 |
| 49.43900, 6.85300 | 5 |
| 40.36900, -111.93000 | 5 |
| 43.01600, -82.34200 | 4 |

## 4. Stations with ≤ 2 decimal places of coordinate precision — 3,721

| Name | Lat | Lng |
|---|---:|---:|
| `****CA9D9` | 35.105 | 136.6 |
| `****69A64` | -22.376 | -41.79 |
| `****1C96D` | 39.63 | 39.619 |
| `****DFD75` | 49.44 | 6.853 |
| `****65D15` | 49.44 | 6.853 |
| `****CD009` | 45.43 | 27.525 |
| `****DB019` | 37.315 | 38.71 |
| `****B614D` | 37.57 | 30.98 |
| `MNTO` | -24.87 | 151.126 |
| `****DB311` | 6.886 | 79.91 |

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
