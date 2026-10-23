// The gallery's index, and the frame of an example: its description and README section.
import { Pressable, ScrollView, SectionList, StyleSheet, Text, View } from 'react-native';
import { EXAMPLES, SECTIONS, type Example } from './index';
import { colors } from './ui';

export function Gallery(props: { open: (example: Example) => void; openDeveloper: () => void }) {
    return (
        <SectionList
            sections={SECTIONS}
            keyExtractor={(example) => example.id}
            renderSectionHeader={({ section }) => (
                <Text style={styles.section}>{section.title}</Text>
            )}
            renderItem={({ item }) => (
                <Pressable style={styles.item} onPress={() => props.open(item)}>
                    <Text style={styles.title}>
                        {item.id} {item.title}
                    </Text>
                    <Text style={styles.description}>{item.description}</Text>
                </Pressable>
            )}
            ListFooterComponent={
                <Pressable style={styles.item} onPress={props.openDeveloper}>
                    <Text style={styles.title}>Developer</Text>
                    <Text style={styles.description}>Self-test, 200 icons, playground, bench</Text>
                </Pressable>
            }
        />
    );
}

export function ExampleScreen(props: { id: string }) {
    const example = EXAMPLES.find((e) => e.id === props.id);
    if (!example) return <Text style={styles.description}>No example {props.id}</Text>;
    const { Screen, fill, description, readme } = example;
    const about = (
        <Text style={[styles.about, fill && styles.aboutFill]}>
            {description}. README: “{readme}”.
        </Text>
    );
    if (fill) {
        return (
            <View style={styles.fill}>
                {about}
                <Screen />
            </View>
        );
    }
    return (
        <ScrollView contentContainerStyle={styles.page}>
            {about}
            <Screen />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    section: {
        padding: 12,
        paddingTop: 20,
        color: colors.inkSoft,
        fontWeight: '600',
        backgroundColor: '#fff',
    },
    item: { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#fff' },
    title: { color: colors.ink, fontSize: 16 },
    description: { color: colors.inkSoft, fontSize: 13 },
    page: { padding: 16, gap: 16, backgroundColor: '#fff', flexGrow: 1 },
    fill: { flex: 1, backgroundColor: '#fff' },
    about: { color: colors.inkSoft, paddingBottom: 4 },
    aboutFill: { paddingHorizontal: 16, paddingTop: 12 },
});
