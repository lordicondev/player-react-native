import { BaseTrigger } from './base';
import type { TriggerContext } from './types';

/**
 * Plays the animation from the start on every press of the target: a tap, a click, Enter or
 * Space, a screen reader's activation. A press during the animation starts it again. Under
 * reduced motion nothing plays.
 */
export class Click extends BaseTrigger {
    static readonly interactive = true;

    constructor(context: TriggerContext) {
        super(context);
        this.on('press', () => this.play());
    }

    private play(): void {
        if (!this.player.ready || this.reducedMotion) return;
        void this.player.play({ from: 'start' });
    }
}
