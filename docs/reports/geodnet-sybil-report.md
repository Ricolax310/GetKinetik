# Sybil Risk Scan — Geodnet RTK Network

> Independent public read by the GETKINETIK Bureau using only Geodnet's public station endpoint. **No internal Geodnet data was used.** Geodnet RTK stations are surveyed GNSS reference units — each one is supposed to be a unique, physically installed antenna at a fixed coordinate. The heuristics below treat that as the structural rule and flag exceptions.

- **As of:** 2026-08-09
- **Public source:** `https://rtk.geodnet.com/api/v2/coverage_stations`
- **Stations observed:** 19,566
- **Stations flagged (any heuristic):** 1,810 (9.25%)

## Executive summary

1. **5 exact (lat,lng) duplicate groups** on 19,566 public stations — each row in §1 is one coordinate pair your registry team can grep today.
2. **908 ≤10 m proximity clusters** — tighter than two physical RTK antennas; start with the largest counts in §2 (names + anchors included).
3. **9.3%** of the public fleet touches at least one heuristic — useful as a sampling denominator, not a verdict.

---

## Since last snapshot

| Metric | This run | vs last run |
|---|---:|---|
| Stations with coordinates | 19,566 | -3 (-0.0%) |
| Exact (lat,lng) duplicate groups | 5 | +1 (+25.0%) |
| Clusters within 10 m | 908 | -1 (-0.1%) |
| Clusters ≥4 within 100 m | 5 | unchanged vs last run |
| Low-precision coordinates (≤2 decimals) | 1 | -1 (-50.0%) |
| Fleet share flagged (any heuristic) | 9.25% | -0.01 pp (-0.2%) |

## What to cross-check this week

1. Registry dedupe: for each §1 coordinate pair, confirm whether multiple station IDs should share one surveyed antenna location.
2. Field ops: spot-check §3 tight clusters (≥4 within 100 m) — industrial campus vs duplicate registrations.
3. Data quality: stations in §4 with ≤2 decimal places should not appear as RTK references until coordinates are re-surveyed.
4. Reproduce: `node scripts/sybil-scan-geodnet.mjs` — same public endpoint, no API key.

> Public-data read. Re-run: script in `scripts/`, source URL in report header.

---

## Headline findings

1. **5 groups of stations share an exact (lat, lng) pair.** For a CORS / RTK reference network, two stations at identical coordinates is structurally undefined — there is no second-antenna position to triangulate from.
2. **908 clusters of stations sit within 10 m of each other.** That's tighter than the physical separation of two real RTK installs.
3. **5 clusters have ≥4 stations within 100 m.** Plausible for an industrial campus or surveying yard, but the names + counts are worth reviewing.
4. **1 stations publish coordinates with ≤ 2 decimal places** (≥ 1 km uncertainty). For RTK that's structurally wrong; coordinates should be 5+ decimals.

---

## 1. Exact-coordinate duplicates — 5 groups

| Coordinates | Station count | Names |
|---|---:|---|
| `49.638931, 9.357248` | 2 | `****5302D`, `****6A80A` |
| `52.915091, 6.607889` | 2 | `****0WSRA`, `****0WSRT` |
| `41.613054, -93.532317` | 2 | `****E2162`, `****E2162` |
| `29.397002, -98.425097` | 2 | `****CAE6C`, `****CAE6C` |
| `35.209236, -82.243023` | 2 | `****6E64A`, `****6E64A` |

## 2. Near-duplicate stations within 10 m — 908 clusters

| Anchor (lat, lng) | Station count | Names (truncated) |
|---|---:|---|
| 37.39910, -121.97601 | 4 | `****0AB68`, `****1FCF2`, `****CFEE8`, `****6AAF0` |
| 40.36910, -111.92638 | 4 | `****20126`, `****31838`, `****C8D82`, `****6A19E` |
| 36.25988, -115.17239 | 3 | `****20C14`, `****C8749`, `****6A1AA` |
| 53.64333, 11.41214 | 3 | `****C9E46`, `****4F21B`, `****21BD8` |
| 38.44250, 27.20977 | 3 | `****71041`, `****15B3D`, `****DB0B1` |
| 37.71297, -113.03696 | 3 | `****BF509`, `****21339`, `****6E56A` |
| 37.40039, -121.98259 | 3 | `****7AE7D`, `****60485`, `G001` |
| 35.20923, -82.24300 | 3 | `****2F569`, `****6E64A`, `****6E64A` |
| -27.54744, 153.08740 | 3 | `****EE73D`, `****FBE61`, `****60459` |
| 45.66085, -108.53297 | 2 | `****EBA78`, `****2A6E5` |

_…and 898 more in the snapshot file._

## 3. Tight clusters (≥4 within 100 m) — 5 clusters

| Anchor (lat, lng) | Station count |
|---|---:|
| 37.39910, -121.97601 | 10 |
| 37.39834, -121.97530 | 8 |
| 37.40039, -121.98259 | 5 |
| 40.36908, -111.92659 | 5 |
| 43.01629, -82.33866 | 4 |

## 4. Stations with ≤ 2 decimal places of coordinate precision — 1

| Name | Lat | Lng |
|---|---:|---:|
| `****65FE1` | 38.63 | -0.6647 |

---

## Methodology

Each finding is grounded in how a real CORS / RTK network is physically supposed to look:
- A surveyed GNSS reference station occupies one antenna at one coordinate. Two stations at the same point is structurally undefined.
- Honest sites at ≤ 10 m of each other are vanishingly rare — that's inside the cone of a single antenna mount.
- Clusters of ≥ 4 stations in 100 m can be honest (industrial campus, surveying lab) but justify a manual look.
- An RTK base claiming a position with ≤ 2 decimal places (≥ 1 km uncertainty) is not a real CORS station; the public network shouldn't surface them.

For an authoritative per-device GETKINETIK grade (hardware-rooted signature, chain age, tamper flags), the network or operator can POST a Proof of Origin URL to `https://getkinetik.app/api/verify-device`.

Contact: **eric@outfromnothingllc.com** · https://getkinetik.app/bureau/ · https://getkinetik.app/api/docs/
