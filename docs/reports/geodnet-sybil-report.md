# Sybil Risk Scan — Geodnet RTK Network

> Independent public read by the GETKINETIK Bureau using only Geodnet's public station endpoint. **No internal Geodnet data was used.** Geodnet RTK stations are surveyed GNSS reference units — each one is supposed to be a unique, physically installed antenna at a fixed coordinate. The heuristics below treat that as the structural rule and flag exceptions.

- **As of:** 2026-07-30
- **Public source:** `https://rtk.geodnet.com/api/v2/coverage_stations`
- **Stations observed:** 19,594
- **Stations flagged (any heuristic):** 1,783 (9.10%)

## Executive summary

1. **5 exact (lat,lng) duplicate groups** on 19,594 public stations — each row in §1 is one coordinate pair your registry team can grep today.
2. **898 ≤10 m proximity clusters** — tighter than two physical RTK antennas; start with the largest counts in §2 (names + anchors included).
3. **9.1%** of the public fleet touches at least one heuristic — useful as a sampling denominator, not a verdict.

---

## Since last snapshot

| Metric | This run | vs last run |
|---|---:|---|
| Stations with coordinates | 19,594 | +3 (+0.0%) |
| Exact (lat,lng) duplicate groups | 5 | -2 (-28.6%) |
| Clusters within 10 m | 898 | +1 (+0.1%) |
| Clusters ≥4 within 100 m | 3 | unchanged vs last run |
| Low-precision coordinates (≤2 decimals) | 5 | unchanged vs last run |
| Fleet share flagged (any heuristic) | 9.10% | +0.01 pp (+0.2%) |

## What to cross-check this week

1. Registry dedupe: for each §1 coordinate pair, confirm whether multiple station IDs should share one surveyed antenna location.
2. Field ops: spot-check §3 tight clusters (≥4 within 100 m) — industrial campus vs duplicate registrations.
3. Data quality: stations in §4 with ≤2 decimal places should not appear as RTK references until coordinates are re-surveyed.
4. Reproduce: `node scripts/sybil-scan-geodnet.mjs` — same public endpoint, no API key.

> Public-data read. Re-run: script in `scripts/`, source URL in report header.

---

## Headline findings

1. **5 groups of stations share an exact (lat, lng) pair.** For a CORS / RTK reference network, two stations at identical coordinates is structurally undefined — there is no second-antenna position to triangulate from.
2. **898 clusters of stations sit within 10 m of each other.** That's tighter than the physical separation of two real RTK installs.
3. **3 clusters have ≥4 stations within 100 m.** Plausible for an industrial campus or surveying yard, but the names + counts are worth reviewing.
4. **5 stations publish coordinates with ≤ 2 decimal places** (≥ 1 km uncertainty). For RTK that's structurally wrong; coordinates should be 5+ decimals.

---

## 1. Exact-coordinate duplicates — 5 groups

| Coordinates | Station count | Names |
|---|---:|---|
| `52.914284, 6.607835` | 2 | `****0WSRA`, `****0WSRT` |
| `41.612248, -93.532371` | 2 | `****E2162`, `****E2162` |
| `29.396195, -98.425151` | 2 | `****CAE6C`, `****CAE6C` |
| `33.946399, -78.309964` | 2 | `****20C40`, `****20C40` |
| `35.20843, -82.243077` | 2 | `****6E64A`, `****6E64A` |

## 2. Near-duplicate stations within 10 m — 898 clusters

| Anchor (lat, lng) | Station count | Names (truncated) |
|---|---:|---|
| 40.36829, -111.92644 | 4 | `****20126`, `****31838`, `****C8D82`, `****6A19E` |
| 40.77713, 29.69244 | 3 | `****2186D`, `****81599`, `****3B246` |
| 37.39959, -121.98265 | 3 | `****7AE7D`, `****60485`, `G001` |
| 35.20843, -82.24306 | 3 | `****2F569`, `****6E64A`, `****6E64A` |
| -27.54825, 153.08734 | 3 | `****EE73D`, `****FBE61`, `****60459` |
| 41.60992, 41.64787 | 2 | `****C6D88`, `****794F9` |
| 24.93149, 67.25727 | 2 | `****21F0D`, `****0DB12` |
| 42.56676, 26.30237 | 2 | `****C8DB2`, `****11A06` |
| 42.64083, 26.30883 | 2 | `****0B9A0`, `****0B9B8` |
| 55.74240, 26.24370 | 2 | `****20D04`, `****69E78` |

_…and 888 more in the snapshot file._

## 3. Tight clusters (≥4 within 100 m) — 3 clusters

| Anchor (lat, lng) | Station count |
|---|---:|
| 37.39959, -121.98265 | 5 |
| 40.36827, -111.92664 | 5 |
| 43.01549, -82.33871 | 4 |

## 4. Stations with ≤ 2 decimal places of coordinate precision — 5

| Name | Lat | Lng |
|---|---:|---:|
| `****187D1` | 36.82 | 31.953992 |
| `****0B62D` | 44.888142 | -68.81 |
| `****E6C55` | 39.287567 | 27.15 |
| `****CDEAD` | 25.062189 | 55.22 |
| `****71C49` | 12.070634 | -86.18 |

---

## Methodology

Each finding is grounded in how a real CORS / RTK network is physically supposed to look:
- A surveyed GNSS reference station occupies one antenna at one coordinate. Two stations at the same point is structurally undefined.
- Honest sites at ≤ 10 m of each other are vanishingly rare — that's inside the cone of a single antenna mount.
- Clusters of ≥ 4 stations in 100 m can be honest (industrial campus, surveying lab) but justify a manual look.
- An RTK base claiming a position with ≤ 2 decimal places (≥ 1 km uncertainty) is not a real CORS station; the public network shouldn't surface them.

For an authoritative per-device GETKINETIK grade (hardware-rooted signature, chain age, tamper flags), the network or operator can POST a Proof of Origin URL to `https://getkinetik.app/api/verify-device`.

Contact: **eric@outfromnothingllc.com** · https://getkinetik.app/bureau/ · https://getkinetik.app/api/docs/
