# Sybil Risk Scan — Geodnet RTK Network

> Independent public read by the GETKINETIK Bureau using only Geodnet's public station endpoint. **No internal Geodnet data was used.** Geodnet RTK stations are surveyed GNSS reference units — each one is supposed to be a unique, physically installed antenna at a fixed coordinate. The heuristics below treat that as the structural rule and flag exceptions.

- **As of:** 2026-07-17
- **Public source:** `https://rtk.geodnet.com/api/v2/coverage_stations`
- **Stations observed:** 19,578
- **Stations flagged (any heuristic):** 1,788 (9.13%)

## Executive summary

1. **8 exact (lat,lng) duplicate groups** on 19,578 public stations — each row in §1 is one coordinate pair your registry team can grep today.
2. **896 ≤10 m proximity clusters** — tighter than two physical RTK antennas; start with the largest counts in §2 (names + anchors included).
3. **9.1%** of the public fleet touches at least one heuristic — useful as a sampling denominator, not a verdict.

---

## Since last snapshot

| Metric | This run | vs last run |
|---|---:|---|
| Stations with coordinates | 19,578 | -1 (-0.0%) |
| Exact (lat,lng) duplicate groups | 8 | +1 (+14.3%) |
| Clusters within 10 m | 896 | +1 (+0.1%) |
| Clusters ≥4 within 100 m | 4 | unchanged vs last run |
| Low-precision coordinates (≤2 decimals) | 6 | +1 (+20.0%) |
| Fleet share flagged (any heuristic) | 9.13% | +0.02 pp (+0.2%) |

## What to cross-check this week

1. Registry dedupe: for each §1 coordinate pair, confirm whether multiple station IDs should share one surveyed antenna location.
2. Field ops: spot-check §3 tight clusters (≥4 within 100 m) — industrial campus vs duplicate registrations.
3. Data quality: stations in §4 with ≤2 decimal places should not appear as RTK references until coordinates are re-surveyed.
4. Reproduce: `node scripts/sybil-scan-geodnet.mjs` — same public endpoint, no API key.

> Public-data read. Re-run: script in `scripts/`, source URL in report header.

---

## Headline findings

1. **8 groups of stations share an exact (lat, lng) pair.** For a CORS / RTK reference network, two stations at identical coordinates is structurally undefined — there is no second-antenna position to triangulate from.
2. **896 clusters of stations sit within 10 m of each other.** That's tighter than the physical separation of two real RTK installs.
3. **4 clusters have ≥4 stations within 100 m.** Plausible for an industrial campus or surveying yard, but the names + counts are worth reviewing.
4. **6 stations publish coordinates with ≤ 2 decimal places** (≥ 1 km uncertainty). For RTK that's structurally wrong; coordinates should be 5+ decimals.

---

## 1. Exact-coordinate duplicates — 8 groups

| Coordinates | Station count | Names |
|---|---:|---|
| `45.867025, -108.771438` | 2 | `****3A7F8`, `****10DA5` |
| `49.900411, -97.255779` | 2 | `ALBH`, `WINN` |
| `52.914419, 6.608204` | 2 | `****0WSRA`, `****0WSRT` |
| `43.069284, -89.555932` | 2 | `****18F55`, `****1C301` |
| `41.612382, -93.532002` | 2 | `****E2162`, `****E2162` |
| `29.396329, -98.424781` | 2 | `****CAE6C`, `****CAE6C` |
| `33.946534, -78.309594` | 2 | `****20C40`, `****20C40` |
| `35.208564, -82.242707` | 2 | `****6E64A`, `****6E64A` |

## 2. Near-duplicate stations within 10 m — 896 clusters

| Anchor (lat, lng) | Station count | Names (truncated) |
|---|---:|---|
| 37.39842, -121.97568 | 6 | `****CDEB0`, `****21B78`, `****C2CAE`, `****17C8A`, `****C8E06`, `****C8DA8` |
| 40.36843, -111.92607 | 4 | `****20126`, `****31838`, `****C8D82`, `****6A19E` |
| 30.55094, -88.21496 | 3 | `****C3CFA`, `****FE291`, `****09A2E` |
| 37.39972, -121.98228 | 3 | `****7AE7D`, `****60485`, `G001` |
| 35.20856, -82.24269 | 3 | `****2F569`, `****6E64A`, `****6E64A` |
| -27.54811, 153.08771 | 3 | `****EE73D`, `****FBE61`, `****60459` |
| 41.67187, 26.56445 | 2 | `****DB189`, `****10A29` |
| 45.69000, 24.38856 | 2 | `****E9CD2`, `****FF759` |
| -15.85454, -47.96026 | 2 | `****08A0C`, `****D918D` |
| 43.96678, 15.36947 | 2 | `****2F7FE`, `****00B1D` |

_…and 886 more in the snapshot file._

## 3. Tight clusters (≥4 within 100 m) — 4 clusters

| Anchor (lat, lng) | Station count |
|---|---:|
| 37.39849, -121.97532 | 12 |
| 40.36840, -111.92627 | 5 |
| 37.39972, -121.98228 | 4 |
| 43.01562, -82.33834 | 4 |

## 4. Stations with ≤ 2 decimal places of coordinate precision — 6

| Name | Lat | Lng |
|---|---:|---:|
| `MRT2` | -19.46 | 147.48249 |
| `****9A81D` | 37.33 | 27.773209 |
| `****D9AD5` | 44.51 | -98.695683 |
| `****C5CF2` | 46.943653 | 7.41 |
| `****C9509` | -4.762568 | 105.54 |
| `****09454` | 55.83 | -4.437433 |

---

## Methodology

Each finding is grounded in how a real CORS / RTK network is physically supposed to look:
- A surveyed GNSS reference station occupies one antenna at one coordinate. Two stations at the same point is structurally undefined.
- Honest sites at ≤ 10 m of each other are vanishingly rare — that's inside the cone of a single antenna mount.
- Clusters of ≥ 4 stations in 100 m can be honest (industrial campus, surveying lab) but justify a manual look.
- An RTK base claiming a position with ≤ 2 decimal places (≥ 1 km uncertainty) is not a real CORS station; the public network shouldn't surface them.

For an authoritative per-device GETKINETIK grade (hardware-rooted signature, chain age, tamper flags), the network or operator can POST a Proof of Origin URL to `https://getkinetik.app/api/verify-device`.

Contact: **eric@outfromnothingllc.com** · https://getkinetik.app/bureau/ · https://getkinetik.app/api/docs/
