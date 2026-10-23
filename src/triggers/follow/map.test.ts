// From @lordicon/element's tests (player-element 3.0.2, commit 25ed0ab): the `value` prop in
// place of an attribute. Loop states loop in the renderer: going on to another value turns the
// loop off, and the round's end moves on.
import type { IconState } from '@lordicon/utils-lottie';
import { describe, expect, it } from 'vitest';
import { makeContext, type ContextOptions } from '../../testing/triggers';
import { Follow } from '.';

/** Like the download icon: a loop, and a morph that splits at its midpoint. */
const states = [
    { name: 'loop-cycle', time: 210, duration: 60, params: [], default: false },
    { name: 'morph-check', time: 350, duration: 60, params: ['0.5'], default: false },
    { name: 'hover-wave', time: 420, duration: 30, params: [], default: false },
] as IconState[];
const LOOP: [number, number] = [210, 271];
const INTO: [number, number] = [350, 380];
const BACK: [number, number] = [380, 411];

function mountMap(stage = 'idle', extra: ContextOptions = {}) {
    const made = makeContext({
        states,
        state: 'morph-check',
        value: stage,
        options: { busy: 'loop-cycle', done: 'morph-check', ok: 'hover-wave', idle: '' },
        ...extra,
    });
    const trigger = new Follow(made.context);
    made.ready(trigger);
    return { ...made, trigger };
}

describe('follow: value map', () => {
    it('rests on the first frame without playing', () => {
        const { player } = mountMap();
        expect(player.calls).toEqual(['segment']);
        expect(player.lastSegment).toBeNull(); // the state's own segment
        expect(player.state).toBe('morph-check');
    });

    it('loops while busy, in the renderer', () => {
        const { player, setValue } = mountMap();
        player.calls.length = 0;
        setValue('busy');
        expect(player.calls).toEqual(['play:segment']);
        expect(player.lastSegment).toEqual(LOOP);
        expect(player.loop).toBe(true);
    });

    it('holds a finish that lands mid-loop until the round is over', () => {
        const { player, trigger, setValue, complete } = mountMap();
        setValue('busy');
        player.playing = true;
        player.calls.length = 0;

        setValue('done');
        expect(player.calls).toEqual([]);
        expect(player.loop).toBe(false); // the round in progress is the last

        complete(trigger);
        expect(player.calls).toEqual(['play:segment']);
        expect(player.lastSegment).toEqual(INTO);
        expect(player.loop).toBe(false);
    });

    it('loops on when the value comes back before the round is over', () => {
        const { player, trigger, setValue, complete } = mountMap();
        setValue('busy');
        player.playing = true;
        setValue('done');
        setValue('busy');
        player.calls.length = 0;
        complete(trigger);
        expect(player.calls).toEqual(['play:segment']);
        expect(player.lastSegment).toEqual(LOOP);
        expect(player.loop).toBe(true);
    });

    it('confirms at once when there was no loop to wait for', () => {
        const { player, setValue } = mountMap();
        player.calls.length = 0;
        setValue('done');
        expect(player.calls).toEqual(['play:segment']);
        expect(player.lastSegment).toEqual(INTO);
    });

    it('morphs back when the value returns to rest', () => {
        const { player, setValue } = mountMap();
        setValue('done');
        player.calls.length = 0;
        setValue('idle');
        expect(player.calls).toEqual(['play:segment']);
        expect(player.lastSegment).toEqual(BACK);
    });

    it('plays a morph without a ratio forwards, and backwards on the way back', () => {
        const made = makeContext({
            states: [
                { name: 'morph-check', time: 350, duration: 60, params: [], default: false },
            ] as IconState[],
            state: 'morph-check',
            value: 'idle',
            options: { done: 'morph-check' },
        });
        const trigger = new Follow(made.context);
        made.ready(trigger);

        made.setValue('done');
        expect(made.player.lastSegment).toEqual([350, 411]);
        expect(made.player.direction).toBe(1);

        made.player.calls.length = 0;
        made.setValue('idle');
        expect(made.player.calls).toEqual(['play:segment']);
        expect(made.player.lastSegment).toEqual([350, 411]);
        expect(made.player.direction).toBe(-1);
    });

    it('does not play a morph back it never played forwards', () => {
        const { player, trigger, setValue, complete } = mountMap();
        setValue('busy');
        player.calls.length = 0;
        setValue('idle');
        complete(trigger);
        expect(player.calls).toEqual(['segment']);
        expect(player.lastSegment).toBeNull(); // the state's own segment
    });

    it('jumps under reduced motion', () => {
        const { player, setValue } = mountMap('idle', { reducedMotion: true });
        player.calls.length = 0;
        setValue('busy');
        expect(player.calls).toEqual(['segment']);
        expect(player.loop).toBe(false);

        player.calls.length = 0;
        setValue('done');
        expect(player.calls).toEqual(['segment', 'seek:end']);
        expect(player.lastSegment).toEqual(INTO);
    });

    it('waits for the player and stops with the trigger', () => {
        const made = makeContext({
            states,
            state: 'morph-check',
            value: 'idle',
            options: { busy: 'loop-cycle' },
        });
        const trigger = new Follow(made.context);
        made.setValue('busy');
        expect(made.player.calls).toEqual([]);

        made.ready(trigger);
        expect(made.player.lastSegment).toEqual(LOOP);
        made.controller.abort();
        expect(made.player.loop).toBe(false);
        made.player.calls.length = 0;
        made.setValue('done');
        expect(made.player.calls).toEqual([]);
    });

    it('plays a plain state once', () => {
        const { player, trigger, setValue, complete } = mountMap();
        player.calls.length = 0;
        setValue('ok');
        expect(player.calls).toEqual(['play:segment']);
        expect(player.lastSegment).toEqual([420, 451]);

        complete(trigger);
        expect(player.calls).toEqual(['play:segment']);
    });

    it('shows the value it finds at ready without playing', () => {
        const done = mountMap('done');
        expect(done.player.calls).toEqual(['segment', 'seek:end']);
        expect(done.player.lastSegment).toEqual(INTO);
    });

    it('loops at once on a loop value found at ready: a status shows moving', () => {
        const busy = mountMap('busy');
        expect(busy.player.calls).toEqual(['play:segment']);
        expect(busy.player.lastSegment).toEqual(LOOP);
        expect(busy.player.loop).toBe(true);
    });

    it('rests on a value mapped to nothing', () => {
        const { player, setValue } = mountMap('ok');
        player.calls.length = 0;
        setValue('idle');
        expect(player.calls).toEqual(['segment']);
        expect(player.lastSegment).toBeNull();
    });
});
