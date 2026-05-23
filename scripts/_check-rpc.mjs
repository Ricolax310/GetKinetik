import fs from "node:fs";
import { loadEnvQuiet } from "./bureau/lib.mjs";

loadEnvQuiet();
const u = process.env.SOLANA_RPC_URL || "";
const raw =
  fs.readFileSync(".env", "utf8").split(/\n/).find((l) => l.trim().startsWith("SOLANA_RPC_URL=")) ||
  "";
const val = raw.split("=").slice(1).join("=").trim();

console.log("line found:", Boolean(raw));
console.log("has quotes:", val.startsWith('"') || val.startsWith("'"));
console.log("host:", (u.match(/^https:\/\/[^/?]+/) || [""])[0]);
console.log("key length:", (u.match(/api-key=([^&]+)/) || [])[1]?.length ?? 0);
console.log("trailing whitespace:", u.length !== u.trim().length);

if (!u.trim()) {
  console.log("RESULT: FAIL — SOLANA_RPC_URL not set");
  process.exit(1);
}

const r = await fetch(u, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    method: "getTokenSupply",
    params: ["4vMsoUT2BWatFweudnQM1xedRLfJgJ7hswhcpz4xgBTy"],
  }),
});
const j = await r.json();
if (j.error) {
  console.log("RESULT: FAIL —", j.error.message);
  process.exit(1);
}
console.log("RESULT: OK — Helius accepted key");
console.log("HONEY supply:", j.result?.value?.uiAmountString ?? "unknown");
