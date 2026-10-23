#include "models.h"

#include <unordered_map>

namespace lordicon {

namespace {

struct Cached {
    std::weak_ptr<const std::string> source;
    li_model* model;
};

/** This thread's models, by the address of their source (checked against `source`). */
std::unordered_map<const std::string*, Cached>& models()
{
    thread_local std::unordered_map<const std::string*, Cached> map;
    return map;
}

/** Frees the models whose source is gone from the registry; their icons keep theirs. */
void purge()
{
    auto& map = models();
    for (auto it = map.begin(); it != map.end();) {
        if (it->second.source.expired()) {
            li_model_free(it->second.model);
            it = map.erase(it);
        } else {
            ++it;
        }
    }
}

}  // namespace

li_icon* newIcon(const IconSource& source)
{
    if (!source) return nullptr;
    purge();
    auto& map = models();
    auto found = map.find(source.get());
    if (found == map.end()) {
        auto model = li_model_load(source->data(), source->size(), -1);
        if (!model) return nullptr;
        found = map.emplace(source.get(), Cached{source, model}).first;
    }
    return li_icon_new(found->second.model);
}

void freeIcon(li_icon* icon)
{
    li_free(icon);
    purge();
}

void dropModels()
{
    auto& map = models();
    for (auto& [address, cached] : map) li_model_free(cached.model);
    map.clear();
}

size_t threadModels() { return models().size(); }

}  // namespace lordicon
