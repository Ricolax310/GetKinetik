// Helium Mobile subnetwork scan → report + snapshot (real Entity API data).

import { runHeliumScan } from "./bureau/helium-scan.mjs";

await runHeliumScan({
  subnetwork: "mobile",
  networkLabel: "Helium Mobile Network",
  reportPath: "docs/reports/helium-mobile-sybil-report.md",
  snapshotPath: "scripts/data/helium-mobile-snapshot.json",
});
