// The developer part: tests and measurements. Each also opens by a link (CI and scripts):
// lordicon-example://selftest, selftest-tap, list, demo, bench (web).
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

export type DeveloperScreen = 'SelfTest' | 'List' | 'Playground' | 'Bench';

const ITEMS: { screen: DeveloperScreen; title: string; description: string }[] = [
    { screen: 'SelfTest', title: 'Self-test', description: 'What CI runs: render modes, triggers' },
    { screen: 'List', title: 'List 200', description: 'Load: animating, sizes, render modes' },
    { screen: 'Playground', title: 'Playground', description: 'One icon: states, colours, stroke' },
    ...(Platform.OS === 'web'
        ? [{ screen: 'Bench' as const, title: 'Bench', description: 'Web renderers, timings' }]
        : []),
];

export function Developer(props: { open: (screen: DeveloperScreen) => void }) {
    return (
        <View>
            {ITEMS.map((item) => (
                <Pressable
                    key={item.screen}
                    style={styles.item}
                    onPress={() => props.open(item.screen)}
                >
                    <Text style={styles.title}>{item.title}</Text>
                    <Text style={styles.description}>{item.description}</Text>
                </Pressable>
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    item: { paddingHorizontal: 16, paddingVertical: 10 },
    title: { color: '#121331', fontSize: 16 },
    description: { color: '#666', fontSize: 13 },
});
