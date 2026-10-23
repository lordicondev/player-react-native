import { createRuntime, Events, type Icon, type Runtime } from '@lordicon/runtime';
import { Pacer } from '../pacer';
import { assetOf, type Assets } from './assets';
import { Models, type WebSource } from './models';
import type { WebSurface } from './surface';

let runtime: Promise<Runtime> | null = null;
let models: Models | null = null;

/** The WebAssembly runtime, loaded once for every icon on the page. */
export function loadRuntime(assets?: Assets): Promise<Runtime> {
    runtime ??= createRuntime({ wasm: assetOf('lordicon.wasm', assets) });
    return runtime;
}

/** A renderer of the page's runtime, drawing from the model of its source. */
export function renderOnPage(
    runtime: Runtime,
    source: WebSource,
    onComplete: (token: number) => void,
): WebRenderer {
    models ??= new Models(runtime);
    const page = models;
    const icon = page.icon(source.id, source.json);
    return new WebRenderer(icon, onComplete, () => page.release(source.id, icon));
}

/** The registry let go of a source: the page's model of it goes with its last icon. */
export function forgetOnPage(source: number): void {
    models?.forget(source);
}

/**
 * Every icon that needs frames, ticked in one animation frame callback; each one's Pacer
 * decides whether a display frame is one of its frames (`frameRate`).
 */
const active = new Set<WebRenderer>();
let last = 0;

function frame(now: number): void {
    const dt = last ? (now - last) / 1000 : 0;
    last = now;
    for (const renderer of active) {
        const time = renderer.pacer.frame(dt);
        if (time >= 0 && !renderer.tick(time)) active.delete(renderer);
    }
    if (active.size) requestAnimationFrame(frame);
    else last = 0;
}

function schedule(renderer: WebRenderer): void {
    if (!active.size) requestAnimationFrame(frame);
    if (!active.has(renderer)) renderer.pacer.reset();
    active.add(renderer);
}

/**
 * Whether canvases are on screen, for every icon: one observer. An icon off screen (a list row
 * scrolled away) keeps its time but is not drawn; it draws its frame once it comes back.
 */
const watched = new Map<Element, WebRenderer>();
let observer: IntersectionObserver | null = null;

function watch(canvas: HTMLCanvasElement, renderer: WebRenderer): void {
    if (typeof IntersectionObserver === 'undefined') return;
    observer ??= new IntersectionObserver((entries) => {
        for (const entry of entries) watched.get(entry.target)?.setVisible(entry.isIntersecting);
    });
    watched.set(canvas, renderer);
    observer.observe(canvas);
}

function unwatch(canvas: HTMLCanvasElement | undefined): void {
    if (!canvas || !watched.delete(canvas)) return;
    observer?.unobserve(canvas);
}

/**
 * An icon of the WebAssembly runtime drawn on a canvas, as a `Renderer`. Like the native view,
 * it draws nothing until the first command: the player says which frame to show.
 */
export class WebRenderer implements WebSurface {
    readonly #icon: Icon;
    readonly #onComplete: (token: number) => void;
    readonly #onDestroy: () => void;
    #context: CanvasRenderingContext2D | null = null;
    #token = 0;
    #shown = false;
    #visible = true;
    /** A frame came while off screen: draw it once visible. */
    #stale = false;
    /** The frame rate limit (`render.frameRate`). */
    readonly pacer = new Pacer();

    /** `onDestroy` lets go of the icon (by default, destroys it). */
    constructor(icon: Icon, onComplete: (token: number) => void, onDestroy = () => icon.destroy()) {
        this.#icon = icon;
        this.#onComplete = onComplete;
        this.#onDestroy = onDestroy;
    }

    /** Frames per second at most; 0 for every display frame. */
    setFrameRate(limit: number): void {
        this.pacer.limit = limit;
    }

    attach(canvas: HTMLCanvasElement, pixels: number): void {
        unwatch(this.#context?.canvas);
        canvas.width = canvas.height = pixels;
        this.#context = canvas.getContext('2d');
        watch(canvas, this);
        this.redraw();
    }

    resize(pixels: number): void {
        const canvas = this.#context?.canvas;
        if (!canvas || canvas.width === pixels) return;
        canvas.width = canvas.height = pixels;
        this.redraw();
    }

    /** From the observer: the canvas came on screen or went off it. */
    setVisible(visible: boolean): void {
        this.#visible = visible;
        if (visible && this.#stale) {
            this.#stale = false;
            this.redraw();
        }
    }

    look(colors: Readonly<Record<string, string>>, stroke: number, tint: string | null): void {
        for (const [name, value] of Object.entries(colors)) this.#icon.setColor(name, value);
        if (stroke >= 1 && stroke <= 3) this.#icon.setStroke(stroke as 1 | 2 | 3);
        this.#icon.setTint(tint);
        this.redraw();
    }

    segment(begin: number, end: number): void {
        this.#icon.segment(begin, end);
        this.#command();
    }

    playback(speed: number, direction: 1 | -1, loop: boolean, rest: number): void {
        this.#icon.playback({ speed, direction, loop, rest });
        this.#command();
    }

    play(token: number): void {
        this.#token = token;
        this.#icon.play();
        this.#command();
    }

    pause(): void {
        this.#icon.pause();
        this.#command();
    }

    seek(frame: number): void {
        this.#icon.seek(frame);
        this.#command();
    }

    /** Draws the current frame again (new canvas size, colours). */
    redraw(): void {
        if (!this.#shown) return;
        this.#icon.seek(this.#icon.frame);
        schedule(this);
    }

    /** The frame the runtime is on: the same thread, so always known. */
    frame(): number {
        return this.#icon.frame;
    }

    /** One animation frame; false when the icon needs no more. */
    tick(dt: number): boolean {
        const events = this.#icon.tick(dt);
        const context = this.#context;
        if (events & Events.frame && context && context.canvas.width && context.canvas.height) {
            if (this.#visible) this.#icon.draw(context);
            else this.#stale = true;
        }
        if (events & Events.complete) this.#onComplete(this.#token);
        return this.#icon.playing;
    }

    destroy(): void {
        unwatch(this.#context?.canvas);
        active.delete(this);
        this.#onDestroy();
    }

    #command(): void {
        this.#shown = true;
        schedule(this);
    }
}
