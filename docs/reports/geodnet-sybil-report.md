# Sybil Risk Scan — Geodnet RTK Network

> Independent public read by the GETKINETIK Bureau using only Geodnet's public station endpoint. **No internal Geodnet data was used.** Geodnet RTK stations are surveyed GNSS reference units — each one is supposed to be a unique, physically installed antenna at a fixed coordinate. The heuristics below treat that as the structural rule and flag exceptions.

- **As of:** 2026-07-10
- **Public source:** `https://rtk.geodnet.com/api/v2/coverage_stations`
- **Stations observed:** 19,553
- **Stations flagged (any heuristic):** 1,794 (9.18%)

## Executive summary

1. **9 exact (lat,lng) duplicate groups** on 19,553 public stations — each row in §1 is one coordinate pair your registry team can grep today.
2. **900 ≤10 m proximity clusters** — tighter than two physical RTK antennas; start with the largest counts in §2 (names + anchors included).
3. **9.2%** of the public fleet touches at least one heuristic — useful as a sampling denominator, not a verdict.

---

## Since last snapshot

| Metric | This run | vs last run |
|---|---:|---|
| Stations with coordinates | 19,553 | -2 (-0.0%) |
| Exact (lat,lng) duplicate groups | 9 | +2 (+28.6%) |
| Clusters within 10 m | 900 | +1 (+0.1%) |
| Clusters ≥4 within 100 m | 4 | unchanged vs last run |
| Low-precision coordinates (≤2 decimals) | 5 | +2 (+66.7%) |
| Fleet share flagged (any heuristic) | 9.18% | +0.02 pp (+0.2%) |

## What to cross-check this week

1. Registry dedupe: for each §1 coordinate pair, confirm whether multiple station IDs should share one surveyed antenna location.
2. Field ops: spot-check §3 tight clusters (≥4 within 100 m) — industrial campus vs duplicate registrations.
3. Data quality: stations in §4 with ≤2 decimal places should not appear as RTK references until coordinates are re-surveyed.
4. Reproduce: `node scripts/sybil-scan-geodnet.mjs` — same public endpoint, no API key.

> Public-data read. Re-run: script in `scripts/`, source URL in report header.

---

## Headline findings

1. **9 groups of stations share an exact (lat, lng) pair.** For a CORS / RTK reference network, two stations at identical coordinates is structurally undefined — there is no second-antenna position to triangulate from.
2. **900 clusters of stations sit within 10 m of each other.** That's tighter than the physical separation of two real RTK installs.
3. **4 clusters have ≥4 stations within 100 m.** Plausible for an industrial campus or surveying yard, but the names + counts are worth reviewing.
4. **5 stations publish coordinates with ≤ 2 decimal places** (≥ 1 km uncertainty). For RTK that's structurally wrong; coordinates should be 5+ decimals.

---

## 1. Exact-coordinate duplicates — 9 groups

| Coordinates | Station count | Names |
|---|---:|---|
| `42.372097, -71.182787` | 2 | `****C6D12`, `****C6D12` |
| `49.638212, 9.357198` | 2 | `****5302D`, `****6A80A` |
| `52.914372, 6.607839` | 2 | `****0WSRA`, `****0WSRT` |
| `45.866978, -108.771804` | 2 | `****10DA5`, `****3A7F8` |
| `43.069237, -89.556298` | 2 | `****1C301`, `****18F55` |
| `41.612335, -93.532367` | 2 | `****E2162`, `****E2162` |
| `29.396282, -98.425146` | 2 | `****CAE6C`, `****CAE6C` |
| `33.946487, -78.30996` | 2 | `****20C40`, `****20C40` |
| `35.208517, -82.243073` | 2 | `****6E64A`, `****6E64A` |

## 2. Near-duplicate stations within 10 m — 900 clusters

| Anchor (lat, lng) | Station count | Names (truncated) |
|---|---:|---|
| 37.39828, -121.97568 | 5 | `****3D678`, `****22D48`, `****CBE10`, `****D1EF6`, `****0BA90` |
| 37.39819, -121.97566 | 4 | `****210CE`, `****22D48`, `****D1EF6`, `****0BA90` |
| 37.39968, -121.98264 | 4 | `****7AE7D`, `****67341`, `****60485`, `G001` |
| 40.36838, -111.92643 | 4 | `****20126`, `****31838`, `****C8D82`, `****6A19E` |
| 37.39838, -121.97605 | 3 | `****6AAF0`, `****21B62`, `****CAE50` |
| 39.85325, -105.21483 | 3 | `****E9CD8`, `****ABCED`, `****6E588` |
| 30.05386, -99.14755 | 3 | `****21B94`, `****79F65`, `****6A182` |
| 35.20851, -82.24305 | 3 | `****2F569`, `****6E64A`, `****6E64A` |
| -27.54816, 153.08735 | 3 | `****EE73D`, `****FBE61`, `****60459` |
| 30.55088, -88.21532 | 3 | `****FE291`, `****C3CFA`, `****09A2E` |

_…and 890 more in the snapshot file._

## 3. Tight clusters (≥4 within 100 m) — 4 clusters

| Anchor (lat, lng) | Station count |
|---|---:|
| 37.39838, -121.97605 | 10 |
| 37.39968, -121.98264 | 5 |
| 40.36836, -111.92663 | 5 |
| 43.01557, -82.33871 | 4 |

## 4. Stations with ≤ 2 decimal places of coordinate precision — 5

| Name | Lat | Lng |
|---|---:|---:|
| `****7AC7D` | 47.663581 | -122.35 |
| `****2B405` | 51.500873 | 11.05 |
| `****19B09` | 45.93 | 14.042946 |
| `****D1755` | 51.142825 | 4.56 |
| `****AB12D` | 37.674222 | 39.6 |

---

## Methodology

Each finding is grounded in how a real CORS / RTK network is physically supposed to look:
- A surveyed GNSS reference station occupies one antenna at one coordinate. Two stations at the same point is structurally undefined.
- Honest sites at ≤ 10 m of each other are vanishingly rare — that's inside the cone of a single antenna mount.
- Clusters of ≥ 4 stations in 100 m can be honest (industrial campus, surveying lab) but justify a manual look.
- An RTK base claiming a position with ≤ 2 decimal places (≥ 1 km uncertainty) is not a real CORS station; the public network shouldn't surface them.

For an authoritative per-device GETKINETIK grade (hardware-rooted signature, chain age, tamper flags), the network or operator can POST a Proof of Origin URL to `https://getkinetik.app/api/verify-device`.

Contact: **eric@outfromnothingllc.com** · https://getkinetik.app/bureau/ · https://getkinetik.app/api/docs/
