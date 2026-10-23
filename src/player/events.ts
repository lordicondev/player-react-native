import type { Segment } from '@lordicon/utils-lottie';

/** What finished: the segment, which way it played, and the state it belongs to. */
export interface CompleteDetail {
    segment: Segment;
    direction: 1 | -1;
    state: string | null;
}

/** The player's events and what each carries in `detail`. */
export interface PlayerEventMap {
    /** The renderer has the icon: the player can play. */
    ready: undefined;
    /** A segment played to its end (or, backwards, to its start). */
    complete: CompleteDetail;
    /** Playback started or resumed. */
    play: undefined;
    /** Playback stopped: paused, stopped, sought, finished, or destroyed. */
    pause: undefined;
    /** Colours or stroke changed. */
    refresh: undefined;
    /** The player was destroyed. */
    destroy: undefined;
}

export type PlayerEventType = keyof PlayerEventMap;

/** An event as listeners get it: like a DOM event, its `type` and `detail`. */
export interface PlayerEvent<K extends PlayerEventType = PlayerEventType> {
    type: K;
    detail: PlayerEventMap[K];
}

export type PlayerListener<K extends PlayerEventType> = (event: PlayerEvent<K>) => void;

/** Listeners by event, in the order added; `once` ones go after their first call. */
export class Emitter {
    readonly #listeners = new Map<string, { listener: PlayerListener<never>; once: boolean }[]>();

    add<K extends PlayerEventType>(type: K, listener: PlayerListener<K>, once = false): void {
        const list = this.#listeners.get(type) ?? [];
        if (list.some((entry) => entry.listener === listener)) return;
        list.push({ listener: listener as PlayerListener<never>, once });
        this.#listeners.set(type, list);
    }

    remove<K extends PlayerEventType>(type: K, listener: PlayerListener<K>): void {
        const list = this.#listeners.get(type);
        if (!list) return;
        this.#listeners.set(
            type,
            list.filter((entry) => entry.listener !== listener),
        );
    }

    emit<K extends PlayerEventType>(type: K, detail: PlayerEventMap[K]): void {
        const list = this.#listeners.get(type);
        if (!list?.length) return;
        for (const entry of [...list]) {
            if (entry.once) this.remove(type, entry.listener as PlayerListener<K>);
            (entry.listener as PlayerListener<K>)({ type, detail });
        }
    }
}
