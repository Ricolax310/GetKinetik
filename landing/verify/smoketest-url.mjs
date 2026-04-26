// ============================================================================
// URL round-trip smoke test — confirms the app's buildVerifierUrl() output
// decodes cleanly through the verifier's fromBase64Url + verifyArtifact.
// Run with:    node landing/verify/smoketest-url.mjs
//
// This catches any drift between the app's base64url encoder and the
// verifier's decoder — the contract that makes QR codes actually work.
// ============================================================================

import * as ed from "@noble/ed25519";
import { sha256, sha512 } from "@noble/hashes/sha2.js";

ed.hashes.sha512 = sha512;
ed.hashes.sha512Async = async (msg) => sha512(msg);

const PROOF_ATTRIBUTION = "GETKINETIK by OutFromNothing LLC";
const VERIFIER_ORIGIN = "https://getkinetik.app/verify/";

// ---- App-side encoder (copied from src/lib/proofShare.ts verbatim) ----
const B64URL_CHARS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

const base64UrlEncode = (input) => {
  const bytes = new TextEncoder().encode(input);
  let out = "";
  let i = 0;
  const n = bytes.length;
  while (i < n) {
    const b1 = bytes[i++];
    const b2 = i < n ? bytes[i++] : 0;
    const b3 = i < n ? bytes[i++] : 0;
    const triplet = (b1 << 16) | (b2 << 8) | b3;
    out += B64URL_CHARS[(triplet >> 18) & 0x3f];
    out += B64URL_CHARS[(triplet >> 12) & 0x3f];
    out += B64URL_CHARS[(triplet >> 6) & 0x3f];
    out += B64URL_CHARS[triplet & 0x3f];
  }
  const rem = n % 3;
  if (rem === 1) return out.slice(0, -2);
  if (rem === 2) return out.slice(0, -1);
  return out;
};

// ---- Verifier-side decoder (copied from verifier.js fromBase64Url) ----
const fromBase64Url = (s) => {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + pad;
  const bin = Buffer.from(b64, "base64").toString("binary");
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
};

const stableStringify = (obj) => {
  const keys = Object.keys(obj).sort();
  const parts = [];
  for (const k of keys) {
    parts.push(`${JSON.stringify(k)}:${JSON.stringify(obj[k])}`);
  }
  return `{${parts.join(",")}}`;
};

const toHex = (bytes) =>
  Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
const fromHex = (hex) => {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
};
const utf8 = (s) => new TextEncoder().encode(s);

