// Codegen spec of the native module. The icon registry (cpp/registry.h): the icon's JSON crosses
// to the native side once per icon in use, views get its key. And the commands of the player to
// a view, by the `viewId` the view got as a prop: delivered in the order sent, also right after
// the view mounts (Fabric's view commands can be dropped then, see docs).
import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
    /** Stores the icon's JSON; returns its key (synchronous: the view gets it as a prop). */
    registerIcon(json: string): number;
    releaseIcon(key: number): void;

    /**
     * Every colour, `primary:#ff0000,secondary:#00ff00`, the stroke 1..3 (0: none), and the
     * tint, `#rrggbb` (empty: none).
     */
    look(viewId: number, colors: string, stroke: number, tint: string): void;
    /** Frames `[begin, end]`, both included; the frame moves to the start in the play direction. */
    segment(viewId: number, begin: number, end: number): void;
    /** `rest`: seconds on the last frame between loop rounds. */
    playback(viewId: number, speed: number, direction: number, loop: boolean, rest: number): void;
    play(viewId: number, token: number): void;
    pause(viewId: number): void;
    seek(viewId: number, frame: number): void;
    /**
     * The view's frame, read now (synchronous); NaN until it has applied `sent` commands, the
     * number the player sent it so far.
     */
    frame(viewId: number, sent: number): number;
}

export default TurboModuleRegistry.getEnforcing<Spec>('LordIcon');
