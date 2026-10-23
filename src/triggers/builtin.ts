import { Boomerang } from './boomerang';
import { Click } from './click';
import { Follow } from './follow';
import { defineTrigger } from './host';
import { Hover } from './hover';
import { In } from './in';
import { Loop } from './loop';
import { LoopOnHover } from './loop-on-hover';
import { Morph } from './morph';
import { Sequence } from './sequence';
import type { TriggerConstructor } from './types';

/** The triggers `trigger` knows without `defineTrigger()`. */
export const BUILTIN_TRIGGERS = {
    in: In,
    click: Click,
    follow: Follow,
    hover: Hover,
    loop: Loop,
    'loop-on-hover': LoopOnHover,
    boomerang: Boomerang,
    morph: Morph,
    sequence: Sequence,
} satisfies Record<string, TriggerConstructor>;

/** A built-in trigger's name, for the `trigger` prop's type; any other string is allowed too. */
export type TriggerName = keyof typeof BUILTIN_TRIGGERS;

let defined = false;

/**
 * Registers the built-in triggers, once. Called, not imported for its side effect: the package
 * is `sideEffects: false`, so bundlers (Vite, Metro on the web) drop imports made only for that.
 */
export function defineBuiltinTriggers(): void {
    if (defined) return;
    defined = true;
    for (const [name, trigger] of Object.entries(BUILTIN_TRIGGERS)) defineTrigger(name, trigger);
}
