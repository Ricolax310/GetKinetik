# GETKINETIK — Web Frontend & Edge Function Rules

> **TARGET DIRECTORIES:** These rules apply strictly to browser-facing assets in `landing/` and edge workers in `functions/`. Any modification to files in these directories must align with edge execution constraints and strict browser security policies.

---

## 1. Zero-CDN Cryptography (Vendoring Policy)
The web verifier (`landing/verify/verifier.js`) must be 100% self-contained and run in air-gapped/offline environments.
- **Vendored Core**: All cryptographic packages (`@noble/ed25519` and `@noble/hashes`) MUST be vendored locally under `landing/verify/vendor/` as static ES-modules.
- **Banned Imports**: Banned from importing any external CDNs (e.g., `esm.sh`, `unpkg`, `cdnjs`) or external script tags inside HTML verifier pages.
- **CSP Compliance**: Deploys cleanly under strict Content Security Policy (`script-src 'self'`). Never introduce inline script execution blocks or code that violates this.

---

## 2. Defensive Base64Url Parsing
The verifier decodes proofs directly from QR codes and URL fragments (`#proof=...`). Input handling must be defensive against transmission corruption:
- **Ellipsis Detection**: Explicitly check for triple dots (`...`) or Unicode ellipsis (`\u2026`) in inputs. If found, surface a clear, helpful error message explaining that the URL was truncated by the host email/chat client, rather than throwing a low-level browser decode error.
- **Alphabet Filtering**: Before base64url decoding, strip out any characters outside the base64url alphabet (`A-Z, a-z, 0-9, '-', '_'`). This filters out white spaces, line breaks from word wraps, and rich-text payload artifacts.
- **Padding Restore**: Automatically restore correct `=` padding after filtering and before performing `atob()` decoding.

---

## 3. DOM Rendering Security
The verifier outputs user-supplied data (such as Node IDs, public keys, and custom attestation variables) back to the screen:
- **XSS Prevention**: Never insert raw, unescaped user-supplied values into the DOM using `innerHTML`.
- **Text Nodes**: Prefer `textContent` or `innerText` for simple string values.
- **HTML Escaping**: If `innerHTML` is required for layout purposes, values MUST be passed through the robust character-escaping helper `esc()` to filter out special characters:
  ```javascript
  const esc = (s) =>
    String(s).replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
    );
  ```

---

## 4. Lockstep Cache-Busting Invariant
Mobile browsers (especially Safari and Chrome on iOS/Android) aggressively cache JavaScript bundles:
- **Lockstep Updates**: Every time you modify `landing/verify/verifier.js` or `stableStringify` contracts, you MUST bump:
  1. The version string in `verifier.js` (`window.__kinetikVerifier.version`).
  2. The `?v=...` query cache-busting strings on the `<script>` imports inside `landing/verify/index.html`.
- **Failure Case**: Bumping the JavaScript version without changing the index.html cache-buster means returning users will execute cached, legacy verifier bundles, leading to validation mismatches.

---

## 5. UI Error Suppression
Operational metrics show that surfacing raw browser stack traces in public verification interfaces confuses users and leaks implementation details:
- **Clean Reports**: Output human-readable messages to the UI.
- **Developer Debugging**: Keep deep error stack traces strictly logged to the developer console via `console.error('[verifier]', err)`.
