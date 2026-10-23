// README: "Taps". A button you cannot change (a UI library's): play the icon from its onPress.
// play() returns a promise, true once the animation has played to the end: wait for it to do
// the work after the icon has shown it.
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LordIcon, type LordIconHandle } from '@lordicon/react-native';
import link from '../icons/link.json';
import trash from '../icons/trash.json';
import { Button, colors, ui } from './ui';

const FILES = ['Report.pdf', 'Holiday.jpg', 'Notes.txt'];

export default function AnyButton() {
    const linkIcon = useRef<LordIconHandle>(null);
    const [copied, setCopied] = useState(false);
    const [files, setFiles] = useState(FILES);

    return (
        <View style={ui.page}>
            {/* Play and do the work at once. */}
            <Button
                label={copied ? 'Copied' : 'Copy link'}
                onPress={() => {
                    linkIcon.current?.play();
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                }}
            >
                <LordIcon ref={linkIcon} icon={link} size={28} />
            </Button>

            {/* Play, then do the work: the file goes into the bin, then the row goes. */}
            <View style={styles.list}>
                {files.map((name) => (
                    <FileRow
                        key={name}
                        name={name}
                        onDelete={() => setFiles((all) => all.filter((file) => file !== name))}
                    />
                ))}
                {!files.length && (
                    <Button label="Bring the files back" onPress={() => setFiles(FILES)} />
                )}
            </View>
        </View>
    );
}

function FileRow(props: { name: string; onDelete: () => void }) {
    const icon = useRef<LordIconHandle>(null);
    return (
        <View style={styles.row}>
            <Text style={styles.name}>{props.name}</Text>
            <Pressable
                accessibilityLabel={`Delete ${props.name}`}
                onPress={async () => {
                    if (await icon.current?.play({ state: 'morph-trash-full' })) props.onDelete();
                }}
            >
                <LordIcon ref={icon} icon={trash} size={28} />
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    list: { alignSelf: 'stretch', gap: 8 },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
        backgroundColor: colors.surfaceMuted,
    },
    name: { flex: 1, color: colors.ink, fontSize: 16 },
});
