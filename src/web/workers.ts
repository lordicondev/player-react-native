import { loadError, type LordIconLoadError } from '../errors';
import { assetOf, type Assets } from './assets';
import type { WebSource } from './models';
import type { WebSurface } from './surface';
import type { Command, FromWorker, ToWorker } from './worker';

/** Whether this browser can draw in a worker: OffscreenCanvas and module workers. */
export function workersSupported(): boolean {
    return (
        typeof Worker !== 'undefined' &&
        typeof OffscreenCanvas !== 'undefined' &&
        typeof HTMLCanvasElement !== 'undefined' &&
        'transferControlToOffscreen' in HTMLCanvasElement.prototype
    );
}

interface PoolWorker {
    worker: Worker;
    icons: Map<number, WorkerRenderer>;
    stats?: (stats: WorkerStats) => void;
}

/** A render worker's frames per second and time per frame since the last reading. */
export interface WorkerStats {
    fps: number;
    frameMs: number;
    icons: number;
}

/** Render workers, started on first use; a new icon goes to the one with the fewest. */
class Pool {
    readonly #workers: PoolWorker[] = [];
    readonly #assets: Assets | undefined;
    #lastId = 0;

    constructor(assets: Assets | undefined) {
        this.#assets = assets;
    }

    add(size: number, source: WebSource, onComplete: (token: number) => void): WorkerRenderer {
        const target = this.#pick(Math.max(1, size));
        const id = ++this.#lastId;
        const renderer = new WorkerRenderer(target.worker, id, onComplete, () =>
            target.icons.delete(id),
        );
        target.icons.set(id, renderer);
        renderer.post({ type: 'add', id, source: source.id, json: source.json });
        return renderer;
    }

    /** The registry let go of a source: each worker's model of it goes with its last icon. */
    forget(source: number): void {
        for (const { worker } of this.#workers) {
            worker.postMessage({ type: 'forget', id: 0, source } satisfies ToWorker);
        }
    }

    /** Each worker's frames and time since the last reading (measurements). */
    stats(): Promise<WorkerStats[]> {
        return Promise.all(
            this.#workers.map(
                (entry) =>
                    new Promise<WorkerStats>((resolve) => {
                        entry.stats = resolve;
                        entry.worker.postMessage({ type: 'stats', id: 0 } satisfies ToWorker);
                    }),
            ),
        );
    }

    #pick(size: number): PoolWorker {
        if (this.#workers.length < size) {
            // The package's build points this at dist/lordicon.worker.js.
            const url = assetOf('lordicon.worker.js', this.#assets);
            const worker =
                typeof url === 'string'
                    ? new Worker(url, { type: 'module' })
                    : new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
            const wasm = assetOf('lordicon.wasm', this.#assets);
            worker.postMessage({ type: 'init', id: 0, wasm } satisfies ToWorker);
            const entry: PoolWorker = { worker, icons: new Map() };
            // The worker's script did not load (or failed before it could answer): icons
            // waiting for it would wait for ever.
            worker.onerror = (event) => {
                const error = loadError('worker', event.message || url || 'lordicon.worker.js');
                for (const icon of entry.icons.values()) icon.fail(error);
            };
            worker.onmessage = ({ data }: MessageEvent<FromWorker>) => {
                if (data.type === 'stats') entry.stats?.(data);
                else entry.icons.get(data.id)?.receive(data);
            };
            this.#workers.push(entry);
            return entry;
        }
        return this.#workers.reduce((a, b) => (b.icons.size < a.icons.size ? b : a));
    }
}

let pool: Pool | null = null;

/** The render workers' frames per second and time per frame (measurements, the example's bench). */
export function workerStats(): Promise<WorkerStats[]> {
    return pool?.stats() ?? Promise.resolve([]);
}

/**
 * An icon in a render worker of the pool (`size`: how many workers at most). The first icons on
 * the page decide where the files are (`assets`).
 */
export function addToWorker(
    size: number,
    source: WebSource,
    onComplete: (token: number) => void,
    assets?: Assets,
): WorkerRenderer {
    pool ??= new Pool(assets);
    return pool.add(size, source, onComplete);
}

/** The registry let go of a source (src/web/registry.ts). */
export function forgetInWorkers(source: number): void {
    pool?.forget(source);
}

