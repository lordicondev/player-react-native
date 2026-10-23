// From @lordicon/web's lifecycle tests, for a player whose renderer comes later (attach()).
import { describe, expect, it, vi } from 'vitest';
import { lockIcon, SimulatedRenderer, StubRenderer } from '../testing/renderer';
import { Player } from './player';

describe('lifecycle', () => {
    it('is ready once attached, and sends what was set before', async () => {
        const player = new Player(lockIcon(), { state: 'hover-locked' });
        player.speed = 3;
        player.direction = -1;
        player.loop = true;
        player.colors.primary = 'red';
        player.stroke = 'bold';
        expect(player.ready).toBe(false);

        const renderer = new StubRenderer();
        player.attach(renderer);
        expect(renderer.take()).toEqual([
            'look(primary:#ff0000,secondary:#08a88a;3)',
            'segment(130,190)',
            'playback(3,-1,true)',
            'seek(130)', // where it rests; play() backwards starts from the other end
        ]);
        expect(player.ready).toBe(true);
        await expect(player.readyPromise).resolves.toBe(true);
    });

    it('sends a play() asked for before it is attached, and settles it then', async () => {
        const player = new Player(lockIcon(), { state: 'in-reveal' });
        const done = player.play();
        expect(player.playing).toBe(true);

        const renderer = new SimulatedRenderer().attach(player);
        expect(renderer.take().slice(-1)).toEqual(['play(1)']);
        renderer.advance(2100);
        await expect(done).resolves.toBe(true);
    });

    it('sends everything again when attached again (the view reloaded the icon)', () => {
        const player = new Player(lockIcon(), { state: 'hover-locked' });
        const ready = vi.fn();
        player.addEventListener('ready', ready);
        const renderer = new StubRenderer();
        player.attach(renderer);
        player.seek(150);
        renderer.take();

        player.attach(renderer);
        expect(renderer.take()).toEqual([
            'look(primary:#121331,secondary:#08a88a;2)',
            'segment(130,190)',
            'playback(1,1,false)',
            'seek(150)',
        ]);
        expect(ready).toHaveBeenCalledOnce();
    });

    it('replays ready to a listener that comes late', async () => {
        const player = new Player(lockIcon());
        player.attach(new StubRenderer());
        const late = vi.fn();
        const aborted = vi.fn();
        const controller = new AbortController();

        player.addEventListener('ready', late, { once: true });
        player.addEventListener('ready', aborted, { signal: controller.signal });
        controller.abort();
        await Promise.resolve();

        expect(late).toHaveBeenCalledOnce();
        expect(aborted).not.toHaveBeenCalled();
    });

    it('can be destroyed twice, and settles a pending play', async () => {
        const player = new Player(lockIcon());
        new SimulatedRenderer().attach(player);
        const destroyed = vi.fn();
        const paused = vi.fn();
        player.addEventListener('destroy', destroyed);
        player.addEventListener('pause', paused);
        const pending = player.play();

        player.destroy();
        player.destroy();

        expect(destroyed).toHaveBeenCalledOnce();
        expect(paused).toHaveBeenCalledOnce();
        expect(player.playing).toBe(false);
        await expect(pending).resolves.toBe(false);
    });

    it('takes null for properties and starts on the default state', () => {
        const player = new Player(lockIcon(), null);
        expect(player.state).toBe('morph-unlocked');
        expect(player.segment).toEqual([200, 261]);
    });

    it('settles readyPromise with false when destroyed before it is attached', async () => {
        const player = new Player(lockIcon());
        player.destroy();
        player.attach(new StubRenderer());
        await expect(player.readyPromise).resolves.toBe(false);
    });

    it('removes listeners, and on() returns the removal', () => {
        const player = new Player(lockIcon());
        player.attach(new StubRenderer());
        const removed = vi.fn();
        const off = vi.fn();
        player.addEventListener('play', removed);
        player.removeEventListener('play', removed);
        player.on('play', off)();

        player.play();
        expect(removed).not.toHaveBeenCalled();
        expect(off).not.toHaveBeenCalled();
    });
});

describe('a file narrowed to one state', () => {
    it('plays every state its markers name, as @lordicon/web', () => {
        const player = new Player(lockIcon({ whole: false })); // ip 200, op 260
        expect(player.states.map((state) => state.name)).toEqual([
            'in-reveal',
            'hover-locked',
            'morph-unlocked',
            'hover-unlocked',
        ]);
        expect(player.state).toBe('morph-unlocked'); // its default
        player.state = 'hover-locked';
        expect(player.state).toBe('hover-locked');
        player.state = '*';
        expect(player.segment).toEqual([0, 331]);
    });
});
