// LordIconView: the runtime's core renders an icon into a premultiplied RGBA buffer, which
// becomes a CGImage and the layer's contents. The same model as on Android (LordIconView.kt):
//
// - `ui`: core calls and rendering run on the main thread, in the Ticker's display link.
// - `background`: every core call for an icon runs on its render thread (lane), frames are
//   rendered there in one batch per lane, and the main thread only sets the images.
//
// Lanes are plain threads, not GCD queues: ThorVG keeps memory per thread, and a queue may
// move between threads. Props arrive in updateProps (the icon as its key in the registry,
// cpp/registry.h); commands from the player after onLoad, through LordIconModule, which finds
// the view by its `viewId` prop. A new icon is not drawn until the first command: the player
// says which frame to show.

#import "LordIconView.h"
#import "LordIconViewCommands.h"

#import <QuartzCore/QuartzCore.h>
#import <react/renderer/components/LordiconReactNativeSpec/ComponentDescriptors.h>
#import <react/renderer/components/LordiconReactNativeSpec/EventEmitters.h>
#import <react/renderer/components/LordiconReactNativeSpec/Props.h>

#include <algorithm>
#include <atomic>
#include <cmath>
#include <condition_variable>
#include <deque>
#include <functional>
#include <map>
#include <memory>
#include <mutex>
#include <string>
#include <thread>
#include <vector>

#include "lordicon_c.h"
#include "models.h"
#include "registry.h"
#include "views.h"

using namespace facebook::react;

namespace {

// ---- Lanes ------------------------------------------------------------------------------

constexpr int kMaxLanes = 4;

/** A render thread with a queue of blocks, started on first use and kept. */
class Lane {
public:
    void post(std::function<void()> block)
    {
        std::lock_guard<std::mutex> lock(mutex_);
        if (!started_) {
            started_ = true;
            std::thread([this] { run(); }).detach();
        }
        queue_.push_back(std::move(block));
        ready_.notify_one();
    }

    /** Posts the block only when the lane runs already. */
    void postIfStarted(std::function<void()> block)
    {
        std::lock_guard<std::mutex> lock(mutex_);
        if (!started_) return;
        queue_.push_back(std::move(block));
        ready_.notify_one();
    }

private:
    void run()
    {
        for (;;) {
            std::function<void()> block;
            {
                std::unique_lock<std::mutex> lock(mutex_);
                ready_.wait(lock, [this] { return !queue_.empty(); });
                block = std::move(queue_.front());
                queue_.pop_front();
            }
            @autoreleasepool {
                block();
            }
        }
    }

    std::mutex mutex_;
    std::condition_variable ready_;
    std::deque<std::function<void()>> queue_;
    bool started_ = false;
};

Lane lanes[kMaxLanes];
int nextLane = 0;

int assignLane(int workers)
{
    int n = workers < 1 ? 1 : (workers > kMaxLanes ? kMaxLanes : workers);
    return nextLane++ % n;
}

void toMain(dispatch_block_t block)
{
    dispatch_async(dispatch_get_main_queue(), block);
}

/**
 * One loaded icon. Its handle and buffer belong to its core thread: the main thread (lane -1)
 * or a lane. A new source or render mode makes a new one, so blocks still queued for the old
 * one never touch the new.
 */
struct Loaded {
    explicit Loaded(int lane) : lane(lane) {}

