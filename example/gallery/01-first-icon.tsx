// README: "Your first icon". An icon is its Lottie JSON from lordicon.com, imported like code.
import { StyleSheet, View } from 'react-native';
import { LordIcon } from '@lordicon/react-native';
import lock from '../icons/lock.json';

export default function FirstIcon() {
    return (
        <View style={styles.row}>
            {/* Still, on the first frame of its default state. */}
            <LordIcon icon={lock} />
            {/* Plays once, when it comes into view. */}
            <LordIcon icon={lock} trigger="in" size={48} />
            {/* Over and over, a second's rest between rounds. */}
            <LordIcon icon={lock} trigger="loop(1000)" size={96} />
        </View>
    );
}

const styles = StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: 24 },
});
