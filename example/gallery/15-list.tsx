// README: "Lists". In a list that recycles its rows (FlashList, LegendList), give the icon the
// item's key: a recycled row shows its new item's value at once instead of animating to it.
// Each icon is parsed once, however many rows show it.
import { useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { LordIcon } from '@lordicon/react-native';
import checkCircleEmpty from '../icons/check-circle-empty.json';
import { colors } from './ui';

const TASKS = Array.from({ length: 200 }, (_, i) => ({ id: String(i), title: `Task ${i + 1}` }));

export default function List() {
    const [done, setDone] = useState<ReadonlySet<string>>(new Set());

    const toggle = (id: string) => {
        const next = new Set(done);
        if (!next.delete(id)) next.add(id);
        setDone(next);
    };

    return (
        <FlashList
            data={TASKS}
            extraData={done}
            renderItem={({ item }) => (
                <Pressable style={styles.row} onPress={() => toggle(item.id)}>
                    <LordIcon
                        icon={checkCircleEmpty}
                        state="morph-select"
                        value={done.has(item.id)}
                        recyclingKey={item.id}
                        size={28}
                    />
                    <Text style={[styles.title, done.has(item.id) && styles.done]}>
                        {item.title}
                    </Text>
                </Pressable>
            )}
        />
    );
}

const styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderColor: colors.border,
    },
    title: { color: colors.ink, fontSize: 16 },
    done: { color: colors.inkMuted },
});
