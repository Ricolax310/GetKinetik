# Sybil Risk Scan — Geodnet RTK Network

> Independent public read by the GETKINETIK Bureau using only Geodnet's public station endpoint. **No internal Geodnet data was used.** Geodnet RTK stations are surveyed GNSS reference units — each one is supposed to be a unique, physically installed antenna at a fixed coordinate. The heuristics below treat that as the structural rule and flag exceptions.

- **As of:** 2026-06-30
- **Public source:** `https://rtk.geodnet.com/api/v2/coverage_stations`
- **Stations observed:** 19,580
- **Stations flagged (any heuristic):** 1,823 (9.31%)

## Executive summary

1. **9 exact (lat,lng) duplicate groups** on 19,580 public stations — each row in §1 is one coordinate pair your registry team can grep today.
2. **917 ≤10 m proximity clusters** — tighter than two physical RTK antennas; start with the largest counts in §2 (names + anchors included).
3. **9.3%** of the public fleet touches at least one heuristic — useful as a sampling denominator, not a verdict.

---

## Since last snapshot

| Metric | This run | vs last run |
|---|---:|---|
| Stations with coordinates | 19,580 | +8 (+0.0%) |
| Exact (lat,lng) duplicate groups | 9 | unchanged vs last run |
| Clusters within 10 m | 917 | unchanged vs last run |
| Clusters ≥4 within 100 m | 5 | unchanged vs last run |
| Low-precision coordinates (≤2 decimals) | 3 | -4 (-57.1%) |
| Fleet share flagged (any heuristic) | 9.31% | -0.02 pp (-0.3%) |

## What to cross-check this week

1. Registry dedupe: for each §1 coordinate pair, confirm whether multiple station IDs should share one surveyed antenna location.
2. Field ops: spot-check §3 tight clusters (≥4 within 100 m) — industrial campus vs duplicate registrations.
3. Data quality: stations in §4 with ≤2 decimal places should not appear as RTK references until coordinates are re-surveyed.
4. Reproduce: `node scripts/sybil-scan-geodnet.mjs` — same public endpoint, no API key.

> Public-data read. Re-run: script in `scripts/`, source URL in report header.

---

## Headline findings

1. **9 groups of stations share an exact (lat, lng) pair.** For a CORS / RTK reference network, two stations at identical coordinates is structurally undefined — there is no second-antenna position to triangulate from.
2. **917 clusters of stations sit within 10 m of each other.** That's tighter than the physical separation of two real RTK installs.
3. **5 clusters have ≥4 stations within 100 m.** Plausible for an industrial campus or surveying yard, but the names + counts are worth reviewing.
4. **3 stations publish coordinates with ≤ 2 decimal places** (≥ 1 km uncertainty). For RTK that's structurally wrong; coordinates should be 5+ decimals.

---

## 1. Exact-coordinate duplicates — 9 groups

| Coordinates | Station count | Names |
|---|---:|---|
| `49.638834, 9.358763` | 2 | `****5302D`, `****6A80A` |
| `52.914994, 6.609404` | 2 | `****0WSRA`, `****0WSRT` |
| `45.8676, -108.770239` | 2 | `****10DA5`, `****3A7F8` |
| `43.069859, -89.554733` | 2 | `****18F55`, `****1C301` |
| `41.612957, -93.530802` | 2 | `****E2162`, `****E2162` |
| `29.396905, -98.423582` | 2 | `****CAE6C`, `****CAE6C` |
| `33.947109, -78.308395` | 2 | `****20C40`, `****20C40` |
| `42.372719, -71.181222` | 2 | `****C6D12`, `****C6D12` |
| `35.209139, -82.241508` | 2 | `****6E64A`, `****6E64A` |

## 2. Near-duplicate stations within 10 m — 917 clusters

| Anchor (lat, lng) | Station count | Names (truncated) |
|---|---:|---|
| 37.40030, -121.98108 | 4 | `****7AE7D`, `****67341`, `****60485`, `G001` |
| 40.36900, -111.92487 | 4 | `****20126`, `****31838`, `****C8D82`, `****6A19E` |
| 37.39902, -121.97449 | 3 | `****C1C72`, `****0DCB8`, `****D0E48` |
| 54.44487, 23.25799 | 3 | `****0B99A`, `****F3D55`, `****0DC58` |
| 35.20914, -82.24149 | 3 | `****2F569`, `****6E64A`, `****6E64A` |
| -27.54754, 153.08891 | 3 | `****EE73D`, `****FBE61`, `****60459` |
| 30.55150, -88.21376 | 3 | `****FE291`, `****C3CFA`, `****09A2E` |
| 34.89310, -89.70206 | 2 | `****6E5BC`, `****7B719` |
| 28.45207, -96.40086 | 2 | `****7D8F1`, `****6E77A` |
| 5.81466, -55.23833 | 2 | `****77529`, `****A052D` |

_…and 907 more in the snapshot file._

## 3. Tight clusters (≥4 within 100 m) — 5 clusters

| Anchor (lat, lng) | Station count |
|---|---:|
| 37.39902, -121.97449 | 5 |
| 37.40030, -121.98108 | 5 |
| 40.36898, -111.92507 | 5 |
| 5.81466, -55.23833 | 4 |
| 43.01620, -82.33714 | 4 |

## 4. Stations with ≤ 2 decimal places of coordinate precision — 3

| Name | Lat | Lng |
|---|---:|---:|
| `****97221` | 51.2 | 9.718931 |
| `****B33E8` | 36.36 | -85.762065 |
| `****15ABA` | 40.71 | -73.952818 |

---

## Methodology

Each finding is grounded in how a real CORS / RTK network is physically supposed to look:
- A surveyed GNSS reference station occupies one antenna at one coordinate. Two stations at the same point is structurally undefined.
- Honest sites at ≤ 10 m of each other are vanishingly rare — that's inside the cone of a single antenna mount.
- Clusters of ≥ 4 stations in 100 m can be honest (industrial campus, surveying lab) but justify a manual look.
- An RTK base claiming a position with ≤ 2 decimal places (≥ 1 km uncertainty) is not a real CORS station; the public network shouldn't surface them.

For an authoritative per-device GETKINETIK grade (hardware-rooted signature, chain age, tamper flags), the network or operator can POST a Proof of Origin URL to `https://getkinetik.app/api/verify-device`.

Contact: **eric@outfromnothingllc.com** · https://getkinetik.app/bureau/ · https://getkinetik.app/api/docs/
