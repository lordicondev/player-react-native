// From @lordicon/web's playback tests, on a renderer that plays like the runtime's core.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { lockIcon, SimulatedRenderer, StubRenderer } from '../testing/renderer';
import { Player, type PlayOptions } from './player';

/** A hover-locked player: segment [130, 191), 61 frames at 60 fps, about a second. */
function mount(state = 'hover-locked') {
    const player = new Player(lockIcon(), { state });
    const renderer = new SimulatedRenderer().attach(player);
    return { player, advance: (ms: number) => renderer.advance(ms), renderer };
}

describe('play', () => {
    it('plays the segment and resolves true at its end', async () => {
        const { player, advance } = mount();
        const complete = vi.fn();
        player.addEventListener('complete', (event) => complete(event.detail));

        const done = player.play();
        advance(1100);

        await expect(done).resolves.toBe(true);
        expect(player.frame).toBe(190);
        expect(complete).toHaveBeenCalledWith({
            segment: [130, 191],
            direction: 1,
            state: 'hover-locked',
        });
    });

    it('starts over once the segment has finished', async () => {
        const { player, advance } = mount();
        player.play();
        advance(1100);

        const again = player.play();
        expect(player.frame).toBe(130);
        advance(1100);
        await expect(again).resolves.toBe(true);
    });

    it('loads a state and plays it from the start', () => {
        const { player } = mount();
        player.play({ state: 'hover-unlocked' });

        expect(player.state).toBe('hover-unlocked');
        expect(player.segment).toEqual([270, 331]);
        expect(player.frame).toBe(270);
        expect(player.playing).toBe(true);
    });

    it('plays a segment backwards from its end', async () => {
        const { player, advance } = mount();
        const complete = vi.fn();
        player.addEventListener('complete', (event) => complete(event.detail.direction));

        const done = player.play({ segment: [200, 231], reverse: true });
        expect(player.direction).toBe(-1);
        expect(player.frame).toBe(230);

        advance(600);
        await expect(done).resolves.toBe(true);
        expect(player.frame).toBe(200);
        expect(complete).toHaveBeenCalledWith(-1);
    });

    it('restarts from the start mid-play with from: start', () => {
        const { player, advance } = mount();
        player.play();
        advance(500);
        expect(player.frame).toBeGreaterThan(150);

        player.play({ from: 'start' });
        expect(player.frame).toBe(130);
    });

    it('resolves false when another playback takes over', async () => {
        const { player, advance } = mount();
        const first = player.play();
        advance(200);
        const second = player.play({ state: 'hover-unlocked' });

        await expect(first).resolves.toBe(false);
        advance(1100);
        await expect(second).resolves.toBe(true);
    });

    it('ignores a completion of a playback that was taken over', async () => {
        const { player, renderer } = mount();
        player.play();
        const [token] = renderer.calls.filter((c) => c.startsWith('play(')).slice(-1);
        player.play({ from: 'start' });

        expect(player.complete(Number(token.slice(5, -1)))).toBe(false);
        expect(player.playing).toBe(true);
    });

    it('keeps the promise through a pause and resumes where it was', async () => {
        const { player, advance } = mount();
        const first = player.play();
        advance(300);
        player.pause();
        const at = player.frame;
        advance(300);
        expect(player.frame).toBe(at);

        const resumed = player.play();
        expect(resumed).toBe(first);
        advance(1100);
        await expect(first).resolves.toBe(true);
    });

    it('completes once per play, and can start over from the handler', () => {
        const { player, advance } = mount();
        let rounds = 0;
        player.addEventListener('complete', () => {
            rounds++;
            if (rounds < 3) player.play({ from: 'start' });
        });

        player.play();
        advance(3500);
        expect(rounds).toBe(3);
        expect(player.playing).toBe(false);
    });

    it('plays backwards from the end after direction = -1', async () => {
        const { player, advance } = mount();
        const complete = vi.fn();
        player.addEventListener('complete', (event) => complete(event.detail.direction));
        player.seek('end');
        player.direction = -1;

        const done = player.play();
        advance(1100);
        await expect(done).resolves.toBe(true);
        expect(player.frame).toBe(130);
        expect(complete).toHaveBeenCalledWith(-1);
    });

    it('turns around mid-play when the direction changes', async () => {
        const { player, advance } = mount();
        const done = player.play();
        advance(300);
        player.direction = -1;
        advance(600);

        await expect(done).resolves.toBe(true);
        expect(player.frame).toBe(130);
    });
});

