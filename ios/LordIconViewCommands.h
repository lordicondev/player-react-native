// Internal to the pod: what LordIconModule needs of the views.
#import "LordIconView.h"

NS_ASSUME_NONNULL_BEGIN

@interface LordIconView ()
/** The mounted view with this `viewId` prop, if any. Main thread. */
+ (nullable LordIconView*)viewWithId:(NSInteger)viewId;
- (int32_t)viewId;
/** Every colour (`primary:#ff0000,secondary:#00ff00`) and the stroke, 1..3 (0: none). */
- (void)look:(NSString*)colors stroke:(float)stroke tint:(NSString*)tint;
- (void)segment:(float)begin end:(float)end;
- (void)playback:(float)speed direction:(NSInteger)direction loop:(BOOL)loop rest:(float)rest;
- (void)play:(NSInteger)token;
- (void)pause;
- (void)seek:(float)frame;
@end

NS_ASSUME_NONNULL_END