    const int lane;
    li_icon* handle = nullptr;
    std::atomic<int> token{0};
    std::vector<uint32_t> pixels;
    uint32_t w = 0, h = 0;
};

/** Runs on the icon's core thread: now on the main thread, or queued on its lane. */
void core(const std::shared_ptr<Loaded>& icon, std::function<void()> block)
{
    if (icon->lane < 0) block();
    else lanes[icon->lane].post(std::move(block));
}

/** Frees the icon's handle on its own thread, after the blocks queued for it. */
void freeLoaded(const std::shared_ptr<Loaded>& icon)
{
    if (!icon) return;
    core(icon, [icon] {
        if (icon->handle) lordicon::freeIcon(icon->handle);
        icon->handle = nullptr;
    });
}

/** On a memory warning, each core thread lets go of the models no icon draws from. */
void dropModels()
{
    lordicon::dropModels();
    for (auto& lane : lanes) lane.postIfStarted([] { lordicon::dropModels(); });
}

/** Renders the current frame; an image when it changed, else null. Core thread. */
CGImageRef renderImage(Loaded& icon, uint32_t w, uint32_t h)
{
    if (!icon.handle || w == 0 || h == 0) return nullptr;
    if (icon.w != w || icon.h != h) {
        icon.pixels.assign((size_t)w * h, 0);
        icon.w = w;
        icon.h = h;
    }
    if (li_render_into(icon.handle, icon.pixels.data(), w, h, w, 1) != 1) return nullptr;
    // A copy: the buffer is rendered into again while the layer still shows this frame.
    CFDataRef data = CFDataCreate(nullptr, (const UInt8*)icon.pixels.data(), (CFIndex)w * h * 4);
    CGDataProviderRef provider = CGDataProviderCreateWithCFData(data);
    static CGColorSpaceRef space = CGColorSpaceCreateWithName(kCGColorSpaceSRGB);
    CGImageRef image = CGImageCreate(w, h, 8, 32, w * 4, space,
        kCGImageAlphaPremultipliedLast | kCGBitmapByteOrder32Big, provider, nullptr, false,
        kCGRenderingIntentDefault);
    CGDataProviderRelease(provider);
    CFRelease(data);
    return image;
}

struct Rgb {
    float r, g, b;
};

/** `primary:#ff0000,secondary:#00ff00` to name -> rgb (0..1). */
std::map<std::string, Rgb> parseColors(const std::string& text)
{
    std::map<std::string, Rgb> colors;
    size_t start = 0;
    while (start < text.size()) {
        size_t end = text.find(',', start);
        if (end == std::string::npos) end = text.size();
        std::string item = text.substr(start, end - start);
        size_t colon = item.find(':');
        if (colon != std::string::npos && item.size() - colon == 8 && item[colon + 1] == '#') {
            unsigned v = (unsigned)strtoul(item.c_str() + colon + 2, nullptr, 16);
            colors[item.substr(0, colon)] = {((v >> 16) & 255) / 255.f, ((v >> 8) & 255) / 255.f, (v & 255) / 255.f};
        }
        start = end + 1;
    }
    return colors;
}

/**
 * Paces one icon's frames to a limit on a faster display (`frameRate: 60` on 120 Hz: every
 * other display frame). Time is never lost: a tick gets all the time since the last one.
 * The same logic as src/pacer.ts, which has the tests: keep them alike.
 */
struct Pacer {
    float limit = 0;  // frames per second at most; 0 for every display frame

    void setLimit(float value)
    {
        limit = value;
        interval = value > 0 ? 1.0 / value : 0;
    }

    /** The icon starts needing frames again: its first display frame ticks. */
    void reset()
    {
        budget = interval;
        elapsed = 0;
    }

    /** One display frame, `dt` seconds after the last: the seconds to tick by, or -1 to skip. */
    double frame(double dt)
    {
        wait(dt);
        if (interval > 0 && budget < interval * 0.9) return -1;
        budget -= interval;
        if (budget > dt) budget = 0;
        double time = elapsed;
        elapsed = 0;
        return time;
    }

    /** A display frame the icon cannot take (its render thread is busy): the time adds up. */
    void wait(double dt)
    {
        elapsed += dt;
        budget += dt;
    }

private:
    double interval = 0, budget = 0, elapsed = 0;
};

}  // namespace

// ---- Ticker -----------------------------------------------------------------------------

