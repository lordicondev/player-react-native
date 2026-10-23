// Load test: 200 icons in a grid, how many animate, size, render mode, frame rate; FlashList:
// 200 recycled rows with `value` and `recyclingKey`. perf-android.sh drives it.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import {
    LordIcon,
    LordIconProvider,
    type LordIconHandle,
    type RenderOptions,
} from '@lordicon/react-native';
import morphSelect from '../icons/dev/morph-select.json';
import { ICONS, NAMES } from './icons';
import { Button, styles } from './ui';

/** An icon of the list: loops while `animate`, rests on its first frame otherwise. */
function ListIcon(props: { icon: object; size: number; animate: boolean; onReady: () => void }) {
    const { icon, size, animate, onReady } = props;
    const ref = useRef<LordIconHandle>(null);
    const [ready, setReady] = useState(false);
    useEffect(() => {
        const handle = ref.current;
        if (!ready || !handle) return;
        handle.loop = animate;
        if (animate) handle.play();
        else handle.stop();
    }, [ready, animate]);
    return (
        <LordIcon
            ref={ref}
            icon={icon}
            size={size}
            onReady={() => {
                setReady(true);
                onReady();
            }}
        />
    );
}

const MODES: Record<string, RenderOptions> = {
    ui: { thread: 'ui' },
    background: { thread: 'background' },
    'pool 3': { thread: 'background', workers: 3 },
};

/**
 * A row of a recycling list: the same view shows other items as the list scrolls. `value` is the
 * item's (selected or not), `recyclingKey` its key: a new item shows its look at once, without
 * the morph a change of `value` plays.
 */
function RecycledRow(props: { item: { key: string; i: number }; selected: boolean; size: number }) {
    const { item, selected, size } = props;
    return (
        <View style={local.recycled}>
            <LordIcon
                icon={morphSelect}
                state="morph-select"
                value={selected}
                recyclingKey={item.key}
                size={size}
            />
            <Text style={styles.stats}>
                #{item.i} {selected ? 'selected' : ''}
            </Text>
        </View>
    );
}

// Load test: 200 icons in a grid; `animating` of them loop, the rest rest on their first frame.
// `recycling`: 200 rows of a FlashList (views recycled), every third selected.
export function List() {
    const [animating, setAnimating] = useState(10);
    const [recycling, setRecycling] = useState(false);
    const [size, setSize] = useState(48);
    const [mode, setMode] = useState('background');
    const [fps, setFps] = useState(0);
    const [mountMs, setMountMs] = useState<number | null>(null);
    const start = useRef(Date.now());
    const ready = useRef(0);
    const data = useMemo(
        () =>
            Array.from({ length: 200 }, (_, i) => ({
                key: String(i),
                i,
                name: NAMES[i % NAMES.length],
            })),
        [],
    );
    const onReady = useCallback(() => {
        ready.current++;
        if (ready.current === 20) setMountMs(Date.now() - start.current); // about the first screen
    }, []);
    const reset = (change: () => void) => {
        start.current = Date.now();
        ready.current = 0;
        setMountMs(null);
        change();
    };
    const columns = Math.floor(360 / (size + 8));
    const every = animating > 0 ? Math.max(1, Math.floor(200 / animating)) : 0;
    return (
        <View style={styles.flex}>
            <View style={styles.row}>
                {[0, 10, 50, 200].map((n) => (
                    <Button
                        key={n}
                        label={`${n} anim`}
                        active={n === animating}
                        onPress={() => setAnimating(n)}
                    />
                ))}
                {[32, 48, 96].map((s) => (
                    <Button
                        key={s}
                        label={`${s} dp`}
                        active={s === size}
                        onPress={() => reset(() => setSize(s))}
                    />
                ))}
                {Object.keys(MODES).map((m) => (
                    <Button
                        key={m}
                        label={m}
                        active={m === mode}
                        onPress={() => reset(() => setMode(m))}
                    />
                ))}
                {[0, 60, 30].map((f) => (
                    <Button
                        key={f}
                        label={f ? `${f} fps` : 'screen fps'}
                        active={f === fps}
                        onPress={() => setFps(f)}
                    />
                ))}
                <Button
                    label="FlashList"
                    active={recycling}
                    onPress={() => reset(() => setRecycling(!recycling))}
                />
            </View>
            <Text style={styles.stats}>first 20 ready: {mountMs ?? '…'} ms</Text>
            <LordIconProvider render={{ ...MODES[mode], frameRate: fps }}>
                {recycling ? (
                    <FlashList
                        data={data}
                        renderItem={({ item }) => (
                            <RecycledRow item={item} selected={item.i % 3 === 0} size={size} />
                        )}
                    />
                ) : (
                    <FlatList
                        key={`${size}-${columns}-${mode}`}
                        data={data}
                        numColumns={columns}
                        renderItem={({ item }) => (
                            <View style={local.cell}>
                                <ListIcon
                                    icon={ICONS[item.name]}
                                    size={size}
                                    animate={every > 0 && item.i % every === 0}
                                    onReady={onReady}
                                />
                            </View>
                        )}
                    />
                )}
            </LordIconProvider>
        </View>
    );
}

const local = StyleSheet.create({
    cell: { margin: 4 },
    recycled: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 6 },
});
