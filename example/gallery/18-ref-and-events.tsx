// README: "The ref and events". The ref is the icon's player: play() returns a promise, so
// states chain; onComplete says which segment ended.
import { useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LordIcon, type LordIconHandle } from '@lordicon/react-native';
import trash from '../icons/trash.json';
import { Button, colors } from './ui';

export default function RefAndEvents() {
    const icon = useRef<LordIconHandle>(null);
    const [log, setLog] = useState<string[]>([]);
    const add = (line: string) => setLog((lines) => [line, ...lines].slice(0, 6));

    const throwAway = async () => {
        const player = icon.current;
        if (!player) return;
        // One state after another: each play() resolves when its animation ends.
        if (await player.play({ state: 'morph-trash-full' })) {
            await player.play({ state: 'morph-trash-full-to-empty' });
        }
    };

    return (
        <View style={styles.page}>
            <LordIcon
                ref={icon}
                icon={trash}
                size={96}
                onReady={() => add(`ready: ${icon.current?.states.length} states`)}
                onComplete={(detail) => add(`complete: ${detail.state}`)}
            />
            <View style={styles.row}>
                <Button label="Play" onPress={() => icon.current?.play()} />
                <Button label="Reverse" onPress={() => icon.current?.play({ reverse: true })} />
                <Button label="Pause" onPress={() => icon.current?.pause()} />
                <Button label="Stop" onPress={() => icon.current?.stop()} />
            </View>
            <Button label="Fill, then empty" onPress={throwAway} />
            {log.map((line, i) => (
                <Text key={i} style={styles.log}>
                    {line}
                </Text>
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    page: { alignItems: 'center', gap: 12 },
    row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
    log: { color: colors.inkSoft, fontVariant: ['tabular-nums'] },
});
