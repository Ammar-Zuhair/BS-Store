package expo.modules.bsstoreappexit

import android.os.Handler
import android.os.Looper
import android.os.Process
import expo.modules.kotlin.functions.Queues
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class BSStoreAppExitModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("BSStoreAppExit")
    AsyncFunction("exit") {
      val activity = appContext.currentActivity ?: throw IllegalStateException("No foreground activity")
      activity.finishAndRemoveTask()
      // Complete the explicit exit confirmation by stopping only this app's process.
      Handler(Looper.getMainLooper()).postDelayed({ Process.killProcess(Process.myPid()) }, 200L)
    }.runOnQueue(Queues.MAIN)
  }
}
