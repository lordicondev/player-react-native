package com.lordicon.reactnative

import android.content.Context
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Rect
import android.view.View
import android.view.ViewTreeObserver
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactContext
import com.facebook.react.bridge.WritableMap
import com.facebook.react.uimanager.UIManagerHelper
import com.facebook.react.uimanager.events.Event

/**
 * An icon rendered by the runtime's core into a Bitmap (in place, premultiplied RGBA).
 *
 * `ui`: core calls and rendering run on the UI thread, in the Ticker's frame callback.
 * `background`: every core call for the icon runs on its render thread (lane) and renders into
 * a back bitmap; the UI thread swaps it in.
 *
 * Props arrive in transactions (commit()); commands from the player after `onLoad`, through
 * LordIconModule, which finds the view by its `viewId` prop. A new icon is not drawn until the
 * first command: the player says which frame to show.
 */
class LordIconView(context: Context) : View(context) {
    /** Where LordIconModule sends this view's commands; registered as soon as the prop arrives. */
    var viewId = 0
        set(value) {
            if (field == value) return
            if (views[field] === this) views.remove(field)
            if (field != 0) Core.forgetView(field)
            field = value
            if (value != 0) {
                views[value] = this
                Core.watchView(value)
            }
        }

    // Props, applied by commit(). The icon comes as its key in the registry (cpp/registry.h).
    var iconKey = 0
        set(value) { if (field != value) { field = value; sourceChanged = true } }
    var renderMode = "background"
        set(value) { if (field != value) { field = value; sourceChanged = true } }
    var workers = 1
        set(value) { if (field != value) { field = value; sourceChanged = true } }
    private var sourceChanged = false
    /** The frame rate limit (prop `frameRate`), applied by the Ticker. */
    internal val pacer = Pacer()

    /** Prop `observeVisibility`: report (`onVisible`) once half of the view shows. */
    var observeVisibility = false
        set(value) {
            if (field == value) return
            field = value
            if (value) watchVisibility() else stopWatchingVisibility()
        }

    /**
     * One loaded icon. Its handle belongs to its core thread: the UI thread (lane -1) or a lane
     * of RenderThreads. A new source or render mode makes a new one, so blocks still queued for
     * the old one never touch it.
     */
    class Loaded(val lane: Int) {
        @Volatile var handle = 0L
        /** The token of the last play command. */
        @Volatile var token = 0
    }

    private var icon: Loaded? = null
    val background get() = (icon?.lane ?: -1) >= 0
    val lane get() = icon?.lane ?: -1

    private var front: Bitmap? = null
    @Volatile private var back: Bitmap? = null
    /** The player has sent a command for the current icon. */
    private var shown = false
    private val visibleRect = Rect()

    /** Runs on the icon's core thread: now on the UI thread, or queued on its lane. */
    private fun core(icon: Loaded, block: () -> Unit) =
        if (icon.lane >= 0) RenderThreads.post(icon.lane, block) else block()

    /** Back on the UI thread after core work. */
    private fun main(icon: Loaded, block: () -> Unit) =
        if (icon.lane >= 0) RenderThreads.toMain(block) else block()

    // ---- Props --------------------------------------------------------------------------

    /** Applies the props of one transaction (UI thread). */
    fun commit() {
        val load = sourceChanged
        if (load) {
            sourceChanged = false
            release()
            if (iconKey != 0) icon = Loaded(if (renderMode == "ui") -1 else RenderThreads.assign(workers))
            createBitmaps(width, height)
        }
        if (!load) return
        val icon = icon ?: return
        // The JSON is held from here until the load on the lane, whatever the registry does
        // meanwhile.
        val hold = Core.acquireSource(iconKey)
        core(icon) {
            icon.handle = Core.load(hold)
            val h = icon.handle
            main(icon) {
                if (icon !== this.icon) return@main
                if (h == 0L) front?.eraseColor(0)
                emit("topLoad", Arguments.createMap().apply { putBoolean("ok", h != 0L) })
            }
        }
    }

    // ---- Commands (UI thread, from LordIconModule) ----------------------------------------

    /**
     * Every colour (`primary:#ff0000,secondary:#00ff00`), the stroke, 1..3 (0: none), and the
     * tint, `#rrggbb` (empty: none).
     */
    fun look(colors: String, stroke: Float, tint: String) {
        val rgb = parseColors(colors)
        val one = parseColors("tint:$tint")["tint"]
        command { _, h ->
            rgb.forEach { (name, c) -> Core.setColor(h, name, c[0], c[1], c[2]) }
            if (stroke > 0f) Core.setStroke(h, stroke)
            if (one != null) Core.setTint(h, true, one[0], one[1], one[2]) else Core.setTint(h, false, 0f, 0f, 0f)
        }
    }

