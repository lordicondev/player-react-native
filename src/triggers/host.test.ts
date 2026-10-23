import { afterEach, describe, expect, it, vi } from 'vitest';
import { makeContext } from '../testing/triggers';
import { BaseTrigger } from './base';
import { defineBuiltinTriggers } from './builtin';
import { defineTrigger, resolveTrigger, TriggerHost, type TriggerSources } from './host';
import type { TriggerContext } from './types';

defineBuiltinTriggers();

afterEach(() => vi.restoreAllMocks());

/** The host's sources from a test context. */
function sources(made: ReturnType<typeof makeContext>, target = true): TriggerSources {
    const { signals, value, ownState, visibility } = made.context;
    return { signals, value, ownState, visibility, target };
}

describe('TriggerHost', () => {
    it('runs the trigger the prop names, with its options, and ready at once when the player is', () => {
        const made = makeContext({ options: {} });
        made.player.ready = true;
        const host = new TriggerHost();
        host.start('loop(250)', made.player, sources(made), false);
        expect(host.active).toBe(true);
        expect(made.player.calls).toEqual(['play:start']);
        expect(made.player.rest).toBe(0.25);
    });

    it('waits for the player, forwards its events, and tears the trigger down', () => {
        const made = makeContext();
        const host = new TriggerHost();
        host.start('click', made.player, sources(made), false);
        made.emit('press');
        expect(made.player.calls).toEqual([]);
        made.player.ready = true;
        host.onReady();
        made.emit('press');
        expect(made.player.calls).toEqual(['play:start']);

        host.stop();
        expect(host.active).toBe(false);
        expect(made.listening('press')).toBe(0);
    });

    it('starts the next trigger in place of the last', () => {
        const made = makeContext();
        made.player.ready = true;
        const host = new TriggerHost();
        host.start('loop', made.player, sources(made), false);
        host.start('click', made.player, sources(made), false);
        expect(made.player.loop).toBe(false); // the loop torn down
        made.emit('press');
        expect(made.player.calls).toEqual(['play:start', 'play:start']);
    });

    it('warns about an unknown trigger, and about a pointer trigger without a target', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const made = makeContext();
        const host = new TriggerHost();
        host.start('wobble', made.player, sources(made), false);
        expect(host.active).toBe(false);
        host.start('hover', made.player, sources(made, false), false);
        expect(host.active).toBe(true);
        expect(warn.mock.calls.map(([text]) => String(text))).toEqual([
            expect.stringContaining('unknown trigger "wobble"'),
            expect.stringContaining('LordIcon.Target'),
        ]);
    });

    it('takes custom triggers, and lets commands through unless the trigger takes them', () => {
        class Wobble extends BaseTrigger {
            constructor(context: TriggerContext) {
                super(context);
                this.on('press', () => void this.player.play({ state: 'hover-wobble' }));
            }
        }
        defineTrigger('Wobble', Wobble);
        expect(resolveTrigger('wobble')).toBe(Wobble);

        const made = makeContext();
        made.player.ready = true;
        const host = new TriggerHost();
        host.start('wobble', made.player, sources(made), false);
        made.emit('press');
        expect(made.player.state).toBe('hover-wobble');
        expect(host.onCommand({ name: 'stop' })).toBeUndefined();
    });

    it('does nothing without a trigger', () => {
        const made = makeContext();
        const host = new TriggerHost();
        host.start(undefined, made.player, sources(made), false);
        host.start('', made.player, sources(made), false);
        expect(host.active).toBe(false);
        expect(host.onCommand({ name: 'pause' })).toBeUndefined();
        host.onComplete();
        host.onState();
    });
});
