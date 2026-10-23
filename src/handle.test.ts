import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createHandle } from './handle';
import { Player } from './player/player';
import { lockIcon, SimulatedRenderer } from './testing/renderer';
import { defineBuiltinTriggers } from './triggers/builtin';
import { TriggerHost } from './triggers/host';
import type { SignalType } from './triggers/types';

defineBuiltinTriggers();

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

/** A ready player with a trigger, and its ref. */
function mount(trigger: string) {
    const player = new Player(lockIcon(), { state: 'hover-locked' });
    const renderer = new SimulatedRenderer().attach(player);
    const listeners = new Map<SignalType, Set<() => void>>();
    const host = new TriggerHost();
    host.start(
        trigger,
        player,
        {
            signals: {
                on(type, listener) {
                    const set = listeners.get(type) ?? new Set();
                    set.add(listener);
                    listeners.set(type, set);
                    return () => set.delete(listener);
                },
            },
            value: () => null,
            ownState: () => 'hover-locked',
            visibility: () => {},
            target: true,
        },
        false,
    );
    const emit = (type: SignalType) => listeners.get(type)?.forEach((listener) => listener());
    const before = vi.fn();
    return { player, renderer, host, emit, before, ref: createHandle(player, host, before) };
}

describe('the ref', () => {
    it('is the player: reads and writes go to it', () => {
        const { ref, player } = mount('click');
        expect(ref.states.map((state) => state.name)).toContain('hover-locked');
        expect(ref.ready).toBe(true);
        ref.speed = 2;
        expect(player.speed).toBe(2);
        ref.colors.primary = '#ff0000';
        expect(player.colors.primary).toBe('#ff0000');
        const off = ref.on('play', () => {});
        expect(typeof off).toBe('function');
    });

    it('plays through the player when the trigger lets it', async () => {
        const { ref, renderer, before } = mount('click');
        const done = ref.play();
        expect(before).toHaveBeenCalledOnce();
        renderer.advance(1100);
        await expect(done).resolves.toBe(true);
    });

    it('lets the trigger hold a wait on pause and take play() over', async () => {
        const { ref, emit, player } = mount('in(500)');
        emit('visible');
        vi.advanceTimersByTime(200);
        ref.pause();
        vi.advanceTimersByTime(1000);
        expect(player.playing).toBe(false);
        await expect(ref.play()).resolves.toBe(true); // taken: the wait goes on
        expect(player.playing).toBe(false);
        vi.advanceTimersByTime(300);
        expect(player.playing).toBe(true);
    });

    it('goes straight to the player before it is ready', () => {
        const player = new Player(lockIcon());
        const host = new TriggerHost();
        const onCommand = vi.spyOn(host, 'onCommand');
        const ref = createHandle(player, host);
        void ref.play({ state: 'in-reveal' });
        ref.seek('end');
        expect(onCommand).not.toHaveBeenCalled();
        expect(player.state).toBe('in-reveal');
    });
});
