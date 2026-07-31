# Sybil Risk Scan — Geodnet RTK Network

> Independent public read by the GETKINETIK Bureau using only Geodnet's public station endpoint. **No internal Geodnet data was used.** Geodnet RTK stations are surveyed GNSS reference units — each one is supposed to be a unique, physically installed antenna at a fixed coordinate. The heuristics below treat that as the structural rule and flag exceptions.

- **As of:** 2026-07-31
- **Public source:** `https://rtk.geodnet.com/api/v2/coverage_stations`
- **Stations observed:** 19,593
- **Stations flagged (any heuristic):** 1,776 (9.06%)

## Executive summary

1. **5 exact (lat,lng) duplicate groups** on 19,593 public stations — each row in §1 is one coordinate pair your registry team can grep today.
2. **895 ≤10 m proximity clusters** — tighter than two physical RTK antennas; start with the largest counts in §2 (names + anchors included).
3. **9.1%** of the public fleet touches at least one heuristic — useful as a sampling denominator, not a verdict.

---

## Since last snapshot

| Metric | This run | vs last run |
|---|---:|---|
| Stations with coordinates | 19,593 | unchanged vs last run |
| Exact (lat,lng) duplicate groups | 5 | -1 (-16.7%) |
| Clusters within 10 m | 895 | -1 (-0.1%) |
| Clusters ≥4 within 100 m | 3 | unchanged vs last run |
| Low-precision coordinates (≤2 decimals) | 5 | -2 (-28.6%) |
| Fleet share flagged (any heuristic) | 9.06% | -0.03 pp (-0.3%) |

## What to cross-check this week

1. Registry dedupe: for each §1 coordinate pair, confirm whether multiple station IDs should share one surveyed antenna location.
2. Field ops: spot-check §3 tight clusters (≥4 within 100 m) — industrial campus vs duplicate registrations.
3. Data quality: stations in §4 with ≤2 decimal places should not appear as RTK references until coordinates are re-surveyed.
4. Reproduce: `node scripts/sybil-scan-geodnet.mjs` — same public endpoint, no API key.

> Public-data read. Re-run: script in `scripts/`, source URL in report header.

---

## Headline findings

1. **5 groups of stations share an exact (lat, lng) pair.** For a CORS / RTK reference network, two stations at identical coordinates is structurally undefined — there is no second-antenna position to triangulate from.
2. **895 clusters of stations sit within 10 m of each other.** That's tighter than the physical separation of two real RTK installs.
3. **3 clusters have ≥4 stations within 100 m.** Plausible for an industrial campus or surveying yard, but the names + counts are worth reviewing.
4. **5 stations publish coordinates with ≤ 2 decimal places** (≥ 1 km uncertainty). For RTK that's structurally wrong; coordinates should be 5+ decimals.

---

## 1. Exact-coordinate duplicates — 5 groups

| Coordinates | Station count | Names |
|---|---:|---|
| `33.946491, -78.316651` | 2 | `****20C40`, `****20C40` |
| `52.914376, 6.601148` | 2 | `****0WSRA`, `****0WSRT` |
| `41.61234, -93.539059` | 2 | `****E2162`, `****E2162` |
| `29.396287, -98.431838` | 2 | `****CAE6C`, `****CAE6C` |
| `35.208522, -82.249764` | 2 | `****6E64A`, `****6E64A` |

## 2. Near-duplicate stations within 10 m — 895 clusters

| Anchor (lat, lng) | Station count | Names (truncated) |
|---|---:|---|
| 40.36838, -111.93312 | 4 | `****20126`, `****31838`, `****C8D82`, `****6A19E` |
| 40.77722, 29.68575 | 3 | `****2186D`, `****81599`, `****3B246` |
| 37.39968, -121.98933 | 3 | `****7AE7D`, `****60485`, `G001` |
| 35.20852, -82.24974 | 3 | `****2F569`, `****6E64A`, `****6E64A` |
| -27.54816, 153.08066 | 3 | `****EE73D`, `****FBE61`, `****60459` |
| 19.55360, 74.13357 | 2 | `****BC015`, `****69CD6` |
| 39.34303, -114.86903 | 2 | `****C332D`, `****6A492` |
| 43.36474, 17.36929 | 2 | `****00A29`, `****C4111` |
| 28.93801, 70.95345 | 2 | `****CA41D`, `****CCE2A` |
| 47.76365, 27.50499 | 2 | `****F5C6A`, `****C8DE6` |

_…and 885 more in the snapshot file._

## 3. Tight clusters (≥4 within 100 m) — 3 clusters

| Anchor (lat, lng) | Station count |
|---|---:|
| 37.39968, -121.98933 | 5 |
| 40.36836, -111.93333 | 5 |
| 43.01558, -82.34540 | 4 |

## 4. Stations with ≤ 2 decimal places of coordinate precision — 5

| Name | Lat | Lng |
|---|---:|---:|
| `****10C59` | 43.36 | 19.331173 |
| `****BFC98` | 32.154985 | -110.96 |
| `****C6D8C` | 43.68496 | -71.21 |
| `****C0A79` | 48.400484 | 15.98 |
| `****CA035` | 44.8 | -102.556222 |

---

## Methodology

Each finding is grounded in how a real CORS / RTK network is physically supposed to look:
- A surveyed GNSS reference station occupies one antenna at one coordinate. Two stations at the same point is structurally undefined.
- Honest sites at ≤ 10 m of each other are vanishingly rare — that's inside the cone of a single antenna mount.
- Clusters of ≥ 4 stations in 100 m can be honest (industrial campus, surveying lab) but justify a manual look.
- An RTK base claiming a position with ≤ 2 decimal places (≥ 1 km uncertainty) is not a real CORS station; the public network shouldn't surface them.

For an authoritative per-device GETKINETIK grade (hardware-rooted signature, chain age, tamper flags), the network or operator can POST a Proof of Origin URL to `https://getkinetik.app/api/verify-device`.

Contact: **eric@outfromnothingllc.com** · https://getkinetik.app/bureau/ · https://getkinetik.app/api/docs/
