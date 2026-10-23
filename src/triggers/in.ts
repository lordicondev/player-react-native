import { BaseTrigger } from './base';

/**
 * Plays the animation once, when half of the icon has come into view. `in(300)` waits before
 * playing. Under reduced motion the icon shows its last frame.
 */
export class In extends BaseTrigger {
    static readonly primary = 'delay';

    #arrived = false;

    onReady(): void {
        this.on('visible', () => this.arrive());
        this.watchVisibility();
    }

    private arrive(): void {
        if (this.#arrived) return;
        this.#arrived = true;
        if (this.reducedMotion) {
            this.player.seek('end');
            return;
        }

        const delay = this.number('delay', 0);
        if (delay > 0) this.timeout(() => void this.player.play({ from: 'start' }), delay);
        else void this.player.play({ from: 'start' });
    }
}