@interface LordIconView ()
- (BOOL)isBackground;
- (BOOL)isOnScreen;
/** `ui`: one frame. NO when the icon needs no more frames. */
- (BOOL)frame:(double)dt;
- (std::shared_ptr<Loaded>)loaded;
- (CGSize)pixelSize;
/** The frame rate limit (prop `frameRate`), applied by the Ticker. */
- (Pacer*)pacer;
/** `background`: the batch's result for this icon. NO when it needs no more frames. */
- (BOOL)applyEvents:(int)events image:(CGImageRef)image token:(int)token playing:(BOOL)playing visible:(BOOL)visible;
@end

/** `background`: one icon's part of a frame batch. */
struct Job {
    LordIconView* __strong view;
    std::shared_ptr<Loaded> icon;
    bool visible;
    uint32_t w, h;
    int32_t viewId;
    double dt;
    int events = 0;
    CGImageRef image = nullptr;
    bool playing = false;
    int token = 0;
};

/**
 * One display link for every icon that needs frames. `ui` icons tick and render in it;
 * `background` icons get one batch per frame and lane. Each icon's Pacer decides whether a
 * display frame is one of its frames (`frameRate`), and how much time it carries: while a batch
 * runs, background icons skip frames and their time adds up. The display link asks for the
 * highest rate an icon needs (ProMotion: up to 120 Hz).
 */
@interface LordIconTicker : NSObject
+ (instancetype)shared;
- (void)add:(LordIconView*)view;
- (void)remove:(LordIconView*)view;
@end

@implementation LordIconTicker {
    NSHashTable<LordIconView*>* _views;
    /**
     * Views added while a batch runs: a command (play) may come after the batch read the icon on
     * its lane as stopped; such a view stays, whatever the batch says.
     */
    NSHashTable<LordIconView*>* _addedDuringBatch;
    CADisplayLink* _link;
    CFTimeInterval _last;
    float _rate;
    BOOL _busy;
}

+ (instancetype)shared
{
    static LordIconTicker* ticker;
    static dispatch_once_t once;
    dispatch_once(&once, ^{ ticker = [LordIconTicker new]; });
    return ticker;
}

- (instancetype)init
{
    if (self = [super init]) {
        _views = [NSHashTable weakObjectsHashTable];
        _addedDuringBatch = [NSHashTable weakObjectsHashTable];
    }
    return self;
}

- (void)add:(LordIconView*)view
{
    if (![_views containsObject:view]) [view pacer]->reset();
    [_views addObject:view];
    if (_busy) [_addedDuringBatch addObject:view];
    if (!_link) {
        _last = 0;
        _rate = -1;
        _link = [CADisplayLink displayLinkWithTarget:self selector:@selector(tick:)];
        [_link addToRunLoop:[NSRunLoop mainRunLoop] forMode:NSRunLoopCommonModes];
    }
}

/** The highest rate an icon needs: its limit, or the display's for one without. */
- (void)updateRate
{
    float most = (float)UIScreen.mainScreen.maximumFramesPerSecond;
    float rate = 0;
    for (LordIconView* view in _views) {
        float limit = [view pacer]->limit;
        rate = std::max(rate, limit > 0 ? std::min(limit, most) : most);
    }
    if (rate <= 0 || rate == _rate) return;
    _rate = rate;
    if (@available(iOS 15.0, *)) _link.preferredFrameRateRange = CAFrameRateRangeMake(rate, rate, rate);
}

- (void)remove:(LordIconView*)view
{
    [_views removeObject:view];
    [_addedDuringBatch removeObject:view];
}

- (void)tick:(CADisplayLink*)link
{
    double dt = _last ? link.timestamp - _last : 0;
    _last = link.timestamp;

    auto jobs = std::make_shared<std::vector<Job>>();
    for (LordIconView* view in _views.allObjects) {
        if ([view isBackground] && _busy) {
            [view pacer]->wait(dt);
            continue;
        }
        double time = [view pacer]->frame(dt);
        if (time < 0) continue;
        if ([view isBackground]) {
            auto icon = [view loaded];
            if (!icon) {
                [_views removeObject:view];
                continue;
            }
            CGSize size = [view pixelSize];
            jobs->push_back({view, icon, (bool)[view isOnScreen], (uint32_t)size.width, (uint32_t)size.height, [view viewId], time});
        } else if (![view frame:time]) {
            [_views removeObject:view];
        }
    }
    if (!jobs->empty()) [self runBatch:jobs];
    [self updateRate];
    if (_views.count == 0 && !_busy) {
        [_link invalidate];
        _link = nil;
    }
}

