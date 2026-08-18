# Sybil Risk Scan — Geodnet RTK Network

> Independent public read by the GETKINETIK Bureau using only Geodnet's public station endpoint. **No internal Geodnet data was used.** Geodnet RTK stations are surveyed GNSS reference units — each one is supposed to be a unique, physically installed antenna at a fixed coordinate. The heuristics below treat that as the structural rule and flag exceptions.

- **As of:** 2026-08-18
- **Public source:** `https://rtk.geodnet.com/api/v2/coverage_stations`
- **Stations observed:** 19,490
- **Stations flagged (any heuristic):** 1,793 (9.20%)

## Executive summary

1. **6 exact (lat,lng) duplicate groups** on 19,490 public stations — each row in §1 is one coordinate pair your registry team can grep today.
2. **901 ≤10 m proximity clusters** — tighter than two physical RTK antennas; start with the largest counts in §2 (names + anchors included).
3. **9.2%** of the public fleet touches at least one heuristic — useful as a sampling denominator, not a verdict.

---

## Since last snapshot

| Metric | This run | vs last run |
|---|---:|---|
| Stations with coordinates | 19,490 | -6 (-0.0%) |
| Exact (lat,lng) duplicate groups | 6 | -1 (-14.3%) |
| Clusters within 10 m | 901 | unchanged vs last run |
| Clusters ≥4 within 100 m | 5 | unchanged vs last run |
| Low-precision coordinates (≤2 decimals) | 2 | -2 (-50.0%) |
| Fleet share flagged (any heuristic) | 9.20% | -0.01 pp (-0.1%) |

## What to cross-check this week

1. Registry dedupe: for each §1 coordinate pair, confirm whether multiple station IDs should share one surveyed antenna location.
2. Field ops: spot-check §3 tight clusters (≥4 within 100 m) — industrial campus vs duplicate registrations.
3. Data quality: stations in §4 with ≤2 decimal places should not appear as RTK references until coordinates are re-surveyed.
4. Reproduce: `node scripts/sybil-scan-geodnet.mjs` — same public endpoint, no API key.

> Public-data read. Re-run: script in `scripts/`, source URL in report header.

---

## Headline findings

1. **6 groups of stations share an exact (lat, lng) pair.** For a CORS / RTK reference network, two stations at identical coordinates is structurally undefined — there is no second-antenna position to triangulate from.
2. **901 clusters of stations sit within 10 m of each other.** That's tighter than the physical separation of two real RTK installs.
3. **5 clusters have ≥4 stations within 100 m.** Plausible for an industrial campus or surveying yard, but the names + counts are worth reviewing.
4. **2 stations publish coordinates with ≤ 2 decimal places** (≥ 1 km uncertainty). For RTK that's structurally wrong; coordinates should be 5+ decimals.

---

## 1. Exact-coordinate duplicates — 6 groups

| Coordinates | Station count | Names |
|---|---:|---|
| `11.321421, 124.951048` | 2 | `****00000`, `****00000` |
| `52.914948, 6.608523` | 2 | `****0WSRA`, `****0WSRT` |
| `43.069814, -89.555614` | 2 | `****1C301`, `****18F55` |
| `41.612912, -93.531683` | 2 | `****E2162`, `****E2162` |
| `29.396859, -98.424462` | 2 | `****CAE6C`, `****CAE6C` |
| `35.209094, -82.242388` | 2 | `****6E64A`, `****6E64A` |

## 2. Near-duplicate stations within 10 m — 901 clusters

| Anchor (lat, lng) | Station count | Names (truncated) |
|---|---:|---|
| 40.36895, -111.92575 | 4 | `****20126`, `****31838`, `****C8D82`, `****6A19E` |
| 37.39896, -121.97537 | 3 | `****3E2FC`, `****21C32`, `****21BC8` |
| 38.00417, -122.30509 | 3 | `****C4105`, `****97A05`, `****C0A6E` |
| 37.40025, -121.98196 | 3 | `****7AE7D`, `****60485`, `G001` |
| 35.20909, -82.24237 | 3 | `****2F569`, `****6E64A`, `****6E64A` |
| -27.54758, 153.08803 | 3 | `****EE73D`, `****FBE61`, `****60459` |
| 40.21051, 0.02494 | 2 | `****65A05`, `****C4CF0` |
| 52.30227, 7.15881 | 2 | `****22BCC`, `****65D9D` |
| 56.07982, -3.86843 | 2 | `****0B3A9`, `****CADE8` |
| 50.63529, 6.37368 | 2 | `****D2F28`, `****1CEB9` |

_…and 891 more in the snapshot file._

## 3. Tight clusters (≥4 within 100 m) — 5 clusters

| Anchor (lat, lng) | Station count |
|---|---:|
| 37.39896, -121.97537 | 6 |
| 37.40025, -121.98196 | 5 |
| 40.36893, -111.92595 | 5 |
| 37.39804, -121.97483 | 4 |
| 43.01615, -82.33802 | 4 |

## 4. Stations with ≤ 2 decimal places of coordinate precision — 2

| Name | Lat | Lng |
|---|---:|---:|
| `****72FF5` | 41.9078 | 25.01 |
| `****21E0D` | 10.9 | 123.034018 |

---

## Methodology

Each finding is grounded in how a real CORS / RTK network is physically supposed to look:
- A surveyed GNSS reference station occupies one antenna at one coordinate. Two stations at the same point is structurally undefined.
- Honest sites at ≤ 10 m of each other are vanishingly rare — that's inside the cone of a single antenna mount.
- Clusters of ≥ 4 stations in 100 m can be honest (industrial campus, surveying lab) but justify a manual look.
- An RTK base claiming a position with ≤ 2 decimal places (≥ 1 km uncertainty) is not a real CORS station; the public network shouldn't surface them.

For an authoritative per-device GETKINETIK grade (hardware-rooted signature, chain age, tamper flags), the network or operator can POST a Proof of Origin URL to `https://getkinetik.app/api/verify-device`.

Contact: **eric@outfromnothingllc.com** · https://getkinetik.app/bureau/ · https://getkinetik.app/api/docs/
