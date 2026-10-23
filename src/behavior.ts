import { stateType } from '@lordicon/utils-lottie';
import { createHandle } from './handle';
import type { Player } from './player/player';
import type { LordIconHandle } from './props';
import { defineBuiltinTriggers } from './triggers/builtin';
import { TriggerHost } from './triggers/host';
import { parseParams } from './triggers/params';
import type { SignalType, Signals } from './triggers/types';

defineBuiltinTriggers();

/** What `<LordIcon>` takes from its props for the behaviour. */
export interface BehaviorProps {
    /** The `trigger` prop; with a `value` and no trigger, `follow`. */
    trigger?: string;
    value?: boolean | number | string | null;
    /** The `state` prop: the state to rest on. */
    state?: string;
    /** `intro="in-reveal, delay=300"`; an empty string: the first `in-*` state. */
    intro?: string;
    /** In a recycled list row: another key is another icon. */
    recyclingKey?: string | number;
    /** Less motion asked for, and not overridden (`motion="always"`). */
    reducedMotion: boolean;
    /** Signals of the `LordIcon.Target` around the icon, or null. */
    target: Signals | null;
}

/** The signals a target sends; the others come from the icon itself. */
const TARGET_SIGNALS = new Set<SignalType>(['enter', 'leave', 'press', 'focus', 'blur']);

/** Listeners by signal. */
export class SignalEmitter implements Signals {
    readonly #listeners = new Map<SignalType, Set<() => void>>();

    on(type: SignalType, listener: () => void): () => void {
        let set = this.#listeners.get(type);
        if (!set) this.#listeners.set(type, (set = new Set()));
        set.add(listener);
        return () => set.delete(listener);
    }

