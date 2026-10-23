import type {
    ColorMap,
    IconData,
    IconProperties,
    IconState,
    Segment,
    Stroke,
} from '@lordicon/utils-lottie';
import type { ReactNode, Ref } from 'react';
import type { ColorValue, StyleProp, ViewProps, ViewStyle } from 'react-native';
import type { LordIconLoadError } from './errors';
import type { MotionMode } from './motion';
import type { CompleteDetail } from './player/events';
import type { Player } from './player/player';
import type { TriggerName } from './triggers/builtin';
import { parseColor } from './player/color';

/**
 * What a ref to `<LordIcon>` gives: the icon's player, with the API of `@lordicon/web`'s
 * `Player`, less what only the component drives (`attach`, `complete`, `destroy`). Spelled
 * out, as a mapped type would lose the setters that take `null`.
 */
export interface LordIconHandle {
    play: Player['play'];
    pause: Player['pause'];
    stop: Player['stop'];
    seek: Player['seek'];
    readonly playing: boolean;
    progress: number;
    readonly frame: number;
    get state(): string | null;
    set state(name: string | null);
    readonly currentState: IconState | null;
    readonly states: IconState[];
    get segment(): Segment;
    set segment(segment: Segment | null);
    readonly frameCount: number;
    readonly frameRate: number;
    readonly duration: number;
    direction: 1 | -1;
    speed: number;
    loop: boolean;
    get tint(): string | null;
    set tint(color: string | null);
    get colors(): ColorMap;
    set colors(colors: ColorMap | null);
    readonly defaultColors: Readonly<ColorMap>;
    get stroke(): Stroke | null;
    set stroke(stroke: Stroke | null);
    properties: IconProperties;
    readonly ready: boolean;
    readonly readyPromise: Promise<boolean>;
    addEventListener: Player['addEventListener'];
    removeEventListener: Player['removeEventListener'];
    on: Player['on'];
}

export interface LordIconProps extends Pick<
    ViewProps,
    'testID' | 'accessible' | 'accessibilityLabel' | 'accessibilityRole' | 'pointerEvents'
> {
    /** The icon's Lottie JSON: `require('./lock.json')`. */
    icon: object;
    /** The state to play and rest on; the icon's default state when left out, `'*'` the whole file. */
    state?: string;
    /**
     * What plays the icon, as on the web: `hover`, `click`, `loop(1000)`, `morph(0.6)`,
     * `follow(busy=loop-cycle, done=morph-check)`, `sequence(play in-reveal, wait 500)`, or the
     * name of one of `defineTrigger()`. `hover`, `click`, `morph`, `boomerang` and
     * `loop-on-hover` play with a `LordIcon.Target` around the icon; on a touch screen they play
     * on a tap.
     */
    trigger?: TriggerName | (string & {});
    /**
     * A state of the app the icon follows (`follow`, the trigger when there is none): a
     * boolean (selected, on, busy: morphs, loops while true, or plays once when it turns true),
     * a number (a count: an entrance, then nudges) or a string (with a map in `trigger`).
     */
    value?: boolean | number | string | null;
    /**
     * In a list that recycles its rows (FlashList, LegendList): the item's key. A new one is
     * another icon: it shows its `value` without animating, and its trigger starts over.
     */
    recyclingKey?: string | number;
    /** Colours by name: `{ primary: '#ff5a36', secondary: 'teal' }`. */
    colors?: ColorMap;
    /**
     * The whole icon in one colour, like a tinted image or `currentColor` on the web. A colour
     * value, as a tab bar gives it; `PlatformColor` and `DynamicColorIOS` are not read.
     */
    color?: ColorValue;
    stroke?: Stroke;
    /** Playback speed, 1 by default. */
    speed?: number;
    /** Width and height, 32 by default. */
    size?: number;
    /**
     * A state to play once when the icon comes into view, before the trigger: `in-reveal`,
     * `in-reveal, delay=300`; an empty string plays the icon's first `in-*` state.
     */
    intro?: string;
    /** `always` animates this icon even when the viewer asked for less motion. */
    motion?: MotionMode;
    style?: StyleProp<ViewStyle>;
    ref?: Ref<LordIconHandle>;
    /** Shows until the icon is ready: a still of it, say. */
    children?: ReactNode;
    onReady?: () => void;
    /** A segment played to its end: which, which way, of which state. */
    onComplete?: (detail: CompleteDetail) => void;
    /** The icon could not be loaded: why, with `kind` `icon`, `wasm` or `worker`. */
    onError?: (error: LordIconLoadError) => void;
}

/**
 * Accessibility: an icon is decoration, skipped by screen readers, until it has a label; then
 * it is an image with it.
 */
export function accessibilityOf(
    props: LordIconProps,
): Pick<ViewProps, 'accessible' | 'accessibilityLabel' | 'accessibilityRole'> {
    const { accessible, accessibilityLabel, accessibilityRole } = props;
    return {
        accessible: accessible ?? Boolean(accessibilityLabel),
        accessibilityLabel,
        accessibilityRole: accessibilityRole ?? (accessibilityLabel ? 'image' : undefined),
    };
}

/**
 * The icon as JSON text. Called once per icon in use, by the registry (src/registry.ts). A file
 * narrowed to one state is widened to all its states by the runtime (0.2).
 */
export function sourceOf(icon: object): string {
    return JSON.stringify(icon);
}

export function iconData(icon: object): IconData {
    return icon as IconData;
}

// Outside the components: the player is a mutable object, which React's rules keep out of render.
export function setState(player: Player, state: string | undefined): void {
    player.state = state ?? null;
}

export function setSpeed(player: Player, speed: number | undefined): void {
    player.speed = speed ?? 1;
}

/**
 * The `color` as text. Native colour objects (`PlatformColor`, `DynamicColorIOS`) cannot be read
 * from JavaScript: left out, with a warning in development.
 */
export function colorText(color: ColorValue | undefined): string | undefined {
    if (color === undefined || typeof color === 'string') return color;
    if ((globalThis as { __DEV__?: boolean }).__DEV__ !== false) {
        console.warn(
            '@lordicon/react-native: color takes a colour string; PlatformColor and ' +
                'DynamicColorIOS are not read, the icon keeps its own colours.',
        );
    }
    return undefined;
}

/**
 * The opacity a `color` with alpha (`rgba(…, 0.5)`, as tab bars give) asks for: the tint is one
 * colour for the whole icon, so its alpha is the icon's opacity. Undefined when opaque.
 */
export function tintOpacity(color: string | undefined): number | undefined {
    const alpha = color === undefined ? 1 : (parseColor(color)?.alpha ?? 1);
    return alpha < 1 ? alpha : undefined;
}

/** Colours, stroke and tint from the props; what is left out goes back to the icon's own. */
export function setLooks(
    player: Player,
    colors: ColorMap | undefined,
    stroke: Stroke | undefined,
    color?: string,
): void {
    player.colors = colors ?? null;
    player.stroke = stroke ?? null;
    player.tint = color ?? null;
}
