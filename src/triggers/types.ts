// Triggers: what plays the icon. Ported from @lordicon/element (player-element 3.0.2,
// src/triggers, commit 25ed0ab); where they listened to DOM events and attributes, they listen
// to signals here (docs/m4-triggery.md).
import type { Segment } from '@lordicon/utils-lottie';
import type { Player, PlayOptions } from '../player/player';

/**
 * What a trigger may use of the player. `segment` spelled out: a picked accessor would lose its
 * setter's `null`.
 */
export interface TriggerPlayer extends Pick<
    Player,
    | 'play'
    | 'pause'
    | 'stop'
    | 'seek'
    | 'ready'
    | 'playing'
    | 'state'
    | 'currentState'
    | 'states'
    | 'direction'
    | 'speed'
    | 'loop'
    | 'rest'
    | 'frame'
> {
    get segment(): Segment;
    set segment(segment: Segment | null);
}

/**
 * What happens around the icon. `enter`/`leave`: a pointer over its target (hover); `press`:
 * the target tapped, clicked or activated (keyboard, screen reader); `focus`/`blur`: keyboard
 * focus (web: only from the keyboard); `visible`: half of the icon came into view (once asked
 * with `visibility()`); `value`: the `value` prop changed.
 */
export type SignalType = 'enter' | 'leave' | 'press' | 'focus' | 'blur' | 'visible' | 'value';

export interface Signals {
    /** Calls `listener` on every signal of the type; returns its removal. */
    on(type: SignalType, listener: () => void): () => void;
}

/** What a trigger is given when the component creates it. */
export interface TriggerContext {
    /** The player. Ready by the time `onReady` is called. */
    player: TriggerPlayer;
    /** Signals of the icon's target (`LordIcon.Target`), its view and its `value`. */
    signals: Signals;
    /** The `value` prop as text (`'true'`, `'3'`, `'busy'`); null without one. */
    value(): string | null;
    /** The component's own `state` prop: the state to rest on. */
    ownState(): string | null;
    /** Asks the view to report `visible` (once, when half of the icon shows). */
    visibility(): void;
    /** Aborted when the trigger is torn down. */
    signal: AbortSignal;
    /** Options from the `trigger` prop: `loop(delay=1000)` and `loop(1000)` give `{ delay: '1000' }`. */
    options: Record<string, string>;
    /** True when the viewer asked for less motion and the icon respects that. */
    reducedMotion: boolean;
}

/** Hooks the component calls on a trigger. All optional. */
export interface Trigger {
    /** The player is ready. Read the value and state here. */
    onReady?(): void;
    /** The player finished the current segment. */
    onComplete?(): void;
    /** The component's `state` prop changed. */
    onState?(): void;
    /**
     * A playback method was called on the ref. Return `true` (for `play`, or a promise of what
     * `play()` resolves with) to take the command over and leave the player alone. Return
     * nothing to let it through: the player runs it, and a trigger that drives the player itself
     * should step back.
     */
    onCommand?(command: Command): boolean | Promise<boolean> | void;
}

/** A playback method called on the ref, as `onCommand` gets it. */
export type Command =
    | { name: 'play'; options: PlayOptions }
    | { name: 'pause' }
    | { name: 'stop' }
    | { name: 'seek'; frame: number | 'start' | 'end' };

export interface TriggerConstructor {
    new (context: TriggerContext): Trigger;
    /** The option a value without a name fills: `loop(1000)` sets `delay`. */
    readonly primary?: string;
    /** The signals of a target it needs: without a `LordIcon.Target`, a warning in development. */
    readonly interactive?: boolean;
}
