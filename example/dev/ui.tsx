// The developer screens' small controls.
import { Pressable, StyleSheet, Text } from 'react-native';

export function Button(props: { label: string; onPress: () => void; active?: boolean }) {
    const { label, onPress, active } = props;
    return (
        <Pressable onPress={onPress} style={[styles.button, active && styles.buttonActive]}>
            <Text style={[styles.buttonText, active && styles.buttonTextActive]}>{label}</Text>
        </Pressable>
    );
}

export const styles = StyleSheet.create({
    flex: { flex: 1, backgroundColor: '#fff' },
    row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, padding: 6, justifyContent: 'center' },
    button: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, backgroundColor: '#eee' },
    buttonActive: { backgroundColor: '#121331' },
    buttonText: { color: '#121331', fontSize: 13 },
    buttonTextActive: { color: '#fff' },
    stats: { color: '#666', fontVariant: ['tabular-nums'], textAlign: 'center' },
});
