import type { Icon, Model, Runtime } from '@lordicon/runtime';
import { describe, expect, it } from 'vitest';
import { Models } from './models';

/** A runtime that counts models and icons, alive and destroyed. */
function fakeRuntime() {
    const counts = { models: 0, modelsDestroyed: 0, icons: 0, iconsDestroyed: 0 };
    const runtime = {
        model: (json: string) => {
            if (json === 'junk') throw new Error('Not a Lottie icon');
            counts.models++;
            return {
                icon: () => {
                    counts.icons++;
                    return { destroy: () => counts.iconsDestroyed++ } as unknown as Icon;
                },
                destroy: () => counts.modelsDestroyed++,
            } as unknown as Model;
        },
    } as unknown as Runtime;
    return { runtime, counts };
}

describe('Models', () => {
    it('parses a source once for all its icons', () => {
        const { runtime, counts } = fakeRuntime();
        const models = new Models(runtime);
        models.icon(1, '{}');
        models.icon(1, '{}');
        models.icon(2, '{}');
        expect(counts).toMatchObject({ models: 2, icons: 3 });
    });

    it('keeps a model while its source is registered, and lets it go with its last icon after', () => {
        const { runtime, counts } = fakeRuntime();
        const models = new Models(runtime);
        const [a, b] = [models.icon(1, '{}'), models.icon(1, '{}')];
        models.release(1, a);
        models.release(1, b);
        expect(models.size).toBe(1); // cached: no icons, still registered
        const c = models.icon(1, '{}');
        expect(counts.models).toBe(1);
        models.forget(1);
        expect(models.size).toBe(1); // c draws from it
        models.release(1, c);
        expect(models.size).toBe(0);
        expect(counts).toMatchObject({ modelsDestroyed: 1, iconsDestroyed: 3 });
    });

    it('lets go of a forgotten model at once when no icon draws from it', () => {
        const { runtime, counts } = fakeRuntime();
        const models = new Models(runtime);
        models.release(1, models.icon(1, '{}'));
        models.forget(1);
        expect(counts.modelsDestroyed).toBe(1);
        models.forget(7); // unknown: nothing
    });

    it('throws for what is not an icon, keeping nothing', () => {
        const { runtime } = fakeRuntime();
        const models = new Models(runtime);
        expect(() => models.icon(1, 'junk')).toThrow();
        expect(models.size).toBe(0);
    });
});