    fun segment(begin: Float, end: Float) = command { _, h -> Core.segment(h, begin, end) }
    fun playback(speed: Float, direction: Int, loop: Boolean, rest: Float) =
        command { _, h -> Core.playback(h, speed, direction, loop, rest) }
    fun play(token: Int) = command { icon, h -> icon.token = token; Core.play(h) }
    fun pause() = command { _, h -> Core.pause(h) }
    fun seek(frame: Float) = command { _, h -> Core.seek(h, frame) }

    /**
     * Runs a command on the icon's core thread and reports it applied, with the frame, for the
     * player's reads (cpp/views.h). Without an icon the command is dropped, and reported too.
     */
    private fun command(block: (Loaded, Long) -> Unit) {
        val id = viewId
        val icon = icon
        if (icon == null) {
            Core.commandDone(id, 0L)
            return
        }
        core(icon) {
            val h = icon.handle
            if (h != 0L) block(icon, h)
            Core.commandDone(id, h)
        }
        shown = true
        if (isAttachedToWindow) Ticker.add(this)
    }

    // ---- Frames ---------------------------------------------------------------------------

    private fun isOnScreen() = isShown && getGlobalVisibleRect(visibleRect)

    /** `ui`: one frame, from the Ticker. False when the icon needs no more frames. */
    fun onFrame(dt: Double): Boolean {
        val icon = icon ?: return false
        val h = icon.handle
        if (h == 0L) return false
        val events = Core.tick(h, dt)
        Core.publishFrame(viewId, h)
        if (events and Core.EVENT_FRAME != 0) {
            val bitmap = front
            // Off screen (e.g. a list row outside the viewport): time runs, nothing is drawn.
            if (!isOnScreen()) waitForScroll()
            else if (bitmap != null && Core.renderInto(h, bitmap) == 1) invalidate()
        }
        if (events and Core.EVENT_COMPLETE != 0) emitComplete(icon.token)
        return Core.playing(h)
    }

    /** `background`: this icon's part of a frame batch. */
    class Job(val view: LordIconView, val icon: Loaded, val visible: Boolean, val viewId: Int, val dt: Double) {
        var events = 0
        var rendered = false
        var playing = false
        var token = 0
    }

    fun job(dt: Double): Job? = icon?.let { Job(this, it, isOnScreen(), viewId, dt) }

    /** `background`, on the lane. */
    fun renderFrame(job: Job) {
        val h = job.icon.handle
        if (h == 0L) return
        job.events = Core.tick(h, job.dt)
        Core.publishFrame(job.viewId, h)
        val bitmap = back
        if (job.events and Core.EVENT_FRAME != 0 && job.visible && bitmap != null) {
            job.rendered = Core.renderInto(h, bitmap) == 1
        }
        job.playing = Core.playing(h)
        job.token = job.icon.token
    }

    /** `background`, on the UI thread after the batch. False when the icon needs no more frames. */
    fun applyFrame(job: Job): Boolean {
        if (job.icon !== icon) return false
        if (job.rendered) {
            val shownBitmap = back
            back = front
            front = shownBitmap
            invalidate()
        } else if (job.events and Core.EVENT_FRAME != 0 && !job.visible) {
            waitForScroll()
        }
        if (job.events and Core.EVENT_COMPLETE != 0) emitComplete(job.token)
        return job.playing
    }

    // A frame waits off screen: draw it once the view scrolls into view.
    private var waitingForScroll = false
    private val onScroll = ViewTreeObserver.OnScrollChangedListener {
        if (isOnScreen()) {
            stopWaiting()
            redraw()
        }
    }

    private fun waitForScroll() {
        if (waitingForScroll) return
        waitingForScroll = true
        viewTreeObserver.addOnScrollChangedListener(onScroll)
    }

    private fun stopWaiting() {
        if (!waitingForScroll) return
        waitingForScroll = false
        viewTreeObserver.removeOnScrollChangedListener(onScroll)
    }

    /** Renders the current frame again. */
    private fun redraw() {
        val icon = icon ?: return
        if (!shown) return
        core(icon) {
            val h = icon.handle
            if (h != 0L) Core.redraw(h)
        }
        Ticker.add(this)
    }

