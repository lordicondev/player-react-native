package com.lordicon.reactnative

import android.os.SystemClock
import android.util.Log
import android.view.Choreographer

/**
 * One frame callback for every icon that needs frames. `ui` icons tick and render here;
 * `background` icons get one batch per frame and lane, on their render threads. Each icon's
 * Pacer decides whether a display frame is one of its frames (`frameRate`), and how much time
 * it carries: while a batch runs, background icons skip frames and their time adds up.
 *
 * Timings: `adb shell setprop log.tag.LordIconTicker DEBUG`, then `adb logcat -s LordIconTicker`.
 */
internal object Ticker : Choreographer.FrameCallback {
    private const val TAG = "LordIconTicker"
    private val views = LinkedHashSet<LordIconView>()
    /**
     * Views added while a batch runs: a command (play) may come after the batch read the icon on
     * its lane as stopped; such a view stays, whatever the batch says.
     */
    private val addedDuringBatch = HashSet<LordIconView>()
    private var posted = false
    private var last = 0L
    private var busy = false
    private val stats = Stats()

    fun add(view: LordIconView) {
        if (views.add(view)) view.pacer.reset()
        if (busy) addedDuringBatch.add(view)
        post()
    }

    fun remove(view: LordIconView) {
        views.remove(view)
        addedDuringBatch.remove(view)
    }

    private fun post() {
        if (posted) return
        posted = true
        last = 0L
        Choreographer.getInstance().postFrameCallback(this)
    }

    override fun doFrame(frameTimeNanos: Long) {
        posted = false
        val dt = if (last == 0L) 0.0 else (frameTimeNanos - last) / 1e9
        last = frameTimeNanos
        val t0 = SystemClock.elapsedRealtimeNanos()
        val skipped = busy

        val jobs = ArrayList<LordIconView.Job>()
        val it = views.iterator()
        while (it.hasNext()) {
            val view = it.next()
            if (view.background && busy) {
                view.pacer.wait(dt)
                continue
            }
            val time = view.pacer.frame(dt)
            if (time < 0) continue
            if (view.background) {
                val job = view.job(time)
                if (job != null) jobs.add(job) else it.remove()
            } else if (!view.onFrame(time)) {
                it.remove()
            }
        }
        if (jobs.isNotEmpty()) runBatch(jobs)

        stats.frame(frameTimeNanos, SystemClock.elapsedRealtimeNanos() - t0, skipped, views.size)
        if (views.isNotEmpty()) {
            posted = true
            Choreographer.getInstance().postFrameCallback(this)
        } else {
            last = 0L
        }
    }

    /** Ticks and renders background icons on their lanes, then swaps their frames in at once. */
    private fun runBatch(jobs: List<LordIconView.Job>) {
        busy = true
        val byLane = jobs.groupBy { it.icon.lane }
        var remaining = byLane.size
        var slowestNs = 0L
        for ((lane, laneJobs) in byLane) {
            RenderThreads.post(lane) {
                val t0 = SystemClock.elapsedRealtimeNanos()
                for (job in laneJobs) job.view.renderFrame(job)
                val ns = SystemClock.elapsedRealtimeNanos() - t0
                RenderThreads.toMain {
                    slowestNs = maxOf(slowestNs, ns)
                    if (--remaining > 0) return@toMain
                    busy = false
                    stats.batch(slowestNs)
                    for (job in jobs) {
                        if (!job.view.applyFrame(job) && job.view !in addedDuringBatch) views.remove(job.view)
                    }
                    addedDuringBatch.clear()
                    if (views.isNotEmpty()) post()
                }
            }
        }
    }

    /** Every 2 s with the log tag at DEBUG: UI thread time per frame, slowest lane per batch. */
    private class Stats {
        var since = 0L
        var frames = 0
        var uiNs = 0L
        var skipped = 0
        var batches = 0
        var batchNs = 0L
        var enabled = Log.isLoggable(TAG, Log.DEBUG)

        fun frame(now: Long, ns: Long, skippedBatch: Boolean, views: Int) {
            if (since == 0L) since = now
            if (enabled) {
                frames++
                uiNs += ns
                if (skippedBatch) skipped++
            }
            if (now - since < 2_000_000_000L) return
            if (enabled) {
                val s = (now - since) / 1e9
                Log.d(TAG, "icons=${Core.live.get()} registered=${Core.registeredIcons()} views=$views frames/s=%.0f ui ms/frame=%.2f batches/s=%.0f batch ms=%.2f skipped/s=%.0f".format(
                    frames / s, uiNs / 1e6 / maxOf(1, frames), batches / s, batchNs / 1e6 / maxOf(1, batches), skipped / s))
            }
            since = now
            frames = 0; uiNs = 0; skipped = 0; batches = 0; batchNs = 0
            enabled = Log.isLoggable(TAG, Log.DEBUG)
        }

        fun batch(ns: Long) {
            batches++
            batchNs += ns
        }
    }
}
