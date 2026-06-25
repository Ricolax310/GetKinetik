# Sybil Risk Scan — Geodnet RTK Network

> Independent public read by the GETKINETIK Bureau using only Geodnet's public station endpoint. **No internal Geodnet data was used.** Geodnet RTK stations are surveyed GNSS reference units — each one is supposed to be a unique, physically installed antenna at a fixed coordinate. The heuristics below treat that as the structural rule and flag exceptions.

- **As of:** 2026-06-25
- **Public source:** `https://rtk.geodnet.com/api/v2/coverage_stations`
- **Stations observed:** 19,585
- **Stations flagged (any heuristic):** 1,816 (9.27%)

## Executive summary

1. **8 exact (lat,lng) duplicate groups** on 19,585 public stations — each row in §1 is one coordinate pair your registry team can grep today.
2. **912 ≤10 m proximity clusters** — tighter than two physical RTK antennas; start with the largest counts in §2 (names + anchors included).
3. **9.3%** of the public fleet touches at least one heuristic — useful as a sampling denominator, not a verdict.

---

## Since last snapshot

| Metric | This run | vs last run |
|---|---:|---|
| Stations with coordinates | 19,585 | -12 (-0.1%) |
| Exact (lat,lng) duplicate groups | 8 | +1 (+14.3%) |
| Clusters within 10 m | 912 | -1 (-0.1%) |
| Clusters ≥4 within 100 m | 4 | unchanged vs last run |
| Low-precision coordinates (≤2 decimals) | 5 | -4 (-44.4%) |
| Fleet share flagged (any heuristic) | 9.27% | -0.02 pp (-0.2%) |

## What to cross-check this week

1. Registry dedupe: for each §1 coordinate pair, confirm whether multiple station IDs should share one surveyed antenna location.
2. Field ops: spot-check §3 tight clusters (≥4 within 100 m) — industrial campus vs duplicate registrations.
3. Data quality: stations in §4 with ≤2 decimal places should not appear as RTK references until coordinates are re-surveyed.
4. Reproduce: `node scripts/sybil-scan-geodnet.mjs` — same public endpoint, no API key.

> Public-data read. Re-run: script in `scripts/`, source URL in report header.

---

## Headline findings

1. **8 groups of stations share an exact (lat, lng) pair.** For a CORS / RTK reference network, two stations at identical coordinates is structurally undefined — there is no second-antenna position to triangulate from.
2. **912 clusters of stations sit within 10 m of each other.** That's tighter than the physical separation of two real RTK installs.
3. **4 clusters have ≥4 stations within 100 m.** Plausible for an industrial campus or surveying yard, but the names + counts are worth reviewing.
4. **5 stations publish coordinates with ≤ 2 decimal places** (≥ 1 km uncertainty). For RTK that's structurally wrong; coordinates should be 5+ decimals.

---

## 1. Exact-coordinate duplicates — 8 groups

| Coordinates | Station count | Names |
|---|---:|---|
| `49.638284, 9.351882` | 2 | `****5302D`, `****6A80A` |
| `52.914444, 6.602523` | 2 | `****0WSRA`, `****0WSRT` |
| `43.069309, -89.561614` | 2 | `****18F55`, `****1C301` |
| `41.612407, -93.537683` | 2 | `****E2162`, `****E2162` |
| `29.396355, -98.430462` | 2 | `****CAE6C`, `****CAE6C` |
| `33.946559, -78.315276` | 2 | `****20C40`, `****20C40` |
| `42.372169, -71.188103` | 2 | `****C6D12`, `****C6D12` |
| `35.208589, -82.248389` | 2 | `****6E64A`, `****6E64A` |

## 2. Near-duplicate stations within 10 m — 912 clusters

| Anchor (lat, lng) | Station count | Names (truncated) |
|---|---:|---|
| 37.39975, -121.98796 | 4 | `****7AE7D`, `****67341`, `****60485`, `G001` |
| 40.36845, -111.93175 | 4 | `****20126`, `****31838`, `****C8D82`, `****6A19E` |
| 13.05955, 80.22601 | 3 | `****C06E5`, `****1C0B9`, `****6A16E` |
| 35.20858, -82.24837 | 3 | `****2F569`, `****6E64A`, `****6E64A` |
| -27.54809, 153.08203 | 3 | `****EE73D`, `****FBE61`, `****60459` |
| 30.55095, -88.22064 | 3 | `****FE291`, `****C3CFA`, `****09A2E` |
| 40.48617, -3.96470 | 2 | `****1A431`, `****3E26C` |
| 37.28844, -121.79971 | 2 | `****CB53D`, `****B10F5` |
| 42.15932, 27.82858 | 2 | `****89099`, `****CCE1E` |
| 45.35510, -73.29103 | 2 | `****20955`, `****6A19A` |

_…and 902 more in the snapshot file._

## 3. Tight clusters (≥4 within 100 m) — 4 clusters

| Anchor (lat, lng) | Station count |
|---|---:|
| 37.39802, -121.98090 | 5 |
| 37.39975, -121.98796 | 5 |
| 40.36843, -111.93195 | 5 |
| 43.01565, -82.34402 | 4 |

## 4. Stations with ≤ 2 decimal places of coordinate precision — 5

| Name | Lat | Lng |
|---|---:|---:|
| `****F7809` | 42.68 | 26.318879 |
| `****31744` | 40.930011 | 26.58 |
| `****FADD5` | 40.182079 | 32.66 |
| `****6E458` | 51.366645 | 19.88 |
| `****C3D8D` | 42.67 | -76.736539 |

---

## Methodology

Each finding is grounded in how a real CORS / RTK network is physically supposed to look:
- A surveyed GNSS reference station occupies one antenna at one coordinate. Two stations at the same point is structurally undefined.
- Honest sites at ≤ 10 m of each other are vanishingly rare — that's inside the cone of a single antenna mount.
- Clusters of ≥ 4 stations in 100 m can be honest (industrial campus, surveying lab) but justify a manual look.
- An RTK base claiming a position with ≤ 2 decimal places (≥ 1 km uncertainty) is not a real CORS station; the public network shouldn't surface them.

For an authoritative per-device GETKINETIK grade (hardware-rooted signature, chain age, tamper flags), the network or operator can POST a Proof of Origin URL to `https://getkinetik.app/api/verify-device`.

Contact: **eric@outfromnothingllc.com** · https://getkinetik.app/bureau/ · https://getkinetik.app/api/docs/
