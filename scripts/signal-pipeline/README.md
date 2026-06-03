# Automated DePIN Signal Pipeline

An autonomous DePIN intelligence engine: it ingests public network data,
detects standardized signals, aggregates them **cross-network first**, and
publishes reports + a JSON API on a schedule. No manual analyst step.

## Pipeline order (mandatory)

1. **Ingest** (`ingest.mjs`) — refresh public data per network, rebuild the audit index. Resilient: a failed scan falls back to the last snapshot.
2. **Detect** (`signals.mjs`) — standardized signal modules → unified format:
   ```json
   { "network": "GEODNET", "type": "integrity|health|growth|economics", "message": "...", "severity": "low|medium|high", "confidence": 0.0 }
   ```
3. **Aggregate** (`aggregate.mjs`) — sector-level summary first, per-network breakdown second. Networks are never ordered by signal volume.
4. **Publish** (`render.mjs` + `pipeline.mjs`) — JSON feed, public API mirror, markdown reports, public HTML.
5. **Log** (`log.mjs`) — one record per run under `logs/<cadence>/`.

## Jobs & schedule

| Job | Cron (UTC) | Command |
|-----|-----------|---------|
| `daily_signal_pipeline` | `0 9 * * *` | `npm run signal:daily` |
| `weekly_signal_pipeline` | `0 10 * * MON` | `npm run signal:weekly` |
| `monthly_depin_state` | `0 10 1 * *` | `npm run signal:monthly` |

Scheduling runs via GitHub Actions (`.github/workflows/signal-*.yml`) or a
long-lived server (`npm run signal:schedule`, dependency-free).

Add `--live` (`npm run signal:daily:live`) to run fresh network scans;
otherwise the pipeline normalizes from existing snapshots (CI-safe default).

## Outputs

| Path | What |
|------|------|
| `signals/{daily,weekly,monthly}/latest.json` | Normalized cross-network feed |
| `landing/api/signals/latest.json` | Public API mirror (homepage feed reads this) |
| `docs/reports/daily/latest.md` | Daily Signal Brief |
| `docs/reports/weekly/latest.md` | Weekly DePIN Signal Report |
| `docs/reports/monthly/state-of-depin.md` | State of DePIN |
| `landing/public/{daily,weekly,state-of-depin}.html` | Public HTML reports |
| `logs/{daily,weekly,monthly}/` | Per-run system logs |

## Rules

- **Cross-network first, never single-network framed.** The sector view leads every output; the homepage shows the cross-network feed, never a single-network page.
- **Signals → reports → narratives.** Monthly patterns are derived from accumulated observations, never narrative-first.
- **Evidence not verdicts.** Every signal carries a bounded "what we don't know"; no fraud claims.
