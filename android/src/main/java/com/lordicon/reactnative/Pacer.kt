package com.lordicon.reactnative

/**
 * Paces one icon's frames to a limit on a faster display (`frameRate: 60` on 120 Hz: every
 * other display frame). Time is never lost: a tick gets all the time since the last one.
 * The same logic as src/pacer.ts, which has the tests: keep them alike.
 */
internal class Pacer {
    private var interval = 0.0
    private var budget = 0.0
    private var elapsed = 0.0

    /** Frames per second at most; 0 for every display frame. */
    var limit = 0f
        set(value) {
            field = value
            interval = if (value > 0f) 1.0 / value else 0.0
        }

    /** The icon starts needing frames again: its first display frame ticks. */
    fun reset() {
        budget = interval
        elapsed = 0.0
    }

    /** One display frame, `dt` seconds after the last: the seconds to tick by, or -1 to skip. */
    fun frame(dt: Double): Double {
        wait(dt)
        if (interval > 0.0 && budget < interval * 0.9) return -1.0
        budget -= interval
        if (budget > dt) budget = 0.0
        val time = elapsed
        elapsed = 0.0
        return time
    }

    /** A display frame the icon cannot take (its render thread is busy): the time adds up. */
    fun wait(dt: Double) {
        elapsed += dt
        budget += dt
    }
}
