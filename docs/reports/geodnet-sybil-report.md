# Sybil Risk Scan — Geodnet RTK Network

> Independent public read by the GETKINETIK Bureau using only Geodnet's public station endpoint. **No internal Geodnet data was used.** Geodnet RTK stations are surveyed GNSS reference units — each one is supposed to be a unique, physically installed antenna at a fixed coordinate. The heuristics below treat that as the structural rule and flag exceptions.

- **As of:** 2026-07-20
- **Public source:** `https://rtk.geodnet.com/api/v2/coverage_stations`
- **Stations observed:** 19,593
- **Stations flagged (any heuristic):** 1,800 (9.19%)

## Executive summary

1. **7 exact (lat,lng) duplicate groups** on 19,593 public stations — each row in §1 is one coordinate pair your registry team can grep today.
2. **903 ≤10 m proximity clusters** — tighter than two physical RTK antennas; start with the largest counts in §2 (names + anchors included).
3. **9.2%** of the public fleet touches at least one heuristic — useful as a sampling denominator, not a verdict.

---

## Since last snapshot

| Metric | This run | vs last run |
|---|---:|---|
| Stations with coordinates | 19,593 | -7 (-0.0%) |
| Exact (lat,lng) duplicate groups | 7 | unchanged vs last run |
| Clusters within 10 m | 903 | +4 (+0.4%) |
| Clusters ≥4 within 100 m | 4 | unchanged vs last run |
| Low-precision coordinates (≤2 decimals) | 3 | +1 (+50.0%) |
| Fleet share flagged (any heuristic) | 9.19% | +0.04 pp (+0.5%) |

## What to cross-check this week

1. Registry dedupe: for each §1 coordinate pair, confirm whether multiple station IDs should share one surveyed antenna location.
2. Field ops: spot-check §3 tight clusters (≥4 within 100 m) — industrial campus vs duplicate registrations.
3. Data quality: stations in §4 with ≤2 decimal places should not appear as RTK references until coordinates are re-surveyed.
4. Reproduce: `node scripts/sybil-scan-geodnet.mjs` — same public endpoint, no API key.

> Public-data read. Re-run: script in `scripts/`, source URL in report header.

---

## Headline findings

1. **7 groups of stations share an exact (lat, lng) pair.** For a CORS / RTK reference network, two stations at identical coordinates is structurally undefined — there is no second-antenna position to triangulate from.
2. **903 clusters of stations sit within 10 m of each other.** That's tighter than the physical separation of two real RTK installs.
3. **4 clusters have ≥4 stations within 100 m.** Plausible for an industrial campus or surveying yard, but the names + counts are worth reviewing.
4. **3 stations publish coordinates with ≤ 2 decimal places** (≥ 1 km uncertainty). For RTK that's structurally wrong; coordinates should be 5+ decimals.

---

## 1. Exact-coordinate duplicates — 7 groups

| Coordinates | Station count | Names |
|---|---:|---|
| `11.320701, 124.950174` | 2 | `****00000`, `****00000` |
| `52.914228, 6.607649` | 2 | `****0WSRA`, `****0WSRT` |
| `43.069094, -89.556487` | 2 | `****1C301`, `****18F55` |
| `41.612192, -93.532557` | 2 | `****E2162`, `****E2162` |
| `29.396139, -98.425336` | 2 | `****CAE6C`, `****CAE6C` |
| `33.946343, -78.310149` | 2 | `****20C40`, `****20C40` |
| `35.208374, -82.243262` | 2 | `****6E64A`, `****6E64A` |

## 2. Near-duplicate stations within 10 m — 903 clusters

| Anchor (lat, lng) | Station count | Names (truncated) |
|---|---:|---|
| 37.39827, -121.97625 | 5 | `****C2CAE`, `****17C8A`, `****C8E06`, `****C8DA8`, `****21B94` |
| 37.39815, -121.97589 | 4 | `****0997A`, `****0ECBE`, `****F9CCC`, `****CBDF2` |
| 40.36823, -111.92662 | 4 | `****20126`, `****31838`, `****C8D82`, `****6A19E` |
| 30.55075, -88.21551 | 3 | `****C3CFA`, `****FE291`, `****09A2E` |
| 40.77708, 29.69225 | 3 | `****2186D`, `****81599`, `****3B246` |
| 37.39953, -121.98283 | 3 | `****7AE7D`, `****60485`, `G001` |
| 35.20837, -82.24324 | 3 | `****2F569`, `****6E64A`, `****6E64A` |
| -27.54830, 153.08716 | 3 | `****EE73D`, `****FBE61`, `****60459` |
| 51.35317, -0.13719 | 2 | `****7A081`, `****0C799` |
| -31.53864, -68.53613 | 2 | `****50F19`, `****20C0C` |

_…and 893 more in the snapshot file._

## 3. Tight clusters (≥4 within 100 m) — 4 clusters

| Anchor (lat, lng) | Station count |
|---|---:|
| 37.39827, -121.97625 | 12 |
| 40.36821, -111.92682 | 5 |
| 37.39953, -121.98283 | 4 |
| 43.01543, -82.33890 | 4 |

## 4. Stations with ≤ 2 decimal places of coordinate precision — 3

| Name | Lat | Lng |
|---|---:|---:|
| `****7A771` | 54.90429 | 23.93 |
| `****17555` | 49.13 | 9.013724 |
| `****6A8CC` | -20.578482 | -47.85 |

---

## Methodology

Each finding is grounded in how a real CORS / RTK network is physically supposed to look:
- A surveyed GNSS reference station occupies one antenna at one coordinate. Two stations at the same point is structurally undefined.
- Honest sites at ≤ 10 m of each other are vanishingly rare — that's inside the cone of a single antenna mount.
- Clusters of ≥ 4 stations in 100 m can be honest (industrial campus, surveying lab) but justify a manual look.
- An RTK base claiming a position with ≤ 2 decimal places (≥ 1 km uncertainty) is not a real CORS station; the public network shouldn't surface them.

For an authoritative per-device GETKINETIK grade (hardware-rooted signature, chain age, tamper flags), the network or operator can POST a Proof of Origin URL to `https://getkinetik.app/api/verify-device`.

Contact: **eric@outfromnothingllc.com** · https://getkinetik.app/bureau/ · https://getkinetik.app/api/docs/
