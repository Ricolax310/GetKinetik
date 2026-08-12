# Sybil Risk Scan — Geodnet RTK Network

> Independent public read by the GETKINETIK Bureau using only Geodnet's public station endpoint. **No internal Geodnet data was used.** Geodnet RTK stations are surveyed GNSS reference units — each one is supposed to be a unique, physically installed antenna at a fixed coordinate. The heuristics below treat that as the structural rule and flag exceptions.

- **As of:** 2026-08-12
- **Public source:** `https://rtk.geodnet.com/api/v2/coverage_stations`
- **Stations observed:** 19,554
- **Stations flagged (any heuristic):** 1,806 (9.24%)

## Executive summary

1. **5 exact (lat,lng) duplicate groups** on 19,554 public stations — each row in §1 is one coordinate pair your registry team can grep today.
2. **906 ≤10 m proximity clusters** — tighter than two physical RTK antennas; start with the largest counts in §2 (names + anchors included).
3. **9.2%** of the public fleet touches at least one heuristic — useful as a sampling denominator, not a verdict.

---

## Since last snapshot

| Metric | This run | vs last run |
|---|---:|---|
| Stations with coordinates | 19,554 | +1 (+0.0%) |
| Exact (lat,lng) duplicate groups | 5 | unchanged vs last run |
| Clusters within 10 m | 906 | unchanged vs last run |
| Clusters ≥4 within 100 m | 5 | unchanged vs last run |
| Low-precision coordinates (≤2 decimals) | 3 | +1 (+50.0%) |
| Fleet share flagged (any heuristic) | 9.24% | +0.00 pp (+0.1%) |

## What to cross-check this week

1. Registry dedupe: for each §1 coordinate pair, confirm whether multiple station IDs should share one surveyed antenna location.
2. Field ops: spot-check §3 tight clusters (≥4 within 100 m) — industrial campus vs duplicate registrations.
3. Data quality: stations in §4 with ≤2 decimal places should not appear as RTK references until coordinates are re-surveyed.
4. Reproduce: `node scripts/sybil-scan-geodnet.mjs` — same public endpoint, no API key.

> Public-data read. Re-run: script in `scripts/`, source URL in report header.

---

## Headline findings

1. **5 groups of stations share an exact (lat, lng) pair.** For a CORS / RTK reference network, two stations at identical coordinates is structurally undefined — there is no second-antenna position to triangulate from.
2. **906 clusters of stations sit within 10 m of each other.** That's tighter than the physical separation of two real RTK installs.
3. **5 clusters have ≥4 stations within 100 m.** Plausible for an industrial campus or surveying yard, but the names + counts are worth reviewing.
4. **3 stations publish coordinates with ≤ 2 decimal places** (≥ 1 km uncertainty). For RTK that's structurally wrong; coordinates should be 5+ decimals.

---

## 1. Exact-coordinate duplicates — 5 groups

| Coordinates | Station count | Names |
|---|---:|---|
| `43.06969, -89.557515` | 2 | `****1C301`, `****18F55` |
| `52.914825, 6.606621` | 2 | `****0WSRA`, `****0WSRT` |
| `41.612788, -93.533585` | 2 | `****E2162`, `****E2162` |
| `29.396735, -98.426364` | 2 | `****CAE6C`, `****CAE6C` |
| `35.20897, -82.24429` | 2 | `****6E64A`, `****6E64A` |

## 2. Near-duplicate stations within 10 m — 906 clusters

| Anchor (lat, lng) | Station count | Names (truncated) |
|---|---:|---|
| 40.36883, -111.92765 | 4 | `****20126`, `****31838`, `****C8D82`, `****6A19E` |
| 38.44224, 27.20850 | 3 | `****71041`, `****15B3D`, `****DB0B1` |
| 37.71271, -113.03822 | 3 | `****BF509`, `****21339`, `****6E56A` |
| 40.77767, 29.69123 | 3 | `****2186D`, `****81599`, `****3B246` |
| 37.40013, -121.98386 | 3 | `****7AE7D`, `****60485`, `G001` |
| 35.20897, -82.24427 | 3 | `****2F569`, `****6E64A`, `****6E64A` |
| -27.54771, 153.08613 | 3 | `****EE73D`, `****FBE61`, `****60459` |
| -29.60561, -52.19040 | 2 | `****00000`, `****00000` |
| 41.32179, 22.53044 | 2 | `****19B69`, `****231F4` |
| -31.53805, -68.53715 | 2 | `****50F19`, `****20C0C` |

_…and 896 more in the snapshot file._

## 3. Tight clusters (≥4 within 100 m) — 5 clusters

| Anchor (lat, lng) | Station count |
|---|---:|
| 37.39832, -121.97674 | 11 |
| 37.40013, -121.98386 | 5 |
| 40.36881, -111.92785 | 5 |
| 38.44224, 27.20850 | 4 |
| 43.01603, -82.33992 | 4 |

## 4. Stations with ≤ 2 decimal places of coordinate precision — 3

| Name | Lat | Lng |
|---|---:|---:|
| `****77449` | 45.907899 | 15.25 |
| `****10E09` | -37.59 | 145.089987 |
| `****2A995` | 50.224345 | 22.33 |

---

## Methodology

Each finding is grounded in how a real CORS / RTK network is physically supposed to look:
- A surveyed GNSS reference station occupies one antenna at one coordinate. Two stations at the same point is structurally undefined.
- Honest sites at ≤ 10 m of each other are vanishingly rare — that's inside the cone of a single antenna mount.
- Clusters of ≥ 4 stations in 100 m can be honest (industrial campus, surveying lab) but justify a manual look.
- An RTK base claiming a position with ≤ 2 decimal places (≥ 1 km uncertainty) is not a real CORS station; the public network shouldn't surface them.

For an authoritative per-device GETKINETIK grade (hardware-rooted signature, chain age, tamper flags), the network or operator can POST a Proof of Origin URL to `https://getkinetik.app/api/verify-device`.

Contact: **eric@outfromnothingllc.com** · https://getkinetik.app/bureau/ · https://getkinetik.app/api/docs/
