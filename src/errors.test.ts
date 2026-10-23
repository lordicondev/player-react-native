import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadError, LordIconLoadError } from './errors';

afterEach(() => vi.restoreAllMocks());

describe('loadError', () => {
    it('says what did not load and why, and logs each kind once', () => {
        const log = vi.spyOn(console, 'error').mockImplementation(() => {});
        const first = loadError('wasm', new Error('404'));
        loadError('wasm', new Error('404'));
        expect(first).toBeInstanceOf(LordIconLoadError);
        expect(first.kind).toBe('wasm');
        expect(first.message).toMatch(/lordicon\.wasm did not load.*assets.*\(404\)$/);
        expect(log).toHaveBeenCalledOnce();

        loadError('worker');
        expect(log).toHaveBeenCalledTimes(2);
    });
});
