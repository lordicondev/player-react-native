import { BaseTrigger } from './base';
import type { TriggerContext } from './types';

/**
 * Plays the animation over and over. `loop(1000)` pauses between rounds. The renderer loops and
 * rests on its own, so the loop needs nothing from JavaScript. Under reduced motion the icon
 * stays on its first frame.
 */
export class Loop extends BaseTrigger {
    static readonly primary = 'delay';

    constructor(context: TriggerContext) {
        super(context);
        this.signal.addEventListener(
            'abort',
            () => {
                this.player.loop = false;
                this.player.rest = 0;
            },
            { once: true },
        );
    }

    onReady(): void {
        if (this.reducedMotion) return;
        this.player.rest = Math.max(this.number('delay', 0), 0) / 1000;
        this.player.loop = true;
        void this.player.play({ from: 'start' });
    }
}
