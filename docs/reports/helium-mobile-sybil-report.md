# Sybil Risk Scan — Helium Mobile Network

> Independent public read by the GETKINETIK Bureau using only Helium's free Entity API. **No internal Helium data was used.** Asserted locations snap to H3 hexes, so shared exact coordinates are expected in dense buildings — the heuristics below only flag *large* stacks (≥10 hotspots on one coordinate), the classic stacking pattern worth a registry look.

- **As of:** 2026-06-28
- **Public source:** `https://entities.nft.helium.io/v2/hotspots?subnetwork=mobile`
- **Hotspots observed (with coordinates):** 54,728
- **Hotspots without asserted location:** 1,903
- **Hotspots flagged (any heuristic):** 11,272 (20.60%)

## Executive summary

1. **530 single-coordinate stacks of ≥10 hotspots** on 54,728 located units — the largest stack holds **497 hotspots on one coordinate** (§1 lists keys your registry team can grep today).
2. **1,903 hotspots exist on-chain with no asserted location** — on the registry but not on the map.
3. Stacks are *expected* at small sizes (H3 snapping, dense buildings) — only review-worthy at this threshold; every number reproduces from the free public endpoint with no API key.

---

## Since last snapshot

| Metric | This run | vs last run |
|---|---:|---|
| Hotspots with asserted coordinates | 54,728 | +1 (+0.0%) |
| Single-coordinate stacks (≥10 hotspots) | 530 | unchanged vs last run |
| Largest single-coordinate stack | 497 | unchanged vs last run |
| Fleet share flagged (any heuristic) | 20.60% | -0.00 pp (-0.0%) |

## What to cross-check this week

1. Registry dedupe: for each §1 stack, confirm how many physically separate radios actually occupy that coordinate.
2. Coverage model: confirm whether the unasserted-location population is expected (new units pre-assert) or stale registry entries.
3. Reproduce: `node scripts/sybil-scan-helium-mobile.mjs` — same public endpoint, no API key.

> Public-data read. Re-run: script in `scripts/`, source URL in report header.

---

## Headline findings

1. **530 coordinates host ≥10 hotspots each.** H3 snapping makes small shared-coordinate groups normal; stacks this size are the documented hotspot-stacking pattern and justify a registry cross-check.
2. **1,903 hotspots have no asserted location** — they exist on-chain but not on the map.

---

## 1. Largest single-coordinate stacks — 530 total

| Coordinates | Hotspot count | Sample entity keys |
|---|---:|---|
| `-0.001809,-0.00271` | 497 | `112JR1FkYLCSm8WgSpVccMaY…`, `11Drn9i7RMUdVKGk6FFRc5S6…`, `11PaTbFDJmuMjYvMspVNxvbX…` |
| `32.848477,-116.987742` | 423 | `1trSuseaFNPwu9iTYRdDfhjh…`, `13bCDAwErzzkgEQJjpGGHDJx…`, `13TY3ux7eb821HQSQeLtTPTd…` |
| `17.061372,-96.728188` | 114 | `1trSuseyjzRN4gA3C5noLNjR…`, `1trSusemBcxBAtFxPLDtC4TS…`, `1trSusedShTqrkW7HUxv9Qtr…` |
| `25.789824,-80.134283` | 112 | `119bs2yyXP1CMH2dy4qVnbEi…`, `11FArsyyh9AXzhUa5Ju4JgJC…`, `1trSuserhjKerD3csLdXKkpi…` |
| `40.709576,-73.706201` | 111 | `146fbTkwNWLXo2sgfRP57RBU…`, `13FqF4YoDt1QWfix84zssBUy…`, `13AtYM5QMMdgNC3vTKoqYpib…` |
| `44.398434,-68.221756` | 103 | `13Q6poVq6g4e2QW4ZTQ9ddYd…`, `13d35Q8CF17Y9iQmufZbYamN…`, `14LJVWXPQk9k6s7fzBJzu5W5…` |
| `30.203114,-81.616612` | 101 | `13rh2sARKuAhUS4vbhmWe866…`, `141CegZpRTed6masrPqhtybz…`, `13LZbuQSfCJ7Jdf4FpEEScg4…` |
| `44.395401,-68.210516` | 95 | `14LMmC46WhthQC5VS99ELtmC…`, `13P4PoinTAfKc6fPAa23ZbaM…`, `14CgNSTDAXY1d7MfdWBj9pPA…` |
| `41.223585,-73.235086` | 94 | `14m7Ksawcs8cRwp8qRp1Wg2d…`, `13wZyrK59xxV6NVnREnHfvHC…`, `13cTnDtMG1wqgpBfJPycCkjR…` |
| `27.965873,-82.821282` | 79 | `1trSusf6ADa1juSbPEytjzFD…`, `1trSuseb91oX5z4upGzMBX9w…`, `1trSuseX985AVdSMXU1VT3X6…` |

_…and 520 more in the snapshot file._

---

## Methodology

- Helium asserted locations are H3-hex-snapped, so exact-coordinate sharing is normal at small counts. Only stacks of ≥10 units are flagged — large stacks are the well-known gaming pattern, but can also be honest dense deployments; the list is a review queue, not a verdict.
- The Entity API's `is_active` flag is uniformly false across the fleet (verified at scan time) — it is not a usable activity signal and is deliberately not reported.
- The full fleet is paginated from the free Entity API at scan time — no sampling, no synthetic inputs.

For an authoritative per-device GETKINETIK grade (hardware-rooted signature, chain age, tamper flags), the network or operator can POST a Proof of Origin URL to `https://getkinetik.app/api/verify-device`.

Contact: **eric@outfromnothingllc.com** · https://getkinetik.app/bureau/ · https://getkinetik.app/api/docs/
