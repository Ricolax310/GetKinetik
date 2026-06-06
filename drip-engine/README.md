# DePIN Signal Intelligence — distribution engine

Recurring **publication system** driven by machine signals (not a dashboard, not bureau, not audit).

```
signals/latest.json
        ↓
  signal-loader + signal-confidence
        ↓
  taxonomy v2 + cross-network-aggregator (scope tags)
        ↓
  editorial-engine (daily facts | weekly synthesis)
        ↓
  dist-router
        ├── X → daily thread
        ├── Substack → weekly draft
        ├── API → daily + weekly JSON
        └── site → live feed (/site/)
```

## Run

```bash
npm run signal:daily
npm run drip:daily
npm run drip:weekly
npm run drip:monthly
npm run drip:all
```

Requires Node 22+.

## Automation (@kinetiksignal on X)

GitHub Actions posts **image + caption** automatically when X API secrets are set:

| Workflow | Schedule | Posts to X |
|----------|----------|------------|
| `drip-daily.yml` | Every day ~9am PT | Daily card |
| `drip-weekly.yml` | Sunday ~10am PT | Weekly case file card |
| `drip-monthly.yml` | 1st of month ~10am PT | Monthly state card |

No manual posting needed for the signal cards. Avoid re-triggering `drip-daily` on the same day (causes duplicates). Bureau news X auto-post stays off unless `BUREAU_AUTO_POST` is enabled.

## Card cadences (design principle)

Each cadence **answers a different question** — not just shows different data.

| Cadence | Question | Identity |
|---------|----------|----------|
| Daily | What changed today? | Market close |
| Weekly | What kept showing up? | Case file / intelligence briefing |
| Monthly | What does the ecosystem look like? | State report (archive cover) |

Cards live in `chart-card.ts`. Daily highlights movers; weekly observes persistent changes; monthly shows composition — none list every network on the card (header counts reflect the full observatory).

## Taxonomy v2 (locked)

`CAPACITY` · `IDENTITY` · `CONSISTENCY` · `ECONOMICS` · `BEHAVIORAL` · `INFRASTRUCTURE`

Pattern tags: `localized` | `cross-network` | `systemic` + classification (`divergence`, `convergence`, …)

See [docs/TAXONOMY_V2.md](../docs/TAXONOMY_V2.md).

## Channels

| Channel | Cadence | Module |
|---------|---------|--------|
| X | Daily | `dist-router` → `publishers/x-publisher.ts` |
| Substack | Weekly (draft only) | `editorial-engine/weekly.ts` |
| API | Both | `landing/api/drip/*.json` |
| Site | Live | `https://getkinetik.app/site/` |

## Schedule (GitHub Actions)

| Workflow | Cron (UTC) | Command |
|----------|------------|---------|
| `drip-daily.yml` | `0 17 * * *` | `node drip-engine/run.ts daily` |
| `drip-weekly.yml` | `0 18 * * 0` | `node drip-engine/run.ts weekly` |

## Env

`X_API_*` (OAuth 1.0a), `SUBSTACK_API_KEY`, `SUBSTACK_BLOG_ID`, `DRIP_DRY_RUN=true` for local file-only runs.
