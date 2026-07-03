# Sybil Risk Scan — WeatherXM Network

> Independent public read by the GETKINETIK Bureau using only the WeatherXM Network's public API. No internal WeatherXM data was used. Findings below are *shape*, not allegations; the underlying signals (capacity, `pol_reason`, `qod_score`) come from the network's own model.

- **As of:** 2026-07-03
- **Public source:** `https://api.weatherxm.com/api/v1/cells`
- **Cells observed:** 8,493
- **Cells over designed capacity (≥1.5× capacity):** 290 (3.4%)
- **Cells drilled in this report:** 60 (top by capacity ratio)
- **Devices observed inside drilled cells:** 249

## Executive summary

1. **290 cells** exceed designed capacity — §1 lists H3 indices + map centers for your ops queue.
2. **99 devices** in the hottest cells carry WeatherXM's own `NO_LOCATION_DATA` flag — compare to your internal pol pipeline, not ours.
3. **118** drilled devices sit below qod 30 while still counted toward cell saturation.

---

## Since last snapshot

| Metric | This run | vs last run |
|---|---:|---|
| Cells on public map | 8,493 | -5 (-0.1%) |
| Cells ≥1.5× capacity | 290 | +2 (+0.7%) |
| Share of map over capacity | 3.41% | +0.03 pp (+0.8%) |
| `NO_LOCATION_DATA` in drilled set | 99 | -6 (-5.7%) |
| Devices with qod < 30 (drilled) | 118 | -9 (-7.1%) |

## What to cross-check this week

1. Capacity policy: for §1 top H3 cells, confirm whether device_count should exceed capacity or inactive devices should drop off the cell tally.
2. Proof-of-location: reconcile §2 `pol_reason` histogram with your dashboard — we only read what the public API returns.
3. Hardware mix: §3 bundle counts inside over-capacity cells — popular kit vs single-operator fleet is for you to judge.
4. Reproduce: `node scripts/sybil-scan-weatherxm.mjs` — public cells API, no auth.

> Public-data read. Re-run: script in `scripts/`, source URL in report header.

---

## Headline findings

1. **290 cells** report more devices than the cell's designed capacity. Capacity is a WeatherXM-defined limit (the network's own model of how many devices a hex should sensibly hold).
2. Of the 249 devices inside the most over-capacity cells, **99** are flagged with `pol_reason: NO_LOCATION_DATA` and **6** with another `pol_reason` value — all set by WeatherXM's own pipeline.
3. **138** of those devices are inactive yet still counted in the cell, and **118** have `qod_score < 30`.

---

## 1. Most over-capacity cells

Cells ordered by `device_count / capacity`. The first column is the H3 index; click through on `https://explorer.weatherxm.com/` to see the hex on the map.

| H3 cell | Devices | Capacity | Ratio | Active | Avg QoD | Center (lat, lon) |
|---|---:|---:|---:|---:|---:|---|
| `874449b31ffffff` | 10 | 1 | 10.0× | 0 | null | 33.9274, -94.7707 |
| `8726cdb66ffffff` | 10 | 1 | 10.0× | 0 | null | 33.8746, -94.8049 |
| `871eda743ffffff` | 28 | 3 | 9.3× | 9 | 75 | 37.9810, 23.7195 |
| `872b0e115ffffff` | 9 | 1 | 9.0× | 0 | null | 44.5481, -64.3423 |
| `872aaa945ffffff` | 8 | 1 | 8.0× | 7 | 87 | 39.1691, -77.3527 |
| `872aae2cdffffff` | 7 | 1 | 7.0× | 6 | 88 | 39.2480, -77.2449 |
| `871edcd23ffffff` | 7 | 1 | 7.0× | 5 | 99 | 40.5993, 22.9849 |
| `8726cdb68ffffff` | 7 | 1 | 7.0× | 0 | null | 33.8068, -94.7452 |
| `874995819ffffff` | 6 | 1 | 6.0× | 0 | null | 19.2644, -99.0158 |
| `871e15312ffffff` | 5 | 1 | 5.0× | 5 | 96 | 47.7470, 16.2250 |
| `874450316ffffff` | 5 | 1 | 5.0× | 4 | 56 | 30.8796, -88.3141 |
| `873933759ffffff` | 5 | 1 | 5.0× | 3 | 81 | 38.7867, -9.1042 |
| `871faa694ffffff` | 5 | 1 | 5.0× | 5 | 100 | 48.5924, 9.1617 |
| `877a6ac76ffffff` | 9 | 2 | 4.5× | 9 | 57 | -0.6674, 36.3085 |
| `871e556e1ffffff` | 8 | 2 | 4.0× | 6 | 79 | 47.1792, 27.5966 |
| `87274d6b4ffffff` | 4 | 1 | 4.0× | 1 | 1 | 42.6764, -84.5014 |
| `874995854ffffff` | 4 | 1 | 4.0× | 1 | 1 | 19.2735, -99.1014 |
| `8775a221bffffff` | 4 | 1 | 4.0× | 3 | null | 7.2367, -9.1619 |
| `872aac992ffffff` | 4 | 1 | 4.0× | 4 | 92 | 40.2933, -75.7373 |
| `871969046ffffff` | 4 | 1 | 4.0× | 3 | 66 | 52.0471, 5.5072 |
| `871ee58a4ffffff` | 4 | 1 | 4.0× | 3 | 89 | 46.3285, 23.7291 |
| `8726c351affffff` | 4 | 1 | 4.0× | 3 | 88 | 34.8788, -99.4895 |
| `877a4c068ffffff` | 4 | 1 | 4.0× | 2 | 79 | 0.4685, 35.2356 |
| `8726c35a9ffffff` | 4 | 1 | 4.0× | 3 | 100 | 34.8702, -99.5157 |
| `874995809ffffff` | 4 | 1 | 4.0× | 0 | 23 | 19.2595, -99.0815 |

