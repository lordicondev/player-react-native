import type { Renderer } from '../player/renderer';
import NativeLordIcon from './NativeLordIcon';

let lastViewId = 0;

/** A new address for a native view: its `viewId` prop, where the module sends its commands. */
export function newViewId(): number {
    return ++lastViewId;
}

/**
 * The native view as a `Renderer`: commands through the module, dropped once the view is gone.
 * It counts what it sends, so a frame read waits until the view has applied all of it.
 */
export class NativeRenderer implements Renderer {
    readonly #viewId: number;
    #sent = 0;

    constructor(viewId: number) {
        this.#viewId = viewId;
    }

    look(colors: Readonly<Record<string, string>>, stroke: number, tint: string | null): void {
        const text = Object.entries(colors)
            .map(([name, value]) => `${name}:${value}`)
            .join(',');
        this.#sent++;
        NativeLordIcon.look(this.#viewId, text, stroke, tint ?? '');
    }

    segment(begin: number, end: number): void {
        this.#sent++;
        NativeLordIcon.segment(this.#viewId, begin, end);
    }

    playback(speed: number, direction: 1 | -1, loop: boolean, rest: number): void {
        this.#sent++;
        NativeLordIcon.playback(this.#viewId, speed, direction, loop, rest);
    }

    play(token: number): void {
        this.#sent++;
        NativeLordIcon.play(this.#viewId, token);
    }

    pause(): void {
        this.#sent++;
        NativeLordIcon.pause(this.#viewId);
    }

    seek(frame: number): void {
        this.#sent++;
        NativeLordIcon.seek(this.#viewId, frame);
    }

    frame(): number {
        return NativeLordIcon.frame(this.#viewId, this.#sent);
    }
}
