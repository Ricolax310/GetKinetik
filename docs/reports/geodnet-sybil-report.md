# Sybil Risk Scan — Geodnet RTK Network

> Independent public read by the GETKINETIK Bureau using only Geodnet's public station endpoint. **No internal Geodnet data was used.** Geodnet RTK stations are surveyed GNSS reference units — each one is supposed to be a unique, physically installed antenna at a fixed coordinate. The heuristics below treat that as the structural rule and flag exceptions.

- **As of:** 2026-07-05
- **Public source:** `https://rtk.geodnet.com/api/v2/coverage_stations`
- **Stations observed:** 19,570
- **Stations flagged (any heuristic):** 1,812 (9.26%)

## Executive summary

1. **7 exact (lat,lng) duplicate groups** on 19,570 public stations — each row in §1 is one coordinate pair your registry team can grep today.
2. **910 ≤10 m proximity clusters** — tighter than two physical RTK antennas; start with the largest counts in §2 (names + anchors included).
3. **9.3%** of the public fleet touches at least one heuristic — useful as a sampling denominator, not a verdict.

---

## Since last snapshot

| Metric | This run | vs last run |
|---|---:|---|
| Stations with coordinates | 19,570 | +6 (+0.0%) |
| Exact (lat,lng) duplicate groups | 7 | -2 (-22.2%) |
| Clusters within 10 m | 910 | -1 (-0.1%) |
| Clusters ≥4 within 100 m | 4 | unchanged vs last run |
| Low-precision coordinates (≤2 decimals) | 5 | +3 (+150.0%) |
| Fleet share flagged (any heuristic) | 9.26% | +0.00 pp (+0.0%) |

## What to cross-check this week

1. Registry dedupe: for each §1 coordinate pair, confirm whether multiple station IDs should share one surveyed antenna location.
2. Field ops: spot-check §3 tight clusters (≥4 within 100 m) — industrial campus vs duplicate registrations.
3. Data quality: stations in §4 with ≤2 decimal places should not appear as RTK references until coordinates are re-surveyed.
4. Reproduce: `node scripts/sybil-scan-geodnet.mjs` — same public endpoint, no API key.

> Public-data read. Re-run: script in `scripts/`, source URL in report header.

---

## Headline findings

1. **7 groups of stations share an exact (lat, lng) pair.** For a CORS / RTK reference network, two stations at identical coordinates is structurally undefined — there is no second-antenna position to triangulate from.
2. **910 clusters of stations sit within 10 m of each other.** That's tighter than the physical separation of two real RTK installs.
3. **4 clusters have ≥4 stations within 100 m.** Plausible for an industrial campus or surveying yard, but the names + counts are worth reviewing.
4. **5 stations publish coordinates with ≤ 2 decimal places** (≥ 1 km uncertainty). For RTK that's structurally wrong; coordinates should be 5+ decimals.

---

## 1. Exact-coordinate duplicates — 7 groups

| Coordinates | Station count | Names |
|---|---:|---|
| `52.91503, 6.600244` | 2 | `****0WSRA`, `****0WSRT` |
| `43.069895, -89.563893` | 2 | `****1C301`, `****18F55` |
| `41.612993, -93.539962` | 2 | `****E2162`, `****E2162` |
| `29.39694, -98.432741` | 2 | `****CAE6C`, `****CAE6C` |
| `33.947145, -78.317555` | 2 | `****20C40`, `****20C40` |
| `42.372755, -71.190382` | 2 | `****C6D12`, `****C6D12` |
| `35.209175, -82.250667` | 2 | `****6E64A`, `****6E64A` |

## 2. Near-duplicate stations within 10 m — 910 clusters

| Anchor (lat, lng) | Station count | Names (truncated) |
|---|---:|---|
| 37.40033, -121.99024 | 4 | `****7AE7D`, `****67341`, `****60485`, `G001` |
| 40.36904, -111.93403 | 4 | `****20126`, `****31838`, `****C8D82`, `****6A19E` |
| 12.96756, 77.75141 | 3 | `****D0919`, `****BE89D`, `****503D1` |
| 37.39896, -121.98325 | 3 | `****20589`, `****0A97A`, `****CBE10` |
| 37.39901, -121.98366 | 3 | `****16C02`, `****6A8CE`, `****E30E6` |
| 35.20917, -82.25065 | 3 | `****2F569`, `****6E64A`, `****6E64A` |
| -27.54750, 153.07975 | 3 | `****EE73D`, `****FBE61`, `****60459` |
| 30.55154, -88.22292 | 3 | `****FE291`, `****C3CFA`, `****09A2E` |
| 24.61629, 73.69070 | 2 | `****0EEDD`, `****0A9A2` |
| 43.96739, 15.36151 | 2 | `****2F7FE`, `****00B1D` |

_…and 900 more in the snapshot file._

## 3. Tight clusters (≥4 within 100 m) — 4 clusters

| Anchor (lat, lng) | Station count |
|---|---:|
| 37.39896, -121.98325 | 8 |
| 37.40033, -121.99024 | 5 |
| 40.36901, -111.93423 | 5 |
| 43.01623, -82.34630 | 4 |

## 4. Stations with ≤ 2 decimal places of coordinate precision — 5

| Name | Lat | Lng |
|---|---:|---:|
| `****1BA4D` | 47.18 | 27.412349 |
| `****10C31` | 53.48 | -9.916003 |
| `****65FB5` | 47.52 | -122.155055 |
| `****E9D3A` | 45.424824 | -122.86 |
| `****6E818` | 40.267236 | -96.78 |

---

## Methodology

Each finding is grounded in how a real CORS / RTK network is physically supposed to look:
- A surveyed GNSS reference station occupies one antenna at one coordinate. Two stations at the same point is structurally undefined.
- Honest sites at ≤ 10 m of each other are vanishingly rare — that's inside the cone of a single antenna mount.
- Clusters of ≥ 4 stations in 100 m can be honest (industrial campus, surveying lab) but justify a manual look.
- An RTK base claiming a position with ≤ 2 decimal places (≥ 1 km uncertainty) is not a real CORS station; the public network shouldn't surface them.

For an authoritative per-device GETKINETIK grade (hardware-rooted signature, chain age, tamper flags), the network or operator can POST a Proof of Origin URL to `https://getkinetik.app/api/verify-device`.

Contact: **eric@outfromnothingllc.com** · https://getkinetik.app/bureau/ · https://getkinetik.app/api/docs/
