# GETKINETIK — 5-Minute Integration Guide

> **You want to know:** is this user's device real hardware, or is it a script/emulator/clone?  
> **One POST. No auth. No SDK. No account.**

---

## How it works (30 seconds)

1. User opens the GETKINETIK app → taps **Share Proof** → copies a URL.
2. User pastes that URL into your onboarding flow (or sends it to you).
3. Your backend POSTs it to our endpoint → you get `valid: true/false` + node identity.

That's it.

---

## Try it right now (no setup)

Paste this in your terminal:

```bash
curl -s -X POST https://getkinetik.app/api/verify-device \
  -H "Content-Type: application/json" \
  -d '{"proofUrl":"https://getkinetik.app/verify/#proof=eyJwYXlsb2FkIjp7InYiOjIsImtpbmQiOiJwcm9vZi1vZi1vcmlnaW4iLCJub2RlSWQiOiJLSU5FVElLLU5PREUtQ0RDMjYyRTciLCJwdWJrZXkiOiJmZjA3ZTUzZDU4NjM5ODIwMWU3N2IxMWI5N2EzOWFiMDg4YjJmMDk2ODI4MDhhZDJiMGViN2Q2YTY3ZGUxNjczIiwibWludGVkQXQiOjE3Nzc4NjMyODg5OTgsImlzc3VlZEF0IjoxNzc4NjQwODg4OTk4LCJsaWZldGltZUJlYXRzIjoyNTg0NywiZmlyc3RCZWF0VHMiOjE3Nzc4NjMyOTM5OTgsImNoYWluVGlwIjoiMjExZTA5OGEwNzM5ZmI2NiIsImF0dHJpYnV0aW9uIjoiR0VUS0lORVRJSyBieSBPdXRGcm9tTm90aGluZyBMTEMiLCJzZW5zb3JzIjp7Imx1eCI6NDEyLCJtb3Rpb25SbXMiOjAuMDYsInByZXNzdXJlSHBhIjoxMDE0LjA3fX0sInNpZ25hdHVyZSI6Ijc3NGVkODg2ODBhODcyNzQ4NDBmZDAzMGNmZDFmODQ3ZmJjNTBlOWJmOGY3NmU0N2Y5ZDBhNTcwYmNiNzFmY2M3ODgyYzJmYTM5YzM0MTM1NjE1MmYxNDQzMDcwN2E4MGE4NzI5ZmUxYmNkNDdlZGM2ZGE0ZjI5M2JkZThkNjA4In0"}'
```

You'll get back:

```json
{
  "valid": true,
  "nodeId": "KINETIK-NODE-CDC262E7",
  "pubkey": "ff07e53d...",
  "mintedAt": 1777863288998,
  "schema": "proof-of-origin:v2",
  "attribution": "GETKINETIK by OutFromNothing LLC"
}
```

**That's a real cryptographic verification.** No server state — the signature in the URL is the proof.

---

## Add it to your payout logic

### Node.js / TypeScript

```typescript
async function isDeviceVerified(proofUrl: string): Promise<boolean> {
  const res = await fetch('https://getkinetik.app/api/verify-device', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ proofUrl }),
  });
  const data = await res.json();
  return data.valid === true;
}

// In your payout handler:
if (await isDeviceVerified(user.kinetikProofUrl)) {
  reward = baseReward * 1.15; // verified-device premium
} else {
  reward = baseReward;
}
```

### Python

```python
import requests

def is_device_verified(proof_url: str) -> bool:
    r = requests.post(
        "https://getkinetik.app/api/verify-device",
        json={"proofUrl": proof_url},
        timeout=5,
    )
    return r.json().get("valid") is True
```

### Go

```go
func isDeviceVerified(proofURL string) (bool, error) {
    body, _ := json.Marshal(map[string]string{"proofUrl": proofURL})
    resp, err := http.Post(
        "https://getkinetik.app/api/verify-device",
        "application/json",
        bytes.NewReader(body),
    )
    if err != nil { return false, err }
    defer resp.Body.Close()
    var result struct { Valid bool `json:"valid"` }
    json.NewDecoder(resp.Body).Decode(&result)
    return result.Valid, nil
}
```

---

## What to store per user

```
nodeId    — stable identity key. Use as GETKINETIK identifier in your DB.
pubkey    — Ed25519 public key. Cache it; it never changes for a given node.
mintedAt  — when the node was born. Use for age-based gating (e.g. > 7 days old).
```

---

## User flow (what the user does)

1. You add a **"Connect GETKINETIK node"** step to your onboarding.
2. User opens GETKINETIK app → taps **Share Proof** → copies URL.
3. User pastes URL into your onboarding field.
4. Your backend calls `/api/verify-device` → stores `nodeId` + `valid` result.
5. Done. Re-verify every 24h or on suspicious activity.

---

## Caching

- Cache `valid: true` results for **24 hours** per `nodeId`.
- **Never cache `valid: false`** — the user may have regenerated their node.
- Re-verify immediately on any anomalous behaviour.

---

## Rate limits

| Tier | Limit |
|---|---|
| Free | 100 req/min per IP |
| Partner (API key) | 1,000 req/min — contact `eric@outfromnothingllc.com` |

---

## Full spec

[`docs/api/verify-device.md`](./api/verify-device.md)

---

## Questions / pilot

`eric@outfromnothingllc.com` · [getkinetik.app](https://getkinetik.app)
