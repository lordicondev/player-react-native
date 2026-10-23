// From @lordicon/element's tests (player-element 3.0.2, commit 25ed0ab), on signals; the tap
// (round trip) is new.
import { describe, expect, it } from 'vitest';
import { makeContext, morphState } from '../testing/triggers';
import { Morph } from './morph';

function mountMorph(options: Record<string, string> = {}) {
    const made = makeContext({ states: morphState(), state: 'morph-close', options });
    const trigger = new Morph(made.context);
    made.ready(trigger);
    made.player.calls.length = 0;
    return { ...made, trigger };
}

const hoverOpen = [
    { name: 'hover-open', time: 0, duration: 20, params: [], default: false },
] as never;

describe('morph', () => {
    it('starts on the first look without animating', () => {
        const made = makeContext({ states: morphState(), state: 'morph-close' });
        made.ready(new Morph(made.context));
        expect(made.player.calls).toEqual(['segment', 'seek:end']);
        expect(made.player.lastSegment).toEqual([30, 61]);
    });

    it('morphs there on enter and back on leave', () => {
        const { player, emit, trigger, complete } = mountMorph();

        emit('enter');
        expect(player.lastSegment).toEqual([0, 30]);
        expect(player.calls).toEqual(['play:segment']);
        complete(trigger);

        player.calls.length = 0;
        emit('leave');
        expect(player.lastSegment).toEqual([30, 61]);
        expect(player.calls).toEqual(['play:segment']);
    });

    it('morphs with keyboard focus too', () => {
        const { player, emit } = mountMorph();
        emit('focus');
        expect(player.lastSegment).toEqual([0, 30]);
        emit('enter');
        emit('blur'); // the pointer is still over it
        expect(player.calls).toEqual(['play:segment']);
    });

    it('reverses in place when the pointer leaves mid-morph', () => {
        const { player, emit } = mountMorph();

        emit('enter');
        player.playing = true;
        player.calls.length = 0;
        emit('leave');
        expect(player.direction).toBe(-1);
        expect(player.calls).toEqual(['play']);
    });

    it('goes there and back on a tap, in one play of the whole state', () => {
        const { player, emit, trigger, complete } = mountMorph();
        emit('press');
        expect(player.calls).toEqual(['play:segment']);
        expect(player.lastSegment).toEqual([0, 61]);
        player.playing = true;
        emit('press'); // mid-flight
        expect(player.calls).toEqual(['play:segment']);
        complete(trigger);
        emit('enter'); // a pointer after: there, from the first look
        expect(player.lastSegment).toEqual([0, 30]);
    });

    it('ignores a tap on a hovered target', () => {
        const { player, emit } = mountMorph();
        emit('enter');
        player.calls.length = 0;
        emit('press');
        expect(player.calls).toEqual([]);
    });

    it('takes an explicit ratio', () => {
        const { player, emit } = mountMorph({ ratio: '0.75' });
        emit('enter');
        expect(player.lastSegment).toEqual([0, 45]);
    });

    it('plays the whole animation forwards and backwards without a ratio', () => {
        const made = makeContext({ states: hoverOpen, state: 'hover-open' });
        const trigger = new Morph(made.context);
        made.ready(trigger);
        made.player.calls.length = 0;

        made.emit('enter');
        expect(made.player.direction).toBe(1);
        expect(made.player.calls).toEqual(['play']);
        made.complete(trigger);
        made.emit('leave');
        expect(made.player.direction).toBe(-1);
    });

    it('goes forwards and back on a tap without a ratio, forwards again after', () => {
        const made = makeContext({ states: hoverOpen, state: 'hover-open' });
        const trigger = new Morph(made.context);
        made.ready(trigger);
        made.player.calls.length = 0;

        made.emit('press');
        expect(made.player.calls).toEqual(['play:start']);
        made.complete(trigger);
        expect(made.player.direction).toBe(-1);
        expect(made.player.calls).toEqual(['play:start', 'play']);
        made.complete(trigger);
        expect(made.player.direction).toBe(1);
    });

    it('jumps between the looks under reduced motion, and a tap does nothing', () => {
        const made = makeContext({
            states: morphState(),
            state: 'morph-close',
            reducedMotion: true,
        });
        made.ready(new Morph(made.context));
        made.player.calls.length = 0;

        made.emit('press');
        expect(made.player.calls).toEqual([]);
        made.emit('enter');
        expect(made.player.calls).toEqual(['segment', 'seek:end']);
        expect(made.player.lastSegment).toEqual([0, 30]);
    });

    it('restores the player when torn down', () => {
        const { player, emit, controller } = mountMorph();
        emit('enter');
        controller.abort();
        // Back on the state's own segment.
        expect(player.calls.at(-1)).toBe('segment');
        expect(player.lastSegment).toBeNull();
        expect(player.direction).toBe(1);
    });

    it('starts on the second look when the pointer arrived before ready', () => {
        const made = makeContext({ states: morphState(), state: 'morph-close' });
        const trigger = new Morph(made.context);
        made.emit('enter');
        made.ready(trigger);

        expect(made.player.calls).toEqual(['segment', 'seek:end']);
        expect(made.player.lastSegment).toEqual([0, 30]);
    });
});
