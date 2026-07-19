# Sybil Risk Scan — Geodnet RTK Network

> Independent public read by the GETKINETIK Bureau using only Geodnet's public station endpoint. **No internal Geodnet data was used.** Geodnet RTK stations are surveyed GNSS reference units — each one is supposed to be a unique, physically installed antenna at a fixed coordinate. The heuristics below treat that as the structural rule and flag exceptions.

- **As of:** 2026-07-19
- **Public source:** `https://rtk.geodnet.com/api/v2/coverage_stations`
- **Stations observed:** 19,600
- **Stations flagged (any heuristic):** 1,792 (9.14%)

## Executive summary

1. **7 exact (lat,lng) duplicate groups** on 19,600 public stations — each row in §1 is one coordinate pair your registry team can grep today.
2. **899 ≤10 m proximity clusters** — tighter than two physical RTK antennas; start with the largest counts in §2 (names + anchors included).
3. **9.1%** of the public fleet touches at least one heuristic — useful as a sampling denominator, not a verdict.

---

## Since last snapshot

| Metric | This run | vs last run |
|---|---:|---|
| Stations with coordinates | 19,600 | +6 (+0.0%) |
| Exact (lat,lng) duplicate groups | 7 | -1 (-12.5%) |
| Clusters within 10 m | 899 | +2 (+0.2%) |
| Clusters ≥4 within 100 m | 4 | unchanged vs last run |
| Low-precision coordinates (≤2 decimals) | 2 | -5 (-71.4%) |
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
2. **899 clusters of stations sit within 10 m of each other.** That's tighter than the physical separation of two real RTK installs.
3. **4 clusters have ≥4 stations within 100 m.** Plausible for an industrial campus or surveying yard, but the names + counts are worth reviewing.
4. **2 stations publish coordinates with ≤ 2 decimal places** (≥ 1 km uncertainty). For RTK that's structurally wrong; coordinates should be 5+ decimals.

---

## 1. Exact-coordinate duplicates — 7 groups

| Coordinates | Station count | Names |
|---|---:|---|
| `49.637975, 9.350568` | 2 | `****5302D`, `****6A80A` |
| `52.914135, 6.601209` | 2 | `****0WSRA`, `****0WSRT` |
| `43.069, -89.562928` | 2 | `****18F55`, `****1C301` |
| `41.612098, -93.538997` | 2 | `****E2162`, `****E2162` |
| `29.396045, -98.431776` | 2 | `****CAE6C`, `****CAE6C` |
| `33.94625, -78.31659` | 2 | `****20C40`, `****20C40` |
| `35.20828, -82.249703` | 2 | `****6E64A`, `****6E64A` |

## 2. Near-duplicate stations within 10 m — 899 clusters

| Anchor (lat, lng) | Station count | Names (truncated) |
|---|---:|---|
| 37.39817, -121.98269 | 5 | `****C2CAE`, `****17C8A`, `****C8E06`, `****C8DA8`, `****21B94` |
| 37.39806, -121.98233 | 4 | `****0997A`, `****0ECBE`, `****F9CCC`, `****CBDF2` |
| 40.36814, -111.93306 | 4 | `****20126`, `****31838`, `****C8D82`, `****6A19E` |
| 30.55065, -88.22195 | 3 | `****C3CFA`, `****FE291`, `****09A2E` |
| 40.77697, 29.68581 | 3 | `****81599`, `****3B246`, `****2186D` |
| 37.39944, -121.98927 | 3 | `****7AE7D`, `****60485`, `G001` |
| 35.20828, -82.24968 | 3 | `****2F569`, `****6E64A`, `****6E64A` |
| -27.54840, 153.08072 | 3 | `****EE73D`, `****FBE61`, `****60459` |
| 44.81789, 7.29341 | 2 | `****0087D`, `****B14D2` |
| 54.77324, 25.01528 | 2 | `****A021D`, `****210F6` |

_…and 889 more in the snapshot file._

## 3. Tight clusters (≥4 within 100 m) — 4 clusters

| Anchor (lat, lng) | Station count |
|---|---:|
| 37.39817, -121.98269 | 12 |
| 40.36812, -111.93326 | 5 |
| 37.39944, -121.98927 | 4 |
| 43.01534, -82.34534 | 4 |

## 4. Stations with ≤ 2 decimal places of coordinate precision — 2

| Name | Lat | Lng |
|---|---:|---:|
| `****A7C01` | 36.394957 | 34.07 |
| `****EE365` | 22.25 | 88.713152 |

---

## Methodology

Each finding is grounded in how a real CORS / RTK network is physically supposed to look:
- A surveyed GNSS reference station occupies one antenna at one coordinate. Two stations at the same point is structurally undefined.
- Honest sites at ≤ 10 m of each other are vanishingly rare — that's inside the cone of a single antenna mount.
- Clusters of ≥ 4 stations in 100 m can be honest (industrial campus, surveying lab) but justify a manual look.
- An RTK base claiming a position with ≤ 2 decimal places (≥ 1 km uncertainty) is not a real CORS station; the public network shouldn't surface them.

For an authoritative per-device GETKINETIK grade (hardware-rooted signature, chain age, tamper flags), the network or operator can POST a Proof of Origin URL to `https://getkinetik.app/api/verify-device`.

Contact: **eric@outfromnothingllc.com** · https://getkinetik.app/bureau/ · https://getkinetik.app/api/docs/
