// useTabFocus on a stand-in of a screen's navigation: its focus at first, then its events.
import { createElement } from 'react';
import { act, create } from 'react-test-renderer';
import { describe, expect, it } from 'vitest';
import { useTabFocus, type FocusSource } from './tab-focus';

function navigation(focused: boolean) {
    const listeners = { focus: new Set<() => void>(), blur: new Set<() => void>() };
    const source: FocusSource & { emit(type: 'focus' | 'blur'): void; count(): number } = {
        isFocused: () => focused,
        addListener(type, listener) {
            listeners[type].add(listener);
            return () => listeners[type].delete(listener);
        },
        emit(type) {
            focused = type === 'focus';
            for (const listener of listeners[type]) listener();
        },
        count: () => listeners.focus.size + listeners.blur.size,
    };
    return source;
}

describe('useTabFocus', () => {
    it('starts from the focus, follows the events, and lets them go', () => {
        const seen: boolean[] = [];
        function Probe(props: { navigation: FocusSource }) {
            seen.push(useTabFocus(props.navigation));
            return null;
        }
        const nav = navigation(false);
        let root!: ReturnType<typeof create>;
        act(() => {
            root = create(createElement(Probe, { navigation: nav }));
        });
        expect(seen.at(-1)).toBe(false);
        act(() => nav.emit('focus'));
        expect(seen.at(-1)).toBe(true);
        act(() => nav.emit('blur'));
        expect(seen.at(-1)).toBe(false);
        expect(nav.count()).toBe(2);
        act(() => root.unmount());
        expect(nav.count()).toBe(0);
    });
});
