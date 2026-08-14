# Sybil Risk Scan — Geodnet RTK Network

> Independent public read by the GETKINETIK Bureau using only Geodnet's public station endpoint. **No internal Geodnet data was used.** Geodnet RTK stations are surveyed GNSS reference units — each one is supposed to be a unique, physically installed antenna at a fixed coordinate. The heuristics below treat that as the structural rule and flag exceptions.

- **As of:** 2026-08-14
- **Public source:** `https://rtk.geodnet.com/api/v2/coverage_stations`
- **Stations observed:** 19,528
- **Stations flagged (any heuristic):** 1,786 (9.15%)

## Executive summary

1. **5 exact (lat,lng) duplicate groups** on 19,528 public stations — each row in §1 is one coordinate pair your registry team can grep today.
2. **897 ≤10 m proximity clusters** — tighter than two physical RTK antennas; start with the largest counts in §2 (names + anchors included).
3. **9.1%** of the public fleet touches at least one heuristic — useful as a sampling denominator, not a verdict.

---

## Since last snapshot

| Metric | This run | vs last run |
|---|---:|---|
| Stations with coordinates | 19,528 | -1 (-0.0%) |
| Exact (lat,lng) duplicate groups | 5 | -1 (-16.7%) |
| Clusters within 10 m | 897 | -1 (-0.1%) |
| Clusters ≥4 within 100 m | 3 | unchanged vs last run |
| Low-precision coordinates (≤2 decimals) | 6 | unchanged vs last run |
| Fleet share flagged (any heuristic) | 9.15% | -0.00 pp (-0.1%) |

## What to cross-check this week

1. Registry dedupe: for each §1 coordinate pair, confirm whether multiple station IDs should share one surveyed antenna location.
2. Field ops: spot-check §3 tight clusters (≥4 within 100 m) — industrial campus vs duplicate registrations.
3. Data quality: stations in §4 with ≤2 decimal places should not appear as RTK references until coordinates are re-surveyed.
4. Reproduce: `node scripts/sybil-scan-geodnet.mjs` — same public endpoint, no API key.

> Public-data read. Re-run: script in `scripts/`, source URL in report header.

---

## Headline findings

1. **5 groups of stations share an exact (lat, lng) pair.** For a CORS / RTK reference network, two stations at identical coordinates is structurally undefined — there is no second-antenna position to triangulate from.
2. **897 clusters of stations sit within 10 m of each other.** That's tighter than the physical separation of two real RTK installs.
3. **3 clusters have ≥4 stations within 100 m.** Plausible for an industrial campus or surveying yard, but the names + counts are worth reviewing.
4. **6 stations publish coordinates with ≤ 2 decimal places** (≥ 1 km uncertainty). For RTK that's structurally wrong; coordinates should be 5+ decimals.

---

## 1. Exact-coordinate duplicates — 5 groups

| Coordinates | Station count | Names |
|---|---:|---|
| `41.612455, -93.531481` | 2 | `****E2162`, `****E2162` |
| `52.914491, 6.608725` | 2 | `****0WSRA`, `****0WSRT` |
| `43.069357, -89.555412` | 2 | `****18F55`, `****1C301` |
| `29.396402, -98.42426` | 2 | `****CAE6C`, `****CAE6C` |
| `35.208637, -82.242186` | 2 | `****6E64A`, `****6E64A` |

## 2. Near-duplicate stations within 10 m — 897 clusters

| Anchor (lat, lng) | Station count | Names (truncated) |
|---|---:|---|
| 40.36850, -111.92555 | 4 | `****20126`, `****31838`, `****C8D82`, `****6A19E` |
| 37.71237, -113.03612 | 3 | `****BF509`, `****21339`, `****6E56A` |
| 40.77734, 29.69333 | 3 | `****2186D`, `****81599`, `****3B246` |
| 38.85627, -94.35278 | 3 | `****21BC8`, `****671C5`, `****B7E24` |
| 37.39979, -121.98176 | 3 | `****7AE7D`, `****60485`, `G001` |
| 35.20863, -82.24217 | 3 | `****2F569`, `****6E64A`, `****6E64A` |
| -27.54804, 153.08823 | 3 | `****EE73D`, `****FBE61`, `****60459` |
| 38.19309, -78.39057 | 2 | `****B7A25`, `****C0CE6` |
| 40.99532, 29.05944 | 2 | `****DB12D`, `****0C2AD` |
| 49.39148, 7.27260 | 2 | `****0B8FC`, `****2D1CD` |

_…and 887 more in the snapshot file._

## 3. Tight clusters (≥4 within 100 m) — 3 clusters

| Anchor (lat, lng) | Station count |
|---|---:|
| 37.39979, -121.98176 | 5 |
| 40.36848, -111.92575 | 5 |
| 43.01570, -82.33782 | 4 |

## 4. Stations with ≤ 2 decimal places of coordinate precision — 6

| Name | Lat | Lng |
|---|---:|---:|
| `NAMB` | -26.62 | 152.972309 |
| `****F7851` | 43.497831 | -80.47 |
| `****1CB55` | 44.262177 | -93.86 |
| `****E216D` | 50.164427 | 11.51 |
| `****E84A1` | 23.18711 | 88.06 |
| `****D91DD` | 52.129397 | -8.66 |

---

## Methodology

Each finding is grounded in how a real CORS / RTK network is physically supposed to look:
- A surveyed GNSS reference station occupies one antenna at one coordinate. Two stations at the same point is structurally undefined.
- Honest sites at ≤ 10 m of each other are vanishingly rare — that's inside the cone of a single antenna mount.
- Clusters of ≥ 4 stations in 100 m can be honest (industrial campus, surveying lab) but justify a manual look.
- An RTK base claiming a position with ≤ 2 decimal places (≥ 1 km uncertainty) is not a real CORS station; the public network shouldn't surface them.

For an authoritative per-device GETKINETIK grade (hardware-rooted signature, chain age, tamper flags), the network or operator can POST a Proof of Origin URL to `https://getkinetik.app/api/verify-device`.

Contact: **eric@outfromnothingllc.com** · https://getkinetik.app/bureau/ · https://getkinetik.app/api/docs/
