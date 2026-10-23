import { useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { IconBehavior } from './behavior';
import { loadError } from './errors';
import { useLordIconConfig } from './LordIconProvider';
import { useReducedMotion } from './motion';
import NativeLordIconView from './native/LordIconViewNativeComponent';
import { NativeRenderer, newViewId } from './native/renderer';
import { registry } from './native/registry';
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

/**
 * An animated Lordicon icon, rendered natively.
 *
 *     <LordIcon icon={require('./lock.json')} trigger="in" size={48} />
 *     <LordIcon icon={heart} state="morph-heart" value={liked} />
 */
export function LordIcon(props: LordIconProps) {
    const { icon, state, speed, size = 32, style, ref, children } = props;
    const { trigger, value, intro, recyclingKey } = props;
    const { testID, pointerEvents } = props;
    const config = useLordIconConfig();
    const { render = {} } = config;
    const colors = props.colors ?? config.colors;
    const stroke = props.stroke ?? config.stroke;
    const color = colorText(props.color ?? config.color);
    const cachedIcons = config.cache?.icons ?? CACHED_ICONS;
    const reducedMotion = useReducedMotion(props.motion ?? config.motion);
    const target = useTarget();
    const [viewId] = useState(newViewId);
    const renderer = useMemo(() => new NativeRenderer(viewId), [viewId]);
    // A new icon gets a new player; the state it starts in is the prop's at that time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const player = useMemo(() => new Player(iconData(icon), { state }), [icon]);
    const [watching, setWatching] = useState(false);
    const behavior = useMemo(() => new IconBehavior(player, setWatching), [player]);
    const [loaded, setLoaded] = useState<Player | null>(null);
    const iconKey = useRegisteredIcon(registry, icon);
    // Colours compared by value: an object written in the JSX is new on every render.
    const colorsKey = colors ? JSON.stringify(colors) : '';
    const events = useRef(props);

    useLayoutEffect(() => {
        events.current = props;
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

    const accessibility = accessibilityOf(props);
    const box = [{ width: size, height: size }, style];
    const view = (
        <NativeLordIconView
            {...(children ? {} : { testID, pointerEvents, ...accessibility })}
            style={[children ? StyleSheet.absoluteFill : box, { opacity: tintOpacity(color) }]}
            viewId={viewId}
            icon={iconKey}
            renderMode={render.thread ?? 'background'}
            workers={render.workers ?? 1}
            frameRate={render.frameRate ?? 60}
            observeVisibility={watching}
            onLoad={(event) => {
                if (event.nativeEvent.ok) {
                    player.attach(renderer);
                    setLoaded(player);
                    events.current.onReady?.();
                } else {
                    events.current.onError?.(loadError('icon'));
                }
            }}
            onComplete={(event) => {
                player.complete(event.nativeEvent.token);
            }}
            onVisible={() => behavior.visible()}
        />
    );
    if (!children) return view;

    // A placeholder: the children over the view until the icon is ready.
    return (
        <View testID={testID} pointerEvents={pointerEvents} {...accessibility} style={box}>
            {view}
            {loaded !== player && (
                <View style={StyleSheet.absoluteFill} pointerEvents="none">
                    {children}
                </View>
            )}
        </View>
    );
}
