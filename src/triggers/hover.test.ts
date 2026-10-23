// From @lordicon/element's tests (player-element 3.0.2, commit 25ed0ab), on signals.
import { describe, expect, it } from 'vitest';
import { makeContext } from '../testing/triggers';
import { Hover } from './hover';

describe('hover', () => {
    it('plays once when the pointer enters, or keyboard focus lands', () => {
        const { context, player, emit, ready } = makeContext();
        ready(new Hover(context));

        emit('enter');
        player.playing = false;
        emit('focus');
        expect(player.calls).toEqual(['play:start', 'play:start']);
    });

    it('plays on a tap, unless a pointer or focus is on the target already', () => {
        const { context, player, emit, ready } = makeContext();
        ready(new Hover(context));

        emit('press');
        expect(player.calls).toEqual(['play:start']);
        emit('enter');
        emit('press'); // a click on a hovered target
        expect(player.calls).toEqual(['play:start', 'play:start']);
        emit('leave');
        emit('focus');
        emit('press'); // Enter on a focused target
        expect(player.calls).toEqual(['play:start', 'play:start', 'play:start']);
    });

    it('drops an arrival while it is still playing', () => {
        const { context, player, emit, ready } = makeContext();
        ready(new Hover(context));

        emit('enter');
        player.playing = true;
        emit('leave');
        emit('enter');
        emit('press');
        expect(player.calls).toEqual(['play:start']);
    });

    it('ignores signals before ready, under reduced motion and after teardown', () => {
        const { context, player, emit, ready, controller, listening } = makeContext({
            reducedMotion: true,
        });
        const trigger = new Hover(context);
        emit('enter');
        ready(trigger);
        emit('press');
        controller.abort();
        emit('enter');
        expect(player.calls).toEqual([]);
        expect(listening('press')).toBe(0);
    });
});
