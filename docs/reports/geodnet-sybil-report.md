# Sybil Risk Scan — Geodnet RTK Network

> Independent public read by the GETKINETIK Bureau using only Geodnet's public station endpoint. **No internal Geodnet data was used.** Geodnet RTK stations are surveyed GNSS reference units — each one is supposed to be a unique, physically installed antenna at a fixed coordinate. The heuristics below treat that as the structural rule and flag exceptions.

- **As of:** 2026-07-04
- **Public source:** `https://rtk.geodnet.com/api/v2/coverage_stations`
- **Stations observed:** 19,564
- **Stations flagged (any heuristic):** 1,811 (9.26%)

## Executive summary

1. **9 exact (lat,lng) duplicate groups** on 19,564 public stations — each row in §1 is one coordinate pair your registry team can grep today.
2. **911 ≤10 m proximity clusters** — tighter than two physical RTK antennas; start with the largest counts in §2 (names + anchors included).
3. **9.3%** of the public fleet touches at least one heuristic — useful as a sampling denominator, not a verdict.

---

## Since last snapshot

| Metric | This run | vs last run |
|---|---:|---|
| Stations with coordinates | 19,564 | -9 (-0.0%) |
| Exact (lat,lng) duplicate groups | 9 | unchanged vs last run |
| Clusters within 10 m | 911 | -1 (-0.1%) |
| Clusters ≥4 within 100 m | 4 | unchanged vs last run |
| Low-precision coordinates (≤2 decimals) | 2 | unchanged vs last run |
| Fleet share flagged (any heuristic) | 9.26% | -0.01 pp (-0.1%) |

## What to cross-check this week

1. Registry dedupe: for each §1 coordinate pair, confirm whether multiple station IDs should share one surveyed antenna location.
2. Field ops: spot-check §3 tight clusters (≥4 within 100 m) — industrial campus vs duplicate registrations.
3. Data quality: stations in §4 with ≤2 decimal places should not appear as RTK references until coordinates are re-surveyed.
4. Reproduce: `node scripts/sybil-scan-geodnet.mjs` — same public endpoint, no API key.

> Public-data read. Re-run: script in `scripts/`, source URL in report header.

---

## Headline findings

1. **9 groups of stations share an exact (lat, lng) pair.** For a CORS / RTK reference network, two stations at identical coordinates is structurally undefined — there is no second-antenna position to triangulate from.
2. **911 clusters of stations sit within 10 m of each other.** That's tighter than the physical separation of two real RTK installs.
3. **4 clusters have ≥4 stations within 100 m.** Plausible for an industrial campus or surveying yard, but the names + counts are worth reviewing.
4. **2 stations publish coordinates with ≤ 2 decimal places** (≥ 1 km uncertainty). For RTK that's structurally wrong; coordinates should be 5+ decimals.

---

## 1. Exact-coordinate duplicates — 9 groups

| Coordinates | Station count | Names |
|---|---:|---|
| `49.638732, 9.357387` | 2 | `****5302D`, `****6A80A` |
| `52.914892, 6.608028` | 2 | `****0WSRA`, `****0WSRT` |
| `45.867498, -108.771615` | 2 | `****10DA5`, `****3A7F8` |
| `43.069757, -89.556109` | 2 | `****1C301`, `****18F55` |
| `41.612855, -93.532178` | 2 | `****E2162`, `****E2162` |
| `29.396803, -98.424958` | 2 | `****CAE6C`, `****CAE6C` |
| `33.947007, -78.309771` | 2 | `****20C40`, `****20C40` |
| `42.372617, -71.182598` | 2 | `****C6D12`, `****C6D12` |
| `35.209037, -82.242884` | 2 | `****6E64A`, `****6E64A` |

## 2. Near-duplicate stations within 10 m — 911 clusters

| Anchor (lat, lng) | Station count | Names (truncated) |
|---|---:|---|
| 37.40019, -121.98245 | 4 | `****7AE7D`, `****67341`, `****60485`, `G001` |
| 40.36890, -111.92624 | 4 | `****20126`, `****31838`, `****C8D82`, `****6A19E` |
| 12.96742, 77.75919 | 3 | `****D0919`, `****BE89D`, `****503D1` |
| 37.39882, -121.97547 | 3 | `****20589`, `****0A97A`, `****CBE10` |
| 37.39887, -121.97587 | 3 | `****16C02`, `****6A8CE`, `****E30E6` |
| 35.20903, -82.24286 | 3 | `****2F569`, `****6E64A`, `****6E64A` |
| -27.54764, 153.08754 | 3 | `****EE73D`, `****FBE61`, `****60459` |
| 30.55140, -88.21514 | 3 | `****FE291`, `****C3CFA`, `****09A2E` |
| 50.05480, 19.91505 | 2 | `****D0EEC`, `****A23C1` |
| 36.87309, 35.34994 | 2 | `****761A1`, `****3B592` |

_…and 901 more in the snapshot file._

## 3. Tight clusters (≥4 within 100 m) — 4 clusters

| Anchor (lat, lng) | Station count |
|---|---:|
| 37.39882, -121.97547 | 8 |
| 37.40019, -121.98245 | 5 |
| 40.36888, -111.92645 | 5 |
| 43.01609, -82.33852 | 4 |

## 4. Stations with ≤ 2 decimal places of coordinate precision — 2

| Name | Lat | Lng |
|---|---:|---:|
| `****231C9` | 49.74 | 7.319824 |
| `****C6FE1` | 51.57 | 22.479676 |

---

## Methodology

Each finding is grounded in how a real CORS / RTK network is physically supposed to look:
- A surveyed GNSS reference station occupies one antenna at one coordinate. Two stations at the same point is structurally undefined.
- Honest sites at ≤ 10 m of each other are vanishingly rare — that's inside the cone of a single antenna mount.
- Clusters of ≥ 4 stations in 100 m can be honest (industrial campus, surveying lab) but justify a manual look.
- An RTK base claiming a position with ≤ 2 decimal places (≥ 1 km uncertainty) is not a real CORS station; the public network shouldn't surface them.

For an authoritative per-device GETKINETIK grade (hardware-rooted signature, chain age, tamper flags), the network or operator can POST a Proof of Origin URL to `https://getkinetik.app/api/verify-device`.

Contact: **eric@outfromnothingllc.com** · https://getkinetik.app/bureau/ · https://getkinetik.app/api/docs/
