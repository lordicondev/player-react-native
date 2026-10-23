import type { ColorValue } from 'react-native';
import { describe, expect, it, vi } from 'vitest';
import { Player } from './player/player';
import { colorText, setLooks, sourceOf } from './props';
import { StubRenderer } from './testing/renderer';

/** An icon with a control layer: stroke 2, primary and secondary colours. */
function icon(): object {
    return {
        fr: 60,
        ip: 0,
        op: 60,
        layers: [
            {
                nm: 'control',
                ef: [
                    { nm: 'stroke', mn: 'Pseudo/@@abc', ef: [{ v: { k: 2 } }] },
                    { nm: 'primary', mn: 'ADBE Color Control', ef: [{ v: { k: [0, 0, 0] } }] },
                    { nm: 'secondary', mn: 'ADBE Color Control', ef: [{ v: { k: [1, 1, 1] } }] },
                ],
            },
        ],
    };
}

describe('props', () => {
    it('set colours and stroke on the player; what is left out goes back to the icon’s own', () => {
        const player = new Player(icon() as never);
        const renderer = new StubRenderer();
        player.attach(renderer);
        renderer.take();

        setLooks(player, { primary: 'red' }, 'bold');
        setLooks(player, undefined, undefined);
        expect(renderer.take()).toEqual([
            'look(primary:#ff0000,secondary:#ffffff;2)',
            'look(primary:#ff0000,secondary:#ffffff;3)',
            'look(primary:#000000,secondary:#ffffff;3)',
            'look(primary:#000000,secondary:#ffffff;2)',
        ]);
    });

    it('reads a colour value as text, and leaves a native colour out', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        expect(colorText('rgb(0, 122, 255)')).toBe('rgb(0, 122, 255)');
        expect(colorText(undefined)).toBeUndefined();
        // PlatformColor('label') on iOS: an object JavaScript cannot read.
        expect(colorText({ semantic: ['label'] } as unknown as ColorValue)).toBeUndefined();
        expect(warn).toHaveBeenCalledOnce();
        warn.mockRestore();
    });

    it('turns an icon object into its JSON', () => {
        const data = icon();
        expect(JSON.parse(sourceOf(data))).toEqual(data);
    });
});
