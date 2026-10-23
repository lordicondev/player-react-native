import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { IconRegistry } from './registry';

function setup() {
    let next = 0;
    const log: string[] = [];
    const registry = new IconRegistry<number>(
        {
            register: () => {
                log.push(`register ${++next}`);
                return next;
            },
            release: (key) => log.push(`release ${key}`),
        },
        1000,
    );
    return { registry, log };
}

describe('IconRegistry', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('registers an icon once for all its users', () => {
        const { registry, log } = setup();
        const lock = {};
        const releases = [registry.retain(lock), registry.retain(lock), registry.retain(lock)];
        expect(registry.get(lock)).toBe(1);
        expect(registry.get({})).toBe(2);
        expect(log).toEqual(['register 1', 'register 2']);
        releases.forEach((release) => release());
    });

    it('releases an icon after its last user, with a delay', () => {
        const { registry, log } = setup();
        const lock = {};
        const first = registry.retain(lock);
        const second = registry.retain(lock);
        first();
        vi.advanceTimersByTime(5000);
        expect(log).toEqual(['register 1']);

        second();
        vi.advanceTimersByTime(999);
        expect(registry.size).toBe(1);
        vi.advanceTimersByTime(1);
        expect(log).toEqual(['register 1', 'release 1']);
        expect(registry.size).toBe(0);
    });

    it('keeps an icon that is used again within the delay', () => {
        const { registry, log } = setup();
        const lock = {};
        registry.retain(lock)();
        vi.advanceTimersByTime(500);
        const release = registry.retain(lock);
        vi.advanceTimersByTime(5000);
        expect(registry.get(lock)).toBe(1);
        expect(log).toEqual(['register 1']);
        release();
    });

    it('registers again after a release', () => {
        const { registry, log } = setup();
        const lock = {};
        registry.retain(lock)();
        vi.advanceTimersByTime(1000);
        expect(registry.get(lock)).toBe(2);
        expect(log).toEqual(['register 1', 'release 1', 'register 2']);
    });

    it('releases an icon rendered but never mounted', () => {
        const { registry, log } = setup();
        registry.get({});
        vi.advanceTimersByTime(1000);
        expect(log).toEqual(['register 1', 'release 1']);
    });

    it('holds only the icons in use, however many were shown', () => {
        const { registry } = setup();
        for (let i = 0; i < 1000; i++) {
            registry.retain({})();
            vi.advanceTimersByTime(10);
        }
        const shown = registry.retain({});
        vi.advanceTimersByTime(1000);
        expect(registry.size).toBe(1);
        shown();
    });

    it('ignores a second call of the same release', () => {
        const { registry, log } = setup();
        const lock = {};
        const first = registry.retain(lock);
        const second = registry.retain(lock);
        first();
        first();
        vi.advanceTimersByTime(1000);
        expect(log).toEqual(['register 1']);
        second();
        vi.advanceTimersByTime(1000);
        expect(log).toEqual(['register 1', 'release 1']);
    });
});

describe('IconRegistry cache', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    function cached(capacity: number) {
        const { registry, log } = setup();
        registry.capacity = capacity;
        return { registry, log };
    }

    it('keeps unused icons up to its capacity, releasing the one unused the longest ago', () => {
        const { registry, log } = cached(2);
        const [a, b, c] = [{}, {}, {}];
        registry.retain(a)();
        vi.advanceTimersByTime(1000);
        registry.retain(b)();
        vi.advanceTimersByTime(1000);
        expect(log).toEqual(['register 1', 'register 2']);
        registry.retain(c)();
        vi.advanceTimersByTime(1000);
        expect(log).toEqual(['register 1', 'register 2', 'register 3', 'release 1']);
        expect(registry.size).toBe(2);
    });

    it('takes an icon used again out of the cache, without registering it again', () => {
        const { registry, log } = cached(1);
        const [a, b] = [{}, {}];
        registry.retain(a)();
        vi.advanceTimersByTime(1000);
        const release = registry.retain(a);
        registry.retain(b)();
        vi.advanceTimersByTime(1000);
        expect(log).toEqual(['register 1', 'register 2']);
        expect(registry.get(a)).toBe(1);
        release();
    });

    it('releases the cache on flush and when the capacity shrinks', () => {
        const { registry, log } = cached(3);
        const icons = [{}, {}, {}];
        for (const icon of icons) registry.retain(icon)();
        vi.advanceTimersByTime(1000);
        registry.capacity = 1;
        expect(log.filter((line) => line.startsWith('release'))).toEqual([
            'release 1',
            'release 2',
        ]);
        registry.flush();
        expect(log.at(-1)).toBe('release 3');
        expect(registry.size).toBe(0);
        expect(registry.capacity).toBe(1);
    });
});
