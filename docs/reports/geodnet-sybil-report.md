# Sybil Risk Scan — Geodnet RTK Network

> Independent public read by the GETKINETIK Bureau using only Geodnet's public station endpoint. **No internal Geodnet data was used.** Geodnet RTK stations are surveyed GNSS reference units — each one is supposed to be a unique, physically installed antenna at a fixed coordinate. The heuristics below treat that as the structural rule and flag exceptions.

- **As of:** 2026-09-27
- **Public source:** `https://rtk.geodnet.com/api/v2/coverage_stations`
- **Stations observed:** 19,502
- **Stations flagged (any heuristic):** 5,343 (27.40%)

## Executive summary

1. **1003 exact (lat,lng) duplicate groups** on 19,502 public stations — each row in §1 is one coordinate pair your registry team can grep today.
2. **1,003 ≤10 m proximity clusters** — tighter than two physical RTK antennas; start with the largest counts in §2 (names + anchors included).
3. **27.4%** of the public fleet touches at least one heuristic — useful as a sampling denominator, not a verdict.

---

## Since last snapshot

| Metric | This run | vs last run |
|---|---:|---|
| Stations with coordinates | 19,502 | +6 (+0.0%) |
| Exact (lat,lng) duplicate groups | 1,003 | +1 (+0.1%) |
| Clusters within 10 m | 1,003 | +1 (+0.1%) |
| Clusters ≥4 within 100 m | 5 | +1 (+25.0%) |
| Low-precision coordinates (≤2 decimals) | 3,713 | -4 (-0.1%) |
| Fleet share flagged (any heuristic) | 27.40% | +0.03 pp (+0.1%) |

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
3. **5 clusters have ≥4 stations within 100 m.** Plausible for an industrial campus or surveying yard, but the names + counts are worth reviewing.
4. **3,713 stations publish coordinates with ≤ 2 decimal places** (≥ 1 km uncertainty). For RTK that's structurally wrong; coordinates should be 5+ decimals.

---

## 1. Exact-coordinate duplicates — 1,003 groups

| Coordinates | Station count | Names |
|---|---:|---|
| `-22.521, -55.714` | 11 | `****CA139`, `****7CB9D`, `****CAA25`, `****83EED`, `****C91ED`, `****C933D`, `****C3241`, `****C4279`, `****C89B9`, `****C2711`, `****C5721` |
| `49.439, 6.853` | 9 | `****BFA89`, `****DF559`, `****774F9`, `****BC245`, `****DB1AD`, `****97959`, `****77ADD`, `****BC99D`, `****79375` |
| `37.4, -121.986` | 6 | `****3A778`, `****BFC96`, `****7AE7D`, `****67341`, `****60485`, `G001` |
| `40.369, -111.93` | 5 | `****20126`, `****31838`, `****C8D82`, `****6A19E`, `****0C6BD` |
| `38.004, -122.309` | 4 | `****D47F5`, `****D4D8D`, `****C0A6E`, `****97A05` |
| `36.321, -94.15` | 3 | `****69A4E`, `****C319D`, `****ADB39` |
| `38.674, -121.313` | 3 | `****D0E4C`, `****10EF1`, `****69DE6` |
| `46.513, 5.227` | 3 | `****CFF04`, `****FEE2C`, `****1C2C1` |
| `41.666, 26.593` | 3 | `****7230D`, `****BC2FD`, `****DB359` |
| `43.016, -82.342` | 3 | `****DFEE1`, `****DC6F5`, `****CAF4D` |

_…and 993 more in the snapshot file._

## 2. Near-duplicate stations within 10 m — 1,003 clusters

| Anchor (lat, lng) | Station count | Names (truncated) |
|---|---:|---|
| -22.52100, -55.71400 | 11 | `****CA139`, `****7CB9D`, `****CAA25`, `****83EED`, `****C91ED`, `****C933D` …(+5) |
| 49.43900, 6.85300 | 9 | `****BFA89`, `****DF559`, `****774F9`, `****BC245`, `****DB1AD`, `****97959` …(+3) |
| 37.40000, -121.98600 | 6 | `****3A778`, `****BFC96`, `****7AE7D`, `****67341`, `****60485`, `G001` |
| 40.36900, -111.93000 | 5 | `****20126`, `****31838`, `****C8D82`, `****6A19E`, `****0C6BD` |
| 38.00400, -122.30900 | 4 | `****D47F5`, `****D4D8D`, `****C0A6E`, `****97A05` |
| 36.32100, -94.15000 | 3 | `****69A4E`, `****C319D`, `****ADB39` |
| 38.67400, -121.31300 | 3 | `****D0E4C`, `****10EF1`, `****69DE6` |
| 46.51300, 5.22700 | 3 | `****CFF04`, `****FEE2C`, `****1C2C1` |
| 41.66600, 26.59300 | 3 | `****7230D`, `****BC2FD`, `****DB359` |
| 43.01600, -82.34200 | 3 | `****DFEE1`, `****DC6F5`, `****CAF4D` |

_…and 993 more in the snapshot file._

## 3. Tight clusters (≥4 within 100 m) — 5 clusters

| Anchor (lat, lng) | Station count |
|---|---:|
| -22.52100, -55.71400 | 11 |
| 49.43900, 6.85300 | 9 |
| 37.40000, -121.98600 | 6 |
| 40.36900, -111.93000 | 5 |
| 38.00400, -122.30900 | 4 |

## 4. Stations with ≤ 2 decimal places of coordinate precision — 3,713

| Name | Lat | Lng |
|---|---:|---:|
| `****20126` | 40.369 | -111.93 |
| `****31838` | 40.369 | -111.93 |
| `****C8D82` | 40.369 | -111.93 |
| `****6A19E` | 40.369 | -111.93 |
| `****8D9E5` | -7.648 | 108.42 |
| `****CCA2D` | 51.65 | 9.758 |
| `****5E5F9` | 22.032 | 70.7 |
| `****7B975` | 49.44 | 6.853 |
| `****C4BB1` | 47.322 | -118.81 |
| `G058` | 51.87 | -176.635 |

_…and 3703 more in the snapshot file._

---

## Methodology

Each finding is grounded in how a real CORS / RTK network is physically supposed to look:
- A surveyed GNSS reference station occupies one antenna at one coordinate. Two stations at the same point is structurally undefined.
- Honest sites at ≤ 10 m of each other are vanishingly rare — that's inside the cone of a single antenna mount.
- Clusters of ≥ 4 stations in 100 m can be honest (industrial campus, surveying lab) but justify a manual look.
- An RTK base claiming a position with ≤ 2 decimal places (≥ 1 km uncertainty) is not a real CORS station; the public network shouldn't surface them.

For an authoritative per-device GETKINETIK grade (hardware-rooted signature, chain age, tamper flags), the network or operator can POST a Proof of Origin URL to `https://getkinetik.app/api/verify-device`.

Contact: **eric@outfromnothingllc.com** · https://getkinetik.app/bureau/ · https://getkinetik.app/api/docs/
