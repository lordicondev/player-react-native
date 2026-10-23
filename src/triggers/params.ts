// From @lordicon/element (player-element 3.0.2, commit 25ed0ab), unchanged but for messages.

/** One trigger as written in the `trigger` prop: `follow(busy=loop-cycle, ratio=0.6)`. */
export type TriggerSpec = { name: string } & Params;

/** What sits between the brackets: an optional unnamed value, then `key=value` pairs. */
export type Params = { primary?: string; options: Record<string, string> };

const SPEC = /^\s*([a-z][\w-]*)\s*(?:\((.*)\))?\s*$/is;

/** Splits `a=1, b=x y, c=z` into pairs. A comma only separates when a `key=` follows it. */
const PAIRS = /,(?=\s*[\w-]+\s*=)/;

/**
 * Parses a parameter list: `aria-expanded, ratio=0.6`. The first value may go without a
 * name; the trigger says which option it is. A value runs to the next pair and may contain
 * spaces and colons. `source` is only used in warnings.
 */
export function parseParams(text: string, source = text): Params {
    const params: Params = { options: {} };
    if (!text.trim()) return params;

    text.split(PAIRS).forEach((part, index) => {
        const at = part.indexOf('=');
        const key = part.slice(0, at).trim();

        if (at === -1 && index === 0) {
            params.primary = part.trim();
            return;
        }

        if (at === -1 || !key) {
            console.warn(`@lordicon/react-native: ignoring "${part.trim()}" in "${source}"`);
            return;
        }

        params.options[key] = part.slice(at + 1).trim();
    });

    return params;
}

/** Parses the `trigger` prop. Returns null when it is empty or malformed. */
export function parseTrigger(value: string | null): TriggerSpec | null {
    if (!value) return null;

    const match = SPEC.exec(value);
    if (!match) {
        console.warn(`@lordicon/react-native: cannot parse trigger "${value}"`);
        return null;
    }

    const [, name, text = ''] = match;
    return { name: name.toLowerCase(), ...parseParams(text, value) };
}
