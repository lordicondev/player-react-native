// From @lordicon/element's tests (player-element 3.0.2, commit 25ed0ab). The renderer loops and
// rests here; leaving turns the loop off and the round in progress finishes.
import { describe, expect, it } from 'vitest';
import { makeContext } from '../testing/triggers';
import { LoopOnHover } from './loop-on-hover';

describe('loop-on-hover', () => {
    it('loops while the pointer is over the target and finishes the round after it leaves', () => {
        const { context, player, emit, ready } = makeContext();
        ready(new LoopOnHover(context));

        emit('enter');
        expect(player.calls).toEqual(['play:start']);
        expect(player.loop).toBe(true);
        player.playing = true;
        emit('leave');
        expect(player.loop).toBe(false);
        emit('enter'); // back before the round ended: loops on, no new play
        expect(player.calls).toEqual(['play:start']);
        expect(player.loop).toBe(true);
    });

    it('rests the delay between rounds', () => {
        const { context, player, emit, ready } = makeContext({ options: { delay: '300' } });
        ready(new LoopOnHover(context));
        emit('enter');
        expect(player.rest).toBe(0.3);
    });

    it('loops with keyboard focus, and keeps looping while either stays', () => {
        const { context, player, emit, ready } = makeContext();
        ready(new LoopOnHover(context));
        emit('focus');
        emit('enter');
        emit('leave');
        expect(player.loop).toBe(true);
        emit('blur');
        expect(player.loop).toBe(false);
    });

    it('plays one round on a tap', () => {
        const { context, player, emit, ready } = makeContext();
        ready(new LoopOnHover(context));
        emit('press');
        expect(player.calls).toEqual(['play:start']);
        expect(player.loop).toBe(false);
        player.playing = true;
        emit('press');
        expect(player.calls).toEqual(['play:start']);
    });

    it('does nothing under reduced motion', () => {
        const { context, player, emit, ready } = makeContext({ reducedMotion: true });
        ready(new LoopOnHover(context));
        emit('enter');
        emit('press');
        expect(player.calls).toEqual([]);
    });
});
