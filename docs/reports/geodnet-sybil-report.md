# Sybil Risk Scan — Geodnet RTK Network

> Independent public read by the GETKINETIK Bureau using only Geodnet's public station endpoint. **No internal Geodnet data was used.** Geodnet RTK stations are surveyed GNSS reference units — each one is supposed to be a unique, physically installed antenna at a fixed coordinate. The heuristics below treat that as the structural rule and flag exceptions.

- **As of:** 2026-06-24
- **Public source:** `https://rtk.geodnet.com/api/v2/coverage_stations`
- **Stations observed:** 19,597
- **Stations flagged (any heuristic):** 1,821 (9.29%)

## Executive summary

1. **7 exact (lat,lng) duplicate groups** on 19,597 public stations — each row in §1 is one coordinate pair your registry team can grep today.
2. **913 ≤10 m proximity clusters** — tighter than two physical RTK antennas; start with the largest counts in §2 (names + anchors included).
3. **9.3%** of the public fleet touches at least one heuristic — useful as a sampling denominator, not a verdict.

---

## Since last snapshot

| Metric | This run | vs last run |
|---|---:|---|
| Stations with coordinates | 19,597 | -6 (-0.0%) |
| Exact (lat,lng) duplicate groups | 7 | -4 (-36.4%) |
| Clusters within 10 m | 913 | -2 (-0.2%) |
| Clusters ≥4 within 100 m | 4 | -1 (-20.0%) |
| Low-precision coordinates (≤2 decimals) | 9 | +3 (+50.0%) |
| Fleet share flagged (any heuristic) | 9.29% | -0.00 pp (-0.0%) |

## What to cross-check this week

1. Registry dedupe: for each §1 coordinate pair, confirm whether multiple station IDs should share one surveyed antenna location.
2. Field ops: spot-check §3 tight clusters (≥4 within 100 m) — industrial campus vs duplicate registrations.
3. Data quality: stations in §4 with ≤2 decimal places should not appear as RTK references until coordinates are re-surveyed.
4. Reproduce: `node scripts/sybil-scan-geodnet.mjs` — same public endpoint, no API key.

> Public-data read. Re-run: script in `scripts/`, source URL in report header.

---

## Headline findings

1. **7 groups of stations share an exact (lat, lng) pair.** For a CORS / RTK reference network, two stations at identical coordinates is structurally undefined — there is no second-antenna position to triangulate from.
2. **913 clusters of stations sit within 10 m of each other.** That's tighter than the physical separation of two real RTK installs.
3. **4 clusters have ≥4 stations within 100 m.** Plausible for an industrial campus or surveying yard, but the names + counts are worth reviewing.
4. **9 stations publish coordinates with ≤ 2 decimal places** (≥ 1 km uncertainty). For RTK that's structurally wrong; coordinates should be 5+ decimals.

---

## 1. Exact-coordinate duplicates — 7 groups

| Coordinates | Station count | Names |
|---|---:|---|
| `52.914898, 6.606433` | 2 | `****0WSRA`, `****0WSRT` |
| `45.867505, -108.77321` | 2 | `****10DA5`, `****3A7F8` |
| `41.612862, -93.533773` | 2 | `****E2162`, `****E2162` |
| `29.396809, -98.426553` | 2 | `****CAE6C`, `****CAE6C` |
| `33.947013, -78.311366` | 2 | `****20C40`, `****20C40` |
| `42.372623, -71.184193` | 2 | `****C6D12`, `****C6D12` |
| `35.209044, -82.244479` | 2 | `****6E64A`, `****6E64A` |

## 2. Near-duplicate stations within 10 m — 913 clusters

| Anchor (lat, lng) | Station count | Names (truncated) |
|---|---:|---|
| 37.40020, -121.98405 | 4 | `****7AE7D`, `****67341`, `****60485`, `G001` |
| 40.36890, -111.92784 | 4 | `****20126`, `****31838`, `****C8D82`, `****6A19E` |
| 13.06000, 80.22991 | 3 | `****C06E5`, `****1C0B9`, `****6A16E` |
| 35.20904, -82.24446 | 3 | `****2F569`, `****6E64A`, `****6E64A` |
| -27.54763, 153.08594 | 3 | `****EE73D`, `****FBE61`, `****60459` |
| 30.55141, -88.21673 | 3 | `****FE291`, `****C3CFA`, `****09A2E` |
| -34.14128, -63.39646 | 2 | `****4A449`, `****21BF2` |
| 37.39845, -121.97700 | 2 | `****7CE6D`, `****D4A09` |
| 35.49861, -89.76214 | 2 | `****5ED05`, `****5ED05` |
| 52.80365, 17.60811 | 2 | `****C1CB4`, `****1B90D` |

_…and 903 more in the snapshot file._

## 3. Tight clusters (≥4 within 100 m) — 4 clusters

| Anchor (lat, lng) | Station count |
|---|---:|
| 37.39845, -121.97700 | 5 |
| 37.40020, -121.98405 | 5 |
| 40.36888, -111.92804 | 5 |
| 43.01610, -82.34011 | 4 |

## 4. Stations with ≤ 2 decimal places of coordinate precision — 9

| Name | Lat | Lng |
|---|---:|---:|
| `****C06E5` | 13.06 | 80.229914 |
| `5PDY` | -36.65 | 140.531769 |
| `****74911` | 26.42 | 80.385558 |
| `****1CF41` | 37.47 | 36.398779 |
| `****21901` | 40.274109 | 18.43 |
| `****7C0D9` | 47.59 | -122.825366 |
| `****22C2A` | 32.314345 | -89.79 |
| `****0A9A4` | 36.08 | -79.3285 |
| `****7B0C9` | 49.100991 | 10.44 |

---

## Methodology

Each finding is grounded in how a real CORS / RTK network is physically supposed to look:
- A surveyed GNSS reference station occupies one antenna at one coordinate. Two stations at the same point is structurally undefined.
- Honest sites at ≤ 10 m of each other are vanishingly rare — that's inside the cone of a single antenna mount.
- Clusters of ≥ 4 stations in 100 m can be honest (industrial campus, surveying lab) but justify a manual look.
- An RTK base claiming a position with ≤ 2 decimal places (≥ 1 km uncertainty) is not a real CORS station; the public network shouldn't surface them.

For an authoritative per-device GETKINETIK grade (hardware-rooted signature, chain age, tamper flags), the network or operator can POST a Proof of Origin URL to `https://getkinetik.app/api/verify-device`.

Contact: **eric@outfromnothingllc.com** · https://getkinetik.app/bureau/ · https://getkinetik.app/api/docs/
