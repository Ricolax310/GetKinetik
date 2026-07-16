# Sybil Risk Scan — Geodnet RTK Network

> Independent public read by the GETKINETIK Bureau using only Geodnet's public station endpoint. **No internal Geodnet data was used.** Geodnet RTK stations are surveyed GNSS reference units — each one is supposed to be a unique, physically installed antenna at a fixed coordinate. The heuristics below treat that as the structural rule and flag exceptions.

- **As of:** 2026-07-16
- **Public source:** `https://rtk.geodnet.com/api/v2/coverage_stations`
- **Stations observed:** 19,585
- **Stations flagged (any heuristic):** 1,791 (9.14%)

## Executive summary

1. **7 exact (lat,lng) duplicate groups** on 19,585 public stations — each row in §1 is one coordinate pair your registry team can grep today.
2. **897 ≤10 m proximity clusters** — tighter than two physical RTK antennas; start with the largest counts in §2 (names + anchors included).
3. **9.1%** of the public fleet touches at least one heuristic — useful as a sampling denominator, not a verdict.

---

## Since last snapshot

| Metric | This run | vs last run |
|---|---:|---|
| Stations with coordinates | 19,585 | +3 (+0.0%) |
| Exact (lat,lng) duplicate groups | 7 | -1 (-12.5%) |
| Clusters within 10 m | 897 | -1 (-0.1%) |
| Clusters ≥4 within 100 m | 4 | unchanged vs last run |
| Low-precision coordinates (≤2 decimals) | 5 | +1 (+25.0%) |
| Fleet share flagged (any heuristic) | 9.14% | -0.00 pp (-0.0%) |

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
4. **5 stations publish coordinates with ≤ 2 decimal places** (≥ 1 km uncertainty). For RTK that's structurally wrong; coordinates should be 5+ decimals.

---

## 1. Exact-coordinate duplicates — 7 groups

| Coordinates | Station count | Names |
|---|---:|---|
| `45.867448, -108.77861` | 2 | `****3A7F8`, `****10DA5` |
| `37.39885, -121.982864` | 2 | `****C8E06`, `****C8DA8` |
| `52.914841, 6.601033` | 2 | `****0WSRA`, `****0WSRT` |
| `41.612805, -93.539173` | 2 | `****E2162`, `****E2162` |
| `29.396752, -98.431953` | 2 | `****CAE6C`, `****CAE6C` |
| `33.946956, -78.316766` | 2 | `****20C40`, `****20C40` |
| `35.208987, -82.249879` | 2 | `****6E64A`, `****6E64A` |

## 2. Near-duplicate stations within 10 m — 897 clusters

| Anchor (lat, lng) | Station count | Names (truncated) |
|---|---:|---|
| 37.39887, -121.98285 | 7 | `****CAE50`, `****CDEB0`, `****21B78`, `****C2CAE`, `****17C8A`, `****C8E06` …(+1) |
| 37.40014, -121.98945 | 4 | `****7AE7D`, `****67341`, `****60485`, `G001` |
| 40.36885, -111.93324 | 4 | `****20126`, `****31838`, `****C8D82`, `****6A19E` |
| 39.85372, -105.22164 | 3 | `****E9CD8`, `****ABCED`, `****6E588` |
| 30.05433, -99.15436 | 3 | `****21B94`, `****79F65`, `****6A182` |
| 30.55136, -88.22213 | 3 | `****C3CFA`, `****FE291`, `****09A2E` |
| 35.20898, -82.24986 | 3 | `****2F569`, `****6E64A`, `****6E64A` |
| -27.54769, 153.08054 | 3 | `****EE73D`, `****FBE61`, `****60459` |
| 30.52414, -86.46406 | 2 | `****C91B9`, `****6E590` |
| 24.63375, 87.86096 | 2 | `****2517E`, `****69A08` |

_…and 887 more in the snapshot file._

## 3. Tight clusters (≥4 within 100 m) — 4 clusters

| Anchor (lat, lng) | Station count |
|---|---:|
| 37.39887, -121.98285 | 11 |
| 37.40014, -121.98945 | 5 |
| 40.36883, -111.93344 | 5 |
| 43.01604, -82.34551 | 4 |

## 4. Stations with ≤ 2 decimal places of coordinate precision — 5

| Name | Lat | Lng |
|---|---:|---:|
| `****93595` | 43.892521 | 25.96 |
| `MVIL` | -37.51 | 145.737301 |
| `****1CBC5` | 48.598501 | 15.94 |
| `****E4E39` | 43.816525 | -81.45 |
| `****CDE2C` | 45.62 | 9.423239 |

---

## Methodology

Each finding is grounded in how a real CORS / RTK network is physically supposed to look:
- A surveyed GNSS reference station occupies one antenna at one coordinate. Two stations at the same point is structurally undefined.
- Honest sites at ≤ 10 m of each other are vanishingly rare — that's inside the cone of a single antenna mount.
- Clusters of ≥ 4 stations in 100 m can be honest (industrial campus, surveying lab) but justify a manual look.
- An RTK base claiming a position with ≤ 2 decimal places (≥ 1 km uncertainty) is not a real CORS station; the public network shouldn't surface them.

For an authoritative per-device GETKINETIK grade (hardware-rooted signature, chain age, tamper flags), the network or operator can POST a Proof of Origin URL to `https://getkinetik.app/api/verify-device`.

Contact: **eric@outfromnothingllc.com** · https://getkinetik.app/bureau/ · https://getkinetik.app/api/docs/
