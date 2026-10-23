// From @lordicon/web's looks tests: colours and stroke on the player, sent to the renderer.
import { colorsByName } from '@lordicon/utils-lottie';
import { describe, expect, it, vi } from 'vitest';
import { lockIcon, StubRenderer } from '../testing/renderer';
import { Player } from './player';

function mount(properties?: ConstructorParameters<typeof Player>[1]) {
    const player = new Player(lockIcon(), properties);
    const renderer = new StubRenderer();
    player.attach(renderer);
    renderer.take();
    return { player, renderer };
}

describe('colors', () => {
    it('reads the icon’s own colours', () => {
        const { player } = mount();
        expect(player.defaultColors).toEqual({ primary: '#121331', secondary: '#08a88a' });
        expect(player.colors.primary).toBe('#121331');
        expect(Object.keys(player.colors)).toEqual(['primary', 'secondary']);
        expect({ ...player.colors }).toEqual({ primary: '#121331', secondary: '#08a88a' });
        expect('primary' in player.colors).toBe(true);
        expect('tertiary' in player.colors).toBe(false);
    });

    it('sets one colour, puts it back, and replaces them all, sending every colour', () => {
        const { player, renderer } = mount();
        const refresh = vi.fn();
        player.addEventListener('refresh', refresh);

        player.colors.primary = 'red';
        expect(player.colors.primary).toBe('#ff0000');
        delete player.colors.primary;
        player.colors = { secondary: '#00f' };
        expect(player.colors.primary).toBe('#121331');
        player.colors = null;

        expect(renderer.take()).toEqual([
            'look(primary:#ff0000,secondary:#08a88a;2)',
            'look(primary:#121331,secondary:#08a88a;2)',
            'look(primary:#121331,secondary:#0000ff;2)',
            'look(primary:#121331,secondary:#08a88a;2)',
        ]);
        expect(refresh).toHaveBeenCalledTimes(4);
    });

    it('sends nothing when the colours to draw stay the same', () => {
        const { player, renderer } = mount({ colors: { primary: 'red' } });
        player.colors = { primary: '#f00' };
        player.colors.primary = 'red';
        expect(renderer.take()).toEqual([]);
    });

    it('takes colours before it is attached and sends them first', () => {
        const player = new Player(lockIcon(), { colors: { primary: 'red' } });
        player.colors.secondary = '#000';
        const renderer = new StubRenderer();
        player.attach(renderer);
        expect(renderer.take()[0]).toBe('look(primary:#ff0000,secondary:#000000;2)');
    });

    it('recolours by the icon’s own colours', () => {
        const { player } = mount();
        player.colors = colorsByName(player.defaultColors, { '#121331': 'red' });
        expect({ ...player.colors }).toEqual({ primary: '#ff0000', secondary: '#08a88a' });
    });

    it('ignores a value that is not a colour, and a name the icon does not have', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const { player } = mount();
        player.colors.primary = 'nope';
        player.colors.tertiary = 'red';
        expect(player.colors.primary).toBe('#121331');
        expect(player.colors.tertiary).toBeUndefined();
        expect(warn).toHaveBeenCalledOnce();
        warn.mockRestore();
    });
});

describe('stroke', () => {
    it('reads the icon’s width and sets another', () => {
        const { player, renderer } = mount();
        expect(player.stroke).toBe(2);
        player.stroke = 'bold';
        expect(player.stroke).toBe(3);
        player.stroke = null;
        expect(player.stroke).toBe(2);
        expect(renderer.take()).toEqual([
            'look(primary:#121331,secondary:#08a88a;3)',
            'look(primary:#121331,secondary:#08a88a;2)',
        ]);
    });

    it('is null for an icon without a stroke setting, and 0 for the renderer', () => {
        const player = new Player({ ...lockIcon(), layers: [] });
        const renderer = new StubRenderer();
        player.attach(renderer);
        player.stroke = 'bold';
        expect(player.stroke).toBeNull();
        expect(renderer.take()[0]).toBe('look(;0)');
    });
});

describe('properties', () => {
    it('reads and replaces colours, stroke and state together', () => {
        const { player } = mount({ stroke: 1, state: 'hover-locked' });
        expect(player.properties).toEqual({
            colors: { primary: '#121331', secondary: '#08a88a' },
            stroke: 1,
            state: 'hover-locked',
        });

        player.properties = { colors: { primary: 'red' } };
        expect(player.properties).toEqual({
            colors: { primary: '#ff0000', secondary: '#08a88a' },
            stroke: 2,
            state: 'morph-unlocked',
        });
    });
});

describe('tint', () => {
    it('draws the whole icon in one colour, and back to its own', () => {
        const { player, renderer } = mount();
        expect(player.tint).toBeNull();
        player.tint = 'teal';
        expect(player.tint).toBe('#008080');
        expect(renderer.take()).toEqual(['look(primary:#121331,secondary:#08a88a;2;#008080)']);
        player.tint = null;
        expect(renderer.take()).toEqual(['look(primary:#121331,secondary:#08a88a;2)']);
    });

    it('leaves a colour it cannot read', () => {
        const { player, renderer } = mount();
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        player.tint = 'not a colour';
        expect(player.tint).toBeNull();
        expect(renderer.take()).toEqual([]);
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
    });
});
