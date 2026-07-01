# Sybil Risk Scan — Geodnet RTK Network

> Independent public read by the GETKINETIK Bureau using only Geodnet's public station endpoint. **No internal Geodnet data was used.** Geodnet RTK stations are surveyed GNSS reference units — each one is supposed to be a unique, physically installed antenna at a fixed coordinate. The heuristics below treat that as the structural rule and flag exceptions.

- **As of:** 2026-07-01
- **Public source:** `https://rtk.geodnet.com/api/v2/coverage_stations`
- **Stations observed:** 19,577
- **Stations flagged (any heuristic):** 1,814 (9.27%)

## Executive summary

1. **7 exact (lat,lng) duplicate groups** on 19,577 public stations — each row in §1 is one coordinate pair your registry team can grep today.
2. **911 ≤10 m proximity clusters** — tighter than two physical RTK antennas; start with the largest counts in §2 (names + anchors included).
3. **9.3%** of the public fleet touches at least one heuristic — useful as a sampling denominator, not a verdict.

---

## Since last snapshot

| Metric | This run | vs last run |
|---|---:|---|
| Stations with coordinates | 19,577 | -4 (-0.0%) |
| Exact (lat,lng) duplicate groups | 7 | -3 (-30.0%) |
| Clusters within 10 m | 911 | -2 (-0.2%) |
| Clusters ≥4 within 100 m | 4 | unchanged vs last run |
| Low-precision coordinates (≤2 decimals) | 2 | -3 (-60.0%) |
| Fleet share flagged (any heuristic) | 9.27% | -0.02 pp (-0.2%) |

## What to cross-check this week

1. Registry dedupe: for each §1 coordinate pair, confirm whether multiple station IDs should share one surveyed antenna location.
2. Field ops: spot-check §3 tight clusters (≥4 within 100 m) — industrial campus vs duplicate registrations.
3. Data quality: stations in §4 with ≤2 decimal places should not appear as RTK references until coordinates are re-surveyed.
4. Reproduce: `node scripts/sybil-scan-geodnet.mjs` — same public endpoint, no API key.

> Public-data read. Re-run: script in `scripts/`, source URL in report header.

---

## Headline findings

1. **7 groups of stations share an exact (lat, lng) pair.** For a CORS / RTK reference network, two stations at identical coordinates is structurally undefined — there is no second-antenna position to triangulate from.
2. **911 clusters of stations sit within 10 m of each other.** That's tighter than the physical separation of two real RTK installs.
3. **4 clusters have ≥4 stations within 100 m.** Plausible for an industrial campus or surveying yard, but the names + counts are worth reviewing.
4. **2 stations publish coordinates with ≤ 2 decimal places** (≥ 1 km uncertainty). For RTK that's structurally wrong; coordinates should be 5+ decimals.

---

## 1. Exact-coordinate duplicates — 7 groups

| Coordinates | Station count | Names |
|---|---:|---|
| `52.914371, 6.60038` | 2 | `****0WSRA`, `****0WSRT` |
| `45.866978, -108.779263` | 2 | `****10DA5`, `****3A7F8` |
| `41.612335, -93.539827` | 2 | `****E2162`, `****E2162` |
| `29.396282, -98.432606` | 2 | `****CAE6C`, `****CAE6C` |
| `33.946486, -78.317419` | 2 | `****20C40`, `****20C40` |
| `42.372096, -71.190247` | 2 | `****C6D12`, `****C6D12` |
| `35.208517, -82.250532` | 2 | `****6E64A`, `****6E64A` |

## 2. Near-duplicate stations within 10 m — 911 clusters

| Anchor (lat, lng) | Station count | Names (truncated) |
|---|---:|---|
| 37.39840, -121.98352 | 6 | `****C1C72`, `****0DCB8`, `****D0E48`, `****16C02`, `****6A8CE`, `****E30E6` |
| 37.39967, -121.99010 | 4 | `****7AE7D`, `****67341`, `****60485`, `G001` |
| 40.36838, -111.93389 | 4 | `****20126`, `****31838`, `****C8D82`, `****6A19E` |
| 54.44425, 23.24896 | 3 | `****0B99A`, `****F3D55`, `****0DC58` |
| 35.20851, -82.25051 | 3 | `****2F569`, `****6E64A`, `****6E64A` |
| -27.54816, 153.07989 | 3 | `****EE73D`, `****FBE61`, `****60459` |
| 30.55088, -88.22278 | 3 | `****FE291`, `****C3CFA`, `****09A2E` |
| 37.73351, 39.31569 | 2 | `****C0AD5`, `****0C329` |
| -53.14950, -70.91593 | 2 | `****C5D08`, `****F7D6C` |
| 46.06584, 14.61003 | 2 | `****B00C5`, `****D0E92` |

_…and 901 more in the snapshot file._

## 3. Tight clusters (≥4 within 100 m) — 4 clusters

| Anchor (lat, lng) | Station count |
|---|---:|
| 37.39840, -121.98352 | 9 |
| 37.39967, -121.99010 | 5 |
| 40.36836, -111.93409 | 5 |
| 43.01548, -82.34599 | 4 |

## 4. Stations with ≤ 2 decimal places of coordinate precision — 2

| Name | Lat | Lng |
|---|---:|---:|
| `****772A1` | 42.85 | 23.018637 |
| `****19B09` | 45.93 | 14.035487 |

---

## Methodology

Each finding is grounded in how a real CORS / RTK network is physically supposed to look:
- A surveyed GNSS reference station occupies one antenna at one coordinate. Two stations at the same point is structurally undefined.
- Honest sites at ≤ 10 m of each other are vanishingly rare — that's inside the cone of a single antenna mount.
- Clusters of ≥ 4 stations in 100 m can be honest (industrial campus, surveying lab) but justify a manual look.
- An RTK base claiming a position with ≤ 2 decimal places (≥ 1 km uncertainty) is not a real CORS station; the public network shouldn't surface them.

For an authoritative per-device GETKINETIK grade (hardware-rooted signature, chain age, tamper flags), the network or operator can POST a Proof of Origin URL to `https://getkinetik.app/api/verify-device`.

Contact: **eric@outfromnothingllc.com** · https://getkinetik.app/bureau/ · https://getkinetik.app/api/docs/
