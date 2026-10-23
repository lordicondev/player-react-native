package com.lordicon.reactnative

import android.content.ComponentCallbacks2
import android.content.res.Configuration
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.UiThreadUtil
import com.facebook.react.module.annotations.ReactModule

/**
 * The native module for JS (src/native/NativeLordIcon.ts): the icon registry, the JSON staying in
 * C++, the player's commands to views by their `viewId`, and the views' frames. Commands come in
 * order on the module's thread and go to the UI thread in that order; a view that is gone
 * ignores them.
 */
@ReactModule(name = LordIconModule.NAME)
class LordIconModule(context: ReactApplicationContext) : NativeLordIconSpec(context) {
    /** On a memory warning, each core thread lets go of the models no icon draws from. */
    private val memory = object : ComponentCallbacks2 {
        // RUNNING_LOW comes while the app runs, before Android 14; later ones send BACKGROUND.
        @Suppress("DEPRECATION")
        override fun onTrimMemory(level: Int) {
            if (level >= ComponentCallbacks2.TRIM_MEMORY_RUNNING_LOW) dropModels()
        }

        @Deprecated("Deprecated in Java")
        override fun onLowMemory() = dropModels()

        override fun onConfigurationChanged(newConfig: Configuration) {}
    }

    init {
        context.applicationContext.registerComponentCallbacks(memory)
    }

    override fun invalidate() {
        reactApplicationContext.applicationContext.unregisterComponentCallbacks(memory)
        super.invalidate()
    }

    private fun dropModels() {
        UiThreadUtil.runOnUiThread { Core.dropModels() }
        RenderThreads.postToAll { Core.dropModels() }
    }

    override fun registerIcon(json: String): Double = Core.registerIcon(json).toDouble()

    override fun releaseIcon(key: Double) = Core.releaseIcon(key.toInt())

    override fun look(viewId: Double, colors: String, stroke: Double, tint: String) =
        toView(viewId) { it.look(colors, stroke.toFloat(), tint) }

    override fun segment(viewId: Double, begin: Double, end: Double) =
        toView(viewId) { it.segment(begin.toFloat(), end.toFloat()) }

    override fun playback(viewId: Double, speed: Double, direction: Double, loop: Boolean, rest: Double) =
        toView(viewId) { it.playback(speed.toFloat(), direction.toInt(), loop, rest.toFloat()) }

    override fun play(viewId: Double, token: Double) = toView(viewId) { it.play(token.toInt()) }

    override fun pause(viewId: Double) = toView(viewId) { it.pause() }

    override fun seek(viewId: Double, frame: Double) = toView(viewId) { it.seek(frame.toFloat()) }

    /** Synchronous, on the JS thread. */
    override fun frame(viewId: Double, sent: Double): Double =
        Core.readFrame(viewId.toInt(), sent.toLong().toInt()).toDouble()

    private fun toView(viewId: Double, command: (LordIconView) -> Unit) {
        val id = viewId.toInt()
        UiThreadUtil.runOnUiThread { LordIconView.find(id)?.let(command) }
    }

    companion object {
        const val NAME = NativeLordIconSpec.NAME
    }
}
