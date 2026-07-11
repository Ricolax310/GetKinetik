# Sybil Risk Scan — Helium IoT Network

> Independent public read by the GETKINETIK Bureau using only Helium's free Entity API. **No internal Helium data was used.** Asserted locations snap to H3 hexes, so shared exact coordinates are expected in dense buildings — the heuristics below only flag *large* stacks (≥10 hotspots on one coordinate), the classic stacking pattern worth a registry look.

- **As of:** 2026-07-11
- **Public source:** `https://entities.nft.helium.io/v2/hotspots?subnetwork=iot`
- **Hotspots observed (with coordinates):** 1,008,111
- **Hotspots without asserted location:** 27,403
- **Hotspots flagged (any heuristic):** 69,697 (6.91%)

## Executive summary

1. **4,860 single-coordinate stacks of ≥10 hotspots** on 1,008,111 located units — the largest stack holds **502 hotspots on one coordinate** (§1 lists keys your registry team can grep today).
2. **27,403 hotspots exist on-chain with no asserted location** — on the registry but not on the map.
3. Stacks are *expected* at small sizes (H3 snapping, dense buildings) — only review-worthy at this threshold; every number reproduces from the free public endpoint with no API key.

---

## Since last snapshot

| Metric | This run | vs last run |
|---|---:|---|
| Hotspots with asserted coordinates | 1,008,111 | +1 (+0.0%) |
| Single-coordinate stacks (≥10 hotspots) | 4,860 | unchanged vs last run |
| Largest single-coordinate stack | 502 | unchanged vs last run |
| Fleet share flagged (any heuristic) | 6.91% | -0.00 pp (-0.0%) |

## What to cross-check this week

1. Registry dedupe: for each §1 stack, confirm how many physically separate radios actually occupy that coordinate.
2. Coverage model: confirm whether the unasserted-location population is expected (new units pre-assert) or stale registry entries.
3. Reproduce: `node scripts/sybil-scan-helium-iot.mjs` — same public endpoint, no API key.

> Public-data read. Re-run: script in `scripts/`, source URL in report header.

---

## Headline findings

1. **4,860 coordinates host ≥10 hotspots each.** H3 snapping makes small shared-coordinate groups normal; stacks this size are the documented hotspot-stacking pattern and justify a registry cross-check.
2. **27,403 hotspots have no asserted location** — they exist on-chain but not on the map.

---

## 1. Largest single-coordinate stacks — 4,860 total

| Coordinates | Hotspot count | Sample entity keys |
|---|---:|---|
| `-0.001809,-0.00271` | 502 | `112eKfk1Hi66y3XNDRyGEWsJ…`, `11rEZ8hJUyoVeCggYz2suM76…`, `112vJsm414qBXhinXjBe4uFq…` |
| `37.773515,-122.418271` | 374 | `11ey5igm6dARjoJjyVqfPMqU…`, `112KqSyoptYUYnmRp8FNzJgw…`, `112FyYNGHJTtdxt3beXPTm7b…` |
| `27.244017,80.833787` | 338 | `112cZEm5N8APSqrLnhe3Hw5Q…`, `117szpFiixo9CdxZFM7vuVH5…`, `112Zks2cXoba6ssP9gJdwBbG…` |
| `25.765633,-80.194358` | 106 | `115pEAAxWv2eKh2VrSBGyS9K…`, `11DPPpaVoZhsriCBgNWdZsVV…`, `11jPSNvd5zqkDEv7J83JFiKH…` |
| `51.521638,-0.171182` | 89 | `11ni6DJj8i8BRXULEmYXrGif…`, `112WsFNf8Tp7ZuhANSLEvZ9c…`, `1125RuUvXhKVuicqcExtN1gG…` |
| `25.772442,-80.189633` | 74 | `112JeLWfapdArJtHQGgU56Dg…`, `1128gGUJDMm7XfBssR1aRR5D…`, `1126y6UBhQKVfGD4qRksRPwd…` |
| `40.70968,-74.007674` | 74 | `11wzUpRnYwW1snDjLy9r8UeU…`, `11X8986iMRqvB2HqjPUppsH3…`, `112vsMG7tTL8seruxtGgKkKN…` |
| `51.31643,6.182851` | 74 | `11xapR2HqHZJ6EbF2tgsBTbm…`, `11eQ2WFYYZfWCnuQtTaFuUpS…`, `11bQusUSF77V4xLZMA1to1w4…` |
| `40.757674,-73.992453` | 72 | `112sv66DwbXJfDxe3VW1M3mD…`, `11nm3ZrRsyeC7N5UsF9pjVNM…`, `11BWzVR5ReJCMF7x3kym1ynx…` |
| `37.786539,-122.394451` | 65 | `11M5G1yyc93FvLkLV43WtGqc…`, `112SX2ukHgYX9yqBs3YLaEzN…`, `11X4E1JL5VAJti9WUL9KhQRE…` |

_…and 4,850 more in the snapshot file._

---

## Methodology

- Helium asserted locations are H3-hex-snapped, so exact-coordinate sharing is normal at small counts. Only stacks of ≥10 units are flagged — large stacks are the well-known gaming pattern, but can also be honest dense deployments; the list is a review queue, not a verdict.
- The Entity API's `is_active` flag is uniformly false across the fleet (verified at scan time) — it is not a usable activity signal and is deliberately not reported.
- The full fleet is paginated from the free Entity API at scan time — no sampling, no synthetic inputs.

For an authoritative per-device GETKINETIK grade (hardware-rooted signature, chain age, tamper flags), the network or operator can POST a Proof of Origin URL to `https://getkinetik.app/api/verify-device`.

Contact: **eric@outfromnothingllc.com** · https://getkinetik.app/bureau/ · https://getkinetik.app/api/docs/
