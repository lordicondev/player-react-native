// README: "Colours and themes". Colours, one colour for the whole icon, stroke and speed; they
// change live, without reloading the icon. Stroke needs an icon that has it (wired icons).
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { LordIcon, type Stroke } from '@lordicon/react-native';
import lock from '../icons/lock.json';
import { Chip, ui } from './ui';

const STROKES: Stroke[] = ['light', 'regular', 'bold'];

export default function Looks() {
    const [stroke, setStroke] = useState<Stroke>('regular');
    const [speed, setSpeed] = useState(1);

    return (
        <View style={ui.center}>
            <View style={styles.row}>
                {/* Its own colours, as lordicon.com gave it. */}
                <LordIcon icon={lock} stroke={stroke} trigger="loop" speed={speed} size={64} />
                {/* Colours by name. */}
                <LordIcon
                    icon={lock}
                    colors={{ primary: '#e5484d', secondary: '#3e63dd' }}
                    stroke={stroke}
                    trigger="loop"
                    speed={speed}
                    size={64}
                />
                {/* One colour for the whole icon. */}
                <LordIcon
                    icon={lock}
                    color="#3e63dd"
                    stroke={stroke}
                    trigger="loop"
                    speed={speed}
                    size={64}
                />
            </View>
            <View style={styles.row}>
                {STROKES.map((value) => (
                    <Chip
                        key={value}
                        label={String(value)}
                        on={value === stroke}
                        onPress={() => setStroke(value)}
                    />
                ))}
            </View>
            <View style={styles.row}>
                {[0.5, 1, 2].map((value) => (
                    <Chip
                        key={value}
                        label={`×${value}`}
                        on={value === speed}
                        onPress={() => setSpeed(value)}
                    />
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    row: { flexDirection: 'row', gap: 16 },
});
