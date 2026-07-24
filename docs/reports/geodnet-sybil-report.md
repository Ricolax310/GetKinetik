# Sybil Risk Scan — Geodnet RTK Network

> Independent public read by the GETKINETIK Bureau using only Geodnet's public station endpoint. **No internal Geodnet data was used.** Geodnet RTK stations are surveyed GNSS reference units — each one is supposed to be a unique, physically installed antenna at a fixed coordinate. The heuristics below treat that as the structural rule and flag exceptions.

- **As of:** 2026-07-24
- **Public source:** `https://rtk.geodnet.com/api/v2/coverage_stations`
- **Stations observed:** 19,589
- **Stations flagged (any heuristic):** 1,811 (9.24%)

## Executive summary

1. **9 exact (lat,lng) duplicate groups** on 19,589 public stations — each row in §1 is one coordinate pair your registry team can grep today.
2. **909 ≤10 m proximity clusters** — tighter than two physical RTK antennas; start with the largest counts in §2 (names + anchors included).
3. **9.2%** of the public fleet touches at least one heuristic — useful as a sampling denominator, not a verdict.

---

## Since last snapshot

| Metric | This run | vs last run |
|---|---:|---|
| Stations with coordinates | 19,589 | +1 (+0.0%) |
| Exact (lat,lng) duplicate groups | 9 | +1 (+12.5%) |
| Clusters within 10 m | 909 | +1 (+0.1%) |
| Clusters ≥4 within 100 m | 4 | unchanged vs last run |
| Low-precision coordinates (≤2 decimals) | 3 | -4 (-57.1%) |
| Fleet share flagged (any heuristic) | 9.24% | -0.01 pp (-0.1%) |

## What to cross-check this week

1. Registry dedupe: for each §1 coordinate pair, confirm whether multiple station IDs should share one surveyed antenna location.
2. Field ops: spot-check §3 tight clusters (≥4 within 100 m) — industrial campus vs duplicate registrations.
3. Data quality: stations in §4 with ≤2 decimal places should not appear as RTK references until coordinates are re-surveyed.
4. Reproduce: `node scripts/sybil-scan-geodnet.mjs` — same public endpoint, no API key.

> Public-data read. Re-run: script in `scripts/`, source URL in report header.

---

## Headline findings

1. **9 groups of stations share an exact (lat, lng) pair.** For a CORS / RTK reference network, two stations at identical coordinates is structurally undefined — there is no second-antenna position to triangulate from.
2. **909 clusters of stations sit within 10 m of each other.** That's tighter than the physical separation of two real RTK installs.
3. **4 clusters have ≥4 stations within 100 m.** Plausible for an industrial campus or surveying yard, but the names + counts are worth reviewing.
4. **3 stations publish coordinates with ≤ 2 decimal places** (≥ 1 km uncertainty). For RTK that's structurally wrong; coordinates should be 5+ decimals.

---

## 1. Exact-coordinate duplicates — 9 groups

| Coordinates | Station count | Names |
|---|---:|---|
| `11.320586, 124.948132` | 2 | `****00000`, `****00000` |
| `49.637954, 9.354966` | 2 | `****5302D`, `****6A80A` |
| `45.887203, -90.829739` | 2 | `****379D9`, `****09A46` |
| `52.914114, 6.605607` | 2 | `****0WSRA`, `****0WSRT` |
| `43.068979, -89.55853` | 2 | `****1C301`, `****18F55` |
| `41.612077, -93.5346` | 2 | `****E2162`, `****E2162` |
| `29.396024, -98.427379` | 2 | `****CAE6C`, `****CAE6C` |
| `33.946229, -78.312192` | 2 | `****20C40`, `****20C40` |
| `35.208259, -82.245305` | 2 | `****6E64A`, `****6E64A` |

## 2. Near-duplicate stations within 10 m — 909 clusters

| Anchor (lat, lng) | Station count | Names (truncated) |
|---|---:|---|
| 37.39811, -121.97791 | 6 | `****F9CCC`, `****CBDF2`, `****09996`, `****18AFA`, `****CBE34`, `****20E08` |
| 40.36812, -111.92866 | 4 | `****20126`, `****31838`, `****C8D82`, `****6A19E` |
| 40.77696, 29.69021 | 3 | `****2186D`, `****81599`, `****3B246` |
| 45.73064, 8.77722 | 3 | `****DF080`, `****0B68D`, `****C1C26` |
| 37.39942, -121.98487 | 3 | `****7AE7D`, `****60485`, `G001` |
| 35.20826, -82.24528 | 3 | `****2F569`, `****6E64A`, `****6E64A` |
| -27.54842, 153.08512 | 3 | `****EE73D`, `****FBE61`, `****60459` |
| 58.38603, -3.14744 | 2 | `****C9DE2`, `****F3585` |
| 42.21976, -8.71054 | 2 | `****14C25`, `****6E5D6` |
| 40.02427, -75.08888 | 2 | `****33ABD`, `****33ABD` |

_…and 899 more in the snapshot file._

## 3. Tight clusters (≥4 within 100 m) — 4 clusters

| Anchor (lat, lng) | Station count |
|---|---:|
| 37.39811, -121.97791 | 10 |
| 37.39942, -121.98487 | 5 |
| 40.36810, -111.92887 | 5 |
| 43.01532, -82.34094 | 4 |

## 4. Stations with ≤ 2 decimal places of coordinate precision — 3

| Name | Lat | Lng |
|---|---:|---:|
| `****A036D` | 41.332754 | 14.32 |
| `****DA3C1` | 43.82 | 27.139088 |
| `****6A108` | 43.94 | -77.186363 |

---

## Methodology

Each finding is grounded in how a real CORS / RTK network is physically supposed to look:
- A surveyed GNSS reference station occupies one antenna at one coordinate. Two stations at the same point is structurally undefined.
- Honest sites at ≤ 10 m of each other are vanishingly rare — that's inside the cone of a single antenna mount.
- Clusters of ≥ 4 stations in 100 m can be honest (industrial campus, surveying lab) but justify a manual look.
- An RTK base claiming a position with ≤ 2 decimal places (≥ 1 km uncertainty) is not a real CORS station; the public network shouldn't surface them.

For an authoritative per-device GETKINETIK grade (hardware-rooted signature, chain age, tamper flags), the network or operator can POST a Proof of Origin URL to `https://getkinetik.app/api/verify-device`.

Contact: **eric@outfromnothingllc.com** · https://getkinetik.app/bureau/ · https://getkinetik.app/api/docs/
