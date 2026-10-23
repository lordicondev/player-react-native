// The icons' JSON on the native side, once per icon in use: the JS registry (src/registry.ts)
// registers an icon's JSON and gets a key, views get the key as a prop and load from here. An
// entry lives while a mounted <LordIcon> uses it; JS releases it after the last one unmounts.
// Shared by Android (JNI) and iOS; thread-safe.
#pragma once

#include <cstdint>
#include <memory>
#include <string>

namespace lordicon {

/** An icon's JSON. A view holds it from its commit until the load on its render thread. */
using IconSource = std::shared_ptr<const std::string>;

/** Stores the JSON and returns its key: never 0, never reused. */
int32_t registerIcon(std::string json);

/** Drops the key; views that hold its source keep it until they let go. */
void releaseIcon(int32_t key);

/** The JSON of a key, or null when the key is unknown or released. */
IconSource iconSource(int32_t key);

/** Entries and their JSON bytes, for stats. */
size_t registeredIcons(size_t* bytes = nullptr);

}  // namespace lordicon
