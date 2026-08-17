# Sybil Risk Scan — Geodnet RTK Network

> Independent public read by the GETKINETIK Bureau using only Geodnet's public station endpoint. **No internal Geodnet data was used.** Geodnet RTK stations are surveyed GNSS reference units — each one is supposed to be a unique, physically installed antenna at a fixed coordinate. The heuristics below treat that as the structural rule and flag exceptions.

- **As of:** 2026-08-17
- **Public source:** `https://rtk.geodnet.com/api/v2/coverage_stations`
- **Stations observed:** 19,497
- **Stations flagged (any heuristic):** 1,791 (9.19%)

## Executive summary

1. **7 exact (lat,lng) duplicate groups** on 19,497 public stations — each row in §1 is one coordinate pair your registry team can grep today.
2. **901 ≤10 m proximity clusters** — tighter than two physical RTK antennas; start with the largest counts in §2 (names + anchors included).
3. **9.2%** of the public fleet touches at least one heuristic — useful as a sampling denominator, not a verdict.

---

## Since last snapshot

| Metric | This run | vs last run |
|---|---:|---|
| Stations with coordinates | 19,497 | -11 (-0.1%) |
| Exact (lat,lng) duplicate groups | 7 | +2 (+40.0%) |
| Clusters within 10 m | 901 | -1 (-0.1%) |
| Clusters ≥4 within 100 m | 4 | unchanged vs last run |
| Low-precision coordinates (≤2 decimals) | 3 | +2 (+200.0%) |
| Fleet share flagged (any heuristic) | 9.19% | +0.01 pp (+0.1%) |

## What to cross-check this week

1. Registry dedupe: for each §1 coordinate pair, confirm whether multiple station IDs should share one surveyed antenna location.
2. Field ops: spot-check §3 tight clusters (≥4 within 100 m) — industrial campus vs duplicate registrations.
3. Data quality: stations in §4 with ≤2 decimal places should not appear as RTK references until coordinates are re-surveyed.
4. Reproduce: `node scripts/sybil-scan-geodnet.mjs` — same public endpoint, no API key.

> Public-data read. Re-run: script in `scripts/`, source URL in report header.

---

## Headline findings

1. **7 groups of stations share an exact (lat, lng) pair.** For a CORS / RTK reference network, two stations at identical coordinates is structurally undefined — there is no second-antenna position to triangulate from.
2. **901 clusters of stations sit within 10 m of each other.** That's tighter than the physical separation of two real RTK installs.
3. **4 clusters have ≥4 stations within 100 m.** Plausible for an industrial campus or surveying yard, but the names + counts are worth reviewing.
4. **3 stations publish coordinates with ≤ 2 decimal places** (≥ 1 km uncertainty). For RTK that's structurally wrong; coordinates should be 5+ decimals.

---

## 1. Exact-coordinate duplicates — 7 groups

| Coordinates | Station count | Names |
|---|---:|---|
| `11.321364, 124.948412` | 2 | `****00000`, `****00000` |
| `49.638732, 9.355246` | 2 | `****5302D`, `****6A80A` |
| `52.914891, 6.605887` | 2 | `****0WSRA`, `****0WSRT` |
| `43.069757, -89.55825` | 2 | `****18F55`, `****1C301` |
| `41.612855, -93.53432` | 2 | `****E2162`, `****E2162` |
| `29.396802, -98.427099` | 2 | `****CAE6C`, `****CAE6C` |
| `35.209037, -82.245025` | 2 | `****6E64A`, `****6E64A` |

## 2. Near-duplicate stations within 10 m — 901 clusters

| Anchor (lat, lng) | Station count | Names (truncated) |
|---|---:|---|
| 40.36890, -111.92839 | 4 | `****20126`, `****31838`, `****C8D82`, `****6A19E` |
| 37.39891, -121.97801 | 3 | `****3E2FC`, `****21C32`, `****21BC8` |
| 38.00411, -122.30773 | 3 | `****C4105`, `****97A05`, `****C0A6E` |
| 37.40019, -121.98459 | 3 | `****7AE7D`, `****60485`, `G001` |
| 35.20903, -82.24501 | 3 | `****2F569`, `****6E64A`, `****6E64A` |
| -27.54764, 153.08540 | 3 | `****EE73D`, `****FBE61`, `****60459` |
| 52.36315, 17.13745 | 2 | `****CCE68`, `****ACCA0` |
| 40.21045, 0.02231 | 2 | `****65A05`, `****C4CF0` |
| 52.30221, 7.15618 | 2 | `****22BCC`, `****65D9D` |
| 56.07976, -3.87107 | 2 | `****0B3A9`, `****CADE8` |

_…and 891 more in the snapshot file._

## 3. Tight clusters (≥4 within 100 m) — 4 clusters

| Anchor (lat, lng) | Station count |
|---|---:|
| 37.39891, -121.97801 | 5 |
| 37.40019, -121.98459 | 5 |
| 40.36888, -111.92859 | 5 |
| 43.01609, -82.34066 | 4 |

## 4. Stations with ≤ 2 decimal places of coordinate precision — 3

| Name | Lat | Lng |
|---|---:|---:|
| `****7BD79` | 45.604076 | 10.51 |
| `****231C9` | 49.74 | 7.317683 |
| `****C6FE1` | 51.57 | 22.477535 |

---

## Methodology

Each finding is grounded in how a real CORS / RTK network is physically supposed to look:
- A surveyed GNSS reference station occupies one antenna at one coordinate. Two stations at the same point is structurally undefined.
- Honest sites at ≤ 10 m of each other are vanishingly rare — that's inside the cone of a single antenna mount.
- Clusters of ≥ 4 stations in 100 m can be honest (industrial campus, surveying lab) but justify a manual look.
- An RTK base claiming a position with ≤ 2 decimal places (≥ 1 km uncertainty) is not a real CORS station; the public network shouldn't surface them.

For an authoritative per-device GETKINETIK grade (hardware-rooted signature, chain age, tamper flags), the network or operator can POST a Proof of Origin URL to `https://getkinetik.app/api/verify-device`.

Contact: **eric@outfromnothingllc.com** · https://getkinetik.app/bureau/ · https://getkinetik.app/api/docs/
