# Sybil Risk Scan — Geodnet RTK Network

> Independent public read by the GETKINETIK Bureau using only Geodnet's public station endpoint. **No internal Geodnet data was used.** Geodnet RTK stations are surveyed GNSS reference units — each one is supposed to be a unique, physically installed antenna at a fixed coordinate. The heuristics below treat that as the structural rule and flag exceptions.

- **As of:** 2026-06-01
- **Public source:** `https://rtk.geodnet.com/api/v2/coverage_stations`
- **Stations observed:** 19,616
- **Stations flagged (any heuristic):** 1,833 (9.34%)

## Executive summary

1. **11 exact (lat,lng) duplicate groups** on 19,616 public stations — each row in §1 is one coordinate pair your registry team can grep today.
2. **922 ≤10 m proximity clusters** — tighter than two physical RTK antennas; start with the largest counts in §2 (names + anchors included).
3. **9.3%** of the public fleet touches at least one heuristic — useful as a sampling denominator, not a verdict.

---

## Since last snapshot

| Metric | This run | vs last run |
|---|---:|---|
| Stations with coordinates | 19,616 | -60 (-0.3%) |
| Exact (lat,lng) duplicate groups | 11 | +3 (+37.5%) |
| Clusters within 10 m | 922 | -3 (-0.3%) |
| Clusters ≥4 within 100 m | 4 | unchanged vs last run |
| Low-precision coordinates (≤2 decimals) | 4 | -2 (-33.3%) |
| Fleet share flagged (any heuristic) | 9.34% | -0.00 pp (-0.0%) |

## What to cross-check this week

1. Registry dedupe: for each §1 coordinate pair, confirm whether multiple station IDs should share one surveyed antenna location.
2. Field ops: spot-check §3 tight clusters (≥4 within 100 m) — industrial campus vs duplicate registrations.
3. Data quality: stations in §4 with ≤2 decimal places should not appear as RTK references until coordinates are re-surveyed.
4. Reproduce: `node scripts/sybil-scan-geodnet.mjs` — same public endpoint, no API key.

> Public-data read. Re-run: script in `scripts/`, source URL in report header.

---

## Headline findings

1. **11 groups of stations share an exact (lat, lng) pair.** For a CORS / RTK reference network, two stations at identical coordinates is structurally undefined — there is no second-antenna position to triangulate from.
2. **922 clusters of stations sit within 10 m of each other.** That's tighter than the physical separation of two real RTK installs.
3. **4 clusters have ≥4 stations within 100 m.** Plausible for an industrial campus or surveying yard, but the names + counts are worth reviewing.
4. **4 stations publish coordinates with ≤ 2 decimal places** (≥ 1 km uncertainty). For RTK that's structurally wrong; coordinates should be 5+ decimals.

---

## 1. Exact-coordinate duplicates — 11 groups

| Coordinates | Station count | Names |
|---|---:|---|
| `59.116387, 18.065681` | 2 | `****29ED6`, `mnt` |
| `49.638782, 9.352659` | 2 | `****5302D`, `****6A80A` |
| `52.914942, 6.6033` | 2 | `****0WSRA`, `****0WSRT` |
| `45.867548, -108.776343` | 2 | `****10DA5`, `****3A7F8` |
| `43.069807, -89.560837` | 2 | `****18F55`, `****1C301` |
| `41.612905, -93.536906` | 2 | `****E2162`, `****E2162` |
| `29.396852, -98.429686` | 2 | `****CAE6C`, `****CAE6C` |
| `33.947057, -78.314499` | 2 | `****20C40`, `****20C40` |
| `37.957785, -83.715306` | 2 | `****D2EC4`, `****D2EC4` |
| `42.372667, -71.187326` | 2 | `****C6D12`, `****C6D12` |

_…and 1 more in the snapshot file._

## 2. Near-duplicate stations within 10 m — 922 clusters

| Anchor (lat, lng) | Station count | Names (truncated) |
|---|---:|---|
| 37.40024, -121.98718 | 4 | `****7AE7D`, `****67341`, `****60485`, `G001` |
| 40.36895, -111.93097 | 4 | `****20126`, `****31838`, `****C8D82`, `****6A19E` |
| 37.39873, -121.98019 | 3 | `****C6D84`, `****699E0`, `****6A0C6` |
| 35.20908, -82.24759 | 3 | `****2F569`, `****6E64A`, `****6E64A` |
| -27.54759, 153.08281 | 3 | `****EE73D`, `****FBE61`, `****60459` |
| 30.55145, -88.21986 | 3 | `****FE291`, `****C3CFA`, `****09A2E` |
| 42.82504, -84.00700 | 2 | `****21C32`, `****19821` |
| 44.04715, -92.43923 | 2 | `****35DA9`, `****414D8` |
| 20.98495, -156.67306 | 2 | `****37BF5`, `****37BF5` |
| 39.98659, -74.77133 | 2 | `****3D62E`, `****66601` |

_…and 912 more in the snapshot file._

## 3. Tight clusters (≥4 within 100 m) — 4 clusters

| Anchor (lat, lng) | Station count |
|---|---:|
| 37.39873, -121.98019 | 17 |
| 37.40024, -121.98718 | 5 |
| 40.36893, -111.93117 | 5 |
| 43.01615, -82.34325 | 4 |

## 4. Stations with ≤ 2 decimal places of coordinate precision — 4

| Name | Lat | Lng |
|---|---:|---:|
| `****778F5` | 45.91 | 15.884761 |
| `****19BA1` | 53.32 | 9.892357 |
| `****23BFD` | 44.524931 | -77.47 |
| `****19AC5` | 36.892055 | -101.95 |

---

## Methodology

Each finding is grounded in how a real CORS / RTK network is physically supposed to look:
- A surveyed GNSS reference station occupies one antenna at one coordinate. Two stations at the same point is structurally undefined.
- Honest sites at ≤ 10 m of each other are vanishingly rare — that's inside the cone of a single antenna mount.
- Clusters of ≥ 4 stations in 100 m can be honest (industrial campus, surveying lab) but justify a manual look.
- An RTK base claiming a position with ≤ 2 decimal places (≥ 1 km uncertainty) is not a real CORS station; the public network shouldn't surface them.

For an authoritative per-device GETKINETIK grade (hardware-rooted signature, chain age, tamper flags), the network or operator can POST a Proof of Origin URL to `https://getkinetik.app/api/verify-device`.

Contact: **eric@outfromnothingllc.com** · https://getkinetik.app/bureau/ · https://getkinetik.app/api/docs/