_…and 35 more drilled cells in the snapshot file._

## 2. WeatherXM's own proof-of-location flags (drilled cells)

| pol_reason | Device count |
|---|---:|
| `NO_LOCATION_DATA` | 99 |
| `QOD_THRESHOLD_NOT_REACHED` | 6 |

These flags are produced by WeatherXM's own pipeline. The bureau did not invent them; the report only counts them and reads them back.

## 3. Hardware-bundle homogeneity inside flagged cells

Bundles are reported by the device (`ws_model` / `gw_model`). High counts of a single bundle inside over-capacity cells can be honest (popular kit) or can mark a single-operator fleet. Treat as a hint, not a verdict.

| ws_model / gw_model | Device count |
|---|---:|
| WS2000 / WS2000 | 92 |
| WS1001 / WG1200 | 89 |
| WS1000 / WG1000 | 42 |
| WS2001 / WS2001 | 20 |
| WS1001 / WG3000 | 6 |

## 4. Device-level detail — top 5 most over-capacity cells

### 1. Cell `874449b31ffffff` — 10 devices in capacity 1 (10.0×)

| Device ID | Active | QoD | pol_reason | Bundle | Last activity |
|---|:-:|---:|---|---|---|
| `24d95f90-438d-11ef-8e8d-b55568dc8e66` | N | 0 | NO_LOCATION_DATA | WS1001/WG1200 | 2026-01-27T08:07:14-06:00 |
| `244d9a50-438d-11ef-8e8d-b55568dc8e66` | N | 0 | NO_LOCATION_DATA | WS1001/WG1200 | 2025-09-14T12:58:31-05:00 |
| `25249960-438d-11ef-8e8d-b55568dc8e66` | N | 0 | NO_LOCATION_DATA | WS1001/WG1200 | 2025-08-19T16:24:31-05:00 |
| `34bd5dd0-438d-11ef-8e8d-b55568dc8e66` | N | 0 | NO_LOCATION_DATA | WS1001/WG1200 | 2025-08-19T13:38:31-05:00 |
| `288be040-438d-11ef-8e8d-b55568dc8e66` | N | 0 | NO_LOCATION_DATA | WS1001/WG1200 | 2025-11-15T05:22:10-06:00 |
| `335b35c0-438d-11ef-8e8d-b55568dc8e66` | N | 0 | NO_LOCATION_DATA | WS1001/WG1200 | 2025-08-13T04:47:38-05:00 |
| `30b17280-438d-11ef-8e8d-b55568dc8e66` | N | 0 | NO_LOCATION_DATA | WS1001/WG1200 | 2025-10-14T02:32:49-05:00 |
| `2bbc1190-438d-11ef-8e8d-b55568dc8e66` | N | 0 | NO_LOCATION_DATA | WS1001/WG1200 | 2025-10-13T03:31:35-05:00 |
| `334b7e50-438d-11ef-8e8d-b55568dc8e66` | N | 0 | NO_LOCATION_DATA | WS1001/WG1200 | 2025-08-16T16:36:26-05:00 |
| `3376ad00-438d-11ef-8e8d-b55568dc8e66` | N | 0 | NO_LOCATION_DATA | WS1001/WG1200 | 2025-08-25T02:22:05-05:00 |

