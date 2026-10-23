import type { IconData } from '@lordicon/utils-lottie';
import lock from '../../example/icons/dev/lock.json';
import type { Player } from '../player/player';
import type { Renderer } from '../player/renderer';

/**
 * A renderer that records the commands it gets, as `name(args)` strings; a tint and a rest show
 * only when set.
 */
export class StubRenderer implements Renderer {
    calls: string[] = [];

    look(colors: Readonly<Record<string, string>>, stroke: number, tint: string | null): void {
        const list = Object.entries(colors).map(([name, value]) => `${name}:${value}`);
        this.calls.push(`look(${list.join(',')};${stroke}${tint ? `;${tint}` : ''})`);
    }

    segment(begin: number, end: number): void {
        this.calls.push(`segment(${begin},${end})`);
    }

    playback(speed: number, direction: 1 | -1, loop: boolean, rest: number): void {
        this.calls.push(`playback(${speed},${direction},${loop}${rest ? `,${rest}` : ''})`);
    }

    play(token: number): void {
        this.calls.push(`play(${token})`);
    }

    pause(): void {
        this.calls.push('pause()');
    }

    seek(frame: number): void {
        this.calls.push(`seek(${frame})`);
    }

    /** Unknown, as a native renderer whose commands are still on their way. */
    frame(): number {
        return NaN;
    }

    /** The calls since the last `take()`. */
    take(): string[] {
        const calls = this.calls;
        this.calls = [];
        return calls;
    }
}

/**
 * A renderer that plays like the runtime's core (`Playback` in lordicon.cpp, rests between loop
 * rounds included): `advance(ms)` moves time on in display frames, and the end of a segment
 * completes the player's run.
 */
export class SimulatedRenderer extends StubRenderer {
    #player: Player | null = null;
    #frameRate: number;
    #begin = 0;
    #end = 0;
    #speed = 1;
    #direction: 1 | -1 = 1;
    #loop = false;
    #rest = 0;
    #resting = 0;
    #playing = false;
    #frame = 0;
    #token = 0;

    constructor(frameRate = 60) {
        super();
        this.#frameRate = frameRate;
    }

    /** Attaches the player, as a renderer does once it has the icon. */
    attach(player: Player): this {
        this.#player = player;
        player.attach(this);
        return this;
    }

    segment(begin: number, end: number): void {
        super.segment(begin, end);
        this.#begin = begin;
        this.#end = end;
        this.#frame = this.#direction > 0 ? begin : end;
        this.#resting = 0;
    }

    playback(speed: number, direction: 1 | -1, loop: boolean, rest: number): void {
        super.playback(speed, direction, loop, rest);
        this.#speed = speed;
        this.#direction = direction;
        this.#loop = loop;
        this.#rest = rest;
    }

    play(token: number): void {
        super.play(token);
        this.#token = token;
        this.#playing = true;
    }

    pause(): void {
        super.pause();
        this.#playing = false;
    }

    seek(frame: number): void {
        super.seek(frame);
        this.#frame = frame;
        this.#resting = 0;
    }

    frame(): number {
        return this.#frame;
    }

    /** Moves time on by `ms`, in display frames of 1/60 s. */
    advance(ms: number): void {
        for (let t = 0; t < ms; t += 1000 / 60) this.#tick(Math.min(1000 / 60, ms - t) / 1000);
    }

    #tick(dt: number): void {
        if (!this.#playing || this.#end <= this.#begin) return;
        if (this.#resting > 0) {
            if (!this.#loop) {
                this.#resting = 0;
                this.#playing = false;
                this.#player?.complete(this.#token);
                return;
            }
            this.#resting -= dt;
            if (this.#resting > 0) return;
            dt = -this.#resting;
            this.#resting = 0;
            this.#frame = this.#direction > 0 ? this.#begin : this.#end;
        }
        this.#frame += dt * this.#frameRate * this.#speed * this.#direction;
        if (this.#frame >= this.#begin && this.#frame <= this.#end) return;
        if (this.#loop && this.#rest > 0) {
            this.#frame = this.#direction > 0 ? this.#end : this.#begin;
            this.#resting = this.#rest;
            return;
        }
        if (this.#loop) {
            const length = this.#end - this.#begin;
            this.#frame =
                this.#direction > 0
                    ? this.#begin + ((this.#frame - this.#begin) % length)
                    : this.#end - ((this.#end - this.#frame) % length);
            return;
        }
        this.#frame = this.#direction > 0 ? this.#end : this.#begin;
        this.#playing = false;
        this.#player?.complete(this.#token);
    }
}

/**
 * The lock icon of the example app: in-reveal [0, 121), hover-locked [130, 191),
 * morph-unlocked [200, 261) (default), hover-unlocked [270, 331), at 60 fps. The file is
 * narrowed to its default state (`ip` 200, `op` 260), as lordicon.com gives a file with a state
 * chosen; `whole` widens it to every state, as the runtime does.
 */
export function lockIcon({ whole = true } = {}): IconData {
    const data = structuredClone(lock) as unknown as IconData;
    if (whole) [data.ip, data.op] = [0, 331];
    return data;
}