    // Visibility for `in` and `intro`: on scroll, layout, attach and before each draw of the
    // window, until half the view shows. The draws catch moves no scroll or layout reports: a
    // screen sliding in with a navigator's transition.
    private var watchingVisibility = false
    private val onVisibilityChange = ViewTreeObserver.OnScrollChangedListener { checkVisibility() }
    private val onLayoutChange = ViewTreeObserver.OnGlobalLayoutListener { checkVisibility() }
    private val onPreDraw = ViewTreeObserver.OnPreDrawListener {
        checkVisibility()
        true
    }

    private fun watchVisibility() {
        if (watchingVisibility || !isAttachedToWindow) return
        watchingVisibility = true
        viewTreeObserver.addOnScrollChangedListener(onVisibilityChange)
        viewTreeObserver.addOnGlobalLayoutListener(onLayoutChange)
        viewTreeObserver.addOnPreDrawListener(onPreDraw)
        checkVisibility()
    }

    private fun stopWatchingVisibility() {
        if (!watchingVisibility) return
        watchingVisibility = false
        viewTreeObserver.removeOnScrollChangedListener(onVisibilityChange)
        viewTreeObserver.removeOnGlobalLayoutListener(onLayoutChange)
        viewTreeObserver.removeOnPreDrawListener(onPreDraw)
    }

    private fun checkVisibility() {
        if (!observeVisibility || width <= 0 || height <= 0) return
        if (!isShown || !getGlobalVisibleRect(visibleRect)) return
        if (visibleRect.width().toLong() * visibleRect.height() * 2 < width.toLong() * height) return
        stopWatchingVisibility()
        observeVisibility = false
        emit("topVisible", Arguments.createMap().apply { putBoolean("visible", true) })
    }

    // ---- View -----------------------------------------------------------------------------

    private fun createBitmaps(w: Int, h: Int) {
        if (w <= 0 || h <= 0) {
            front = null
            back = null
            return
        }
        front = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888)
        back = if (background) Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888) else null
    }

    override fun onSizeChanged(w: Int, h: Int, oldw: Int, oldh: Int) {
        super.onSizeChanged(w, h, oldw, oldh)
        createBitmaps(w, h)
        redraw()
        if (watchingVisibility) post { checkVisibility() }
    }

    override fun onDraw(canvas: Canvas) {
        front?.let { canvas.drawBitmap(it, 0f, 0f, null) }
    }

    override fun onAttachedToWindow() {
        super.onAttachedToWindow()
        if (shown) Ticker.add(this)
        if (observeVisibility) watchVisibility()
    }

    override fun onDetachedFromWindow() {
        super.onDetachedFromWindow()
        stopWaiting()
        stopWatchingVisibility()
        Ticker.remove(this)
    }

    /** The view is gone: frees the icon and stops taking commands. */
    fun drop() {
        release()
        viewId = 0
    }

    /** Frees the icon (on its lane). The view can load another one. */
    fun release() {
        stopWaiting()
        Ticker.remove(this)
        shown = false
        val icon = icon ?: return
        this.icon = null
        core(icon) {
            if (icon.handle != 0L) Core.free(icon.handle)
            icon.handle = 0L
        }
    }

    // ---- Events ---------------------------------------------------------------------------

    private fun emitComplete(token: Int) {
        emit("topComplete", Arguments.createMap().apply { putInt("token", token) })
    }

    private fun emit(name: String, data: WritableMap) {
        val reactContext = context as? ReactContext ?: return
        val dispatcher = UIManagerHelper.getEventDispatcherForReactTag(reactContext, id) ?: return
        dispatcher.dispatchEvent(LordIconEvent(UIManagerHelper.getSurfaceId(this), id, name, data))
    }

    companion object {
        /** Views by viewId (UI thread). */
        private val views = HashMap<Int, LordIconView>()

        fun find(viewId: Int): LordIconView? = views[viewId]

        /** `primary:#ff0000,secondary:#00ff00` to name -> rgb (0..1). */
        private fun parseColors(text: String): Map<String, FloatArray> = text.split(',').mapNotNull { item ->
            val parts = item.split(':')
            if (parts.size != 2 || parts[1].length != 7 || parts[1][0] != '#') return@mapNotNull null
            val v = parts[1].substring(1).toIntOrNull(16) ?: return@mapNotNull null
            parts[0] to floatArrayOf((v shr 16 and 255) / 255f, (v shr 8 and 255) / 255f, (v and 255) / 255f)
        }.toMap()
    }
}

class LordIconEvent(surfaceId: Int, viewId: Int, private val name: String, private val data: WritableMap) :
    Event<LordIconEvent>(surfaceId, viewId) {
    override fun getEventName() = name
    override fun getEventData(): WritableMap = data
}
