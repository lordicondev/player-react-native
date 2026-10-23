import { BaseTrigger, Presence } from './base';
import { Morpher } from './morpher';
import type { TriggerContext } from './types';

/**
 * Plays the animation there and straight back when a pointer enters the target, keyboard focus
 * lands on it, or it is tapped. With a morph state that is the whole state in one go; without
 * one, forwards and then in reverse. `boomerang(0.6)` overrides the marker's split. An arrival
 * mid-flight is ignored. Under reduced motion nothing plays.
 */
export class Boomerang extends BaseTrigger {
    static readonly primary = 'ratio';
    static readonly interactive = true;

    #morpher: Morpher;

    constructor(context: TriggerContext) {
        super(context);
        this.#morpher = new Morpher(this.player, this.ratio());
        const presence = new Presence((type, listener) => this.on(type, listener));
        this.on('enter', () => this.go());
        this.on('focus', () => this.go());
        this.on('press', () => {
            if (!presence.present) this.go();
        });
        this.signal.addEventListener('abort', () => this.#morpher.restore(), { once: true });
    }

    onReady(): void {
        this.#morpher.start(false);
    }

    onComplete(): void {
        this.#morpher.complete();
    }

    private go(): void {
        if (!this.player.ready || this.reducedMotion) return;
        this.#morpher.roundTrip();
    }
}
