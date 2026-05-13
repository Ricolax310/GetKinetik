import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const repoRoot = join(fileURLToPath(new URL("..", import.meta.url)));
const headersPath = join(repoRoot, "landing", "_headers");

function parseHeadersFile(source) {
  const rules = [];
  let currentRule = null;

  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trimEnd();
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    if (/^\s/.test(line)) {
      assert(currentRule, `header line without a route: ${line}`);
      if (trimmed.startsWith("! ")) {
        currentRule.headers.push({
          type: "detach",
          name: trimmed.slice(2).toLowerCase(),
        });
        continue;
      }

      const separator = trimmed.indexOf(":");
      assert.notEqual(separator, -1, `invalid header line: ${line}`);
      currentRule.headers.push({
        type: "attach",
        name: trimmed.slice(0, separator).toLowerCase(),
        value: trimmed.slice(separator + 1).trim(),
      });
      continue;
    }

    currentRule = { pattern: trimmed, headers: [] };
    rules.push(currentRule);
  }

  return rules;
}

function escapeRegex(value) {
  return value.replace(/[|\\{}()[\]^$+?.]/g, "\\$&");
}

function matchesPattern(pattern, path) {
  if (!pattern.includes("*")) {
    return pattern === path;
  }

  const matcher = new RegExp(`^${pattern.split("*").map(escapeRegex).join(".*")}$`);
  return matcher.test(path);
}

function headersForPath(rules, path) {
  const headers = new Map();

  for (const rule of rules) {
    if (!matchesPattern(rule.pattern, path)) {
      continue;
    }

    for (const header of rule.headers) {
      if (header.type === "detach") {
        headers.delete(header.name);
      } else {
        const values = headers.get(header.name) ?? [];
        values.push(header.value);
        headers.set(header.name, values);
      }
    }
  }

  return headers;
}

const rules = parseHeadersFile(readFileSync(headersPath, "utf8"));

for (const path of ["/api/docs", "/api/docs/", "/api/docs/index.html"]) {
  const cspValues = headersForPath(rules, path).get("content-security-policy") ?? [];

  assert.equal(
    cspValues.length,
    1,
    `${path} should replace, not inherit, the global CSP`,
  );
  assert.match(
    cspValues[0],
    /\bscript-src\b[^;]*https:\/\/unpkg\.com/,
    `${path} should allow the RapiDoc module from unpkg.com`,
  );
}

const rootCspValues = headersForPath(rules, "/").get("content-security-policy") ?? [];
assert.equal(rootCspValues.length, 1, "the homepage should keep exactly one CSP");
assert.doesNotMatch(
  rootCspValues[0],
  /https:\/\/unpkg\.com/,
  "the docs CDN exception must stay scoped to /api/docs",
);

console.log("landing _headers CSP rules are scoped and non-conflicting");
