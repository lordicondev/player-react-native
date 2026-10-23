import { BaseTrigger } from '../base';
import type { TriggerContext } from '../types';
import { BooleanFollow } from './boolean';
import { CountFollow } from './count';
import { MapFollow } from './map';
import type { FollowContext, FollowStrategy } from './strategy';

/**
 * Follows the `value` prop; how the icon reacts depends on the value:
 *
 * - `true` / `false`: morph there and back with a `morph-*` state, loop while true with a
 *   `loop-*` state, or play once on true (`follow`, `follow(ratio=0.6)`)
 * - a number: an entrance when it leaves zero, a nudge when it goes up again
 * - a value map: a state per value, loops and morphs handled
 *   (`follow(busy=loop-cycle, done=morph-check)`)
 *
 * Any option besides `ratio` makes a map. Otherwise the value picks the mode: a number counts,
 * anything else is a boolean. With no value yet, the first one decides.
 *
 * From @lordicon/element (player-element 3.0.2, commit 25ed0ab), where it followed an
 * attribute of the target (`aria-pressed`); the value is the prop's, as text.
 */
export class Follow extends BaseTrigger {
    #strategy: FollowStrategy | null = null;
    /** No value at ready: boolean for now, until the first value says otherwise. */
    #undecided = false;

    constructor(context: TriggerContext) {
        super(context);
        this.on('value', () => this.change());
        this.signal.addEventListener('abort', () => this.#strategy?.restore(), { once: true });
    }

    private get context(): FollowContext {
        return {
            player: this.player,
            ownState: () => this.ownState(),
            reducedMotion: this.reducedMotion,
        };
    }

    onReady(): void {
        const { ratio: _ratio, ...map } = this.options;
        const value = this.value();

        if (Object.keys(map).length) {
            this.#strategy = new MapFollow(this.context, map, this.ratio());
        } else if (isNumber(value)) {
            this.#strategy = new CountFollow(this.context);
        } else {
            this.#strategy = new BooleanFollow(this.context, this.ratio());
            this.#undecided = !value?.trim();
        }

        this.#strategy.ready(value);
    }

    onComplete(): void {
        this.#strategy?.complete();
    }

    private change(): void {
        const value = this.value();

        if (this.#undecided && this.player.ready && value?.trim()) {
            this.#undecided = false;
            if (isNumber(value)) {
                this.#strategy?.restore();
                this.#strategy = new CountFollow(this.context);
                this.#strategy.ready('0');
            }
        }

        this.#strategy?.change(value);
    }
}

function isNumber(value: string | null): boolean {
    return value !== null && value.trim() !== '' && !Number.isNaN(Number(value));
}
