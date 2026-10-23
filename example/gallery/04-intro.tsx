// README: "On its own". `intro` plays a state once, when the icon comes into view: an icon
// enters with its screen. A delay lets icons come in one after another.
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LordIcon } from '@lordicon/react-native';
import cart from '../icons/cart.json';
import gridWidget from '../icons/grid-widget.json';
import magnifier from '../icons/magnifier.json';
import { Button, ui } from './ui';

const ITEMS = [
    { title: 'Home', icon: gridWidget },
    { title: 'Search', icon: magnifier },
    { title: 'Cart', icon: cart },
];

export default function Intro() {
    const [round, setRound] = useState(0);
    return (
        <View style={ui.center}>
            {/* A new key mounts them again, and the icons enter again. */}
            <View key={round} style={styles.items}>
                {ITEMS.map((item, i) => (
                    <View key={item.title} style={ui.item}>
                        <LordIcon
                            icon={item.icon}
                            intro={`in-reveal, delay=${i * 200}`}
                            size={48}
                        />
                        <Text style={ui.label}>{item.title}</Text>
                    </View>
                ))}
            </View>
            <Button label="Again" onPress={() => setRound(round + 1)} />
        </View>
    );
}

const styles = StyleSheet.create({
    items: { flexDirection: 'row', gap: 32 },
});
