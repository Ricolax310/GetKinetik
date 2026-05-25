# Sybil Risk Scan — Geodnet RTK Network

> Independent public read by the GETKINETIK Bureau using only Geodnet's public station endpoint. **No internal Geodnet data was used.** Geodnet RTK stations are surveyed GNSS reference units — each one is supposed to be a unique, physically installed antenna at a fixed coordinate. The heuristics below treat that as the structural rule and flag exceptions.

- **As of:** 2026-05-25
- **Public source:** `https://rtk.geodnet.com/api/v2/coverage_stations`
- **Stations observed:** 19,676
- **Stations flagged (any heuristic):** 1,839 (9.35%)

## Executive summary

1. **8 exact (lat,lng) duplicate groups** on 19,676 public stations — each row in §1 is one coordinate pair your registry team can grep today.
2. **925 ≤10 m proximity clusters** — tighter than two physical RTK antennas; start with the largest counts in §2 (names + anchors included).
3. **9.3%** of the public fleet touches at least one heuristic — useful as a sampling denominator, not a verdict.

---

## Since last snapshot

| Metric | This run | vs last run |
|---|---:|---|
| Stations with coordinates | 19,676 | -10 (-0.1%) |
| Exact (lat,lng) duplicate groups | 8 | -1 (-11.1%) |
| Clusters within 10 m | 925 | -6 (-0.6%) |
| Clusters ≥4 within 100 m | 4 | -1 (-20.0%) |
| Low-precision coordinates (≤2 decimals) | 6 | -1 (-14.3%) |
| Fleet share flagged (any heuristic) | 9.35% | -0.08 pp (-0.9%) |

## What to cross-check this week

1. Registry dedupe: for each §1 coordinate pair, confirm whether multiple station IDs should share one surveyed antenna location.
2. Field ops: spot-check §3 tight clusters (≥4 within 100 m) — industrial campus vs duplicate registrations.
3. Data quality: stations in §4 with ≤2 decimal places should not appear as RTK references until coordinates are re-surveyed.
4. Reproduce: `node scripts/sybil-scan-geodnet.mjs` — same public endpoint, no API key.

> Public-data read. Re-run: script in `scripts/`, source URL in report header.

---

## Headline findings

1. **8 groups of stations share an exact (lat, lng) pair.** For a CORS / RTK reference network, two stations at identical coordinates is structurally undefined — there is no second-antenna position to triangulate from.
2. **925 clusters of stations sit within 10 m of each other.** That's tighter than the physical separation of two real RTK installs.
3. **4 clusters have ≥4 stations within 100 m.** Plausible for an industrial campus or surveying yard, but the names + counts are worth reviewing.
4. **6 stations publish coordinates with ≤ 2 decimal places** (≥ 1 km uncertainty). For RTK that's structurally wrong; coordinates should be 5+ decimals.

---

## 1. Exact-coordinate duplicates — 8 groups

| Coordinates | Station count | Names |
|---|---:|---|
| `52.915047, 6.608888` | 2 | `****0WSRA`, `****0WSRT` |
| `45.867654, -108.770754` | 2 | `****10DA5`, `****3A7F8` |
| `41.613011, -93.531318` | 2 | `****E2162`, `****E2162` |
| `29.396958, -98.424097` | 2 | `****CAE6C`, `****CAE6C` |
| `33.947162, -78.30891` | 2 | `****20C40`, `****20C40` |
| `37.95789, -83.709717` | 2 | `****D2EC4`, `****D2EC4` |
| `42.372772, -71.181738` | 2 | `****C6D12`, `****C6D12` |
| `35.209193, -82.242023` | 2 | `****6E64A`, `****6E64A` |

## 2. Near-duplicate stations within 10 m — 925 clusters

| Anchor (lat, lng) | Station count | Names (truncated) |
|---|---:|---|
| 37.40035, -121.98159 | 4 | `****7AE7D`, `****67341`, `****60485`, `G001` |
| 40.36905, -111.92538 | 4 | `****20126`, `****31838`, `****C8D82`, `****6A19E` |
| 37.39896, -121.97462 | 3 | `****20E08`, `****BFCDA`, `****CDEB6` |
| 37.39914, -121.97470 | 3 | `****C3D1A`, `****0A9F4`, `****21B48` |
| 11.39350, 79.71033 | 3 | `****0A9B6`, `****EBA05`, `****B7DC0` |
| 49.11271, 16.77542 | 3 | `****BFD26`, `****FDBED`, `****13BD2` |
| 35.20919, -82.24200 | 3 | `****2F569`, `****6E64A`, `****6E64A` |
| -27.54748, 153.08840 | 3 | `****EE73D`, `****FBE61`, `****60459` |
| 30.55156, -88.21427 | 3 | `****FE291`, `****C3CFA`, `****09A2E` |
| 48.78485, 15.15608 | 2 | `****D2E8A`, `****1A46D` |

_…and 915 more in the snapshot file._

## 3. Tight clusters (≥4 within 100 m) — 4 clusters

| Anchor (lat, lng) | Station count |
|---|---:|
| 37.39896, -121.97462 | 7 |
| 37.40035, -121.98159 | 5 |
| 40.36903, -111.92558 | 5 |
| 43.01620, -82.33764 | 4 |

## 4. Stations with ≤ 2 decimal places of coordinate precision — 6

| Name | Lat | Lng |
|---|---:|---:|
| `****14E95` | 52.58 | 17.653724 |
| `****CC72D` | -32.547631 | 27.01 |
| `****D6359` | 38.19 | 39.413605 |
| `****B6E12` | 26.62 | -81.963262 |
| `****EDE09` | 34.452125 | -80.14 |
| `****3F151` | 8.766916 | 76.96 |

---

## Methodology

Each finding is grounded in how a real CORS / RTK network is physically supposed to look:
- A surveyed GNSS reference station occupies one antenna at one coordinate. Two stations at the same point is structurally undefined.
- Honest sites at ≤ 10 m of each other are vanishingly rare — that's inside the cone of a single antenna mount.
- Clusters of ≥ 4 stations in 100 m can be honest (industrial campus, surveying lab) but justify a manual look.
- An RTK base claiming a position with ≤ 2 decimal places (≥ 1 km uncertainty) is not a real CORS station; the public network shouldn't surface them.

For an authoritative per-device GETKINETIK grade (hardware-rooted signature, chain age, tamper flags), the network or operator can POST a Proof of Origin URL to `https://getkinetik.app/api/verify-device`.

Contact: **eric@outfromnothingllc.com** · https://getkinetik.app/bureau/ · https://getkinetik.app/api/docs/
