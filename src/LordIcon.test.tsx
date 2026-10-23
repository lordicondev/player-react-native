// <LordIcon> on iOS and Android, on a stand-in of the native module and view: what it sends the
// view and when, what it does with the view's events, the registry, triggers and their sources.
import { createElement, type ReactNode } from 'react';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { LordIconHandle } from './props';
import { lockIcon } from './testing/renderer';

const native = vi.hoisted(() => ({
    calls: [] as string[],
    keys: 0,
    released: [] as number[],
    reset() {
        this.calls = [];
        this.released = [];
    },
}));

vi.mock('react-native', () => {
    const host =
        (name: string) =>
        ({ children, ...props }: { children?: unknown }) =>
            createElement(
                name,
                props,
                typeof children === 'function'
                    ? children({ pressed: false })
                    : (children as ReactNode),
            );
    const module = {
        registerIcon: () => ++native.keys,
        releaseIcon: (key: number) => native.released.push(key),
        look: (_: number, colors: string, stroke: number, tint: string) =>
            native.calls.push(`look ${colors} ${stroke}${tint ? ` ${tint}` : ''}`),
        segment: (_: number, begin: number, end: number) =>
            native.calls.push(`segment ${begin} ${end}`),
        playback: (_: number, speed: number, direction: number, loop: boolean, rest: number) =>
            native.calls.push(`playback ${speed} ${direction} ${loop} ${rest}`),
        play: (_: number, token: number) => native.calls.push(`play ${token}`),
        pause: () => native.calls.push('pause'),
        seek: (_: number, frame: number) => native.calls.push(`seek ${frame}`),
        frame: () => NaN,
    };
    return {
        View: host('View'),
        Pressable: host('Pressable'),
        StyleSheet: { absoluteFill: { position: 'absolute' } },
        AccessibilityInfo: {
            isReduceMotionEnabled: () => Promise.resolve(false),
            addEventListener: () => ({ remove() {} }),
        },
        AppState: { addEventListener: () => ({ remove() {} }) },
        TurboModuleRegistry: { getEnforcing: () => module },
        codegenNativeComponent: () => 'LordIconView',
    };
});

const { LordIcon, LordIconLoadError, LordIconProvider } = await import('./index');

const lock = lockIcon();
let root: ReactTestRenderer;

beforeEach(() => {
    vi.useFakeTimers();
    native.reset();
    vi.spyOn(console, 'error').mockImplementation(() => {}); // react-test-renderer's deprecation
});
afterEach(() => {
    act(() => root?.unmount());
    vi.useRealTimers();
    vi.restoreAllMocks();
});

function render(element: ReactNode) {
    act(() => {
        root = create(element as never);
    });
    return root;
}

const view = (): ReactTestInstance => root.root.findByType('LordIconView' as never);

/** The view loads its icon (`onLoad`), as the native view reports. */
async function load(ok = true) {
    await act(async () => view().props.onLoad({ nativeEvent: { ok } }));
}