async function run() {
  let failures = 0;
  const assert = (name, cond) => {
    console.log(`  ${cond ? "PASS" : "FAIL"}  ${name}`);
    if (!cond) failures += 1;
  };

  console.log("[1] App mints proof → builds URL → verifier decodes → valid");
  const sk = ed.utils.randomSecretKey();
  const pk = await ed.getPublicKeyAsync(sk);
  const pubkey = toHex(pk);
  const nodeId = `KINETIK-NODE-${toHex(sha256(pk)).slice(0, 8).toUpperCase()}`;
  const payload = {
    v: 1,
    kind: "proof-of-origin",
    nodeId,
    pubkey,
    mintedAt: Date.now() - 86400000,
    issuedAt: Date.now(),
    lifetimeBeats: 42,
    firstBeatTs: Date.now() - 60000,
    chainTip: toHex(sha256(utf8("e2e"))).slice(0, 16),
    attribution: PROOF_ATTRIBUTION,
  };
  const message = stableStringify(payload);
  const signature = toHex(await ed.signAsync(utf8(message), sk));

  // App-side: build the URL the QR encodes.
  const compact = { payload, signature };
  const url = `${VERIFIER_ORIGIN}#proof=${base64UrlEncode(JSON.stringify(compact))}`;
  console.log(`  URL length: ${url.length} chars`);
  assert("URL starts with verifier origin", url.startsWith(VERIFIER_ORIGIN));
  assert("URL contains fragment", url.includes("#proof="));

  // Verifier-side: extract, decode, parse, verify.
  const frag = url.split("#proof=")[1];
  const json = fromBase64Url(frag);
  const decoded = JSON.parse(json);

  assert("decoded payload.nodeId matches", decoded.payload.nodeId === nodeId);
  assert("decoded payload.pubkey matches", decoded.payload.pubkey === pubkey);
  assert("decoded signature matches", decoded.signature === signature);

  // Now run the full verifier check against the decoded compact artifact.
  const canonical = stableStringify(decoded.payload);
  const sigOk = await ed.verifyAsync(
    fromHex(decoded.signature),
    utf8(canonical),
    fromHex(decoded.payload.pubkey),
  );
  assert("verifier signature check passes", sigOk);
  assert(
    "canonical message matches original signed message",
    canonical === message,
  );

  console.log("\n[2] v:2 heartbeat round-trips through the URL pipeline");
  {
    const skH = ed.utils.randomSecretKey();
    const pkH = await ed.getPublicKeyAsync(skH);
    const pubH = toHex(pkH);
    const idH = `KINETIK-NODE-${toHex(sha256(pkH)).slice(0, 8).toUpperCase()}`;
    const beat = {
      v: 2,
      kind: "heartbeat",
      nodeId: idH,
      pubkey: pubH,
      seq: 1,
      ts: Date.now(),
      stabilityPct: 90,
      online: true,
      charging: false,
      prevHash: "0000000000000000",
      // lexicographic key order — see canonicalSensorBlock in src/lib/sensors.ts
      sensors: { lux: 412, motionRms: 0.06, pressureHpa: 1014.07 },
    };
    const beatMsg = stableStringify(beat);
    const beatSig = toHex(await ed.signAsync(utf8(beatMsg), skH));
    const beatUrl = `${VERIFIER_ORIGIN}#proof=${base64UrlEncode(JSON.stringify({ payload: beat, signature: beatSig }))}`;
    const beatDecoded = JSON.parse(fromBase64Url(beatUrl.split("#proof=")[1]));
    assert(
      "v:2 sensors round-trip preserves shape",
      beatDecoded.payload.sensors &&
        beatDecoded.payload.sensors.motionRms === 0.06 &&
        beatDecoded.payload.sensors.pressureHpa === 1014.07 &&
        beatDecoded.payload.sensors.lux === 412,
    );
    const beatCanonical = stableStringify(beatDecoded.payload);
    assert(
      "v:2 canonical message survives JSON round-trip byte-for-byte",
      beatCanonical === beatMsg,
    );
    const beatSigOk = await ed.verifyAsync(
      fromHex(beatDecoded.signature),
      utf8(beatCanonical),
      fromHex(beatDecoded.payload.pubkey),
    );
    assert("v:2 heartbeat signature verifies after URL round-trip", beatSigOk);
  }

  console.log("\n[3] v:2 proof-of-origin with sensors round-trips through URL");
  {
    const skP = ed.utils.randomSecretKey();
    const pkP = await ed.getPublicKeyAsync(skP);
    const pubP = toHex(pkP);
    const idP = `KINETIK-NODE-${toHex(sha256(pkP)).slice(0, 8).toUpperCase()}`;
    const poo = {
      v: 2,
      kind: "proof-of-origin",
      nodeId: idP,
      pubkey: pubP,
      mintedAt: Date.now() - 86400000,
      issuedAt: Date.now(),
      lifetimeBeats: 314,
      firstBeatTs: Date.now() - 60000,
      chainTip: toHex(sha256(utf8("v2-poo-url"))).slice(0, 16),
      attribution: PROOF_ATTRIBUTION,
      // lexicographic key order — see canonicalSensorBlock in src/lib/sensors.ts
      sensors: { lux: 287, motionRms: 0.05, pressureHpa: 1012.43 },
    };
    const pooMsg = stableStringify(poo);
    const pooSig = toHex(await ed.signAsync(utf8(pooMsg), skP));
    const pooUrl = `${VERIFIER_ORIGIN}#proof=${base64UrlEncode(JSON.stringify({ payload: poo, signature: pooSig }))}`;
    console.log(`  v:2 PoO URL length: ${pooUrl.length} chars`);
    const pooDecoded = JSON.parse(fromBase64Url(pooUrl.split("#proof=")[1]));
    assert(
      "v:2 PoO sensors round-trip preserves shape",
      pooDecoded.payload.sensors &&
        pooDecoded.payload.sensors.motionRms === 0.05 &&
        pooDecoded.payload.sensors.pressureHpa === 1012.43 &&
        pooDecoded.payload.sensors.lux === 287,
    );
    const pooCanonical = stableStringify(pooDecoded.payload);
    assert(
      "v:2 PoO canonical message survives JSON round-trip byte-for-byte",
      pooCanonical === pooMsg,
    );
    const pooSigOk = await ed.verifyAsync(
      fromHex(pooDecoded.signature),
      utf8(pooCanonical),
      fromHex(pooDecoded.payload.pubkey),
    );
    assert("v:2 PoO signature verifies after URL round-trip", pooSigOk);
    assert(
      "v:2 PoO attribution survives URL round-trip",
      pooDecoded.payload.attribution === PROOF_ATTRIBUTION,
    );
  }

  console.log("\n[4] v:2 proof-of-origin with sensors=null round-trips through URL");
  {
    const skP = ed.utils.randomSecretKey();
    const pkP = await ed.getPublicKeyAsync(skP);
    const pubP = toHex(pkP);
    const idP = `KINETIK-NODE-${toHex(sha256(pkP)).slice(0, 8).toUpperCase()}`;
    const poo = {
      v: 2,
      kind: "proof-of-origin",
      nodeId: idP,
      pubkey: pubP,
      mintedAt: Date.now(),
      issuedAt: Date.now(),
      lifetimeBeats: 0,
      firstBeatTs: null,
      chainTip: null,
      attribution: PROOF_ATTRIBUTION,
      sensors: null,
    };
    const pooMsg = stableStringify(poo);
    const pooSig = toHex(await ed.signAsync(utf8(pooMsg), skP));
    const pooUrl = `${VERIFIER_ORIGIN}#proof=${base64UrlEncode(JSON.stringify({ payload: poo, signature: pooSig }))}`;
    const pooDecoded = JSON.parse(fromBase64Url(pooUrl.split("#proof=")[1]));
    assert(
      "v:2 PoO with null sensors survives round-trip",
      pooDecoded.payload.sensors === null,
    );
    const pooSigOk = await ed.verifyAsync(
      fromHex(pooDecoded.signature),
      utf8(stableStringify(pooDecoded.payload)),
      fromHex(pooDecoded.payload.pubkey),
    );
    assert("v:2 PoO with null sensors verifies after URL round-trip", pooSigOk);
  }

  console.log("\n[5] Unicode + emoji payload encodes safely");
  const weird = {
    v: 1,
    kind: "proof-of-origin",
    nodeId: "KINETIK-NODE-ÜNÏCØDÉ",
    pubkey,
    mintedAt: 0,
    issuedAt: 0,
    lifetimeBeats: 0,
    firstBeatTs: null,
    chainTip: null,
    attribution: PROOF_ATTRIBUTION,
  };
  const wmsg = stableStringify(weird);
  const wsig = toHex(await ed.signAsync(utf8(wmsg), sk));
  const wurl = `${VERIFIER_ORIGIN}#proof=${base64UrlEncode(JSON.stringify({ payload: weird, signature: wsig }))}`;
  const wdecoded = JSON.parse(fromBase64Url(wurl.split("#proof=")[1]));
  assert("unicode nodeId round-trips", wdecoded.payload.nodeId === weird.nodeId);
  const wsigOk = await ed.verifyAsync(
    fromHex(wdecoded.signature),
    utf8(stableStringify(wdecoded.payload)),
    fromHex(wdecoded.payload.pubkey),
  );
  assert("unicode proof verifies after round-trip", wsigOk);

  console.log("\n" + "-".repeat(56));
  if (failures === 0) {
    console.log("URL ROUND-TRIP PASSES — QR codes will verify cleanly.");
    process.exit(0);
  } else {
    console.log(`${failures} CHECK(S) FAILED.`);
    process.exit(1);
  }
}

run().catch((err) => {
  console.error("crashed:", err);
  process.exit(2);
});
