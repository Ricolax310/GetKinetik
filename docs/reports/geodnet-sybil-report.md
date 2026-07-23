# Sybil Risk Scan — Geodnet RTK Network

> Independent public read by the GETKINETIK Bureau using only Geodnet's public station endpoint. **No internal Geodnet data was used.** Geodnet RTK stations are surveyed GNSS reference units — each one is supposed to be a unique, physically installed antenna at a fixed coordinate. The heuristics below treat that as the structural rule and flag exceptions.

- **As of:** 2026-07-23
- **Public source:** `https://rtk.geodnet.com/api/v2/coverage_stations`
- **Stations observed:** 19,592
- **Stations flagged (any heuristic):** 1,804 (9.21%)

## Executive summary

1. **9 exact (lat,lng) duplicate groups** on 19,592 public stations — each row in §1 is one coordinate pair your registry team can grep today.
2. **905 ≤10 m proximity clusters** — tighter than two physical RTK antennas; start with the largest counts in §2 (names + anchors included).
3. **9.2%** of the public fleet touches at least one heuristic — useful as a sampling denominator, not a verdict.

---

## Since last snapshot

| Metric | This run | vs last run |
|---|---:|---|
| Stations with coordinates | 19,592 | +1 (+0.0%) |
| Exact (lat,lng) duplicate groups | 9 | +3 (+50.0%) |
| Clusters within 10 m | 905 | unchanged vs last run |
| Clusters ≥4 within 100 m | 4 | unchanged vs last run |
| Low-precision coordinates (≤2 decimals) | 5 | unchanged vs last run |
| Fleet share flagged (any heuristic) | 9.21% | -0.00 pp (-0.0%) |

## What to cross-check this week

1. Registry dedupe: for each §1 coordinate pair, confirm whether multiple station IDs should share one surveyed antenna location.
2. Field ops: spot-check §3 tight clusters (≥4 within 100 m) — industrial campus vs duplicate registrations.
3. Data quality: stations in §4 with ≤2 decimal places should not appear as RTK references until coordinates are re-surveyed.
4. Reproduce: `node scripts/sybil-scan-geodnet.mjs` — same public endpoint, no API key.

> Public-data read. Re-run: script in `scripts/`, source URL in report header.

---

## Headline findings

1. **9 groups of stations share an exact (lat, lng) pair.** For a CORS / RTK reference network, two stations at identical coordinates is structurally undefined — there is no second-antenna position to triangulate from.
2. **905 clusters of stations sit within 10 m of each other.** That's tighter than the physical separation of two real RTK installs.
3. **4 clusters have ≥4 stations within 100 m.** Plausible for an industrial campus or surveying yard, but the names + counts are worth reviewing.
4. **5 stations publish coordinates with ≤ 2 decimal places** (≥ 1 km uncertainty). For RTK that's structurally wrong; coordinates should be 5+ decimals.

---

## 1. Exact-coordinate duplicates — 9 groups

| Coordinates | Station count | Names |
|---|---:|---|
| `11.321236, 124.949116` | 2 | `****00000`, `****00000` |
| `49.638604, 9.35595` | 2 | `****5302D`, `****6A80A` |
| `45.887853, -90.828755` | 2 | `****379D9`, `****09A46` |
| `52.914764, 6.606591` | 2 | `****0WSRA`, `****0WSRT` |
| `43.069629, -89.557546` | 2 | `****18F55`, `****1C301` |
| `41.612727, -93.533615` | 2 | `****E2162`, `****E2162` |
| `29.396675, -98.426395` | 2 | `****CAE6C`, `****CAE6C` |
| `33.946879, -78.311208` | 2 | `****20C40`, `****20C40` |
| `35.208909, -82.244321` | 2 | `****6E64A`, `****6E64A` |

## 2. Near-duplicate stations within 10 m — 905 clusters

| Anchor (lat, lng) | Station count | Names (truncated) |
|---|---:|---|
| 37.39876, -121.97693 | 4 | `****F9CCC`, `****CBDF2`, `****09996`, `****18AFA` |
| 40.36877, -111.92768 | 4 | `****20126`, `****31838`, `****C8D82`, `****6A19E` |
| 40.77761, 29.69120 | 3 | `****2186D`, `****81599`, `****3B246` |
| 45.73129, 8.77820 | 3 | `****DF080`, `****0B68D`, `****C1C26` |
| 37.40007, -121.98389 | 3 | `****7AE7D`, `****60485`, `G001` |
| 35.20891, -82.24430 | 3 | `****2F569`, `****6E64A`, `****6E64A` |
| -27.54777, 153.08610 | 3 | `****EE73D`, `****FBE61`, `****60459` |
| 42.70865, -84.43163 | 2 | `****DB049`, `****E3188` |
| 58.38668, -3.14646 | 2 | `****C9DE2`, `****F3585` |
| 42.22041, -8.70955 | 2 | `****14C25`, `****6E5D6` |

_…and 895 more in the snapshot file._

## 3. Tight clusters (≥4 within 100 m) — 4 clusters

| Anchor (lat, lng) | Station count |
|---|---:|
| 37.39896, -121.97692 | 8 |
| 40.36875, -111.92788 | 5 |
| 37.40007, -121.98389 | 4 |
| 43.01597, -82.33996 | 4 |

## 4. Stations with ≤ 2 decimal places of coordinate precision — 5

| Name | Lat | Lng |
|---|---:|---:|
| `****885AD` | 37.276923 | -121.92 |
| `TBOB` | -29.45 | 142.059515 |
| `****A1C39` | 48.870984 | 21.71 |
| `****71509` | 38.63 | 32.834589 |
| `****72D35` | 42.767679 | -73.7 |

---

## Methodology

Each finding is grounded in how a real CORS / RTK network is physically supposed to look:
- A surveyed GNSS reference station occupies one antenna at one coordinate. Two stations at the same point is structurally undefined.
- Honest sites at ≤ 10 m of each other are vanishingly rare — that's inside the cone of a single antenna mount.
- Clusters of ≥ 4 stations in 100 m can be honest (industrial campus, surveying lab) but justify a manual look.
- An RTK base claiming a position with ≤ 2 decimal places (≥ 1 km uncertainty) is not a real CORS station; the public network shouldn't surface them.

For an authoritative per-device GETKINETIK grade (hardware-rooted signature, chain age, tamper flags), the network or operator can POST a Proof of Origin URL to `https://getkinetik.app/api/verify-device`.

Contact: **eric@outfromnothingllc.com** · https://getkinetik.app/bureau/ · https://getkinetik.app/api/docs/
