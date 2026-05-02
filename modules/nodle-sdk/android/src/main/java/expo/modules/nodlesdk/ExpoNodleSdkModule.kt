package expo.modules.nodlesdk

import android.content.Context
import android.util.Log
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import io.nodle.sdk.android.Nodle
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

private const val TAG = "ExpoNodleSdk"

/**
 * Bridges GETKINETIK JS to the Nodle Android SDK (BLE edge).
 * Docs: https://docs.nodle.com/nodle-android-sdk
 *
 * SDK API surface used:
 *   Nodle.init(context)               // one-shot
 *   Nodle.Nodle().config(key, value)  // optional config
 *   Nodle.Nodle().start("ss58:<pk>")  // begin BLE contribution
 *   Nodle.Nodle().stop()
 *   Nodle.Nodle().isStarted()
 *   Nodle.Nodle().isScanning()
 *
 * Notes:
 *   - All SDK calls are dispatched to Main; the SDK starts its own workers.
 *   - We never throw across the JS bridge with raw Throwable; Codedexception
 *     gives JS a stable error shape (`code` + `message`).
 */
class ExpoNodleSdkModule : Module() {

  @Volatile
  private var initialized = false

  override fun definition() = ModuleDefinition {
    Name("ExpoNodleSdk")

    AsyncFunction("start") Coroutine@{ key: String ->
      val ctx = appContext.reactContext?.applicationContext
        ?: throw NodleStartException("React application context is not available")

      val arg = if (key.startsWith("ss58:")) key else "ss58:$key"

      withContext(Dispatchers.Main) {
        try {
          ensureInit(ctx)
          Nodle.Nodle().config("heartbeat.background-mode", true)
          Nodle.Nodle().config("ble.background-mode", true)
          Nodle.Nodle().start(arg)
          Log.i(TAG, "Nodle.start ok (prefix=${arg.take(12)}…)")
        } catch (e: Throwable) {
          Log.e(TAG, "Nodle.start failed (prefix=${arg.take(12)}…)", e)
          throw NodleStartException(e.message ?: "Nodle.start failed", e)
        }
      }
    }

    AsyncFunction("stop") Coroutine@{
      withContext(Dispatchers.Main) {
        if (!initialized) return@withContext
        try {
          Nodle.Nodle().stop()
          Log.i(TAG, "Nodle.stop ok")
        } catch (e: Throwable) {
          Log.w(TAG, "Nodle.stop ignored", e)
        }
      }
    }

    AsyncFunction("isRunning") Coroutine@{
      withContext(Dispatchers.Main) {
        if (!initialized) return@withContext false
        try {
          Nodle.Nodle().isStarted() && Nodle.Nodle().isScanning()
        } catch (e: Throwable) {
          Log.w(TAG, "Nodle.isRunning ignored", e)
          false
        }
      }
    }
  }

  private fun ensureInit(context: Context) {
    if (initialized) return
    synchronized(this) {
      if (initialized) return
      Nodle.init(context.applicationContext)
      initialized = true
      Log.i(TAG, "Nodle.init completed")
    }
  }
}

private class NodleStartException(message: String, cause: Throwable? = null) :
  CodedException("ERR_NODLE_START", message, cause)
