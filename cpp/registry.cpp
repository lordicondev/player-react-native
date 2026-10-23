#include "registry.h"

#include <mutex>
#include <unordered_map>

namespace lordicon {

namespace {

std::mutex mutex;
std::unordered_map<int32_t, IconSource> entries;
int32_t lastKey = 0;

}  // namespace

int32_t registerIcon(std::string json)
{
    auto source = std::make_shared<const std::string>(std::move(json));
    std::lock_guard<std::mutex> lock(mutex);
    int32_t key = ++lastKey;
    entries.emplace(key, std::move(source));
    return key;
}

void releaseIcon(int32_t key)
{
    IconSource source;  // freed outside the lock
    std::lock_guard<std::mutex> lock(mutex);
    auto it = entries.find(key);
    if (it == entries.end()) return;
    source = std::move(it->second);
    entries.erase(it);
}

IconSource iconSource(int32_t key)
{
    std::lock_guard<std::mutex> lock(mutex);
    auto it = entries.find(key);
    return it == entries.end() ? nullptr : it->second;
}

size_t registeredIcons(size_t* bytes)
{
    std::lock_guard<std::mutex> lock(mutex);
    if (bytes) {
        *bytes = 0;
        for (auto& [key, source] : entries) *bytes += source->size();
    }
    return entries.size();
}

}  // namespace lordicon
