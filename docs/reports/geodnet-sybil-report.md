# Sybil Risk Scan — Geodnet RTK Network

> Independent public read by the GETKINETIK Bureau using only Geodnet's public station endpoint. **No internal Geodnet data was used.** Geodnet RTK stations are surveyed GNSS reference units — each one is supposed to be a unique, physically installed antenna at a fixed coordinate. The heuristics below treat that as the structural rule and flag exceptions.

- **As of:** 2026-06-27
- **Public source:** `https://rtk.geodnet.com/api/v2/coverage_stations`
- **Stations observed:** 19,580
- **Stations flagged (any heuristic):** 1,818 (9.28%)

## Executive summary

1. **10 exact (lat,lng) duplicate groups** on 19,580 public stations — each row in §1 is one coordinate pair your registry team can grep today.
2. **914 ≤10 m proximity clusters** — tighter than two physical RTK antennas; start with the largest counts in §2 (names + anchors included).
3. **9.3%** of the public fleet touches at least one heuristic — useful as a sampling denominator, not a verdict.

---

## Since last snapshot

| Metric | This run | vs last run |
|---|---:|---|
| Stations with coordinates | 19,580 | +7 (+0.0%) |
| Exact (lat,lng) duplicate groups | 10 | +4 (+66.7%) |
| Clusters within 10 m | 914 | +1 (+0.1%) |
| Clusters ≥4 within 100 m | 4 | unchanged vs last run |
| Low-precision coordinates (≤2 decimals) | 4 | unchanged vs last run |
| Fleet share flagged (any heuristic) | 9.28% | +0.00 pp (+0.0%) |

## What to cross-check this week

1. Registry dedupe: for each §1 coordinate pair, confirm whether multiple station IDs should share one surveyed antenna location.
2. Field ops: spot-check §3 tight clusters (≥4 within 100 m) — industrial campus vs duplicate registrations.
3. Data quality: stations in §4 with ≤2 decimal places should not appear as RTK references until coordinates are re-surveyed.
4. Reproduce: `node scripts/sybil-scan-geodnet.mjs` — same public endpoint, no API key.

> Public-data read. Re-run: script in `scripts/`, source URL in report header.

---

## Headline findings

1. **10 groups of stations share an exact (lat, lng) pair.** For a CORS / RTK reference network, two stations at identical coordinates is structurally undefined — there is no second-antenna position to triangulate from.
2. **914 clusters of stations sit within 10 m of each other.** That's tighter than the physical separation of two real RTK installs.
3. **4 clusters have ≥4 stations within 100 m.** Plausible for an industrial campus or surveying yard, but the names + counts are worth reviewing.
4. **4 stations publish coordinates with ≤ 2 decimal places** (≥ 1 km uncertainty). For RTK that's structurally wrong; coordinates should be 5+ decimals.

---

## 1. Exact-coordinate duplicates — 10 groups

| Coordinates | Station count | Names |
|---|---:|---|
| `49.638267, 9.352052` | 2 | `****5302D`, `****6A80A` |
| `45.887516, -90.832653` | 2 | `****379D9`, `****09A46` |
| `52.914427, 6.602693` | 2 | `****0WSRA`, `****0WSRT` |
| `45.867033, -108.77695` | 2 | `****10DA5`, `****3A7F8` |
| `43.069292, -89.561444` | 2 | `****1C301`, `****18F55` |
| `41.61239, -93.537513` | 2 | `****E2162`, `****E2162` |
| `29.396337, -98.430293` | 2 | `****CAE6C`, `****CAE6C` |
| `33.946542, -78.315106` | 2 | `****20C40`, `****20C40` |
| `42.372152, -71.187933` | 2 | `****C6D12`, `****C6D12` |
| `35.208572, -82.248219` | 2 | `****6E64A`, `****6E64A` |

## 2. Near-duplicate stations within 10 m — 914 clusters

| Anchor (lat, lng) | Station count | Names (truncated) |
|---|---:|---|
| 37.39973, -121.98779 | 4 | `****7AE7D`, `****67341`, `****60485`, `G001` |
| 40.36843, -111.93158 | 4 | `****20126`, `****31838`, `****C8D82`, `****6A19E` |
| 37.39846, -121.98120 | 3 | `****C1C72`, `****0DCB8`, `****D0E48` |
| 54.44430, 23.25128 | 3 | `****0B99A`, `****F3D55`, `****0DC58` |
| 35.20857, -82.24820 | 3 | `****2F569`, `****6E64A`, `****6E64A` |
| -27.54810, 153.08220 | 3 | `****EE73D`, `****FBE61`, `****60459` |
| 30.55093, -88.22047 | 3 | `****FE291`, `****C3CFA`, `****09A2E` |
| 45.35508, -73.29086 | 2 | `****20955`, `****6A19A` |
| 37.85234, -97.42060 | 2 | `****3E2FC`, `****FF745` |
| 51.40580, -0.56105 | 2 | `****45EAD`, `****EAB06` |

_…and 904 more in the snapshot file._

## 3. Tight clusters (≥4 within 100 m) — 4 clusters

| Anchor (lat, lng) | Station count |
|---|---:|
| 37.39973, -121.98779 | 5 |
| 40.36841, -111.93178 | 5 |
| 37.39846, -121.98120 | 4 |
| 43.01563, -82.34385 | 4 |

## 4. Stations with ≤ 2 decimal places of coordinate precision — 4

| Name | Lat | Lng |
|---|---:|---:|
| `****07229` | 38.12 | -7.846237 |
| `****1C099` | 56.89 | 14.794443 |
| `****674B1` | -7.246104 | -44.55 |
| `****E1B21` | 41.14 | 24.129951 |

---

## Methodology

Each finding is grounded in how a real CORS / RTK network is physically supposed to look:
- A surveyed GNSS reference station occupies one antenna at one coordinate. Two stations at the same point is structurally undefined.
- Honest sites at ≤ 10 m of each other are vanishingly rare — that's inside the cone of a single antenna mount.
- Clusters of ≥ 4 stations in 100 m can be honest (industrial campus, surveying lab) but justify a manual look.
- An RTK base claiming a position with ≤ 2 decimal places (≥ 1 km uncertainty) is not a real CORS station; the public network shouldn't surface them.

For an authoritative per-device GETKINETIK grade (hardware-rooted signature, chain age, tamper flags), the network or operator can POST a Proof of Origin URL to `https://getkinetik.app/api/verify-device`.

Contact: **eric@outfromnothingllc.com** · https://getkinetik.app/bureau/ · https://getkinetik.app/api/docs/
