package com.lordicon.reactnative

import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.ViewManagerDelegate
import com.facebook.react.viewmanagers.LordIconViewManagerDelegate
import com.facebook.react.viewmanagers.LordIconViewManagerInterface

@ReactModule(name = LordIconViewManager.NAME)
class LordIconViewManager : SimpleViewManager<LordIconView>(), LordIconViewManagerInterface<LordIconView> {
    private val delegate: ViewManagerDelegate<LordIconView> = LordIconViewManagerDelegate(this)

    override fun getDelegate() = delegate
    override fun getName() = NAME
    override fun createViewInstance(context: ThemedReactContext) = LordIconView(context)

    // Props: applied together in onAfterUpdateTransaction.
    override fun setViewId(view: LordIconView, value: Int) { view.viewId = value }
    override fun setIcon(view: LordIconView, value: Int) { view.iconKey = value }
    override fun setRenderMode(view: LordIconView, value: String?) { view.renderMode = value ?: "background" }
    override fun setWorkers(view: LordIconView, value: Int) { view.workers = value }
    override fun setFrameRate(view: LordIconView, value: Float) { view.pacer.limit = value }
    override fun setObserveVisibility(view: LordIconView, value: Boolean) { view.observeVisibility = value }

    override fun onAfterUpdateTransaction(view: LordIconView) {
        super.onAfterUpdateTransaction(view)
        view.commit()
    }

    // Commands come through LordIconModule, by viewId.

    override fun onDropViewInstance(view: LordIconView) {
        super.onDropViewInstance(view)
        view.drop()
    }

    override fun getExportedCustomDirectEventTypeConstants(): Map<String, Any> = mapOf(
        "topLoad" to mapOf("registrationName" to "onLoad"),
        "topComplete" to mapOf("registrationName" to "onComplete"),
        "topVisible" to mapOf("registrationName" to "onVisible"),
    )

    companion object {
        const val NAME = "LordIconView"
    }
}
