// Automated DePIN signal pipeline — shared config + paths.
// Cross-network first by design: networks are processed in a fixed registry
// order, never ranked by signal volume, so no single network can dominate.

import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(__dirname, "..", "..");

export const PATHS = {
  signalsDir: path.join(REPO_ROOT, "signals"),
  reportsDir: path.join(REPO_ROOT, "docs/reports"),
  logsDir: path.join(REPO_ROOT, "logs"),
  publicDir: path.join(REPO_ROOT, "landing/public"),
  apiDir: path.join(REPO_ROOT, "landing/api/signals"),
  auditIndex: path.join(REPO_ROOT, "scripts/data/bureau-audit-index.json"),
  bureauNetworks: path.join(REPO_ROOT, "scripts/bureau/networks.json"),
};

// Canonical cross-network processing order. DIMO is included even before a
// public scanner is wired, so the sector view is never single-network framed.
export const PIPELINE_NETWORKS = [
  { id: "geodnet",       name: "GEODNET",       scanScript: "sybil-scan-geodnet.mjs" },
  { id: "weatherxm",     name: "WeatherXM",     scanScript: "sybil-scan-weatherxm.mjs" },
  { id: "hivemapper",    name: "Hivemapper",    scanScript: "sybil-scan-hivemapper.mjs" },
  { id: "natix",         name: "NATIX",         scanScript: "sybil-scan-natix.mjs" },
  { id: "helium-iot",    name: "Helium IoT",    scanScript: "sybil-scan-helium-iot.mjs" },
  { id: "helium-mobile", name: "Helium Mobile", scanScript: "sybil-scan-helium-mobile.mjs" },
  { id: "dimo",          name: "DIMO",          scanScript: null },
];

// Standardized signal type per anomaly primitive.
export const SIGNAL_TYPE_BY_ANOMALY = {
  duplication_cluster: "integrity",
  identity_collision: "integrity",
  capacity_violation: "health",
  telemetry_discontinuity: "health",
  inactivity_anomaly: "health",
  economic_concentration: "economics",
  scaffold: "health",
};

export const SECTOR_LABELS = {
  integrity: "Registry & identity integrity",
  health: "Network health & capacity",
  growth: "Coverage growth",
  economics: "Token economics",
};

// Sector display order for cross-network summaries.
export const SECTOR_ORDER = ["integrity", "health", "growth", "economics"];

export const SEVERITY_WEIGHT = { high: 3, medium: 2, low: 1 };

// Bounded uncertainty per signal type — what public data can't disambiguate.
export const WHAT_WE_DONT_KNOW = {
  integrity:
    "Whether shared/duplicated identifiers are legitimate co-located installs or registry artifacts — only operator confirmation settles it.",
  health:
    "Whether capacity or telemetry anomalies reflect real on-the-ground activity, ETL/display behavior, or registry double-counting — the public feed alone can't say.",
  growth:
    "Whether registry growth reflects new physical deployments or registration churn — counts alone don't prove device reality.",
  economics:
    "Whether the largest visible accounts are treasury, market-maker, exchange custody, or operators — on-chain shape doesn't label holder intent.",
};
