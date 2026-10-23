import {
    defaultState,
    stateSegment,
    type IconData,
    type IconState,
    type Segment,
} from '@lordicon/utils-lottie';

/**
 * The state a name asks for: `null` or an unknown name is the default state (an unknown one with
 * a warning in development), `'*'` is none (the whole file). Null when there is no such state.
 */
export function resolveState(
    states: IconState[],
    name: string | null | undefined,
): IconState | null {
    if (name === '*') return null;
    const found = states.find((state) => state.name === name);
    if (!found && name && isDevelopment()) {
        console.warn(
            `@lordicon/react-native: the icon has no state "${name}"; its default plays. ` +
                `Its states: ${states.map((state) => state.name).join(', ') || 'none'}.`,
        );
    }
    return found ?? defaultState(states);
}

function isDevelopment(): boolean {
    return (globalThis as { __DEV__?: boolean }).__DEV__ !== false;
}

/**
 * What plays without a state: from the first state to the end of the last, or the file's own
 * frames, `[ip, op)`, when it has none. A file from lordicon.com is often narrowed to one state
 * (`ip`, `op` around it) and still holds all of them, as its markers say: they all play, as in
 * @lordicon/web (the runtime widens the file's frames to them).
 */
export function wholeFileOf(data: IconData, states: IconState[]): Segment {
    const first = states[0];
    const last = states[states.length - 1];
    return first && last ? [first.time, stateSegment(last)[1]] : [data.ip ?? 0, data.op ?? 1];
}
