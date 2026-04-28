# GETKINETIK — Where we are right now

Written 2026-04-28, ~4:15 PM PT. After your v1.3.2 phone test, before
your break. Read this first when you come back.

---

## TL;DR

You don't need to do anything technical to start. **The most useful
single test you can run is to retap "Connect DIMO" on the v1.3.2 build
already on your phone.** I fixed the bounce page on the website while
you were away — same APK, no reinstall, no waiting on a build. Two
minutes, no decisions required.

Then come tell me what happens.

---

## What got fixed while you were away

Two bugs surfaced from your phone test. I worked on both. Status:

### 1. DIMO bounce-page handoff was dropping the wallet (FIXED, LIVE)

**The bug.** When you tapped DIMO and went through the email-code
flow, you ended up on a webpage that said "Returning to GETKINETIK…
Tap to return." You tapped it, the app reopened, but DIMO stayed
"not active." That's because the manual return button on the bounce
page had its href hard-coded as plain `getkinetik://dimo-callback`
with **no query string**. So when you tapped it, the app received
a deep-link with no wallet address, the registration call returned
null, and DIMO stayed unregistered. The auto-redirect script in the
same page WAS trying to forward params, but Chrome on Android blocks
silent scheme launches without a user gesture, so it never actually
fired — leaving the broken button as the only path.

**The fix.** One real change: rewrite the button's `href` on page
load to include `window.location.search`, so the wallet param survives
the round-trip. Plus some defensive cleanup of the auto-redirect
script. Committed (`7adf2af`), pushed, and Cloudflare auto-deployed
the new page in ~30 seconds. **It is live on getkinetik.app/dimo-callback
right now.**

**What this means for you.** The fix is on the website, not in the
app. So **the v1.3.2 APK already on your phone should now complete
the DIMO connection** — no reinstall, no rebuild, no waiting. This
is the test I want you to run when you're back. (Details below.)

**The deeper bug.** Custom Tab interception (the supposed happy
path where the browser tab closes by itself) is also failing. The
bounce page is acting as the de-facto happy path on this device,
which is fine — it works — but it's worth investigating later why
`openAuthSessionAsync` isn't doing its job. Not blocking; parking it.

### 2. Gemstone still jitters in v1.3.2 (ROOT CAUSE FOUND, FIX COMMITTED, NOT BUILT)

**The bug.** v1.3.2 didn't fix the gem jitter. v1.3.1's UI-thread
rewrite swapped `expo-sensors` for Reanimated's `useAnimatedSensor`,
and v1.3.2 added a deadzone + slower EMA — none of it worked.

**The root cause.** Unit mismatch I missed in the original v1.3.1
swap:

| library | units | typical magnitude |
|---|---|---|
| `expo-sensors` Accelerometer (old) | g | ±1 |
| Reanimated `useAnimatedSensor` (new) | m/s² | ±9.81 |

Every constant below the sensor read — the `[-1, 1]` clamp, the
`0.025` deadzone, the EMA step sizes — was tuned for g-units. With
m/s² inputs flowing through that math:

- Sensor noise of ±0.05 m/s² **passes** the 0.025 deadzone (since
  0.05 > 0.025 in raw units), so micro-jitter leaks straight into
  the EMA. Visible jitter at rest. Exactly what you saw.
- Tilts past ~6° saturate the ±1 clamp immediately, so the visual
  response feels binary.

**The fix.** One line per axis: divide the raw sample by 9.80665
(standard gravity) before clamping. Restores the g-unit frame the
rest of the math assumes. Sensor noise becomes ~±0.005 g, comfortably
below the 0.025 deadzone — gem mathematically still at rest. Full
±1 dynamic range covers level → ~90° tilts smoothly. Committed
(`f1af7cd`), but **NOT firing a build yet** — see below.

**Why not build yet?** Two reasons:
1. The fix is hypothesis-grade. If the unit-mismatch theory is
   correct (which I'm confident in based on the Reanimated source +
   the symptom pattern), this nails it. If it's wrong, the gem
   would become slightly unresponsive instead of jittery — a less
   bad failure mode but still a v1.3.4. I'd rather pair this with
   one DIMO investigation pass before burning EAS credits.
2. We may also want to dig into why `openAuthSessionAsync` is
   failing. If we find anything, we can fold it into the same v1.3.3
   build. Otherwise the bounce-page-as-happy-path is fine.

---

## When you're back, do these in order

### Step 1 — DIMO retest (~2 min, the highest-leverage thing)

The v1.3.2 APK is already on your phone. Do not reinstall.

1. Open GETKINETIK on your phone
2. Find the DIMO card in the aggregator panel
3. Tap "Connect DIMO" (or whatever the connect-state button says
   right now — might be "ENABLE" or "TAP TO START EARNING")
