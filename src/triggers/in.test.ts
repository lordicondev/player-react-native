// From @lordicon/element's tests (player-element 3.0.2, commit 25ed0ab): the view reports half
// of the icon on screen (`visible`) in place of an IntersectionObserver.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { makeContext } from '../testing/triggers';
import { In } from './in';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('in', () => {
    it('asks the view to watch, and plays once the icon is visible', () => {
        const { context, player, emit, ready, visibilityAsked } = makeContext();
        ready(new In(context));
        expect(visibilityAsked()).toBe(1);
        expect(player.calls).toEqual([]);

        emit('visible');
        emit('visible');
        expect(player.calls).toEqual(['play:start']);
    });

    it('waits the delay first', () => {
        const { context, player, emit, ready } = makeContext({ options: { delay: '200' } });
        ready(new In(context));
        emit('visible');
        expect(player.calls).toEqual([]);
        vi.advanceTimersByTime(200);
        expect(player.calls).toEqual(['play:start']);
    });

    it('jumps to the end under reduced motion', () => {
        const { context, player, emit, ready } = makeContext({ reducedMotion: true });
        ready(new In(context));
        emit('visible');
        expect(player.calls).toEqual(['seek:end']);
    });

    it('stops listening when torn down', () => {
        const { context, player, emit, ready, controller } = makeContext({
            options: { delay: '200' },
        });
        ready(new In(context));
        controller.abort();
        emit('visible');
        vi.advanceTimersByTime(200);
        expect(player.calls).toEqual([]);
    });
});
