import { useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { IconBehavior } from './behavior';
import { loadError, type LordIconLoadError } from './errors';
import { useLordIconConfig } from './LordIconProvider';
import { useReducedMotion } from './motion';
import { Player } from './player/player';
import {
    accessibilityOf,
    colorText,
    iconData,
    setLooks,
    tintOpacity,
    setSpeed,
    setState,
    type LordIconProps,
} from './props';
import { CACHED_ICONS, useRegisteredIcon } from './registry';
import { useTarget } from './target';
import { registry } from './web/registry';
import { loadRuntime, renderOnPage } from './web/renderer';
import type { WebSurface } from './web/surface';
import { addToWorker, workersSupported } from './web/workers';

/** A key per renderer: a canvas handed to a worker cannot be drawn on by another renderer. */
const canvasKeys = new WeakMap<WebSurface, number>();
let lastCanvasKey = 0;
function canvasKey(renderer: WebSurface | null): string {
    if (!renderer) return 'loading';
    let key = canvasKeys.get(renderer);
    if (key === undefined) canvasKeys.set(renderer, (key = ++lastCanvasKey));
    return String(key);
}

/** Render workers by default: two, or one on a two-core machine. */
const defaultWorkers = () => Math.max(1, Math.min(2, (navigator.hardwareConcurrency || 2) - 1));

/**
 * An animated Lordicon icon on the web (react-native-web): the WebAssembly runtime draws it on a
 * canvas. The same API as on iOS and Android. `render.thread`: on the main thread by default;
 * `'background'` draws in a pool of `workers` render workers (OffscreenCanvas), falling back to
 * the main thread where the browser cannot.
 */
export function LordIcon(props: LordIconProps) {
    const { icon, state, speed, size = 32, style, ref, children } = props;
    const { trigger, value, intro, recyclingKey } = props;
    const { testID, pointerEvents } = props;
    const config = useLordIconConfig();
    const { render = {}, assets, cache } = config;
    const colors = props.colors ?? config.colors;
    const stroke = props.stroke ?? config.stroke;
    const color = colorText(props.color ?? config.color);
    const reducedMotion = useReducedMotion(props.motion ?? config.motion);
    const target = useTarget();
    const cachedIcons = cache?.icons ?? CACHED_ICONS;
    const frameRate = render.frameRate ?? 0; // the web: every display frame by default
    const inWorker = render.thread === 'background' && workersSupported();
    const workers = render.workers ?? defaultWorkers();
    // A new icon gets a new player; the state it starts in is the prop's at that time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const player = useMemo(() => new Player(iconData(icon), { state }), [icon]);
    const [watching, setWatching] = useState(false);
    const behavior = useMemo(() => new IconBehavior(player, setWatching), [player]);
    const source = useRegisteredIcon(registry, icon);
    const canvas = useRef<HTMLCanvasElement>(null);
    // The renderer of the current icon only: an old one is destroyed before the new one loads.
    const [loaded, setLoaded] = useState<{ player: Player; renderer: WebSurface } | null>(null);
    const renderer = loaded?.player === player ? loaded.renderer : null;
    const events = useRef(props);
    // Colours compared by value: an object written in the JSX is new on every render.
    const colorsKey = colors ? JSON.stringify(colors) : '';
    const pixels = Math.round(size * (globalThis.devicePixelRatio || 1));
    const latestPixels = useRef(pixels);

    useLayoutEffect(() => {
        events.current = props;
        latestPixels.current = pixels;
    });
    useEffect(() => {
        registry.capacity = cachedIcons;
    }, [cachedIcons]);
    useImperativeHandle(ref, () => behavior.handle, [behavior]);
    useEffect(() => behavior.connect(), [behavior]);
    useEffect(() => () => player.destroy(), [player]);
    useEffect(
        () => player.on('complete', (event) => events.current.onComplete?.(event.detail)),
        [player],
    );
    useEffect(() => setState(player, state), [player, state]);
    useEffect(() => setSpeed(player, speed), [player, speed]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => setLooks(player, colors, stroke, color), [player, colorsKey, stroke, color]);
    // After the effects above: the trigger sees the player with this render's props.
    useEffect(() => {
        behavior.update({ trigger, value, state, intro, recyclingKey, reducedMotion, target });
    });
    // Half of the icon in view, when the trigger or the intro asks.
    useEffect(() => {
        const element = canvas.current;
        if (!watching || !element || typeof IntersectionObserver === 'undefined') return;
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries.some((entry) => entry.intersectionRatio >= 0.5)) behavior.visible();
            },
            { threshold: 0.5 },
        );
        observer.observe(element);
        return () => observer.disconnect();
    }, [watching, behavior, loaded]);

    // Load the icon: into the runtime here, or into a render worker.
    useEffect(() => {
        let cancelled = false;
        let renderer: WebSurface | null = null;
        const complete = (token: number) => {
            player.complete(token);
        };
        const loaded = (error: LordIconLoadError | null) => {
            if (cancelled) return;
            if (!error && renderer) setLoaded({ player, renderer });
            else if (error) events.current.onError?.(error);
        };
        if (inWorker) {
            const inside = addToWorker(workers, source, complete, assets);
            renderer = inside;
            void inside.loaded.then(loaded);
        } else {
            loadRuntime(assets).then(
                (runtime) => {
                    if (cancelled) return;
                    try {
                        renderer = renderOnPage(runtime, source, complete);
                    } catch (cause) {
                        loaded(loadError('icon', cause));
                        return;
                    }
                    loaded(null);
                },
                (cause: unknown) => loaded(loadError('wasm', cause)),
            );
        }
        return () => {
            cancelled = true;
            renderer?.destroy();
        };
        // The files' place is read once per page: `assets` changing later changes nothing.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [source, player, inWorker, workers]);

    // The canvas first, then the player sends what to show (colours, stroke, frames).
    useEffect(() => {
        if (!renderer || !canvas.current) return;
        renderer.attach(canvas.current, latestPixels.current);
        player.attach(renderer);
        events.current.onReady?.();
    }, [renderer, player]);
    useEffect(() => renderer?.resize(pixels), [renderer, pixels]);
    useEffect(() => renderer?.setFrameRate(frameRate), [renderer, frameRate]);

    return (
        <View
            testID={testID}
            {...accessibilityOf(props)}
            pointerEvents={pointerEvents}
            style={[{ width: size, height: size }, style]}
        >
            <canvas
                key={canvasKey(renderer)}
                ref={canvas}
                style={{ width: size, height: size, opacity: tintOpacity(color) }}
            />
            {children && !renderer && (
                <View style={StyleSheet.absoluteFill} pointerEvents="none">
                    {children}
                </View>
            )}
        </View>
    );
}
