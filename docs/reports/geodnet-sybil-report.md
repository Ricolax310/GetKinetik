# Sybil Risk Scan — Geodnet RTK Network

> Independent public read by the GETKINETIK Bureau using only Geodnet's public station endpoint. **No internal Geodnet data was used.** Geodnet RTK stations are surveyed GNSS reference units — each one is supposed to be a unique, physically installed antenna at a fixed coordinate. The heuristics below treat that as the structural rule and flag exceptions.

- **As of:** 2026-09-02
- **Public source:** `https://rtk.geodnet.com/api/v2/coverage_stations`
- **Stations observed:** 19,478
- **Stations flagged (any heuristic):** 5,341 (27.42%)

## Executive summary

1. **1006 exact (lat,lng) duplicate groups** on 19,478 public stations — each row in §1 is one coordinate pair your registry team can grep today.
2. **1,006 ≤10 m proximity clusters** — tighter than two physical RTK antennas; start with the largest counts in §2 (names + anchors included).
3. **27.4%** of the public fleet touches at least one heuristic — useful as a sampling denominator, not a verdict.

---

## Since last snapshot

| Metric | This run | vs last run |
|---|---:|---|
| Stations with coordinates | 19,478 | +5 (+0.0%) |
| Exact (lat,lng) duplicate groups | 1,006 | +2 (+0.2%) |
| Clusters within 10 m | 1,006 | +2 (+0.2%) |
| Clusters ≥4 within 100 m | 6 | unchanged vs last run |
| Low-precision coordinates (≤2 decimals) | 3,723 | +1 (+0.0%) |
| Fleet share flagged (any heuristic) | 27.42% | +0.02 pp (+0.1%) |

## What to cross-check this week

1. Registry dedupe: for each §1 coordinate pair, confirm whether multiple station IDs should share one surveyed antenna location.
2. Field ops: spot-check §3 tight clusters (≥4 within 100 m) — industrial campus vs duplicate registrations.
3. Data quality: stations in §4 with ≤2 decimal places should not appear as RTK references until coordinates are re-surveyed.
4. Reproduce: `node scripts/sybil-scan-geodnet.mjs` — same public endpoint, no API key.

> Public-data read. Re-run: script in `scripts/`, source URL in report header.

---

## Headline findings

1. **1,006 groups of stations share an exact (lat, lng) pair.** For a CORS / RTK reference network, two stations at identical coordinates is structurally undefined — there is no second-antenna position to triangulate from.
2. **1,006 clusters of stations sit within 10 m of each other.** That's tighter than the physical separation of two real RTK installs.
3. **6 clusters have ≥4 stations within 100 m.** Plausible for an industrial campus or surveying yard, but the names + counts are worth reviewing.
4. **3,723 stations publish coordinates with ≤ 2 decimal places** (≥ 1 km uncertainty). For RTK that's structurally wrong; coordinates should be 5+ decimals.

---

## 1. Exact-coordinate duplicates — 1,006 groups

| Coordinates | Station count | Names |
|---|---:|---|
| `37.4, -121.986` | 5 | `****BFC96`, `****7AE7D`, `****67341`, `****60485`, `G001` |
| `40.369, -111.93` | 5 | `****31838`, `****6A19E`, `****0C6BD`, `****20126`, `****C8D82` |
| `-26.222, -52.682` | 4 | `****C67D9`, `****CB00D`, `****7E261`, `****37855` |
| `38.004, -122.309` | 4 | `****983F1`, `****69CF6`, `****C0A6E`, `****97A05` |
| `50.659, 7.658` | 4 | `****A0671`, `****00A29`, `****E4F2D`, `****3A824` |
| `43.016, -82.342` | 4 | `****19CF5`, `****DFEE1`, `****CAF4D`, `****DC6F5` |
| `47.092, 26.803` | 3 | `****685BD`, `****EB9C4`, `****23C4D` |
| `35.209, -82.246` | 3 | `****2F569`, `****6E64A`, `****6E64A` |
| `35.617, -117.692` | 3 | `****699C2`, `****1F341`, `****1FCBA` |
| `-35.316, 149.01` | 3 | `STR2`, `STR1`, `STR3` |

_…and 996 more in the snapshot file._

## 2. Near-duplicate stations within 10 m — 1,006 clusters

| Anchor (lat, lng) | Station count | Names (truncated) |
|---|---:|---|
| 37.40000, -121.98600 | 5 | `****BFC96`, `****7AE7D`, `****67341`, `****60485`, `G001` |
| 40.36900, -111.93000 | 5 | `****31838`, `****6A19E`, `****0C6BD`, `****20126`, `****C8D82` |
| -26.22200, -52.68200 | 4 | `****C67D9`, `****CB00D`, `****7E261`, `****37855` |
| 38.00400, -122.30900 | 4 | `****983F1`, `****69CF6`, `****C0A6E`, `****97A05` |
| 50.65900, 7.65800 | 4 | `****A0671`, `****00A29`, `****E4F2D`, `****3A824` |
| 43.01600, -82.34200 | 4 | `****19CF5`, `****DFEE1`, `****CAF4D`, `****DC6F5` |
| 47.09200, 26.80300 | 3 | `****685BD`, `****EB9C4`, `****23C4D` |
| 35.20900, -82.24600 | 3 | `****2F569`, `****6E64A`, `****6E64A` |
| 35.61700, -117.69200 | 3 | `****699C2`, `****1F341`, `****1FCBA` |
| -35.31600, 149.01000 | 3 | `STR2`, `STR1`, `STR3` |

_…and 996 more in the snapshot file._

## 3. Tight clusters (≥4 within 100 m) — 6 clusters

| Anchor (lat, lng) | Station count |
|---|---:|
| 37.40000, -121.98600 | 5 |
| 40.36900, -111.93000 | 5 |
| -26.22200, -52.68200 | 4 |
| 38.00400, -122.30900 | 4 |
| 50.65900, 7.65800 | 4 |
| 43.01600, -82.34200 | 4 |

## 4. Stations with ≤ 2 decimal places of coordinate precision — 3,723

| Name | Lat | Lng |
|---|---:|---:|
| `****A06C5` | 35.03 | -100.291 |
| `****67BD5` | 37.73 | 28.644 |
| `****DB789` | 41.43 | -8.302 |
| `****9E551` | 54.04 | 21.768 |
| `****EEADD` | 3.457 | -76.48 |
| `POHN` | 6.96 | 158.21 |
| `****230F9` | 6.579 | -75.2 |
| `****5BF7D` | -5.663 | 105.56 |
| `****8CFE5` | 47.457 | 12.39 |
| `****F3859` | 58.57 | 15.921 |

_…and 3713 more in the snapshot file._

---

## Methodology

Each finding is grounded in how a real CORS / RTK network is physically supposed to look:
- A surveyed GNSS reference station occupies one antenna at one coordinate. Two stations at the same point is structurally undefined.
- Honest sites at ≤ 10 m of each other are vanishingly rare — that's inside the cone of a single antenna mount.
- Clusters of ≥ 4 stations in 100 m can be honest (industrial campus, surveying lab) but justify a manual look.
- An RTK base claiming a position with ≤ 2 decimal places (≥ 1 km uncertainty) is not a real CORS station; the public network shouldn't surface them.

For an authoritative per-device GETKINETIK grade (hardware-rooted signature, chain age, tamper flags), the network or operator can POST a Proof of Origin URL to `https://getkinetik.app/api/verify-device`.

Contact: **eric@outfromnothingllc.com** · https://getkinetik.app/bureau/ · https://getkinetik.app/api/docs/
