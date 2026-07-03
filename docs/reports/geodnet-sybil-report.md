# Sybil Risk Scan — Geodnet RTK Network

> Independent public read by the GETKINETIK Bureau using only Geodnet's public station endpoint. **No internal Geodnet data was used.** Geodnet RTK stations are surveyed GNSS reference units — each one is supposed to be a unique, physically installed antenna at a fixed coordinate. The heuristics below treat that as the structural rule and flag exceptions.

- **As of:** 2026-07-03
- **Public source:** `https://rtk.geodnet.com/api/v2/coverage_stations`
- **Stations observed:** 19,572
- **Stations flagged (any heuristic):** 1,813 (9.26%)

## Executive summary

1. **8 exact (lat,lng) duplicate groups** on 19,572 public stations — each row in §1 is one coordinate pair your registry team can grep today.
2. **911 ≤10 m proximity clusters** — tighter than two physical RTK antennas; start with the largest counts in §2 (names + anchors included).
3. **9.3%** of the public fleet touches at least one heuristic — useful as a sampling denominator, not a verdict.

---

## Since last snapshot

| Metric | This run | vs last run |
|---|---:|---|
| Stations with coordinates | 19,572 | -3 (-0.0%) |
| Exact (lat,lng) duplicate groups | 8 | -1 (-11.1%) |
| Clusters within 10 m | 911 | unchanged vs last run |
| Clusters ≥4 within 100 m | 4 | unchanged vs last run |
| Low-precision coordinates (≤2 decimals) | 5 | unchanged vs last run |
| Fleet share flagged (any heuristic) | 9.26% | +0.01 pp (+0.1%) |

## What to cross-check this week

1. Registry dedupe: for each §1 coordinate pair, confirm whether multiple station IDs should share one surveyed antenna location.
2. Field ops: spot-check §3 tight clusters (≥4 within 100 m) — industrial campus vs duplicate registrations.
3. Data quality: stations in §4 with ≤2 decimal places should not appear as RTK references until coordinates are re-surveyed.
4. Reproduce: `node scripts/sybil-scan-geodnet.mjs` — same public endpoint, no API key.

> Public-data read. Re-run: script in `scripts/`, source URL in report header.

---

## Headline findings

1. **8 groups of stations share an exact (lat, lng) pair.** For a CORS / RTK reference network, two stations at identical coordinates is structurally undefined — there is no second-antenna position to triangulate from.
2. **911 clusters of stations sit within 10 m of each other.** That's tighter than the physical separation of two real RTK installs.
3. **4 clusters have ≥4 stations within 100 m.** Plausible for an industrial campus or surveying yard, but the names + counts are worth reviewing.
4. **5 stations publish coordinates with ≤ 2 decimal places** (≥ 1 km uncertainty). For RTK that's structurally wrong; coordinates should be 5+ decimals.

---

## 1. Exact-coordinate duplicates — 8 groups

| Coordinates | Station count | Names |
|---|---:|---|
| `11.320725, 124.950881` | 2 | `****00000`, `****00000` |
| `52.914252, 6.608356` | 2 | `****0WSRA`, `****0WSRT` |
| `45.866859, -108.771286` | 2 | `****10DA5`, `****3A7F8` |
| `41.612216, -93.53185` | 2 | `****E2162`, `****E2162` |
| `29.396163, -98.424629` | 2 | `****CAE6C`, `****CAE6C` |
| `33.946367, -78.309442` | 2 | `****20C40`, `****20C40` |
| `42.371977, -71.18227` | 2 | `****C6D12`, `****C6D12` |
| `35.208398, -82.242555` | 2 | `****6E64A`, `****6E64A` |

## 2. Near-duplicate stations within 10 m — 911 clusters

| Anchor (lat, lng) | Station count | Names (truncated) |
|---|---:|---|
| 37.39955, -121.98212 | 4 | `****7AE7D`, `****67341`, `****60485`, `G001` |
| 40.36826, -111.92592 | 4 | `****20126`, `****31838`, `****C8D82`, `****6A19E` |
| 12.96678, 77.75952 | 3 | `****D0919`, `****BE89D`, `****503D1` |
| 37.39818, -121.97514 | 3 | `****20589`, `****0A97A`, `****CBE10` |
| 37.39823, -121.97554 | 3 | `****16C02`, `****6A8CE`, `****E30E6` |
| 35.20839, -82.24254 | 3 | `****2F569`, `****6E64A`, `****6E64A` |
| -27.54828, 153.08787 | 3 | `****EE73D`, `****FBE61`, `****60459` |
| 30.55076, -88.21481 | 3 | `****FE291`, `****C3CFA`, `****09A2E` |
| -23.54871, -47.09925 | 2 | `****C4A05`, `****32798` |
| 50.05416, 19.91538 | 2 | `****D0EEC`, `****A23C1` |

_…and 901 more in the snapshot file._

## 3. Tight clusters (≥4 within 100 m) — 4 clusters

| Anchor (lat, lng) | Station count |
|---|---:|
| 37.39818, -121.97514 | 8 |
| 37.39955, -121.98212 | 5 |
| 40.36824, -111.92612 | 5 |
| 43.01546, -82.33819 | 4 |

## 4. Stations with ≤ 2 decimal places of coordinate precision — 5

| Name | Lat | Lng |
|---|---:|---:|
| `UCAL` | 51.079621 | -114.13 |
| `****7C229` | 41.29 | 1.980441 |
| `****E455D` | 48.423187 | 21.98 |
| `****1A659` | 41.32 | 14.341006 |
| `****AB11D` | 23.344602 | 90.9 |

---

## Methodology

Each finding is grounded in how a real CORS / RTK network is physically supposed to look:
- A surveyed GNSS reference station occupies one antenna at one coordinate. Two stations at the same point is structurally undefined.
- Honest sites at ≤ 10 m of each other are vanishingly rare — that's inside the cone of a single antenna mount.
- Clusters of ≥ 4 stations in 100 m can be honest (industrial campus, surveying lab) but justify a manual look.
- An RTK base claiming a position with ≤ 2 decimal places (≥ 1 km uncertainty) is not a real CORS station; the public network shouldn't surface them.

For an authoritative per-device GETKINETIK grade (hardware-rooted signature, chain age, tamper flags), the network or operator can POST a Proof of Origin URL to `https://getkinetik.app/api/verify-device`.

Contact: **eric@outfromnothingllc.com** · https://getkinetik.app/bureau/ · https://getkinetik.app/api/docs/
