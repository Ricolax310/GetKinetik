# Sybil Risk Scan — Geodnet RTK Network

> Independent public read by the GETKINETIK Bureau using only Geodnet's public station endpoint. **No internal Geodnet data was used.** Geodnet RTK stations are surveyed GNSS reference units — each one is supposed to be a unique, physically installed antenna at a fixed coordinate. The heuristics below treat that as the structural rule and flag exceptions.

- **As of:** 2026-08-01
- **Public source:** `https://rtk.geodnet.com/api/v2/coverage_stations`
- **Stations observed:** 19,591
- **Stations flagged (any heuristic):** 1,776 (9.07%)

## Executive summary

1. **8 exact (lat,lng) duplicate groups** on 19,591 public stations — each row in §1 is one coordinate pair your registry team can grep today.
2. **895 ≤10 m proximity clusters** — tighter than two physical RTK antennas; start with the largest counts in §2 (names + anchors included).
3. **9.1%** of the public fleet touches at least one heuristic — useful as a sampling denominator, not a verdict.

---

## Since last snapshot

| Metric | This run | vs last run |
|---|---:|---|
| Stations with coordinates | 19,591 | +8 (+0.0%) |
| Exact (lat,lng) duplicate groups | 8 | +1 (+14.3%) |
| Clusters within 10 m | 895 | +3 (+0.3%) |
| Clusters ≥4 within 100 m | 3 | unchanged vs last run |
| Low-precision coordinates (≤2 decimals) | 4 | +2 (+100.0%) |
| Fleet share flagged (any heuristic) | 9.07% | +0.04 pp (+0.4%) |

## What to cross-check this week

1. Registry dedupe: for each §1 coordinate pair, confirm whether multiple station IDs should share one surveyed antenna location.
2. Field ops: spot-check §3 tight clusters (≥4 within 100 m) — industrial campus vs duplicate registrations.
3. Data quality: stations in §4 with ≤2 decimal places should not appear as RTK references until coordinates are re-surveyed.
4. Reproduce: `node scripts/sybil-scan-geodnet.mjs` — same public endpoint, no API key.

> Public-data read. Re-run: script in `scripts/`, source URL in report header.

---

## Headline findings

1. **8 groups of stations share an exact (lat, lng) pair.** For a CORS / RTK reference network, two stations at identical coordinates is structurally undefined — there is no second-antenna position to triangulate from.
2. **895 clusters of stations sit within 10 m of each other.** That's tighter than the physical separation of two real RTK installs.
3. **3 clusters have ≥4 stations within 100 m.** Plausible for an industrial campus or surveying yard, but the names + counts are worth reviewing.
4. **4 stations publish coordinates with ≤ 2 decimal places** (≥ 1 km uncertainty). For RTK that's structurally wrong; coordinates should be 5+ decimals.

---

## 1. Exact-coordinate duplicates — 8 groups

| Coordinates | Station count | Names |
|---|---:|---|
| `33.946878, -78.314645` | 2 | `****20C40`, `****20C40` |
| `49.638603, 9.352513` | 2 | `****5302D`, `****6A80A` |
| `45.887852, -90.832192` | 2 | `****379D9`, `****09A46` |
| `52.914763, 6.603154` | 2 | `****0WSRA`, `****0WSRT` |
| `43.069628, -89.560983` | 2 | `****18F55`, `****1C301` |
| `41.612726, -93.537053` | 2 | `****E2162`, `****E2162` |
| `29.396673, -98.429832` | 2 | `****CAE6C`, `****CAE6C` |
| `35.208908, -82.247758` | 2 | `****6E64A`, `****6E64A` |

## 2. Near-duplicate stations within 10 m — 895 clusters

| Anchor (lat, lng) | Station count | Names (truncated) |
|---|---:|---|
| 40.36877, -111.93112 | 4 | `****20126`, `****31838`, `****C8D82`, `****6A19E` |
| 40.77761, 29.68776 | 3 | `****2186D`, `****81599`, `****3B246` |
| 37.40007, -121.98733 | 3 | `****7AE7D`, `****60485`, `G001` |
| 35.20890, -82.24774 | 3 | `****2F569`, `****6E64A`, `****6E64A` |
| -27.54777, 153.08266 | 3 | `****EE73D`, `****FBE61`, `****60459` |
| 39.72208, -84.16255 | 2 | `****007AD`, `****20201` |
| 54.50420, 9.60265 | 2 | `****A051D`, `****1EDC2` |
| 38.11744, -7.44345 | 2 | `****E6559`, `****099AA` |
| 53.64297, 11.40741 | 2 | `****4F21B`, `****21BD8` |
| 19.34639, 73.55881 | 2 | `****3F39D`, `****B0600` |

_…and 885 more in the snapshot file._

## 3. Tight clusters (≥4 within 100 m) — 3 clusters

| Anchor (lat, lng) | Station count |
|---|---:|
| 37.40007, -121.98733 | 5 |
| 40.36875, -111.93132 | 5 |
| 43.01597, -82.34339 | 4 |

## 4. Stations with ≤ 2 decimal places of coordinate precision — 4

| Name | Lat | Lng |
|---|---:|---:|
| `****5CE15` | 51.289311 | 7.24 |
| `****114D5` | 43.0135 | -83.67 |
| `****C4AB1` | -4.64 | 105.194583 |
| `****6E528` | 52.37 | 6.01662 |

---

## Methodology

Each finding is grounded in how a real CORS / RTK network is physically supposed to look:
- A surveyed GNSS reference station occupies one antenna at one coordinate. Two stations at the same point is structurally undefined.
- Honest sites at ≤ 10 m of each other are vanishingly rare — that's inside the cone of a single antenna mount.
- Clusters of ≥ 4 stations in 100 m can be honest (industrial campus, surveying lab) but justify a manual look.
- An RTK base claiming a position with ≤ 2 decimal places (≥ 1 km uncertainty) is not a real CORS station; the public network shouldn't surface them.

For an authoritative per-device GETKINETIK grade (hardware-rooted signature, chain age, tamper flags), the network or operator can POST a Proof of Origin URL to `https://getkinetik.app/api/verify-device`.

Contact: **eric@outfromnothingllc.com** · https://getkinetik.app/bureau/ · https://getkinetik.app/api/docs/
