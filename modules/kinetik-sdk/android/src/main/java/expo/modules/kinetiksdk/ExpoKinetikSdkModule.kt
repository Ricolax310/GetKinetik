package expo.modules.kinetiksdk

import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.security.KeyPairGenerator
import java.security.KeyStore
import java.security.Signature
import java.security.spec.ECGenParameterSpec

class ExpoKinetikSdkModule : Module() {
  private val KEY_ALIAS = "kinetik_hardware_attestation_key"
  private val ANDROID_KEYSTORE = "AndroidKeyStore"

  override fun definition() = ModuleDefinition {
    Name("ExpoKinetikSdk")

    AsyncFunction("isHardwareBacked") {
      try {
        val keyStore = KeyStore.getInstance(ANDROID_KEYSTORE).apply { load(null) }
        if (!keyStore.containsAlias(KEY_ALIAS)) {
          false
        } else {
          val entry = keyStore.getEntry(KEY_ALIAS, null) as? KeyStore.PrivateKeyEntry
          if (entry == null) {
            false
          } else {
            val factory = java.security.KeyFactory.getInstance(
              entry.privateKey.algorithm ?: "EC",
              ANDROID_KEYSTORE
            )
            val keyInfo = factory.getKeySpec(entry.privateKey, android.security.keystore.KeyInfo::class.java)
            keyInfo.isInsideSecureHardware
          }
        }
      } catch (e: Throwable) {
        false
      }
    }

    AsyncFunction("generateAttestationKey") { challengeHex: String ->
      try {
        val challengeBytes = fromHex(challengeHex)
        val keyStore = KeyStore.getInstance(ANDROID_KEYSTORE).apply { load(null) }
        
        // Delete old key if exists to regenerate
        if (keyStore.containsAlias(KEY_ALIAS)) {
          keyStore.deleteEntry(KEY_ALIAS)
        }

        val kpg = KeyPairGenerator.getInstance(
          KeyProperties.KEY_ALGORITHM_EC,
          ANDROID_KEYSTORE
        )

        val spec = KeyGenParameterSpec.Builder(
          KEY_ALIAS,
          KeyProperties.PURPOSE_SIGN or KeyProperties.PURPOSE_VERIFY
        )
          .setAlgorithmParameterSpec(ECGenParameterSpec("secp256r1"))
          .setDigests(KeyProperties.DIGEST_SHA256, KeyProperties.DIGEST_SHA512)
          .setAttestationChallenge(challengeBytes)
          .build()

        kpg.initialize(spec)
        val keyPair = kpg.generateKeyPair()

        // Get public key bytes and encode to hex
        val pubKey = keyPair.public
        val pubKeyHex = toHex(pubKey.encoded)

        // Extract attestation certificate chain
        val certificateChain = keyStore.getCertificateChain(KEY_ALIAS)
        val certsBase64 = certificateChain?.map { cert ->
          Base64.encodeToString(cert.encoded, Base64.NO_WRAP)
        } ?: emptyList()

        mapOf(
          "publicKey" to pubKeyHex,
          "certificates" to certsBase64
        )
      } catch (e: Throwable) {
        throw Exception("Failed to generate attestation key: ${e.message}", e)
      }
    }

    AsyncFunction("signWithAttestationKey") { messageHex: String ->
      try {
        val messageBytes = fromHex(messageHex)
        val keyStore = KeyStore.getInstance(ANDROID_KEYSTORE).apply { load(null) }
        val privateKeyEntry = keyStore.getEntry(KEY_ALIAS, null) as? KeyStore.PrivateKeyEntry
          ?: throw Exception("Attestation key not found. Run generateAttestationKey first.")

        val signature = Signature.getInstance("SHA256withECDSA").apply {
          initSign(privateKeyEntry.privateKey)
          update(messageBytes)
        }
        val sigBytes = signature.sign()
        toHex(sigBytes)
      } catch (e: Throwable) {
        throw Exception("Failed to sign: ${e.message}", e)
      }
    }
  }

  private fun toHex(bytes: ByteArray): String {
    return bytes.joinToString("") { String.format("%02x", it) }
  }

  private fun fromHex(hex: String): ByteArray {
    val clean = hex.replace(" ", "")
    val result = ByteArray(clean.length / 2)
    for (i in result.indices) {
      result[i] = clean.substring(i * 2, i * 2 + 2).toInt(16).toByte()
    }
    return result
  }
}
