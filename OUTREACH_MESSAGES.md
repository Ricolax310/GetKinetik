# GETKINETIK — Ready-to-Send Outreach Messages

Copy-paste these directly into Discord DMs, Telegram, or Twitter/X.
Keep them short. Get on a call. Send the PITCH.md as a follow-up.

---

## DIMO

### Discord DM (to BD/partnerships admin)
```
Hey — I built something that might interest the DIMO team.

GETKINETIK is a DePIN earnings aggregator. Every user's device has a hardware-sealed Ed25519 key — we call it a Sovereign Node. We built a webhook your backend can POST to in order to verify a user's device is real and how long it's been running.

The pitch: offer DIMO users a small reward boost (even 5%) if they're running a verified GETKINETIK node. You get Sybil resistance. They earn more. Nobody touches anyone's tokens.

App is live on Android. Proof of Origin verified by external scanner → returned VALID.

Can I get 15 minutes with whoever handles integrations or partnerships?

Site: https://getkinetik.app
Webhook docs: https://github.com/Ricolax310/GetKinetik/blob/main/docs/api/verify-device.md
```

### Twitter/X DM
```
Hey @DIMO_Network — built a DePIN aggregator where every device carries a hardware-signed Proof of Origin. Built a webhook so your backend can verify users are real before paying out. Sybil resistance for you, verified-user bonus for them. 15-min call? getkinetik.app
```

---

## Hivemapper

### Discord DM (post in #mip-26 or DM a mod)
```
Hey — contributing to the MIP-26 conversation here.

I built GETKINETIK, a DePIN aggregator. Relevant to Hivemapper: every user running our app has a hardware-sealed Ed25519 identity (Sovereign Node). I built a verify-device webhook — one API call returns whether a user's device is cryptographically verified and how long it's been running.

Hivemapper's fraud problem (GPS spoofers, fake mappers) is exactly what this addresses. A Hivemapper user running GETKINETIK = provably real device, provably real uptime log. You could tie that to a HONEY reward multiplier or just use it as a fraud filter.

App is live. Webhook is live. No SDK required on your side.

15 minutes with your integrations team?

https://getkinetik.app
```

### Twitter/X DM
```
@Hivemapper — GPS spoofers are a known problem. I built a hardware-signed device identity layer for DePIN users. One webhook call tells you if a mapper's device is real. No SDK. No dependency. Just a POST. Would love 15 min. getkinetik.app
```

---

## WeatherXM

### Discord DM
```
Hey — quick intro: I built GETKINETIK, a DePIN earnings aggregator with a hardware-signed device identity layer (Ed25519, sealed in the phone's secure enclave).

The part that might interest WeatherXM: I built a verify-device webhook. You POST a user's proof URL, I return verified + device age + uptime heartbeats. If a weather station operator runs GETKINETIK, you can verify their device is real before processing their data contribution.

Think of it as a ground-truth signal for data quality — you know the device is hardware-verified, not a simulation or bot.

App is live on Android. Proof of Origin externally verified.

Is there someone on the team I could show this to? 15 minutes.

https://getkinetik.app
```

### Telegram DM (if WeatherXM team is on Telegram)
```
Hi! I built a DePIN aggregator called GETKINETIK. Every user carries a hardware-signed device certificate. Built a webhook your backend can call to verify device authenticity before rewarding a weather station operator. Would love 15 min with your team — could help with data quality verification. https://getkinetik.app
```

---

## Nodle

### Discord DM
```
Hey Nodle team — I built GETKINETIK, a DePIN earnings aggregator running on Android.

Nodle is already integrated as an adapter. What I want to discuss: I built a hardware-signed identity layer on top. Every user has a Sovereign Node with an Ed25519 key sealed in their device. I have a verify-device webhook — one POST call returns whether the node is real and how long it's been running.

If Nodle ever wants to offer NODL reward boosts to verified-device operators, this is a zero-dependency way to do it. The user gets more incentive to run Nodle. You get better network quality data.

15 minutes?

https://getkinetik.app
Webhook: https://github.com/Ricolax310/GetKinetik/blob/main/docs/api/verify-device.md
```

---

## Geodnet

### Discord/Telegram DM
```
Hi — I'm Eric, building GETKINETIK, a DePIN earnings aggregator.

Geodnet is one of our five integrated networks. I also built a verify-device webhook for partners. If a Geodnet operator is running GETKINETIK, their device has a hardware-sealed Ed25519 key and a hash-chained uptime log. You can verify them in one API call.

This could be useful for distinguishing real GNSS operators from bot-submitted data. I'd love 15 minutes with your integrations or BD team.

https://getkinetik.app
```

---

## General Cold DM (for any new network)
```
Hi — I'm Eric, building GETKINETIK (getkinetik.app).

It's a DePIN earnings aggregator where every user's device has a hardware-sealed Ed25519 sovereign identity. I built a verify-device webhook so partner networks can check if a user is cryptographically real before paying out rewards.

Your network + our verified users = you get fraud resistance, they get a reward boost. Zero SDK. One API call.

Would love 15 minutes with whoever handles BD or integrations.
```

---

## Getting on a Phone Call — What to Say When They Respond

**If they say "tell me more":**
> "Here's a one-pager: [paste PITCH.md contents or link to getkinetik.app]. The short version: your users who run GETKINETIK are hardware-verified. One webhook call confirms it. I want to talk about what a verified-user reward tier would look like for your network. When's a good time for 15 minutes?"

**If they say "send us an email":**
> Subject: GETKINETIK × [Network] — Hardware-Verified User Layer
> Body: Use the PARTNER_EMAILS.md template for their network.

**If they ask for a demo:**
> "Absolutely. I can screen-share the app live, show you the Proof of Origin being generated on my device, and walk you through the verify-device webhook response. 15 minutes via Google Meet or Discord call — your preference. When works?"

---

## Priority Order for Outreach (Today)

1. **DIMO** — already have the most context, OAuth integration built
2. **Hivemapper** — MIP-26 is active, perfect timing
3. **Nodle** — already integrated, lowest barrier to a yes
4. **WeatherXM** — data quality angle is strong
5. **Geodnet** — GNSS fraud angle, smaller team = faster decisions
