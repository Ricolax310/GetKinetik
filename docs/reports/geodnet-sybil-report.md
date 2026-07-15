# Sybil Risk Scan — Geodnet RTK Network

> Independent public read by the GETKINETIK Bureau using only Geodnet's public station endpoint. **No internal Geodnet data was used.** Geodnet RTK stations are surveyed GNSS reference units — each one is supposed to be a unique, physically installed antenna at a fixed coordinate. The heuristics below treat that as the structural rule and flag exceptions.

- **As of:** 2026-07-15
- **Public source:** `https://rtk.geodnet.com/api/v2/coverage_stations`
- **Stations observed:** 19,574
- **Stations flagged (any heuristic):** 1,795 (9.17%)

## Executive summary

1. **7 exact (lat,lng) duplicate groups** on 19,574 public stations — each row in §1 is one coordinate pair your registry team can grep today.
2. **899 ≤10 m proximity clusters** — tighter than two physical RTK antennas; start with the largest counts in §2 (names + anchors included).
3. **9.2%** of the public fleet touches at least one heuristic — useful as a sampling denominator, not a verdict.

---

## Since last snapshot

| Metric | This run | vs last run |
|---|---:|---|
| Stations with coordinates | 19,574 | +5 (+0.0%) |
| Exact (lat,lng) duplicate groups | 7 | -4 (-36.4%) |
| Clusters within 10 m | 899 | -1 (-0.1%) |
| Clusters ≥4 within 100 m | 4 | unchanged vs last run |
| Low-precision coordinates (≤2 decimals) | 6 | unchanged vs last run |
| Fleet share flagged (any heuristic) | 9.17% | -0.01 pp (-0.1%) |

## What to cross-check this week

1. Registry dedupe: for each §1 coordinate pair, confirm whether multiple station IDs should share one surveyed antenna location.
2. Field ops: spot-check §3 tight clusters (≥4 within 100 m) — industrial campus vs duplicate registrations.
3. Data quality: stations in §4 with ≤2 decimal places should not appear as RTK references until coordinates are re-surveyed.
4. Reproduce: `node scripts/sybil-scan-geodnet.mjs` — same public endpoint, no API key.

> Public-data read. Re-run: script in `scripts/`, source URL in report header.

---

## Headline findings

1. **7 groups of stations share an exact (lat, lng) pair.** For a CORS / RTK reference network, two stations at identical coordinates is structurally undefined — there is no second-antenna position to triangulate from.
2. **899 clusters of stations sit within 10 m of each other.** That's tighter than the physical separation of two real RTK installs.
3. **4 clusters have ≥4 stations within 100 m.** Plausible for an industrial campus or surveying yard, but the names + counts are worth reviewing.
4. **6 stations publish coordinates with ≤ 2 decimal places** (≥ 1 km uncertainty). For RTK that's structurally wrong; coordinates should be 5+ decimals.

---

## 1. Exact-coordinate duplicates — 7 groups

| Coordinates | Station count | Names |
|---|---:|---|
| `42.372616, -71.189892` | 2 | `****C6D12`, `****C6D12` |
| `41.612854, -93.539472` | 2 | `****E2162`, `****E2162` |
| `11.321364, 124.943259` | 2 | `****00000`, `****00000` |
| `52.914891, 6.600734` | 2 | `****0WSRA`, `****0WSRT` |
| `29.396802, -98.432251` | 2 | `****CAE6C`, `****CAE6C` |
| `33.947006, -78.317064` | 2 | `****20C40`, `****20C40` |
| `35.209037, -82.250177` | 2 | `****6E64A`, `****6E64A` |

## 2. Near-duplicate stations within 10 m — 899 clusters

| Anchor (lat, lng) | Station count | Names (truncated) |
|---|---:|---|
| 37.39892, -121.98316 | 6 | `****21B62`, `****CAE50`, `****CDEB0`, `****21B78`, `****C2CAE`, `****17C8A` |
| 37.39874, -121.98279 | 5 | `****22D48`, `****3D678`, `****D1EF6`, `****0BA90`, `****0997A` |
| 37.39886, -121.98279 | 4 | `****CBE10`, `****3D678`, `****D1EF6`, `****0997A` |
| 37.40019, -121.98975 | 4 | `****7AE7D`, `****67341`, `****60485`, `G001` |
| 40.36890, -111.93354 | 4 | `****20126`, `****31838`, `****C8D82`, `****6A19E` |
| 28.64432, 77.04453 | 3 | `****0ACC9`, `****326DE`, `****D3685` |
| 39.85377, -105.22194 | 3 | `****E9CD8`, `****ABCED`, `****6E588` |
| 30.05438, -99.15466 | 3 | `****21B94`, `****79F65`, `****6A182` |
| 30.55141, -88.22243 | 3 | `****C3CFA`, `****FE291`, `****09A2E` |
| 35.20903, -82.25016 | 3 | `****2F569`, `****6E64A`, `****6E64A` |

_…and 889 more in the snapshot file._

## 3. Tight clusters (≥4 within 100 m) — 4 clusters

| Anchor (lat, lng) | Station count |
|---|---:|
| 37.39930, -121.98276 | 15 |
| 37.40019, -121.98975 | 5 |
| 40.36888, -111.93374 | 5 |
| 43.01609, -82.34581 | 4 |

## 4. Stations with ≤ 2 decimal places of coordinate precision — 6

| Name | Lat | Lng |
|---|---:|---:|
| `****0C369` | 45.767321 | 4.76 |
| `****6D7CD` | 46.329355 | -113.31 |
| `****19975` | 42.32 | -83.194151 |
| `****66649` | 40.850014 | 38.65 |
| `****D5B21` | 56.129094 | 24.47 |
| `****0AZBZ` | 31.388281 | -109.93 |

---

## Methodology

Each finding is grounded in how a real CORS / RTK network is physically supposed to look:
- A surveyed GNSS reference station occupies one antenna at one coordinate. Two stations at the same point is structurally undefined.
- Honest sites at ≤ 10 m of each other are vanishingly rare — that's inside the cone of a single antenna mount.
- Clusters of ≥ 4 stations in 100 m can be honest (industrial campus, surveying lab) but justify a manual look.
- An RTK base claiming a position with ≤ 2 decimal places (≥ 1 km uncertainty) is not a real CORS station; the public network shouldn't surface them.

For an authoritative per-device GETKINETIK grade (hardware-rooted signature, chain age, tamper flags), the network or operator can POST a Proof of Origin URL to `https://getkinetik.app/api/verify-device`.

Contact: **eric@outfromnothingllc.com** · https://getkinetik.app/bureau/ · https://getkinetik.app/api/docs/
