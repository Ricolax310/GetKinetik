# Sybil Risk Scan — Geodnet RTK Network

> Independent public read by the GETKINETIK Bureau using only Geodnet's public station endpoint. **No internal Geodnet data was used.** Geodnet RTK stations are surveyed GNSS reference units — each one is supposed to be a unique, physically installed antenna at a fixed coordinate. The heuristics below treat that as the structural rule and flag exceptions.

- **As of:** 2026-08-20
- **Public source:** `https://rtk.geodnet.com/api/v2/coverage_stations`
- **Stations observed:** 19,490
- **Stations flagged (any heuristic):** 1,797 (9.22%)

## Executive summary

1. **6 exact (lat,lng) duplicate groups** on 19,490 public stations — each row in §1 is one coordinate pair your registry team can grep today.
2. **903 ≤10 m proximity clusters** — tighter than two physical RTK antennas; start with the largest counts in §2 (names + anchors included).
3. **9.2%** of the public fleet touches at least one heuristic — useful as a sampling denominator, not a verdict.

---

## Since last snapshot

| Metric | This run | vs last run |
|---|---:|---|
| Stations with coordinates | 19,490 | +4 (+0.0%) |
| Exact (lat,lng) duplicate groups | 6 | -1 (-14.3%) |
| Clusters within 10 m | 903 | -1 (-0.1%) |
| Clusters ≥4 within 100 m | 5 | unchanged vs last run |
| Low-precision coordinates (≤2 decimals) | 5 | -1 (-16.7%) |
| Fleet share flagged (any heuristic) | 9.22% | -0.02 pp (-0.2%) |

## What to cross-check this week

1. Registry dedupe: for each §1 coordinate pair, confirm whether multiple station IDs should share one surveyed antenna location.
2. Field ops: spot-check §3 tight clusters (≥4 within 100 m) — industrial campus vs duplicate registrations.
3. Data quality: stations in §4 with ≤2 decimal places should not appear as RTK references until coordinates are re-surveyed.
4. Reproduce: `node scripts/sybil-scan-geodnet.mjs` — same public endpoint, no API key.

> Public-data read. Re-run: script in `scripts/`, source URL in report header.

---

## Headline findings

1. **6 groups of stations share an exact (lat, lng) pair.** For a CORS / RTK reference network, two stations at identical coordinates is structurally undefined — there is no second-antenna position to triangulate from.
2. **903 clusters of stations sit within 10 m of each other.** That's tighter than the physical separation of two real RTK installs.
3. **5 clusters have ≥4 stations within 100 m.** Plausible for an industrial campus or surveying yard, but the names + counts are worth reviewing.
4. **5 stations publish coordinates with ≤ 2 decimal places** (≥ 1 km uncertainty). For RTK that's structurally wrong; coordinates should be 5+ decimals.

---

## 1. Exact-coordinate duplicates — 6 groups

| Coordinates | Station count | Names |
|---|---:|---|
| `11.321392, 124.950503` | 2 | `****00000`, `****00000` |
| `49.638759, 9.357337` | 2 | `****5302D`, `****6A80A` |
| `52.914919, 6.607978` | 2 | `****0WSRA`, `****0WSRT` |
| `41.612882, -93.532229` | 2 | `****E2162`, `****E2162` |
| `29.39683, -98.425008` | 2 | `****CAE6C`, `****CAE6C` |
| `35.209064, -82.242934` | 2 | `****6E64A`, `****6E64A` |

## 2. Near-duplicate stations within 10 m — 903 clusters

| Anchor (lat, lng) | Station count | Names (truncated) |
|---|---:|---|
| 40.36892, -111.92629 | 4 | `****20126`, `****31838`, `****C8D82`, `****6A19E` |
| 38.00414, -122.30563 | 3 | `****C4105`, `****97A05`, `****C0A6E` |
| 37.40022, -121.98250 | 3 | `****7AE7D`, `****60485`, `G001` |
| 35.20906, -82.24291 | 3 | `****2F569`, `****6E64A`, `****6E64A` |
| -27.54761, 153.08749 | 3 | `****EE73D`, `****FBE61`, `****60459` |
| 13.47211, 144.77655 | 2 | `****48E31`, `****E314C` |
| 38.40491, -121.36854 | 2 | `****1CF45`, `****29EE6` |
| 37.39893, -121.97592 | 2 | `****21C32`, `****21BC8` |
| 42.88687, -74.69871 | 2 | `****0EC90`, `****C5F19` |
| 35.06661, -82.62677 | 2 | `****20CFC`, `****6E638` |

_…and 893 more in the snapshot file._

## 3. Tight clusters (≥4 within 100 m) — 5 clusters

| Anchor (lat, lng) | Station count |
|---|---:|
| 37.40078, -121.98247 | 6 |
| 37.39903, -121.97552 | 5 |
| 40.36890, -111.92650 | 5 |
| 37.39801, -121.97538 | 4 |
| 43.01612, -82.33857 | 4 |

## 4. Stations with ≤ 2 decimal places of coordinate precision — 5

| Name | Lat | Lng |
|---|---:|---:|
| `****BE5C9` | 36.71 | 29.4952 |
| `****A7BC1` | 40.97 | 27.900466 |
| `****F7859` | 39.83 | -84.106067 |
| `****CA02D` | 6.409981 | 72.71 |
| `****C9105` | 42.577174 | 23.18 |

---

## Methodology

Each finding is grounded in how a real CORS / RTK network is physically supposed to look:
- A surveyed GNSS reference station occupies one antenna at one coordinate. Two stations at the same point is structurally undefined.
- Honest sites at ≤ 10 m of each other are vanishingly rare — that's inside the cone of a single antenna mount.
- Clusters of ≥ 4 stations in 100 m can be honest (industrial campus, surveying lab) but justify a manual look.
- An RTK base claiming a position with ≤ 2 decimal places (≥ 1 km uncertainty) is not a real CORS station; the public network shouldn't surface them.

For an authoritative per-device GETKINETIK grade (hardware-rooted signature, chain age, tamper flags), the network or operator can POST a Proof of Origin URL to `https://getkinetik.app/api/verify-device`.

Contact: **eric@outfromnothingllc.com** · https://getkinetik.app/bureau/ · https://getkinetik.app/api/docs/
