import { LordIcon as Icon } from './LordIcon';
import { LordIconTarget } from './target';

/** The icon; `LordIcon.Target`: the Pressable that tells icons inside of taps, hover and focus. */
export const LordIcon = Object.assign(Icon, { Target: LordIconTarget });
export { LordIconTarget, type LordIconTargetProps } from './target';
export { LordIconLoadError, type LoadErrorKind } from './errors';
export type { MotionMode } from './motion';
// Triggers of your own: `defineTrigger('wobble', Wobble)`, `trigger="wobble"`.
export { BaseTrigger, Presence } from './triggers/base';
export { defineTrigger } from './triggers/host';
export type { TriggerName } from './triggers/builtin';
export type {
    Command,
    SignalType,
    Signals,
    Trigger,
    TriggerConstructor,
    TriggerContext,
    TriggerPlayer,
} from './triggers/types';
export {
    LordIconProvider,
    type Assets,
    type CacheOptions,
    type LordIconConfig,
    type RenderOptions,
} from './LordIconProvider';
export type { LordIconHandle, LordIconProps } from './props';
// The focus of a tab, for its icon's `value`.
export { useTabFocus, type FocusSource } from './tab-focus';
export type { InitialProperties, PlayOptions } from './player/player';
export type {
    CompleteDetail,
    PlayerEvent,
    PlayerEventMap,
    PlayerEventType,
    PlayerListener,
} from './player/events';
export type {
    ColorMap,
    IconProperties,
    IconState,
    Segment,
    StateType,
    Stroke,
} from '@lordicon/utils-lottie';
// The state helpers of @lordicon/web: `splitSegment(icon.currentState, 0.6)` for a morph.
export {
    colorsByName,
    defaultState,
    findState,
    parseColors,
    parseStroke,
    resolveColor,
    splitSegment,
    stateEndFrame,
    stateRatio,
    stateSegment,
    stateType,
    strokeName,
} from '@lordicon/utils-lottie';
