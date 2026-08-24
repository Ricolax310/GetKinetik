# Sybil Risk Scan — Geodnet RTK Network

> Independent public read by the GETKINETIK Bureau using only Geodnet's public station endpoint. **No internal Geodnet data was used.** Geodnet RTK stations are surveyed GNSS reference units — each one is supposed to be a unique, physically installed antenna at a fixed coordinate. The heuristics below treat that as the structural rule and flag exceptions.

- **As of:** 2026-08-24
- **Public source:** `https://rtk.geodnet.com/api/v2/coverage_stations`
- **Stations observed:** 19,510
- **Stations flagged (any heuristic):** 1,799 (9.22%)

## Executive summary

1. **8 exact (lat,lng) duplicate groups** on 19,510 public stations — each row in §1 is one coordinate pair your registry team can grep today.
2. **907 ≤10 m proximity clusters** — tighter than two physical RTK antennas; start with the largest counts in §2 (names + anchors included).
3. **9.2%** of the public fleet touches at least one heuristic — useful as a sampling denominator, not a verdict.

---

## Since last snapshot

| Metric | This run | vs last run |
|---|---:|---|
| Stations with coordinates | 19,510 | -2 (-0.0%) |
| Exact (lat,lng) duplicate groups | 8 | unchanged vs last run |
| Clusters within 10 m | 907 | -2 (-0.2%) |
| Clusters ≥4 within 100 m | 4 | unchanged vs last run |
| Low-precision coordinates (≤2 decimals) | 2 | +1 (+100.0%) |
| Fleet share flagged (any heuristic) | 9.22% | -0.02 pp (-0.3%) |

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
3. **4 clusters have ≥4 stations within 100 m.** Plausible for an industrial campus or surveying yard, but the names + counts are worth reviewing.
4. **2 stations publish coordinates with ≤ 2 decimal places** (≥ 1 km uncertainty). For RTK that's structurally wrong; coordinates should be 5+ decimals.

---

## 1. Exact-coordinate duplicates — 8 groups

| Coordinates | Station count | Names |
|---|---:|---|
| `11.320921, 124.945297` | 2 | `****00000`, `****00000` |
| `49.638289, 9.352131` | 2 | `****5302D`, `****6A80A` |
| `52.914448, 6.602772` | 2 | `****0WSRA`, `****0WSRT` |
| `43.069314, -89.561365` | 2 | `****18F55`, `****1C301` |
| `41.612412, -93.537434` | 2 | `****E2162`, `****E2162` |
| `29.396359, -98.430213` | 2 | `****CAE6C`, `****CAE6C` |
| `33.946563, -78.315027` | 2 | `****20C40`, `****20C40` |
| `35.208594, -82.24814` | 2 | `****6E64A`, `****6E64A` |

## 2. Near-duplicate stations within 10 m — 907 clusters

| Anchor (lat, lng) | Station count | Names (truncated) |
|---|---:|---|
| 40.36845, -111.93150 | 4 | `****20126`, `****31838`, `****C8D82`, `****6A19E` |
| 52.48618, -105.73548 | 3 | `****FCD66`, `****1A299`, `****6E3FC` |
| 4.30990, 101.14166 | 3 | `****CADA9`, `****E3675`, `****69EAA` |
| 37.39975, -121.98771 | 3 | `****7AE7D`, `****60485`, `G001` |
| 35.20859, -82.24812 | 3 | `****2F569`, `****6E64A`, `****6E64A` |
| -27.54808, 153.08228 | 3 | `****EE73D`, `****FBE61`, `****60459` |
| 28.80292, -97.08081 | 2 | `****D5125`, `****CEE1C` |
| 42.86344, -109.86387 | 2 | `****6F8A1`, `****AEF79` |
| -15.85451, -47.96570 | 2 | `****08A0C`, `****D918D` |
| 45.69003, 24.38313 | 2 | `****E9CD2`, `****FF759` |

_…and 897 more in the snapshot file._

## 3. Tight clusters (≥4 within 100 m) — 4 clusters

| Anchor (lat, lng) | Station count |
|---|---:|
| 37.40031, -121.98768 | 6 |
| 40.36843, -111.93170 | 5 |
| 37.39754, -121.98059 | 4 |
| 43.01565, -82.34377 | 4 |

## 4. Stations with ≤ 2 decimal places of coordinate precision — 2

| Name | Lat | Lng |
|---|---:|---:|
| `****20B85` | 52.182774 | 5.61 |
| `****67BD5` | 37.73 | 28.641921 |

---

## Methodology

Each finding is grounded in how a real CORS / RTK network is physically supposed to look:
- A surveyed GNSS reference station occupies one antenna at one coordinate. Two stations at the same point is structurally undefined.
- Honest sites at ≤ 10 m of each other are vanishingly rare — that's inside the cone of a single antenna mount.
- Clusters of ≥ 4 stations in 100 m can be honest (industrial campus, surveying lab) but justify a manual look.
- An RTK base claiming a position with ≤ 2 decimal places (≥ 1 km uncertainty) is not a real CORS station; the public network shouldn't surface them.

For an authoritative per-device GETKINETIK grade (hardware-rooted signature, chain age, tamper flags), the network or operator can POST a Proof of Origin URL to `https://getkinetik.app/api/verify-device`.

Contact: **eric@outfromnothingllc.com** · https://getkinetik.app/bureau/ · https://getkinetik.app/api/docs/
