#include "views.h"

#include <cmath>
#include <mutex>
#include <unordered_map>

namespace lordicon {

namespace {

struct View {
    float frame = NAN;
    uint32_t applied = 0;
};

std::mutex mutex;
std::unordered_map<int32_t, View> views;

}  // namespace

void watchView(int32_t viewId)
{
    if (!viewId) return;
    std::lock_guard<std::mutex> lock(mutex);
    views.try_emplace(viewId);
}

void commandDone(int32_t viewId, float frame)
{
    std::lock_guard<std::mutex> lock(mutex);
    auto it = views.find(viewId);
    if (it == views.end()) return;
    it->second.applied++;
    it->second.frame = frame;
}

void publishFrame(int32_t viewId, float frame)
{
    std::lock_guard<std::mutex> lock(mutex);
    auto it = views.find(viewId);
    if (it != views.end()) it->second.frame = frame;
}

float readFrame(int32_t viewId, uint32_t sent)
{
    std::lock_guard<std::mutex> lock(mutex);
    auto it = views.find(viewId);
    if (it == views.end() || it->second.applied < sent) return NAN;
    return it->second.frame;
}

void forgetView(int32_t viewId)
{
    std::lock_guard<std::mutex> lock(mutex);
    views.erase(viewId);
}

}  // namespace lordicon
