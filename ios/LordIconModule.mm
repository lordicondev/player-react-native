// The native module for JS (src/native/NativeLordIcon.ts): the icon registry, the JSON staying
// in C++ (cpp/registry.h), the player's commands to views by their `viewId`, and the views'
// frames (cpp/views.h). Commands come
// in order on the module's queue and go to the main queue in that order; a view that is gone
// ignores them.

#import <Foundation/Foundation.h>
#import <LordiconReactNativeSpec/LordiconReactNativeSpec.h>

#include <cmath>
#include <string>

#import "LordIconViewCommands.h"
#include "registry.h"
#include "views.h"

@interface LordIconModule : NSObject <NativeLordIconSpec>
@end

static void toView(double viewId, void (^command)(LordIconView* view))
{
    NSInteger id_ = (NSInteger)viewId;
    dispatch_async(dispatch_get_main_queue(), ^{
        LordIconView* view = [LordIconView viewWithId:id_];
        if (view) command(view);
    });
}

@implementation LordIconModule

+ (NSString*)moduleName
{
    return @"LordIcon";
}

- (NSNumber*)registerIcon:(NSString*)json
{
    const char* utf8 = json.UTF8String;
    std::string text(utf8 ? utf8 : "", utf8 ? strlen(utf8) : 0);
    return @(lordicon::registerIcon(std::move(text)));
}

- (void)releaseIcon:(double)key
{
    lordicon::releaseIcon((int32_t)key);
}

- (void)look:(double)viewId colors:(NSString*)colors stroke:(double)stroke tint:(NSString*)tint
{
    toView(viewId, ^(LordIconView* view) { [view look:colors stroke:(float)stroke tint:tint]; });
}

- (void)segment:(double)viewId begin:(double)begin end:(double)end
{
    toView(viewId, ^(LordIconView* view) { [view segment:(float)begin end:(float)end]; });
}

- (void)playback:(double)viewId speed:(double)speed direction:(double)direction loop:(BOOL)loop rest:(double)rest
{
    toView(viewId, ^(LordIconView* view) {
        [view playback:(float)speed direction:(NSInteger)direction loop:loop rest:(float)rest];
    });
}

- (void)play:(double)viewId token:(double)token
{
    toView(viewId, ^(LordIconView* view) { [view play:(NSInteger)token]; });
}

- (void)pause:(double)viewId
{
    toView(viewId, ^(LordIconView* view) { [view pause]; });
}

- (void)seek:(double)viewId frame:(double)frame
{
    toView(viewId, ^(LordIconView* view) { [view seek:(float)frame]; });
}

/** Synchronous, on the JS thread. */
- (NSNumber*)frame:(double)viewId sent:(double)sent
{
    return @(lordicon::readFrame((int32_t)viewId, (uint32_t)sent));
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams&)params
{
    return std::make_shared<facebook::react::NativeLordIconSpecJSI>(params);
}

@end
