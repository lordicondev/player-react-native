import type { Icon, Model, Runtime } from '@lordicon/runtime';

/** An icon's source on the web: its JSON, and the number runtimes know it by. */
export interface WebSource {
    id: number;
    json: string;
}

/**
 * The models of one runtime (the page's, or a render worker's): icons of one source share one,
 * parsed once, each with its own playback and look. A model stays while its icons do, or while
 * its source is registered: the registry keeps icons no view shows in a cache (src/registry.ts).
 */
export class Models {
    readonly #runtime: Runtime;
    readonly #entries = new Map<number, { model: Model; icons: number; registered: boolean }>();

    constructor(runtime: Runtime) {
        this.#runtime = runtime;
    }

    /** A new icon of the source. Throws when the JSON is not an icon. */
    icon(source: number, json: string): Icon {
        let entry = this.#entries.get(source);
        if (!entry) {
            entry = { model: this.#runtime.model(json), icons: 0, registered: true };
            this.#entries.set(source, entry);
        }
        entry.icons++;
        return entry.model.icon();
    }

    /** Destroys an icon the source gave. */
    release(source: number, icon: Icon): void {
        icon.destroy();
        const entry = this.#entries.get(source);
        if (entry && --entry.icons === 0 && !entry.registered) this.#free(source);
    }

    /** The registry let go of the source: its model goes with its last icon. */
    forget(source: number): void {
        const entry = this.#entries.get(source);
        if (!entry) return;
        entry.registered = false;
        if (entry.icons === 0) this.#free(source);
    }

    /** Models kept. */
    get size(): number {
        return this.#entries.size;
    }

    #free(source: number): void {
        this.#entries.get(source)?.model.destroy();
        this.#entries.delete(source);
    }
}
