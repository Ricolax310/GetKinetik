# Sybil Risk Scan — Geodnet RTK Network

> Independent public read by the GETKINETIK Bureau using only Geodnet's public station endpoint. **No internal Geodnet data was used.** Geodnet RTK stations are surveyed GNSS reference units — each one is supposed to be a unique, physically installed antenna at a fixed coordinate. The heuristics below treat that as the structural rule and flag exceptions.

- **As of:** 2026-07-12
- **Public source:** `https://rtk.geodnet.com/api/v2/coverage_stations`
- **Stations observed:** 19,569
- **Stations flagged (any heuristic):** 1,802 (9.21%)

## Executive summary

1. **10 exact (lat,lng) duplicate groups** on 19,569 public stations — each row in §1 is one coordinate pair your registry team can grep today.
2. **905 ≤10 m proximity clusters** — tighter than two physical RTK antennas; start with the largest counts in §2 (names + anchors included).
3. **9.2%** of the public fleet touches at least one heuristic — useful as a sampling denominator, not a verdict.

---

## Since last snapshot

| Metric | This run | vs last run |
|---|---:|---|
| Stations with coordinates | 19,569 | +2 (+0.0%) |
| Exact (lat,lng) duplicate groups | 10 | +1 (+11.1%) |
| Clusters within 10 m | 905 | unchanged vs last run |
| Clusters ≥4 within 100 m | 4 | unchanged vs last run |
| Low-precision coordinates (≤2 decimals) | 1 | -4 (-80.0%) |
| Fleet share flagged (any heuristic) | 9.21% | -0.02 pp (-0.2%) |

## What to cross-check this week

1. Registry dedupe: for each §1 coordinate pair, confirm whether multiple station IDs should share one surveyed antenna location.
2. Field ops: spot-check §3 tight clusters (≥4 within 100 m) — industrial campus vs duplicate registrations.
3. Data quality: stations in §4 with ≤2 decimal places should not appear as RTK references until coordinates are re-surveyed.
4. Reproduce: `node scripts/sybil-scan-geodnet.mjs` — same public endpoint, no API key.

> Public-data read. Re-run: script in `scripts/`, source URL in report header.

---

## Headline findings

1. **10 groups of stations share an exact (lat, lng) pair.** For a CORS / RTK reference network, two stations at identical coordinates is structurally undefined — there is no second-antenna position to triangulate from.
2. **905 clusters of stations sit within 10 m of each other.** That's tighter than the physical separation of two real RTK installs.
3. **4 clusters have ≥4 stations within 100 m.** Plausible for an industrial campus or surveying yard, but the names + counts are worth reviewing.
4. **1 stations publish coordinates with ≤ 2 decimal places** (≥ 1 km uncertainty). For RTK that's structurally wrong; coordinates should be 5+ decimals.

---

## 1. Exact-coordinate duplicates — 10 groups

| Coordinates | Station count | Names |
|---|---:|---|
| `42.372137, -71.187782` | 2 | `****C6D12`, `****C6D12` |
| `41.612375, -93.537363` | 2 | `****E2162`, `****E2162` |
| `49.638252, 9.352203` | 2 | `****5302D`, `****6A80A` |
| `45.887501, -90.832502` | 2 | `****379D9`, `****09A46` |
| `52.914412, 6.602844` | 2 | `****0WSRA`, `****0WSRT` |
| `45.867018, -108.776799` | 2 | `****10DA5`, `****3A7F8` |
| `43.069277, -89.561293` | 2 | `****18F55`, `****1C301` |
| `29.396322, -98.430142` | 2 | `****CAE6C`, `****CAE6C` |
| `33.946527, -78.314955` | 2 | `****20C40`, `****20C40` |
| `35.208557, -82.248068` | 2 | `****6E64A`, `****6E64A` |

## 2. Near-duplicate stations within 10 m — 905 clusters

| Anchor (lat, lng) | Station count | Names (truncated) |
|---|---:|---|
| 37.39832, -121.98068 | 6 | `****3D678`, `****22D48`, `****CBE10`, `****D1EF6`, `****0BA90`, `****0997A` |
| 37.39842, -121.98105 | 5 | `****6AAF0`, `****21B62`, `****CAE50`, `****CDEB0`, `****21B78` |
| 37.39823, -121.98065 | 4 | `****210CE`, `****22D48`, `****D1EF6`, `****0BA90` |
| 37.39972, -121.98764 | 4 | `****7AE7D`, `****67341`, `****60485`, `G001` |
| 40.36842, -111.93143 | 4 | `****20126`, `****31838`, `****C8D82`, `****6A19E` |
| 39.85329, -105.21983 | 3 | `****E9CD8`, `****ABCED`, `****6E588` |
| 30.05390, -99.15255 | 3 | `****21B94`, `****79F65`, `****6A182` |
| 35.20855, -82.24805 | 3 | `****2F569`, `****6E64A`, `****6E64A` |
| -27.54812, 153.08235 | 3 | `****EE73D`, `****FBE61`, `****60459` |
| 30.55092, -88.22032 | 3 | `****FE291`, `****C3CFA`, `****09A2E` |

_…and 895 more in the snapshot file._

## 3. Tight clusters (≥4 within 100 m) — 4 clusters

| Anchor (lat, lng) | Station count |
|---|---:|
| 37.39842, -121.98105 | 15 |
| 37.39972, -121.98764 | 5 |
| 40.36840, -111.93163 | 5 |
| 43.01561, -82.34370 | 4 |

## 4. Stations with ≤ 2 decimal places of coordinate precision — 1

| Name | Lat | Lng |
|---|---:|---:|
| `****1C2B9` | 47.22 | 22.806328 |

---

## Methodology

Each finding is grounded in how a real CORS / RTK network is physically supposed to look:
- A surveyed GNSS reference station occupies one antenna at one coordinate. Two stations at the same point is structurally undefined.
- Honest sites at ≤ 10 m of each other are vanishingly rare — that's inside the cone of a single antenna mount.
- Clusters of ≥ 4 stations in 100 m can be honest (industrial campus, surveying lab) but justify a manual look.
- An RTK base claiming a position with ≤ 2 decimal places (≥ 1 km uncertainty) is not a real CORS station; the public network shouldn't surface them.

For an authoritative per-device GETKINETIK grade (hardware-rooted signature, chain age, tamper flags), the network or operator can POST a Proof of Origin URL to `https://getkinetik.app/api/verify-device`.

Contact: **eric@outfromnothingllc.com** · https://getkinetik.app/bureau/ · https://getkinetik.app/api/docs/
