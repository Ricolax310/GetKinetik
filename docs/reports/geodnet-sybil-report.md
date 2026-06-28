# Sybil Risk Scan — Geodnet RTK Network

> Independent public read by the GETKINETIK Bureau using only Geodnet's public station endpoint. **No internal Geodnet data was used.** Geodnet RTK stations are surveyed GNSS reference units — each one is supposed to be a unique, physically installed antenna at a fixed coordinate. The heuristics below treat that as the structural rule and flag exceptions.

- **As of:** 2026-06-28
- **Public source:** `https://rtk.geodnet.com/api/v2/coverage_stations`
- **Stations observed:** 19,575
- **Stations flagged (any heuristic):** 1,827 (9.33%)

## Executive summary

1. **9 exact (lat,lng) duplicate groups** on 19,575 public stations — each row in §1 is one coordinate pair your registry team can grep today.
2. **918 ≤10 m proximity clusters** — tighter than two physical RTK antennas; start with the largest counts in §2 (names + anchors included).
3. **9.3%** of the public fleet touches at least one heuristic — useful as a sampling denominator, not a verdict.

---

## Since last snapshot

| Metric | This run | vs last run |
|---|---:|---|
| Stations with coordinates | 19,575 | -5 (-0.0%) |
| Exact (lat,lng) duplicate groups | 9 | -1 (-10.0%) |
| Clusters within 10 m | 918 | +4 (+0.4%) |
| Clusters ≥4 within 100 m | 4 | unchanged vs last run |
| Low-precision coordinates (≤2 decimals) | 4 | unchanged vs last run |
| Fleet share flagged (any heuristic) | 9.33% | +0.05 pp (+0.5%) |

## What to cross-check this week

1. Registry dedupe: for each §1 coordinate pair, confirm whether multiple station IDs should share one surveyed antenna location.
2. Field ops: spot-check §3 tight clusters (≥4 within 100 m) — industrial campus vs duplicate registrations.
3. Data quality: stations in §4 with ≤2 decimal places should not appear as RTK references until coordinates are re-surveyed.
4. Reproduce: `node scripts/sybil-scan-geodnet.mjs` — same public endpoint, no API key.

> Public-data read. Re-run: script in `scripts/`, source URL in report header.

---

## Headline findings

1. **9 groups of stations share an exact (lat, lng) pair.** For a CORS / RTK reference network, two stations at identical coordinates is structurally undefined — there is no second-antenna position to triangulate from.
2. **918 clusters of stations sit within 10 m of each other.** That's tighter than the physical separation of two real RTK installs.
3. **4 clusters have ≥4 stations within 100 m.** Plausible for an industrial campus or surveying yard, but the names + counts are worth reviewing.
4. **4 stations publish coordinates with ≤ 2 decimal places** (≥ 1 km uncertainty). For RTK that's structurally wrong; coordinates should be 5+ decimals.

---

## 1. Exact-coordinate duplicates — 9 groups

| Coordinates | Station count | Names |
|---|---:|---|
| `49.63825, 9.356523` | 2 | `****5302D`, `****6A80A` |
| `52.914409, 6.607164` | 2 | `****0WSRA`, `****0WSRT` |
| `45.867016, -108.772479` | 2 | `****10DA5`, `****3A7F8` |
| `43.069275, -89.556973` | 2 | `****1C301`, `****18F55` |
| `41.612373, -93.533042` | 2 | `****E2162`, `****E2162` |
| `29.39632, -98.425822` | 2 | `****CAE6C`, `****CAE6C` |
| `33.946525, -78.310635` | 2 | `****20C40`, `****20C40` |
| `42.372134, -71.183462` | 2 | `****C6D12`, `****C6D12` |
| `35.208555, -82.243748` | 2 | `****6E64A`, `****6E64A` |

## 2. Near-duplicate stations within 10 m — 918 clusters

| Anchor (lat, lng) | Station count | Names (truncated) |
|---|---:|---|
| 37.39971, -121.98332 | 4 | `****7AE7D`, `****67341`, `****60485`, `G001` |
| 40.36841, -111.92711 | 4 | `****20126`, `****31838`, `****C8D82`, `****6A19E` |
| 37.39844, -121.97673 | 3 | `****C1C72`, `****0DCB8`, `****D0E48` |
| 54.44428, 23.25575 | 3 | `****0B99A`, `****F3D55`, `****0DC58` |
| 35.20855, -82.24373 | 3 | `****2F569`, `****6E64A`, `****6E64A` |
| -27.54812, 153.08667 | 3 | `****EE73D`, `****FBE61`, `****60459` |
| 30.55092, -88.21600 | 3 | `****FE291`, `****C3CFA`, `****09A2E` |
| 37.85232, -97.41612 | 2 | `****3E2FC`, `****FF745` |
| 51.40578, -0.55658 | 2 | `****45EAD`, `****EAB06` |
| 23.68372, 58.12164 | 2 | `****C5CF8`, `****C1BF4` |

_…and 908 more in the snapshot file._

## 3. Tight clusters (≥4 within 100 m) — 4 clusters

| Anchor (lat, lng) | Station count |
|---|---:|
| 37.39971, -121.98332 | 5 |
| 40.36839, -111.92731 | 5 |
| 37.39844, -121.97673 | 4 |
| 43.01561, -82.33938 | 4 |

## 4. Stations with ≤ 2 decimal places of coordinate precision — 4

| Name | Lat | Lng |
|---|---:|---:|
| `****DB3BD` | 63.87643 | 14.47 |
| `****1CE21` | 14.65 | 78.465152 |
| `****206F9` | -6.098322 | 106 |
| `****679A5` | 32.937253 | -102.56 |

---

## Methodology

Each finding is grounded in how a real CORS / RTK network is physically supposed to look:
- A surveyed GNSS reference station occupies one antenna at one coordinate. Two stations at the same point is structurally undefined.
- Honest sites at ≤ 10 m of each other are vanishingly rare — that's inside the cone of a single antenna mount.
- Clusters of ≥ 4 stations in 100 m can be honest (industrial campus, surveying lab) but justify a manual look.
- An RTK base claiming a position with ≤ 2 decimal places (≥ 1 km uncertainty) is not a real CORS station; the public network shouldn't surface them.

For an authoritative per-device GETKINETIK grade (hardware-rooted signature, chain age, tamper flags), the network or operator can POST a Proof of Origin URL to `https://getkinetik.app/api/verify-device`.

Contact: **eric@outfromnothingllc.com** · https://getkinetik.app/bureau/ · https://getkinetik.app/api/docs/
