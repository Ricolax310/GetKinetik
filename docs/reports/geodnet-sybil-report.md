# Sybil Risk Scan — Geodnet RTK Network

> Independent public read by the GETKINETIK Bureau using only Geodnet's public station endpoint. **No internal Geodnet data was used.** Geodnet RTK stations are surveyed GNSS reference units — each one is supposed to be a unique, physically installed antenna at a fixed coordinate. The heuristics below treat that as the structural rule and flag exceptions.

- **As of:** 2026-07-27
- **Public source:** `https://rtk.geodnet.com/api/v2/coverage_stations`
- **Stations observed:** 19,604
- **Stations flagged (any heuristic):** 1,805 (9.21%)

## Executive summary

1. **7 exact (lat,lng) duplicate groups** on 19,604 public stations — each row in §1 is one coordinate pair your registry team can grep today.
2. **908 ≤10 m proximity clusters** — tighter than two physical RTK antennas; start with the largest counts in §2 (names + anchors included).
3. **9.2%** of the public fleet touches at least one heuristic — useful as a sampling denominator, not a verdict.

---

## Since last snapshot

| Metric | This run | vs last run |
|---|---:|---|
| Stations with coordinates | 19,604 | +7 (+0.0%) |
| Exact (lat,lng) duplicate groups | 7 | -1 (-12.5%) |
| Clusters within 10 m | 908 | -2 (-0.2%) |
| Clusters ≥4 within 100 m | 4 | unchanged vs last run |
| Low-precision coordinates (≤2 decimals) | 5 | +3 (+150.0%) |
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
2. **908 clusters of stations sit within 10 m of each other.** That's tighter than the physical separation of two real RTK installs.
3. **4 clusters have ≥4 stations within 100 m.** Plausible for an industrial campus or surveying yard, but the names + counts are worth reviewing.
4. **5 stations publish coordinates with ≤ 2 decimal places** (≥ 1 km uncertainty). For RTK that's structurally wrong; coordinates should be 5+ decimals.

---

## 1. Exact-coordinate duplicates — 7 groups

| Coordinates | Station count | Names |
|---|---:|---|
| `49.638635, 9.354952` | 2 | `****5302D`, `****6A80A` |
| `52.914794, 6.605593` | 2 | `****0WSRA`, `****0WSRT` |
| `43.06966, -89.558544` | 2 | `****18F55`, `****1C301` |
| `41.612758, -93.534614` | 2 | `****E2162`, `****E2162` |
| `29.396705, -98.427393` | 2 | `****CAE6C`, `****CAE6C` |
| `33.94691, -78.312206` | 2 | `****20C40`, `****20C40` |
| `35.20894, -82.245319` | 2 | `****6E64A`, `****6E64A` |

## 2. Near-duplicate stations within 10 m — 908 clusters

| Anchor (lat, lng) | Station count | Names (truncated) |
|---|---:|---|
| 40.36880, -111.92868 | 4 | `****20126`, `****31838`, `****C8D82`, `****6A19E` |
| 45.73132, 8.77721 | 3 | `****DF080`, `****0B68D`, `****C1C26` |
| 37.39876, -121.97794 | 3 | `****09996`, `****CBE34`, `****20E08` |
| 37.40010, -121.98489 | 3 | `****7AE7D`, `****60485`, `G001` |
| 35.20894, -82.24530 | 3 | `****2F569`, `****6E64A`, `****6E64A` |
| -27.54774, 153.08510 | 3 | `****EE73D`, `****FBE61`, `****60459` |
| 18.20403, -65.86647 | 2 | `****48C4D`, `****C4D28` |
| 40.91168, 30.19480 | 2 | `****33EE9`, `****38E2A` |
| 40.69690, -99.09884 | 2 | `****1CF05`, `****EBA88` |
| 41.09056, 28.86839 | 2 | `****00ACD`, `****2017A` |

_…and 898 more in the snapshot file._

## 3. Tight clusters (≥4 within 100 m) — 4 clusters

| Anchor (lat, lng) | Station count |
|---|---:|
| 37.39876, -121.97794 | 6 |
| 37.40010, -121.98489 | 5 |
| 40.36878, -111.92888 | 5 |
| 43.01600, -82.34095 | 4 |

## 4. Stations with ≤ 2 decimal places of coordinate precision — 5

| Name | Lat | Lng |
|---|---:|---:|
| `****EE4D9` | 45.51 | -108.879463 |
| `****203FD` | 45.093624 | 23.92 |
| `****E42B5` | 44.03 | 22.966104 |
| `****0F765` | 52.918731 | 12.09 |
| `****BE681` | -32.699179 | 151.59 |

---

## Methodology

Each finding is grounded in how a real CORS / RTK network is physically supposed to look:
- A surveyed GNSS reference station occupies one antenna at one coordinate. Two stations at the same point is structurally undefined.
- Honest sites at ≤ 10 m of each other are vanishingly rare — that's inside the cone of a single antenna mount.
- Clusters of ≥ 4 stations in 100 m can be honest (industrial campus, surveying lab) but justify a manual look.
- An RTK base claiming a position with ≤ 2 decimal places (≥ 1 km uncertainty) is not a real CORS station; the public network shouldn't surface them.

For an authoritative per-device GETKINETIK grade (hardware-rooted signature, chain age, tamper flags), the network or operator can POST a Proof of Origin URL to `https://getkinetik.app/api/verify-device`.

Contact: **eric@outfromnothingllc.com** · https://getkinetik.app/bureau/ · https://getkinetik.app/api/docs/
