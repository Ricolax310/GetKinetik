# Sybil Risk Scan — Geodnet RTK Network

> Independent public read by the GETKINETIK Bureau using only Geodnet's public station endpoint. **No internal Geodnet data was used.** Geodnet RTK stations are surveyed GNSS reference units — each one is supposed to be a unique, physically installed antenna at a fixed coordinate. The heuristics below treat that as the structural rule and flag exceptions.

- **As of:** 2026-09-25
- **Public source:** `https://rtk.geodnet.com/api/v2/coverage_stations`
- **Stations observed:** 19,490
- **Stations flagged (any heuristic):** 5,332 (27.36%)

## Executive summary

1. **1002 exact (lat,lng) duplicate groups** on 19,490 public stations — each row in §1 is one coordinate pair your registry team can grep today.
2. **1,002 ≤10 m proximity clusters** — tighter than two physical RTK antennas; start with the largest counts in §2 (names + anchors included).
3. **27.4%** of the public fleet touches at least one heuristic — useful as a sampling denominator, not a verdict.

---

## Since last snapshot

| Metric | This run | vs last run |
|---|---:|---|
| Stations with coordinates | 19,490 | -5 (-0.0%) |
| Exact (lat,lng) duplicate groups | 1,002 | -1 (-0.1%) |
| Clusters within 10 m | 1,002 | -1 (-0.1%) |
| Clusters ≥4 within 100 m | 4 | unchanged vs last run |
| Low-precision coordinates (≤2 decimals) | 3,716 | -4 (-0.1%) |
| Fleet share flagged (any heuristic) | 27.36% | -0.01 pp (-0.0%) |

## What to cross-check this week

1. Registry dedupe: for each §1 coordinate pair, confirm whether multiple station IDs should share one surveyed antenna location.
2. Field ops: spot-check §3 tight clusters (≥4 within 100 m) — industrial campus vs duplicate registrations.
3. Data quality: stations in §4 with ≤2 decimal places should not appear as RTK references until coordinates are re-surveyed.
4. Reproduce: `node scripts/sybil-scan-geodnet.mjs` — same public endpoint, no API key.

> Public-data read. Re-run: script in `scripts/`, source URL in report header.

---

## Headline findings

1. **1,002 groups of stations share an exact (lat, lng) pair.** For a CORS / RTK reference network, two stations at identical coordinates is structurally undefined — there is no second-antenna position to triangulate from.
2. **1,002 clusters of stations sit within 10 m of each other.** That's tighter than the physical separation of two real RTK installs.
3. **4 clusters have ≥4 stations within 100 m.** Plausible for an industrial campus or surveying yard, but the names + counts are worth reviewing.
4. **3,716 stations publish coordinates with ≤ 2 decimal places** (≥ 1 km uncertainty). For RTK that's structurally wrong; coordinates should be 5+ decimals.

---

## 1. Exact-coordinate duplicates — 1,002 groups

| Coordinates | Station count | Names |
|---|---:|---|
| `49.439, 6.853` | 9 | `****BFA89`, `****DF559`, `****774F9`, `****BC245`, `****DB1AD`, `****97959`, `****77ADD`, `****BC99D`, `****79375` |
| `37.4, -121.986` | 6 | `****3A778`, `****BFC96`, `****7AE7D`, `****67341`, `****60485`, `G001` |
| `40.369, -111.93` | 5 | `****20126`, `****31838`, `****C8D82`, `****6A19E`, `****0C6BD` |
| `38.004, -122.309` | 4 | `****D47F5`, `****D4D8D`, `****C0A6E`, `****97A05` |
| `36.321, -94.15` | 3 | `****69A4E`, `****C319D`, `****ADB39` |
| `43.016, -82.342` | 3 | `****DFEE1`, `****DC6F5`, `****CAF4D` |
| `35.617, -117.692` | 3 | `****699C2`, `****1F341`, `****1FCBA` |
| `-35.316, 149.01` | 3 | `STR1`, `STR2`, `STR3` |
| `-27.548, 153.084` | 3 | `****EE73D`, `****FBE61`, `****60459` |
| `54.937, 24.067` | 2 | `****453A7`, `****3A76A` |

_…and 992 more in the snapshot file._

## 2. Near-duplicate stations within 10 m — 1,002 clusters

| Anchor (lat, lng) | Station count | Names (truncated) |
|---|---:|---|
| 49.43900, 6.85300 | 9 | `****BFA89`, `****DF559`, `****774F9`, `****BC245`, `****DB1AD`, `****97959` …(+3) |
| 37.40000, -121.98600 | 6 | `****3A778`, `****BFC96`, `****7AE7D`, `****67341`, `****60485`, `G001` |
| 40.36900, -111.93000 | 5 | `****20126`, `****31838`, `****C8D82`, `****6A19E`, `****0C6BD` |
| 38.00400, -122.30900 | 4 | `****D47F5`, `****D4D8D`, `****C0A6E`, `****97A05` |
| 36.32100, -94.15000 | 3 | `****69A4E`, `****C319D`, `****ADB39` |
| 43.01600, -82.34200 | 3 | `****DFEE1`, `****DC6F5`, `****CAF4D` |
| 35.61700, -117.69200 | 3 | `****699C2`, `****1F341`, `****1FCBA` |
| -35.31600, 149.01000 | 3 | `STR1`, `STR2`, `STR3` |
| -27.54800, 153.08400 | 3 | `****EE73D`, `****FBE61`, `****60459` |
| 54.93700, 24.06700 | 2 | `****453A7`, `****3A76A` |

_…and 992 more in the snapshot file._

## 3. Tight clusters (≥4 within 100 m) — 4 clusters

| Anchor (lat, lng) | Station count |
|---|---:|
| 49.43900, 6.85300 | 9 |
| 37.40000, -121.98600 | 6 |
| 40.36900, -111.93000 | 5 |
| 38.00400, -122.30900 | 4 |

## 4. Stations with ≤ 2 decimal places of coordinate precision — 3,716

| Name | Lat | Lng |
|---|---:|---:|
| `****DB89D` | 37.54 | 40.884 |
| `****2A551` | 1.84 | 103.315 |
| `****1C475` | 6.82 | 3.46 |
| `****68575` | 44.597 | 24.94 |
| `****8DF35` | -20.708 | -46.62 |
| `****0A980` | 41.11 | -8.398 |
| `****C4CF0` | 40.21 | 0.021 |
| `****65A05` | 40.21 | 0.021 |
| `****E6AE9` | 5.272 | -75.49 |
| `****DD631` | 43.2 | 5.6 |

_…and 3706 more in the snapshot file._

---

## Methodology

Each finding is grounded in how a real CORS / RTK network is physically supposed to look:
- A surveyed GNSS reference station occupies one antenna at one coordinate. Two stations at the same point is structurally undefined.
- Honest sites at ≤ 10 m of each other are vanishingly rare — that's inside the cone of a single antenna mount.
- Clusters of ≥ 4 stations in 100 m can be honest (industrial campus, surveying lab) but justify a manual look.
- An RTK base claiming a position with ≤ 2 decimal places (≥ 1 km uncertainty) is not a real CORS station; the public network shouldn't surface them.

For an authoritative per-device GETKINETIK grade (hardware-rooted signature, chain age, tamper flags), the network or operator can POST a Proof of Origin URL to `https://getkinetik.app/api/verify-device`.

Contact: **eric@outfromnothingllc.com** · https://getkinetik.app/bureau/ · https://getkinetik.app/api/docs/
