// Where each view's playback is, for the player's synchronous reads (the module's frame()).
// Views report from the thread that runs their icon; JS reads on its own thread. A read is
// only good once the view has applied every command JS sent it: the player counts what it
// sends, the view counts what it applied (or dropped). Thread-safe.
#pragma once

#include <cstdint>

namespace lordicon {

/** A view with this id is there: reports for it count from now until forgetView(). */
void watchView(int32_t viewId);

/** The view applied (or, without an icon, dropped) one command; `frame` is where it is now (NaN: unknown). */
void commandDone(int32_t viewId, float frame);

/** The frame after a tick. */
void publishFrame(int32_t viewId, float frame);

/** The view's frame, or NaN when unknown or when it has applied fewer than `sent` commands. */
float readFrame(int32_t viewId, uint32_t sent);

/** The view is gone; late reports (blocks still queued for it) are ignored. */
void forgetView(int32_t viewId);

}  // namespace lordicon
