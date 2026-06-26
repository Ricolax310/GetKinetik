# Sybil Risk Scan — Geodnet RTK Network

> Independent public read by the GETKINETIK Bureau using only Geodnet's public station endpoint. **No internal Geodnet data was used.** Geodnet RTK stations are surveyed GNSS reference units — each one is supposed to be a unique, physically installed antenna at a fixed coordinate. The heuristics below treat that as the structural rule and flag exceptions.

- **As of:** 2026-06-26
- **Public source:** `https://rtk.geodnet.com/api/v2/coverage_stations`
- **Stations observed:** 19,576
- **Stations flagged (any heuristic):** 1,813 (9.26%)

## Executive summary

1. **7 exact (lat,lng) duplicate groups** on 19,576 public stations — each row in §1 is one coordinate pair your registry team can grep today.
2. **911 ≤10 m proximity clusters** — tighter than two physical RTK antennas; start with the largest counts in §2 (names + anchors included).
3. **9.3%** of the public fleet touches at least one heuristic — useful as a sampling denominator, not a verdict.

---

## Since last snapshot

| Metric | This run | vs last run |
|---|---:|---|
| Stations with coordinates | 19,576 | -9 (-0.0%) |
| Exact (lat,lng) duplicate groups | 7 | -1 (-12.5%) |
| Clusters within 10 m | 911 | -1 (-0.1%) |
| Clusters ≥4 within 100 m | 3 | -1 (-25.0%) |
| Low-precision coordinates (≤2 decimals) | 5 | unchanged vs last run |
| Fleet share flagged (any heuristic) | 9.26% | -0.01 pp (-0.1%) |

## What to cross-check this week

1. Registry dedupe: for each §1 coordinate pair, confirm whether multiple station IDs should share one surveyed antenna location.
2. Field ops: spot-check §3 tight clusters (≥4 within 100 m) — industrial campus vs duplicate registrations.
3. Data quality: stations in §4 with ≤2 decimal places should not appear as RTK references until coordinates are re-surveyed.
4. Reproduce: `node scripts/sybil-scan-geodnet.mjs` — same public endpoint, no API key.

> Public-data read. Re-run: script in `scripts/`, source URL in report header.

---

## Headline findings

1. **7 groups of stations share an exact (lat, lng) pair.** For a CORS / RTK reference network, two stations at identical coordinates is structurally undefined — there is no second-antenna position to triangulate from.
2. **911 clusters of stations sit within 10 m of each other.** That's tighter than the physical separation of two real RTK installs.
3. **3 clusters have ≥4 stations within 100 m.** Plausible for an industrial campus or surveying yard, but the names + counts are worth reviewing.
4. **5 stations publish coordinates with ≤ 2 decimal places** (≥ 1 km uncertainty). For RTK that's structurally wrong; coordinates should be 5+ decimals.

---

## 1. Exact-coordinate duplicates — 7 groups

| Coordinates | Station count | Names |
|---|---:|---|
| `52.91507, 6.602684` | 2 | `****0WSRA`, `****0WSRT` |
| `45.867677, -108.776958` | 2 | `****10DA5`, `****3A7F8` |
| `41.613034, -93.537522` | 2 | `****E2162`, `****E2162` |
| `29.396981, -98.430301` | 2 | `****CAE6C`, `****CAE6C` |
| `33.947185, -78.315114` | 2 | `****20C40`, `****20C40` |
| `42.372795, -71.187942` | 2 | `****C6D12`, `****C6D12` |
| `35.209216, -82.248227` | 2 | `****6E64A`, `****6E64A` |

## 2. Near-duplicate stations within 10 m — 911 clusters

| Anchor (lat, lng) | Station count | Names (truncated) |
|---|---:|---|
| 37.40037, -121.98780 | 4 | `****7AE7D`, `****67341`, `****60485`, `G001` |
| 40.36908, -111.93159 | 4 | `****20126`, `****31838`, `****C8D82`, `****6A19E` |
| 37.39910, -121.98121 | 3 | `****C1C72`, `****0DCB8`, `****D0E48` |
| 54.44494, 23.25127 | 3 | `****0B99A`, `****F3D55`, `****0DC58` |
| 35.20921, -82.24821 | 3 | `****2F569`, `****6E64A`, `****6E64A` |
| -27.54746, 153.08219 | 3 | `****EE73D`, `****FBE61`, `****60459` |
| 30.55158, -88.22048 | 3 | `****FE291`, `****C3CFA`, `****09A2E` |
| 45.35572, -73.29087 | 2 | `****20955`, `****6A19A` |
| 37.85298, -97.42060 | 2 | `****3E2FC`, `****FF745` |
| 51.40644, -0.56106 | 2 | `****45EAD`, `****EAB06` |

_…and 901 more in the snapshot file._

## 3. Tight clusters (≥4 within 100 m) — 3 clusters

| Anchor (lat, lng) | Station count |
|---|---:|
| 37.40037, -121.98780 | 5 |
| 40.36906, -111.93179 | 5 |
| 43.01627, -82.34386 | 4 |

## 4. Stations with ≤ 2 decimal places of coordinate precision — 5

| Name | Lat | Lng |
|---|---:|---:|
| `****77E21` | 49.737254 | 21.46 |
| `****117BD` | 51.11 | 10.655386 |
| `****51541` | 38.311623 | 28.67 |
| `****11B21` | 6.54 | -75.492431 |
| `****C6DC4` | 51.165977 | 6.96 |

---

## Methodology

Each finding is grounded in how a real CORS / RTK network is physically supposed to look:
- A surveyed GNSS reference station occupies one antenna at one coordinate. Two stations at the same point is structurally undefined.
- Honest sites at ≤ 10 m of each other are vanishingly rare — that's inside the cone of a single antenna mount.
- Clusters of ≥ 4 stations in 100 m can be honest (industrial campus, surveying lab) but justify a manual look.
- An RTK base claiming a position with ≤ 2 decimal places (≥ 1 km uncertainty) is not a real CORS station; the public network shouldn't surface them.

For an authoritative per-device GETKINETIK grade (hardware-rooted signature, chain age, tamper flags), the network or operator can POST a Proof of Origin URL to `https://getkinetik.app/api/verify-device`.

Contact: **eric@outfromnothingllc.com** · https://getkinetik.app/bureau/ · https://getkinetik.app/api/docs/
