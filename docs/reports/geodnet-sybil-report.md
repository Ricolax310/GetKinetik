# Sybil Risk Scan — Geodnet RTK Network

> Independent public read by the GETKINETIK Bureau using only Geodnet's public station endpoint. **No internal Geodnet data was used.** Geodnet RTK stations are surveyed GNSS reference units — each one is supposed to be a unique, physically installed antenna at a fixed coordinate. The heuristics below treat that as the structural rule and flag exceptions.

- **As of:** 2026-08-02
- **Public source:** `https://rtk.geodnet.com/api/v2/coverage_stations`
- **Stations observed:** 19,584
- **Stations flagged (any heuristic):** 1,780 (9.09%)

## Executive summary

1. **6 exact (lat,lng) duplicate groups** on 19,584 public stations — each row in §1 is one coordinate pair your registry team can grep today.
2. **895 ≤10 m proximity clusters** — tighter than two physical RTK antennas; start with the largest counts in §2 (names + anchors included).
3. **9.1%** of the public fleet touches at least one heuristic — useful as a sampling denominator, not a verdict.

---

## Since last snapshot

| Metric | This run | vs last run |
|---|---:|---|
| Stations with coordinates | 19,584 | -3 (-0.0%) |
| Exact (lat,lng) duplicate groups | 6 | -1 (-14.3%) |
| Clusters within 10 m | 895 | -1 (-0.1%) |
| Clusters ≥4 within 100 m | 3 | unchanged vs last run |
| Low-precision coordinates (≤2 decimals) | 8 | +2 (+33.3%) |
| Fleet share flagged (any heuristic) | 9.09% | +0.01 pp (+0.1%) |

## What to cross-check this week

1. Registry dedupe: for each §1 coordinate pair, confirm whether multiple station IDs should share one surveyed antenna location.
2. Field ops: spot-check §3 tight clusters (≥4 within 100 m) — industrial campus vs duplicate registrations.
3. Data quality: stations in §4 with ≤2 decimal places should not appear as RTK references until coordinates are re-surveyed.
4. Reproduce: `node scripts/sybil-scan-geodnet.mjs` — same public endpoint, no API key.

> Public-data read. Re-run: script in `scripts/`, source URL in report header.

---

## Headline findings

1. **6 groups of stations share an exact (lat, lng) pair.** For a CORS / RTK reference network, two stations at identical coordinates is structurally undefined — there is no second-antenna position to triangulate from.
2. **895 clusters of stations sit within 10 m of each other.** That's tighter than the physical separation of two real RTK installs.
3. **3 clusters have ≥4 stations within 100 m.** Plausible for an industrial campus or surveying yard, but the names + counts are worth reviewing.
4. **8 stations publish coordinates with ≤ 2 decimal places** (≥ 1 km uncertainty). For RTK that's structurally wrong; coordinates should be 5+ decimals.

---

## 1. Exact-coordinate duplicates — 6 groups

| Coordinates | Station count | Names |
|---|---:|---|
| `33.946308, -78.316195` | 2 | `****20C40`, `****20C40` |
| `49.638033, 9.350963` | 2 | `****5302D`, `****6A80A` |
| `52.914193, 6.601604` | 2 | `****0WSRA`, `****0WSRT` |
| `41.612156, -93.538602` | 2 | `****E2162`, `****E2162` |
| `29.396104, -98.431382` | 2 | `****CAE6C`, `****CAE6C` |
| `35.208339, -82.249308` | 2 | `****6E64A`, `****6E64A` |

## 2. Near-duplicate stations within 10 m — 895 clusters

| Anchor (lat, lng) | Station count | Names (truncated) |
|---|---:|---|
| 40.36820, -111.93267 | 4 | `****20126`, `****31838`, `****C8D82`, `****6A19E` |
| 40.77704, 29.68621 | 3 | `****2186D`, `****81599`, `****3B246` |
| 37.39950, -121.98888 | 3 | `****7AE7D`, `****60485`, `G001` |
| 35.20833, -82.24929 | 3 | `****2F569`, `****6E64A`, `****6E64A` |
| -27.54834, 153.08111 | 3 | `****EE73D`, `****FBE61`, `****60459` |
| 54.50363, 9.60110 | 2 | `****A051D`, `****1EDC2` |
| 38.11687, -7.44500 | 2 | `****E6559`, `****099AA` |
| 53.64240, 11.40587 | 2 | `****4F21B`, `****21BD8` |
| 11.30535, 79.73391 | 2 | `****22C24`, `****7A005` |
| 31.45614, -100.45721 | 2 | `****22B9A`, `****116F9` |

_…and 885 more in the snapshot file._

## 3. Tight clusters (≥4 within 100 m) — 3 clusters

| Anchor (lat, lng) | Station count |
|---|---:|
| 37.39950, -121.98888 | 5 |
| 40.36818, -111.93287 | 5 |
| 43.01540, -82.34494 | 4 |

## 4. Stations with ≤ 2 decimal places of coordinate precision — 8

| Name | Lat | Lng |
|---|---:|---:|
| `KIRI` | 1.354165 | 172.92 |
| `****21791` | 38.142896 | -0.9 |
| `****F64E5` | -6.947666 | 109.79 |
| `****5B46D` | 36.541755 | 36.31 |
| `****A5839` | 54.453703 | 22.71 |
| `****C3CBC` | 38.79 | -77.288095 |
| `****25126` | 49.07 | 17.454012 |
| `****B7E34` | -6.09863 | -36.49 |

---

## Methodology

Each finding is grounded in how a real CORS / RTK network is physically supposed to look:
- A surveyed GNSS reference station occupies one antenna at one coordinate. Two stations at the same point is structurally undefined.
- Honest sites at ≤ 10 m of each other are vanishingly rare — that's inside the cone of a single antenna mount.
- Clusters of ≥ 4 stations in 100 m can be honest (industrial campus, surveying lab) but justify a manual look.
- An RTK base claiming a position with ≤ 2 decimal places (≥ 1 km uncertainty) is not a real CORS station; the public network shouldn't surface them.

For an authoritative per-device GETKINETIK grade (hardware-rooted signature, chain age, tamper flags), the network or operator can POST a Proof of Origin URL to `https://getkinetik.app/api/verify-device`.

Contact: **eric@outfromnothingllc.com** · https://getkinetik.app/bureau/ · https://getkinetik.app/api/docs/
