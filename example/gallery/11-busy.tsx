// README: "Following your app". A boolean `value` with a `loop-*` state: the icon loops while
// true, and finishes its round when it turns false. For something that runs until it is
// turned off; a task that ends with a result is a stage (13 Stages).
import { useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import { LordIcon } from '@lordicon/react-native';
import upload from '../icons/upload.json';
import { colors, ui } from './ui';

export default function Busy() {
    const [backingUp, setBackingUp] = useState(false);

    return (
        <View style={styles.row}>
            <LordIcon icon={upload} state="loop-cycle" value={backingUp} size={28} />
            <View style={styles.text}>
                <Text style={ui.label}>Back up photos</Text>
                <Text style={styles.status}>{backingUp ? 'Backing up…' : 'Off'}</Text>
            </View>
            <Switch
                value={backingUp}
                onValueChange={setBackingUp}
                trackColor={{ true: colors.brand, false: colors.border }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 16,
        borderRadius: 12,
        backgroundColor: colors.surfaceMuted,
    },
    text: { flex: 1, gap: 2 },
    status: { color: colors.inkMuted, fontSize: 13 },
});
