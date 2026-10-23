// README: "Following your app". A number `value`, such as unread messages: up from 0 the icon
// plays its `state` (here none: its default), each further step up its default state as a
// nudge; down, nothing. It rests on the first frame of that state: pick one that starts at rest,
// not a `loop-*` one, which starts mid-swing.
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LordIcon } from '@lordicon/react-native';
import bell from '../icons/bell.json';
import { Button, colors, ui } from './ui';

export default function Count() {
    const [unread, setUnread] = useState(0);

    return (
        <View style={ui.center}>
            <View>
                <LordIcon icon={bell} value={unread} size={64} />
                {unread > 0 && <Text style={styles.badge}>{unread}</Text>}
            </View>
            <View style={ui.row}>
                <Button label="New message" onPress={() => setUnread(unread + 1)} />
                <Button label="Read all" onPress={() => setUnread(0)} />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    badge: {
        position: 'absolute',
        top: 0,
        right: -4,
        minWidth: 22,
        paddingHorizontal: 6,
        borderRadius: 11,
        overflow: 'hidden',
        backgroundColor: colors.brand,
        color: colors.surface,
        fontSize: 13,
        lineHeight: 22,
        fontWeight: '600',
        textAlign: 'center',
        fontVariant: ['tabular-nums'],
    },
});
