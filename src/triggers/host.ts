import { parseTrigger, type TriggerSpec } from './params';
import type {
    Command,
    Signals,
    Trigger,
    TriggerConstructor,
    TriggerContext,
    TriggerPlayer,
} from './types';

/** Registered triggers by name: the built-in ones, and those of `defineTrigger()`. */
const triggers = new Map<string, TriggerConstructor>();

/**
 * Registers a trigger for the `trigger` prop: `defineTrigger('wobble', Wobble)`, then
 * `<LordIcon trigger="wobble" />`. A name already taken is replaced.
 */
export function defineTrigger(name: string, trigger: TriggerConstructor): void {
    triggers.set(name.toLowerCase(), trigger);
}

/** The trigger registered under a name. */
export function resolveTrigger(name: string): TriggerConstructor | undefined {
    return triggers.get(name.toLowerCase());
}

/** What the component gives a trigger besides the player and its spec. */
export interface TriggerSources {
    signals: Signals;
    value(): string | null;
    ownState(): string | null;
    visibility(): void;
    /** Whether a `LordIcon.Target` is around the icon: interactive triggers need one. */
    target: boolean;
}

/**
 * Runs the trigger the `trigger` prop names: creates it with its context, forwards the player's
 * events to it, and tears it down with an AbortSignal. From @lordicon/element's TriggerHost.
 */
export class TriggerHost {
    #trigger: Trigger | null = null;
    #controller: AbortController | null = null;

    get active(): boolean {
        return this.#trigger !== null;
    }

    /** The running trigger, or null. */
    get current(): Trigger | null {
        return this.#trigger;
    }

    /**
     * Creates the trigger `spec` names for a player, stopping the one before. Calls `onReady` at
     * once when the player already is.
     */
    start(
        spec: string | null | undefined,
        player: TriggerPlayer,
        sources: TriggerSources,
        reducedMotion: boolean,
    ): void {
        this.stop();
        const parsed = parseTrigger(spec ?? null);
        if (!parsed) return;

        const Ctor = resolveTrigger(parsed.name);
        if (!Ctor) {
            console.warn(`@lordicon/react-native: unknown trigger "${parsed.name}"`);
            return;
        }
        if (Ctor.interactive && !sources.target && isDevelopment()) {
            console.warn(
                `@lordicon/react-native: "${parsed.name}" plays when the icon's button is tapped, ` +
                    'hovered or focused: put a LordIcon.Target around the icon (in place of ' +
                    'Pressable), or play() it from your button.',
            );
        }

        const controller = new AbortController();
        this.#controller = controller;
        const context: TriggerContext = {
            player,
            signals: sources.signals,
            value: sources.value,
            ownState: sources.ownState,
            visibility: sources.visibility,
            signal: controller.signal,
            options: withPrimary(parsed, Ctor),
            reducedMotion,
        };
        this.#trigger = new Ctor(context);
        if (player.ready) this.#trigger.onReady?.();
    }

    /** Tears the trigger down. Safe to call when there is none. */
    stop(): void {
        this.#controller?.abort();
        this.#controller = null;
        this.#trigger = null;
    }

    onReady(): void {
        this.#trigger?.onReady?.();
    }

    onComplete(): void {
        this.#trigger?.onComplete?.();
    }

    onState(): void {
        this.#trigger?.onState?.();
    }

    /** What the trigger takes a command over with, or undefined when it lets it through. */
    onCommand(command: Command): true | Promise<boolean> | undefined {
        const taken = this.#trigger?.onCommand?.(command);
        return taken === true || taken instanceof Promise ? taken : undefined;
    }
}

function isDevelopment(): boolean {
    return (globalThis as { __DEV__?: boolean }).__DEV__ !== false;
}

/** The options with the unnamed value filed under the trigger's `primary` option. */
function withPrimary(spec: TriggerSpec, Ctor: TriggerConstructor): Record<string, string> {
    const { name, primary, options } = spec;
    if (primary === undefined) return options;

    const key = Ctor.primary;
    if (!key) {
        console.warn(`@lordicon/react-native: trigger "${name}" takes no value without a name`);
        return options;
    }

    if (key in options) {
        console.warn(
            `@lordicon/react-native: trigger "${name}" got ${key} twice; the named one wins`,
        );
        return options;
    }

    return { ...options, [key]: primary };
}
