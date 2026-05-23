import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(__dirname, "..", "..");
export const REGISTRY_PATH = path.join(__dirname, "networks.json");
export const LOG_PATH = path.join(REPO_ROOT, "scripts/data/bureau-run-log.json");
export const OUTREACH_DIR = path.join(REPO_ROOT, "docs/outreach/generated");
export const PIPELINE_PATH = path.join(REPO_ROOT, "scripts/data/bureau-pipeline.json");

const REDACT_PATTERNS = [
  /api-key=[^&\s"']+/gi,
  /apikey=[^&\s"']+/gi,
  /Bearer\s+[A-Za-z0-9._-]+/gi,
];

export function redactSecrets(text) {
  let out = String(text);
  for (const re of REDACT_PATTERNS) {
    out = out.replace(re, "api-key=[REDACTED]");
  }
  return out;
}

export function loadRegistry() {
  const raw = JSON.parse(fs.readFileSync(REGISTRY_PATH, "utf8"));
  if (!Array.isArray(raw.networks)) {
    throw new Error("networks.json: missing networks array");
  }
  return raw.networks;
}

export function resolveRepo(rel) {
  return path.join(REPO_ROOT, rel);
}

export function fileAgeMs(absPath) {
  if (!fs.existsSync(absPath)) return null;
  const st = fs.statSync(absPath);
  return Date.now() - st.mtimeMs;
}

export function formatAge(ms) {
  if (ms == null) return "never";
  const h = Math.floor(ms / 3_600_000);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export function loadEnvQuiet() {
  const envPath = path.join(REPO_ROOT, ".env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq <= 0) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
}

export function appendLog(entry) {
  let log = { runs: [] };
  if (fs.existsSync(LOG_PATH)) {
    try {
      log = JSON.parse(fs.readFileSync(LOG_PATH, "utf8"));
    } catch {
      log = { runs: [] };
    }
  }
  log.runs.unshift({
    ...entry,
    at: new Date().toISOString(),
  });
  log.runs = log.runs.slice(0, 100);
  fs.mkdirSync(path.dirname(LOG_PATH), { recursive: true });
  fs.writeFileSync(LOG_PATH, JSON.stringify(log, null, 2), "utf8");
}

export function writePipelineSummary(results) {
  const payload = {
    updatedAt: new Date().toISOString(),
    direction: "neutral DePIN bureau — friendly helper, second read not replacement",
    networks: results,
  };
  fs.mkdirSync(path.dirname(PIPELINE_PATH), { recursive: true });
  fs.writeFileSync(PIPELINE_PATH, JSON.stringify(payload, null, 2), "utf8");
}

/** Pull numbered headline bullets from bureau markdown reports. */
export function extractHeadlineFindings(reportMd) {
  const m = reportMd.match(/## Headline findings\r?\n\r?\n([\s\S]*?)\r?\n\r?\n---/);
  if (m) {
    return m[1]
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => /^\d+\.\s+\*\*/.test(l))
      .slice(0, 4)
      .map((l) => l.replace(/^\d+\.\s+/, "").replace(/\*\*/g, ""));
  }
  const bullets = reportMd
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => /^\d+\.\s+\*\*/.test(l))
    .slice(0, 4)
    .map((l) => l.replace(/^\d+\.\s+/, "").replace(/\*\*/g, ""));
  return bullets;
}

export function extractReportMeta(reportMd) {
  const generated = reportMd.match(/\*\*Generated:\*\*\s*([^\n]+)/)?.[1]?.trim();
  const source =
    reportMd.match(/\*\*Public source:\*\*\s*`([^`]+)`/)?.[1]?.trim() ||
    reportMd.match(/\*\*Solana RPC used:\*\*\s*`([^`]+)`/)?.[1]?.trim() ||
    null;
  const observed =
    reportMd.match(/\*\*Stations observed:\*\*\s*([\d,]+)/)?.[1]?.replace(/,/g, "") ||
    reportMd.match(/\*\*Cells observed:\*\*\s*([\d,]+)/)?.[1]?.replace(/,/g, "") ||
    null;
  return { generated, source: source ? redactSecrets(source) : null, observed };
}

export function buildOutreachDraft(net, reportMd) {
  const findings = extractHeadlineFindings(reportMd);
  const meta = extractReportMeta(reportMd);
  const reportUrl = `https://github.com/Ricolax310/GetKinetik/blob/main/${net.report.replace(/\\/g, "/")}`;
  const findingBlock =
    findings.length > 0
      ? findings.map((f, i) => `${i + 1}. ${f}`).join("\n")
      : "1. _(Re-run scan — headline findings section missing from report.)_";

  return `# ${net.name} — outreach draft (auto-generated)

> **Tone:** neutral bureau, friendly helper — second read, not replacement.  
> **Generated:** ${new Date().toISOString()}  
> **Report:** [${net.report}](${reportUrl})  
> **Do not auto-send.** Review, personalize \`<name>\`, then send manually.

---

## Email / DM (friendly helper)

**Subject:** Independent public-data read on ${net.name} — sharing before we post anywhere

Hi <name>,

Eric here — GETKINETIK is the **neutral DePIN bureau**: a friendly second read on public data, not a replacement for your internal genuity stack. We don't pick sides and we don't ask you to integrate anything to receive this note.

We ran a reproducible sample read against **${net.publicSource}** (${meta.generated ? `snapshot ${meta.generated}` : "see linked report"}). **No internal ${net.name} data was used.** Methodology is open; anyone can re-run it.

**Patterns worth cross-checking against your analytics:**

${findingBlock}

Full report (markdown): ${reportUrl}

If useful, happy to walk through it in 15 minutes — or stay async. When you want hardware-rooted certainty on specific devices, \`POST https://getkinetik.app/api/verify-device\` with a Proof of Origin URL is the optional next step (offline verifier: \`npm i @getkinetik/verify\`).

Charter: https://github.com/Ricolax310/GetKinetik/blob/main/NEUTRALITY.md

— Eric  
eric@outfromnothingllc.com · https://getkinetik.app/bureau/

---

## Discord one-paragraph

Hi — Eric / GETKINETIK (neutral DePIN bureau, friendly second read). Ran a reproducible public-data sample read on ${net.name} (${net.publicSource}). No internal data used. Headline patterns: ${findings.slice(0, 2).map((f) => f.replace(/\.\s*$/, "")).join("; ")}. Sharing before posting anywhere. Report: ${reportUrl}

---

## Don't (automation guardrails)

- Don't auto-send this file — human review required.
- Don't say "fraud" or "Sybil proved" — use **pattern**, **shape**, **worth cross-checking**.
- Don't paste the full report into DMs — link it.
- Don't post in public channels before a team DM unless they invite it.
`;
}
