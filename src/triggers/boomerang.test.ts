// From @lordicon/element's tests (player-element 3.0.2, commit 25ed0ab), on signals. A morph
// state's two halves play here as one segment: no stop in JavaScript at the turn.
import { describe, expect, it } from 'vitest';
import { makeContext, morphState } from '../testing/triggers';
import { Boomerang } from './boomerang';

describe('boomerang', () => {
    it('plays a morph state there and back in one go', () => {
        const { context, player, emit, ready, complete } = makeContext({
            states: morphState(),
            state: 'morph-close',
        });
        const trigger = new Boomerang(context);
        ready(trigger);
        player.calls.length = 0;

        emit('enter');
        expect(player.lastSegment).toEqual([0, 61]);
        expect(player.calls).toEqual(['play:segment']);
        complete(trigger);
        expect(player.calls).toEqual(['play:segment']);
        expect(player.direction).toBe(1);
    });

    it('plays forwards then in reverse without a morph state', () => {
        const { context, player, emit, ready, complete } = makeContext();
        const trigger = new Boomerang(context);
        ready(trigger);
        player.calls.length = 0;

        emit('enter');
        expect(player.calls).toEqual(['play:start']);
        complete(trigger);
        expect(player.direction).toBe(-1);
        expect(player.calls).toEqual(['play:start', 'play']);
        complete(trigger);
        expect(player.direction).toBe(1);
    });

    it('goes on a tap or keyboard focus, a tap on a hovered target ignored', () => {
        const { context, player, emit, ready, complete } = makeContext();
        const trigger = new Boomerang(context);
        ready(trigger);
        player.calls.length = 0;
        emit('press');
        complete(trigger);
        complete(trigger);
        emit('focus');
        complete(trigger);
        complete(trigger);
        emit('press'); // focused
        expect(player.calls.filter((call) => call === 'play:start')).toHaveLength(2);
    });

    it('takes an explicit ratio', () => {
        const { context, player, emit, ready } = makeContext({
            states: morphState(),
            state: 'morph-close',
            options: { ratio: '0.25' },
        });
        ready(new Boomerang(context));
        emit('enter');
        expect(player.lastSegment).toEqual([0, 61]);
    });

    it('ignores an arrival mid-flight and under reduced motion', () => {
        const { context, player, emit, ready } = makeContext();
        ready(new Boomerang(context));
        player.calls.length = 0;
        emit('enter');
        player.playing = true;
        emit('leave');
        emit('enter');
        expect(player.calls).toEqual(['play:start']);

        const reduced = makeContext({ reducedMotion: true });
        reduced.ready(new Boomerang(reduced.context));
        reduced.player.calls.length = 0;
        reduced.emit('enter');
        expect(reduced.player.calls).toEqual([]);
    });

    it('restores the player when torn down', () => {
        const { context, player, emit, ready, controller } = makeContext({
            states: morphState(),
            state: 'morph-close',
        });
        ready(new Boomerang(context));
        emit('enter');
        controller.abort();
        expect(player.calls.at(-1)).toBe('segment');
        expect(player.lastSegment).toBeNull();
        expect(player.direction).toBe(1);
    });
});
