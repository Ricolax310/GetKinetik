# Sybil Risk Scan — Geodnet RTK Network

> Independent public read by the GETKINETIK Bureau using only Geodnet's public station endpoint. **No internal Geodnet data was used.** Geodnet RTK stations are surveyed GNSS reference units — each one is supposed to be a unique, physically installed antenna at a fixed coordinate. The heuristics below treat that as the structural rule and flag exceptions.

- **As of:** 2026-07-22
- **Public source:** `https://rtk.geodnet.com/api/v2/coverage_stations`
- **Stations observed:** 19,584
- **Stations flagged (any heuristic):** 1,797 (9.18%)

## Executive summary

1. **8 exact (lat,lng) duplicate groups** on 19,584 public stations — each row in §1 is one coordinate pair your registry team can grep today.
2. **903 ≤10 m proximity clusters** — tighter than two physical RTK antennas; start with the largest counts in §2 (names + anchors included).
3. **9.2%** of the public fleet touches at least one heuristic — useful as a sampling denominator, not a verdict.

---

## Since last snapshot

| Metric | This run | vs last run |
|---|---:|---|
| Stations with coordinates | 19,584 | +1 (+0.0%) |
| Exact (lat,lng) duplicate groups | 8 | -1 (-11.1%) |
| Clusters within 10 m | 903 | -1 (-0.1%) |
| Clusters ≥4 within 100 m | 4 | unchanged vs last run |
| Low-precision coordinates (≤2 decimals) | 1 | -3 (-75.0%) |
| Fleet share flagged (any heuristic) | 9.18% | -0.03 pp (-0.3%) |

## What to cross-check this week

1. Registry dedupe: for each §1 coordinate pair, confirm whether multiple station IDs should share one surveyed antenna location.
2. Field ops: spot-check §3 tight clusters (≥4 within 100 m) — industrial campus vs duplicate registrations.
3. Data quality: stations in §4 with ≤2 decimal places should not appear as RTK references until coordinates are re-surveyed.
4. Reproduce: `node scripts/sybil-scan-geodnet.mjs` — same public endpoint, no API key.

> Public-data read. Re-run: script in `scripts/`, source URL in report header.

---

## Headline findings

1. **8 groups of stations share an exact (lat, lng) pair.** For a CORS / RTK reference network, two stations at identical coordinates is structurally undefined — there is no second-antenna position to triangulate from.
2. **903 clusters of stations sit within 10 m of each other.** That's tighter than the physical separation of two real RTK installs.
3. **4 clusters have ≥4 stations within 100 m.** Plausible for an industrial campus or surveying yard, but the names + counts are worth reviewing.
4. **1 stations publish coordinates with ≤ 2 decimal places** (≥ 1 km uncertainty). For RTK that's structurally wrong; coordinates should be 5+ decimals.

---

## 1. Exact-coordinate duplicates — 8 groups

| Coordinates | Station count | Names |
|---|---:|---|
| `45.86734, -108.779424` | 2 | `****3A7F8`, `****10DA5` |
| `11.321206, 124.942743` | 2 | `****00000`, `****00000` |
| `35.208879, -82.250693` | 2 | `****6E64A`, `****6E64A` |
| `52.914733, 6.600218` | 2 | `****0WSRA`, `****0WSRT` |
| `43.069599, -89.563918` | 2 | `****1C301`, `****18F55` |
| `41.612697, -93.539988` | 2 | `****E2162`, `****E2162` |
| `29.396644, -98.432767` | 2 | `****CAE6C`, `****CAE6C` |
| `33.946849, -78.31758` | 2 | `****20C40`, `****20C40` |

## 2. Near-duplicate stations within 10 m — 903 clusters

| Anchor (lat, lng) | Station count | Names (truncated) |
|---|---:|---|
| 37.39866, -121.98332 | 5 | `****0997A`, `****0ECBE`, `****F9CCC`, `****CBDF2`, `****09996` |
| 40.36874, -111.93405 | 4 | `****20126`, `****31838`, `****C8D82`, `****6A19E` |
| 37.39874, -121.98368 | 3 | `****C8E06`, `****C8DA8`, `****21B94` |
| 40.77758, 29.68482 | 3 | `****2186D`, `****81599`, `****3B246` |
| 45.73126, 8.77183 | 3 | `****DF080`, `****0B68D`, `****C1C26` |
| 35.20887, -82.25067 | 3 | `****2F569`, `****6E64A`, `****6E64A` |
| 37.40004, -121.99026 | 3 | `****7AE7D`, `****60485`, `G001` |
| -27.54780, 153.07973 | 3 | `****EE73D`, `****FBE61`, `****60459` |
| 48.71519, 9.32363 | 2 | `****0FC2A`, `****BFB41` |
| 45.86734, -108.77942 | 2 | `****3A7F8`, `****10DA5` |

_…and 893 more in the snapshot file._

## 3. Tight clusters (≥4 within 100 m) — 4 clusters

| Anchor (lat, lng) | Station count |
|---|---:|
| 37.39866, -121.98332 | 11 |
| 40.36872, -111.93425 | 5 |
| 37.40004, -121.99026 | 4 |
| 43.01594, -82.34633 | 4 |

## 4. Stations with ≤ 2 decimal places of coordinate precision — 1

| Name | Lat | Lng |
|---|---:|---:|
| `****2D6BD` | 38.544915 | -28.37 |

---

## Methodology

Each finding is grounded in how a real CORS / RTK network is physically supposed to look:
- A surveyed GNSS reference station occupies one antenna at one coordinate. Two stations at the same point is structurally undefined.
- Honest sites at ≤ 10 m of each other are vanishingly rare — that's inside the cone of a single antenna mount.
- Clusters of ≥ 4 stations in 100 m can be honest (industrial campus, surveying lab) but justify a manual look.
- An RTK base claiming a position with ≤ 2 decimal places (≥ 1 km uncertainty) is not a real CORS station; the public network shouldn't surface them.

For an authoritative per-device GETKINETIK grade (hardware-rooted signature, chain age, tamper flags), the network or operator can POST a Proof of Origin URL to `https://getkinetik.app/api/verify-device`.

Contact: **eric@outfromnothingllc.com** · https://getkinetik.app/bureau/ · https://getkinetik.app/api/docs/
