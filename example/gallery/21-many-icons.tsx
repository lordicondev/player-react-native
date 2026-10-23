// README: "Performance". Icons render on a background thread by default; LordIconProvider sets
// the threads and the frame rate for the icons inside. Icons off screen are not drawn.
import { useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { LordIcon, LordIconProvider, type RenderOptions } from '@lordicon/react-native';
import download from '../icons/download.json';
import lock from '../icons/lock.json';
import star from '../icons/star.json';
import trash from '../icons/trash.json';
import { Chip } from './ui';

const ICONS = [lock, trash, download, star];
const MODES: Record<string, RenderOptions> = {
    background: { thread: 'background' },
    '2 workers': { thread: 'background', workers: 2 },
    '30 fps': { thread: 'background', frameRate: 30 },
    'UI thread': { thread: 'ui' },
};

export default function ManyIcons() {
    const [mode, setMode] = useState('background');
    return (
        <View style={styles.page}>
            <View style={styles.row}>
                {Object.keys(MODES).map((name) => (
                    <Chip
                        key={name}
                        label={name}
                        on={name === mode}
                        onPress={() => setMode(name)}
                    />
                ))}
            </View>
            <LordIconProvider key={mode} render={MODES[mode]}>
                <FlatList
                    data={Array.from({ length: 120 }, (_, i) => i)}
                    numColumns={6}
                    keyExtractor={String}
                    renderItem={({ item }) => (
                        <View style={styles.cell}>
                            <LordIcon icon={ICONS[item % ICONS.length]} trigger="loop" size={40} />
                        </View>
                    )}
                />
            </LordIconProvider>
        </View>
    );
}

const styles = StyleSheet.create({
    page: { flex: 1, gap: 8 },
    row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
    cell: { flex: 1, alignItems: 'center', padding: 6 },
});
