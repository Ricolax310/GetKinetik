# Sybil Risk Scan — Geodnet RTK Network

> Independent public read by the GETKINETIK Bureau using only Geodnet's public station endpoint. **No internal Geodnet data was used.** Geodnet RTK stations are surveyed GNSS reference units — each one is supposed to be a unique, physically installed antenna at a fixed coordinate. The heuristics below treat that as the structural rule and flag exceptions.

- **As of:** 2026-07-06
- **Public source:** `https://rtk.geodnet.com/api/v2/coverage_stations`
- **Stations observed:** 19,570
- **Stations flagged (any heuristic):** 1,814 (9.27%)

## Executive summary

1. **10 exact (lat,lng) duplicate groups** on 19,570 public stations — each row in §1 is one coordinate pair your registry team can grep today.
2. **910 ≤10 m proximity clusters** — tighter than two physical RTK antennas; start with the largest counts in §2 (names + anchors included).
3. **9.3%** of the public fleet touches at least one heuristic — useful as a sampling denominator, not a verdict.

---

## Since last snapshot

| Metric | This run | vs last run |
|---|---:|---|
| Stations with coordinates | 19,570 | -2 (-0.0%) |
| Exact (lat,lng) duplicate groups | 10 | +4 (+66.7%) |
| Clusters within 10 m | 910 | unchanged vs last run |
| Clusters ≥4 within 100 m | 4 | unchanged vs last run |
| Low-precision coordinates (≤2 decimals) | 7 | +4 (+133.3%) |
| Fleet share flagged (any heuristic) | 9.27% | +0.02 pp (+0.2%) |

## What to cross-check this week

1. Registry dedupe: for each §1 coordinate pair, confirm whether multiple station IDs should share one surveyed antenna location.
2. Field ops: spot-check §3 tight clusters (≥4 within 100 m) — industrial campus vs duplicate registrations.
3. Data quality: stations in §4 with ≤2 decimal places should not appear as RTK references until coordinates are re-surveyed.
4. Reproduce: `node scripts/sybil-scan-geodnet.mjs` — same public endpoint, no API key.

> Public-data read. Re-run: script in `scripts/`, source URL in report header.

---

## Headline findings

1. **10 groups of stations share an exact (lat, lng) pair.** For a CORS / RTK reference network, two stations at identical coordinates is structurally undefined — there is no second-antenna position to triangulate from.
2. **910 clusters of stations sit within 10 m of each other.** That's tighter than the physical separation of two real RTK installs.
3. **4 clusters have ≥4 stations within 100 m.** Plausible for an industrial campus or surveying yard, but the names + counts are worth reviewing.
4. **7 stations publish coordinates with ≤ 2 decimal places** (≥ 1 km uncertainty). For RTK that's structurally wrong; coordinates should be 5+ decimals.

---

## 1. Exact-coordinate duplicates — 10 groups

| Coordinates | Station count | Names |
|---|---:|---|
| `41.612189, -93.539249` | 2 | `****E2162`, `****E2162` |
| `49.638066, 9.350317` | 2 | `****5302D`, `****6A80A` |
| `45.887315, -90.834388` | 2 | `****379D9`, `****09A46` |
| `52.914226, 6.600958` | 2 | `****0WSRA`, `****0WSRT` |
| `45.866832, -108.778685` | 2 | `****10DA5`, `****3A7F8` |
| `43.069091, -89.563179` | 2 | `****1C301`, `****18F55` |
| `29.396136, -98.432028` | 2 | `****CAE6C`, `****CAE6C` |
| `33.946341, -78.316841` | 2 | `****20C40`, `****20C40` |
| `42.371951, -71.189668` | 2 | `****C6D12`, `****C6D12` |
| `35.208371, -82.249954` | 2 | `****6E64A`, `****6E64A` |

## 2. Near-duplicate stations within 10 m — 910 clusters

| Anchor (lat, lng) | Station count | Names (truncated) |
|---|---:|---|
| 37.39953, -121.98952 | 4 | `****7AE7D`, `****67341`, `****60485`, `G001` |
| 40.36823, -111.93331 | 4 | `****20126`, `****31838`, `****C8D82`, `****6A19E` |
| 12.96676, 77.75212 | 3 | `****D0919`, `****BE89D`, `****503D1` |
| 37.39816, -121.98254 | 3 | `****20589`, `****0A97A`, `****CBE10` |
| 37.39820, -121.98294 | 3 | `****16C02`, `****6A8CE`, `****E30E6` |
| 35.20837, -82.24993 | 3 | `****2F569`, `****6E64A`, `****6E64A` |
| -27.54831, 153.08047 | 3 | `****EE73D`, `****FBE61`, `****60459` |
| 30.55073, -88.22221 | 3 | `****FE291`, `****C3CFA`, `****09A2E` |
| 35.54870, -98.57675 | 2 | `****1C1AD`, `****702C8` |
| 43.75864, -79.46478 | 2 | `****CFEBE`, `****A2391` |

_…and 900 more in the snapshot file._

## 3. Tight clusters (≥4 within 100 m) — 4 clusters

| Anchor (lat, lng) | Station count |
|---|---:|
| 37.39816, -121.98254 | 8 |
| 37.39953, -121.98952 | 5 |
| 40.36821, -111.93352 | 5 |
| 43.01543, -82.34559 | 4 |

## 4. Stations with ≤ 2 decimal places of coordinate precision — 7

| Name | Lat | Lng |
|---|---:|---:|
| `QUEE` | -42.08 | 145.561052 |
| `****73A31` | 17.492971 | 78.38 |
| `****114F9` | 51.056074 | 3.58 |
| `****21911` | 40.83 | -7.915942 |
| `****23365` | -8.21 | 113.932644 |
| `****21C08` | 50.758874 | 4.21 |
| `****69A2A` | 23.65 | 87.245493 |

---

## Methodology

Each finding is grounded in how a real CORS / RTK network is physically supposed to look:
- A surveyed GNSS reference station occupies one antenna at one coordinate. Two stations at the same point is structurally undefined.
- Honest sites at ≤ 10 m of each other are vanishingly rare — that's inside the cone of a single antenna mount.
- Clusters of ≥ 4 stations in 100 m can be honest (industrial campus, surveying lab) but justify a manual look.
- An RTK base claiming a position with ≤ 2 decimal places (≥ 1 km uncertainty) is not a real CORS station; the public network shouldn't surface them.

For an authoritative per-device GETKINETIK grade (hardware-rooted signature, chain age, tamper flags), the network or operator can POST a Proof of Origin URL to `https://getkinetik.app/api/verify-device`.

Contact: **eric@outfromnothingllc.com** · https://getkinetik.app/bureau/ · https://getkinetik.app/api/docs/
