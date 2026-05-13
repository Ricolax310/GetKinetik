# Geodnet outreach — draft

Use with `geodnet-sybil-report.md` linked (not pasted) into the message.

---

## Suggested channels (in order)

1. **Geodnet Discord** — find a team-tagged member ("Team / Core / Geodnet"
   role badge). DM directly.
2. **Geodnet Telegram** — official group; DM admins privately, do not post
   the report in the room.
3. **`hello@geodnet.com`** or contact form on the website.
4. **GitHub** — open an issue (or discussion) on `geodnet/GEODNET_API` if
   nothing private lands in 48 hours.

One channel at a time. Wait 48 hours before trying a second.

---

## Short version — DM / email body

> Subject: Public-data Sybil scan on the Geodnet RTK Network — wanted to share before posting anywhere
>
> Hi <name>,
>
> Eric here, building GETKINETIK (independent bureau for DePIN devices —
> hardware-signed identity + a public Genesis Score). We ran a Sybil-shape
> scan against your public `coverage_stations` endpoint (`rtk.geodnet.com/api/v2/coverage_stations`,
> no auth) and treated each station as what it's *supposed* to be: a unique,
> surveyed GNSS antenna at a fixed coordinate. **No internal Geodnet data
> was used.**
>
> Specific findings:
>
> 1. **10 groups of stations share an exact (lat, lng) pair.** For RTK that
>    is structurally undefined. Worst case: six stations at
>    `51.986433, 4.385757` (Delft area, Netherlands) all named `****0DLF*` —
>    one operator with six registrations at one antenna.
> 2. **931 station clusters sit within 10 m of each other** — tighter than
>    a single mount.
> 3. **5 separate cases** of two stations sharing literally the same
>    masked name *and* coordinates (`****0BBF0`, `****CAE6C`, `****E2162`,
>    `****D2EC4`, `****C6D12`, `****6E64A`, `****20C40`) — looks like
>    deduplication is failing somewhere upstream.
>
> Full one-page report:  
> https://github.com/Ricolax310/GetKinetik/blob/main/docs/reports/geodnet-sybil-report.md
>
> Not selling anything; the bureau API (`https://getkinetik.app/api/verify-device`)
> is free for the first wave. If Geodnet operators want a per-device GETKINETIK
> Genesis Score (hardware-rooted signature, chain age, tamper flags), it's
> one POST. Either way I wanted to hand you the report before posting it.
>
> — Eric  
> eric@outfromnothingllc.com · https://getkinetik.app/bureau/

---

## Discord-friendly short version (one paragraph)

> Hi — Eric / GETKINETIK (independent bureau for DePIN nodes). Ran a Sybil-shape
> scan today against your public `/api/v2/coverage_stations` endpoint. Treating each
> station as a unique surveyed GNSS antenna: 10 groups share exact (lat, lng) pairs
> (worst case 6 stations at one point near Delft, all named `****0DLF*`), 931 clusters
> sit within 10 m of each other, and 5 cases show two stations with the same masked
> name + coordinates (deduplication issue). Wanted to share before posting anywhere.
> Report: https://github.com/Ricolax310/GetKinetik/blob/main/docs/reports/geodnet-sybil-report.md

---

## Don't

- Don't paste the full report into the DM. Link it.
- Don't accuse the Delft operator publicly. The shape is suggestive, not proof.
- Don't post in `#general` or any public channel before a team DM. RTK networks
  are particularly sensitive about per-station reputation because operators
  are usually identifiable in their community.
- Don't say "fraud." Use "shape," "pattern," "structural anomaly."
