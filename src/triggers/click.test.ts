// From @lordicon/element's tests (player-element 3.0.2, commit 25ed0ab), on signals.
import { describe, expect, it } from 'vitest';
import { makeContext } from '../testing/triggers';
import { Click } from './click';

describe('click', () => {
    it('plays from the start on every press of the target', () => {
        const { context, player, emit, ready } = makeContext();
        ready(new Click(context));

        emit('press');
        player.playing = true;
        emit('press');
        expect(player.calls).toEqual(['play:start', 'play:start']);
    });

    it('does not play on a pointer or focus', () => {
        const { context, player, emit, ready } = makeContext();
        ready(new Click(context));
        emit('enter');
        emit('focus');
        expect(player.calls).toEqual([]);
    });

    it('ignores presses before the player is ready', () => {
        const { context, player, emit } = makeContext();
        new Click(context);

        emit('press');
        expect(player.calls).toEqual([]);
    });

    it('stops listening when torn down', () => {
        const { context, player, emit, ready, controller } = makeContext();
        ready(new Click(context));
        controller.abort();

        emit('press');
        expect(player.calls).toEqual([]);
    });

    it('does nothing under reduced motion', () => {
        const { context, player, emit, ready } = makeContext({ reducedMotion: true });
        ready(new Click(context));

        emit('press');
        expect(player.calls).toEqual([]);
    });
});