describe('stop and seek', () => {
    it('stops on the first frame and settles', async () => {
        const { player, advance } = mount();
        const done = player.play();
        advance(300);
        player.stop();

        await expect(done).resolves.toBe(false);
        expect(player.frame).toBe(130);
        expect(player.playing).toBe(false);
    });

    it('seeks absolute frames within the segment', () => {
        const { player } = mount();
        player.seek(150);
        expect(player.frame).toBe(150);
        player.seek(999);
        expect(player.frame).toBe(190);
        player.seek('start');
        expect(player.frame).toBe(130);
        player.seek('end');
        expect(player.frame).toBe(190);
    });

    it('seeks to the end of the state, not of the file', () => {
        const { player } = mount('in-reveal');
        player.seek('end');
        expect(player.frame).toBe(120);

        player.state = 'hover-unlocked';
        player.seek('end');
        expect(player.frame).toBe(330);
    });

    it('reads and sets progress', () => {
        const { player } = mount();
        player.progress = 0.5;
        expect(player.frame).toBe(160);
        expect(player.progress).toBe(0.5);
        player.progress = 2;
        expect(player.frame).toBe(190);
    });
});

describe('segment and state', () => {
    it('loads a segment and rests on its first frame; null goes back to the state', async () => {
        const { player } = mount();
        const done = player.play();
        player.segment = [140, 161];

        await expect(done).resolves.toBe(false);
        expect(player.frame).toBe(140);
        expect(player.playing).toBe(false);

        player.segment = null;
        expect(player.segment).toEqual([130, 191]);
    });

    it('plays a set segment from its start', async () => {
        const { player, advance } = mount();
        player.segment = [140, 161];

        const done = player.play();
        expect(player.frame).toBe(140);
        advance(500);
        await expect(done).resolves.toBe(true);
        expect(player.frame).toBe(160);
    });

    it('keeps playing through a state change', () => {
        const { player, advance } = mount();
        player.play();
        advance(300);
        player.state = 'hover-unlocked';

        expect(player.segment).toEqual([270, 331]);
        expect(player.frame).toBe(270);
        expect(player.playing).toBe(true);
    });

    it('resolves the state name: default, whole file, unknown', () => {
        const { player } = mount();
        player.state = null;
        expect(player.state).toBe('morph-unlocked');
        player.state = '*';
        expect(player.state).toBeNull();
        expect(player.segment).toEqual([0, 331]);
        player.state = 'nope';
        expect(player.state).toBe('morph-unlocked');
        expect(player.currentState).toEqual({
            name: 'morph-unlocked',
            time: 200,
            duration: 60,
            params: [],
            default: true,
        });
        player.state = '*';
        expect(player.currentState).toBeNull();
        expect(player.states.map((state) => state.name)).toContain('in-reveal');
    });

    it('counts frames and seconds', () => {
        const { player } = mount();
        expect(player.frameCount).toBe(61);
        expect(player.frameRate).toBe(60);
        expect(player.duration).toBeCloseTo(61 / 60);
        player.speed = 2;
        expect(player.duration).toBeCloseTo(61 / 120);
    });
});

describe('a file without markers', () => {
    /** The lock icon without its markers: the file's own frames, [200, 260). */
    function bare() {
        const player = new Player({ ...lockIcon({ whole: false }), markers: [] });
        const renderer = new SimulatedRenderer().attach(player);
        return { player, advance: (ms: number) => renderer.advance(ms) };
    }

    it('plays the whole file', async () => {
        const { player, advance } = bare();
        expect(player.states).toEqual([]);
        expect(player.state).toBeNull();
        expect(player.segment).toEqual([200, 260]);
        expect(player.frameCount).toBe(60);

        const done = player.play({ from: 'start' });
        advance(1100);
        await expect(done).resolves.toBe(true);
        expect(player.frame).toBe(259);
    });

    it('goes back to the whole file for no state, the whole file, and no segment', async () => {
        const { player, advance } = bare();

        const done = player.play({ state: null });
        expect(player.segment).toEqual([200, 260]);
        expect(player.frame).toBe(200);
        advance(1100);
        await expect(done).resolves.toBe(true);

        player.state = '*';
        expect(player.segment).toEqual([200, 260]);

        player.segment = [210, 221];
        player.segment = null;
        expect(player.segment).toEqual([200, 260]);
    });

    it('scrubs through the whole file', () => {
        const { player } = bare();
        player.progress = 0.5;
        expect(player.frame).toBeCloseTo(229.5);
        player.seek('end');
        expect(player.frame).toBe(259);
    });
});

describe('loop', () => {
    it('does not complete until stopped', async () => {
        const { player, advance } = mount();
        const complete = vi.fn();
        player.addEventListener('complete', complete);
        player.loop = true;

        const done = player.play();
        advance(2500);
        expect(complete).not.toHaveBeenCalled();
        expect(player.playing).toBe(true);
        expect(player.frame).toBeGreaterThanOrEqual(130);
        expect(player.frame).toBeLessThanOrEqual(190);

        player.stop();
        await expect(done).resolves.toBe(false);
    });

    it('rests on the last frame between rounds, in the renderer', () => {
        const { player, advance, renderer } = mount();
        player.loop = true;
        player.rest = 0.5;
        expect(renderer.take()).toContain('playback(1,1,true,0.5)');

        player.play();
        advance(1000); // past the end of the first round (61 frames)
        expect(player.frame).toBe(190);
        advance(400); // still resting
        expect(player.frame).toBe(190);
        advance(300); // the next round
        expect(player.frame).toBeGreaterThan(130);
        expect(player.frame).toBeLessThan(150);
        expect(player.playing).toBe(true);
    });

    it('ends during a rest once the loop is off, completing play()', async () => {
        const { player, advance } = mount();
        player.loop = true;
        player.rest = 1;
        const done = player.play();
        advance(1200);
        expect(player.frame).toBe(190);
        player.loop = false;
        advance(20);
        await expect(done).resolves.toBe(true);
        expect(player.playing).toBe(false);
        expect(player.frame).toBe(190);
    });
});

