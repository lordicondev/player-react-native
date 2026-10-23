// From @lordicon/element (player-element 3.0.2, commit 25ed0ab); the element's state is the
// component's own `state` prop here.
import { stateType } from '@lordicon/utils-lottie';
import type { TriggerContext } from '../types';

/** How `follow` reacts to the attribute, chosen once the player is ready. */
export interface FollowStrategy {
    /** The player is ready; show the starting value without animating. */
    ready(value: string | null): void;
    /** The attribute changed. */
    change(value: string | null): void;
    /** The player finished a segment. */
    complete(): void;
    /** The trigger is torn down. */
    restore(): void;
}

/** What every strategy needs from the trigger. */
export type FollowContext = Pick<TriggerContext, 'player' | 'ownState' | 'reducedMotion'>;

/** The morph and loop states are recognised by their names. */
export const isMorph = (state: string | null | undefined): boolean =>
    !!state && stateType(state) === 'morph';
export const isLoop = (state: string | null | undefined): boolean =>
    !!state && stateType(state) === 'loop';
