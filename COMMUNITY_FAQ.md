# GETKINETIK — Community FAQ

> Written for the Discord community bot. Plain language only.
> If someone asks a question and feels dumb for asking, we failed.
> Every answer here should feel like a friend texting back.

---

## "Wait, what even IS this?"

**Okay, what is GETKINETIK in plain English?**

You know how your phone has sensors — it knows if you're moving, what the light is like, what direction you're facing? Normally that data just... sits there. Nobody pays you for it.

GETKINETIK changes that. It connects your phone to networks that actually pay people for real-world data — like Nodle (pays you for keeping Bluetooth on), or DIMO (pays car owners for sharing vehicle data). Instead of downloading five different apps and logging into five different accounts, GETKINETIK puts them all in one place and keeps track of everything you've earned.

That's it. Your phone becomes a little node that earns, and GETKINETIK is the dashboard.

**Do I need to know anything about crypto to use this?**

No. You don't need to understand blockchain, wallets, tokens, or any of that to download the app and start. The app handles all of it. If you want to dig into the technical stuff later, it's there — but you don't have to.

**Is this like mining crypto?**

Kind of, but different. Traditional crypto mining uses a lot of electricity and expensive hardware. This uses things your phone is already doing — being on, sensing its environment, connecting to nearby devices. It's more like getting paid for existing than grinding for coins.

**Who made this?**

Eric (Kinetik_Rick), building under **OutFromNothing LLC**. Solo founder, indie project, early stage. No VC funding, no hype — just building.

---

## Getting the app

**How do I get it?**

Go to **getkinetik.app** on your Android phone and tap the big button. It'll download the app directly to your phone.

**Why do I have to allow "install from unknown sources"?**

Because the app isn't on the Play Store yet (that's coming). "Unknown sources" just means Android is letting you install an app that didn't come from Google — it's the same thing you'd do to install any app that's in early access. Totally normal for a project at this stage.

**Is it safe to install?**

Yes. The app is built by a real company (OutFromNothing LLC), the code is public on GitHub, and anyone can audit it. We also publish a "proof" with every node that anyone can mathematically verify — it's actually one of the most auditable apps in this space.

**Is it on iPhone?**

Not yet. Apple makes it really hard for apps like this to run sensors in the background, so Android comes first. If you're on iPhone, you can sign up for the waitlist at getkinetik.app and we'll let you know when iOS is ready.

**The download gave me a 404 error (broken page).**

Try going directly to **github.com/Ricolax310/GetKinetik/releases/latest** — that always has the latest version.

---

## How it works (no tech degree required)

**What does it actually DO on my phone?**

When you open the app for the first time, it creates a unique identity just for your phone — like a fingerprint that proves it's really your device. Then it starts a timer. Every 60 seconds it logs a heartbeat — basically stamping "still here, still running" with your phone's fingerprint. Over time this builds a record: your node has been running for X days, it's signed Y heartbeats, here's proof.

**What's a "node"?**

Just a word for your phone once it's part of the network. Your phone = your node. That's all.

**What's a "Proof of Origin"?**

It's a receipt. A signed document that says: this specific device exists, it was activated on this date, it's been running this long, and here's the math to prove none of it was made up. Like a birth certificate for your node — except way harder to fake than a real birth certificate.

**Can I see my proof?**

Yes! In the app, there's a card with your Proof of Origin. Tap share and you get a link. Send that link to anyone and they can click it to verify your node is real — no account needed, no app needed, just a browser.

**What are the networks it connects to?**

Right now: **Nodle, DIMO, Hivemapper, WeatherXM, and Geodnet**. Each one pays for something different — Bluetooth coverage, car data, map footage, weather data, GPS signal. More networks are being added.

**Does GETKINETIK replace those apps?**

No. Think of it as a layer on top. You still use those apps to do their thing. GETKINETIK just reads how much you've earned across all of them and keeps a signed record of it.

---

## Your key — the most important thing

**What's "the key"?**

When the app starts for the first time, it creates a secret key — like an ultra-secure password — that lives only on your phone. This key is what makes your node yours. It's what signs every proof, every heartbeat, every receipt.

**What happens if I lose my phone?**