4. Go through the DIMO consent flow again — agree, log in with the
   email code
5. **Watch what happens at the redirect.** Two possibilities:
   - **Best case:** the Custom Tab closes by itself and you land
     in the app with DIMO showing as connected (wallet visible)
     → tell me, I'll mark `openAuthSessionAsync` as
     "intermittent but works" and we move on
   - **Likely case:** you see the bounce page ("Returning to
     GETKINETIK…"), you tap "Return to App," and **THIS TIME** the
     app shows DIMO as connected with your wallet → tell me, fix
     confirmed, ready to ship
   - **Bad case:** something still doesn't work → tell me exactly
     what you see and I'll dig deeper

That single test gates the next 3 hours of work.

### Step 2 — gem fix check (no action, just a question)

Once DIMO is sorted, the only thing left blocking v1.3.3 is whether
the gem fix sounds right to you. The HANDOFF section above explains
the unit-mismatch theory — if you trust it, just say "build v1.3.3"
and I'll fire it. If you want me to add anything else (other bug
fixes, polish, whatever), tell me what before we burn the build.

### Step 3 — what v1.3.3 ships (assuming Step 1 confirms DIMO works)

```
Build:        v1.3.3 (versionCode 8)
Includes:     - Gem unit-conversion fix (jitter at rest, m/s² → g)
              - Carries forward all v1.3.2 fixes:
                 · DIMO HTTPS redirect URI architectural fix
                 · NODE VALUATION ticker removal
                 · Gem UI-thread rewrite (Reanimated)
              - Implicit: bounce-page fix is already live, no app
                code change needed for it
Doesn't include:  - openAuthSessionAsync investigation (parked,
                    bounce-page fallback works fine in practice)
                  - Verifier atob bug (probably user-paste-truncation
                    issue, not a code bug, parked)
                  - STATUS.md full rewrite (top section updated,
                    rest is stale; can be a session of its own)

Steps after build:  1. Download APK
                    2. Compute SHA256
                    3. Phone test (THIS time gate before public release)
                    4. Create GitHub Release v1.3.3 with APK + notes
                    5. Bump landing/app.js → push → site auto-redeploys
                    6. (Optional) draft a "what's new" note for the
                       partner outreach thread
```

---

## State of the working tree

| What | Where | Status |
|---|---|---|
| Bounce-page fix | `landing/dimo-callback/index.html` | committed `7adf2af`, pushed, **live on Cloudflare** |
| Gem unit-conversion fix | `src/components/Gemstone.tsx` | committed `f1af7cd`, pushed, **NOT built** |
| STATUS.md update | `STATUS.md` | committed `0289a3f`, pushed |
| `landing/app.js` APK URL | uncommitted, pointed at v1.3.2 | **HOLD** — bump to v1.3.3 after Release v1.3.3 exists |
| v1.3.2 APK | `artifacts/getkinetik-v1.3.2.apk` (gitignored) | NOT publicly released, will likely be replaced by v1.3.3 |
| v1.3.2 release notes | `.git/RELEASE_NOTES_v1.3.2.tmp` | **HOLD** — will rewrite to v1.3.3 once final fix list is set |
| Debug script from atob investigation | `scripts/debug-decode.mjs` | untracked, can delete or keep |

No commits or pushes are blocked on you. Everything is in main.

---

## Bigger picture / not for today

These came up in the session but aren't blocking. Listed so they
don't get lost.

- **`openAuthSessionAsync` interception failure.** Worth a closer
  look once we have a clean v1.3.3 out the door. Probably a
  multi-hop redirect chain in DIMO's auth that the URL observer
  loses track of. Workable around with the bounce page in the
  meantime.

- **Verifier `atob` error from a real partner-outreach link.** Most
  likely a copy-paste truncation (literal `...` chars in the URL).
  The full URL from `scripts/mint-demo-proof.mjs` decodes cleanly.
  Could harden the verifier to skip non-base64url characters
  defensively — minor polish, not urgent.

- **STATUS.md is mostly stale.** Top section is current; the rest
  reflects pre-v1.3 thinking. Worth a full pass when there's time
  and energy. Not now.

- **Reanimated strict-mode `.value` read warning.** Mentioned in
  earlier scans, still parked. Not user-visible.

- **Partner outreach thread** is healthy and stalled in the right
  way (waiting on responses). No new sends needed today.

---

## Energy check

You burnt out on this push specifically because the build cycle was
slow + the bug surfaced AT THE PHONE TEST, after we thought we were
done. That's exhausting. The good news: the phone test did its job
— two real bugs caught before public release, both now diagnosed,
one fully fixed and one fix committed waiting on validation. That's
exactly the discipline you wanted. The work is in good shape.

When you're ready: the DIMO retest is a 2-minute thing. No
preparation needed. No code reading required. Just tap the button
and tell me what happens.

— end —
