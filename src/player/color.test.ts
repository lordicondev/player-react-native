import { describe, expect, it } from 'vitest';
import { parseColor } from './color';

describe('parseColor', () => {
    it('reads the colours React Native styles take', () => {
        expect(parseColor('#08A88A')).toEqual({ hex: '#08a88a', alpha: 1 });
        expect(parseColor('teal')).toEqual({ hex: '#008080', alpha: 1 });
        expect(parseColor('#f00')).toEqual({ hex: '#ff0000', alpha: 1 });
        expect(parseColor('#ff000080')?.alpha).toBeCloseTo(0.5, 2);
        expect(parseColor('#f008')).toEqual({ hex: '#ff0000', alpha: 0x88 / 255 });
        // React Navigation's tab bar tints.
        expect(parseColor('rgb(0, 122, 255)')).toEqual({ hex: '#007aff', alpha: 1 });
        expect(parseColor('rgba(28, 28, 30, 0.5)')).toEqual({ hex: '#1c1c1e', alpha: 0.5 });
        expect(parseColor('rgb(0 122 255 / 50%)')).toEqual({ hex: '#007aff', alpha: 0.5 });
        expect(parseColor('hsl(0, 100%, 50%)')).toEqual({ hex: '#ff0000', alpha: 1 });
        expect(parseColor('hsla(240, 100%, 50%, 0.25)')).toEqual({ hex: '#0000ff', alpha: 0.25 });
        expect(parseColor('hsl(-120, 100%, 50%)')).toEqual({ hex: '#0000ff', alpha: 1 });
        expect(parseColor('transparent')).toEqual({ hex: '#000000', alpha: 0 });
    });

    it('turns down what is not a colour', () => {
        for (const value of ['', 'nope', '#12', 'rgb(1, 2)', 'rgb(a, b, c)', 'url(x)']) {
            expect(parseColor(value)).toBeNull();
        }
    });
});
