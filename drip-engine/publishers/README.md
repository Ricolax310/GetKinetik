# Publishing layer

| Publisher | File | Env | Behavior |
|-----------|------|-----|----------|
| X (Twitter) | `x-publisher.ts` | `X_API_BEARER` or OAuth quartet | POST `/2/tweets` with reply chaining |
| Substack | `substack-publisher.ts` | `SUBSTACK_API_KEY`, `SUBSTACK_BLOG_ID` | Draft only — never auto-publish |

Set `DRIP_DRY_RUN=true` to skip live API calls (files still written).

Quality gate: `signal-confidence.ts` — daily requires confidence > 0.6, weekly > 0.8.

Network weights: `taxonomy-mapping.ts` — per-network category sensitivity for all reviewed DePIN networks.

API consumers: `GET /api/drip/daily.json`, `/api/drip/weekly.json`, `/api/drip/patterns.json`, `/api/drip/quality.json`
