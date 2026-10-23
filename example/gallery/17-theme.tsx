// README: "Colours and themes". LordIconProvider gives every icon inside its colours, colour or
// stroke, unless an icon has its own: a theme, light or dark.
import { useState } from 'react';
import { StyleSheet, Switch, Text, useColorScheme, View } from 'react-native';
import { LordIcon, LordIconProvider } from '@lordicon/react-native';
import download from '../icons/download.json';
import lock from '../icons/lock.json';
import trash from '../icons/trash.json';

const THEMES = {
    light: { background: '#ffffff', text: '#121331', accent: '#08a88a' },
    dark: { background: '#121331', text: '#ffffff', accent: '#f5a524' },
};

export default function Theme() {
    const system = useColorScheme();
    const [dark, setDark] = useState(system === 'dark');
    const theme = THEMES[dark ? 'dark' : 'light'];

    return (
        <LordIconProvider colors={{ primary: theme.text, secondary: theme.accent }} stroke="bold">
            <View style={[styles.page, { backgroundColor: theme.background }]}>
                <View style={styles.row}>
                    <LordIcon icon={lock} trigger="loop(1000)" size={64} />
                    <LordIcon icon={trash} trigger="loop(1000)" size={64} />
                    {/* Its own colour wins over the theme's. */}
                    <LordIcon icon={download} color="#e5484d" trigger="loop(1000)" size={64} />
                </View>
                <View style={styles.row}>
                    <Text style={{ color: theme.text }}>Dark</Text>
                    <Switch value={dark} onValueChange={setDark} />
                </View>
            </View>
        </LordIconProvider>
    );
}

const styles = StyleSheet.create({
    page: { alignItems: 'center', gap: 16, padding: 24, borderRadius: 12 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 16 },
});
