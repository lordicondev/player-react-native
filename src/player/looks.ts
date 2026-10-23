import {
    defaultColors,
    parseStroke,
    readControls,
    resolveColor,
    type ColorMap,
    type IconData,
    type Stroke,
} from '@lordicon/utils-lottie';
import { parseColor } from './color';

/**
 * The icon's colours and stroke: its own and the ones set on the player. Works before the
 * renderer exists; `colorsToDraw()` and `strokeToDraw()` say what the renderer should use.
 */
export class Looks {
    readonly defaults: Readonly<ColorMap>;
    readonly #ownStroke: 1 | 2 | 3 | null;
    #colors: ColorMap = {};
    #stroke: 1 | 2 | 3 | null = null;
    #tint: string | null = null;

    constructor(data: IconData) {
        this.defaults = Object.freeze(defaultColors(data));
        const control = readControls(data).find(
            (c) => (c.name === 'stroke' || c.name === 'stroke-layers') && c.type === 'feature',
        );
        this.#ownStroke = control ? parseStroke(control.value as number) : null;
    }

    get names(): string[] {
        return Object.keys(this.defaults);
    }

    color(name: string): string | undefined {
        return this.#colors[name] ?? this.defaults[name];
    }

    /** Sets one colour; `null` or `undefined` puts the icon's own back. */
    setColor(name: string, value: string | null | undefined): void {
        if (!(name in this.defaults)) return;
        if (value === null || value === undefined) {
            delete this.#colors[name];
            return;
        }
        const color = parseColor(value)?.hex;
        if (color) this.#colors[name] = color;
        else console.warn(`@lordicon/react-native: "${value}" is not a colour`);
    }

    /** Replaces every colour set; `null` puts all the icon's own back. */
    setColors(colors: ColorMap | null | undefined): void {
        this.#colors = {};
        for (const [name, value] of Object.entries(colors ?? {})) this.setColor(name, value);
    }

    /** 1..3; null when the icon has no stroke setting. */
    get stroke(): 1 | 2 | 3 | null {
        return this.#ownStroke === null ? null : (this.#stroke ?? this.#ownStroke);
    }

    /** `null` puts the icon's own width back. */
    set stroke(value: Stroke | null | undefined) {
        this.#stroke = value === null || value === undefined ? null : parseStroke(value);
    }

    /** One colour for the whole icon, as `#rrggbb`; null for its own colours. */
    get tint(): string | null {
        return this.#tint;
    }

    set tint(value: string | null | undefined) {
        if (value === null || value === undefined) {
            this.#tint = null;
            return;
        }
        const color = parseColor(value)?.hex;
        if (color) this.#tint = color;
        else console.warn(`@lordicon/react-native: "${value}" is not a colour`);
    }

    /** Every colour, as `#rrggbb`: the ones set over the icon's own. */
    colorsToDraw(): Record<string, string> {
        const colors: Record<string, string> = {};
        for (const name of this.names) {
            const color = resolveColor(this.color(name) ?? '');
            if (color) colors[name] = color;
        }
        return colors;
    }

    /** The width to draw, 1..3, or 0 for an icon without a stroke setting. */
    strokeToDraw(): number {
        return this.stroke ?? 0;
    }

    /**
     * `player.colors`: reads and writes single colours by name; `onChange` runs after every
     * write.
     */
    proxy(onChange: () => void): ColorMap {
        return new Proxy({} as ColorMap, {
            get: (_target, name) => (typeof name === 'string' ? this.color(name) : undefined),
            set: (_target, name, value) => {
                if (typeof name === 'string') {
                    this.setColor(name, value);
                    onChange();
                }
                return true;
            },
            deleteProperty: (_target, name) => {
                if (typeof name === 'string') {
                    this.setColor(name, null);
                    onChange();
                }
                return true;
            },
            has: (_target, name) => typeof name === 'string' && name in this.defaults,
            ownKeys: () => this.names,
            getOwnPropertyDescriptor: (_target, name) =>
                typeof name === 'string' && name in this.defaults
                    ? {
                          enumerable: true,
                          configurable: true,
                          writable: true,
                          value: this.color(name),
                      }
                    : undefined,
        });
    }
}
