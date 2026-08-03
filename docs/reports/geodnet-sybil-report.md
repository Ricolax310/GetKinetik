# Sybil Risk Scan — Geodnet RTK Network

> Independent public read by the GETKINETIK Bureau using only Geodnet's public station endpoint. **No internal Geodnet data was used.** Geodnet RTK stations are surveyed GNSS reference units — each one is supposed to be a unique, physically installed antenna at a fixed coordinate. The heuristics below treat that as the structural rule and flag exceptions.

- **As of:** 2026-08-03
- **Public source:** `https://rtk.geodnet.com/api/v2/coverage_stations`
- **Stations observed:** 19,585
- **Stations flagged (any heuristic):** 1,786 (9.12%)

## Executive summary

1. **8 exact (lat,lng) duplicate groups** on 19,585 public stations — each row in §1 is one coordinate pair your registry team can grep today.
2. **899 ≤10 m proximity clusters** — tighter than two physical RTK antennas; start with the largest counts in §2 (names + anchors included).
3. **9.1%** of the public fleet touches at least one heuristic — useful as a sampling denominator, not a verdict.

---

## Since last snapshot

| Metric | This run | vs last run |
|---|---:|---|
| Stations with coordinates | 19,585 | -2 (-0.0%) |
| Exact (lat,lng) duplicate groups | 8 | +1 (+14.3%) |
| Clusters within 10 m | 899 | unchanged vs last run |
| Clusters ≥4 within 100 m | 3 | unchanged vs last run |
| Low-precision coordinates (≤2 decimals) | 6 | +3 (+100.0%) |
| Fleet share flagged (any heuristic) | 9.12% | +0.02 pp (+0.2%) |

## What to cross-check this week

1. Registry dedupe: for each §1 coordinate pair, confirm whether multiple station IDs should share one surveyed antenna location.
2. Field ops: spot-check §3 tight clusters (≥4 within 100 m) — industrial campus vs duplicate registrations.
3. Data quality: stations in §4 with ≤2 decimal places should not appear as RTK references until coordinates are re-surveyed.
4. Reproduce: `node scripts/sybil-scan-geodnet.mjs` — same public endpoint, no API key.

> Public-data read. Re-run: script in `scripts/`, source URL in report header.

---

## Headline findings

1. **8 groups of stations share an exact (lat, lng) pair.** For a CORS / RTK reference network, two stations at identical coordinates is structurally undefined — there is no second-antenna position to triangulate from.
2. **899 clusters of stations sit within 10 m of each other.** That's tighter than the physical separation of two real RTK installs.
3. **3 clusters have ≥4 stations within 100 m.** Plausible for an industrial campus or surveying yard, but the names + counts are worth reviewing.
4. **6 stations publish coordinates with ≤ 2 decimal places** (≥ 1 km uncertainty). For RTK that's structurally wrong; coordinates should be 5+ decimals.

---

## 1. Exact-coordinate duplicates — 8 groups

| Coordinates | Station count | Names |
|---|---:|---|
| `33.947191, -78.314517` | 2 | `****20C40`, `****20C40` |
| `11.321548, 124.945807` | 2 | `****00000`, `****00000` |
| `49.638916, 9.352641` | 2 | `****5302D`, `****6A80A` |
| `52.915075, 6.603282` | 2 | `****0WSRA`, `****0WSRT` |
| `43.069941, -89.560855` | 2 | `****18F55`, `****1C301` |
| `41.613039, -93.536924` | 2 | `****E2162`, `****E2162` |
| `29.396986, -98.429703` | 2 | `****CAE6C`, `****CAE6C` |
| `35.209221, -82.24763` | 2 | `****6E64A`, `****6E64A` |

## 2. Near-duplicate stations within 10 m — 899 clusters

| Anchor (lat, lng) | Station count | Names (truncated) |
|---|---:|---|
| 40.36908, -111.93099 | 4 | `****20126`, `****31838`, `****C8D82`, `****6A19E` |
| 40.77792, 29.68789 | 3 | `****2186D`, `****81599`, `****3B246` |
| 36.25987, -115.17700 | 3 | `****20C14`, `****C8749`, `****6A1AA` |
| 37.40038, -121.98720 | 3 | `****7AE7D`, `****60485`, `G001` |
| 35.20922, -82.24761 | 3 | `****2F569`, `****6E64A`, `****6E64A` |
| -27.54746, 153.08279 | 3 | `****EE73D`, `****FBE61`, `****60459` |
| 53.64328, 11.40754 | 2 | `****4F21B`, `****21BD8` |
| 11.30623, 79.73559 | 2 | `****22C24`, `****7A005` |
| 31.45702, -100.45554 | 2 | `****22B9A`, `****116F9` |
| 40.95868, 24.99477 | 2 | `****316E8`, `****E7695` |

_…and 889 more in the snapshot file._

## 3. Tight clusters (≥4 within 100 m) — 3 clusters

| Anchor (lat, lng) | Station count |
|---|---:|
| 37.40038, -121.98720 | 5 |
| 40.36906, -111.93119 | 5 |
| 43.01628, -82.34326 | 4 |

## 4. Stations with ≤ 2 decimal places of coordinate precision — 6

| Name | Lat | Lng |
|---|---:|---:|
| `****A6D05` | 50.75 | 12.622139 |
| `****A0761` | 55.62 | -3.574535 |
| `****761D9` | 46.61 | 5.589793 |
| `****6E784` | -25.463554 | -50.57 |
| `****AF676` | 36.480136 | 127.15 |
| `****88FBD` | 42.662073 | -88.71 |

---

## Methodology

Each finding is grounded in how a real CORS / RTK network is physically supposed to look:
- A surveyed GNSS reference station occupies one antenna at one coordinate. Two stations at the same point is structurally undefined.
- Honest sites at ≤ 10 m of each other are vanishingly rare — that's inside the cone of a single antenna mount.
- Clusters of ≥ 4 stations in 100 m can be honest (industrial campus, surveying lab) but justify a manual look.
- An RTK base claiming a position with ≤ 2 decimal places (≥ 1 km uncertainty) is not a real CORS station; the public network shouldn't surface them.

For an authoritative per-device GETKINETIK grade (hardware-rooted signature, chain age, tamper flags), the network or operator can POST a Proof of Origin URL to `https://getkinetik.app/api/verify-device`.

Contact: **eric@outfromnothingllc.com** · https://getkinetik.app/bureau/ · https://getkinetik.app/api/docs/
