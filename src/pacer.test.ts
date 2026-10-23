import { describe, expect, it } from 'vitest';
import { Pacer } from './pacer';

/** Ticks per second and the time they carry, over `seconds` of a display at `hz` (± jitter). */
function run(limit: number, hz: number, seconds = 2, jitter = 0) {
    const pacer = new Pacer(limit);
    pacer.reset();
    let ticks = 0;
    let time = 0;
    const frames = Math.round(hz * seconds);
    for (let i = 0; i < frames; i++) {
        const dt = 1 / hz + (i % 2 ? jitter : -jitter);
        const tick = pacer.frame(i ? dt : 0);
        if (tick >= 0) {
            ticks++;
            time += tick;
        }
    }
    return { rate: ticks / seconds, time };
}

describe('Pacer', () => {
    it('ticks every display frame without a limit', () => {
        expect(run(0, 120).rate).toBe(120);
        expect(run(0, 60).rate).toBe(60);
    });

    it.each([
        [60, 120, 60],
        [60, 90, 60],
        [60, 144, 60], // two or three display frames a tick
        [60, 60, 60],
        [30, 120, 30],
        [50, 60, 50],
        [120, 60, 60],
    ])('limits to %i fps on a %i Hz display: %i', (limit, hz, rate) => {
        expect(Math.abs(run(limit, hz).rate - rate)).toBeLessThanOrEqual(1);
    });

    it('holds the rate with jittery display frames', () => {
        expect(Math.abs(run(60, 120, 2, 0.0004).rate - 60)).toBeLessThanOrEqual(1);
        expect(Math.abs(run(30, 120, 2, 0.0004).rate - 30)).toBeLessThanOrEqual(1);
    });

    it('loses no time: the ticks carry all of it', () => {
        const { time } = run(60, 90);
        expect(time).toBeCloseTo(2 - 1 / 90, 2);
    });

    it('ticks on the first display frame after a reset', () => {
        const pacer = new Pacer(30);
        pacer.reset();
        expect(pacer.frame(0)).toBe(0);
        expect(pacer.frame(1 / 120)).toBe(-1);
    });

    it('adds up the time of frames it waited through, without a burst after', () => {
        const pacer = new Pacer(60);
        pacer.reset();
        pacer.frame(0);
        for (let i = 0; i < 6; i++) pacer.wait(1 / 120);
        expect(pacer.frame(1 / 120)).toBeCloseTo(7 / 120);
        expect(pacer.frame(1 / 120)).toBe(-1);
    });
});
