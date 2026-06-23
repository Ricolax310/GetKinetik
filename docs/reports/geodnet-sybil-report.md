# Sybil Risk Scan — Geodnet RTK Network

> Independent public read by the GETKINETIK Bureau using only Geodnet's public station endpoint. **No internal Geodnet data was used.** Geodnet RTK stations are surveyed GNSS reference units — each one is supposed to be a unique, physically installed antenna at a fixed coordinate. The heuristics below treat that as the structural rule and flag exceptions.

- **As of:** 2026-06-23
- **Public source:** `https://rtk.geodnet.com/api/v2/coverage_stations`
- **Stations observed:** 19,618
- **Stations flagged (any heuristic):** 1,825 (9.30%)

## Executive summary

1. **10 exact (lat,lng) duplicate groups** on 19,618 public stations — each row in §1 is one coordinate pair your registry team can grep today.
2. **917 ≤10 m proximity clusters** — tighter than two physical RTK antennas; start with the largest counts in §2 (names + anchors included).
3. **9.3%** of the public fleet touches at least one heuristic — useful as a sampling denominator, not a verdict.

---

## Since last snapshot

| Metric | This run | vs last run |
|---|---:|---|
| Stations with coordinates | 19,618 | +9 (+0.0%) |
| Exact (lat,lng) duplicate groups | 10 | unchanged vs last run |
| Clusters within 10 m | 917 | unchanged vs last run |
| Clusters ≥4 within 100 m | 5 | +1 (+25.0%) |
| Low-precision coordinates (≤2 decimals) | 5 | -5 (-50.0%) |
| Fleet share flagged (any heuristic) | 9.30% | -0.01 pp (-0.2%) |

## What to cross-check this week

1. Registry dedupe: for each §1 coordinate pair, confirm whether multiple station IDs should share one surveyed antenna location.
2. Field ops: spot-check §3 tight clusters (≥4 within 100 m) — industrial campus vs duplicate registrations.
3. Data quality: stations in §4 with ≤2 decimal places should not appear as RTK references until coordinates are re-surveyed.
4. Reproduce: `node scripts/sybil-scan-geodnet.mjs` — same public endpoint, no API key.

> Public-data read. Re-run: script in `scripts/`, source URL in report header.

---

## Headline findings

1. **10 groups of stations share an exact (lat, lng) pair.** For a CORS / RTK reference network, two stations at identical coordinates is structurally undefined — there is no second-antenna position to triangulate from.
2. **917 clusters of stations sit within 10 m of each other.** That's tighter than the physical separation of two real RTK installs.
3. **5 clusters have ≥4 stations within 100 m.** Plausible for an industrial campus or surveying yard, but the names + counts are worth reviewing.
4. **5 stations publish coordinates with ≤ 2 decimal places** (≥ 1 km uncertainty). For RTK that's structurally wrong; coordinates should be 5+ decimals.

---

## 1. Exact-coordinate duplicates — 10 groups

| Coordinates | Station count | Names |
|---|---:|---|
| `11.320643, 124.949188` | 2 | `****00000`, `****00000` |
| `49.638011, 9.356022` | 2 | `****5302D`, `****6A80A` |
| `52.91417, 6.606663` | 2 | `****0WSRA`, `****0WSRT` |
| `45.866777, -108.77298` | 2 | `****10DA5`, `****3A7F8` |
| `43.069036, -89.557474` | 2 | `****1C301`, `****18F55` |
| `41.612134, -93.533544` | 2 | `****E2162`, `****E2162` |
| `29.396081, -98.426323` | 2 | `****CAE6C`, `****CAE6C` |
| `33.946286, -78.311136` | 2 | `****20C40`, `****20C40` |
| `42.371895, -71.183963` | 2 | `****C6D12`, `****C6D12` |
| `35.208316, -82.244249` | 2 | `****6E64A`, `****6E64A` |

## 2. Near-duplicate stations within 10 m — 917 clusters

| Anchor (lat, lng) | Station count | Names (truncated) |
|---|---:|---|
| 37.39947, -121.98382 | 4 | `****7AE7D`, `****67341`, `****60485`, `G001` |
| 40.36818, -111.92761 | 4 | `****20126`, `****31838`, `****C8D82`, `****6A19E` |
| 13.05927, 80.23014 | 3 | `****C06E5`, `****1C0B9`, `****6A16E` |
| 35.20831, -82.24423 | 3 | `****2F569`, `****6E64A`, `****6E64A` |
| -27.54836, 153.08617 | 3 | `****EE73D`, `****FBE61`, `****60459` |
| 30.55068, -88.21650 | 3 | `****FE291`, `****C3CFA`, `****09A2E` |
| -33.90080, -60.57012 | 2 | `****4ACC5`, `****13B56` |
| 39.50367, -76.17565 | 2 | `****2F87C`, `****7AA31` |
| 41.64362, -72.89977 | 2 | `****1C33D`, `****D2E8C` |
| 11.32064, 124.94919 | 2 | `****00000`, `****00000` |

_…and 907 more in the snapshot file._

## 3. Tight clusters (≥4 within 100 m) — 5 clusters

| Anchor (lat, lng) | Station count |
|---|---:|
| 37.39773, -121.97678 | 5 |
| 37.39947, -121.98382 | 5 |
| 40.36816, -111.92781 | 5 |
| 5.81383, -55.24106 | 4 |
| 43.01537, -82.33988 | 4 |

## 4. Stations with ≤ 2 decimal places of coordinate precision — 5

| Name | Lat | Lng |
|---|---:|---:|
| `****5C1A1` | 51.208615 | 2.9 |
| `****00B15` | 37.24 | 42.450238 |
| `****1C9E5` | 36.243891 | 29.99 |
| `****18D95` | 46.64949 | 5.55 |
| `****D4D79` | 36.928163 | 34.88 |

---

## Methodology

Each finding is grounded in how a real CORS / RTK network is physically supposed to look:
- A surveyed GNSS reference station occupies one antenna at one coordinate. Two stations at the same point is structurally undefined.
- Honest sites at ≤ 10 m of each other are vanishingly rare — that's inside the cone of a single antenna mount.
- Clusters of ≥ 4 stations in 100 m can be honest (industrial campus, surveying lab) but justify a manual look.
- An RTK base claiming a position with ≤ 2 decimal places (≥ 1 km uncertainty) is not a real CORS station; the public network shouldn't surface them.

For an authoritative per-device GETKINETIK grade (hardware-rooted signature, chain age, tamper flags), the network or operator can POST a Proof of Origin URL to `https://getkinetik.app/api/verify-device`.

Contact: **eric@outfromnothingllc.com** · https://getkinetik.app/bureau/ · https://getkinetik.app/api/docs/
