# Sybil Risk Scan — Geodnet RTK Network

> Independent public read by the GETKINETIK Bureau using only Geodnet's public station endpoint. **No internal Geodnet data was used.** Geodnet RTK stations are surveyed GNSS reference units — each one is supposed to be a unique, physically installed antenna at a fixed coordinate. The heuristics below treat that as the structural rule and flag exceptions.

- **As of:** 2026-07-28
- **Public source:** `https://rtk.geodnet.com/api/v2/coverage_stations`
- **Stations observed:** 19,601
- **Stations flagged (any heuristic):** 1,796 (9.16%)

## Executive summary

1. **5 exact (lat,lng) duplicate groups** on 19,601 public stations — each row in §1 is one coordinate pair your registry team can grep today.
2. **904 ≤10 m proximity clusters** — tighter than two physical RTK antennas; start with the largest counts in §2 (names + anchors included).
3. **9.2%** of the public fleet touches at least one heuristic — useful as a sampling denominator, not a verdict.

---

## Since last snapshot

| Metric | This run | vs last run |
|---|---:|---|
| Stations with coordinates | 19,601 | -12 (-0.1%) |
| Exact (lat,lng) duplicate groups | 5 | -1 (-16.7%) |
| Clusters within 10 m | 904 | -3 (-0.3%) |
| Clusters ≥4 within 100 m | 4 | unchanged vs last run |
| Low-precision coordinates (≤2 decimals) | 4 | +3 (+300.0%) |
| Fleet share flagged (any heuristic) | 9.16% | -0.01 pp (-0.2%) |

## What to cross-check this week

1. Registry dedupe: for each §1 coordinate pair, confirm whether multiple station IDs should share one surveyed antenna location.
2. Field ops: spot-check §3 tight clusters (≥4 within 100 m) — industrial campus vs duplicate registrations.
3. Data quality: stations in §4 with ≤2 decimal places should not appear as RTK references until coordinates are re-surveyed.
4. Reproduce: `node scripts/sybil-scan-geodnet.mjs` — same public endpoint, no API key.

> Public-data read. Re-run: script in `scripts/`, source URL in report header.

---

## Headline findings

1. **5 groups of stations share an exact (lat, lng) pair.** For a CORS / RTK reference network, two stations at identical coordinates is structurally undefined — there is no second-antenna position to triangulate from.
2. **904 clusters of stations sit within 10 m of each other.** That's tighter than the physical separation of two real RTK installs.
3. **4 clusters have ≥4 stations within 100 m.** Plausible for an industrial campus or surveying yard, but the names + counts are worth reviewing.
4. **4 stations publish coordinates with ≤ 2 decimal places** (≥ 1 km uncertainty). For RTK that's structurally wrong; coordinates should be 5+ decimals.

---

## 1. Exact-coordinate duplicates — 5 groups

| Coordinates | Station count | Names |
|---|---:|---|
| `52.914373, 6.609438` | 2 | `****0WSRA`, `****0WSRT` |
| `41.612336, -93.530768` | 2 | `****E2162`, `****E2162` |
| `29.396284, -98.423548` | 2 | `****CAE6C`, `****CAE6C` |
| `33.946488, -78.308361` | 2 | `****20C40`, `****20C40` |
| `35.208519, -82.241474` | 2 | `****6E64A`, `****6E64A` |

## 2. Near-duplicate stations within 10 m — 904 clusters

| Anchor (lat, lng) | Station count | Names (truncated) |
|---|---:|---|
| 40.36838, -111.92483 | 4 | `****20126`, `****31838`, `****C8D82`, `****6A19E` |
| 45.73090, 8.78105 | 3 | `****DF080`, `****0B68D`, `****C1C26` |
| 37.39834, -121.97409 | 3 | `****09996`, `****CBE34`, `****20E08` |
| 37.39968, -121.98104 | 3 | `****7AE7D`, `****60485`, `G001` |
| 35.20851, -82.24145 | 3 | `****2F569`, `****6E64A`, `****6E64A` |
| -27.54816, 153.08895 | 3 | `****EE73D`, `****FBE61`, `****60459` |
| 45.91707, 28.11790 | 2 | `****22234`, `****2A6E9` |
| 27.56137, -82.56375 | 2 | `****CCE78`, `****FCF41` |
| 34.16264, -117.48245 | 2 | `****C0CB2`, `****10ED5` |
| 44.34540, 25.95315 | 2 | `****D0EF2`, `****6A80C` |

_…and 894 more in the snapshot file._

## 3. Tight clusters (≥4 within 100 m) — 4 clusters

| Anchor (lat, lng) | Station count |
|---|---:|
| 37.39834, -121.97409 | 6 |
| 37.39968, -121.98104 | 5 |
| 40.36836, -111.92504 | 5 |
| 43.01558, -82.33711 | 4 |

## 4. Stations with ≤ 2 decimal places of coordinate precision — 4

| Name | Lat | Lng |
|---|---:|---:|
| `****E7189` | 40.73 | -73.692437 |
| `****DB175` | 48.83 | 8.68862 |
| `****18499` | 53.11 | 7.096874 |
| `****D2EAA` | 40.52 | -74.398388 |

---

## Methodology

Each finding is grounded in how a real CORS / RTK network is physically supposed to look:
- A surveyed GNSS reference station occupies one antenna at one coordinate. Two stations at the same point is structurally undefined.
- Honest sites at ≤ 10 m of each other are vanishingly rare — that's inside the cone of a single antenna mount.
- Clusters of ≥ 4 stations in 100 m can be honest (industrial campus, surveying lab) but justify a manual look.
- An RTK base claiming a position with ≤ 2 decimal places (≥ 1 km uncertainty) is not a real CORS station; the public network shouldn't surface them.

For an authoritative per-device GETKINETIK grade (hardware-rooted signature, chain age, tamper flags), the network or operator can POST a Proof of Origin URL to `https://getkinetik.app/api/verify-device`.

Contact: **eric@outfromnothingllc.com** · https://getkinetik.app/bureau/ · https://getkinetik.app/api/docs/