### 2. Cell `8726cdb66ffffff` — 10 devices in capacity 1 (10.0×)

| Device ID | Active | QoD | pol_reason | Bundle | Last activity |
|---|:-:|---:|---|---|---|
| `2883a2e0-438d-11ef-8e8d-b55568dc8e66` | N | 0 | NO_LOCATION_DATA | WS1001/WG1200 | 2025-08-30T14:23:30-05:00 |
| `2515f360-438d-11ef-8e8d-b55568dc8e66` | N | 0 | NO_LOCATION_DATA | WS1001/WG1200 | 2025-10-03T19:19:40-05:00 |
| `250f3ca0-438d-11ef-8e8d-b55568dc8e66` | N | 0 | NO_LOCATION_DATA | WS1001/WG1200 | 2025-08-19T04:21:34-05:00 |
| `2be0b091-438d-11ef-8e8d-b55568dc8e66` | N | 0 | NO_LOCATION_DATA | WS1001/WG1200 | 2025-10-09T03:25:12-05:00 |
| `24355760-438d-11ef-8e8d-b55568dc8e66` | N | 0 | NO_LOCATION_DATA | WS1001/WG1200 | 2026-06-25T22:21:00-05:00 |
| `2683db41-438d-11ef-8e8d-b55568dc8e66` | N | 0 | NO_LOCATION_DATA | WS1001/WG1200 | 2025-12-20T16:56:41-06:00 |
| `33fe5390-438d-11ef-8e8d-b55568dc8e66` | N | 0 | NO_LOCATION_DATA | WS1001/WG1200 | 2026-05-29T11:41:00-05:00 |
| `2e198990-438d-11ef-8e8d-b55568dc8e66` | N | 0 | NO_LOCATION_DATA | WS1001/WG1200 | 2026-06-26T03:50:00-05:00 |
| `3359af20-438d-11ef-8e8d-b55568dc8e66` | N | 0 | NO_LOCATION_DATA | WS1001/WG1200 | 2026-06-25T12:20:00-05:00 |
| `25eb6bd0-438d-11ef-8e8d-b55568dc8e66` | N | 0 | QOD_THRESHOLD_NOT_REACHED | WS1001/WG1200 | 2026-06-26T15:40:00-05:00 |

### 3. Cell `871eda743ffffff` — 28 devices in capacity 3 (9.3×)

| Device ID | Active | QoD | pol_reason | Bundle | Last activity |
|---|:-:|---:|---|---|---|
| `126eadf0-7115-11ef-a8d1-1fe2597b4789` | N | 0 | NO_LOCATION_DATA | WS2001/WS2001 | 2025-06-25T11:36:28+03:00 |
| `fc192be0-88bc-11ec-900c-abdec1c57354` | N | 0 | — | WS1000/WG1000 | 2025-02-21T13:18:35+02:00 |
| `7699b010-1df5-11ed-960b-b351f0b0cc44` | N | 0 | NO_LOCATION_DATA | WS1000/WG1000 | 2026-01-29T10:50:00+02:00 |
| `5d9a6360-0bc4-11f0-9d44-115d444d739a` | Y | 0 | NO_LOCATION_DATA | WS1001/WG1200 | 2038-01-19T05:14:07+02:00 |
| `c7587780-5344-11ef-a2e4-6df465256924` | N | 0 | NO_LOCATION_DATA | WS2001/WS2001 | 2025-01-31T15:08:10+02:00 |
| `04f1e520-cca3-11ec-8cb5-a7f2455167cf` | N | 0 | NO_LOCATION_DATA | WS1000/WG1000 | 2025-11-07T13:05:00+02:00 |
| `81493f60-bf55-11ed-9972-4f669f2d96bd` | N | 0 | NO_LOCATION_DATA | WS2000/WS2000 | 2024-08-13T18:15:26+03:00 |
| `fe601050-963e-11ec-900c-abdec1c57354` | Y | 68 | — | WS1000/WG1000 | 2026-07-03T17:44:00+03:00 |
| `d3debb80-862b-11ef-bb6a-31ace5ea88be` | Y | 97 | — | WS1001/WG1200 | 2026-07-03T17:42:40+03:00 |
| `571e4820-0bd4-11f0-b641-13ebff23371f` | N | 0 | NO_LOCATION_DATA | WS1001/WG1200 | 2026-05-14T09:57:00+03:00 |
| `a866f0a0-ab98-11ec-966b-a173bf0cd052` | Y | 71 | — | WS1000/WG1000 | 2026-07-03T17:43:00+03:00 |
| `db6200f0-784e-11ef-a8d1-1fe2597b4789` | Y | 100 | — | WS1001/WG3000 | 2026-07-03T17:24:59+03:00 |

