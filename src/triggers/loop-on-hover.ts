import { BaseTrigger, Presence } from './base';
import type { TriggerContext } from './types';

/**
 * Loops the animation while a pointer is over the target or it has keyboard focus; the round in
 * progress finishes after it leaves. On a touch screen a tap plays one round.
 * `loop-on-hover(500)` pauses between rounds. Under reduced motion nothing plays.
 */
export class LoopOnHover extends BaseTrigger {
    static readonly primary = 'delay';
    static readonly interactive = true;

    #presence: Presence;

    constructor(context: TriggerContext) {
        super(context);
        this.#presence = new Presence((type, listener) => this.on(type, listener));
        this.on('enter', () => this.start());
        this.on('focus', () => this.start());
        this.on('leave', () => this.stop());
        this.on('blur', () => this.stop());
        this.on('press', () => {
            if (!this.#presence.present) this.round();
        });
        this.signal.addEventListener(
            'abort',
            () => {
                this.player.loop = false;
                this.player.rest = 0;
            },
            { once: true },
        );
    }

    /** Over and over: the renderer loops and rests between rounds. */
    private start(): void {
        if (!this.player.ready || this.reducedMotion) return;
        this.player.rest = Math.max(this.number('delay', 0), 0) / 1000;
        this.player.loop = true;
        if (!this.player.playing) void this.player.play({ from: 'start' });
    }

    /** The round in progress (or the rest after it) is the last. */
    private stop(): void {
        if (this.#presence.present) return;
        this.player.loop = false;
    }

    private round(): void {
        if (!this.player.ready || this.reducedMotion || this.player.playing) return;
        this.player.loop = false;
        void this.player.play({ from: 'start' });
    }
}
