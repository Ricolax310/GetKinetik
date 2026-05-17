// ============================================================================
// stableStringify — a single, shared canonical JSON serializer.
// ----------------------------------------------------------------------------
// Every signable artifact in the Sovereign Node (heartbeats, Proof of Origin
// cards, future chain claims) MUST serialize through this function. The
// invariant: the same object must always produce the exact same byte
// sequence, because that byte sequence is what gets signed.
//
// If two consumers diverged on serialization (e.g. one sorted keys, one
// didn't), verification would break silently for every mixed artifact —
// which would be catastrophic for a sovereignty primitive that claims to
// be verifiable. Therefore this lives in its own module, so there is
// exactly one source of truth on-device.
//
// Guarantees:
//   · Top-level keys are sorted lexicographically. Nested objects are
//     serialized by `JSON.stringify`, which preserves the caller's
//     insertion order — every payload that embeds a nested object
//     (today: just the `sensors` block on v:2 heartbeats) is therefore
//     responsible for inserting keys in canonical order. Callers should
//     do this through `canonicalSensorBlock` (or an equivalent helper)
//     so the bytes stay byte-for-byte identical. The verify package
//     applies the same shallow-sort contract; the two MUST stay in
//     lockstep, and any move to a recursive sort needs a `v` schema bump.
//   · Values go through the platform's JSON.stringify, which is identical
//     across Hermes, V8, JavaScriptCore for the primitive types we use
//     (string, number, boolean, null, object, array).
//   · No whitespace, no indentation — the output is the byte-for-byte
//     message that gets signed.
//
// Intentionally NOT handling: Date, undefined, functions, symbols, BigInt.
// Callers are expected to serialize those to primitives (ms-since-epoch,
// hex strings, etc.) before handing the object here.
// ============================================================================

export const stableStringify = (obj: Record<string, unknown>): string => {
  const keys = Object.keys(obj).sort();
  const parts: string[] = [];
  for (const k of keys) {
    parts.push(`${JSON.stringify(k)}:${JSON.stringify(obj[k])}`);
  }
  return `{${parts.join(',')}}`;
};