/**
 * An icon drawn in a render worker, as a `Renderer`: commands are messages. The frame is known
 * once the worker has applied every command and the icon is not playing; otherwise the player
 * counts it from the time.
 */
export class WorkerRenderer implements WebSurface {
    readonly #worker: Worker;
    readonly #id: number;
    readonly #onComplete: (token: number) => void;
    readonly #onDestroy: () => void;
    #resolveLoaded!: (error: LordIconLoadError | null) => void;
    /** Resolves once the worker has the icon (null), or with why it could not load it. */
    readonly loaded = new Promise<LordIconLoadError | null>(
        (resolve) => (this.#resolveLoaded = resolve),
    );
    #sent = 0;
    #applied = 0;
    #frame = NaN;
    #playing = false;
    #canvas: HTMLCanvasElement | null = null;

    constructor(
        worker: Worker,
        id: number,
        onComplete: (token: number) => void,
        onDestroy: () => void,
    ) {
        this.#worker = worker;
        this.#id = id;
        this.#onComplete = onComplete;
        this.#onDestroy = onDestroy;
    }

    post(message: ToWorker, transfer: Transferable[] = []): void {
        this.#worker.postMessage(message, transfer);
    }

    receive(message: FromWorker): void {
        if (message.type === 'loaded') {
            const { error } = message;
            this.#resolveLoaded(error ? loadError(error.kind, error.message) : null);
        } else if (message.type === 'applied') {
            this.#applied++;
            this.#frame = message.frame;
        } else if (message.type === 'complete') {
            this.#playing = false;
            this.#frame = message.frame;
            this.#onComplete(message.token);
        }
    }

    /** The icon will not load (its worker did not start); a later answer changes nothing. */
    fail(error: LordIconLoadError): void {
        this.#resolveLoaded(error);
    }

    attach(canvas: HTMLCanvasElement, pixels: number): void {
        if (this.#canvas) return;
        this.#canvas = canvas;
        canvas.width = canvas.height = pixels;
        const offscreen = canvas.transferControlToOffscreen();
        this.post({ type: 'canvas', id: this.#id, canvas: offscreen }, [offscreen]);
        watch(canvas, this);
    }

    resize(pixels: number): void {
        this.post({ type: 'size', id: this.#id, pixels });
    }

    setFrameRate(limit: number): void {
        this.post({ type: 'frameRate', id: this.#id, limit });
    }

    setVisible(visible: boolean): void {
        this.post({ type: 'visible', id: this.#id, visible });
    }

    look(colors: Readonly<Record<string, string>>, stroke: number, tint: string | null): void {
        this.#command(['look', { ...colors }, stroke, tint]);
    }

    segment(begin: number, end: number): void {
        this.#command(['segment', begin, end]);
    }

    playback(speed: number, direction: 1 | -1, loop: boolean, rest: number): void {
        this.#command(['playback', speed, direction, loop, rest]);
    }

    play(token: number): void {
        this.#playing = true;
        this.#command(['play', token]);
    }

    pause(): void {
        this.#playing = false;
        this.#command(['pause']);
    }

    seek(frame: number): void {
        this.#command(['seek', frame]);
    }

    frame(): number {
        return !this.#playing && this.#applied >= this.#sent ? this.#frame : NaN;
    }

    destroy(): void {
        if (this.#canvas) unwatch(this.#canvas);
        this.post({ type: 'remove', id: this.#id });
        this.#onDestroy();
    }

    #command(command: Command): void {
        this.#sent++;
        this.post({ type: 'command', id: this.#id, command });
    }
}

// Whether canvases are on screen: the worker skips drawing those that are not.
const watched = new Map<Element, WorkerRenderer>();
let observer: IntersectionObserver | null = null;

function watch(canvas: HTMLCanvasElement, renderer: WorkerRenderer): void {
    if (typeof IntersectionObserver === 'undefined') return;
    observer ??= new IntersectionObserver((entries) => {
        for (const entry of entries) watched.get(entry.target)?.setVisible(entry.isIntersecting);
    });
    watched.set(canvas, renderer);
    observer.observe(canvas);
}

function unwatch(canvas: HTMLCanvasElement): void {
    if (watched.delete(canvas)) observer?.unobserve(canvas);
}
