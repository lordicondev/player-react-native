import { useEffect, useReducer } from 'react';

/** Unused icons kept by default (`LordIconProvider cache`). */
export const CACHED_ICONS = 32;

/** What an icon becomes once registered: a native key, or the JSON text on the web. */
export interface RegistryBackend<T> {
    register(icon: object): T;
    release(value: T): void;
}

interface Entry<T> {
    value: T;
    /** Mounted icons using it. */
    users: number;
    timer: ReturnType<typeof setTimeout> | null;
}

/**
 * Icons in use, each registered once however many `<LordIcon>` show it: a list of 200 rows with
 * 12 icons holds 12. An icon stays while a mounted `<LordIcon>` uses it; `delay` ms after the
 * last one unmounts it goes into a cache of the `capacity` icons unused the longest ago (none by
 * default), and is released when it falls out of it. An app showing thousands of icons over time
 * holds those on screen and the cache. The delay covers a remount (StrictMode, a list row
 * scrolling back) and the time between a render and its commit.
 */
export class IconRegistry<T> {
    readonly #backend: RegistryBackend<T>;
    readonly #delay: number;
    readonly #entries = new Map<object, Entry<T>>();
    /** Unused icons kept, the one unused the longest ago first. */
    readonly #cache = new Map<object, Entry<T>>();
    #capacity: number;

    constructor(backend: RegistryBackend<T>, delay = 1000, capacity = 0) {
        this.#backend = backend;
        this.#delay = delay;
        this.#capacity = capacity;
    }

    /** Unused icons kept for showing again (`LordIconProvider cache`); 0 releases them. */
    get capacity(): number {
        return this.#capacity;
    }

    set capacity(icons: number) {
        this.#capacity = Math.max(0, Math.floor(icons) || 0);
        this.#trim();
    }

    /** Releases the cached icons (on a memory warning). */
    flush(): void {
        const capacity = this.#capacity;
        this.#capacity = 0;
        this.#trim();
        this.#capacity = capacity;
    }

    /** The icon's value, registered on first use. While unused, it is kept for `delay` ms. */
    get(icon: object): T {
        const entry = this.#entry(icon);
        if (!entry.users) {
            this.#cache.delete(icon);
            this.#releaseLater(icon, entry);
        }
        return entry.value;
    }

    /** One mounted user of the icon; returns the release, for an effect's cleanup. */
    retain(icon: object): () => void {
        const entry = this.#entry(icon);
        entry.users++;
        this.#cancel(entry);
        this.#cache.delete(icon);
        let retained = true;
        return () => {
            if (!retained) return;
            retained = false;
            if (--entry.users === 0 && this.#entries.get(icon) === entry) {
                this.#releaseLater(icon, entry);
            }
        };
    }

    /** Icons registered now. */
    get size(): number {
        return this.#entries.size;
    }

    #entry(icon: object): Entry<T> {
        let entry = this.#entries.get(icon);
        if (!entry) {
            entry = { value: this.#backend.register(icon), users: 0, timer: null };
            this.#entries.set(icon, entry);
        }
        return entry;
    }

    #releaseLater(icon: object, entry: Entry<T>): void {
        this.#cancel(entry);
        entry.timer = setTimeout(() => {
            entry.timer = null;
            if (entry.users || this.#entries.get(icon) !== entry) return;
            this.#cache.set(icon, entry);
            this.#trim();
        }, this.#delay);
    }

    /** Releases the icons unused the longest ago beyond the capacity. */
    #trim(): void {
        for (const [icon, entry] of this.#cache) {
            if (this.#cache.size <= this.#capacity) return;
            this.#cache.delete(icon);
            this.#entries.delete(icon);
            this.#backend.release(entry.value);
        }
    }

    #cancel(entry: Entry<T>): void {
        if (entry.timer !== null) clearTimeout(entry.timer);
        entry.timer = null;
    }
}

/**
 * The icon's registered value while the component is mounted. Should the entry be gone when
 * the component mounts (released between render and commit), it renders again with a new one.
 */
export function useRegisteredIcon<T>(registry: IconRegistry<T>, icon: object): T {
    const value = registry.get(icon);
    const [, rerender] = useReducer((n: number) => n + 1, 0);
    useEffect(() => {
        const release = registry.retain(icon);
        if (registry.get(icon) !== value) rerender();
        return release;
    }, [registry, icon, value]);
    return value;
}