_…and 16 more devices in this cell._

### 4. Cell `872b0e115ffffff` — 9 devices in capacity 1 (9.0×)

| Device ID | Active | QoD | pol_reason | Bundle | Last activity |
|---|:-:|---:|---|---|---|
| `23bcf310-438d-11ef-8e8d-b55568dc8e66` | N | 0 | NO_LOCATION_DATA | WS1001/WG1200 | 2026-01-03T21:23:34-04:00 |
| `2409da90-438d-11ef-8e8d-b55568dc8e66` | N | 0 | NO_LOCATION_DATA | WS1001/WG1200 | 2025-12-02T01:40:17-04:00 |
| `226a3450-438d-11ef-8e8d-b55568dc8e66` | N | 0 | NO_LOCATION_DATA | WS1001/WG1200 | 2025-12-02T03:20:20-04:00 |
| `3366f590-438d-11ef-8e8d-b55568dc8e66` | N | 0 | NO_LOCATION_DATA | WS1001/WG1200 | 2026-02-14T20:59:00-04:00 |
| `23f6a0b0-438d-11ef-8e8d-b55568dc8e66` | N | 0 | NO_LOCATION_DATA | WS1001/WG1200 | 2026-02-13T18:50:00-04:00 |
| `2c414720-438d-11ef-8e8d-b55568dc8e66` | N | 0 | NO_LOCATION_DATA | WS1001/WG1200 | 2025-12-16T18:04:54-04:00 |
| `2440c910-438d-11ef-8e8d-b55568dc8e66` | N | 0 | NO_LOCATION_DATA | WS1001/WG1200 | 2026-04-26T12:30:00-03:00 |
| `24176f20-438d-11ef-8e8d-b55568dc8e66` | N | 0 | NO_LOCATION_DATA | WS1001/WG1200 | 2026-02-14T20:59:00-04:00 |
| `2a6904b0-438d-11ef-8e8d-b55568dc8e66` | N | 0 | NO_LOCATION_DATA | WS1001/WG1200 | 2026-02-14T21:01:00-04:00 |

### 5. Cell `872aaa945ffffff` — 8 devices in capacity 1 (8.0×)

| Device ID | Active | QoD | pol_reason | Bundle | Last activity |
|---|:-:|---:|---|---|---|
| `cc45d4c0-bf54-11ed-95eb-b351f0b0cc44` | Y | 100 | — | WS2000/WS2000 | 2026-07-03T10:42:24-04:00 |
| `f07b5a00-bf53-11ed-8a70-d7d4cf200cc9` | Y | 58 | — | WS2000/WS2000 | 2026-07-03T10:43:57-04:00 |
| `ec8520f0-bf50-11ed-95eb-b351f0b0cc44` | Y | 100 | — | WS2000/WS2000 | 2026-07-03T10:43:16-04:00 |
| `36e5f940-bf55-11ed-8a70-d7d4cf200cc9` | Y | 93 | — | WS2000/WS2000 | 2026-07-03T10:43:25-04:00 |
| `2c2d9810-438d-11ef-8e8d-b55568dc8e66` | Y | 65 | — | WS1001/WG1200 | 2026-07-03T10:44:00-04:00 |
| `74ad1920-bf55-11ed-9972-4f669f2d96bd` | Y | 99 | — | WS2000/WS2000 | 2026-07-03T10:43:48-04:00 |
| `7f0c20a0-bf55-11ed-8a70-d7d4cf200cc9` | N | 0 | NO_LOCATION_DATA | WS2000/WS2000 | 2026-03-11T18:57:20-04:00 |
| `f83c3700-bf53-11ed-8a70-d7d4cf200cc9` | Y | 100 | — | WS2000/WS2000 | 2026-07-03T10:42:49-04:00 |

---

## Methodology

Each finding is grounded in WeatherXM's own public model:
- `device_count` vs `capacity` is the network's own measure of cell saturation.
- `pol_reason` and `qod_score` come straight out of WeatherXM's pipeline; the bureau only aggregates them.
- `bundle.ws_model` / `bundle.gw_model` is reported by the device itself.
- The drilled set is intentionally small (top 60 cells) so every row in section 4 is auditable by hand.

For an authoritative per-device GETKINETIK grade (hardware-rooted signature, chain age, tamper flags), the network or operator can POST a Proof of Origin URL to `https://getkinetik.app/api/verify-device`.

Contact: **eric@outfromnothingllc.com** · https://getkinetik.app/bureau/ · https://getkinetik.app/api/docs/
