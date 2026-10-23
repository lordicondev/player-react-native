import { Morpher } from '../morpher';
import { isLoop, isMorph, type FollowContext, type FollowStrategy } from './strategy';

/**
 * A boolean, `"true"` or anything else. With a `morph-*` state the icon morphs to its second
 * look and back; with a `loop-*` state it loops while the value is true, finishing its round
 * after; with any other state it plays once when the value turns true.
 *
 * From @lordicon/element (player-element 3.0.2, commit 25ed0ab); the loop is new here (there a
 * loop state plays once), to go back there too.
 */
export class BooleanFollow implements FollowStrategy {
    #context: FollowContext;
    #morpher: Morpher | null;
    #loops: boolean;
    #on = false;

    constructor(context: FollowContext, ratio?: number) {
        this.#context = context;
        this.#morpher = isMorph(context.player.state) ? new Morpher(context.player, ratio) : null;
        this.#loops = isLoop(context.player.state);
    }

    ready(value: string | null): void {
        this.#on = value === 'true';
        this.#morpher?.start(this.#on);
        if (this.#loops && this.#on) this.loop();
    }

    change(value: string | null): void {
        const { player, reducedMotion } = this.#context;
        const on = value === 'true';
        if (!player.ready) return;

        if (this.#morpher) {
            if (this.#morpher.showing === on) return;
            if (reducedMotion) this.#morpher.jump(on);
            else this.#morpher.animate(on);
            return;
        }

        if (on === this.#on) return;
        this.#on = on;

        if (this.#loops) {
            // The renderer loops; off, the round in progress is the last.
            if (on) this.loop();
            else player.loop = false;
            return;
        }

        if (!on || player.playing) return;

        if (reducedMotion) player.seek('end');
        else void player.play({ from: 'start' });
    }

    complete(): void {
        this.#morpher?.complete();
    }

    restore(): void {
        this.#morpher?.restore();
        if (this.#loops) this.#context.player.loop = false;
    }

    /** Loops from the start, or on from where a round still plays. Not under reduced motion. */
    private loop(): void {
        const { player, reducedMotion } = this.#context;
        if (reducedMotion) return;
        player.loop = true;
        if (!player.playing) void player.play({ from: 'start' });
    }
}
