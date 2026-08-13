# Sybil Risk Scan — Geodnet RTK Network

> Independent public read by the GETKINETIK Bureau using only Geodnet's public station endpoint. **No internal Geodnet data was used.** Geodnet RTK stations are surveyed GNSS reference units — each one is supposed to be a unique, physically installed antenna at a fixed coordinate. The heuristics below treat that as the structural rule and flag exceptions.

- **As of:** 2026-08-13
- **Public source:** `https://rtk.geodnet.com/api/v2/coverage_stations`
- **Stations observed:** 19,543
- **Stations flagged (any heuristic):** 1,795 (9.18%)

## Executive summary

1. **5 exact (lat,lng) duplicate groups** on 19,543 public stations — each row in §1 is one coordinate pair your registry team can grep today.
2. **903 ≤10 m proximity clusters** — tighter than two physical RTK antennas; start with the largest counts in §2 (names + anchors included).
3. **9.2%** of the public fleet touches at least one heuristic — useful as a sampling denominator, not a verdict.

---

## Since last snapshot

| Metric | This run | vs last run |
|---|---:|---|
| Stations with coordinates | 19,543 | -11 (-0.1%) |
| Exact (lat,lng) duplicate groups | 5 | unchanged vs last run |
| Clusters within 10 m | 903 | -3 (-0.3%) |
| Clusters ≥4 within 100 m | 4 | -1 (-20.0%) |
| Low-precision coordinates (≤2 decimals) | 1 | -2 (-66.7%) |
| Fleet share flagged (any heuristic) | 9.18% | -0.05 pp (-0.6%) |

## What to cross-check this week

1. Registry dedupe: for each §1 coordinate pair, confirm whether multiple station IDs should share one surveyed antenna location.
2. Field ops: spot-check §3 tight clusters (≥4 within 100 m) — industrial campus vs duplicate registrations.
3. Data quality: stations in §4 with ≤2 decimal places should not appear as RTK references until coordinates are re-surveyed.
4. Reproduce: `node scripts/sybil-scan-geodnet.mjs` — same public endpoint, no API key.

> Public-data read. Re-run: script in `scripts/`, source URL in report header.

---

## Headline findings

1. **5 groups of stations share an exact (lat, lng) pair.** For a CORS / RTK reference network, two stations at identical coordinates is structurally undefined — there is no second-antenna position to triangulate from.
2. **903 clusters of stations sit within 10 m of each other.** That's tighter than the physical separation of two real RTK installs.
3. **4 clusters have ≥4 stations within 100 m.** Plausible for an industrial campus or surveying yard, but the names + counts are worth reviewing.
4. **1 stations publish coordinates with ≤ 2 decimal places** (≥ 1 km uncertainty). For RTK that's structurally wrong; coordinates should be 5+ decimals.

---

## 1. Exact-coordinate duplicates — 5 groups

| Coordinates | Station count | Names |
|---|---:|---|
| `52.914868, 6.609262` | 2 | `****0WSRA`, `****0WSRT` |
| `43.069733, -89.554874` | 2 | `****1C301`, `****18F55` |
| `41.612831, -93.530944` | 2 | `****E2162`, `****E2162` |
| `29.396778, -98.423723` | 2 | `****CAE6C`, `****CAE6C` |
| `35.209013, -82.241649` | 2 | `****6E64A`, `****6E64A` |

## 2. Near-duplicate stations within 10 m — 903 clusters

| Anchor (lat, lng) | Station count | Names (truncated) |
|---|---:|---|
| 40.36887, -111.92501 | 4 | `****20126`, `****C8D82`, `****31838`, `****6A19E` |
| 37.71275, -113.03558 | 3 | `****BF509`, `****21339`, `****6E56A` |
| 40.77772, 29.69387 | 3 | `****2186D`, `****81599`, `****3B246` |
| 38.85665, -94.35225 | 3 | `****21BC8`, `****671C5`, `****B7E24` |
| 37.40017, -121.98122 | 3 | `****7AE7D`, `****60485`, `G001` |
| 35.20901, -82.24163 | 3 | `****2F569`, `****6E64A`, `****6E64A` |
| -27.54766, 153.08877 | 3 | `****EE73D`, `****FBE61`, `****60459` |
| 37.39842, -121.97432 | 2 | `****CB955`, `****45A1D` |
| 37.39845, -121.97418 | 2 | `****7DB45`, `****45A1D` |
| 18.03610, -76.76090 | 2 | `****2C241`, `****E9CCE` |

_…and 893 more in the snapshot file._

## 3. Tight clusters (≥4 within 100 m) — 4 clusters

| Anchor (lat, lng) | Station count |
|---|---:|
| 37.39842, -121.97432 | 8 |
| 37.40017, -121.98122 | 5 |
| 40.36885, -111.92521 | 5 |
| 43.01607, -82.33728 | 4 |

## 4. Stations with ≤ 2 decimal places of coordinate precision — 1

| Name | Lat | Lng |
|---|---:|---:|
| `****17819` | 38.734594 | -9.45 |

---

## Methodology

Each finding is grounded in how a real CORS / RTK network is physically supposed to look:
- A surveyed GNSS reference station occupies one antenna at one coordinate. Two stations at the same point is structurally undefined.
- Honest sites at ≤ 10 m of each other are vanishingly rare — that's inside the cone of a single antenna mount.
- Clusters of ≥ 4 stations in 100 m can be honest (industrial campus, surveying lab) but justify a manual look.
- An RTK base claiming a position with ≤ 2 decimal places (≥ 1 km uncertainty) is not a real CORS station; the public network shouldn't surface them.

For an authoritative per-device GETKINETIK grade (hardware-rooted signature, chain age, tamper flags), the network or operator can POST a Proof of Origin URL to `https://getkinetik.app/api/verify-device`.

Contact: **eric@outfromnothingllc.com** · https://getkinetik.app/bureau/ · https://getkinetik.app/api/docs/
