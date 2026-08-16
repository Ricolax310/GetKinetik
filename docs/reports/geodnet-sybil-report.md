# Sybil Risk Scan — Geodnet RTK Network

> Independent public read by the GETKINETIK Bureau using only Geodnet's public station endpoint. **No internal Geodnet data was used.** Geodnet RTK stations are surveyed GNSS reference units — each one is supposed to be a unique, physically installed antenna at a fixed coordinate. The heuristics below treat that as the structural rule and flag exceptions.

- **As of:** 2026-08-16
- **Public source:** `https://rtk.geodnet.com/api/v2/coverage_stations`
- **Stations observed:** 19,513
- **Stations flagged (any heuristic):** 1,782 (9.13%)

## Executive summary

1. **7 exact (lat,lng) duplicate groups** on 19,513 public stations — each row in §1 is one coordinate pair your registry team can grep today.
2. **897 ≤10 m proximity clusters** — tighter than two physical RTK antennas; start with the largest counts in §2 (names + anchors included).
3. **9.1%** of the public fleet touches at least one heuristic — useful as a sampling denominator, not a verdict.

---

## Since last snapshot

| Metric | This run | vs last run |
|---|---:|---|
| Stations with coordinates | 19,513 | +2 (+0.0%) |
| Exact (lat,lng) duplicate groups | 7 | unchanged vs last run |
| Clusters within 10 m | 897 | +1 (+0.1%) |
| Clusters ≥4 within 100 m | 4 | unchanged vs last run |
| Low-precision coordinates (≤2 decimals) | 2 | -2 (-50.0%) |
| Fleet share flagged (any heuristic) | 9.13% | -0.00 pp (-0.0%) |

## What to cross-check this week

1. Registry dedupe: for each §1 coordinate pair, confirm whether multiple station IDs should share one surveyed antenna location.
2. Field ops: spot-check §3 tight clusters (≥4 within 100 m) — industrial campus vs duplicate registrations.
3. Data quality: stations in §4 with ≤2 decimal places should not appear as RTK references until coordinates are re-surveyed.
4. Reproduce: `node scripts/sybil-scan-geodnet.mjs` — same public endpoint, no API key.

> Public-data read. Re-run: script in `scripts/`, source URL in report header.

---

## Headline findings

1. **7 groups of stations share an exact (lat, lng) pair.** For a CORS / RTK reference network, two stations at identical coordinates is structurally undefined — there is no second-antenna position to triangulate from.
2. **897 clusters of stations sit within 10 m of each other.** That's tighter than the physical separation of two real RTK installs.
3. **4 clusters have ≥4 stations within 100 m.** Plausible for an industrial campus or surveying yard, but the names + counts are worth reviewing.
4. **2 stations publish coordinates with ≤ 2 decimal places** (≥ 1 km uncertainty). For RTK that's structurally wrong; coordinates should be 5+ decimals.

---

## 1. Exact-coordinate duplicates — 7 groups

| Coordinates | Station count | Names |
|---|---:|---|
| `11.320956, 124.94878` | 2 | `****00000`, `****00000` |
| `49.638324, 9.355614` | 2 | `****5302D`, `****6A80A` |
| `52.914483, 6.606255` | 2 | `****0WSRA`, `****0WSRT` |
| `43.069349, -89.557882` | 2 | `****18F55`, `****1C301` |
| `41.612447, -93.533951` | 2 | `****E2162`, `****E2162` |
| `29.396394, -98.426731` | 2 | `****CAE6C`, `****CAE6C` |
| `35.208629, -82.244657` | 2 | `****6E64A`, `****6E64A` |

## 2. Near-duplicate stations within 10 m — 897 clusters

| Anchor (lat, lng) | Station count | Names (truncated) |
|---|---:|---|
| 40.36849, -111.92802 | 4 | `****20126`, `****31838`, `****C8D82`, `****6A19E` |
| 40.77733, 29.69086 | 3 | `****2186D`, `****81599`, `****3B246` |
| 37.39850, -121.97764 | 3 | `****3E2FC`, `****21C32`, `****21BC8` |
| 37.39979, -121.98422 | 3 | `****7AE7D`, `****60485`, `G001` |
| 35.20862, -82.24464 | 3 | `****2F569`, `****6E64A`, `****6E64A` |
| -27.54805, 153.08577 | 3 | `****EE73D`, `****FBE61`, `****60459` |
| 50.94032, 19.24410 | 2 | `****C4D14`, `****196F1` |
| 53.64269, 11.41052 | 2 | `****4F21B`, `****21BD8` |
| 52.36274, 17.13782 | 2 | `****CCE68`, `****ACCA0` |
| 40.21004, 0.02268 | 2 | `****65A05`, `****C4CF0` |

_…and 887 more in the snapshot file._

## 3. Tight clusters (≥4 within 100 m) — 4 clusters

| Anchor (lat, lng) | Station count |
|---|---:|
| 37.39850, -121.97764 | 5 |
| 37.39979, -121.98422 | 5 |
| 40.36847, -111.92822 | 5 |
| 43.01569, -82.34029 | 4 |

## 4. Stations with ≤ 2 decimal places of coordinate precision — 2

| Name | Lat | Lng |
|---|---:|---:|
| `****DABC5` | 46.167476 | 20.75 |
| `****C2DF5` | -34.587716 | -70.99 |

---

## Methodology

Each finding is grounded in how a real CORS / RTK network is physically supposed to look:
- A surveyed GNSS reference station occupies one antenna at one coordinate. Two stations at the same point is structurally undefined.
- Honest sites at ≤ 10 m of each other are vanishingly rare — that's inside the cone of a single antenna mount.
- Clusters of ≥ 4 stations in 100 m can be honest (industrial campus, surveying lab) but justify a manual look.
- An RTK base claiming a position with ≤ 2 decimal places (≥ 1 km uncertainty) is not a real CORS station; the public network shouldn't surface them.

For an authoritative per-device GETKINETIK grade (hardware-rooted signature, chain age, tamper flags), the network or operator can POST a Proof of Origin URL to `https://getkinetik.app/api/verify-device`.

Contact: **eric@outfromnothingllc.com** · https://getkinetik.app/bureau/ · https://getkinetik.app/api/docs/
