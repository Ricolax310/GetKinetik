# Sybil Risk Scan — Geodnet RTK Network

> Independent public read by the GETKINETIK Bureau using only Geodnet's public station endpoint. **No internal Geodnet data was used.** Geodnet RTK stations are surveyed GNSS reference units — each one is supposed to be a unique, physically installed antenna at a fixed coordinate. The heuristics below treat that as the structural rule and flag exceptions.

- **As of:** 2026-08-10
- **Public source:** `https://rtk.geodnet.com/api/v2/coverage_stations`
- **Stations observed:** 19,565
- **Stations flagged (any heuristic):** 1,812 (9.26%)

## Executive summary

1. **5 exact (lat,lng) duplicate groups** on 19,565 public stations — each row in §1 is one coordinate pair your registry team can grep today.
2. **907 ≤10 m proximity clusters** — tighter than two physical RTK antennas; start with the largest counts in §2 (names + anchors included).
3. **9.3%** of the public fleet touches at least one heuristic — useful as a sampling denominator, not a verdict.

---

## Since last snapshot

| Metric | This run | vs last run |
|---|---:|---|
| Stations with coordinates | 19,565 | +1 (+0.0%) |
| Exact (lat,lng) duplicate groups | 5 | +1 (+25.0%) |
| Clusters within 10 m | 907 | unchanged vs last run |
| Clusters ≥4 within 100 m | 6 | +1 (+20.0%) |
| Low-precision coordinates (≤2 decimals) | 5 | -2 (-28.6%) |
| Fleet share flagged (any heuristic) | 9.26% | -0.01 pp (-0.1%) |

## What to cross-check this week

1. Registry dedupe: for each §1 coordinate pair, confirm whether multiple station IDs should share one surveyed antenna location.
2. Field ops: spot-check §3 tight clusters (≥4 within 100 m) — industrial campus vs duplicate registrations.
3. Data quality: stations in §4 with ≤2 decimal places should not appear as RTK references until coordinates are re-surveyed.
4. Reproduce: `node scripts/sybil-scan-geodnet.mjs` — same public endpoint, no API key.

> Public-data read. Re-run: script in `scripts/`, source URL in report header.

---

## Headline findings

1. **5 groups of stations share an exact (lat, lng) pair.** For a CORS / RTK reference network, two stations at identical coordinates is structurally undefined — there is no second-antenna position to triangulate from.
2. **907 clusters of stations sit within 10 m of each other.** That's tighter than the physical separation of two real RTK installs.
3. **6 clusters have ≥4 stations within 100 m.** Plausible for an industrial campus or surveying yard, but the names + counts are worth reviewing.
4. **5 stations publish coordinates with ≤ 2 decimal places** (≥ 1 km uncertainty). For RTK that's structurally wrong; coordinates should be 5+ decimals.

---

## 1. Exact-coordinate duplicates — 5 groups

| Coordinates | Station count | Names |
|---|---:|---|
| `52.914459, 6.608112` | 2 | `****0WSRA`, `****0WSRT` |
| `43.069325, -89.556025` | 2 | `****18F55`, `****1C301` |
| `41.612423, -93.532095` | 2 | `****E2162`, `****E2162` |
| `29.39637, -98.424874` | 2 | `****CAE6C`, `****CAE6C` |
| `35.208605, -82.2428` | 2 | `****6E64A`, `****6E64A` |

## 2. Near-duplicate stations within 10 m — 907 clusters

| Anchor (lat, lng) | Station count | Names (truncated) |
|---|---:|---|
| 37.39847, -121.97579 | 4 | `****0AB68`, `****1FCF2`, `****CFEE8`, `****6AAF0` |
| 40.36847, -111.92616 | 4 | `****20126`, `****31838`, `****C8D82`, `****6A19E` |
| 53.64270, 11.41236 | 3 | `****C9E46`, `****4F21B`, `****21BD8` |
| 38.44187, 27.20999 | 3 | `****71041`, `****15B3D`, `****DB0B1` |
| 37.71234, -113.03673 | 3 | `****BF509`, `****21339`, `****6E56A` |
| 40.77731, 29.69272 | 3 | `****2186D`, `****81599`, `****3B246` |
| 37.39976, -121.98237 | 3 | `****7AE7D`, `****60485`, `G001` |
| 35.20860, -82.24278 | 3 | `****2F569`, `****6E64A`, `****6E64A` |
| -27.54807, 153.08762 | 3 | `****EE73D`, `****FBE61`, `****60459` |
| 53.73936, -1.58396 | 2 | `****DB8ED`, `****EAAF6` |

_…and 897 more in the snapshot file._

## 3. Tight clusters (≥4 within 100 m) — 6 clusters

| Anchor (lat, lng) | Station count |
|---|---:|
| 37.39847, -121.97579 | 10 |
| 37.39771, -121.97507 | 8 |
| 37.39976, -121.98237 | 5 |
| 40.36845, -111.92636 | 5 |
| 38.44187, 27.20999 | 4 |
| 43.01566, -82.33844 | 4 |

## 4. Stations with ≤ 2 decimal places of coordinate precision — 5

| Name | Lat | Lng |
|---|---:|---:|
| `****1C351` | 55.86 | 26.582219 |
| `****9A339` | 44.42043 | 26.02 |
| `****A03E1` | 37.78 | -121.257507 |
| `****1D011` | 38.243362 | 27.29 |
| `****D1EC2` | 34.98 | -79.069946 |

---

## Methodology

Each finding is grounded in how a real CORS / RTK network is physically supposed to look:
- A surveyed GNSS reference station occupies one antenna at one coordinate. Two stations at the same point is structurally undefined.
- Honest sites at ≤ 10 m of each other are vanishingly rare — that's inside the cone of a single antenna mount.
- Clusters of ≥ 4 stations in 100 m can be honest (industrial campus, surveying lab) but justify a manual look.
- An RTK base claiming a position with ≤ 2 decimal places (≥ 1 km uncertainty) is not a real CORS station; the public network shouldn't surface them.

For an authoritative per-device GETKINETIK grade (hardware-rooted signature, chain age, tamper flags), the network or operator can POST a Proof of Origin URL to `https://getkinetik.app/api/verify-device`.

Contact: **eric@outfromnothingllc.com** · https://getkinetik.app/bureau/ · https://getkinetik.app/api/docs/
