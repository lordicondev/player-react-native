/// <reference lib="webworker" />
// A render worker: its own WebAssembly runtime and clock, icons drawn on canvases the page
// transferred to it. The page sends commands; the worker answers once per command (where the
// icon is, for the player's reads) and when a segment completes. Nothing per frame.
import { createRuntime, Events, type Icon, type Runtime } from '@lordicon/runtime';
import { Pacer } from '../pacer';
import { Models } from './models';

export type Command =
    | ['look', Record<string, string>, number, string | null]
    | ['segment', number, number]
    | ['playback', number, 1 | -1, boolean, number]
    | ['play', number]
    | ['pause']
    | ['seek', number];

export type ToWorker =
    /** First: where the WebAssembly is (default: next to the worker's code). */
    | { type: 'init'; id: 0; wasm?: string | ArrayBuffer }
    /** An icon of a source (its number and JSON), drawn from the source's model here. */
    | { type: 'add'; id: number; source: number; json: string }
    /** The page's registry let go of a source. */
    | { type: 'forget'; id: 0; source: number }
    | { type: 'canvas'; id: number; canvas: OffscreenCanvas }
    | { type: 'size'; id: number; pixels: number }
    | { type: 'frameRate'; id: number; limit: number }
    | { type: 'visible'; id: number; visible: boolean }
    | { type: 'command'; id: number; command: Command }
    | { type: 'remove'; id: number }
    | { type: 'stats'; id: number };

export type FromWorker =
    /** `error`: what did not load (`wasm`, `icon`), with the cause's message. */
    | { type: 'loaded'; id: number; error?: { kind: 'wasm' | 'icon'; message: string } }
    | { type: 'applied'; id: number; frame: number }
    | { type: 'complete'; id: number; token: number; frame: number }
    /** Since the last stats: frames per second and the time icons took per frame. */
    | { type: 'stats'; id: number; fps: number; frameMs: number; icons: number };

interface Item {
    icon: Icon;
    source: number;
    context: OffscreenCanvasRenderingContext2D | null;
    pacer: Pacer;
    token: number;
    shown: boolean;
    visible: boolean;
    stale: boolean;
}

const scope = self as unknown as DedicatedWorkerGlobalScope;
let runtime: Promise<Runtime> | null = null;
let models: Models | null = null;
const items = new Map<number, Item>();
const active = new Set<number>();
const post = (message: FromWorker) => scope.postMessage(message);

// Workers have requestAnimationFrame in Chrome and Firefox; elsewhere a timer stands in.
const nextFrame: (callback: (now: number) => void) => void =
    'requestAnimationFrame' in scope
        ? (callback) => scope.requestAnimationFrame(callback)
        : (callback) => setTimeout(() => callback(performance.now()), 1000 / 60);
let last = 0;
let running = false;
const stats = { since: performance.now(), frames: 0, busyMs: 0 };

function frame(now: number): void {
    const dt = last ? (now - last) / 1000 : 0;
    last = now;
    const start = performance.now();
    for (const id of active) {
        const item = items.get(id);
        if (!item) {
            active.delete(id);
            continue;
        }
        const time = item.pacer.frame(dt);
        if (time < 0) continue;
        const events = item.icon.tick(time);
        const context = item.context;
        if (events & Events.frame && context && context.canvas.width) {
            if (item.visible) item.icon.draw(context);
            else item.stale = true;
        }
        if (events & Events.complete) {
            post({ type: 'complete', id, token: item.token, frame: item.icon.frame });
        }
        if (!item.icon.playing) active.delete(id);
    }
    stats.frames++;
    stats.busyMs += performance.now() - start;
    if (active.size) nextFrame(frame);
    else {
        running = false;
        last = 0;
    }
}

function schedule(id: number, item: Item): void {
    if (!item.shown) return;
    if (!active.has(id)) item.pacer.reset();
    active.add(id);
    if (!running) {
        running = true;
        nextFrame(frame);
    }
}

/** Draws the current frame again (new size, colours, back on screen). */
function redraw(id: number, item: Item): void {
    item.icon.seek(item.icon.frame);
    schedule(id, item);
}

function apply(item: Item, command: Command): void {
    const icon = item.icon;
    switch (command[0]) {
        case 'look':
            for (const [name, value] of Object.entries(command[1])) icon.setColor(name, value);
            if (command[2] >= 1 && command[2] <= 3) icon.setStroke(command[2] as 1 | 2 | 3);
            icon.setTint(command[3]);
            return;
        case 'segment':
            return icon.segment(command[1], command[2]);
        case 'playback':
            return icon.playback({
                speed: command[1],
                direction: command[2],
                loop: command[3],
                rest: command[4],
            });
        case 'play':
            item.token = command[1];
            return icon.play();
        case 'pause':
            return icon.pause();
        case 'seek':
            return icon.seek(command[1]);
    }
}

function messageOf(cause: unknown): string {
    return cause instanceof Error ? cause.message : String(cause);
}

/** One message; in order: the next waits until an icon has loaded. */
async function handle(data: ToWorker): Promise<void> {
    if (data.type === 'init') {
        runtime = createRuntime({ wasm: data.wasm });
        // Reported with the first icon (`loaded`), not as an unhandled rejection.
        runtime.catch(() => undefined);
        return;
    }
    if (data.type === 'stats') {
        const now = performance.now();
        const fps = (stats.frames * 1000) / (now - stats.since);
        const frameMs = stats.frames ? stats.busyMs / stats.frames : 0;
        post({ type: 'stats', id: data.id, fps, frameMs, icons: items.size });
        Object.assign(stats, { since: now, frames: 0, busyMs: 0 });
        return;
    }
    if (data.type === 'forget') {
        models?.forget(data.source);
        return;
    }
    if (data.type === 'add') {
        let loadedRuntime: Runtime;
        try {
            loadedRuntime = await (runtime ??= createRuntime());
        } catch (cause) {
            post({
                type: 'loaded',
                id: data.id,
                error: { kind: 'wasm', message: messageOf(cause) },
            });
            return;
        }
        try {
            models ??= new Models(loadedRuntime);
            const icon = models.icon(data.source, data.json);
            items.set(data.id, {
                icon,
                source: data.source,
                context: null,
                pacer: new Pacer(),
                token: 0,
                shown: false,
                visible: true,
                stale: false,
            });
            post({ type: 'loaded', id: data.id });
        } catch (cause) {
            post({
                type: 'loaded',
                id: data.id,
                error: { kind: 'icon', message: messageOf(cause) },
            });
        }
        return;
    }
    const item = items.get(data.id);
    if (!item) return;
    switch (data.type) {
        case 'canvas':
            item.context = data.canvas.getContext('2d');
            return;
        case 'size':
            if (item.context) {
                item.context.canvas.width = item.context.canvas.height = data.pixels;
            }
            return redraw(data.id, item);
        case 'frameRate':
            item.pacer.limit = data.limit;
            return;
        case 'visible':
            item.visible = data.visible;
            if (data.visible && item.stale) {
                item.stale = false;
                redraw(data.id, item);
            }
            return;
        case 'command':
            apply(item, data.command);
            post({ type: 'applied', id: data.id, frame: item.icon.frame });
            if (data.command[0] !== 'look' || item.shown) {
                item.shown = true;
                schedule(data.id, item);
            }
            return;
        case 'remove':
            models?.release(item.source, item.icon);
            items.delete(data.id);
            active.delete(data.id);
            return;
    }
}

let queue = Promise.resolve();
scope.onmessage = ({ data }: MessageEvent<ToWorker>) => {
    queue = queue.then(() => handle(data));
};