describe('play and pause events', () => {
    /** The player's play and pause events, and complete, in the order they came. */
    function record(player: Player): string[] {
        const seen: string[] = [];
        for (const name of ['play', 'pause', 'complete'] as const) {
            player.addEventListener(name, () => seen.push(name));
        }
        return seen;
    }

    it('come when playing starts and stops, once each', () => {
        const { player } = mount();
        const seen = record(player);

        player.play();
        player.play();
        expect(seen).toEqual(['play']);

        player.pause();
        player.pause();
        expect(seen).toEqual(['play', 'pause']);
        expect(player.playing).toBe(false);
    });

    it('pause at the end, before complete', () => {
        const { player, advance } = mount();
        const seen = record(player);

        player.play();
        advance(1100);
        expect(seen).toEqual(['play', 'pause', 'complete']);
    });

    it('pause on stop, seek, progress and a new segment', () => {
        const { player } = mount();
        const seen = record(player);
        const cases: (() => void)[] = [
            () => player.stop(),
            () => player.seek(150),
            () => (player.progress = 0.5),
            () => (player.segment = [130, 160]),
        ];

        for (const stopIt of cases) {
            player.play();
            stopIt();
        }
        expect(seen).toEqual(['play', 'pause', 'play', 'pause', 'play', 'pause', 'play', 'pause']);
    });

    it('stay quiet when playback goes on: a new state or play() with options, a loop', () => {
        const { player, advance } = mount();
        const seen = record(player);

        player.play();
        player.state = 'hover-unlocked';
        player.play({ state: 'hover-locked' });
        player.play({ from: 'start', reverse: true });
        expect(seen).toEqual(['play']);

        player.loop = true;
        advance(2500);
        expect(seen).toEqual(['play']);
    });

    it('pause on destroy, while playing', () => {
        const { player } = mount();
        const seen = record(player);
        player.play();

        player.destroy();
        expect(seen).toEqual(['play', 'pause']);
    });
});

describe('subclassing', () => {
    it('routes every playback through play()', () => {
        const seen: PlayOptions[] = [];

        class Zoned extends Player {
            play(options: PlayOptions = {}): Promise<boolean> {
                seen.push(options);
                return super.play(options);
            }
        }

        const player = new Zoned(lockIcon(), { state: 'hover-locked' });
        new SimulatedRenderer().attach(player);
        player.play();
        player.state = 'hover-unlocked';

        expect(seen).toEqual([{}, { from: 'start', reverse: false }]);
    });
});

describe('the frame while commands are on their way', () => {
    afterEach(() => vi.useRealTimers());

    it('rests where it was sent, and runs on the clock while playing', () => {
        vi.useFakeTimers({ toFake: ['performance', 'Date'] });
        const player = new Player(lockIcon(), { state: 'hover-locked' });
        player.attach(new StubRenderer()); // its frame() is unknown, like a busy native view

        player.seek(150);
        expect(player.frame).toBe(150);

        player.play();
        vi.advanceTimersByTime(500); // 30 frames at 60 fps
        expect(player.frame).toBeCloseTo(180, 0);
        vi.advanceTimersByTime(1000);
        expect(player.frame).toBe(190);

        player.loop = true;
        player.play({ from: 'start' });
        vi.advanceTimersByTime(1500); // 90 frames over a span of 60
        expect(player.frame).toBeCloseTo(160, 0);

        player.pause();
        const at = player.frame;
        vi.advanceTimersByTime(500);
        expect(player.frame).toBe(at);
    });

    it('runs on the clock through the rests of a loop', () => {
        vi.useFakeTimers({ toFake: ['performance', 'Date'] });
        const player = new Player(lockIcon(), { state: 'hover-locked' });
        player.attach(new StubRenderer());
        player.loop = true;
        player.rest = 0.5;

        player.play({ from: 'start' }); // 130 to 190: a second, then half a second at 190
        vi.advanceTimersByTime(900);
        expect(player.frame).toBeCloseTo(184, 0);
        vi.advanceTimersByTime(300);
        expect(player.frame).toBe(190);
        vi.advanceTimersByTime(500); // 0.2 s into the next round: 12 frames
        expect(player.frame).toBeCloseTo(142, 0);
        vi.advanceTimersByTime(1500); // a whole round and rest later
        expect(player.frame).toBeCloseTo(142, 0);
    });
});
