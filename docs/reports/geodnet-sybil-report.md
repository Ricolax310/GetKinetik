# Sybil Risk Scan — Geodnet RTK Network

> Independent public read by the GETKINETIK Bureau using only Geodnet's public station endpoint. **No internal Geodnet data was used.** Geodnet RTK stations are surveyed GNSS reference units — each one is supposed to be a unique, physically installed antenna at a fixed coordinate. The heuristics below treat that as the structural rule and flag exceptions.

- **As of:** 2026-07-26
- **Public source:** `https://rtk.geodnet.com/api/v2/coverage_stations`
- **Stations observed:** 19,597
- **Stations flagged (any heuristic):** 1,806 (9.22%)

## Executive summary

1. **8 exact (lat,lng) duplicate groups** on 19,597 public stations — each row in §1 is one coordinate pair your registry team can grep today.
2. **910 ≤10 m proximity clusters** — tighter than two physical RTK antennas; start with the largest counts in §2 (names + anchors included).
3. **9.2%** of the public fleet touches at least one heuristic — useful as a sampling denominator, not a verdict.

---

## Since last snapshot

| Metric | This run | vs last run |
|---|---:|---|
| Stations with coordinates | 19,597 | -5 (-0.0%) |
| Exact (lat,lng) duplicate groups | 8 | -1 (-11.1%) |
| Clusters within 10 m | 910 | -1 (-0.1%) |
| Clusters ≥4 within 100 m | 4 | unchanged vs last run |
| Low-precision coordinates (≤2 decimals) | 2 | -4 (-66.7%) |
| Fleet share flagged (any heuristic) | 9.22% | -0.03 pp (-0.3%) |

## What to cross-check this week

1. Registry dedupe: for each §1 coordinate pair, confirm whether multiple station IDs should share one surveyed antenna location.
2. Field ops: spot-check §3 tight clusters (≥4 within 100 m) — industrial campus vs duplicate registrations.
3. Data quality: stations in §4 with ≤2 decimal places should not appear as RTK references until coordinates are re-surveyed.
4. Reproduce: `node scripts/sybil-scan-geodnet.mjs` — same public endpoint, no API key.

> Public-data read. Re-run: script in `scripts/`, source URL in report header.

---

## Headline findings

1. **8 groups of stations share an exact (lat, lng) pair.** For a CORS / RTK reference network, two stations at identical coordinates is structurally undefined — there is no second-antenna position to triangulate from.
2. **910 clusters of stations sit within 10 m of each other.** That's tighter than the physical separation of two real RTK installs.
3. **4 clusters have ≥4 stations within 100 m.** Plausible for an industrial campus or surveying yard, but the names + counts are worth reviewing.
4. **2 stations publish coordinates with ≤ 2 decimal places** (≥ 1 km uncertainty). For RTK that's structurally wrong; coordinates should be 5+ decimals.

---

## 1. Exact-coordinate duplicates — 8 groups

| Coordinates | Station count | Names |
|---|---:|---|
| `11.321335, 124.951259` | 2 | `****00000`, `****00000` |
| `45.887952, -90.826612` | 2 | `****379D9`, `****09A46` |
| `52.914863, 6.608734` | 2 | `****0WSRA`, `****0WSRT` |
| `43.069728, -89.555403` | 2 | `****1C301`, `****18F55` |
| `41.612826, -93.531473` | 2 | `****E2162`, `****E2162` |
| `29.396773, -98.424252` | 2 | `****CAE6C`, `****CAE6C` |
| `33.946978, -78.309065` | 2 | `****20C40`, `****20C40` |
| `35.209008, -82.242178` | 2 | `****6E64A`, `****6E64A` |

## 2. Near-duplicate stations within 10 m — 910 clusters

| Anchor (lat, lng) | Station count | Names (truncated) |
|---|---:|---|
| 40.36887, -111.92554 | 4 | `****20126`, `****31838`, `****C8D82`, `****6A19E` |
| 40.77771, 29.69334 | 3 | `****2186D`, `****81599`, `****3B246` |
| 45.73139, 8.78035 | 3 | `****DF080`, `****0B68D`, `****C1C26` |
| 37.39883, -121.97480 | 3 | `****09996`, `****CBE34`, `****20E08` |
| 37.40017, -121.98175 | 3 | `****7AE7D`, `****60485`, `G001` |
| 35.20900, -82.24216 | 3 | `****2F569`, `****6E64A`, `****6E64A` |
| -27.54767, 153.08824 | 3 | `****EE73D`, `****FBE61`, `****60459` |
| 40.21042, 0.02515 | 2 | `****65A05`, `****C4CF0` |
| 11.32133, 124.95126 | 2 | `****00000`, `****00000` |
| 11.31503, 79.51378 | 2 | `****EC895`, `****09A2C` |

_…and 900 more in the snapshot file._

## 3. Tight clusters (≥4 within 100 m) — 4 clusters

| Anchor (lat, lng) | Station count |
|---|---:|
| 37.39883, -121.97480 | 6 |
| 37.40017, -121.98175 | 5 |
| 40.36885, -111.92574 | 5 |
| 43.01607, -82.33781 | 4 |

## 4. Stations with ≤ 2 decimal places of coordinate precision — 2

| Name | Lat | Lng |
|---|---:|---:|
| `****E28D5` | 46.548726 | 15.54 |
| `****2A7CD` | 22.409681 | 87.34 |

---

## Methodology

Each finding is grounded in how a real CORS / RTK network is physically supposed to look:
- A surveyed GNSS reference station occupies one antenna at one coordinate. Two stations at the same point is structurally undefined.
- Honest sites at ≤ 10 m of each other are vanishingly rare — that's inside the cone of a single antenna mount.
- Clusters of ≥ 4 stations in 100 m can be honest (industrial campus, surveying lab) but justify a manual look.
- An RTK base claiming a position with ≤ 2 decimal places (≥ 1 km uncertainty) is not a real CORS station; the public network shouldn't surface them.

For an authoritative per-device GETKINETIK grade (hardware-rooted signature, chain age, tamper flags), the network or operator can POST a Proof of Origin URL to `https://getkinetik.app/api/verify-device`.

Contact: **eric@outfromnothingllc.com** · https://getkinetik.app/bureau/ · https://getkinetik.app/api/docs/