describe('<LordIcon>', () => {
    it('registers the icon once, and commands the view only once it has loaded', async () => {
        const ref = { current: null as LordIconHandle | null };
        render(<LordIcon icon={lock} state="hover-locked" ref={ref} />);
        expect(view().props.icon).toBe(native.keys);
        expect(view().props.frameRate).toBe(60);
        void ref.current!.play();
        expect(native.calls).toEqual([]);

        await load();
        expect(native.calls).toEqual([
            'look primary:#121331,secondary:#08a88a 2',
            'segment 130 190',
            'playback 1 1 false 0',
            'seek 130',
            'play 1',
        ]);
    });

    it('tells onError why the icon did not load', async () => {
        const onError = vi.fn();
        const onReady = vi.fn();
        render(<LordIcon icon={lock} onReady={onReady} onError={onError} />);
        await load(false);
        expect(onReady).not.toHaveBeenCalled();
        expect(onError).toHaveBeenCalledOnce();
        expect(onError.mock.calls[0][0]).toBeInstanceOf(LordIconLoadError);
        expect(onError.mock.calls[0][0].kind).toBe('icon');
    });

    it('gives onComplete the detail of the segment the view finished', async () => {
        const ref = { current: null as LordIconHandle | null };
        const onComplete = vi.fn();
        render(<LordIcon icon={lock} state="hover-locked" ref={ref} onComplete={onComplete} />);
        await load();
        const done = ref.current!.play();
        await act(async () => view().props.onComplete({ nativeEvent: { token: 1 } }));
        await expect(done).resolves.toBe(true);
        expect(onComplete).toHaveBeenCalledWith({
            segment: [130, 191],
            direction: 1,
            state: 'hover-locked',
        });
        // A token of a playback since replaced: nothing.
        await act(async () => view().props.onComplete({ nativeEvent: { token: 7 } }));
        expect(onComplete).toHaveBeenCalledOnce();
    });

    it('keeps an unmounted icon in the cache, and lets it go without one', () => {
        render(<LordIcon icon={lock} />);
        act(() => root.unmount());
        vi.advanceTimersByTime(5000);
        expect(native.released).toEqual([]);

        const other = lockIcon();
        render(
            <LordIconProvider cache={{ icons: 0 }}>
                <LordIcon icon={other} />
            </LordIconProvider>,
        );
        const key = view().props.icon;
        act(() => root.unmount());
        vi.advanceTimersByTime(1000);
        expect(native.released).toContain(key);
    });

    it('loads another icon under a new key, with a new player', async () => {
        render(<LordIcon icon={lock} />);
        await load();
        const key = view().props.icon;
        native.reset();
        act(() => root.update(<LordIcon icon={lockIcon()} />));
        expect(view().props.icon).not.toBe(key);
        await load();
        expect(native.calls[0]).toMatch(/^look/);
    });

    it('plays on a press of the Target around it', async () => {
        render(
            <LordIcon.Target onPress={() => native.calls.push('app')}>
                <LordIcon icon={lock} state="hover-locked" trigger="click" />
            </LordIcon.Target>,
        );
        await load();
        native.reset();
        act(() => root.root.findByType('Pressable' as never).props.onPress({}));
        // The icon's commands go out before the app's handler runs.
        expect(native.calls.slice(-2)).toEqual(['play 1', 'app']);
    });

    it('follows a value, and shows a recycled row’s at once', async () => {
        const icon = (liked: boolean, key: string) => (
            <LordIcon icon={lock} state="morph-unlocked" value={liked} recyclingKey={key} />
        );
        render(icon(false, 'a'));
        await load();
        native.reset();
        act(() => root.update(icon(true, 'a')));
        expect(native.calls.some((call) => /^play \d/.test(call))).toBe(true);

        native.reset();
        act(() => root.update(icon(false, 'b'))); // another item in the row
        expect(native.calls.some((call) => /^play \d/.test(call))).toBe(false);
    });

    it('asks the view to watch for `in`, and plays once it shows', async () => {
        render(<LordIcon icon={lock} state="hover-locked" trigger="in" />);
        await load();
        expect(view().props.observeVisibility).toBe(true);
        native.reset();
        await act(async () => view().props.onVisible({ nativeEvent: { visible: true } }));
        expect(view().props.observeVisibility).toBe(false);
        expect(native.calls).toContain('play 1');
    });

    it('draws its tint, from the prop or the provider', async () => {
        render(
            <LordIconProvider color="teal">
                <LordIcon icon={lock} />
            </LordIconProvider>,
        );
        await load();
        expect(native.calls[0]).toBe('look primary:#121331,secondary:#08a88a 2 #008080');
    });

    it('shows a placeholder until ready, and is decoration unless labelled', async () => {
        render(<LordIcon icon={lock}>{createElement('Still')}</LordIcon>);
        expect(root.root.findAllByType('Still' as never)).toHaveLength(1);
        expect(root.root.findByType('View' as never).props.accessible).toBe(false);
        await load();
        expect(root.root.findAllByType('Still' as never)).toHaveLength(0);

        render(<LordIcon icon={lock} accessibilityLabel="Locked" />);
        expect(view().props.accessible).toBe(true);
        expect(view().props.accessibilityRole).toBe('image');
    });
});
