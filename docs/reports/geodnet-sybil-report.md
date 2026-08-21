# Sybil Risk Scan — Geodnet RTK Network

> Independent public read by the GETKINETIK Bureau using only Geodnet's public station endpoint. **No internal Geodnet data was used.** Geodnet RTK stations are surveyed GNSS reference units — each one is supposed to be a unique, physically installed antenna at a fixed coordinate. The heuristics below treat that as the structural rule and flag exceptions.

- **As of:** 2026-08-21
- **Public source:** `https://rtk.geodnet.com/api/v2/coverage_stations`
- **Stations observed:** 19,494
- **Stations flagged (any heuristic):** 1,803 (9.25%)

## Executive summary

1. **6 exact (lat,lng) duplicate groups** on 19,494 public stations — each row in §1 is one coordinate pair your registry team can grep today.
2. **908 ≤10 m proximity clusters** — tighter than two physical RTK antennas; start with the largest counts in §2 (names + anchors included).
3. **9.2%** of the public fleet touches at least one heuristic — useful as a sampling denominator, not a verdict.

---

## Since last snapshot

| Metric | This run | vs last run |
|---|---:|---|
| Stations with coordinates | 19,494 | +4 (+0.0%) |
| Exact (lat,lng) duplicate groups | 6 | unchanged vs last run |
| Clusters within 10 m | 908 | +5 (+0.6%) |
| Clusters ≥4 within 100 m | 5 | unchanged vs last run |
| Low-precision coordinates (≤2 decimals) | 2 | -3 (-60.0%) |
| Fleet share flagged (any heuristic) | 9.25% | +0.03 pp (+0.3%) |

## What to cross-check this week

1. Registry dedupe: for each §1 coordinate pair, confirm whether multiple station IDs should share one surveyed antenna location.
2. Field ops: spot-check §3 tight clusters (≥4 within 100 m) — industrial campus vs duplicate registrations.
3. Data quality: stations in §4 with ≤2 decimal places should not appear as RTK references until coordinates are re-surveyed.
4. Reproduce: `node scripts/sybil-scan-geodnet.mjs` — same public endpoint, no API key.

> Public-data read. Re-run: script in `scripts/`, source URL in report header.

---

## Headline findings

1. **6 groups of stations share an exact (lat, lng) pair.** For a CORS / RTK reference network, two stations at identical coordinates is structurally undefined — there is no second-antenna position to triangulate from.
2. **908 clusters of stations sit within 10 m of each other.** That's tighter than the physical separation of two real RTK installs.
3. **5 clusters have ≥4 stations within 100 m.** Plausible for an industrial campus or surveying yard, but the names + counts are worth reviewing.
4. **2 stations publish coordinates with ≤ 2 decimal places** (≥ 1 km uncertainty). For RTK that's structurally wrong; coordinates should be 5+ decimals.

---

## 1. Exact-coordinate duplicates — 6 groups

| Coordinates | Station count | Names |
|---|---:|---|
| `11.321335, 124.950071` | 2 | `****00000`, `****00000` |
| `52.914862, 6.607546` | 2 | `****0WSRA`, `****0WSRT` |
| `41.612826, -93.53266` | 2 | `****E2162`, `****E2162` |
| `29.396773, -98.425439` | 2 | `****CAE6C`, `****CAE6C` |
| `33.946977, -78.310252` | 2 | `****20C40`, `****20C40` |
| `35.209008, -82.243365` | 2 | `****6E64A`, `****6E64A` |

## 2. Near-duplicate stations within 10 m — 908 clusters

| Anchor (lat, lng) | Station count | Names (truncated) |
|---|---:|---|
| 40.36887, -111.92673 | 4 | `****20126`, `****31838`, `****C8D82`, `****6A19E` |
| 38.00408, -122.30607 | 3 | `****C4105`, `****97A05`, `****C0A6E` |
| 37.40017, -121.98293 | 3 | `****7AE7D`, `****60485`, `G001` |
| 35.20900, -82.24335 | 3 | `****2F569`, `****6E64A`, `****6E64A` |
| -27.54767, 153.08706 | 3 | `****EE73D`, `****FBE61`, `****60459` |
| 38.40486, -121.36897 | 2 | `****1CF45`, `****29EE6` |
| 37.39887, -121.97635 | 2 | `****21C32`, `****21BC8` |
| 42.88682, -74.69914 | 2 | `****0EC90`, `****C5F19` |
| 35.06655, -82.62720 | 2 | `****20CFC`, `****6E638` |
| -34.14131, -63.39535 | 2 | `****4A449`, `****21BF2` |

_…and 898 more in the snapshot file._

## 3. Tight clusters (≥4 within 100 m) — 5 clusters

| Anchor (lat, lng) | Station count |
|---|---:|
| 37.40072, -121.98291 | 6 |
| 37.39897, -121.97595 | 5 |
| 40.36885, -111.92693 | 5 |
| 37.39795, -121.97581 | 4 |
| 43.01607, -82.33900 | 4 |

## 4. Stations with ≤ 2 decimal places of coordinate precision — 2

| Name | Lat | Lng |
|---|---:|---:|
| `****CADA1` | 56.17059 | 24.59 |
| `****21B5E` | 37.16 | -8.300591 |

---

## Methodology

Each finding is grounded in how a real CORS / RTK network is physically supposed to look:
- A surveyed GNSS reference station occupies one antenna at one coordinate. Two stations at the same point is structurally undefined.
- Honest sites at ≤ 10 m of each other are vanishingly rare — that's inside the cone of a single antenna mount.
- Clusters of ≥ 4 stations in 100 m can be honest (industrial campus, surveying lab) but justify a manual look.
- An RTK base claiming a position with ≤ 2 decimal places (≥ 1 km uncertainty) is not a real CORS station; the public network shouldn't surface them.

For an authoritative per-device GETKINETIK grade (hardware-rooted signature, chain age, tamper flags), the network or operator can POST a Proof of Origin URL to `https://getkinetik.app/api/verify-device`.

Contact: **eric@outfromnothingllc.com** · https://getkinetik.app/bureau/ · https://getkinetik.app/api/docs/
