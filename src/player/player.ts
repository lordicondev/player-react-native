import {
    readStates,
    stateSegment,
    type ColorMap,
    type IconData,
    type IconProperties,
    type IconState,
    type Segment,
    type Stroke,
} from '@lordicon/utils-lottie';
import { Emitter, type CompleteDetail, type PlayerEventType, type PlayerListener } from './events';
import { Looks } from './looks';
import type { Renderer } from './renderer';
import { resolveState, wholeFileOf } from './states';

/** What `play()` should play. Without options it resumes where the icon is. */
export interface PlayOptions {
    /** Load this state first. `null` is the default state, `'*'` the whole file. */
    state?: string | null;
    /** Load this segment first, `[start, end)` in absolute frames. */
    segment?: Segment;
    /** Start from the beginning of the loaded segment instead of resuming. */
    from?: 'start';
    /** Play backwards, from the end. */
    reverse?: boolean;
}

/** The constructor's second argument: icon properties to start with. */
export type InitialProperties = IconProperties | null | undefined;

/** One playback started by `play()`: its token for the renderer and its promise. */
class Run {
    readonly promise: Promise<boolean>;
    #resolve!: (completed: boolean) => void;

    constructor(readonly token: number) {
        this.promise = new Promise((resolve) => (this.#resolve = resolve));
    }

    settle(completed: boolean): void {
        this.#resolve(completed);
    }
}

const now = () => Date.now();

/**
 * Plays a Lordicon icon over a `Renderer`, with the API of `@lordicon/web`'s `Player`: states,
 * segments, colours, stroke, promises and events.
 *
 *     const player = new Player(data, { state: 'hover-jump' });
 *     await player.play();
 *
 * The renderer comes later than the player (the native view loads the icon first): until
 * `attach()`, the player keeps what to show and sends it all then. The renderer plays on
 * another thread: the player knows where playback rests (it sent it there), and reads the
 * frame from the renderer while it plays.
 *
 * Frames are absolute, as in the icon's markers; segments are `[start, end)`.
 */
export class Player {
    readonly #states: IconState[];
    readonly #wholeFile: Segment;
    readonly #frameRate: number;
    readonly #looks: Looks;
    readonly #events = new Emitter();
    readonly #ready: Promise<boolean>;
    #resolveReady!: (ready: boolean) => void;

    #renderer: Renderer | null = null;
    #destroyed = false;
    #state: IconState | null;
    #segment: Segment;
    #direction: 1 | -1 = 1;
    #speed = 1;
    #loop = false;
    #rest = 0;
    #playing = false;
    /** Where playback rests, or where the current playback set out from at `#since`. */
    #frame: number;
    #since = 0;
    #run: Run | null = null;
    #token = 0;
    #colors: ColorMap | null = null;
    #sentLook = '';

    constructor(data: IconData, properties?: InitialProperties) {
        this.#frameRate = data.fr || 30;
        this.#states = readStates(data);
        this.#wholeFile = wholeFileOf(data, this.#states);
        this.#state = resolveState(this.#states, properties?.state);
        this.#segment = this.#segmentOfState();
        this.#frame = this.#segment[0];
        this.#looks = new Looks(data);
        this.#looks.setColors(properties?.colors);
        this.#looks.stroke = properties?.stroke;
        this.#ready = new Promise((resolve) => (this.#resolveReady = resolve));
    }

    // Renderer

    /**
     * Hands the player its renderer (again, after it reloaded the icon), which then gets the
     * whole playback to show.
     */
    attach(renderer: Renderer): void {
        const frame = this.#playing ? this.#estimate() : this.#frame;
        const first = this.#renderer === null;
        this.#renderer = renderer;
        this.#sendLook(true);
        renderer.segment(this.#segment[0], this.#segment[1] - 1);
        renderer.playback(this.#speed, this.#direction, this.#loop, this.#rest);
        renderer.seek(frame);
        this.#frame = frame;
        if (this.#playing && this.#run) {
            this.#since = now();
            renderer.play(this.#run.token);
        }
        if (first && !this.#destroyed) {
            this.#resolveReady(true);
            this.#events.emit('ready', undefined);
        }
    }

    /**
     * The renderer played to the end of the segment; `token` is the one `play()` sent. False
     * when the completion is stale: another playback has started since.
     */
    complete(token: number): boolean {
        const run = this.#run;
        if (!run || run.token !== token) return false;
        const detail = this.#detail();
        this.#frame = this.#direction > 0 ? this.#segment[1] - 1 : this.#segment[0];
        this.#settle(true);
        this.#setPlaying(false);
        this.#events.emit('complete', detail);
        return true;
    }

    /**
     * Settles a pending `play()` and `readyPromise` with `false`. The renderer stays: a view
     * that is gone ignores commands, and React may run effect cleanups for a view that stays.
     */
    destroy(): void {
        if (this.#destroyed) return;
        this.#destroyed = true;
        this.#settle(false);
        this.#resolveReady(false);
        this.#setPlaying(false);
        this.#events.emit('destroy', undefined);
    }

    /** True once the renderer has the icon. */
    get ready(): boolean {
        return this.#renderer !== null;
    }

    /** Resolves `true` when the player is ready, `false` when `destroy()` comes first. */
    get readyPromise(): Promise<boolean> {
        return this.#ready;
    }

    // Playback

    /**
     * Plays. Without options it resumes where the icon is, and starts over from the other end
     * once the segment has finished. Resolves `true` when the segment plays to its end,
     * `false` when another playback, `stop()` or a new state or segment takes over first.
     *
     *     player.play({ state: 'hover-jump' });
     *     player.play({ segment: [130, 191], reverse: true });
     *     await player.play({ from: 'start' });
     */
    play(options: PlayOptions = {}): Promise<boolean> {
        const { state, segment, from, reverse } = options;
        const fresh =
            state !== undefined ||
            segment !== undefined ||
            from !== undefined ||
            reverse !== undefined;

        if (state !== undefined) this.#state = resolveState(this.#states, state);

        if (fresh) {
            this.#settle(false);
            this.#direction = reverse ? -1 : 1;
            const target = segment ?? (state !== undefined ? this.#segmentOfState() : null);
            this.#load(target ?? this.#segment);
        } else if (this.#atEnd()) {
            this.#settle(false);
            this.#seekTo(this.#direction > 0 ? this.#segment[0] : this.#segment[1] - 1);
        } else {
            this.#frame = this.frame;
        }

        this.#run ??= new Run(++this.#token);
        this.#since = now();
        this.#renderer?.play(this.#run.token);
        this.#setPlaying(true);
        return this.#run.promise;
    }

    /** Pauses on the current frame. A pending `play()` stays pending. */
    pause(): void {
        this.#frame = this.frame;
        this.#renderer?.pause();
        this.#setPlaying(false);
    }

    /** Pauses on the first frame of the segment. */
    stop(): void {
        this.#settle(false);
        this.#renderer?.pause();
        this.#seekTo(this.#segment[0]);
        this.#setPlaying(false);
    }

    /** Shows a frame of the loaded segment (absolute, or its first or last) and pauses. */
    seek(frame: number | 'start' | 'end'): void {
        const [start, end] = this.#segment;
        const target = frame === 'start' ? start : frame === 'end' ? end - 1 : frame;
        this.#renderer?.pause();
        this.#seekTo(Math.min(Math.max(target, start), end - 1));
        this.#setPlaying(false);
    }

    get playing(): boolean {
        return this.#playing;
    }

    /** Where playback is in the segment, 0 to 1. Setting it seeks. */
    get progress(): number {
        const span = this.frameCount - 1;
        return span > 0 ? (this.frame - this.#segment[0]) / span : 0;
    }

    set progress(value: number) {
        const span = this.frameCount - 1;
        this.seek(this.#segment[0] + Math.min(Math.max(value, 0), 1) * span);
    }

    /** The frame on screen, absolute. */
    get frame(): number {
        const read = this.#renderer?.frame();
        if (read !== undefined && Number.isFinite(read)) return read;
        return this.#playing ? this.#estimate() : this.#frame;
    }

    // What plays

    /** The state name, or null when the whole file plays. `null` sets the default state. */
    get state(): string | null {
        return this.#state?.name ?? null;
    }

    set state(name: string | null) {
        const next = resolveState(this.#states, name);
        if (next === this.#state) return;

        this.#state = next;
        this.#settle(false);
        this.#load(this.#segmentOfState());
        if (this.#playing) void this.play({ from: 'start', reverse: this.#direction < 0 });
    }

    /** The state as an object, for the state helpers: `splitSegment(player.currentState)`. */
    get currentState(): IconState | null {
        return this.#state;
    }

    /** The states the icon can play, from its markers. */
    get states(): IconState[] {
        return this.#states;
    }

    /**
     * The loaded segment, `[start, end)` in absolute frames. Setting it loads it and pauses
     * on its first frame; `null` goes back to the state's segment.
     */
    get segment(): Segment {
        return [...this.#segment];
    }

    set segment(segment: Segment | null) {
        this.#settle(false);
        this.#direction = 1;
        this.#renderer?.pause();
        this.#load(segment ?? this.#segmentOfState());
        this.#setPlaying(false);
    }

    /** Frames in the segment. The last one is `segment[1] - 1`. */
    get frameCount(): number {
        return this.#segment[1] - this.#segment[0];
    }

    get frameRate(): number {
        return this.#frameRate;
    }

    /** How long the segment plays, in seconds, at the current speed. */
    get duration(): number {
        return this.frameCount / this.#frameRate / Math.abs(this.#speed || 1);
    }

    // How it plays

    /** 1 forwards, -1 backwards. Changing it mid-play turns the animation around. */
    get direction(): 1 | -1 {
        return this.#direction;
    }

    set direction(direction: 1 | -1) {
        if (direction === this.#direction) return;
        this.#mark();
        this.#direction = direction;
        this.#sendPlayback();
    }

    get speed(): number {
        return this.#speed;
    }

    set speed(speed: number) {
        if (!(speed > 0) || speed === this.#speed) return;
        this.#mark();
        this.#speed = speed;
        this.#sendPlayback();
    }

    /** Plays the segment over and over; `play()` then resolves only when something stops it. */
    get loop(): boolean {
        return this.#loop;
    }

    set loop(loop: boolean) {
        if (loop === this.#loop) return;
        this.#mark();
        this.#loop = loop;
        this.#sendPlayback();
    }

    /**
     * Seconds on the last frame between loop rounds, for triggers such as `loop(1000)`: the
     * renderer holds it (a pause holds the rest too), so loops need nothing from JavaScript.
     */
    get rest(): number {
        return this.#rest;
    }

    set rest(seconds: number) {
        const rest = seconds > 0 ? seconds : 0;
        if (rest === this.#rest) return;
        this.#mark();
        this.#rest = rest;
        this.#sendPlayback();
    }

    // Looks

    /**
     * The icon's colours by name. Set one (`player.colors.primary = 'red'`), put one back
     * (`delete player.colors.primary`), or replace them all (`player.colors = { ... }`).
     */
    get colors(): ColorMap {
        this.#colors ??= this.#looks.proxy(() => this.#refresh());
        return this.#colors;
    }

    set colors(colors: ColorMap | null) {
        this.#looks.setColors(colors);
        this.#refresh();
    }

    /** The colours the icon comes with. */
    get defaultColors(): Readonly<ColorMap> {
        return this.#looks.defaults;
    }

    /** 1 (light), 2 (regular) or 3 (bold); null when the icon has no stroke setting. */
    get stroke(): Stroke | null {
        return this.#looks.stroke;
    }

    set stroke(stroke: Stroke | null) {
        this.#looks.stroke = stroke;
        this.#refresh();
    }

    /**
     * The whole icon in one colour, alpha kept (like CSS `currentColor`, or `tintColor`);
     * `null` for its own colours.
     */
    get tint(): string | null {
        return this.#looks.tint;
    }

    set tint(color: string | null) {
        this.#looks.tint = color;
        this.#refresh();
    }

    /** Colours, stroke and state at once. What is left out goes back to the icon's own. */
    get properties(): IconProperties {
        const properties: IconProperties = {};
        if (this.#looks.names.length) properties.colors = { ...this.colors };
        const stroke = this.stroke;
        if (stroke !== null) properties.stroke = stroke;
        if (this.state !== null) properties.state = this.state;
        return properties;
    }

    set properties(properties: IconProperties) {
        this.#looks.setColors(properties.colors);
        this.#looks.stroke = properties.stroke;
        this.#refresh();
        this.state = properties.state ?? null;
    }

    // Events

    /**
     * Listens to an event: `ready`, `complete` (with `detail`: segment, direction, state),
     * `play`, `pause`, `refresh`, `destroy`. A `ready` listener added once the player is ready
     * is called at once (in a microtask).
     */
    addEventListener<K extends PlayerEventType>(
        type: K,
        listener: PlayerListener<K>,
        options: { once?: boolean; signal?: AbortSignal } = {},
    ): void {
        const { once = false, signal } = options;
        if (signal?.aborted) return;
        if (type === 'ready' && this.ready) {
            void Promise.resolve().then(() => {
                if (!signal?.aborted) listener({ type, detail: undefined as never });
            });
            if (once) return;
        }
        this.#events.add(type, listener, once);
        signal?.addEventListener('abort', () => this.#events.remove(type, listener));
    }

    removeEventListener<K extends PlayerEventType>(type: K, listener: PlayerListener<K>): void {
        this.#events.remove(type, listener);
    }

    /** `addEventListener()` that returns its removal. */
    on<K extends PlayerEventType>(type: K, listener: PlayerListener<K>): () => void {
        this.addEventListener(type, listener);
        return () => this.removeEventListener(type, listener);
    }

    // Internals

    #segmentOfState(): Segment {
        return this.#state ? stateSegment(this.#state) : this.#wholeFile;
    }

    /** Loads a segment and rests on the frame playback in the current direction starts from. */
    #load(segment: Segment): void {
        this.#segment = [segment[0], segment[1]];
        this.#frame = this.#direction > 0 ? segment[0] : segment[1] - 1;
        this.#renderer?.segment(segment[0], segment[1] - 1);
        this.#sendPlayback();
        this.#renderer?.seek(this.#frame);
    }

    #seekTo(frame: number): void {
        this.#frame = frame;
        this.#renderer?.seek(frame);
    }

    #atEnd(): boolean {
        const frame = this.frame;
        const [start, end] = this.#segment;
        return this.#direction > 0 ? frame >= end - 1 : frame <= start;
    }

    /**
     * Where the renderer should be now, from the time since playback set out: as the core
     * plays, with the loop's rest on the last frame between rounds.
     */
    #estimate(): number {
        const [start, end] = this.#segment;
        const last = end - 1;
        const rate = this.#frameRate * this.#speed;
        const elapsed = ((now() - this.#since) / 1000) * rate;
        const frame = this.#frame + elapsed * this.#direction;
        const span = last - start;
        if (this.#loop && span > 0 && this.#rest > 0) {
            // Frames to the end of this round, then rounds of the span and the rest.
            const left = this.#direction > 0 ? last - this.#frame : this.#frame - start;
            if (elapsed <= left) return frame;
            const into = (elapsed - left) % (span + this.#rest * rate);
            const played = Math.max(into - this.#rest * rate, 0);
            return this.#direction > 0
                ? played
                    ? start + played
                    : last
                : played
                  ? last - played
                  : start;
        }
        if (this.#loop && span > 0) {
            const offset = (((frame - start) % span) + span) % span;
            return start + offset;
        }
        return Math.min(Math.max(frame, start), last);
    }

    /** A new starting point for the estimate, before speed or direction change. */
    #mark(): void {
        if (!this.#playing) return;
        this.#frame = this.frame;
        this.#since = now();
    }

    #sendPlayback(): void {
        this.#renderer?.playback(this.#speed, this.#direction, this.#loop, this.#rest);
    }

    #refresh(): void {
        if (!this.#renderer) return;
        this.#sendLook(false);
        this.#events.emit('refresh', undefined);
    }

    #sendLook(always: boolean): void {
        const colors = this.#looks.colorsToDraw();
        const stroke = this.#looks.strokeToDraw();
        const tint = this.#looks.tint;
        const key = JSON.stringify([colors, stroke, tint]);
        if (!always && key === this.#sentLook) return;
        this.#sentLook = key;
        this.#renderer?.look(colors, stroke, tint);
    }

    #settle(completed: boolean): void {
        const run = this.#run;
        this.#run = null;
        run?.settle(completed);
    }

    #setPlaying(playing: boolean): void {
        if (playing === this.#playing) return;
        this.#playing = playing;
        this.#events.emit(playing ? 'play' : 'pause', undefined);
    }

    #detail(): CompleteDetail {
        return { segment: this.segment, direction: this.#direction, state: this.state };
    }
}
