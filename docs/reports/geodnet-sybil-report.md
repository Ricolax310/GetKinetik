# Sybil Risk Scan — Geodnet RTK Network

> Independent public read by the GETKINETIK Bureau using only Geodnet's public station endpoint. **No internal Geodnet data was used.** Geodnet RTK stations are surveyed GNSS reference units — each one is supposed to be a unique, physically installed antenna at a fixed coordinate. The heuristics below treat that as the structural rule and flag exceptions.

- **As of:** 2026-08-08
- **Public source:** `https://rtk.geodnet.com/api/v2/coverage_stations`
- **Stations observed:** 19,568
- **Stations flagged (any heuristic):** 1,808 (9.24%)

## Executive summary

1. **5 exact (lat,lng) duplicate groups** on 19,568 public stations — each row in §1 is one coordinate pair your registry team can grep today.
2. **905 ≤10 m proximity clusters** — tighter than two physical RTK antennas; start with the largest counts in §2 (names + anchors included).
3. **9.2%** of the public fleet touches at least one heuristic — useful as a sampling denominator, not a verdict.

---

## Since last snapshot

| Metric | This run | vs last run |
|---|---:|---|
| Stations with coordinates | 19,568 | -2 (-0.0%) |
| Exact (lat,lng) duplicate groups | 5 | +1 (+25.0%) |
| Clusters within 10 m | 905 | -1 (-0.1%) |
| Clusters ≥4 within 100 m | 5 | unchanged vs last run |
| Low-precision coordinates (≤2 decimals) | 6 | unchanged vs last run |
| Fleet share flagged (any heuristic) | 9.24% | -0.00 pp (-0.0%) |

## What to cross-check this week

1. Registry dedupe: for each §1 coordinate pair, confirm whether multiple station IDs should share one surveyed antenna location.
2. Field ops: spot-check §3 tight clusters (≥4 within 100 m) — industrial campus vs duplicate registrations.
3. Data quality: stations in §4 with ≤2 decimal places should not appear as RTK references until coordinates are re-surveyed.
4. Reproduce: `node scripts/sybil-scan-geodnet.mjs` — same public endpoint, no API key.

> Public-data read. Re-run: script in `scripts/`, source URL in report header.

---

## Headline findings

1. **5 groups of stations share an exact (lat, lng) pair.** For a CORS / RTK reference network, two stations at identical coordinates is structurally undefined — there is no second-antenna position to triangulate from.
2. **905 clusters of stations sit within 10 m of each other.** That's tighter than the physical separation of two real RTK installs.
3. **5 clusters have ≥4 stations within 100 m.** Plausible for an industrial campus or surveying yard, but the names + counts are worth reviewing.
4. **6 stations publish coordinates with ≤ 2 decimal places** (≥ 1 km uncertainty). For RTK that's structurally wrong; coordinates should be 5+ decimals.

---

## 1. Exact-coordinate duplicates — 5 groups

| Coordinates | Station count | Names |
|---|---:|---|
| `49.638914, 9.349274` | 2 | `****5302D`, `****6A80A` |
| `52.915074, 6.599915` | 2 | `****0WSRA`, `****0WSRT` |
| `41.613037, -93.540291` | 2 | `****E2162`, `****E2162` |
| `29.396985, -98.43307` | 2 | `****CAE6C`, `****CAE6C` |
| `35.209219, -82.250997` | 2 | `****6E64A`, `****6E64A` |

## 2. Near-duplicate stations within 10 m — 905 clusters

| Anchor (lat, lng) | Station count | Names (truncated) |
|---|---:|---|
| 37.39909, -121.98398 | 4 | `****0AB68`, `****1FCF2`, `****CFEE8`, `****6AAF0` |
| 40.36908, -111.93436 | 4 | `****20126`, `****31838`, `****C8D82`, `****6A19E` |
| 36.25986, -115.18037 | 3 | `****20C14`, `****C8749`, `****6A1AA` |
| 38.44249, 27.20179 | 3 | `****71041`, `****15B3D`, `****DB0B1` |
| 37.71296, -113.04493 | 3 | `****BF509`, `****21339`, `****6E56A` |
| 37.40038, -121.99057 | 3 | `****7AE7D`, `****60485`, `G001` |
| 35.20922, -82.25098 | 3 | `****2F569`, `****6E64A`, `****6E64A` |
| -27.54746, 153.07942 | 3 | `****EE73D`, `****FBE61`, `****60459` |
| 54.93786, 24.06198 | 2 | `****453A7`, `****3A76A` |
| 45.66083, -108.54094 | 2 | `****EBA78`, `****2A6E5` |

_…and 895 more in the snapshot file._

## 3. Tight clusters (≥4 within 100 m) — 5 clusters

| Anchor (lat, lng) | Station count |
|---|---:|
| 37.39909, -121.98398 | 10 |
| 37.39832, -121.98327 | 8 |
| 37.40038, -121.99057 | 5 |
| 40.36906, -111.93456 | 5 |
| 43.01628, -82.34663 | 4 |

## 4. Stations with ≤ 2 decimal places of coordinate precision — 6

| Name | Lat | Lng |
|---|---:|---:|
| `****A0645` | 44.046803 | 26.61 |
| `****E0B45` | -6.71 | 111.445756 |
| `****FBCB9` | 8.651776 | -82.49 |
| `****EBA52` | 43.05 | 12.283851 |
| `****CCEAA` | 51.912256 | 4.45 |
| `****C8281` | 48.44 | -2.539259 |

---

## Methodology

Each finding is grounded in how a real CORS / RTK network is physically supposed to look:
- A surveyed GNSS reference station occupies one antenna at one coordinate. Two stations at the same point is structurally undefined.
- Honest sites at ≤ 10 m of each other are vanishingly rare — that's inside the cone of a single antenna mount.
- Clusters of ≥ 4 stations in 100 m can be honest (industrial campus, surveying lab) but justify a manual look.
- An RTK base claiming a position with ≤ 2 decimal places (≥ 1 km uncertainty) is not a real CORS station; the public network shouldn't surface them.

For an authoritative per-device GETKINETIK grade (hardware-rooted signature, chain age, tamper flags), the network or operator can POST a Proof of Origin URL to `https://getkinetik.app/api/verify-device`.

Contact: **eric@outfromnothingllc.com** · https://getkinetik.app/bureau/ · https://getkinetik.app/api/docs/
