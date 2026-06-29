# Sybil Risk Scan — Geodnet RTK Network

> Independent public read by the GETKINETIK Bureau using only Geodnet's public station endpoint. **No internal Geodnet data was used.** Geodnet RTK stations are surveyed GNSS reference units — each one is supposed to be a unique, physically installed antenna at a fixed coordinate. The heuristics below treat that as the structural rule and flag exceptions.

- **As of:** 2026-06-29
- **Public source:** `https://rtk.geodnet.com/api/v2/coverage_stations`
- **Stations observed:** 19,582
- **Stations flagged (any heuristic):** 1,822 (9.30%)

## Executive summary

1. **6 exact (lat,lng) duplicate groups** on 19,582 public stations — each row in §1 is one coordinate pair your registry team can grep today.
2. **914 ≤10 m proximity clusters** — tighter than two physical RTK antennas; start with the largest counts in §2 (names + anchors included).
3. **9.3%** of the public fleet touches at least one heuristic — useful as a sampling denominator, not a verdict.

---

## Since last snapshot

| Metric | This run | vs last run |
|---|---:|---|
| Stations with coordinates | 19,582 | +7 (+0.0%) |
| Exact (lat,lng) duplicate groups | 6 | -3 (-33.3%) |
| Clusters within 10 m | 914 | -4 (-0.4%) |
| Clusters ≥4 within 100 m | 4 | unchanged vs last run |
| Low-precision coordinates (≤2 decimals) | 9 | +5 (+125.0%) |
| Fleet share flagged (any heuristic) | 9.30% | -0.03 pp (-0.3%) |

## What to cross-check this week

1. Registry dedupe: for each §1 coordinate pair, confirm whether multiple station IDs should share one surveyed antenna location.
2. Field ops: spot-check §3 tight clusters (≥4 within 100 m) — industrial campus vs duplicate registrations.
3. Data quality: stations in §4 with ≤2 decimal places should not appear as RTK references until coordinates are re-surveyed.
4. Reproduce: `node scripts/sybil-scan-geodnet.mjs` — same public endpoint, no API key.

> Public-data read. Re-run: script in `scripts/`, source URL in report header.

---

## Headline findings

1. **6 groups of stations share an exact (lat, lng) pair.** For a CORS / RTK reference network, two stations at identical coordinates is structurally undefined — there is no second-antenna position to triangulate from.
2. **914 clusters of stations sit within 10 m of each other.** That's tighter than the physical separation of two real RTK installs.
3. **4 clusters have ≥4 stations within 100 m.** Plausible for an industrial campus or surveying yard, but the names + counts are worth reviewing.
4. **9 stations publish coordinates with ≤ 2 decimal places** (≥ 1 km uncertainty). For RTK that's structurally wrong; coordinates should be 5+ decimals.

---

## 1. Exact-coordinate duplicates — 6 groups

| Coordinates | Station count | Names |
|---|---:|---|
| `52.914902, 6.600265` | 2 | `****0WSRA`, `****0WSRT` |
| `41.612865, -93.539941` | 2 | `****E2162`, `****E2162` |
| `29.396813, -98.43272` | 2 | `****CAE6C`, `****CAE6C` |
| `33.947017, -78.317534` | 2 | `****20C40`, `****20C40` |
| `42.372627, -71.190361` | 2 | `****C6D12`, `****C6D12` |
| `35.209047, -82.250646` | 2 | `****6E64A`, `****6E64A` |

## 2. Near-duplicate stations within 10 m — 914 clusters

| Anchor (lat, lng) | Station count | Names (truncated) |
|---|---:|---|
| 37.40020, -121.99022 | 4 | `****7AE7D`, `****67341`, `****60485`, `G001` |
| 40.36891, -111.93401 | 4 | `****20126`, `****31838`, `****C8D82`, `****6A19E` |
| 37.39893, -121.98363 | 3 | `****C1C72`, `****0DCB8`, `****D0E48` |
| 54.44477, 23.24885 | 3 | `****0B99A`, `****F3D55`, `****0DC58` |
| 35.20904, -82.25063 | 3 | `****2F569`, `****6E64A`, `****6E64A` |
| -27.54763, 153.07978 | 3 | `****EE73D`, `****FBE61`, `****60459` |
| 30.55141, -88.22290 | 3 | `****FE291`, `****C3CFA`, `****09A2E` |
| 38.37195, 21.43023 | 2 | `****DB39D`, `****C1BE8` |
| 40.77743, 21.39692 | 2 | `****3E29C`, `****9FCD9` |
| 38.21623, 37.17929 | 2 | `****32774`, `****84141` |

_…and 904 more in the snapshot file._

## 3. Tight clusters (≥4 within 100 m) — 4 clusters

| Anchor (lat, lng) | Station count |
|---|---:|
| 37.40020, -121.99022 | 5 |
| 40.36889, -111.93421 | 5 |
| 37.39893, -121.98363 | 4 |
| 43.01611, -82.34628 | 4 |

## 4. Stations with ≤ 2 decimal places of coordinate precision — 9

| Name | Lat | Lng |
|---|---:|---:|
| `****14D1D` | 39.57 | -8.926708 |
| `****00941` | 37.789916 | 28.06 |
| `****65EB5` | 42.83 | 26.698086 |
| `****11511` | -33.958757 | 22.44 |
| `****E60B9` | 47.36 | 13.165778 |
| `****BFCB8` | 38.7 | -93.201129 |
| `****B492D` | 4.506493 | -75.99 |
| `****20CB2` | -33.958729 | 22.44 |
| `****C2CFD` | 55.41 | 23.724255 |

---

## Methodology

Each finding is grounded in how a real CORS / RTK network is physically supposed to look:
- A surveyed GNSS reference station occupies one antenna at one coordinate. Two stations at the same point is structurally undefined.
- Honest sites at ≤ 10 m of each other are vanishingly rare — that's inside the cone of a single antenna mount.
- Clusters of ≥ 4 stations in 100 m can be honest (industrial campus, surveying lab) but justify a manual look.
- An RTK base claiming a position with ≤ 2 decimal places (≥ 1 km uncertainty) is not a real CORS station; the public network shouldn't surface them.

For an authoritative per-device GETKINETIK grade (hardware-rooted signature, chain age, tamper flags), the network or operator can POST a Proof of Origin URL to `https://getkinetik.app/api/verify-device`.

Contact: **eric@outfromnothingllc.com** · https://getkinetik.app/bureau/ · https://getkinetik.app/api/docs/
