# Sybil Risk Scan — Geodnet RTK Network

> Independent public read by the GETKINETIK Bureau using only Geodnet's public station endpoint. **No internal Geodnet data was used.** Geodnet RTK stations are surveyed GNSS reference units — each one is supposed to be a unique, physically installed antenna at a fixed coordinate. The heuristics below treat that as the structural rule and flag exceptions.

- **As of:** 2026-07-21
- **Public source:** `https://rtk.geodnet.com/api/v2/coverage_stations`
- **Stations observed:** 19,585
- **Stations flagged (any heuristic):** 1,803 (9.21%)

## Executive summary

1. **10 exact (lat,lng) duplicate groups** on 19,585 public stations — each row in §1 is one coordinate pair your registry team can grep today.
2. **904 ≤10 m proximity clusters** — tighter than two physical RTK antennas; start with the largest counts in §2 (names + anchors included).
3. **9.2%** of the public fleet touches at least one heuristic — useful as a sampling denominator, not a verdict.

---

## Since last snapshot

| Metric | This run | vs last run |
|---|---:|---|
| Stations with coordinates | 19,585 | +2 (+0.0%) |
| Exact (lat,lng) duplicate groups | 10 | +1 (+11.1%) |
| Clusters within 10 m | 904 | +2 (+0.2%) |
| Clusters ≥4 within 100 m | 4 | unchanged vs last run |
| Low-precision coordinates (≤2 decimals) | 6 | +4 (+200.0%) |
| Fleet share flagged (any heuristic) | 9.21% | +0.03 pp (+0.4%) |

## What to cross-check this week

1. Registry dedupe: for each §1 coordinate pair, confirm whether multiple station IDs should share one surveyed antenna location.
2. Field ops: spot-check §3 tight clusters (≥4 within 100 m) — industrial campus vs duplicate registrations.
3. Data quality: stations in §4 with ≤2 decimal places should not appear as RTK references until coordinates are re-surveyed.
4. Reproduce: `node scripts/sybil-scan-geodnet.mjs` — same public endpoint, no API key.

> Public-data read. Re-run: script in `scripts/`, source URL in report header.

---

## Headline findings

1. **10 groups of stations share an exact (lat, lng) pair.** For a CORS / RTK reference network, two stations at identical coordinates is structurally undefined — there is no second-antenna position to triangulate from.
2. **904 clusters of stations sit within 10 m of each other.** That's tighter than the physical separation of two real RTK installs.
3. **4 clusters have ≥4 stations within 100 m.** Plausible for an industrial campus or surveying yard, but the names + counts are worth reviewing.
4. **6 stations publish coordinates with ≤ 2 decimal places** (≥ 1 km uncertainty). For RTK that's structurally wrong; coordinates should be 5+ decimals.

---

## 1. Exact-coordinate duplicates — 10 groups

| Coordinates | Station count | Names |
|---|---:|---|
| `45.867711, -108.773915` | 2 | `****3A7F8`, `****10DA5` |
| `11.321577, 124.948253` | 2 | `****00000`, `****00000` |
| `49.638945, 9.355087` | 2 | `****5302D`, `****6A80A` |
| `45.888194, -90.829618` | 2 | `****379D9`, `****09A46` |
| `52.915105, 6.605728` | 2 | `****0WSRA`, `****0WSRT` |
| `43.06997, -89.558409` | 2 | `****18F55`, `****1C301` |
| `41.613068, -93.534478` | 2 | `****E2162`, `****E2162` |
| `29.397015, -98.427258` | 2 | `****CAE6C`, `****CAE6C` |
| `33.94722, -78.312071` | 2 | `****20C40`, `****20C40` |
| `35.20925, -82.245184` | 2 | `****6E64A`, `****6E64A` |

## 2. Near-duplicate stations within 10 m — 904 clusters

| Anchor (lat, lng) | Station count | Names (truncated) |
|---|---:|---|
| 37.39914, -121.97817 | 5 | `****C2CAE`, `****17C8A`, `****C8E06`, `****C8DA8`, `****21B94` |
| 37.39903, -121.97781 | 4 | `****0997A`, `****0ECBE`, `****F9CCC`, `****CBDF2` |
| 40.36911, -111.92854 | 4 | `****20126`, `****31838`, `****C8D82`, `****6A19E` |
| 40.77795, 29.69033 | 3 | `****2186D`, `****81599`, `****3B246` |
| 37.40041, -121.98475 | 3 | `****7AE7D`, `****60485`, `G001` |
| 35.20925, -82.24516 | 3 | `****2F569`, `****6E64A`, `****6E64A` |
| -27.54743, 153.08524 | 3 | `****EE73D`, `****FBE61`, `****60459` |
| 45.73172, 8.77732 | 3 | `****0B68D`, `****DF080`, `****C1C26` |
| -1.25127, 36.69683 | 2 | `****77D7D`, `****29F9C` |
| 44.63201, 4.32593 | 2 | `****C1C94`, `****C42C1` |

_…and 894 more in the snapshot file._

## 3. Tight clusters (≥4 within 100 m) — 4 clusters

| Anchor (lat, lng) | Station count |
|---|---:|
| 37.39914, -121.97817 | 11 |
| 40.36909, -111.92875 | 5 |
| 37.40041, -121.98475 | 4 |
| 43.01631, -82.34082 | 4 |

## 4. Stations with ≤ 2 decimal places of coordinate precision — 6

| Name | Lat | Lng |
|---|---:|---:|
| `GIRU` | -19.531457 | 147.08 |
| `****B51E9` | 49.74 | 10.13144 |
| `****B52ED` | 55.48 | 14.10249 |
| `****DB339` | 46.691786 | 11.09 |
| `****1663D` | 47.93 | 16.844263 |
| `****17085` | 42.18 | -3.773377 |

---

## Methodology

Each finding is grounded in how a real CORS / RTK network is physically supposed to look:
- A surveyed GNSS reference station occupies one antenna at one coordinate. Two stations at the same point is structurally undefined.
- Honest sites at ≤ 10 m of each other are vanishingly rare — that's inside the cone of a single antenna mount.
- Clusters of ≥ 4 stations in 100 m can be honest (industrial campus, surveying lab) but justify a manual look.
- An RTK base claiming a position with ≤ 2 decimal places (≥ 1 km uncertainty) is not a real CORS station; the public network shouldn't surface them.

For an authoritative per-device GETKINETIK grade (hardware-rooted signature, chain age, tamper flags), the network or operator can POST a Proof of Origin URL to `https://getkinetik.app/api/verify-device`.

Contact: **eric@outfromnothingllc.com** · https://getkinetik.app/bureau/ · https://getkinetik.app/api/docs/
