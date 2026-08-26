# Sybil Risk Scan — Geodnet RTK Network

> Independent public read by the GETKINETIK Bureau using only Geodnet's public station endpoint. **No internal Geodnet data was used.** Geodnet RTK stations are surveyed GNSS reference units — each one is supposed to be a unique, physically installed antenna at a fixed coordinate. The heuristics below treat that as the structural rule and flag exceptions.

- **As of:** 2026-08-26
- **Public source:** `https://rtk.geodnet.com/api/v2/coverage_stations`
- **Stations observed:** 19,503
- **Stations flagged (any heuristic):** 5,339 (27.38%)

## Executive summary

1. **1009 exact (lat,lng) duplicate groups** on 19,503 public stations — each row in §1 is one coordinate pair your registry team can grep today.
2. **1,009 ≤10 m proximity clusters** — tighter than two physical RTK antennas; start with the largest counts in §2 (names + anchors included).
3. **27.4%** of the public fleet touches at least one heuristic — useful as a sampling denominator, not a verdict.

---

## Since last snapshot

| Metric | This run | vs last run |
|---|---:|---|
| Stations with coordinates | 19,503 | -5 (-0.0%) |
| Exact (lat,lng) duplicate groups | 1,009 | +2 (+0.2%) |
| Clusters within 10 m | 1,009 | +2 (+0.2%) |
| Clusters ≥4 within 100 m | 3 | -1 (-25.0%) |
| Low-precision coordinates (≤2 decimals) | 3,721 | unchanged vs last run |
| Fleet share flagged (any heuristic) | 27.38% | +0.01 pp (+0.0%) |

## What to cross-check this week

1. Registry dedupe: for each §1 coordinate pair, confirm whether multiple station IDs should share one surveyed antenna location.
2. Field ops: spot-check §3 tight clusters (≥4 within 100 m) — industrial campus vs duplicate registrations.
3. Data quality: stations in §4 with ≤2 decimal places should not appear as RTK references until coordinates are re-surveyed.
4. Reproduce: `node scripts/sybil-scan-geodnet.mjs` — same public endpoint, no API key.

> Public-data read. Re-run: script in `scripts/`, source URL in report header.

---

## Headline findings

1. **1,009 groups of stations share an exact (lat, lng) pair.** For a CORS / RTK reference network, two stations at identical coordinates is structurally undefined — there is no second-antenna position to triangulate from.
2. **1,009 clusters of stations sit within 10 m of each other.** That's tighter than the physical separation of two real RTK installs.
3. **3 clusters have ≥4 stations within 100 m.** Plausible for an industrial campus or surveying yard, but the names + counts are worth reviewing.
4. **3,721 stations publish coordinates with ≤ 2 decimal places** (≥ 1 km uncertainty). For RTK that's structurally wrong; coordinates should be 5+ decimals.

---

## 1. Exact-coordinate duplicates — 1,009 groups

| Coordinates | Station count | Names |
|---|---:|---|
| `37.4, -121.986` | 6 | `****3A778`, `****7AE7D`, `****67341`, `****60485`, `G001`, `****BFC96` |
| `40.369, -111.93` | 5 | `****0C6BD`, `****20126`, `****31838`, `****C8D82`, `****6A19E` |
| `43.016, -82.342` | 4 | `****19CF5`, `****DFEE1`, `****CAF4D`, `****DC6F5` |
| `-15.854, -47.964` | 3 | `****08A0C`, `****D918D`, `****21B68` |
| `52.486, -105.734` | 3 | `****FCD66`, `****1A299`, `****6E3FC` |
| `4.31, 101.143` | 3 | `****CADA9`, `****69EAA`, `****E3675` |
| `36.259, -115.176` | 3 | `****20C14`, `****C8749`, `****6A1AA` |
| `-35.316, 149.01` | 3 | `STR2`, `STR1`, `STR3` |
| `35.209, -82.246` | 3 | `****2F569`, `****6E64A`, `****6E64A` |
| `-27.548, 153.084` | 3 | `****EE73D`, `****FBE61`, `****60459` |

_…and 999 more in the snapshot file._

## 2. Near-duplicate stations within 10 m — 1,009 clusters

| Anchor (lat, lng) | Station count | Names (truncated) |
|---|---:|---|
| 37.40000, -121.98600 | 6 | `****3A778`, `****7AE7D`, `****67341`, `****60485`, `G001`, `****BFC96` |
| 40.36900, -111.93000 | 5 | `****0C6BD`, `****20126`, `****31838`, `****C8D82`, `****6A19E` |
| 43.01600, -82.34200 | 4 | `****19CF5`, `****DFEE1`, `****CAF4D`, `****DC6F5` |
| -15.85400, -47.96400 | 3 | `****08A0C`, `****D918D`, `****21B68` |
| 52.48600, -105.73400 | 3 | `****FCD66`, `****1A299`, `****6E3FC` |
| 4.31000, 101.14300 | 3 | `****CADA9`, `****69EAA`, `****E3675` |
| 36.25900, -115.17600 | 3 | `****20C14`, `****C8749`, `****6A1AA` |
| -35.31600, 149.01000 | 3 | `STR2`, `STR1`, `STR3` |
| 35.20900, -82.24600 | 3 | `****2F569`, `****6E64A`, `****6E64A` |
| -27.54800, 153.08400 | 3 | `****EE73D`, `****FBE61`, `****60459` |

_…and 999 more in the snapshot file._

## 3. Tight clusters (≥4 within 100 m) — 3 clusters

| Anchor (lat, lng) | Station count |
|---|---:|
| 37.40000, -121.98600 | 6 |
| 40.36900, -111.93000 | 5 |
| 43.01600, -82.34200 | 4 |

## 4. Stations with ≤ 2 decimal places of coordinate precision — 3,721

| Name | Lat | Lng |
|---|---:|---:|
| `****E9CD2` | 45.69 | 24.385 |
| `****11F41` | 0.45 | 32.771 |
| `****5A809` | 48.119 | 11.42 |
| `****1DE89` | 41.11 | 30.679 |
| `****B5335` | 61.595 | -6.95 |
| `****CDE6E` | 50.748 | 25.75 |
| `****200E2` | 10.016 | 139.79 |
| `****ED245` | 45.517 | 6.09 |
| `****2425D` | 46.63 | 20.818 |
| `****1113D` | 38.46 | -1.743 |

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
