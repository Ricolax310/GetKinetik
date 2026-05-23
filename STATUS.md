# GETKINETIK — Status (neutral bureau route)

> **Direction:** Neutral DePIN bureau — **friendly helper**, second read not replacement.  
> **Publisher:** OutFromNothing LLC (California) · **Site:** https://getkinetik.app

---

## One-liner

We publish reproducible trust reads on **public data** and **signed device evidence**. Networks keep their verifiers. We don't pick sides.

---

## What's live

| Surface | URL / path |
|---------|------------|
| Landing | https://getkinetik.app |
| Audits + terminal | https://getkinetik.app/audits.html |
| Bureau | https://getkinetik.app/bureau/ |
| Verify API | `POST /api/verify-device` |
| Offline verifier | `npm i @getkinetik/verify` |
| Neutrality charter | [NEUTRALITY.md](./NEUTRALITY.md) |

---

## Automation (repetitive bureau loop)

```bash
npm run bureau:status      # report ages + env hints
npm run bureau:pipeline    # scan → validate → outreach drafts
npm run bureau:scan        # scans only (default networks)
npm run bureau:outreach    # drafts only from existing reports
```

- **Registry:** `scripts/bureau/networks.json`
- **Outreach drafts:** `docs/outreach/generated/` (human review before send)
- **Run log:** `scripts/data/bureau-run-log.json`
- **Never auto-sends** email or DMs.

Set `SOLANA_RPC_URL` in `.env` for reliable Hivemapper on-chain reads.

---

## Outreach pipeline (manual send)

| Network | Report | Outreach draft | Status |
|---------|--------|----------------|--------|
| WeatherXM | [report](./docs/reports/weatherxm-sybil-report.md) | generated via `bureau:outreach` | CEO validated — nurture |
| Geodnet | [report](./docs/reports/geodnet-sybil-report.md) | generated via `bureau:outreach` | follow up |
| Hivemapper | [report](./docs/reports/hivemapper-sybil-report.md) | generated via `bureau:outreach` | send |
| Nodle | [report](./docs/reports/nodle-sybil-report.md) | optional read-only | parked (no integration ask) |
| Dawn | [report](./docs/reports/dawn-sybil-report.md) | generated via `bureau:outreach` | optional |
| Grass/Titan | [report](./docs/reports/grass-sybil-report.md) | off by default in pipeline | optional |

---

## This week (full throttle)

1. `npm run bureau:pipeline` — refresh reports + outreach drafts  
2. Push local commits so public site matches helper voice  
3. Send Hivemapper + Geodnet (review generated drafts first)  
4. **Freeze app features** unless demo-breaking  

---

## Win metric (90 days)

**Network conversations** that say: *"Can you run this on our data?"* — not APK downloads, not adapter count.

*Last updated: 2026-05-23 · reports refreshed via `npm run bureau:pipeline`*
