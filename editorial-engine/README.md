# Editorial engine

Machine-driven signal publication with a **dual-layer format**:

1. **Executive layer** — scannable in under 10 seconds
2. **Full evidence** — complete metrics, methodology, questions, sources (unchanged)

## Daily structure

```
# Today's Read          (4–6 bullets, what changed)
# Why It Matters        (2–4 neutral sentences)
# Full Evidence
  ### What Changed Today
  ### Signal Type
  ### Signal Context    (renamed from Why It Matters)
  ### What We Don't Know
  ### Questions Worth Asking
  ### Sources & Methodology
```

## Weekly structure

```
# Executive Summary     (3–5 bullets)
# This Week In Signals
# Cross-Network Patterns (taxonomy v2 + scope + classification)
# Systemic Observations
# Data Appendix         (full detailed report)
```

## Modules

| File | Role |
|------|------|
| `executive.mjs` | Shared bullet/sentence builders |
| `rules.ts` | Editorial guardrails |
| `daily.ts` | Daily dual-layer wrapper |
| `weekly.ts` | Weekly dual-layer wrapper |

Used by: `drip-engine/dist-router.ts`, `scripts/signal-pipeline/render.mjs`, `scripts/command-center/signal-publication.mjs`
