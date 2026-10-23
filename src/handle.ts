import type { Player, PlayOptions } from './player/player';
import type { LordIconHandle } from './props';
import type { TriggerHost } from './triggers/host';
import type { Command } from './triggers/types';

/**
 * The ref of `<LordIcon>`: the icon's player, with its playback commands (`play`, `pause`,
 * `stop`, `seek`) going by the running trigger first, as on the web: the trigger may take one
 * over (`pause()` holds the wait of `loop(1000)` too, `play()` lets it run out). Before the
 * player is ready they go straight to it. `beforeCommand` runs before each (an intro in progress
 * gives way).
 */
export function createHandle(
    player: Player,
    host: TriggerHost,
    beforeCommand: () => void = () => {},
): LordIconHandle {
    const route = <T>(command: Command, perform: () => T): T | true | Promise<boolean> => {
        beforeCommand();
        if (player.ready) {
            const taken = host.onCommand(command);
            if (taken !== undefined) return taken;
        }
        return perform();
    };

    const commands: Record<string, unknown> = {
        play: (options: PlayOptions = {}): Promise<boolean> => {
            const result = route({ name: 'play', options }, () => player.play(options));
            return result === true ? Promise.resolve(true) : result;
        },
        pause: (): void => void route({ name: 'pause' }, () => player.pause()),
        stop: (): void => void route({ name: 'stop' }, () => player.stop()),
        seek: (frame: number | 'start' | 'end'): void =>
            void route({ name: 'seek', frame }, () => player.seek(frame)),
    };

    // The player's own fields are private (#): read and write them on the player itself.
    return new Proxy(player, {
        get(target, key) {
            if (typeof key === 'string' && key in commands) return commands[key];
            const value: unknown = Reflect.get(target, key, target);
            return typeof value === 'function' ? value.bind(target) : value;
        },
        set(target, key, value) {
            return Reflect.set(target, key, value, target);
        },
    }) as unknown as LordIconHandle;
}
