<!--
This project is currently maintained by OutFromNothing LLC and is not
accepting unsolicited pull requests. We're keeping the codebase
auditable and forkable by intent — license is UNLICENSED, proprietary,
and the cryptographic primitives in `packages/kinetik-core/` are
deliberately stable and contract-locked.

If you're a partner, security researcher, or known collaborator who
has been invited to contribute, this template will help us land your
change cleanly. Otherwise: please file an Issue first to discuss the
proposed change before doing the work, or email eric@outfromnothingllc.com
for partnership / contribution conversations.
-->

## What does this PR do?

<!-- One or two sentences. Imperative voice ("Add X", "Fix Y"). -->

## Why is this change worth making?

<!-- Motivation. What problem does it solve, what was wrong before, what's better after. -->

## Cryptographic surface impact

<!--
Does this PR touch any of:

- `packages/kinetik-core/src/identity.ts`
- `packages/kinetik-core/src/heartbeat.ts`
- `packages/kinetik-core/src/proof.ts`
- `packages/kinetik-core/src/stableJson.ts`
- `landing/verify/verifier.js`
- `landing/verify/vendor/`

If yes, describe the change and explicitly confirm:

- [ ] Existing signed artifacts (proofs, heartbeats, earnings) still verify against the new code
- [ ] If serialization or attribution changed: schema version bumped, both old and new accepted by verifier, migration plan documented
- [ ] `node landing/verify/smoketest.mjs` passes locally
-->

## Verification done

<!-- How did you confirm this works? Manual phone test, CI green, smoketest, fresh install? -->

## Anything reviewers should focus on?

<!-- Specific concerns, edge cases, follow-ups deferred to later PRs. -->
