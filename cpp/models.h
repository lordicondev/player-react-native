// Icon models per core thread: views drawing the same icon on one thread (the UI thread or a
// render lane) share one model of it (runtime's li_model: ThorVG, parsed once), each with its own
// playback and look. ThorVG keeps memory per thread, so a model never leaves its thread: every
// function here runs on the core thread of the icons it deals with.
//
// A model stays while its icons do, or while its source is registered (cpp/registry.h): the JS
// registry keeps icons no view shows in a cache, and showing one again needs no parsing.
#pragma once

#include <cstddef>

#include "lordicon_c.h"
#include "registry.h"

namespace lordicon {

/** An icon drawing from this thread's model of the source, loaded on first use; null when it
 *  is not an icon. */
li_icon* newIcon(const IconSource& source);

/** Frees an icon, and this thread's models whose source is no longer registered. */
void freeIcon(li_icon* icon);

/** Lets go of this thread's models (on a memory warning): those no icon draws from are freed. */
void dropModels();

/** Models this thread keeps. */
size_t threadModels();

}  // namespace lordicon
