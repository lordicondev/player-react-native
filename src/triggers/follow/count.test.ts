// From @lordicon/element's tests (player-element 3.0.2, commit 25ed0ab): the `value` prop (a
// number, as text) in place of an attribute; the entrance is the component's own state.
import type { IconState } from '@lordicon/utils-lottie';
import { describe, expect, it } from 'vitest';
import { makeContext, type ContextOptions } from '../../testing/triggers';
import { Follow } from '.';

const states = [
    { name: 'in-reveal', time: 0, duration: 30, params: [], default: false },
] as IconState[];

function mountCount(count = '0', extra: ContextOptions = {}) {
    const made = makeContext({ states, state: 'in-reveal', value: count, ...extra });
    const trigger = new Follow(made.context);
    made.ready(trigger);
    made.player.calls.length = 0;
    return { ...made, trigger };
}

describe('follow: count', () => {
    it('plays nothing for the count it starts with', () => {
        const { player } = mountCount('3');
        expect(player.calls).toEqual([]);
    });

    it('plays the entrance state when the count leaves zero', () => {
        const { player, setValue } = mountCount();
        setValue('2');
        expect(player.state).toBe('in-reveal');
        expect(player.calls).toEqual(['play:state']);
    });

    it('nudges with the default state when the count goes up again', () => {
        const { player, setValue } = mountCount('2');
        setValue('3');
        expect(player.state).toBeNull();
        expect(player.calls).toEqual(['play:state']);
    });

    it('drops a nudge while playing and says nothing on the way down', () => {
        const { player, setValue } = mountCount('2');
        player.playing = true;
        setValue('3');
        player.playing = false;
        setValue('0');
        expect(player.calls).toEqual([]);
    });

    it('jumps the entrance and skips the nudge under reduced motion', () => {
        const { player, setValue } = mountCount('0', { reducedMotion: true });
        setValue('1');
        setValue('2');
        expect(player.calls).toEqual(['seek:end']);
    });

    it('picks counting from the first value when there is none at first', () => {
        const made = makeContext({ states, state: 'in-reveal' });
        const trigger = new Follow(made.context);
        made.ready(trigger);
        expect(made.player.calls).toEqual([]);

        made.setValue('1');
        expect(made.player.state).toBe('in-reveal');
        expect(made.player.calls).toEqual(['play:state']);

        made.setValue('2');
        expect(made.player.state).toBeNull();
        expect(made.player.calls).toEqual(['play:state', 'play:state']);
    });

    it('stays a boolean when the first value is not a number', () => {
        const made = makeContext({ states, state: 'in-reveal' });
        const trigger = new Follow(made.context);
        made.ready(trigger);

        made.setValue('true');
        made.setValue('2');
        expect(made.player.calls).toEqual(['play:start']);
    });
});
