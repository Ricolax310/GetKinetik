# Sybil Risk Scan — Geodnet RTK Network

> Independent public read by the GETKINETIK Bureau using only Geodnet's public station endpoint. **No internal Geodnet data was used.** Geodnet RTK stations are surveyed GNSS reference units — each one is supposed to be a unique, physically installed antenna at a fixed coordinate. The heuristics below treat that as the structural rule and flag exceptions.

- **As of:** 2026-08-23
- **Public source:** `https://rtk.geodnet.com/api/v2/coverage_stations`
- **Stations observed:** 19,514
- **Stations flagged (any heuristic):** 1,796 (9.20%)

## Executive summary

1. **7 exact (lat,lng) duplicate groups** on 19,514 public stations — each row in §1 is one coordinate pair your registry team can grep today.
2. **904 ≤10 m proximity clusters** — tighter than two physical RTK antennas; start with the largest counts in §2 (names + anchors included).
3. **9.2%** of the public fleet touches at least one heuristic — useful as a sampling denominator, not a verdict.

---

## Since last snapshot

| Metric | This run | vs last run |
|---|---:|---|
| Stations with coordinates | 19,514 | +2 (+0.0%) |
| Exact (lat,lng) duplicate groups | 7 | unchanged vs last run |
| Clusters within 10 m | 904 | -1 (-0.1%) |
| Clusters ≥4 within 100 m | 4 | unchanged vs last run |
| Low-precision coordinates (≤2 decimals) | 1 | -3 (-75.0%) |
| Fleet share flagged (any heuristic) | 9.20% | -0.02 pp (-0.2%) |

## What to cross-check this week

1. Registry dedupe: for each §1 coordinate pair, confirm whether multiple station IDs should share one surveyed antenna location.
2. Field ops: spot-check §3 tight clusters (≥4 within 100 m) — industrial campus vs duplicate registrations.
3. Data quality: stations in §4 with ≤2 decimal places should not appear as RTK references until coordinates are re-surveyed.
4. Reproduce: `node scripts/sybil-scan-geodnet.mjs` — same public endpoint, no API key.

> Public-data read. Re-run: script in `scripts/`, source URL in report header.

---

## Headline findings

1. **7 groups of stations share an exact (lat, lng) pair.** For a CORS / RTK reference network, two stations at identical coordinates is structurally undefined — there is no second-antenna position to triangulate from.
2. **904 clusters of stations sit within 10 m of each other.** That's tighter than the physical separation of two real RTK installs.
3. **4 clusters have ≥4 stations within 100 m.** Plausible for an industrial campus or surveying yard, but the names + counts are worth reviewing.
4. **1 stations publish coordinates with ≤ 2 decimal places** (≥ 1 km uncertainty). For RTK that's structurally wrong; coordinates should be 5+ decimals.

---

## 1. Exact-coordinate duplicates — 7 groups

| Coordinates | Station count | Names |
|---|---:|---|
| `49.638599, 9.355144` | 2 | `****5302D`, `****6A80A` |
| `52.914758, 6.605785` | 2 | `****0WSRA`, `****0WSRT` |
| `43.069624, -89.558352` | 2 | `****1C301`, `****18F55` |
| `41.612722, -93.534421` | 2 | `****E2162`, `****E2162` |
| `29.396669, -98.4272` | 2 | `****CAE6C`, `****CAE6C` |
| `33.946874, -78.312014` | 2 | `****20C40`, `****20C40` |
| `35.208904, -82.245127` | 2 | `****6E64A`, `****6E64A` |

## 2. Near-duplicate stations within 10 m — 904 clusters

| Anchor (lat, lng) | Station count | Names (truncated) |
|---|---:|---|
| 40.36876, -111.92849 | 4 | `****20126`, `****31838`, `****C8D82`, `****6A19E` |
| 38.00398, -122.30783 | 3 | `****C4105`, `****97A05`, `****C0A6E` |
| 52.48649, -105.73247 | 3 | `****FCD66`, `****1A299`, `****6E3FC` |
| 4.31022, 101.14467 | 3 | `****CADA9`, `****E3675`, `****69EAA` |
| 37.40006, -121.98470 | 3 | `****7AE7D`, `****60485`, `G001` |
| 35.20890, -82.24511 | 3 | `****2F569`, `****6E64A`, `****6E64A` |
| -27.54777, 153.08530 | 3 | `****EE73D`, `****FBE61`, `****60459` |
| 27.56171, -82.56739 | 2 | `****FCF41`, `****CCE78` |
| 58.38667, -3.14727 | 2 | `****C9DE2`, `****F3585` |
| 28.80323, -97.07780 | 2 | `****D5125`, `****CEE1C` |

_…and 894 more in the snapshot file._

## 3. Tight clusters (≥4 within 100 m) — 4 clusters

| Anchor (lat, lng) | Station count |
|---|---:|
| 37.40062, -121.98467 | 6 |
| 40.36874, -111.92869 | 5 |
| 37.39785, -121.97757 | 4 |
| 43.01596, -82.34076 | 4 |

## 4. Stations with ≤ 2 decimal places of coordinate precision — 1

| Name | Lat | Lng |
|---|---:|---:|
| `****2190D` | 49.933621 | -97.15 |

---

## Methodology

Each finding is grounded in how a real CORS / RTK network is physically supposed to look:
- A surveyed GNSS reference station occupies one antenna at one coordinate. Two stations at the same point is structurally undefined.
- Honest sites at ≤ 10 m of each other are vanishingly rare — that's inside the cone of a single antenna mount.
- Clusters of ≥ 4 stations in 100 m can be honest (industrial campus, surveying lab) but justify a manual look.
- An RTK base claiming a position with ≤ 2 decimal places (≥ 1 km uncertainty) is not a real CORS station; the public network shouldn't surface them.

For an authoritative per-device GETKINETIK grade (hardware-rooted signature, chain age, tamper flags), the network or operator can POST a Proof of Origin URL to `https://getkinetik.app/api/verify-device`.

Contact: **eric@outfromnothingllc.com** · https://getkinetik.app/bureau/ · https://getkinetik.app/api/docs/
