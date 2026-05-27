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

## Local commands (bureau loop)

```bash
npm run bureau:status      # report ages + env hints
npm run bureau:brief       # daily ops briefing + brief + post drafts + outreach queue
npm run bureau:publish     # weekly bulletin + network one-pagers + delta posts
npm run bureau:pipeline    # scan → validate → outreach drafts → brief → publish
npm run bureau:weekly      # full pipeline with --force (local weekly run)
npm run bureau:scan        # scans only (default networks)
npm run bureau:outreach    # drafts only from existing reports
npm run bureau:news        # RSS/news scan → LLM comment draft (review latest-news.md)
npm run bureau:news:post   # same + auto-tweet if BUREAU_AUTO_POST=true + X API keys
```

**News automation:** reads `scripts/bureau/gtm-context.md` + live brief/reports into the LLM. Default model `gpt-4.1` (override: `BUREAU_NEWS_MODEL`). Set `OPENAI_API_KEY` in `.env` / GitHub Secrets. LinkedIn = draft only; X auto-post is opt-in.

### Scheduled (GitHub Actions)

| Job | Schedule | Workflow | What it does |
|-----|----------|----------|--------------|
| **Daily brief** | 08:00 UTC daily | `.github/workflows/bureau-daily.yml` | Brief + posts + one-pagers + delta posts |
| **Daily news** | 09:00 UTC daily | `.github/workflows/bureau-news.yml` | News scan + LLM drafts → `latest-news.md` |
| **Weekly pipeline** | Mon 14:00 UTC | `.github/workflows/bureau-scan.yml` | Full scan → outreach → bulletin → publish pack |

**Never auto-sends** email, DMs, or social posts — drafts only. **Site deploy:** push to `main` → Cloudflare Pages rebuilds `landing/` (live audit index).

**Git (avoid push rejected):** one-time `npm run git:hooks-install` — auto-rebase before push when bureau bots commit first. See [`docs/DEV_GIT.md`](docs/DEV_GIT.md). Or `npm run git:push` instead of raw `git push`.

- **Registry:** `scripts/bureau/networks.json`
- **Daily ops calendar:** https://getkinetik.app/bureau/ops/ — calendar + AI chat (see `docs/bureau/OPS_CALENDAR.md`)
- **Daily ops (markdown):** `docs/bureau/daily/latest-operator.md` — your to-do vs what ran automatically
- **Standing tasks:** `docs/bureau/operator-tasks.md` (optional checklist merged into ops brief)
- **Weekly GTM route:** `scripts/bureau/gtm-route.mjs` + `scripts/bureau/gtm-context.md` (Mon–Sun: public → comment → intro → marketer → nurture — no cold founder DMs)
- **Daily brief:** `docs/bureau/daily/latest-brief.md`
- **Delta posts:** `docs/bureau/daily/latest-delta-posts.md` (when snapshots moved)
- **Post drafts:** `docs/bureau/daily/latest-posts.md`
- **Weekly bulletin:** `docs/bureau/papers/latest-bulletin.md`
- **Network one-pagers:** `docs/bureau/papers/networks/<id>-one-pager.md`
- **Paper index:** `docs/bureau/papers/README.md`
- **Outreach drafts:** `docs/outreach/generated/` (human review before send)
- **Send queue:** `docs/outreach/OUTREACH_QUEUE.md`
- **Run log:** `scripts/data/bureau-run-log.json`
- **Live audit index:** `landing/data/bureau-audit-index.json` (also `scripts/data/`) — powers audits.html headline cards

Set `SOLANA_RPC_URL` in `.env` (local) and GitHub repo **Secrets** for reliable Hivemapper on-chain reads.

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

*Last updated: 2026-05-23 · full publishing pack (bulletin, one-pagers, delta posts) live*
