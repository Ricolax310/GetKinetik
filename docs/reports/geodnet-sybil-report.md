# Sybil Risk Scan — Geodnet RTK Network

> Independent public read by the GETKINETIK Bureau using only Geodnet's public station endpoint. **No internal Geodnet data was used.** Geodnet RTK stations are surveyed GNSS reference units — each one is supposed to be a unique, physically installed antenna at a fixed coordinate. The heuristics below treat that as the structural rule and flag exceptions.

- **As of:** 2026-05-24
- **Public source:** `https://rtk.geodnet.com/api/v2/coverage_stations`
- **Stations observed:** 19,686
- **Stations flagged (any heuristic):** 1,856 (9.43%)

## Executive summary

1. **9 exact (lat,lng) duplicate groups** on 19,686 public stations — each row in §1 is one coordinate pair your registry team can grep today.
2. **931 ≤10 m proximity clusters** — tighter than two physical RTK antennas; start with the largest counts in §2 (names + anchors included).
3. **9.4%** of the public fleet touches at least one heuristic — useful as a sampling denominator, not a verdict.

---

## Since last snapshot

| Metric | This run | vs last run |
|---|---:|---|
| Stations with coordinates | 19,686 | -2 (-0.0%) |
| Exact (lat,lng) duplicate groups | 9 | -1 (-10.0%) |
| Clusters within 10 m | 931 | unchanged vs last run |
| Clusters ≥4 within 100 m | 5 | unchanged vs last run |
| Low-precision coordinates (≤2 decimals) | 7 | +2 (+40.0%) |
| Fleet share flagged (any heuristic) | 9.43% | +0.00 pp (+0.0%) |

## What to cross-check this week

1. Registry dedupe: for each §1 coordinate pair, confirm whether multiple station IDs should share one surveyed antenna location.
2. Field ops: spot-check §3 tight clusters (≥4 within 100 m) — industrial campus vs duplicate registrations.
3. Data quality: stations in §4 with ≤2 decimal places should not appear as RTK references until coordinates are re-surveyed.
4. Reproduce: `node scripts/sybil-scan-geodnet.mjs` — same public endpoint, no API key.

> Public-data read. Re-run: script in `scripts/`, source URL in report header.

---

## Headline findings

1. **9 groups of stations share an exact (lat, lng) pair.** For a CORS / RTK reference network, two stations at identical coordinates is structurally undefined — there is no second-antenna position to triangulate from.
2. **931 clusters of stations sit within 10 m of each other.** That's tighter than the physical separation of two real RTK installs.
3. **5 clusters have ≥4 stations within 100 m.** Plausible for an industrial campus or surveying yard, but the names + counts are worth reviewing.
4. **7 stations publish coordinates with ≤ 2 decimal places** (≥ 1 km uncertainty). For RTK that's structurally wrong; coordinates should be 5+ decimals.

---

## 1. Exact-coordinate duplicates — 9 groups

| Coordinates | Station count | Names |
|---|---:|---|
| `51.985736, 4.388746` | 6 | `****0DLF8`, `****3DLFV`, `****0DLF5`, `****0DLF1`, `****0DLF6`, `****0DLF4` |
| `49.638168, 9.35515` | 2 | `****5302D`, `****6A80A` |
| `52.914328, 6.605791` | 2 | `****0WSRA`, `****0WSRT` |
| `41.612291, -93.534415` | 2 | `****E2162`, `****E2162` |
| `29.396239, -98.427195` | 2 | `****CAE6C`, `****CAE6C` |
| `33.946443, -78.312008` | 2 | `****20C40`, `****20C40` |
| `37.957171, -83.712815` | 2 | `****D2EC4`, `****D2EC4` |
| `42.372053, -71.184835` | 2 | `****C6D12`, `****C6D12` |
| `35.208474, -82.245121` | 2 | `****6E64A`, `****6E64A` |

## 2. Near-duplicate stations within 10 m — 931 clusters

| Anchor (lat, lng) | Station count | Names (truncated) |
|---|---:|---|
| 51.98574, 4.38875 | 6 | `****0DLF8`, `****3DLFV`, `****0DLF5`, `****0DLF1`, `****0DLF6`, `****0DLF4` |
| 37.39963, -121.98469 | 4 | `****7AE7D`, `****67341`, `****60485`, `G001` |
| 40.36833, -111.92848 | 4 | `****20126`, `****31838`, `****C8D82`, `****6A19E` |
| 37.39825, -121.97771 | 3 | `****20E08`, `****BFCDA`, `****CDEB6` |
| 37.39842, -121.97779 | 3 | `****C3D1A`, `****0A9F4`, `****21B48` |
| 11.39278, 79.70723 | 3 | `****0A9B6`, `****EBA05`, `****B7DC0` |
| 49.11199, 16.77232 | 3 | `****BFD26`, `****FDBED`, `****13BD2` |
| 35.20847, -82.24510 | 3 | `****2F569`, `****6E64A`, `****6E64A` |
| -27.54820, 153.08530 | 3 | `****EE73D`, `****FBE61`, `****60459` |
| 30.55084, -88.21737 | 3 | `****FE291`, `****C3CFA`, `****09A2E` |

_…and 921 more in the snapshot file._

## 3. Tight clusters (≥4 within 100 m) — 5 clusters

| Anchor (lat, lng) | Station count |
|---|---:|
| 51.98584, 4.38887 | 7 |
| 37.39825, -121.97771 | 7 |
| 37.39963, -121.98469 | 5 |
| 40.36831, -111.92868 | 5 |
| 43.01553, -82.34076 | 4 |

## 4. Stations with ≤ 2 decimal places of coordinate precision — 7

| Name | Lat | Lng |
|---|---:|---:|
| `NOOJ` | -37.89 | 145.99755 |
| `****10A8D` | 23.16 | 72.38478 |
| `****209E1` | 46.39 | 20.114269 |
| `****29B91` | 39.79 | -75.171513 |
| `****725A9` | 4.910334 | 100.71 |
| `****19C75` | -12.389522 | -54.93 |
| `****E3BE5` | -4.177006 | 105.38 |

---

## Methodology

Each finding is grounded in how a real CORS / RTK network is physically supposed to look:
- A surveyed GNSS reference station occupies one antenna at one coordinate. Two stations at the same point is structurally undefined.
- Honest sites at ≤ 10 m of each other are vanishingly rare — that's inside the cone of a single antenna mount.
- Clusters of ≥ 4 stations in 100 m can be honest (industrial campus, surveying lab) but justify a manual look.
- An RTK base claiming a position with ≤ 2 decimal places (≥ 1 km uncertainty) is not a real CORS station; the public network shouldn't surface them.

For an authoritative per-device GETKINETIK grade (hardware-rooted signature, chain age, tamper flags), the network or operator can POST a Proof of Origin URL to `https://getkinetik.app/api/verify-device`.

Contact: **eric@outfromnothingllc.com** · https://getkinetik.app/bureau/ · https://getkinetik.app/api/docs/
