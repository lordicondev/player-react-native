// README: "Accessibility and less motion". Screen readers skip an icon until it has a label.
// When the viewer asks for less motion, icons calm down; motion="always" opts one out.
import { useEffect, useState } from 'react';
import { AccessibilityInfo, StyleSheet, Text, View } from 'react-native';
import { LordIcon } from '@lordicon/react-native';
import download from '../icons/download.json';
import lock from '../icons/lock.json';

export default function Accessibility() {
    const [reduced, setReduced] = useState(false);
    useEffect(() => {
        AccessibilityInfo.isReduceMotionEnabled().then(setReduced);
        const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
        return () => subscription.remove();
    }, []);

    return (
        <View style={styles.page}>
            <Text>Less motion is {reduced ? 'on' : 'off'} on this device.</Text>
            <View style={styles.row}>
                {/* Decoration: the screen reader skips it. */}
                <LordIcon icon={download} state="loop-cycle" trigger="loop" size={48} />
                {/* An image with a label, still when less motion is on. */}
                <LordIcon icon={lock} trigger="loop(1000)" size={48} accessibilityLabel="Locked" />
                {/* Moves even when less motion is on. */}
                <LordIcon
                    icon={download}
                    state="loop-cycle"
                    trigger="loop"
                    motion="always"
                    size={48}
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    page: { alignItems: 'center', gap: 16 },
    row: { flexDirection: 'row', gap: 24 },
});
