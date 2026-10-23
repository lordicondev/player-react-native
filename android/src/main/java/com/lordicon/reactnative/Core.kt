package com.lordicon.reactnative

import android.graphics.Bitmap
import java.util.concurrent.atomic.AtomicInteger

/** The runtime's core (lordicon_c.h) through JNI. A handle is one icon: use it from one thread. */
internal object Core {
    const val EVENT_COMPLETE = 1
    const val EVENT_LOOP = 2
    const val EVENT_FRAME = 4

    init {
        System.loadLibrary("lordicon_jni")
    }

    /** Icons loaded and not freed yet (in the Ticker's stats). */
    val live = AtomicInteger()

    /**
     * Loads an icon from a hold on its JSON (acquireSource) and lets go of the hold. 0 when the
     * hold is empty or the JSON is not an icon.
     */
    fun load(hold: Long): Long = loadSource(hold).also { if (it != 0L) live.incrementAndGet() }

    fun free(handle: Long) {
        freeIcon(handle)
        live.decrementAndGet()
    }

    // The icon registry (cpp/registry.h).
    @JvmStatic external fun registerIcon(json: String): Int
    @JvmStatic external fun releaseIcon(key: Int)
    /** A hold on a key's JSON until load(); 0 when the key is unknown. */
    @JvmStatic external fun acquireSource(key: Int): Long
    @JvmStatic external fun registeredIcons(): Int
    /** Lets go of the models of this thread no icon draws from (memory warning); core thread. */
    @JvmStatic external fun dropModels()

    // Views' frames for the player's reads (cpp/views.h); handle 0: no icon.
    @JvmStatic external fun watchView(viewId: Int)
    @JvmStatic external fun commandDone(viewId: Int, handle: Long)
    @JvmStatic external fun publishFrame(viewId: Int, handle: Long)
    @JvmStatic external fun readFrame(viewId: Int, sent: Int): Float
    @JvmStatic external fun forgetView(viewId: Int)

    @JvmStatic private external fun loadSource(hold: Long): Long
    @JvmStatic private external fun freeIcon(handle: Long)
    @JvmStatic external fun setColor(handle: Long, name: String, r: Float, g: Float, b: Float)
    @JvmStatic external fun setStroke(handle: Long, value: Float)
    @JvmStatic external fun setTint(handle: Long, on: Boolean, r: Float, g: Float, b: Float)
    @JvmStatic external fun segment(handle: Long, begin: Float, end: Float)
    @JvmStatic external fun playback(handle: Long, speed: Float, direction: Int, loop: Boolean, rest: Float)
    @JvmStatic external fun play(handle: Long)
    @JvmStatic external fun pause(handle: Long)
    @JvmStatic external fun playing(handle: Long): Boolean
    @JvmStatic external fun seek(handle: Long, frame: Float)
    /** Marks the current frame for rendering again (e.g. into a new bitmap). */
    @JvmStatic external fun redraw(handle: Long)
    @JvmStatic external fun tick(handle: Long, dt: Double): Int
    @JvmStatic external fun renderInto(handle: Long, bitmap: Bitmap): Int
}
