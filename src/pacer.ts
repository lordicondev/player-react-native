/**
 * Paces one icon's frames to a limit on a faster display: `frameRate: 60` on a 120 Hz screen
 * ticks the icon every other display frame, on a 90 Hz one two frames in three. Time is never
 * lost: a tick gets all the time since the last one.
 *
 * The same logic runs natively (Pacer in android/…/Pacer.kt and ios/LordIconView.mm): keep them
 * alike.
 */
export class Pacer {
    #interval = 0;
    #budget = 0;
    #elapsed = 0;

    /** Frames per second at most; 0 for every display frame. */
    constructor(limit = 0) {
        this.limit = limit;
    }

    set limit(limit: number) {
        this.#interval = limit > 0 ? 1 / limit : 0;
    }

    /** The icon starts needing frames again: its first display frame ticks. */
    reset(): void {
        this.#budget = this.#interval;
        this.#elapsed = 0;
    }

    /**
     * One display frame, `dt` seconds after the last: the seconds to tick the icon by, or -1
     * to skip this frame. A frame due within a tenth of the interval ticks (display frames
     * jitter); what is left over counts towards the next. In a steady rhythm that is less than
     * a display frame; more is left from waiting, and dropped so the next tick does not follow
     * at once.
     */
    frame(dt: number): number {
        this.wait(dt);
        if (this.#interval && this.#budget < this.#interval * 0.9) return -1;
        this.#budget -= this.#interval;
        if (this.#budget > dt) this.#budget = 0;
        const elapsed = this.#elapsed;
        this.#elapsed = 0;
        return elapsed;
    }

    /** A display frame the icon cannot take (its render thread is busy): the time adds up. */
    wait(dt: number): void {
        this.#elapsed += dt;
        this.#budget += dt;
    }
}
