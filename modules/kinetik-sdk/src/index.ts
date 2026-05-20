import { requireNativeModule } from 'expo-modules-core';

// Require the native module registered with Expo
const ExpoKinetikSdk = requireNativeModule('ExpoKinetikSdk');

export interface AttestationKeyResult {
  /** Hex-encoded SPKI public key bytes */
  publicKey: string;
  /** DER-encoded, Base64-represented X.509 certificate chain */
  certificates: string[];
}

/**
 * Checks if the hardware-backed attestation key exists and is backed by a secure hardware TEE or StrongBox.
 */
export async function isHardwareBacked(): Promise<boolean> {
  return await ExpoKinetikSdk.isHardwareBacked();
}

/**
 * Generates an ECDSA secp256r1 keypair inside the Android TEE/StrongBox Keystore.
 * Injects the provided hex-encoded challenge into the Google hardware attestation certificate block.
 *
 * @param challengeHex A unique hex challenge (e.g. from the verify backend) to prove freshness.
 */
export async function generateAttestationKey(challengeHex: string): Promise<AttestationKeyResult> {
  return await ExpoKinetikSdk.generateAttestationKey(challengeHex);
}

/**
 * Signs raw hex-encoded data with the generated private key inside the secure hardware.
 * Returns the SHA256withECDSA signature as a hex string.
 *
 * @param dataHex The hex-encoded message to be signed.
 */
export async function signWithAttestationKey(dataHex: string): Promise<string> {
  return await ExpoKinetikSdk.signWithAttestationKey(dataHex);
}

// ── Kinetik Standard Attestation Session ─────────────────────────────────────
export class KinetikAttestationSession {
  protected publicKey: string | null = null;
  protected certificates: string[] = [];

  /**
   * Helper to convert standard UTF-8 strings to hex strings for native module transmission.
   */
  protected toHex(str: string): string {
    const encoder = new TextEncoder();
    const bytes = encoder.encode(str);
    return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Runs the standard cryptographic hardware attestation flow.
   * Automatically retrieves a freshness challenge from your API, generates the EC key pair inside
   * the Android Keystore TEE, signs the challenge, and returns the complete verifiable payload.
   *
   * @param challengeRetriever Async callback that returns a fresh hex-encoded challenge from the server.
   */
  async attest(challengeRetriever: () => Promise<string>): Promise<{
    publicKey: string;
    certificates: string[];
    challenge: string;
    signature: string;
  }> {
    // 1. Fetch real-time freshness challenge
    const challenge = await challengeRetriever();
    const cleanChallenge = challenge.replace(/[^0-9a-fA-F]/g, '');
    if (!cleanChallenge) {
      throw new Error('KinetikAttestationSession: Retrieved challenge is not a valid hex string');
    }

    // 2. Generate secure key inside Keystore TEE
    const keyResult = await generateAttestationKey(cleanChallenge);
    this.publicKey = keyResult.publicKey;
    this.certificates = keyResult.certificates;

    // 3. Sign the challenge with the newly generated hardware-backed key
    const signature = await signWithAttestationKey(cleanChallenge);

    return {
      publicKey: this.publicKey,
      certificates: this.certificates,
      challenge: cleanChallenge,
      signature
    };
  }

  getPublicKey(): string | null {
    return this.publicKey;
  }

  getCertificates(): string[] {
    return this.certificates;
  }
}

// ── Kinetik Pro / Enterprise Attestation Session ─────────────────────────────
export class KinetikProSession extends KinetikAttestationSession {
  /**
   * Runs the elite Pro-level cryptographic hardware attestation flow.
   * - Enforces strict physical StrongBox / TEE checks (fails fast if keys live in software).
   * - Cryptographically binds a custom telemetry payload (like GPS, device metrics) directly into
   *   the signed hardware challenge, securing the telemetry data against modification in transit.
   *
   * @param challengeRetriever Async callback that returns a fresh hex-encoded challenge from the server.
   * @param telemetry Custom telemetry key-value dictionary to be cryptographically bound to the audit.
   */
  async attestPro(
    challengeRetriever: () => Promise<string>,
    telemetry: Record<string, any>
  ): Promise<{
    publicKey: string;
    certificates: string[];
    challenge: string;
    signature: string;
    telemetry: Record<string, any>;
    telemetryHash: string;
  }> {
    // 1. Strict StrongBox/TEE Hardware Enforcement Gate
    const isHardware = await isHardwareBacked();
    if (!isHardware) {
      throw new Error('KinetikProSession: Secure hardware execution environment (TEE/StrongBox) is missing. Aborting Pro attestation.');
    }

    // 2. Fetch standard freshness challenge
    const serverChallenge = await challengeRetriever();
    const cleanChallenge = serverChallenge.replace(/[^0-9a-fA-F]/g, '');
    if (!cleanChallenge) {
      throw new Error('KinetikProSession: Retrieved challenge is not a valid hex string');
    }

    // 3. Sort keys and serialize telemetry canonically (RFC 8785 JSON Canonicalization)
    const sortedTelemetry = Object.keys(telemetry)
      .sort()
      .reduce((acc, key) => {
        acc[key] = telemetry[key];
        return acc;
      }, {} as Record<string, any>);
    
    const canonicalJson = JSON.stringify(sortedTelemetry);
    const telemetryHash = this.toHex(canonicalJson);

    // 4. Create composite payload to sign: serverChallenge + telemetryHash
    // This dual-binds both server-side freshness AND client-side sensor telemetry data.
    const compositePayload = cleanChallenge + telemetryHash;

    // 5. Generate secure KeyStore pair bound to the freshness challenge
    const keyResult = await generateAttestationKey(cleanChallenge);
    this.publicKey = keyResult.publicKey;
    this.certificates = keyResult.certificates;

    // 6. Sign standard challenge and telemetry hash inside the isolated silicon
    const signature = await signWithAttestationKey(compositePayload);

    return {
      publicKey: this.publicKey,
      certificates: this.certificates,
      challenge: cleanChallenge,
      signature,
      telemetry: sortedTelemetry,
      telemetryHash
    };
  }
}
