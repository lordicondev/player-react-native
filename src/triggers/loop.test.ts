// From @lordicon/element's tests (player-element 3.0.2, commit 25ed0ab). The renderer loops and
// rests here: the trigger sets the player's loop and rest once, and plays once.
import { describe, expect, it } from 'vitest';
import { makeContext } from '../testing/triggers';
import { Loop } from './loop';

describe('loop', () => {
    it('loops on the renderer from ready', () => {
        const { context, player, ready, complete } = makeContext();
        const trigger = new Loop(context);

        ready(trigger);
        expect(player.calls).toEqual(['play:start']);
        expect([player.loop, player.rest]).toEqual([true, 0]);
        complete(trigger); // nothing to do from JavaScript
        expect(player.calls).toEqual(['play:start']);
    });

    it('rests the delay between rounds, in the renderer', () => {
        const { context, player, ready } = makeContext({ options: { delay: '500' } });
        ready(new Loop(context));
        expect(player.calls).toEqual(['play:start']);
        expect(player.rest).toBe(0.5);
    });

    it('stops looping with the trigger', () => {
        const { context, player, ready, controller } = makeContext({ options: { delay: '500' } });
        ready(new Loop(context));
        controller.abort();
        expect([player.loop, player.rest]).toEqual([false, 0]);
    });

    it('does nothing under reduced motion', () => {
        const { context, player, ready } = makeContext({ reducedMotion: true });
        ready(new Loop(context));
        expect(player.calls).toEqual([]);
        expect(player.loop).toBe(false);
    });
});
