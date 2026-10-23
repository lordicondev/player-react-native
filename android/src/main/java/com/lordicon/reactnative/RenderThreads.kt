package com.lordicon.reactnative

import android.os.Handler
import android.os.HandlerThread
import android.os.Looper

/**
 * Render threads ("lanes") of background icons, started on first use. An icon stays on its
 * lane: every core call for it runs there (one ThorVG canvas per thread).
 */
internal object RenderThreads {
    const val MAX = 4
    private val handlers = arrayOfNulls<Handler>(MAX)
    private val main = Handler(Looper.getMainLooper())
    private var next = 0

    /** A lane for a new icon, round robin over the first `workers`. */
    fun assign(workers: Int): Int = next++ % workers.coerceIn(1, MAX)

    fun post(lane: Int, block: () -> Unit) {
        handler(lane).post(block)
    }

    fun toMain(block: () -> Unit) {
        main.post(block)
    }

    /** Runs a block on every lane started so far. */
    @Synchronized
    fun postToAll(block: () -> Unit) {
        for (handler in handlers) handler?.post(block)
    }

    @Synchronized
    private fun handler(lane: Int): Handler =
        handlers[lane] ?: Handler(HandlerThread("lordicon-render-$lane").apply { start() }.looper)
            .also { handlers[lane] = it }
}