- (void)runBatch:(std::shared_ptr<std::vector<Job>>)jobs
{
    _busy = YES;
    std::map<int, std::vector<Job*>> byLane;
    for (auto& job : *jobs) byLane[job.icon->lane].push_back(&job);
    auto remaining = std::make_shared<int>((int)byLane.size());
    for (auto& [lane, laneJobs] : byLane) {
        lanes[lane].post([self, jobs, laneJobs, remaining] {
            for (Job* job : laneJobs) {
                Loaded& icon = *job->icon;
                if (!icon.handle) continue;
                job->events = li_tick(icon.handle, job->dt);
                lordicon::publishFrame(job->viewId, li_current_frame(icon.handle));
                if ((job->events & LI_EVENT_FRAME) && job->visible) job->image = renderImage(icon, job->w, job->h);
                job->playing = li_playing(icon.handle) != 0;
                job->token = icon.token.load();
            }
            toMain(^{
                if (--*remaining > 0) return;
                self->_busy = NO;
                for (auto& job : *jobs) {
                    BOOL more = [job.view applyEvents:job.events image:job.image token:job.token playing:job.playing visible:job.visible];
                    if (job.image) CGImageRelease(job.image);
                    if (!more && ![self->_addedDuringBatch containsObject:job.view]) [self->_views removeObject:job.view];
                }
                [self->_addedDuringBatch removeAllObjects];
                if (self->_views.count > 0 && !self->_link) [self add:self->_views.anyObject];
            });
        });
    }
}

@end

// ---- Visibility -------------------------------------------------------------------------

@interface LordIconView ()
/** `observeVisibility`: half of the view shows; reports it (`onVisible`) and stops. */
- (BOOL)checkVisibility;
@end

/**
 * Views waiting to come into view (`in`, `intro`). iOS tells a view nothing when a scroll view
 * around it moves, so they are checked ten times a second while any waits.
 */
@interface LordIconVisibility : NSObject
+ (instancetype)shared;
- (void)watch:(LordIconView*)view;
- (void)unwatch:(LordIconView*)view;
@end

@implementation LordIconVisibility {
    NSHashTable<LordIconView*>* _views;
    CADisplayLink* _link;
}

+ (instancetype)shared
{
    static LordIconVisibility* shared;
    static dispatch_once_t once;
    dispatch_once(&once, ^{ shared = [LordIconVisibility new]; });
    return shared;
}

- (void)watch:(LordIconView*)view
{
    _views = _views ?: [NSHashTable weakObjectsHashTable];
    [_views addObject:view];
    if (!_link) {
        _link = [CADisplayLink displayLinkWithTarget:self selector:@selector(tick:)];
        _link.preferredFramesPerSecond = 10;
        [_link addToRunLoop:[NSRunLoop mainRunLoop] forMode:NSRunLoopCommonModes];
    }
}

- (void)unwatch:(LordIconView*)view
{
    [_views removeObject:view];
    if (_views.count == 0) {
        [_link invalidate];
        _link = nil;
    }
}

- (void)tick:(CADisplayLink*)link
{
    for (LordIconView* view in _views.allObjects) {
        if ([view checkVisibility]) [self unwatch:view];
    }
}

@end

// ---- View -------------------------------------------------------------------------------

/** Views by viewId, for LordIconModule (main thread). */
static NSMapTable<NSNumber*, LordIconView*>* viewsById()
{
    static NSMapTable* views = [NSMapTable strongToWeakObjectsMapTable];
    return views;
}

