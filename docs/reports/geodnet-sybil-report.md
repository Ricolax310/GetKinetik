# Sybil Risk Scan — Geodnet RTK Network

> Independent public read by the GETKINETIK Bureau using only Geodnet's public station endpoint. **No internal Geodnet data was used.** Geodnet RTK stations are surveyed GNSS reference units — each one is supposed to be a unique, physically installed antenna at a fixed coordinate. The heuristics below treat that as the structural rule and flag exceptions.

- **As of:** 2026-07-08
- **Public source:** `https://rtk.geodnet.com/api/v2/coverage_stations`
- **Stations observed:** 19,558
- **Stations flagged (any heuristic):** 1,784 (9.12%)

## Executive summary

1. **9 exact (lat,lng) duplicate groups** on 19,558 public stations — each row in §1 is one coordinate pair your registry team can grep today.
2. **898 ≤10 m proximity clusters** — tighter than two physical RTK antennas; start with the largest counts in §2 (names + anchors included).
3. **9.1%** of the public fleet touches at least one heuristic — useful as a sampling denominator, not a verdict.

---

## Since last snapshot

| Metric | This run | vs last run |
|---|---:|---|
| Stations with coordinates | 19,558 | -2 (-0.0%) |
| Exact (lat,lng) duplicate groups | 9 | unchanged vs last run |
| Clusters within 10 m | 898 | -4 (-0.4%) |
| Clusters ≥4 within 100 m | 4 | unchanged vs last run |
| Low-precision coordinates (≤2 decimals) | 1 | -6 (-85.7%) |
| Fleet share flagged (any heuristic) | 9.12% | -0.07 pp (-0.8%) |

## What to cross-check this week

1. Registry dedupe: for each §1 coordinate pair, confirm whether multiple station IDs should share one surveyed antenna location.
2. Field ops: spot-check §3 tight clusters (≥4 within 100 m) — industrial campus vs duplicate registrations.
3. Data quality: stations in §4 with ≤2 decimal places should not appear as RTK references until coordinates are re-surveyed.
4. Reproduce: `node scripts/sybil-scan-geodnet.mjs` — same public endpoint, no API key.

> Public-data read. Re-run: script in `scripts/`, source URL in report header.

---

## Headline findings

1. **9 groups of stations share an exact (lat, lng) pair.** For a CORS / RTK reference network, two stations at identical coordinates is structurally undefined — there is no second-antenna position to triangulate from.
2. **898 clusters of stations sit within 10 m of each other.** That's tighter than the physical separation of two real RTK installs.
3. **4 clusters have ≥4 stations within 100 m.** Plausible for an industrial campus or surveying yard, but the names + counts are worth reviewing.
4. **1 stations publish coordinates with ≤ 2 decimal places** (≥ 1 km uncertainty). For RTK that's structurally wrong; coordinates should be 5+ decimals.

---

## 1. Exact-coordinate duplicates — 9 groups

| Coordinates | Station count | Names |
|---|---:|---|
| `49.638297, 9.351465` | 2 | `****5302D`, `****6A80A` |
| `52.914456, 6.602106` | 2 | `****0WSRA`, `****0WSRT` |
| `45.867063, -108.777537` | 2 | `****10DA5`, `****3A7F8` |
| `43.069322, -89.562031` | 2 | `****1C301`, `****18F55` |
| `41.61242, -93.5381` | 2 | `****E2162`, `****E2162` |
| `29.396367, -98.43088` | 2 | `****CAE6C`, `****CAE6C` |
| `33.946572, -78.315693` | 2 | `****20C40`, `****20C40` |
| `42.372182, -71.18852` | 2 | `****C6D12`, `****C6D12` |
| `35.208602, -82.248806` | 2 | `****6E64A`, `****6E64A` |

## 2. Near-duplicate stations within 10 m — 898 clusters

| Anchor (lat, lng) | Station count | Names (truncated) |
|---|---:|---|
| 37.39976, -121.98837 | 4 | `****7AE7D`, `****67341`, `****60485`, `G001` |
| 40.36846, -111.93217 | 4 | `****20126`, `****31838`, `****C8D82`, `****6A19E` |
| 35.20860, -82.24879 | 3 | `****2F569`, `****6E64A`, `****6E64A` |
| -27.54808, 153.08162 | 3 | `****EE73D`, `****FBE61`, `****60459` |
| 30.55097, -88.22106 | 3 | `****FE291`, `****C3CFA`, `****09A2E` |
| 2.67999, 101.68400 | 2 | `****E0E49`, `****B8D58` |
| 37.39847, -121.98144 | 2 | `****6A826`, `****CBE10` |
| 52.31668, -112.71655 | 2 | `****AB43D`, `****15B12` |
| 1.15397, 101.24103 | 2 | `****A569D`, `****69D84` |
| 40.52009, -74.40576 | 2 | `****04661`, `****D2EAA` |

_…and 888 more in the snapshot file._

## 3. Tight clusters (≥4 within 100 m) — 4 clusters

| Anchor (lat, lng) | Station count |
|---|---:|
| 37.39847, -121.98144 | 5 |
| 37.39976, -121.98837 | 5 |
| 40.36844, -111.93237 | 5 |
| 43.01566, -82.34444 | 4 |

## 4. Stations with ≤ 2 decimal places of coordinate precision — 1

| Name | Lat | Lng |
|---|---:|---:|
| `****20BAC` | 48.93315 | 2.29 |

---

## Methodology

Each finding is grounded in how a real CORS / RTK network is physically supposed to look:
- A surveyed GNSS reference station occupies one antenna at one coordinate. Two stations at the same point is structurally undefined.
- Honest sites at ≤ 10 m of each other are vanishingly rare — that's inside the cone of a single antenna mount.
- Clusters of ≥ 4 stations in 100 m can be honest (industrial campus, surveying lab) but justify a manual look.
- An RTK base claiming a position with ≤ 2 decimal places (≥ 1 km uncertainty) is not a real CORS station; the public network shouldn't surface them.

For an authoritative per-device GETKINETIK grade (hardware-rooted signature, chain age, tamper flags), the network or operator can POST a Proof of Origin URL to `https://getkinetik.app/api/verify-device`.

Contact: **eric@outfromnothingllc.com** · https://getkinetik.app/bureau/ · https://getkinetik.app/api/docs/
