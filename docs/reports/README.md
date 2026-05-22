# Bureau reports

Independent Sybil Risk Scans the bureau generates for partner DePIN networks.

## Network-specific scripts

| Network   | Command                               | Output |
|-----------|---------------------------------------|--------|
| Geodnet   | `node scripts/sybil-scan-geodnet.mjs` | `docs/reports/geodnet-sybil-report.md` |
| WeatherXM | `node scripts/sybil-scan-weatherxm.mjs` | `docs/reports/weatherxm-sybil-report.md` |
| Hivemapper | `node scripts/sybil-scan-hivemapper.mjs` | `docs/reports/hivemapper-sybil-report.md` |
| Nodle     | `node scripts/sybil-scan-nodle.mjs`   | `docs/reports/nodle-sybil-report.md` |
| Dawn      | `node scripts/sybil-scan-dawn.mjs`    | `docs/reports/dawn-sybil-report.md` |
| Grass / Titan | `node scripts/sybil-scan-grass.mjs` | `docs/reports/grass-sybil-report.md` |

Hivemapper has **no** public unauthenticated contributor map API like the other two. `sybil-scan-hivemapper.mjs` therefore:

1. **Part A (default):** pulls **HONEY** `getTokenSupply` + `getTokenLargestAccounts` + owner resolution from **Solana mainnet** (batched JSON-RPC). Public RPCs often rate-limit; set `SOLANA_RPC_URL` to your own mainnet HTTPS endpoint (Helius, QuickNode, etc.) for reliable runs.
2. **Part B (optional):** pass `--nodes=nodes.json` (same schema as `scripts/sample-nodes.json`) to append the same **geometry** heuristics as `sybil-report.mjs` when you have a lat/lng dump from Hivemapper or another public source.

```bash
node scripts/sybil-scan-hivemapper.mjs
node scripts/sybil-scan-hivemapper.mjs --nodes=scripts/data/hivemapper-nodes.json
```

## How they are produced

```bash
node scripts/sybil-report.mjs <nodes.json> \
  --network=<NetworkName> \
  --out=docs/reports/<network>-sybil-report.md
```

The `<nodes.json>` file is a public snapshot of a partner network's node set
(see `scripts/sample-nodes.json` for the schema). The script never contacts
the live bureau and never uses internal GETKINETIK data — it only runs four
conservative heuristics on the public set and writes a markdown report.

## How we use them

A scan is generated per target network and attached to outreach as a
one-page PDF or markdown. The point is to show — not tell — what the bureau
sees in the public data they already publish. Each finding is defensible on
its own and the methodology is printed inside every report.

We deliberately bias toward false negatives over false positives: a partner
who finds one bad call in our report will (correctly) discount the rest. The
thresholds in `scripts/sybil-report.mjs` are tuned with that in mind.

## What is not in scope here

These scans are **shape-only**. They do not prove fraud and they do not
replace the authoritative `/api/verify-device` check, which requires the
node's hardware-signed Proof of Origin. The report's last section always
points partners to that endpoint for a real GETKINETIK grade.
