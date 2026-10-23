import { BaseTrigger, Presence } from './base';
import { Morpher } from './morpher';
import type { TriggerContext } from './types';

/**
 * Morphs to the second look while a pointer is over the target (or it has keyboard focus), and
 * back when it leaves. On a touch screen a tap goes there and back. The split point comes from
 * the morph marker (`morph-close:0.5`) or `morph(0.6)`. Under reduced motion the icon jumps
 * between the two looks, and a tap does nothing.
 */
export class Morph extends BaseTrigger {
    static readonly primary = 'ratio';
    static readonly interactive = true;

    #morpher: Morpher;
    #presence: Presence;

    constructor(context: TriggerContext) {
        super(context);
        this.#morpher = new Morpher(this.player, this.ratio());
        this.#presence = new Presence((type, listener) => this.on(type, listener));
        this.on('enter', () => this.set());
        this.on('leave', () => this.set());
        this.on('focus', () => this.set());
        this.on('blur', () => this.set());
        this.on('press', () => {
            if (this.#presence.present || !this.player.ready || this.reducedMotion) return;
            this.#morpher.roundTrip();
        });
        this.signal.addEventListener('abort', () => this.#morpher.restore(), { once: true });
    }

    onReady(): void {
        this.#morpher.start(this.#presence.present);
    }

    onComplete(): void {
        this.#morpher.complete();
    }

    private set(): void {
        const over = this.#presence.present;
        if (!this.player.ready || this.#morpher.showing === over) return;

        if (this.reducedMotion) this.#morpher.jump(over);
        else this.#morpher.animate(over);
    }
}
