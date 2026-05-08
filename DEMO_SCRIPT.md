# GETKINETIK — Demo Video Script
# Target length: 2:30–3:00 minutes
# Equipment: Your phone (screen record) + your laptop (browser). That's it.
# No voiceover editing needed — just record yourself talking naturally.

---

## SETUP BEFORE YOU RECORD

1. Install the latest APK on your Android phone
2. Have getkinetik.app/verify open on your laptop
3. Have a terminal open with this curl command ready (don't run it yet):
   ```
   curl -s -X POST https://getkinetik.app/api/verify-device \
     -H 'Content-Type: application/json' \
     -d '{"proofUrl":"PASTE_URL_HERE"}' | python -m json.tool
   ```
4. Screen record your phone AND your laptop simultaneously
   (use QuickTime on Mac to record the laptop, phone's built-in screen record for phone)
5. Use a free tool like Kapwing or CapCut to stitch them side by side — it takes 5 minutes

---

## THE SCRIPT

### [0:00–0:15] — HOOK. Phone screen only.

*Show the app open. Gem glowing. No talking for 3 seconds.*

**SAY:**
> "Every DePIN network in the world has the same problem. They can't tell
> which of their nodes are real. I built the solution."

*Tap PROOF chip (top-left of the crest). The Proof of Origin card slides up.*

---

### [0:15–0:40] — PROOF OF ORIGIN. Phone screen close-up.

*Show the card. Scroll slowly so the viewer sees: NODE ID, BEATS, SINCE,
CHAIN TIP, SIGNATURE, SENSORS. Then stop on the QR code.*

**SAY:**
> "This is a Proof of Origin. Every GETKINETIK user generates one.
> It contains a hardware-sealed node identity, a tamper-evident heartbeat
> count, sensor readings from the device, and an Ed25519 cryptographic
> signature. Nobody — including me — can fake this.
> The private key never leaves the phone."

*Point at the QR. Let it sit for 2 seconds.*

---

### [0:40–1:05] — THE VERIFY. Switch to laptop browser.

*Go to getkinetik.app/verify. The page is clean — just a text input and a VERIFY button.*

**SAY:**
> "Watch this. I'm going to scan the QR with my laptop camera—"

*Either scan with laptop camera OR tap SHARE on the phone, copy the URL,
paste it into the verifier text field. Both work. Use whichever is cleaner on camera.*

*Hit VERIFY. The green VERIFIED seal appears with the node details.*

**SAY:**
> "PROOF VERIFIED. Node ID, public key, heartbeat count, sensor block.
> All confirmed. Cryptographically. In a browser. No server call — this runs
> entirely in JavaScript on your machine. No trust in me required."

*Pause 2 seconds on the VERIFIED screen.*

---

### [1:05–1:30] — THE PARTNER API. Switch to terminal / laptop.

*Paste the proof URL into the curl command. Run it.*

```bash
curl -s -X POST https://getkinetik.app/api/verify-device \
  -H 'Content-Type: application/json' \
  -d '{"proofUrl":"https://getkinetik.app/verify/#proof=..."}' | python -m json.tool
```

*The JSON response prints:*
```json
{
  "valid": true,
  "nodeId": "KINETIK-NODE-XXXXXXXX",
  "pubkey": "...",
  "mintedAt": 1714000000000,
  "schema": "proof-of-origin:v2",
  "attribution": "GETKINETIK by OutFromNothing LLC"
}
```

**SAY:**
> "That's the partner API. One HTTP POST. Any backend. Any language.
> Returns valid or invalid, plus the node's identity fields.
> A DePIN network calls this before paying a reward. If it comes back valid,
> pay. If not, investigate. No SDK required. No account. No auth.
> You can test it right now — I'll put the endpoint in the description."

---

### [1:30–1:55] — THE EARNINGS DRAWER. Back to phone.

*Go back to the app home screen. Show the EARNINGS box.*

**SAY:**
> "The app also tracks real DePIN earnings. I have five networks integrated —
> Nodle, DIMO, Hivemapper, WeatherXM, Geodnet."

*Tap the EARNINGS box. The drawer slides up showing all 5 adapter cards.*

**SAY:**
> "Every earning delta gets signed into a local ledger — same Ed25519 key.
> Nothing is custodied. Nothing leaves the device unless the user shares it.
> We read the blockchain. We sign the record. The user owns it."

*Swipe the drawer down to dismiss.*

---

### [1:55–2:20] — THE THESIS. Face camera (optional — or just keep showing the app).

**SAY:**
> "Helium lost over $250 million to fake hotspots. Hivemapper is fighting
> GPS spoofers. WeatherXM shipped physical hardware just to verify devices.
> Every DePIN network has this problem. None of them can solve it for themselves —
> the grader has to be independent. That's what GETKINETIK is.
> The credit bureau for the decentralized physical economy.
> No token. No equity in any network we grade. Pure infrastructure.
> The product is live. The webhook is live. The first integrations are in motion."

---

### [2:20–2:30] — CLOSE. Static screen showing getkinetik.app.

**SAY:**
> "Test the webhook yourself — link in the description.
> Download the app — link in the description.
> If you're building in DePIN or investing in the space, I want to talk.
> Eric at OutFromNothing LLC. getkinetik.app."

*Hold on the site for 3 seconds. End recording.*

---

## POSTING CHECKLIST

**YouTube / Loom description (copy-paste):**
```
GETKINETIK — The independent trust layer for DePIN.

Test the verification API (no account needed):
POST https://getkinetik.app/api/verify-device

Verify a proof yourself:
https://getkinetik.app/verify/

Download the Android APK:
https://github.com/Ricolax310/GetKinetik/releases/latest

Source code:
https://github.com/Ricolax310/GetKinetik

Contact: eric@outfromnothingllc.com
```

**Thumbnail:** Screenshot of the VERIFIED seal on a dark background.
Text overlay: "Carfax for DePIN — live demo" in platinum white.

**Tags:** DePIN, Sybil resistance, device attestation, DIMO, Hivemapper,
WeatherXM, Geodnet, Helium, Web3 infrastructure, angel investment

---

## TIPS

- **Don't re-record 10 times.** One natural take, slight stumbles included,
  is more credible than a polished 20-take video. Investors fund humans.
- **Record in airplane mode then turn off airplane mode.** Avoids notification
  interruptions during the QR scan / API call.
- **The VERIFIED seal appearing is the money shot.** Pause there. Let it land.
- **Shaky hands? Prop the phone against a book.** No gimbal needed.
- **Lighting:** sit near a window. Natural light. No ring light required.

---

*OutFromNothing LLC · GETKINETIK · Demo Video Script · May 2026*
