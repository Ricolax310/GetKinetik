// Helium IoT subnetwork scan → report + snapshot (real Entity API data).

import { runHeliumScan } from "./bureau/helium-scan.mjs";

await runHeliumScan({
  subnetwork: "iot",
  networkLabel: "Helium IoT Network",
  reportPath: "docs/reports/helium-iot-sybil-report.md",
  snapshotPath: "scripts/data/helium-iot-snapshot.json",
});
