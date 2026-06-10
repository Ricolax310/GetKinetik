# Sybil Risk Scan — Geodnet RTK Network

> Independent public read by the GETKINETIK Bureau using only Geodnet's public station endpoint. **No internal Geodnet data was used.** Geodnet RTK stations are surveyed GNSS reference units — each one is supposed to be a unique, physically installed antenna at a fixed coordinate. The heuristics below treat that as the structural rule and flag exceptions.

- **As of:** 2026-06-10
- **Public source:** `https://rtk.geodnet.com/api/v2/coverage_stations`
- **Stations observed:** 19,604
- **Stations flagged (any heuristic):** 1,831 (9.34%)

## Executive summary

1. **8 exact (lat,lng) duplicate groups** on 19,604 public stations — each row in §1 is one coordinate pair your registry team can grep today.
2. **918 ≤10 m proximity clusters** — tighter than two physical RTK antennas; start with the largest counts in §2 (names + anchors included).
3. **9.3%** of the public fleet touches at least one heuristic — useful as a sampling denominator, not a verdict.

---

## Since last snapshot

| Metric | This run | vs last run |
|---|---:|---|
| Stations with coordinates | 19,604 | -12 (-0.1%) |
| Exact (lat,lng) duplicate groups | 8 | -3 (-27.3%) |
| Clusters within 10 m | 918 | -4 (-0.4%) |
| Clusters ≥4 within 100 m | 5 | +1 (+25.0%) |
| Low-precision coordinates (≤2 decimals) | 4 | unchanged vs last run |
| Fleet share flagged (any heuristic) | 9.34% | -0.00 pp (-0.0%) |

## What to cross-check this week

1. Registry dedupe: for each §1 coordinate pair, confirm whether multiple station IDs should share one surveyed antenna location.
2. Field ops: spot-check §3 tight clusters (≥4 within 100 m) — industrial campus vs duplicate registrations.
3. Data quality: stations in §4 with ≤2 decimal places should not appear as RTK references until coordinates are re-surveyed.
4. Reproduce: `node scripts/sybil-scan-geodnet.mjs` — same public endpoint, no API key.

> Public-data read. Re-run: script in `scripts/`, source URL in report header.

---

## Headline findings

1. **8 groups of stations share an exact (lat, lng) pair.** For a CORS / RTK reference network, two stations at identical coordinates is structurally undefined — there is no second-antenna position to triangulate from.
2. **918 clusters of stations sit within 10 m of each other.** That's tighter than the physical separation of two real RTK installs.
3. **5 clusters have ≥4 stations within 100 m.** Plausible for an industrial campus or surveying yard, but the names + counts are worth reviewing.
4. **4 stations publish coordinates with ≤ 2 decimal places** (≥ 1 km uncertainty). For RTK that's structurally wrong; coordinates should be 5+ decimals.

---

## 1. Exact-coordinate duplicates — 8 groups

| Coordinates | Station count | Names |
|---|---:|---|
| `37.957284, -83.710077` | 2 | `****D2EC4`, `****D2EC4` |
| `52.914442, 6.608528` | 2 | `****0WSRT`, `****0WSRA` |
| `43.069307, -89.555609` | 2 | `****1C301`, `****18F55` |
| `41.612405, -93.531678` | 2 | `****E2162`, `****E2162` |
| `29.396352, -98.424457` | 2 | `****CAE6C`, `****CAE6C` |
| `33.946557, -78.309271` | 2 | `****20C40`, `****20C40` |
| `42.372167, -71.182098` | 2 | `****C6D12`, `****C6D12` |
| `35.208587, -82.242383` | 2 | `****6E64A`, `****6E64A` |

## 2. Near-duplicate stations within 10 m — 918 clusters

| Anchor (lat, lng) | Station count | Names (truncated) |
|---|---:|---|
| 45.73103, 8.78012 | 4 | `****F7CE2`, `****DF080`, `****0B68D`, `****C1C26` |
| 37.39975, -121.98195 | 4 | `****7AE7D`, `****67341`, `****60485`, `G001` |
| 40.36845, -111.92574 | 4 | `****20126`, `****31838`, `****C8D82`, `****6A19E` |
| 30.05393, -99.14686 | 3 | `****21B94`, `****79F65`, `****6A182` |
| 12.96697, 77.75973 | 3 | `****C39A5`, `****BD68D`, `****503D1` |
| 42.99766, 22.94407 | 3 | `****E2130`, `****DB8A9`, `****CBDE6` |
| 37.39847, -121.97536 | 3 | `****D2EF2`, `****CAE50`, `****CBE2C` |
| 35.20858, -82.24236 | 3 | `****2F569`, `****6E64A`, `****6E64A` |
| -27.54809, 153.08804 | 3 | `****EE73D`, `****FBE61`, `****60459` |
| 46.77667, 15.56179 | 3 | `****16991`, `****1DF01`, `****6A152` |

_…and 908 more in the snapshot file._

## 3. Tight clusters (≥4 within 100 m) — 5 clusters

| Anchor (lat, lng) | Station count |
|---|---:|
| 37.39795, -121.97486 | 5 |
| 37.39975, -121.98195 | 5 |
| 40.36843, -111.92594 | 5 |
| 45.73103, 8.78012 | 4 |
| 43.01564, -82.33802 | 4 |

## 4. Stations with ≤ 2 decimal places of coordinate precision — 4

| Name | Lat | Lng |
|---|---:|---:|
| `****29B65` | 49.916211 | 15.82 |
| `****007E9` | 43.172967 | -88.11 |
| `****0C999` | 42.96 | 12.002511 |
| `****699D4` | -22.615787 | -46.05 |

---

## Methodology

Each finding is grounded in how a real CORS / RTK network is physically supposed to look:
- A surveyed GNSS reference station occupies one antenna at one coordinate. Two stations at the same point is structurally undefined.
- Honest sites at ≤ 10 m of each other are vanishingly rare — that's inside the cone of a single antenna mount.
- Clusters of ≥ 4 stations in 100 m can be honest (industrial campus, surveying lab) but justify a manual look.
- An RTK base claiming a position with ≤ 2 decimal places (≥ 1 km uncertainty) is not a real CORS station; the public network shouldn't surface them.

For an authoritative per-device GETKINETIK grade (hardware-rooted signature, chain age, tamper flags), the network or operator can POST a Proof of Origin URL to `https://getkinetik.app/api/verify-device`.

Contact: **eric@outfromnothingllc.com** · https://getkinetik.app/bureau/ · https://getkinetik.app/api/docs/
