import type { Command, SignalType, Signals, Trigger, TriggerContext, TriggerPlayer } from './types';

/**
 * What a trigger starts from. Set up in the constructor; everything registered through `on`
 * and `timeout` stops when the trigger is torn down.
 *
 *     class Wobble extends BaseTrigger {
 *         constructor(context: TriggerContext) {
 *             super(context);
 *             this.on('press', () => this.player.play({ from: 'start' }));
 *         }
 *     }
 *     defineTrigger('wobble', Wobble);
 *
 * From @lordicon/element (player-element 3.0.2, commit 25ed0ab): signals in place of DOM
 * listeners and attribute watching; the timeouts that wait with a paused icon are the same.
 */
export abstract class BaseTrigger implements Trigger {
    // Declared here so every subclass is a Trigger for TypeScript, even with no hooks.
    onReady?(): void;
    onComplete?(): void;
    onState?(): void;

    protected player: TriggerPlayer;
    protected signals: Signals;
    protected signal: AbortSignal;
    protected options: Record<string, string>;
    protected reducedMotion: boolean;
    #context: TriggerContext;

    /** Timeouts not yet run. */
    #timers = new Set<Timer>();
    /** Set by the ref's `pause()` while a timeout waited; they wait with the player. */
    #frozen = false;

    constructor(context: TriggerContext) {
        this.player = context.player;
        this.signals = context.signals;
        this.signal = context.signal;
        this.options = context.options;
        this.reducedMotion = context.reducedMotion;
        this.#context = context;

        // One handler for every timeout: one per timeout would pile up on a looping icon.
        this.signal.addEventListener(
            'abort',
            () => {
                for (const timer of this.#timers) if (timer.id !== null) clearTimeout(timer.id);
                this.#timers.clear();
            },
            { once: true },
        );
    }

    /** An option from the `trigger` prop, or the fallback. */
    protected option(name: string): string | undefined;
    protected option(name: string, fallback: string): string;
    protected option(name: string, fallback?: string): string | undefined {
        return this.options[name] ?? fallback;
    }

    /** A numeric option, or the fallback when missing or not a number. */
    protected number(name: string, fallback: number): number {
        const value = Number(this.options[name]);
        return Number.isFinite(value) ? value : fallback;
    }

    /** The `ratio` option, where a morph splits; undefined when missing or not a number. */
    protected ratio(): number | undefined {
        const value = Number(this.options.ratio);
        return this.options.ratio && Number.isFinite(value) ? value : undefined;
    }

    /** Listens to a signal until teardown. */
    protected on(type: SignalType, listener: () => void): void {
        const off = this.signals.on(type, () => {
            if (!this.signal.aborted) listener();
        });
        this.signal.addEventListener('abort', off, { once: true });
    }

    /** The `value` prop as text; null without one. */
    protected value(): string | null {
        return this.#context.value();
    }

    /** The component's own `state` prop: the state to rest on. */
    protected ownState(): string | null {
        return this.#context.ownState();
    }

    /** Asks the view to report `visible`, once half of the icon shows. */
    protected watchVisibility(): void {
        this.#context.visibility();
    }

    /**
     * A timeout that is cleared at teardown. Returns a function that cancels it early. The ref's
     * `pause()` holds it and `play()` lets it run out, so a paused icon stays paused through a
     * delay.
     */
    protected timeout(callback: () => void, ms: number): () => void {
        const timer: Timer = { callback, remaining: ms, started: 0, id: null };
        this.#timers.add(timer);
        if (!this.#frozen) this.#start(timer);

        return () => {
            if (timer.id !== null) clearTimeout(timer.id);
            this.#timers.delete(timer);
        };
    }

    /**
     * Holds the timeouts on the ref's `pause()`, and lets them go on `play()`; `play()` then goes
     * no further, so the player does not start over the look it waits on. Any other command lets
     * them go too, and goes on to the player. A trigger with commands of its own replaces this.
     */
    onCommand(command: Command): boolean | Promise<boolean> | void {
        if (command.name === 'pause') {
            if (this.#timers.size && !this.#frozen) this.#freeze();
            return;
        }

        if (!this.#frozen) return;
        this.#thaw();
        const bare =
            command.name === 'play' && Object.values(command.options).every((v) => v === undefined);
        if (bare) return true;
    }

    #start(timer: Timer): void {
        timer.started = Date.now();
        timer.id = setTimeout(() => {
            this.#timers.delete(timer);
            timer.callback();
        }, timer.remaining);
    }

    #freeze(): void {
        this.#frozen = true;
        const now = Date.now();
        for (const timer of this.#timers) {
            if (timer.id === null) continue;
            clearTimeout(timer.id);
            timer.id = null;
            timer.remaining = Math.max(timer.remaining - (now - timer.started), 0);
        }
    }

    #thaw(): void {
        this.#frozen = false;
        for (const timer of this.#timers) this.#start(timer);
    }
}

type Timer = {
    callback: () => void;
    /** Milliseconds left when it last started. */
    remaining: number;
    started: number;
    id: ReturnType<typeof setTimeout> | null;
};

/**
 * Whether a pointer or keyboard focus is on the target: hover-like triggers play on `enter` and
 * `focus`, and take a `press` (a tap) for them only when neither came first, so a click on a
 * hovered target, or Enter on a focused one, does not play twice.
 */
export class Presence {
    #over = false;
    #focused = false;

    /** Tracks `enter`/`leave` and `focus`/`blur` of a trigger; `on` is its `on()`. */
    constructor(on: (type: SignalType, listener: () => void) => void) {
        on('enter', () => (this.#over = true));
        on('leave', () => (this.#over = false));
        on('focus', () => (this.#focused = true));
        on('blur', () => (this.#focused = false));
    }

    /** A pointer is over the target, or it has keyboard focus. */
    get present(): boolean {
        return this.#over || this.#focused;
    }
}
