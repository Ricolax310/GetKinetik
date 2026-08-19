# Sybil Risk Scan — Geodnet RTK Network

> Independent public read by the GETKINETIK Bureau using only Geodnet's public station endpoint. **No internal Geodnet data was used.** Geodnet RTK stations are surveyed GNSS reference units — each one is supposed to be a unique, physically installed antenna at a fixed coordinate. The heuristics below treat that as the structural rule and flag exceptions.

- **As of:** 2026-08-19
- **Public source:** `https://rtk.geodnet.com/api/v2/coverage_stations`
- **Stations observed:** 19,484
- **Stations flagged (any heuristic):** 1,795 (9.21%)

## Executive summary

1. **7 exact (lat,lng) duplicate groups** on 19,484 public stations — each row in §1 is one coordinate pair your registry team can grep today.
2. **902 ≤10 m proximity clusters** — tighter than two physical RTK antennas; start with the largest counts in §2 (names + anchors included).
3. **9.2%** of the public fleet touches at least one heuristic — useful as a sampling denominator, not a verdict.

---

## Since last snapshot

| Metric | This run | vs last run |
|---|---:|---|
| Stations with coordinates | 19,484 | -2 (-0.0%) |
| Exact (lat,lng) duplicate groups | 7 | +2 (+40.0%) |
| Clusters within 10 m | 902 | unchanged vs last run |
| Clusters ≥4 within 100 m | 5 | unchanged vs last run |
| Low-precision coordinates (≤2 decimals) | 3 | -2 (-40.0%) |
| Fleet share flagged (any heuristic) | 9.21% | -0.01 pp (-0.1%) |

## What to cross-check this week

1. Registry dedupe: for each §1 coordinate pair, confirm whether multiple station IDs should share one surveyed antenna location.
2. Field ops: spot-check §3 tight clusters (≥4 within 100 m) — industrial campus vs duplicate registrations.
3. Data quality: stations in §4 with ≤2 decimal places should not appear as RTK references until coordinates are re-surveyed.
4. Reproduce: `node scripts/sybil-scan-geodnet.mjs` — same public endpoint, no API key.

> Public-data read. Re-run: script in `scripts/`, source URL in report header.

---

## Headline findings

1. **7 groups of stations share an exact (lat, lng) pair.** For a CORS / RTK reference network, two stations at identical coordinates is structurally undefined — there is no second-antenna position to triangulate from.
2. **902 clusters of stations sit within 10 m of each other.** That's tighter than the physical separation of two real RTK installs.
3. **5 clusters have ≥4 stations within 100 m.** Plausible for an industrial campus or surveying yard, but the names + counts are worth reviewing.
4. **3 stations publish coordinates with ≤ 2 decimal places** (≥ 1 km uncertainty). For RTK that's structurally wrong; coordinates should be 5+ decimals.

---

## 1. Exact-coordinate duplicates — 7 groups

| Coordinates | Station count | Names |
|---|---:|---|
| `11.321489, 124.944528` | 2 | `****00000`, `****00000` |
| `45.888106, -90.833342` | 2 | `****379D9`, `****09A46` |
| `52.915017, 6.602003` | 2 | `****0WSRA`, `****0WSRT` |
| `43.069882, -89.562133` | 2 | `****18F55`, `****1C301` |
| `41.61298, -93.538203` | 2 | `****E2162`, `****E2162` |
| `29.396927, -98.430982` | 2 | `****CAE6C`, `****CAE6C` |
| `35.209162, -82.248908` | 2 | `****6E64A`, `****6E64A` |

## 2. Near-duplicate stations within 10 m — 902 clusters

| Anchor (lat, lng) | Station count | Names (truncated) |
|---|---:|---|
| 40.36902, -111.93227 | 4 | `****20126`, `****31838`, `****C8D82`, `****6A19E` |
| 38.00424, -122.31161 | 3 | `****C4105`, `****97A05`, `****C0A6E` |
| 37.40032, -121.98848 | 3 | `****7AE7D`, `****60485`, `G001` |
| 35.20916, -82.24889 | 3 | `****2F569`, `****6E64A`, `****6E64A` |
| -27.54752, 153.08151 | 3 | `****EE73D`, `****FBE61`, `****60459` |
| 28.00409, -80.71013 | 2 | `****A56A4`, `****6A406` |
| 32.02809, -102.07535 | 2 | `****5699E`, `****699EA` |
| -1.25136, 36.69311 | 2 | `****77D7D`, `****29F9C` |
| 36.43579, -94.12161 | 2 | `****699F8`, `****F6C92` |
| 13.47221, 144.77058 | 2 | `****48E31`, `****E314C` |

_…and 892 more in the snapshot file._

## 3. Tight clusters (≥4 within 100 m) — 5 clusters

| Anchor (lat, lng) | Station count |
|---|---:|
| 37.39912, -121.98149 | 5 |
| 37.40032, -121.98848 | 5 |
| 40.36900, -111.93247 | 5 |
| 37.39811, -121.98135 | 4 |
| 43.01622, -82.34454 | 4 |

## 4. Stations with ≤ 2 decimal places of coordinate precision — 3

| Name | Lat | Lng |
|---|---:|---:|
| `****CAF09` | 35.21 | -79.467642 |
| `****20EF1` | 36.06 | -93.805255 |
| `****BEFFD` | 55.261769 | 23.68 |

---

## Methodology

Each finding is grounded in how a real CORS / RTK network is physically supposed to look:
- A surveyed GNSS reference station occupies one antenna at one coordinate. Two stations at the same point is structurally undefined.
- Honest sites at ≤ 10 m of each other are vanishingly rare — that's inside the cone of a single antenna mount.
- Clusters of ≥ 4 stations in 100 m can be honest (industrial campus, surveying lab) but justify a manual look.
- An RTK base claiming a position with ≤ 2 decimal places (≥ 1 km uncertainty) is not a real CORS station; the public network shouldn't surface them.

For an authoritative per-device GETKINETIK grade (hardware-rooted signature, chain age, tamper flags), the network or operator can POST a Proof of Origin URL to `https://getkinetik.app/api/verify-device`.

Contact: **eric@outfromnothingllc.com** · https://getkinetik.app/bureau/ · https://getkinetik.app/api/docs/
