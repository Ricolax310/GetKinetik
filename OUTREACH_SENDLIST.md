# GETKINETIK — Outreach Send-List

> **Companion to [`OUTREACH_MESSAGES.md`](./OUTREACH_MESSAGES.md).**
> That file is the message library (what to copy-paste).
> This file is the playbook — **who, when, what channel, what
> follow-up trigger, what counts as moving on.**

**Last refreshed:** 2026-05-13 — written the night
`@getkinetik/verify@0.1.0` went live on npm. The npm publish is now the
strongest credibility line; every send this week leads with it.

---

## The new credibility ladder (use this for every message)

Until 2026-05-12, the opener was: *"webhook is live, charter is public."*
That's still true. But the strongest opener now is:

> *"As of yesterday, our verifier is on npm.* `npm install @getkinetik/verify`
> *— same byte-for-byte cryptographic contract our app uses, zero network
> calls to us. A real bureau has to be verifiable by people who don't
> trust it. That's what we just shipped."*

That sentence belongs in the first paragraph of every outbound message
this week, regardless of network. It does three things at once:

1. Signals technical seriousness (we don't just talk; we ship)
2. Resolves the trust objection before they raise it ("why should we
   trust your scores?" → "you don't have to")
3. Gives them a concrete homework assignment between now and the call
   (`npm install @getkinetik/verify && node smoketest.mjs` runs in 30 sec)

---

## The send sequence (this week)

| Day | Time | Target | Channel | Contact | Message variant | Open in [`OUTREACH_MESSAGES.md`](./OUTREACH_MESSAGES.md) |
|-----|------|--------|---------|---------|-----------------|---------------------------------------------------------|
| **Tue 5/13** | tonight | **Twitter / X — public** | Post | own profile (`@Kinetik_Rick`) | **Thread 4 (npm publish moment)** + pin replaces Thread 1 | `TWITTER_THREAD.md` → Thread 4 |
| **Tue 5/13** | tonight | DePIN VC accounts | Twitter DM | `@KyleSamani` (Multicoin), `@DavidCox42` (Borderless), `@OnchainyV` | One-liner: *"We just shipped the verifier to npm. `npm i @getkinetik/verify`. Bureau is now independently verifiable. 15 min?"* + link to Thread 4 | new — see "Investor DM (one-liner)" below |
| **Wed 5/14** | AM | **Hivemapper** | Discord DM | a `#mip-26` mod or admin; if unclear, post the no-link variant in `#mip-26` first | "Hivemapper Discord DM (MIP-26)" + lead with npm publish | `OUTREACH_MESSAGES.md` → Hivemapper |
| **Wed 5/14** | PM | **DIMO** | Email | `grants@dimo.zone` (existing thread) — reply with subject "GETKINETIK × DIMO — npm publish update" | bureau email body + lead paragraph with npm publish | bespoke; template below |
| **Thu 5/15** | AM | **Geodnet** | support ticket | `https://support.geodnet.com/` (BD/integration ticket) | "Geodnet Discord/Telegram DM" adapted to ticket form | `OUTREACH_MESSAGES.md` → Geodnet |
| **Thu 5/15** | AM | **Geodnet** | Telegram | `t.me/geodnet` → public team contact (one-line) | Telegram one-liner from Geodnet section | `OUTREACH_MESSAGES.md` → Geodnet |
| **Thu 5/15** | PM | **WeatherXM** | Discord DM | a mod or BD/team account (visible in `#dev-api` member list) | "WeatherXM Discord DM" (full pitch OK in DM) | `OUTREACH_MESSAGES.md` → WeatherXM |
| **Fri 5/16** | AM | **Nodle** | Discord DM | `@Community Manager` | "Nodle Discord DM (bureau reframe)" + lead with npm publish | `OUTREACH_MESSAGES.md` → Nodle |
| **Fri 5/16** | PM | First **adjacent buyer** (DePIN lender) | Email or Twitter DM | Goldfinch BD, Centrifuge BD, or Maple Finance BD (whichever is most reachable) | "Adjacent buyers" cold message | `OUTREACH_MESSAGES.md` → Adjacent buyers |

**One target per slot. One channel per target. No multi-channel blasting on day 1.**
If a target is silent at 72 hours, bump once (see below). If they respond,
drop the rest of the day's targets — the call is the asset, not the volume.

---

## Investor DM (one-liner — Tuesday tonight)

Send to: `@KyleSamani`, `@DavidCox42`, `@OnchainyV`, plus any other DePIN
investor account you follow.

```
Hey — quick note since you cover DePIN.

GETKINETIK just shipped its verifier to npm:
  npm install @getkinetik/verify

Same byte-for-byte contract our app signs proofs with. A real
trust bureau has to be verifiable by people who don't trust
it — that's what we just shipped.

Charter: no token, no equity in graded networks, all USD/USDC.
$250K pre-seed. 15 min?

https://www.npmjs.com/package/@getkinetik/verify
https://getkinetik.app
```

---

## DIMO follow-up email (Wednesday PM)

> Reply to the existing `grants@dimo.zone` thread. Don't start a new one.
> Subject: **GETKINETIK × DIMO — npm publish update**

```
Hi —

Quick update since my earlier note: yesterday GETKINETIK published its
independent verifier to npm. Any DIMO partner backend can now run

    npm install @getkinetik/verify

and verify our signed device-identity artifacts byte-for-byte without
ever calling getkinetik.app. Same cryptographic contract that runs in
the app and in our public browser verifier.

This matters for DIMO specifically because device-fraud detection on
connected-car telemetry only works if the attestation source is
verifiable by people who didn't issue it. That's the structural rule
behind every credit bureau and rating agency, and it's now true for
DePIN device identity too.

Live:
- npmjs.com/package/@getkinetik/verify (published 2026-05-13)
- getkinetik.app/api/verify-device (webhook, also live)
- getkinetik.app/bureau/ (the bureau positioning page)

I'd still love 15 minutes with whoever handles integrations or
partnerships at DIMO. The grant question can wait — what I'd actually
like is a conversation about how a neutral device-identity bureau
fits next to DIMO's existing operator base.

Eric Guthmann (Kinetik_Rick)
eric@outfromnothingllc.com
```

---

## The npm-publish lead paragraph (drop into any message this week)

Use this verbatim as the opening or second paragraph of any send-list
message this week. It replaces or supplements the existing bureau pitch.

```
As of 2026-05-13 our verifier is on npm:

    npm install @getkinetik/verify

That's the same byte-for-byte cryptographic contract our app uses
to sign proofs. Zero network calls back to getkinetik.app. A real
trust bureau has to be independently verifiable by partners who
don't trust the bureau — that's the property we just shipped, and
it's what makes the rest of the pitch worth your 15 minutes.
```

---

## Bump rules

**Trigger:** No response 72 hours after the initial send.
**Bump:** One line, same channel, references the original message.
**Format (Discord/Twitter/Telegram):**

```
Bumping this in case it got buried — happy to do email or a different
channel if that's easier.
```

**Format (email):**

```
Reply to the original thread, two lines: "Bumping this in case it
got buried — fine to bury for good if it's not a fit, just wanted
to make sure it reached the right inbox."
```

**Second bump:** Do not send. If they're silent 7 days after the bump,
move them to the **"reawaken later"** column (see below) and proceed.

---

## Trigger table

| Trigger | Action |
|---------|--------|
| Initial send | Log target + date in this file (mark with date in the **Status log** below) |
| Reply within 24h with interest | Propose a Google Meet within 48h. Don't negotiate via DM. |
| Reply within 24h with "not now" or "not a fit" | Thank them. Move target to "reawaken later." |
| Silent at 72h | One-line bump on the same channel |
| Silent at 7d after bump | Move to "reawaken later." Mark with a re-touch date 6 weeks out, after the next material milestone (first partner integration / 1k nodes / iOS port). |
| Direct ask for the npm install | Send the offline-verifier paragraph + link to `https://www.npmjs.com/package/@getkinetik/verify`. Don't oversell — let them run the smoketest. |
| Ask for a demo on a call | Use the `DEMO_SCRIPT.md` script. Mint a fresh proof live. Have a second device ready to scan. Have the npm install in a terminal pre-staged for the same call. |

---

## Status log

> Update each row with the date sent + any reply. Keep it as a single
> table; this is the historical record of what got tried and what landed.

| Date | Target | Channel | Variant | Status | Next action |
|------|--------|---------|---------|--------|-------------|
| 2026-04-30 | DIMO | Discord DM + `grants@dimo.zone` | aggregator-era | awaiting response | bureau-reframe + npm update Wed 5/14 |
| 2026-04-30 | Hivemapper | `#mip-26` Discord | aggregator-era | awaiting response | bureau-reframe + npm Wed 5/14 |
| 2026-04-?? | Nodle | Discord DM | aggregator-era | "not a fit for our genuity model" | bureau-reframe Fri 5/16 |
| 2026-05-13 | Twitter — npm publish thread | own profile | Thread 4 | _to send tonight_ | pin replaces Thread 1 |
| 2026-05-13 | Multicoin / Borderless / Onchainy | Twitter DM | investor one-liner | _to send tonight_ | wait 72h, bump if silent |
| 2026-05-14 | Hivemapper | Discord DM | bureau + npm | _scheduled_ | post-send: wait 72h |
| 2026-05-14 | DIMO | Email reply | bureau + npm | _scheduled_ | post-send: wait 72h |
| 2026-05-15 | Geodnet | support ticket + Telegram | bureau + npm | _scheduled_ | post-send: wait 72h |
| 2026-05-15 | WeatherXM | Discord DM | bureau + npm | _scheduled_ | post-send: wait 72h |
| 2026-05-16 | Nodle | Discord DM (CM) | bureau reframe + npm | _scheduled_ | post-send: wait 72h |
| 2026-05-16 | Adjacent buyer (lender) | email / DM | adjacent-buyers | _scheduled_ | post-send: wait 7d |

---

## "Reawaken later" queue

Targets that said "not now" or went fully silent get a re-touch at the
next material milestone, not on a calendar cadence. Don't pester.

**Re-touch triggers:**

- First partner integration ships → re-touch every silent target with
  "we now have a production partner running this; here's the case
  study."
- 1,000+ active authenticated nodes → re-touch with the network-size
  data point.
- iOS port ships → re-touch any iOS-blocked target (none today, but
  future-proof).
- `@getkinetik/verify` v1.0 (i.e., first partner imports it in prod)
  → re-touch every dev-Twitter / VC contact with a single Thread.

When re-touching: **always reference the prior thread.** "Following up
on my March DM — here's what's changed since."

---

## Adjacent buyers — full list for the next wave (after networks)

Once at least one network conversation is in motion (week 2+), open the
adjacent-buyer wave. They value bureau independence more than networks
do because they have *no* path to building it themselves.

**DePIN lenders:**

- Goldfinch (`@goldfinchfinance`) — already underwrites DePIN-adjacent
  positions. Bureau gives them a primitive to underwrite against.
- Centrifuge (`@centrifuge`) — real-world asset focus, natural fit for
  hardware-loan underwriting.
- Maple Finance (`@maplefinance`) — institutional DeFi credit, could
  do DePIN earnings advances.

**DePIN insurers / risk:**

- Nexus Mutual — protocol coverage; DePIN node insurance is a logical
  extension.
- Sherlock — protocol audit / risk transfer.

**Exchanges (pre-listing diligence):**

- Coinbase Ventures (DePIN team) — they list DePIN tokens; they need a
  way to diligence operator-base realness pre-listing.
- Kraken — same shape.

**Foundations / consortiums:**

- DePIN Alliance — already exists, structurally aligned, won't compete.
- Helium Foundation — even though Helium hardware isn't our target,
  their fraud story is our pitch.

**Auditors / risk infra:**

- Stripe Radar adjacent buyers (any team building risk/fraud signal
  for crypto on-ramps).
- Plaid (identity / verification infrastructure).

For each: use the **"Adjacent buyers"** template from
`OUTREACH_MESSAGES.md`, lead with the npm publish, and propose 15
minutes. These are slower-cycle conversations — expect 7-14 days for
first response.

---

## What "winning this week" looks like

- At least **one** of the five networks (DIMO, Hivemapper, Nodle,
  WeatherXM, Geodnet) replies and books a 15-minute call.
- At least **one** DePIN investor account engages with the npm publish
  thread (like, RT, reply, or DM).
- At least **one** adjacent buyer (lender / insurer / foundation)
  responds with a "tell me more."

**Three responses = a successful week.** One booked call from any of
those three is enough to justify the entire wave.

What "failing this week" looks like:

- Zero responses across all 8 sends.
- If that happens, the bottleneck is not the send-list, it's reach.
  Pivot week 2 to **public visibility** (more Twitter, Discord
  participation in DePIN servers as a contributor first, an investor
  intro from a warm contact). Reassess the bureau positioning
  language with an outside reader before re-sending.

---

*OutFromNothing LLC · GETKINETIK · Outreach Send-List · 2026-05-13*
