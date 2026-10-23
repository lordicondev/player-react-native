// JNI bridge: Core (Kotlin) -> the C API of the runtime's core. Renders straight into Bitmap pixels.
#include <android/bitmap.h>
#include <jni.h>

#include <cmath>
#include <memory>

#include "lordicon_c.h"
#include "models.h"
#include "registry.h"
#include "views.h"

#define FN(ret, name) extern "C" JNIEXPORT ret JNICALL Java_com_lordicon_reactnative_Core_##name
#define ICON reinterpret_cast<li_icon*>(handle)

jint JNI_OnLoad(JavaVM*, void*)
{
    li_init(0);
    li_shared_canvas(1);  // one ThorVG canvas per thread: an icon always renders on the same one
    return JNI_VERSION_1_6;
}

// The registry (registry.h): JSON in once per icon in use, views load by key.
FN(jint, registerIcon)(JNIEnv* env, jclass, jstring json)
{
    auto size = env->GetStringUTFLength(json);
    auto chars = env->GetStringUTFChars(json, nullptr);
    std::string text(chars, (size_t)size);
    env->ReleaseStringUTFChars(json, chars);
    return lordicon::registerIcon(std::move(text));
}

FN(void, releaseIcon)(JNIEnv*, jclass, jint key) { lordicon::releaseIcon(key); }

// A view's hold on a key's JSON, from its commit (UI thread) until the load on its core thread:
// a heap copy of the shared pointer, 0 when the key is unknown.
FN(jlong, acquireSource)(JNIEnv*, jclass, jint key)
{
    auto source = lordicon::iconSource(key);
    return source ? reinterpret_cast<jlong>(new lordicon::IconSource(std::move(source))) : 0;
}

// An icon from a hold, drawing from this thread's model of the JSON (models.h), and lets go of
// the hold. 0 when the hold is empty or the JSON is not an icon. Core thread.
FN(jlong, loadSource)(JNIEnv*, jclass, jlong hold)
{
    std::unique_ptr<lordicon::IconSource> source(reinterpret_cast<lordicon::IconSource*>(hold));
    if (!source) return 0;
    return reinterpret_cast<jlong>(lordicon::newIcon(*source));
}

// This thread's models no icon draws from go (memory warning). Core thread.
FN(void, dropModels)(JNIEnv*, jclass) { lordicon::dropModels(); }

FN(jint, registeredIcons)(JNIEnv*, jclass) { return (jint)lordicon::registeredIcons(); }

// Views' frames (views.h), from the icon's core thread; the module reads them on the JS thread.
FN(void, watchView)(JNIEnv*, jclass, jint viewId) { lordicon::watchView(viewId); }

FN(void, commandDone)(JNIEnv*, jclass, jint viewId, jlong handle)
{
    lordicon::commandDone(viewId, handle ? li_current_frame(ICON) : NAN);
}

FN(void, publishFrame)(JNIEnv*, jclass, jint viewId, jlong handle)
{
    if (handle) lordicon::publishFrame(viewId, li_current_frame(ICON));
}

FN(jfloat, readFrame)(JNIEnv*, jclass, jint viewId, jint sent) { return lordicon::readFrame(viewId, (uint32_t)sent); }
FN(void, forgetView)(JNIEnv*, jclass, jint viewId) { lordicon::forgetView(viewId); }

FN(void, freeIcon)(JNIEnv*, jclass, jlong handle) { lordicon::freeIcon(ICON); }

FN(void, setColor)(JNIEnv* env, jclass, jlong handle, jstring name, jfloat r, jfloat g, jfloat b)
{
    auto chars = env->GetStringUTFChars(name, nullptr);
    li_set_color(ICON, chars, r, g, b);
    env->ReleaseStringUTFChars(name, chars);
}

FN(void, setStroke)(JNIEnv*, jclass, jlong handle, jfloat value) { li_set_stroke(ICON, value); }
FN(void, setTint)(JNIEnv*, jclass, jlong handle, jboolean on, jfloat r, jfloat g, jfloat b) { li_set_tint(ICON, on, r, g, b); }
FN(void, segment)(JNIEnv*, jclass, jlong handle, jfloat begin, jfloat end) { li_segment(ICON, begin, end); }
FN(void, playback)(JNIEnv*, jclass, jlong handle, jfloat speed, jint direction, jboolean loop, jfloat rest)
{
    li_playback(ICON, speed, direction, loop, rest);
}
FN(void, play)(JNIEnv*, jclass, jlong handle) { li_play(ICON); }
FN(void, pause)(JNIEnv*, jclass, jlong handle) { li_pause(ICON); }
FN(jboolean, playing)(JNIEnv*, jclass, jlong handle) { return li_playing(ICON) != 0; }
FN(void, seek)(JNIEnv*, jclass, jlong handle, jfloat frame) { li_seek(ICON, frame); }
FN(void, redraw)(JNIEnv*, jclass, jlong handle) { li_seek(ICON, li_current_frame(ICON)); }
FN(jint, tick)(JNIEnv*, jclass, jlong handle, jdouble dt) { return li_tick(ICON, dt); }

// 1 when the bitmap was redrawn, 0 when nothing changed, -1 on error.
FN(jint, renderInto)(JNIEnv* env, jclass, jlong handle, jobject bitmap)
{
    AndroidBitmapInfo info;
    void* pixels = nullptr;
    if (AndroidBitmap_getInfo(env, bitmap, &info) != ANDROID_BITMAP_RESULT_SUCCESS) return -1;
    if (info.format != ANDROID_BITMAP_FORMAT_RGBA_8888) return -1;
    if (AndroidBitmap_lockPixels(env, bitmap, &pixels) != ANDROID_BITMAP_RESULT_SUCCESS) return -1;
    auto drawn = li_render_into(ICON, static_cast<uint32_t*>(pixels), info.width, info.height, info.stride / 4, 1);
    AndroidBitmap_unlockPixels(env, bitmap);
    return drawn;
}
