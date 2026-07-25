# Sybil Risk Scan — Geodnet RTK Network

> Independent public read by the GETKINETIK Bureau using only Geodnet's public station endpoint. **No internal Geodnet data was used.** Geodnet RTK stations are surveyed GNSS reference units — each one is supposed to be a unique, physically installed antenna at a fixed coordinate. The heuristics below treat that as the structural rule and flag exceptions.

- **As of:** 2026-07-25
- **Public source:** `https://rtk.geodnet.com/api/v2/coverage_stations`
- **Stations observed:** 19,603
- **Stations flagged (any heuristic):** 1,815 (9.26%)

## Executive summary

1. **7 exact (lat,lng) duplicate groups** on 19,603 public stations — each row in §1 is one coordinate pair your registry team can grep today.
2. **911 ≤10 m proximity clusters** — tighter than two physical RTK antennas; start with the largest counts in §2 (names + anchors included).
3. **9.3%** of the public fleet touches at least one heuristic — useful as a sampling denominator, not a verdict.

---

## Since last snapshot

| Metric | This run | vs last run |
|---|---:|---|
| Stations with coordinates | 19,603 | +5 (+0.0%) |
| Exact (lat,lng) duplicate groups | 7 | -1 (-12.5%) |
| Clusters within 10 m | 911 | +1 (+0.1%) |
| Clusters ≥4 within 100 m | 4 | unchanged vs last run |
| Low-precision coordinates (≤2 decimals) | 9 | +4 (+80.0%) |
| Fleet share flagged (any heuristic) | 9.26% | +0.03 pp (+0.3%) |

## What to cross-check this week

1. Registry dedupe: for each §1 coordinate pair, confirm whether multiple station IDs should share one surveyed antenna location.
2. Field ops: spot-check §3 tight clusters (≥4 within 100 m) — industrial campus vs duplicate registrations.
3. Data quality: stations in §4 with ≤2 decimal places should not appear as RTK references until coordinates are re-surveyed.
4. Reproduce: `node scripts/sybil-scan-geodnet.mjs` — same public endpoint, no API key.

> Public-data read. Re-run: script in `scripts/`, source URL in report header.

---

## Headline findings

1. **7 groups of stations share an exact (lat, lng) pair.** For a CORS / RTK reference network, two stations at identical coordinates is structurally undefined — there is no second-antenna position to triangulate from.
2. **911 clusters of stations sit within 10 m of each other.** That's tighter than the physical separation of two real RTK installs.
3. **4 clusters have ≥4 stations within 100 m.** Plausible for an industrial campus or surveying yard, but the names + counts are worth reviewing.
4. **9 stations publish coordinates with ≤ 2 decimal places** (≥ 1 km uncertainty). For RTK that's structurally wrong; coordinates should be 5+ decimals.

---

## 1. Exact-coordinate duplicates — 7 groups

| Coordinates | Station count | Names |
|---|---:|---|
| `11.320647, 124.951951` | 2 | `****00000`, `****00000` |
| `52.19582, -106.393433` | 2 | `ALBH`, `SASK` |
| `52.914174, 6.609426` | 2 | `****0WSRA`, `****0WSRT` |
| `41.612138, -93.53078` | 2 | `****E2162`, `****E2162` |
| `29.396085, -98.423559` | 2 | `****CAE6C`, `****CAE6C` |
| `33.94629, -78.308373` | 2 | `****20C40`, `****20C40` |
| `35.20832, -82.241485` | 2 | `****6E64A`, `****6E64A` |

## 2. Near-duplicate stations within 10 m — 911 clusters

| Anchor (lat, lng) | Station count | Names (truncated) |
|---|---:|---|
| 40.36818, -111.92485 | 4 | `****20126`, `****31838`, `****C8D82`, `****6A19E` |
| 40.77702, 29.69403 | 3 | `****2186D`, `****81599`, `****3B246` |
| 45.73070, 8.78104 | 3 | `****DF080`, `****0B68D`, `****C1C26` |
| 37.39814, -121.97410 | 3 | `****09996`, `****CBE34`, `****20E08` |
| 37.39948, -121.98105 | 3 | `****7AE7D`, `****60485`, `G001` |
| 35.20832, -82.24147 | 3 | `****2F569`, `****6E64A`, `****6E64A` |
| -27.54836, 153.08894 | 3 | `****EE73D`, `****FBE61`, `****60459` |
| 40.02433, -75.08506 | 2 | `****33ABD`, `****33ABD` |
| 47.88855, 7.53573 | 2 | `****174B5`, `****23158` |
| 54.93696, 24.07149 | 2 | `****453A7`, `****3A76A` |

_…and 901 more in the snapshot file._

## 3. Tight clusters (≥4 within 100 m) — 4 clusters

| Anchor (lat, lng) | Station count |
|---|---:|
| 37.39814, -121.97410 | 6 |
| 37.39948, -121.98105 | 5 |
| 40.36816, -111.92505 | 5 |
| 43.01538, -82.33712 | 4 |

## 4. Stations with ≤ 2 decimal places of coordinate precision — 9

| Name | Lat | Lng |
|---|---:|---:|
| `****727B9` | 44.37 | -79.64249 |
| `****A045D` | 45.770371 | 4.97 |
| `****A075D` | 45.266017 | -68.99 |
| `****A2811` | 49.143947 | -122.88 |
| `****108D1` | 37.96 | -121.655308 |
| `****5C009` | 35.76 | -5.799272 |
| `****7436D` | 51.86 | 9.67822 |
| `****14771` | 44.523366 | -88.72 |
| `****D85A5` | 51.924941 | 11.48 |

---

## Methodology

Each finding is grounded in how a real CORS / RTK network is physically supposed to look:
- A surveyed GNSS reference station occupies one antenna at one coordinate. Two stations at the same point is structurally undefined.
- Honest sites at ≤ 10 m of each other are vanishingly rare — that's inside the cone of a single antenna mount.
- Clusters of ≥ 4 stations in 100 m can be honest (industrial campus, surveying lab) but justify a manual look.
- An RTK base claiming a position with ≤ 2 decimal places (≥ 1 km uncertainty) is not a real CORS station; the public network shouldn't surface them.

For an authoritative per-device GETKINETIK grade (hardware-rooted signature, chain age, tamper flags), the network or operator can POST a Proof of Origin URL to `https://getkinetik.app/api/verify-device`.

Contact: **eric@outfromnothingllc.com** · https://getkinetik.app/bureau/ · https://getkinetik.app/api/docs/