    emit(type: SignalType): void {
        for (const listener of [...(this.#listeners.get(type) ?? [])]) listener();
    }
}

/** The `value` prop as triggers read it: `'true'`, `'3'`, `'busy'`; null without one. */
export function valueText(value: BehaviorProps['value']): string | null {
    return value === undefined || value === null ? null : String(value);
}

/**
 * What an icon does on its own, for `<LordIcon>` on every platform: runs the trigger (with the
 * signals of its target, its view and its `value`), the intro before it, and gives the ref. One
 * per player; the component connects it while mounted (`connect`, which returns the
 * disconnection: React may connect it again, in StrictMode), hands it its props after every
 * render (`update`, where a new `recyclingKey` is another icon in a recycled list row), and tells
 * it when the view shows (`visible`). `onWatch(true)`: the view should report when half of it
 * shows.
 */
export class IconBehavior {
    readonly handle: LordIconHandle;
    readonly #player: Player;
    readonly #host = new TriggerHost();
    readonly #own = new SignalEmitter();
    readonly #onWatch: (watching: boolean) => void;
    readonly #signals: Signals;
    #props: BehaviorProps | null = null;
    #value: string | null = null;
    /** The intro: waiting for its turn, playing, or over (none, or a command came). */
    #intro: 'waiting' | 'visible' | 'playing' | 'done' = 'done';
    #introState: string | null = null;
    #introDelay = 0;
    #introTimer: ReturnType<typeof setTimeout> | null = null;
    #watching = false;
    #connected = false;

    constructor(player: Player, onWatch: (watching: boolean) => void) {
        this.#player = player;
        this.#onWatch = onWatch;
        this.#signals = {
            on: (type, listener) =>
                TARGET_SIGNALS.has(type)
                    ? (this.#props?.target?.on(type, listener) ?? (() => {}))
                    : this.#own.on(type, listener),
        };
        this.handle = createHandle(player, this.#host, () => this.#endIntro());
    }

    /** Listens to the player; returns the disconnection, which stops the trigger and the intro. */
    connect(): () => void {
        this.#connected = true;
        const off = [
            this.#player.on('ready', () => this.#ready()),
            this.#player.on('complete', () => this.#host.onComplete()),
        ];
        return () => {
            this.#connected = false;
            for (const remove of off) remove();
            this.#host.stop();
            this.#clearIntroTimer();
            this.#intro = 'done';
            this.#props = null; // the next update starts from the beginning
            this.#watch(false);
        };
    }

    /** The props after a render. Starts the trigger again when what it depends on changed. */
    update(props: BehaviorProps): void {
        if (!this.#connected) return;
        const before = this.#props;
        this.#props = props;
        const value = valueText(props.value);
        const valueChanged = before !== null && value !== this.#value;
        this.#value = value;

        if (!before) {
            this.#begin();
            return;
        }
        if (before.recyclingKey !== props.recyclingKey) {
            // Another item in a recycled row: its look at once, the trigger from the start.
            this.#player.stop();
            this.#begin();
            return;
        }
        if (
            spec(before) !== spec(props) ||
            before.reducedMotion !== props.reducedMotion ||
            before.target !== props.target
        ) {
            this.#startTrigger();
            return;
        }
        if (before.state !== props.state) {
            // An icon waiting for its intro keeps resting on it; the intro ends on the new state.
            if (this.#intro === 'waiting' || this.#intro === 'visible') {
                this.#player.state = this.#introState;
            }
            this.#host.onState();
        }
        if (valueChanged) this.#own.emit('value');
    }

    /** The view reports half of it on screen. */
    visible(): void {
        this.#watch(false);
        if (this.#intro === 'waiting') {
            this.#intro = 'visible';
            this.#playIntro();
        }
        this.#own.emit('visible');
    }

    /** From the start: the intro if there is one, else the trigger. */
    #begin(): void {
        this.#prepareIntro(this.#props?.intro);
        this.#startTrigger();
        if (this.#player.ready && this.#intro === 'waiting') this.#watch(true);
    }

    #ready(): void {
        if (this.#intro === 'waiting') this.#watch(true);
        else this.#host.onReady();
    }

    /** Runs the trigger the props name, unless the intro has not played yet. */
    #startTrigger(): void {
        const props = this.#props;
        if (!props || this.#intro !== 'done' || !this.#connected) return;
        this.#host.start(spec(props), this.#player, this.#sources(props), props.reducedMotion);
    }

    #sources(props: BehaviorProps) {
        return {
            signals: this.#signals,
            value: () => this.#value,
            ownState: () => this.#props?.state ?? null,
            visibility: () => this.#watch(true),
            target: props.target !== null,
        };
    }

    #watch(watching: boolean): void {
        if (watching === this.#watching) return;
        this.#watching = watching;
        this.#onWatch(watching);
    }

    #prepareIntro(intro: string | undefined): void {
        this.#clearIntroTimer();
        this.#intro = 'done';
        if (intro === undefined || this.#props?.reducedMotion) return;
        const { primary, options } = parseParams(intro, `intro="${intro}"`);
        const names = this.#player.states.map((state) => state.name);
        const state = primary ?? names.find((name) => stateType(name) === 'in');
        if (!state || !names.includes(state)) {
            console.warn(`@lordicon/react-native: intro state "${state ?? 'in-*'}" not found`);
            return;
        }
        const delay = Number(options.delay);
        this.#introState = state;
        this.#introDelay = Number.isFinite(delay) && delay > 0 ? delay : 0;
        this.#intro = 'waiting';
        // It waits on the intro's first frame, so the first frame drawn is never the resting
        // look it is about to leave.
        this.#player.state = state;
    }

    #playIntro(): void {
        const play = () => {
            this.#introTimer = null;
            if (this.#intro !== 'visible') return;
            this.#intro = 'playing';
            void this.#player.play({ state: this.#introState }).then(() => {
                if (this.#intro !== 'playing') return;
                // The state prop may have changed while the intro played; that one wins.
                this.#player.state = this.#props?.state ?? null;
                this.#endIntro(false);
            });
        };
        if (this.#introDelay) this.#introTimer = setTimeout(play, this.#introDelay);
        else play();
    }

    /** The intro is over, or a command cut it short: the trigger takes over. */
    #endIntro(cut = true): void {
        if (this.#intro === 'done') return;
        this.#clearIntroTimer();
        this.#intro = 'done';
        if (cut) {
            // Back on the icon's own state, still; the command goes on from there.
            this.#player.stop();
            this.#player.state = this.#props?.state ?? null;
        }
        this.#startTrigger();
    }

    #clearIntroTimer(): void {
        if (this.#introTimer !== null) clearTimeout(this.#introTimer);
        this.#introTimer = null;
    }
}

/** The trigger the props name: `trigger`, else `follow` for a `value`. */
function spec(props: BehaviorProps): string | undefined {
    if (props.trigger) return props.trigger;
    return props.value !== undefined ? 'follow' : undefined;
}
