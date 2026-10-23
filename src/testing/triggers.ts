// Test helpers of the triggers, after @lordicon/element's (player-element 3.0.2, commit
// 25ed0ab, src/testing): a stand-in player that records what triggers ask of it, and a trigger
// context with signals, a value and the component's own state.
import type { IconState, Segment } from '@lordicon/utils-lottie';
import type { PlayOptions } from '../player/player';
import type { SignalType, Trigger, TriggerContext, TriggerPlayer } from '../triggers/types';

/**
 * What a trigger asked the player to do, in the order it asked. `play:segment` is
 * `play({ segment })`, `seek:end` is `seek('end')`, `segment` is setting `player.segment`.
 */
export type PlayerCall =
    | 'play'
    | 'play:start'
    | 'play:state'
    | 'play:segment'
    | 'play:reverse'
    | 'pause'
    | 'stop'
    | 'seek'
    | 'seek:start'
    | 'seek:end'
    | 'segment';

/**
 * A stand-in for the player. Records the calls made to it; `play()` resolves `true` on the next
 * `complete()`, `false` when another play takes over. `playing` is the test's to set, except
 * that `complete()` clears it.
 */
export interface StubPlayer extends TriggerPlayer {
    calls: PlayerCall[];
    ready: boolean;
    playing: boolean;
    state: string | null;
    states: IconState[];
    loop: boolean;
    rest: number;
    /** The segment last loaded through `segment` or `play({ segment })`; null for `segment = null`. */
    lastSegment: Segment | null;
    /** The end of a segment: settles the pending play with `true`. */
    complete(): void;
}

export interface StubOptions {
    states?: IconState[];
    state?: string | null;
}

export function playerStub(options: StubOptions = {}): StubPlayer {
    const calls: PlayerCall[] = [];
    let pending: ((completed: boolean) => void) | null = null;
    const settle = (completed: boolean) => {
        pending?.(completed);
        pending = null;
    };

    const stub = {
        calls,
        ready: false,
        playing: false,
        direction: 1 as 1 | -1,
        speed: 1,
        loop: false,
        rest: 0,
        frame: 0,
        lastSegment: null as Segment | null,
        state: options.state ?? null,
        states: options.states ?? [],
        get currentState(): IconState | null {
            return stub.states.find((state) => state.name === stub.state) ?? null;
        },
        play: (play: PlayOptions = {}) => {
            const { state, segment, from, reverse } = play;
            const fresh =
                state !== undefined ||
                segment !== undefined ||
                from !== undefined ||
                reverse !== undefined;

            if (state !== undefined) {
                stub.state = state;
                calls.push('play:state');
            } else if (segment) {
                stub.lastSegment = segment;
                calls.push('play:segment');
            } else if (reverse) {
                calls.push('play:reverse');
            } else if (from) {
                calls.push('play:start');
            } else {
                calls.push('play');
            }

            if (fresh) {
                settle(false);
                stub.direction = reverse ? -1 : 1;
            }

            return new Promise<boolean>((resolve) => {
                const previous = pending;
                pending = (completed) => {
                    previous?.(completed);
                    resolve(completed);
                };
            });
        },
        pause: () => void calls.push('pause'),
        stop: () => {
            settle(false);
            calls.push('stop');
        },
        seek: (frame: number | 'start' | 'end') => {
            calls.push(frame === 'start' ? 'seek:start' : frame === 'end' ? 'seek:end' : 'seek');
        },
        get segment(): Segment {
            return stub.lastSegment ?? [0, 0];
        },
        set segment(segment: Segment | null) {
            settle(false);
            stub.lastSegment = segment;
            stub.direction = 1;
            calls.push('segment');
        },
        complete: () => {
            stub.playing = false;
            settle(true);
        },
    };

    return stub as unknown as StubPlayer;
}

/** One morph state shaped like the real ones: a 0.5 ratio splitting 60 frames. */
export function morphState(name = 'morph-close'): IconState[] {
    return [{ name, time: 0, duration: 60, params: ['0.5'], default: false }] as IconState[];
}

export type ContextOptions = StubOptions & {
    options?: Record<string, string>;
    reducedMotion?: boolean;
    /** The `value` prop, as text. */
    value?: string | null;
    /** The component's own `state` prop; the player's state by default. */
    ownState?: string | null;
};

/** A trigger context around a stub player, and what a test does to it. */
export function makeContext(options: ContextOptions = {}) {
    const player = playerStub(options);
    const controller = new AbortController();
    const listeners = new Map<SignalType, Set<() => void>>();
    let value = options.value ?? null;
    let visibilityAsked = 0;
    let ownState = options.ownState !== undefined ? options.ownState : (options.state ?? null);

    const context: TriggerContext = {
        player,
        signals: {
            on(type, listener) {
                const set = listeners.get(type) ?? new Set();
                set.add(listener);
                listeners.set(type, set);
                return () => set.delete(listener);
            },
        },
        value: () => value,
        ownState: () => ownState,
        visibility: () => void visibilityAsked++,
        signal: controller.signal,
        options: options.options ?? {},
        reducedMotion: options.reducedMotion ?? false,
    };

    /** A signal, as the target, the view or the value prop sends it. */
    const emit = (type: SignalType) => {
        for (const listener of [...(listeners.get(type) ?? [])]) listener();
    };

    /** The `value` prop changes. */
    const setValue = (next: string | null) => {
        value = next;
        emit('value');
    };

    /** Marks the player ready and calls the trigger's onReady. */
    const ready = (trigger: Trigger) => {
        player.ready = true;
        trigger.onReady?.();
    };

    /** The segment ends, as the renderer reports: the player settles, then the trigger hears. */
    const complete = (trigger: Trigger) => {
        player.complete();
        trigger.onComplete?.();
    };

    /** The component's `state` prop changes (a trigger hears it from `onState`). */
    const setOwnState = (state: string | null) => {
        ownState = state;
    };

    /** Signal listeners left, by type: none once torn down. */
    const listening = (type: SignalType) => listeners.get(type)?.size ?? 0;

    return {
        context,
        player,
        controller,
        emit,
        setValue,
        setOwnState,
        ready,
        complete,
        listening,
        visibilityAsked: () => visibilityAsked,
    };
}
