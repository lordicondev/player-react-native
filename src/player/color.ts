import { resolveColor } from '@lordicon/utils-lottie';

/** A colour as the renderer takes it (`#rrggbb`), and its alpha, 0..1. */
export interface ParsedColor {
    hex: string;
    alpha: number;
}

const FUNCTION = /^(rgba?|hsla?)\(\s*([^)]*)\)$/i;
const HEX_ALPHA = /^#([0-9a-f]{4}|[0-9a-f]{8})$/i;

/**
 * Parses a colour as React Native styles take it: names, `#rgb`, `#rgba`, `#rrggbb`,
 * `#rrggbbaa`, `rgb()`, `rgba()`, `hsl()`, `hsla()` (comma or space separated, `/ alpha`),
 * `transparent`. Null for anything else.
 */
export function parseColor(value: string): ParsedColor | null {
    const text = value.trim();
    const plain = resolveColor(text);
    if (plain) return { hex: plain, alpha: 1 };
    if (text.toLowerCase() === 'transparent') return { hex: '#000000', alpha: 0 };

    const hex = HEX_ALPHA.exec(text);
    if (hex) {
        const digits = hex[1].length === 4 ? [...hex[1]].map((d) => d + d).join('') : hex[1];
        const alpha = parseInt(digits.slice(6), 16) / 255;
        return { hex: `#${digits.slice(0, 6).toLowerCase()}`, alpha };
    }

    const call = FUNCTION.exec(text);
    if (!call) return null;
    const parts = call[2].split(/\s*[,/]\s*|\s+/).filter(Boolean);
    if (parts.length !== 3 && parts.length !== 4) return null;
    const alpha = parts.length === 4 ? fraction(parts[3], 1) : 1;
    let rgb: number[] | null;
    if (call[1].toLowerCase().startsWith('rgb')) {
        rgb = parts.slice(0, 3).map((part) => fraction(part, 255) * 255);
    } else {
        const hue = parseFloat(parts[0]);
        rgb = Number.isNaN(hue)
            ? null
            : hslToRgb(hue, fraction(parts[1], 100), fraction(parts[2], 100));
    }
    if (!rgb || rgb.some(Number.isNaN) || Number.isNaN(alpha)) return null;
    const channels = rgb.map((c) =>
        Math.round(clamp(c, 0, 255))
            .toString(16)
            .padStart(2, '0'),
    );
    return { hex: `#${channels.join('')}`, alpha: clamp(alpha, 0, 1) };
}

/** A number or percentage as 0..1 of `whole` (`50%`, or `128` of 255). */
function fraction(part: string, whole: number): number {
    return part.endsWith('%') ? parseFloat(part) / 100 : parseFloat(part) / whole;
}

function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
}

function hslToRgb(hue: number, saturation: number, lightness: number): number[] {
    const s = clamp(saturation, 0, 1);
    const l = clamp(lightness, 0, 1);
    const k = (n: number) => (((n + hue / 30) % 12) + 12) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
    return [f(0) * 255, f(8) * 255, f(4) * 255];
}
