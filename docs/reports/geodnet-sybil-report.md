# Sybil Risk Scan — Geodnet RTK Network

> Independent public read by the GETKINETIK Bureau using only Geodnet's public station endpoint. **No internal Geodnet data was used.** Geodnet RTK stations are surveyed GNSS reference units — each one is supposed to be a unique, physically installed antenna at a fixed coordinate. The heuristics below treat that as the structural rule and flag exceptions.

- **As of:** 2026-08-22
- **Public source:** `https://rtk.geodnet.com/api/v2/coverage_stations`
- **Stations observed:** 19,499
- **Stations flagged (any heuristic):** 1,799 (9.23%)

## Executive summary

1. **6 exact (lat,lng) duplicate groups** on 19,499 public stations — each row in §1 is one coordinate pair your registry team can grep today.
2. **905 ≤10 m proximity clusters** — tighter than two physical RTK antennas; start with the largest counts in §2 (names + anchors included).
3. **9.2%** of the public fleet touches at least one heuristic — useful as a sampling denominator, not a verdict.

---

## Since last snapshot

| Metric | This run | vs last run |
|---|---:|---|
| Stations with coordinates | 19,499 | unchanged vs last run |
| Exact (lat,lng) duplicate groups | 6 | unchanged vs last run |
| Clusters within 10 m | 905 | +1 (+0.1%) |
| Clusters ≥4 within 100 m | 4 | unchanged vs last run |
| Low-precision coordinates (≤2 decimals) | 3 | -1 (-25.0%) |
| Fleet share flagged (any heuristic) | 9.23% | +0.01 pp (+0.1%) |

## What to cross-check this week

1. Registry dedupe: for each §1 coordinate pair, confirm whether multiple station IDs should share one surveyed antenna location.
2. Field ops: spot-check §3 tight clusters (≥4 within 100 m) — industrial campus vs duplicate registrations.
3. Data quality: stations in §4 with ≤2 decimal places should not appear as RTK references until coordinates are re-surveyed.
4. Reproduce: `node scripts/sybil-scan-geodnet.mjs` — same public endpoint, no API key.

> Public-data read. Re-run: script in `scripts/`, source URL in report header.

---

## Headline findings

1. **6 groups of stations share an exact (lat, lng) pair.** For a CORS / RTK reference network, two stations at identical coordinates is structurally undefined — there is no second-antenna position to triangulate from.
2. **905 clusters of stations sit within 10 m of each other.** That's tighter than the physical separation of two real RTK installs.
3. **4 clusters have ≥4 stations within 100 m.** Plausible for an industrial campus or surveying yard, but the names + counts are worth reviewing.
4. **3 stations publish coordinates with ≤ 2 decimal places** (≥ 1 km uncertainty). For RTK that's structurally wrong; coordinates should be 5+ decimals.

---

## 1. Exact-coordinate duplicates — 6 groups

| Coordinates | Station count | Names |
|---|---:|---|
| `52.915069, 6.603367` | 2 | `****0WSRA`, `****0WSRT` |
| `43.069935, -89.56077` | 2 | `****18F55`, `****1C301` |
| `41.613033, -93.53684` | 2 | `****E2162`, `****E2162` |
| `29.39698, -98.429619` | 2 | `****CAE6C`, `****CAE6C` |
| `33.947185, -78.314432` | 2 | `****20C40`, `****20C40` |
| `35.209215, -82.247545` | 2 | `****6E64A`, `****6E64A` |

## 2. Near-duplicate stations within 10 m — 905 clusters

| Anchor (lat, lng) | Station count | Names (truncated) |
|---|---:|---|
| 40.36908, -111.93090 | 4 | `****20126`, `****31838`, `****C8D82`, `****6A19E` |
| 38.00429, -122.31024 | 3 | `****C4105`, `****97A05`, `****C0A6E` |
| 52.48680, -105.73489 | 3 | `****FCD66`, `****1A299`, `****6E3FC` |
| 37.40037, -121.98711 | 3 | `****7AE7D`, `****60485`, `G001` |
| 35.20921, -82.24752 | 3 | `****2F569`, `****6E64A`, `****6E64A` |
| -27.54746, 153.08288 | 3 | `****EE73D`, `****FBE61`, `****60459` |
| 35.06676, -82.63138 | 2 | `****20CFC`, `****6E638` |
| -34.14110, -63.39953 | 2 | `****4A449`, `****21BF2` |
| 31.72942, -106.37404 | 2 | `****2A7DD`, `****CBE52` |
| 53.31463, -0.93639 | 2 | `****C986D`, `****008D5` |

_…and 895 more in the snapshot file._

## 3. Tight clusters (≥4 within 100 m) — 4 clusters

| Anchor (lat, lng) | Station count |
|---|---:|
| 37.40093, -121.98708 | 6 |
| 40.36906, -111.93111 | 5 |
| 37.39816, -121.97999 | 4 |
| 43.01627, -82.34318 | 4 |

## 4. Stations with ≤ 2 decimal places of coordinate precision — 3

| Name | Lat | Lng |
|---|---:|---:|
| `****DB309` | 53.4 | 8.110427 |
| `****117BD` | 51.11 | 10.656068 |
| `****D8315` | 50.30726 | 11.91 |

---

## Methodology

Each finding is grounded in how a real CORS / RTK network is physically supposed to look:
- A surveyed GNSS reference station occupies one antenna at one coordinate. Two stations at the same point is structurally undefined.
- Honest sites at ≤ 10 m of each other are vanishingly rare — that's inside the cone of a single antenna mount.
- Clusters of ≥ 4 stations in 100 m can be honest (industrial campus, surveying lab) but justify a manual look.
- An RTK base claiming a position with ≤ 2 decimal places (≥ 1 km uncertainty) is not a real CORS station; the public network shouldn't surface them.

For an authoritative per-device GETKINETIK grade (hardware-rooted signature, chain age, tamper flags), the network or operator can POST a Proof of Origin URL to `https://getkinetik.app/api/verify-device`.

Contact: **eric@outfromnothingllc.com** · https://getkinetik.app/bureau/ · https://getkinetik.app/api/docs/
