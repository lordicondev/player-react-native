// One icon with its states, play, reverse, loop, stroke and colours (tap the icon to play).
// memory-android.sh reads the app's baseline on it (lordicon-example://demo).
import { useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LordIcon, type LordIconHandle } from '@lordicon/react-native';
import { ICONS, NAMES } from './icons';
import { Button, styles } from './ui';

const PALETTE = ['#e5484d', '#3e63dd', '#12a594', '#f5a524', '#8e4ec6', '#121331'];

export function Playground() {
    const icon = useRef<LordIconHandle>(null);
    const [name, setName] = useState('lock');
    const [states, setStates] = useState<string[]>([]);
    const [state, setState] = useState<string | undefined>(undefined);
    const [color, setColor] = useState<string | null>(null);
    const [stroke, setStroke] = useState<1 | 2 | 3>(2);
    const [loop, setLoop] = useState(false);
    const [result, setResult] = useState('');
    const colors = useMemo(() => (color ? { primary: color } : undefined), [color]);

    const play = (options?: Parameters<LordIconHandle['play']>[0]) => {
        const handle = icon.current;
        if (!handle) return;
        handle.loop = loop;
        setResult('playing');
        handle.play(options).then((completed) => setResult(completed ? 'completed' : 'stopped'));
    };

    return (
        <View style={local.demo}>
            <Pressable onPress={() => play()}>
                <LordIcon
                    ref={icon}
                    icon={ICONS[name]}
                    state={state}
                    size={192}
                    colors={colors}
                    stroke={stroke}
                    onReady={() => {
                        setStates(icon.current?.states.map((s) => s.name) ?? []);
                        setResult('ready');
                    }}
                />
            </Pressable>
            <Text style={styles.stats}>{result || '…'} (tap the icon to play)</Text>
            <View style={styles.row}>
                {NAMES.map((n) => (
                    <Button
                        key={n}
                        label={n}
                        active={n === name}
                        onPress={() => {
                            setName(n);
                            setState(undefined);
                        }}
                    />
                ))}
            </View>
            <View style={styles.row}>
                {states.map((s) => (
                    <Button
                        key={s}
                        label={s}
                        active={s === (state ?? icon.current?.state)}
                        onPress={() => setState(s)}
                    />
                ))}
            </View>
            <View style={styles.row}>
                <Button label="play" onPress={() => play()} />
                <Button label="reverse" onPress={() => play({ reverse: true })} />
                <Button label="pause" onPress={() => icon.current?.pause()} />
                <Button label="stop" onPress={() => icon.current?.stop()} />
                <Button label="loop" active={loop} onPress={() => setLoop(!loop)} />
            </View>
            <View style={styles.row}>
                {([1, 2, 3] as const).map((s) => (
                    <Button
                        key={s}
                        label={`stroke ${s}`}
                        active={s === stroke}
                        onPress={() => setStroke(s)}
                    />
                ))}
                <Button label="default" active={!color} onPress={() => setColor(null)} />
                {PALETTE.map((c) => (
                    <Pressable
                        key={c}
                        onPress={() => setColor(c)}
                        style={[
                            local.swatch,
                            { backgroundColor: c },
                            c === color && local.swatchActive,
                        ]}
                    />
                ))}
            </View>
        </View>
    );
}

const local = StyleSheet.create({
    demo: { alignItems: 'center', gap: 8, paddingTop: 16 },
    swatch: { width: 28, height: 28, borderRadius: 14 },
    swatchActive: { borderWidth: 3, borderColor: '#999' },
});
