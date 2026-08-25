# Sybil Risk Scan — Geodnet RTK Network

> Independent public read by the GETKINETIK Bureau using only Geodnet's public station endpoint. **No internal Geodnet data was used.** Geodnet RTK stations are surveyed GNSS reference units — each one is supposed to be a unique, physically installed antenna at a fixed coordinate. The heuristics below treat that as the structural rule and flag exceptions.

- **As of:** 2026-08-25
- **Public source:** `https://rtk.geodnet.com/api/v2/coverage_stations`
- **Stations observed:** 19,507
- **Stations flagged (any heuristic):** 1,796 (9.21%)

## Executive summary

1. **8 exact (lat,lng) duplicate groups** on 19,507 public stations — each row in §1 is one coordinate pair your registry team can grep today.
2. **907 ≤10 m proximity clusters** — tighter than two physical RTK antennas; start with the largest counts in §2 (names + anchors included).
3. **9.2%** of the public fleet touches at least one heuristic — useful as a sampling denominator, not a verdict.

---

## Since last snapshot

| Metric | This run | vs last run |
|---|---:|---|
| Stations with coordinates | 19,507 | +2 (+0.0%) |
| Exact (lat,lng) duplicate groups | 8 | unchanged vs last run |
| Clusters within 10 m | 907 | unchanged vs last run |
| Clusters ≥4 within 100 m | 3 | unchanged vs last run |
| Low-precision coordinates (≤2 decimals) | 2 | -1 (-33.3%) |
| Fleet share flagged (any heuristic) | 9.21% | -0.01 pp (-0.1%) |

## What to cross-check this week

1. Registry dedupe: for each §1 coordinate pair, confirm whether multiple station IDs should share one surveyed antenna location.
2. Field ops: spot-check §3 tight clusters (≥4 within 100 m) — industrial campus vs duplicate registrations.
3. Data quality: stations in §4 with ≤2 decimal places should not appear as RTK references until coordinates are re-surveyed.
4. Reproduce: `node scripts/sybil-scan-geodnet.mjs` — same public endpoint, no API key.

> Public-data read. Re-run: script in `scripts/`, source URL in report header.

---

## Headline findings

1. **8 groups of stations share an exact (lat, lng) pair.** For a CORS / RTK reference network, two stations at identical coordinates is structurally undefined — there is no second-antenna position to triangulate from.
2. **907 clusters of stations sit within 10 m of each other.** That's tighter than the physical separation of two real RTK installs.
3. **3 clusters have ≥4 stations within 100 m.** Plausible for an industrial campus or surveying yard, but the names + counts are worth reviewing.
4. **2 stations publish coordinates with ≤ 2 decimal places** (≥ 1 km uncertainty). For RTK that's structurally wrong; coordinates should be 5+ decimals.

---

## 1. Exact-coordinate duplicates — 8 groups

| Coordinates | Station count | Names |
|---|---:|---|
| `11.32122, 124.94287` | 2 | `****00000`, `****00000` |
| `45.887837, -90.835` | 2 | `****379D9`, `****09A46` |
| `52.914748, 6.600346` | 2 | `****0WSRA`, `****0WSRT` |
| `43.069613, -89.563791` | 2 | `****18F55`, `****1C301` |
| `41.612711, -93.539861` | 2 | `****E2162`, `****E2162` |
| `29.396658, -98.43264` | 2 | `****CAE6C`, `****CAE6C` |
| `33.946863, -78.317453` | 2 | `****20C40`, `****20C40` |
| `35.208893, -82.250566` | 2 | `****6E64A`, `****6E64A` |

## 2. Near-duplicate stations within 10 m — 907 clusters

| Anchor (lat, lng) | Station count | Names (truncated) |
|---|---:|---|
| 40.36875, -111.93393 | 4 | `****20126`, `****31838`, `****C8D82`, `****6A19E` |
| 52.48647, -105.73791 | 3 | `****FCD66`, `****6E3FC`, `****1A299` |
| 4.31020, 101.13923 | 3 | `****CADA9`, `****E3675`, `****69EAA` |
| 37.40005, -121.99013 | 3 | `****7AE7D`, `****60485`, `G001` |
| 35.20889, -82.25055 | 3 | `****2F569`, `****6E64A`, `****6E64A` |
| -27.54778, 153.07986 | 3 | `****EE73D`, `****FBE61`, `****60459` |
| 28.80322, -97.08324 | 2 | `****D5125`, `****CEE1C` |
| 42.86374, -109.86630 | 2 | `****6F8A1`, `****AEF79` |
| -15.85421, -47.96812 | 2 | `****08A0C`, `****D918D` |
| 45.69033, 24.38070 | 2 | `****E9CD2`, `****FF759` |

_…and 897 more in the snapshot file._

## 3. Tight clusters (≥4 within 100 m) — 3 clusters

| Anchor (lat, lng) | Station count |
|---|---:|
| 37.40060, -121.99011 | 6 |
| 40.36873, -111.93413 | 5 |
| 43.01595, -82.34620 | 4 |

## 4. Stations with ≤ 2 decimal places of coordinate precision — 2

| Name | Lat | Lng |
|---|---:|---:|
| `****EF451` | 45.572051 | 0.07 |
| `****E41B5` | 19.662353 | 82.89 |

---

## Methodology

Each finding is grounded in how a real CORS / RTK network is physically supposed to look:
- A surveyed GNSS reference station occupies one antenna at one coordinate. Two stations at the same point is structurally undefined.
- Honest sites at ≤ 10 m of each other are vanishingly rare — that's inside the cone of a single antenna mount.
- Clusters of ≥ 4 stations in 100 m can be honest (industrial campus, surveying lab) but justify a manual look.
- An RTK base claiming a position with ≤ 2 decimal places (≥ 1 km uncertainty) is not a real CORS station; the public network shouldn't surface them.

For an authoritative per-device GETKINETIK grade (hardware-rooted signature, chain age, tamper flags), the network or operator can POST a Proof of Origin URL to `https://getkinetik.app/api/verify-device`.

Contact: **eric@outfromnothingllc.com** · https://getkinetik.app/bureau/ · https://getkinetik.app/api/docs/
