import { useSyncExternalStore } from 'react';
import { AccessibilityInfo } from 'react-native';

/** `always` animates even when the viewer asked for less motion; `auto` (default) respects it. */
export type MotionMode = 'auto' | 'always';

let reduced = false;
let started = false;
const listeners = new Set<() => void>();

function set(value: boolean): void {
    if (value === reduced) return;
    reduced = value;
    for (const listener of listeners) listener();
}

/**
 * Asks the system once, for every icon: iOS Reduce Motion, Android Remove animations, the web's
 * `prefers-reduced-motion`; then follows its changes.
 */
function subscribe(listener: () => void): () => void {
    if (!started) {
        started = true;
        AccessibilityInfo.isReduceMotionEnabled().then(set, () => {});
        AccessibilityInfo.addEventListener('reduceMotionChanged', set);
    }
    listeners.add(listener);
    return () => listeners.delete(listener);
}

/** Whether icons should hold back their animation: less motion asked for, and not `always`. */
export function useReducedMotion(mode: MotionMode | undefined): boolean {
    const asked = useSyncExternalStore(
        subscribe,
        () => reduced,
        () => false,
    );
    return asked && mode !== 'always';
}
