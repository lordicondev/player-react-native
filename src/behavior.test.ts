import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { IconBehavior, SignalEmitter, valueText, type BehaviorProps } from './behavior';
import { Player } from './player/player';
import { lockIcon, SimulatedRenderer } from './testing/renderer';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

/** The lock icon's player, its behaviour, and a renderer that plays like the core. */
function mount(props: Partial<BehaviorProps> = {}, attach = true) {
    const player = new Player(lockIcon(), { state: props.state ?? 'hover-locked' });
    const watch = vi.fn();
    const behavior = new IconBehavior(player, watch);
    const disconnect = behavior.connect();
    const target = new SignalEmitter();
    const all: BehaviorProps = { reducedMotion: false, target, state: 'hover-locked', ...props };
    behavior.update(all);
    const renderer = new SimulatedRenderer();
    if (attach) renderer.attach(player);
    const update = (next: Partial<BehaviorProps>) => behavior.update({ ...all, ...next });
    return {
        player,
        behavior,
        target,
        watch,
        renderer,
        update,
        disconnect,
        attach: () => renderer.attach(player),
    };
}

describe('IconBehavior', () => {
    it('turns the value into text for the triggers', () => {
        expect([true, false, 3, 'busy', null, undefined].map(valueText)).toEqual([
            'true',
            'false',
            '3',
            'busy',
            null,
            null,
        ]);
    });

    it('runs the trigger once the player is ready, with the target’s signals', async () => {
        const { player, target, attach } = mount({ trigger: 'click' }, false);
        target.emit('press');
        expect(player.playing).toBe(false);
        attach();
        await Promise.resolve(); // the ready event
        target.emit('press');
        expect(player.playing).toBe(true);
    });

    it('follows a value without a trigger, and hands it its changes', async () => {
        const { player, update } = mount({ state: 'morph-unlocked', value: false });
        await Promise.resolve();
        expect(player.playing).toBe(false);
        update({ state: 'morph-unlocked', value: true });
        expect(player.playing).toBe(true);
    });

    it('starts another trigger when the prop changes, or the target, or reduced motion', async () => {
        const { player, target, update } = mount({ trigger: 'click' });
        await Promise.resolve();
        update({ trigger: 'loop' });
        expect(player.loop).toBe(true);
        update({ trigger: 'click', reducedMotion: true });
        expect(player.loop).toBe(false); // the round in progress ends the loop
        player.stop();
        target.emit('press');
        expect(player.playing).toBe(false); // reduced motion
        const other = new SignalEmitter();
        update({ trigger: 'click', target: other });
        target.emit('press');
        expect(player.playing).toBe(false); // the old target no longer counts
        other.emit('press');
        expect(player.playing).toBe(true);
    });

    it('starts the trigger over without animating for a recycled row', async () => {
        const { player, update } = mount({
            state: 'morph-unlocked',
            value: false,
            recyclingKey: 1,
        });
        await Promise.resolve();
        // The row shows another item, liked: its look at once, not a morph.
        update({ state: 'morph-unlocked', value: true, recyclingKey: 2 });
        expect(player.playing).toBe(false);
        update({ state: 'morph-unlocked', value: false, recyclingKey: 2 }); // the same item: it morphs
        expect(player.playing).toBe(true);
    });

    it('plays the intro once in view, then the trigger', async () => {
        const { player, behavior, watch, renderer, target } = mount({
            trigger: 'click',
            intro: 'in-reveal',
        });
        await Promise.resolve();
        expect(watch).toHaveBeenLastCalledWith(true);
        target.emit('press');
        expect(player.playing).toBe(false); // the trigger waits for the intro

        behavior.visible();
        expect(watch).toHaveBeenLastCalledWith(false);
        expect(player.state).toBe('in-reveal');
        expect(player.playing).toBe(true);
        renderer.advance(2100);
        await vi.advanceTimersByTimeAsync(0);
        expect(player.state).toBe('hover-locked'); // back on its own state
        target.emit('press');
        expect(player.playing).toBe(true);
    });

    it('rests on the intro’s first frame while it waits, not on its own state', async () => {
        const { player, behavior, renderer, update } = mount({
            trigger: 'click',
            intro: 'in-reveal, delay=300',
        });
        const start = player.segment[0];
        expect(player.state).toBe('in-reveal'); // before ready: the first frame drawn
        await Promise.resolve();
        expect(renderer.frame()).toBe(start);
        update({ trigger: 'click', intro: 'in-reveal, delay=300', state: 'morph-unlocked' });
        expect(player.state).toBe('in-reveal'); // a new own state waits for the intro
        behavior.visible();
        vi.advanceTimersByTime(299);
        expect(player.playing).toBe(false);
        expect(renderer.frame()).toBe(start);
        vi.advanceTimersByTime(1);
        expect(player.playing).toBe(true);
        renderer.advance(2100);
        await vi.advanceTimersByTimeAsync(0);
        expect(player.state).toBe('morph-unlocked'); // the intro ends on it
    });

    it('waits the intro’s delay, and gives way to a command from the ref', async () => {
        const { player, behavior, target } = mount({
            trigger: 'click',
            intro: 'in-reveal, delay=300',
        });
        await Promise.resolve();
        behavior.visible();
        vi.advanceTimersByTime(299);
        expect(player.playing).toBe(false);
        behavior.handle.seek('end'); // a command: no intro, the trigger at once
        vi.advanceTimersByTime(10);
        expect(player.state).toBe('hover-locked');
        target.emit('press');
        expect(player.playing).toBe(true);
    });

    it('takes the first in- state for an empty intro, and warns about one it lacks', async () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const { behavior, player } = mount({ intro: '' });
        await Promise.resolve();
        behavior.visible();
        expect(player.state).toBe('in-reveal');
        mount({ intro: 'in-nothing' });
        expect(warn).toHaveBeenCalledWith(expect.stringContaining('"in-nothing" not found'));
        warn.mockRestore();
    });

    it('tells the trigger of a new own state', async () => {
        const { player, update } = mount({
            trigger: 'sequence(play, stop)',
            state: 'hover-locked',
        });
        await Promise.resolve();
        update({ trigger: 'sequence(play, stop)', state: 'in-reveal' });
        expect(player.state).toBe('in-reveal');
    });

    it('stops when disconnected, and starts over when connected again (StrictMode)', async () => {
        const { player, behavior, target, disconnect, update } = mount({ trigger: 'click' });
        await Promise.resolve();
        disconnect();
        target.emit('press');
        expect(player.playing).toBe(false);
        update({ trigger: 'click' }); // not connected: nothing
        target.emit('press');
        expect(player.playing).toBe(false);

        behavior.connect();
        update({ trigger: 'click' });
        target.emit('press');
        expect(player.playing).toBe(true);
    });
});