Less than you'd think. Here's the full picture:

- **Your DePIN earnings (DIMO, Nodle, etc.)** — totally safe. Those live in your wallet on those networks. GETKINETIK never touched them.
- **Your Genesis Credits** — as long as you've transferred or cashed them out to your wallet before losing the phone, they're safe too. Credits that were already moved out are gone from the phone, sitting safely in your wallet.
- **What's actually lost** — only your node's anonymous identity and its seniority (how long it's been running). That's it.

And even that isn't as painful as it sounds. The identity is fully anonymous — the network never knew who you were, just that a node with that ID had been running for X days. You can create a new one instantly. You'd just be starting the seniority clock over.

The only real "loss" is time. The longer a node has been running, the more its track record is worth as the network matures. You can't get those days back. But your money? Always yours, always in your wallet.

**The short version:** keep your credits transferred out regularly and losing your phone is basically just an inconvenience, not a disaster.

**Can I back up the node identity so I don't lose the seniority?**

Not yet — but it's coming in v1.4. You'll be able to write down 12 words (like a crypto recovery phrase) and restore your exact node on a new phone. Only one device active at a time.

**Why can't you just store it on a server?**

Because the entire point of the node identity is that it's anonymous and only yours. The moment a copy lives on a server, that server could theoretically sign things as you — which breaks the guarantee. No server = nobody can impersonate your node, access your history, or fake your proofs. That's the design, and we think it's the right one.

---

## The DIMO login

**How does logging into DIMO work?**

Tap "Login with DIMO" in the app. It opens the DIMO website in your browser. You log in there, authorize GETKINETIK to read your balance, and it sends you back to the app. We never see your DIMO password or your wallet keys — just your balance.

**It says "Demo" on the login screen — is that a bug?**

Nope! "Demo" is just short for "DIMO." It's the DIMO authorization screen, not a demo mode. Confusing name — not a bug.

**After I log in it's not showing DIMO as active.**

This was a bug in earlier versions. It should work correctly in v1.3.3 (coming very soon). If you're on an older version, update the app and try again.

---

## The ruby / gem in the app

**What's the spinning gem thing?**

That's the Gemstone — the visual heart of your node. It responds to how you hold your phone. Tilt it left, the shine moves left. It's not just decoration — it's a live indicator that your phone's sensors are active and your node is running.

**The gem moves around even when I'm holding the phone still — is that broken?**

Yes, that's a known bug in earlier builds. The sensor readings were in the wrong units and caused the gem to jitter at rest. It's fixed in v1.3.3, coming very soon.

---

## Earning + money stuff

**Does this actually make money?**

That depends on which networks you connect to and how active your device is. Nodle pays in NODL tokens for keeping Bluetooth on. DIMO pays $DIMO for sharing car data (you need a car). These are real networks with real token economies — but be realistic: this is passive income, not a salary.

**When do I get paid?**

Earnings flow through the partner networks directly. GETKINETIK tracks and signs your receipts but doesn't hold your money or send payouts — that comes from Nodle, DIMO, etc. directly to your wallet on their networks.

**Does GETKINETIK take a cut?**

Not yet. Everything is free during the preview. Eventually there's a 1% fee on earnings routed through the optimizer — but that feature isn't live yet.

**Is there a token? A GETKINETIK coin?**

No token yet. Genesis Credits (the points you earn now) are being tracked for a potential future launch. Nothing to buy, nothing to sell right now.

---

## Community + contact

**How do I report a bug?**

Post in the Discord or open an issue at **github.com/Ricolax310/GetKinetik**.

**How do I reach the founder directly?**

Email **eric@outfromnothingllc.com** or DM in Discord.

**I represent a DePIN network and want to talk partnerships.**

Email eric@outfromnothingllc.com or open a "Partner Integration" issue on GitHub.

**Is this a scam?**

Fair question to ask about anything crypto. Here's what you can check yourself: the app's cryptographic proofs are publicly verifiable at **getkinetik.app/verify/** — you can paste any proof URL and the math either checks out or it doesn't. The code is on GitHub. The founder posts publicly. There's no "send us ETH to unlock earnings" or anything like that. Do your own research, but the receipts are literally public.
