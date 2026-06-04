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
npm run drip:all
```

Requires Node 22+.

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