@implementation LordIconView {
    NSInteger _viewId;
    Pacer _pacer;
    std::shared_ptr<Loaded> _icon;
    int _iconKey;
    BOOL _ui;
    int _workers;
    /** The player has sent a command for the current icon. */
    BOOL _shown;
    /** A frame waits off screen. */
    BOOL _waiting;
    /** Prop `observeVisibility` as last set, and whether it still waits for half of the view. */
    BOOL _observeProp;
    BOOL _observing;
}

+ (void)initialize
{
    if (self == [LordIconView class]) {
        li_init(0);
        li_shared_canvas(1);  // one ThorVG canvas per thread
        [NSNotificationCenter.defaultCenter addObserverForName:UIApplicationDidReceiveMemoryWarningNotification
                                                        object:nil
                                                         queue:NSOperationQueue.mainQueue
                                                    usingBlock:^(NSNotification* note) {
                                                        (void)note;
                                                        dropModels();
                                                    }];
    }
}

+ (ComponentDescriptorProvider)componentDescriptorProvider
{
    return concreteComponentDescriptorProvider<LordIconViewComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame
{
    if (self = [super initWithFrame:frame]) {
        static const auto defaultProps = std::make_shared<const LordIconViewProps>();
        _props = defaultProps;
        _iconKey = 0;
        _workers = 1;
        self.layer.contentsGravity = kCAGravityResize;
    }
    return self;
}

// ---- Props ------------------------------------------------------------------------------

- (void)updateProps:(Props::Shared const&)props oldProps:(Props::Shared const&)oldProps
{
    const auto& p = *std::static_pointer_cast<const LordIconViewProps>(props);
    [self setViewId:p.viewId];
    BOOL ui = p.renderMode == LordIconViewRenderMode::Ui;
    BOOL load = p.icon != _iconKey || ui != _ui || p.workers != _workers || !_icon;
    _iconKey = p.icon;
    _ui = ui;
    _workers = p.workers;
    _pacer.setLimit(p.frameRate);
    if (p.observeVisibility != _observeProp) {
        _observeProp = p.observeVisibility;
        _observing = _observeProp;
        if (_observing) [self watchVisibility];
        else [[LordIconVisibility shared] unwatch:self];
    }

    if (load) {
        [self releaseIcon];
        if (_iconKey != 0) _icon = std::make_shared<Loaded>(_ui ? -1 : assignLane(_workers));
    }
    if (_icon && load) {
        auto icon = _icon;
        // Held from here until the load on the core thread, whatever the registry does meanwhile.
        lordicon::IconSource source = lordicon::iconSource(_iconKey);
        __weak LordIconView* weakSelf = self;
        core(icon, [icon, source, weakSelf] {
            icon->handle = lordicon::newIcon(source);
            bool ok = icon->handle != nullptr;
            dispatch_block_t done = ^{
                LordIconView* view = weakSelf;
                if (!view || view->_icon != icon) return;
                if (!ok) view.layer.contents = nil;
                [view emitLoad:ok];
            };
            // Always later on the main thread, also for `ui` (loaded right here): a new view
            // gets its event emitter after updateProps (RCTMountingManager), so an event now
            // would be lost.
            toMain(done);
        });
    }
    [super updateProps:props oldProps:oldProps];
}

// ---- Commands (main thread, from LordIconModule) ----------------------------------------

+ (LordIconView*)viewWithId:(NSInteger)viewId
{
    return viewId ? [viewsById() objectForKey:@(viewId)] : nil;
}

- (int32_t)viewId
{
    return (int32_t)_viewId;
}

- (void)setViewId:(NSInteger)viewId
{
    if (viewId == _viewId) return;
    if (_viewId && [viewsById() objectForKey:@(_viewId)] == self) [viewsById() removeObjectForKey:@(_viewId)];
    if (_viewId) lordicon::forgetView((int32_t)_viewId);
    _viewId = viewId;
    if (_viewId) {
        [viewsById() setObject:self forKey:@(_viewId)];
        lordicon::watchView((int32_t)_viewId);
    }
}

- (void)look:(NSString*)colors stroke:(float)stroke tint:(NSString*)tint
{
    auto rgb = parseColors(colors.UTF8String ?: "");
    auto one = parseColors(std::string("tint:") + (tint.UTF8String ?: ""));
    [self command:[rgb, stroke, one](Loaded& icon) {
        for (auto& [name, c] : rgb) li_set_color(icon.handle, name.c_str(), c.r, c.g, c.b);
        if (stroke > 0) li_set_stroke(icon.handle, stroke);
        auto t = one.find("tint");
        if (t != one.end()) li_set_tint(icon.handle, 1, t->second.r, t->second.g, t->second.b);
        else li_set_tint(icon.handle, 0, 0, 0, 0);
    }];
}

- (void)segment:(float)begin end:(float)end
{
    [self command:[=](Loaded& icon) { li_segment(icon.handle, begin, end); }];
}

- (void)playback:(float)speed direction:(NSInteger)direction loop:(BOOL)loop rest:(float)rest
{
    [self command:[=](Loaded& icon) { li_playback(icon.handle, speed, (int)direction, loop ? 1 : 0, rest); }];
}

- (void)play:(NSInteger)token
{
    [self command:[=](Loaded& icon) {
        icon.token = (int)token;
        li_play(icon.handle);
    }];
}

- (void)pause
{
    [self command:[](Loaded& icon) { li_pause(icon.handle); }];
}

- (void)seek:(float)frame
{
    [self command:[=](Loaded& icon) { li_seek(icon.handle, frame); }];
}

/**
 * Runs a command on the icon's core thread and reports it applied, with the frame, for the
 * player's reads (cpp/views.h). Without an icon the command is dropped, and reported too.
 */
- (void)command:(std::function<void(Loaded&)>)block
{
    int32_t viewId = (int32_t)_viewId;
    auto icon = _icon;
    if (!icon) {
        lordicon::commandDone(viewId, NAN);
        return;
    }
    core(icon, [icon, block, viewId] {
        if (icon->handle) block(*icon);
        lordicon::commandDone(viewId, icon->handle ? li_current_frame(icon->handle) : NAN);
    });
    _shown = YES;
    if (self.window) [[LordIconTicker shared] add:self];
}

// ---- Frames -----------------------------------------------------------------------------

- (BOOL)isBackground
{
    return _icon && _icon->lane >= 0;
}

- (Pacer*)pacer
{
    return &_pacer;
}

- (std::shared_ptr<Loaded>)loaded
{
    return _icon;
}

- (BOOL)isOnScreen
{
    UIWindow* window = self.window;
    if (!window || self.hidden || self.alpha == 0) return NO;
    CGRect rect = [self convertRect:self.bounds toView:nil];
    return CGRectIntersectsRect(rect, window.bounds);
}

/** The share of the view on screen: inside the window and every clipping ancestor. */
- (CGFloat)visibleFraction
{
    UIWindow* window = self.window;
    CGRect rect = [self convertRect:self.bounds toView:nil];
    if (!window || self.hidden || self.alpha == 0 || CGRectIsEmpty(rect)) return 0;
    CGRect visible = CGRectIntersection(rect, window.bounds);
    for (UIView* view = self.superview; view && view != window; view = view.superview) {
        if (view.hidden || view.alpha == 0) return 0;
        if (view.clipsToBounds) visible = CGRectIntersection(visible, [view convertRect:view.bounds toView:nil]);
        if (CGRectIsNull(visible)) return 0;
    }
    return (visible.size.width * visible.size.height) / (rect.size.width * rect.size.height);
}

- (void)watchVisibility
{
    if (!_observing) return;
    if (![self checkVisibility]) [[LordIconVisibility shared] watch:self];
}

- (BOOL)checkVisibility
{
    // An event before the emitter exists (a new view, before updateProps) would be lost.
    if (!_observing || !_eventEmitter) return !_observing;
    if ([self visibleFraction] < 0.5) return NO;
    _observing = NO;
    std::static_pointer_cast<const LordIconViewEventEmitter>(_eventEmitter)->onVisible({.visible = true});
    return YES;
}

- (CGSize)pixelSize
{
    CGFloat scale = self.traitCollection.displayScale > 0 ? self.traitCollection.displayScale : UIScreen.mainScreen.scale;
    return CGSizeMake(round(self.bounds.size.width * scale), round(self.bounds.size.height * scale));
}

- (BOOL)frame:(double)dt
{
    if (!_icon || !_icon->handle) return NO;
    Loaded& icon = *_icon;
    int events = li_tick(icon.handle, dt);
    lordicon::publishFrame((int32_t)_viewId, li_current_frame(icon.handle));
    BOOL visible = [self isOnScreen];
    CGImageRef image = nullptr;
    if ((events & LI_EVENT_FRAME) && visible) {
        CGSize size = [self pixelSize];
        image = renderImage(icon, (uint32_t)size.width, (uint32_t)size.height);
    }
    BOOL more = [self applyEvents:events image:image token:icon.token.load() playing:li_playing(icon.handle) != 0 visible:visible];
    if (image) CGImageRelease(image);
    return more;
}

/**
 * A frame's result, on the main thread. Off screen (e.g. a list row outside the viewport) time
 * runs and nothing is drawn; the icon then waits, and draws once it is on screen. NO when the
 * icon needs no more frames.
 */
- (BOOL)applyEvents:(int)events image:(CGImageRef)image token:(int)token playing:(BOOL)playing visible:(BOOL)visible
{
    BOOL more = playing;
    if (image) {
        [self show:image];
        _waiting = NO;
    } else if ((events & LI_EVENT_FRAME) && !visible) {
        _waiting = YES;
    } else if (_waiting && visible) {
        _waiting = NO;
        [self redraw];
        more = YES;
    }
    if (events & LI_EVENT_COMPLETE) [self emitComplete:token];
    return more || _waiting;
}

- (void)show:(CGImageRef)image
{
    [CATransaction begin];
    [CATransaction setDisableActions:YES];
    self.layer.contents = (__bridge id)image;
    [CATransaction commit];
}

/** Renders the current frame again. */
- (void)redraw
{
    auto icon = _icon;
    if (!icon || !_shown) return;
    core(icon, [icon] {
        if (icon->handle) li_seek(icon->handle, li_current_frame(icon->handle));
    });
    if (self.window) [[LordIconTicker shared] add:self];
}

// ---- View -------------------------------------------------------------------------------

- (void)layoutSubviews
{
    [super layoutSubviews];
    [self redraw];
    if (_observing) [self watchVisibility];
}

- (void)didMoveToWindow
{
    [super didMoveToWindow];
    if (self.window) {
        if (_shown) [self redraw];
        if (_observing) [self watchVisibility];
    } else {
        [[LordIconTicker shared] remove:self];
        [[LordIconVisibility shared] unwatch:self];
    }
}

- (void)prepareForRecycle
{
    [super prepareForRecycle];
    [self setViewId:0];
    [self releaseIcon];
    _iconKey = 0;
    _observeProp = NO;
    _observing = NO;
    [[LordIconVisibility shared] unwatch:self];
    self.layer.contents = nil;
}

- (void)dealloc
{
    freeLoaded(_icon);
}

- (void)releaseIcon
{
    [[LordIconTicker shared] remove:self];
    _shown = NO;
    _waiting = NO;
    freeLoaded(_icon);
    _icon.reset();
}

// ---- Events -----------------------------------------------------------------------------

- (void)emitLoad:(BOOL)ok
{
    if (_eventEmitter) {
        std::static_pointer_cast<const LordIconViewEventEmitter>(_eventEmitter)->onLoad({.ok = (bool)ok});
    }
}

- (void)emitComplete:(int)token
{
    if (_eventEmitter) {
        std::static_pointer_cast<const LordIconViewEventEmitter>(_eventEmitter)->onComplete({.token = token});
    }
}

@end
