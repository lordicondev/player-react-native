import { BaseTrigger, Presence } from './base';
import type { TriggerContext } from './types';

/**
 * Plays the animation once when a pointer enters the target, when keyboard focus lands on it,
 * or, on a touch screen, when it is tapped. A second arrival during the animation is ignored.
 * Under reduced motion nothing plays.
 */
export class Hover extends BaseTrigger {
    static readonly interactive = true;

    constructor(context: TriggerContext) {
        super(context);
        const presence = new Presence((type, listener) => this.on(type, listener));
        this.on('enter', () => this.play());
        this.on('focus', () => this.play());
        this.on('press', () => {
            if (!presence.present) this.play();
        });
    }

    private play(): void {
        if (!this.player.ready || this.player.playing || this.reducedMotion) return;
        void this.player.play({ from: 'start' });
    }
}
