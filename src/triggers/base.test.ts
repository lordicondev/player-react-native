// From @lordicon/element's tests (player-element 3.0.2, commit 25ed0ab): signals in place of
// DOM listeners and attributes; the timeouts' tests on `in(delay)` (the loop rests in the
// renderer here).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { makeContext } from '../testing/triggers';
import { BaseTrigger } from './base';
import { In } from './in';
import { Sequence } from './sequence';
import type { TriggerContext } from './types';

class Probe extends BaseTrigger {
    presses = 0;
    changes = 0;
    fired = 0;

    constructor(context: TriggerContext) {
        super(context);
        this.on('press', () => this.presses++);
        this.on('value', () => this.changes++);
        this.timeout(() => this.fired++, 50);
    }

    read(name: string, fallback?: string) {
        return fallback === undefined ? this.option(name) : this.option(name, fallback);
    }

    count(name: string) {
        return this.number(name, 7);
    }

    schedule(callback: () => void, ms: number) {
        return this.timeout(callback, ms);
    }

    sources() {
        return [this.value(), this.ownState()];
    }
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('BaseTrigger', () => {
    it('reads options with fallbacks', () => {
        const { context } = makeContext({ options: { delay: '250', bad: 'x' } });
        const probe = new Probe(context);

        expect(probe.read('delay')).toBe('250');
        expect(probe.read('missing')).toBeUndefined();
        expect(probe.read('missing', 'y')).toBe('y');
        expect(probe.count('delay')).toBe(250);
        expect(probe.count('bad')).toBe(7);
        expect(probe.count('missing')).toBe(7);
    });

    it('reads the value and the own state', () => {
        const { context } = makeContext({ value: 'busy', ownState: 'loop-cycle' });
        expect(new Probe(context).sources()).toEqual(['busy', 'loop-cycle']);
    });

    it('listens and times until torn down', () => {
        const { context, emit, setValue, controller, listening } = makeContext();
        const probe = new Probe(context);

        emit('press');
        setValue('true');
        vi.advanceTimersByTime(60);
        expect([probe.presses, probe.changes, probe.fired]).toEqual([1, 1, 1]);

        const late = new Probe(context);
        controller.abort();

        emit('press');
        setValue('false');
        vi.advanceTimersByTime(60);
        expect([probe.presses, probe.changes]).toEqual([1, 1]);
        expect([late.presses, late.changes, late.fired]).toEqual([0, 0, 0]);
        expect(listening('press')).toBe(0);
    });
});

describe('timeouts and the ref commands', () => {
    /** An `in(500)` trigger whose icon came into view: its play waits 500 ms. */
    function waiting() {
        const made = makeContext({ options: { delay: '500' } });
        const trigger = new In(made.context);
        made.ready(trigger);
        made.emit('visible');
        return { ...made, trigger };
    }

    it('add one abort listener however many timeouts run, and clear them all at teardown', () => {
        const { context, controller } = makeContext();
        const added = vi.spyOn(context.signal, 'addEventListener');
        const trigger = new Probe(context);
        const after = added.mock.calls.length;

        let rounds = 0;
        const again = () => {
            rounds++;
            trigger.schedule(again, 10);
        };
        again();
        vi.advanceTimersByTime(1000);
        expect(rounds).toBeGreaterThan(90);
        expect(added.mock.calls.length).toBe(after);

        controller.abort();
        const done = rounds;
        vi.advanceTimersByTime(1000);
        expect(rounds).toBe(done);
        expect(trigger.fired).toBe(1);
    });

    it("hold on the ref's pause() and run out after play()", () => {
        const { trigger, player } = waiting();

        vi.advanceTimersByTime(200);
        expect(trigger.onCommand({ name: 'pause' })).toBeUndefined(); // the player pauses too
        vi.advanceTimersByTime(1000);
        expect(player.calls).toEqual([]);

        // play() takes over, so the player does not start over the look it waits on.
        expect(trigger.onCommand({ name: 'play', options: {} })).toBe(true);
        vi.advanceTimersByTime(299);
        expect(player.calls).toEqual([]);
        vi.advanceTimersByTime(1);
        expect(player.calls).toEqual(['play:start']);
    });

    it('let any other command through, and run out as before', () => {
        const { trigger, player } = waiting();
        trigger.onCommand({ name: 'pause' });
        expect(trigger.onCommand({ name: 'seek', frame: 10 })).toBeUndefined();
        vi.advanceTimersByTime(500);
        expect(player.calls).toEqual(['play:start']);
    });

    it('leave play() to the player when nothing waits', () => {
        const { trigger } = waiting();
        vi.advanceTimersByTime(500);
        trigger.onCommand({ name: 'pause' });
        expect(trigger.onCommand({ name: 'play', options: {} })).toBeUndefined();
    });

    it('hold a wait of a sequence', async () => {
        const { context, player, ready } = makeContext({
            states: [
                { name: 'in-reveal', time: 0, duration: 30, params: [], default: true },
            ] as never,
            options: { steps: 'wait 300, play in-reveal' },
        });
        const trigger = new Sequence(context);
        ready(trigger);

        trigger.onCommand({ name: 'pause' });
        await vi.advanceTimersByTimeAsync(1000);
        expect(player.calls).toEqual([]);
        trigger.onCommand({ name: 'play', options: {} });
        await vi.advanceTimersByTimeAsync(300);
        expect(player.calls).toEqual(['play:state']);
    });
});
