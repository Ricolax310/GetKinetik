# Sybil Risk Scan — Geodnet RTK Network

> Independent public read by the GETKINETIK Bureau using only Geodnet's public station endpoint. **No internal Geodnet data was used.** Geodnet RTK stations are surveyed GNSS reference units — each one is supposed to be a unique, physically installed antenna at a fixed coordinate. The heuristics below treat that as the structural rule and flag exceptions.

- **As of:** 2026-07-07
- **Public source:** `https://rtk.geodnet.com/api/v2/coverage_stations`
- **Stations observed:** 19,570
- **Stations flagged (any heuristic):** 1,801 (9.20%)

## Executive summary

1. **8 exact (lat,lng) duplicate groups** on 19,570 public stations — each row in §1 is one coordinate pair your registry team can grep today.
2. **906 ≤10 m proximity clusters** — tighter than two physical RTK antennas; start with the largest counts in §2 (names + anchors included).
3. **9.2%** of the public fleet touches at least one heuristic — useful as a sampling denominator, not a verdict.

---

## Since last snapshot

| Metric | This run | vs last run |
|---|---:|---|
| Stations with coordinates | 19,570 | +7 (+0.0%) |
| Exact (lat,lng) duplicate groups | 8 | -1 (-11.1%) |
| Clusters within 10 m | 906 | -2 (-0.2%) |
| Clusters ≥4 within 100 m | 4 | unchanged vs last run |
| Low-precision coordinates (≤2 decimals) | 3 | -3 (-50.0%) |
| Fleet share flagged (any heuristic) | 9.20% | -0.03 pp (-0.4%) |

## What to cross-check this week

1. Registry dedupe: for each §1 coordinate pair, confirm whether multiple station IDs should share one surveyed antenna location.
2. Field ops: spot-check §3 tight clusters (≥4 within 100 m) — industrial campus vs duplicate registrations.
3. Data quality: stations in §4 with ≤2 decimal places should not appear as RTK references until coordinates are re-surveyed.
4. Reproduce: `node scripts/sybil-scan-geodnet.mjs` — same public endpoint, no API key.

> Public-data read. Re-run: script in `scripts/`, source URL in report header.

---

## Headline findings

1. **8 groups of stations share an exact (lat, lng) pair.** For a CORS / RTK reference network, two stations at identical coordinates is structurally undefined — there is no second-antenna position to triangulate from.
2. **906 clusters of stations sit within 10 m of each other.** That's tighter than the physical separation of two real RTK installs.
3. **4 clusters have ≥4 stations within 100 m.** Plausible for an industrial campus or surveying yard, but the names + counts are worth reviewing.
4. **3 stations publish coordinates with ≤ 2 decimal places** (≥ 1 km uncertainty). For RTK that's structurally wrong; coordinates should be 5+ decimals.

---

## 1. Exact-coordinate duplicates — 8 groups

| Coordinates | Station count | Names |
|---|---:|---|
| `49.6387, 9.350692` | 2 | `****5302D`, `****6A80A` |
| `52.91486, 6.601333` | 2 | `****0WSRA`, `****0WSRT` |
| `45.867466, -108.77831` | 2 | `****10DA5`, `****3A7F8` |
| `41.612823, -93.538873` | 2 | `****E2162`, `****E2162` |
| `29.396771, -98.431653` | 2 | `****CAE6C`, `****CAE6C` |
| `33.946975, -78.316466` | 2 | `****20C40`, `****20C40` |
| `42.372585, -71.189293` | 2 | `****C6D12`, `****C6D12` |
| `35.209005, -82.249579` | 2 | `****6E64A`, `****6E64A` |

## 2. Near-duplicate stations within 10 m — 906 clusters

| Anchor (lat, lng) | Station count | Names (truncated) |
|---|---:|---|
| 37.39884, -121.98257 | 4 | `****16C02`, `****6A8CE`, `****E30E6`, `****6AAF0` |
| 37.40016, -121.98915 | 4 | `****7AE7D`, `****67341`, `****60485`, `G001` |
| 40.36887, -111.93294 | 4 | `****20126`, `****31838`, `****C8D82`, `****6A19E` |
| -27.54767, 153.08084 | 3 | `****EE73D`, `****FBE61`, `****60459` |
| 35.20900, -82.24956 | 3 | `****2F569`, `****6E64A`, `****6E64A` |
| 30.55137, -88.22183 | 3 | `****FE291`, `****C3CFA`, `****09A2E` |
| 44.26287, -88.29000 | 2 | `****1CE25`, `****2416C` |
| 32.41004, -96.84479 | 2 | `****0CAC6`, `****C8E1A` |
| 37.42086, -122.10549 | 2 | `****E288D`, `****29F02` |
| 37.39879, -121.98218 | 2 | `****0A97A`, `****CBE10` |

_…and 896 more in the snapshot file._

## 3. Tight clusters (≥4 within 100 m) — 4 clusters

| Anchor (lat, lng) | Station count |
|---|---:|
| 37.39884, -121.98257 | 8 |
| 37.40016, -121.98915 | 5 |
| 40.36885, -111.93314 | 5 |
| 43.01606, -82.34521 | 4 |

## 4. Stations with ≤ 2 decimal places of coordinate precision — 3

| Name | Lat | Lng |
|---|---:|---:|
| `****7BAF9` | 45.24 | 24.931035 |
| `****2A8FD` | 43.33 | -96.807192 |
| `****FBD8C` | 51.89 | -8.418921 |

---

## Methodology

Each finding is grounded in how a real CORS / RTK network is physically supposed to look:
- A surveyed GNSS reference station occupies one antenna at one coordinate. Two stations at the same point is structurally undefined.
- Honest sites at ≤ 10 m of each other are vanishingly rare — that's inside the cone of a single antenna mount.
- Clusters of ≥ 4 stations in 100 m can be honest (industrial campus, surveying lab) but justify a manual look.
- An RTK base claiming a position with ≤ 2 decimal places (≥ 1 km uncertainty) is not a real CORS station; the public network shouldn't surface them.

For an authoritative per-device GETKINETIK grade (hardware-rooted signature, chain age, tamper flags), the network or operator can POST a Proof of Origin URL to `https://getkinetik.app/api/verify-device`.

Contact: **eric@outfromnothingllc.com** · https://getkinetik.app/bureau/ · https://getkinetik.app/api/docs/
