import { splitSegment, type Segment } from '@lordicon/utils-lottie';
import type { TriggerPlayer } from './types';

/**
 * Moves an icon between its two looks. With a morph state the first half goes to the second
 * look and the second half comes back; without one the whole animation plays forwards and
 * backwards. A change that lands mid-animation reverses it in place.
 *
 * Shared by the `morph` and `follow` triggers, which decide *when* to move. From
 * @lordicon/element (player-element 3.0.2, commit 25ed0ab); `roundTrip()` is new.
 */
export class Morpher {
    #player: TriggerPlayer;
    #ratio: number | undefined;
    #segments: [Segment, Segment] | null = null;

    /** The look on screen. Null until `start()`. */
    #showing: boolean | null = null;

    /** The look the loaded segment ends on when played forwards. */
    #endsOn: boolean | null = null;

    /** True while an animation this morpher started is still playing. */
    #steering = false;

    /** A round trip without halves: going there (back once it completes), coming back, or not. */
    #trip: 'there' | 'back' | null = null;

    constructor(player: TriggerPlayer, ratio?: number) {
        this.#player = player;
        this.#ratio = ratio;
    }

    get showing(): boolean | null {
        return this.#showing;
    }

    /** Reads the player's state and shows a look without animating. Call once the player is ready. */
    start(on: boolean): void {
        const state = this.#player.currentState;
        this.#segments = state ? splitSegment(state, this.#ratio) : null;
        this.jump(on);
    }

    /** Shows a look without animating. */
    jump(on: boolean): void {
        const player = this.#player;
        this.#steering = false;
        this.#trip = null;

        if (this.#segments) {
            player.segment = on ? this.#segments[0] : this.#segments[1];
            this.#endsOn = on;
            player.seek('end');
        } else {
            player.direction = 1;
            player.seek(on ? 'end' : 'start');
        }

        this.#showing = on;
    }

    /** Animates to a look. */
    animate(on: boolean): void {
        const player = this.#player;
        this.#trip = null;

        if (!this.#segments) {
            // The whole animation is the transition: forwards to get there, backwards to undo.
            player.direction = on ? 1 : -1;
            player.play();
        } else if (player.playing && this.#steering) {
            // Interrupted mid-morph. Loading the other half would jump to its first frame, so
            // turn the loaded half around instead; both halves meet at the boundary, so
            // either one reaches either look.
            player.direction = this.#endsOn === on ? 1 : -1;
            player.play();
        } else {
            player.play({ segment: on ? this.#segments[0] : this.#segments[1] });
            this.#endsOn = on;
        }

        this.#steering = true;
        this.#showing = on;
    }

    /**
     * To the second look and back, from the first (a tap on a touch screen). With a morph state
     * its two halves meet, so one play of the whole state does it, on the render thread; without
     * one, forwards now and backwards from `complete()`. False when it cannot start now (it
     * plays already).
     */
    roundTrip(): boolean {
        const player = this.#player;
        if (player.playing || this.#showing !== false) return false;
        if (this.#segments) {
            void player.play({ segment: [this.#segments[0][0], this.#segments[1][1]] });
            this.#endsOn = false;
        } else {
            player.direction = 1;
            void player.play({ from: 'start' });
            this.#trip = 'there';
        }
        this.#steering = true;
        return true;
    }

    /** Call from the trigger's `onComplete`. */
    complete(): void {
        if (this.#trip === 'there') {
            // The round trip of a state without halves: now backwards, from where it ended.
            this.#trip = 'back';
            this.#player.direction = -1;
            void this.#player.play();
            return;
        }
        if (this.#trip === 'back') {
            this.#trip = null;
            this.#player.direction = 1;
        }
        this.#steering = false;
    }

    /** Puts the player back on its whole state, forwards. Call at teardown. */
    restore(): void {
        this.#player.segment = null;
    }
}
