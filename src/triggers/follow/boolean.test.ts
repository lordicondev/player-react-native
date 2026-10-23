// From @lordicon/element's tests (player-element 3.0.2, commit 25ed0ab): the `value` prop in
// place of an attribute of the target. The loop state is new.
import type { IconState } from '@lordicon/utils-lottie';
import { describe, expect, it } from 'vitest';
import { makeContext, morphState, type ContextOptions } from '../../testing/triggers';
import { Follow } from '.';

function mountMorph(on = false, extra: ContextOptions = {}) {
    const made = makeContext({
        states: morphState(),
        state: 'morph-close',
        value: String(on),
        ...extra,
    });
    const trigger = new Follow(made.context);
    return { ...made, trigger };
}

describe('follow: boolean with a morph state', () => {
    it('shows the starting look without animating', () => {
        const { player, trigger, ready } = mountMorph(true);
        ready(trigger);
        expect(player.calls).toEqual(['segment', 'seek:end']);
        expect(player.lastSegment).toEqual([0, 30]);
    });

    it('starts from a change made before the player is ready, without animating', () => {
        const { player, trigger, ready, setValue } = mountMorph();
        setValue('true');
        expect(player.calls).toEqual([]);
        ready(trigger);
        expect(player.calls).toEqual(['segment', 'seek:end']);
        expect(player.lastSegment).toEqual([0, 30]);
    });

    it('animates a change after ready and ignores a repeat', () => {
        const { player, trigger, ready, setValue } = mountMorph();
        ready(trigger);
        player.calls.length = 0;

        setValue('true');
        expect(player.calls).toEqual(['play:segment']);
        expect(player.lastSegment).toEqual([0, 30]);

        setValue('true');
        expect(player.calls).toEqual(['play:segment']);
    });

    it('reverses in place when interrupted, and turns around again', () => {
        const { player, trigger, ready, setValue } = mountMorph();
        ready(trigger);
        setValue('true');
        player.playing = true;
        player.calls.length = 0;

        setValue('false');
        expect(player.calls).toEqual(['play']);
        expect(player.direction).toBe(-1);

        setValue('true');
        expect(player.direction).toBe(1);
    });

    it('takes an explicit ratio', () => {
        const { player, trigger, ready, setValue } = mountMorph(false, {
            options: { ratio: '0.25' },
        });
        ready(trigger);
        setValue('true');
        expect(player.lastSegment).toEqual([0, 15]);
    });

    it('jumps under reduced motion', () => {
        const { player, trigger, ready, setValue } = mountMorph(false, { reducedMotion: true });
        ready(trigger);
        player.calls.length = 0;
        setValue('true');
        expect(player.calls).toEqual(['segment', 'seek:end']);
    });

    it('restores the player and stops following when torn down', () => {
        const { player, trigger, ready, setValue, controller } = mountMorph();
        ready(trigger);
        controller.abort();
        // Back on the state's own segment.
        expect(player.calls.at(-1)).toBe('segment');
        expect(player.lastSegment).toBeNull();
        player.calls.length = 0;
        setValue('true');
        expect(player.calls).toEqual([]);
    });
});

describe('follow: boolean without a morph state', () => {
    const states = [
        { name: 'in-reveal', time: 0, duration: 30, params: [], default: false },
    ] as IconState[];

    it('plays once when the value turns true, not on the way back', () => {
        const made = makeContext({ states, state: 'in-reveal', value: 'false' });
        const trigger = new Follow(made.context);
        made.ready(trigger);
        expect(made.player.calls).toEqual([]);

        made.setValue('true');
        made.setValue('false');
        made.setValue('true');
        expect(made.player.calls).toEqual(['play:start', 'play:start']);
    });

    it('drops a change that lands mid-play and jumps under reduced motion', () => {
        const made = makeContext({ states, state: 'in-reveal', value: 'false' });
        const trigger = new Follow(made.context);
        made.ready(trigger);
        made.setValue('true');
        made.player.playing = true;
        made.setValue('false');
        made.setValue('true');
        expect(made.player.calls).toEqual(['play:start']);

        const reduced = makeContext({
            states,
            state: 'in-reveal',
            value: 'false',
            reducedMotion: true,
        });
        reduced.ready(new Follow(reduced.context));
        reduced.setValue('true');
        expect(reduced.player.calls).toEqual(['seek:end']);
    });
});

describe('follow: boolean with a loop state', () => {
    const states = [
        { name: 'loop-cycle', time: 0, duration: 40, params: [], default: false },
    ] as IconState[];

    it('loops while the value is true, the round in progress finishing after', () => {
        const made = makeContext({ states, state: 'loop-cycle', value: 'false' });
        made.ready(new Follow(made.context));
        expect(made.player.calls).toEqual([]);

        made.setValue('true');
        expect(made.player.calls).toEqual(['play:start']);
        expect(made.player.loop).toBe(true);
        made.player.playing = true;
        made.setValue('false');
        expect(made.player.loop).toBe(false);
        made.setValue('true'); // back before the round ended: on, no new play
        expect(made.player.calls).toEqual(['play:start']);
        expect(made.player.loop).toBe(true);
    });

    it('loops from ready when the value is true already', () => {
        const made = makeContext({ states, state: 'loop-cycle', value: 'true' });
        made.ready(new Follow(made.context));
        expect(made.player.calls).toEqual(['play:start']);
        expect(made.player.loop).toBe(true);
    });

    it('stays still under reduced motion, and stops looping when torn down', () => {
        const reduced = makeContext({
            states,
            state: 'loop-cycle',
            value: 'true',
            reducedMotion: true,
        });
        reduced.ready(new Follow(reduced.context));
        expect(reduced.player.calls).toEqual([]);

        const made = makeContext({ states, state: 'loop-cycle', value: 'true' });
        made.ready(new Follow(made.context));
        made.controller.abort();
        expect(made.player.loop).toBe(false);
    });
});
