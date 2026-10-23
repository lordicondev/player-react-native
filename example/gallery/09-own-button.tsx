// README: "Taps". Put LordIcon.Target in place of the Pressable of your own button component,
// once: icons inside hear its taps and play their trigger. The button keeps its own look and
// onPress. (On the web it passes on hover and keyboard focus too: `trigger="hover"`.)
import type { ReactNode } from 'react';
import { Text, View, type PressableProps } from 'react-native';
import { LordIcon } from '@lordicon/react-native';
import download from '../icons/download.json';
import folder from '../icons/folder.json';
import heart from '../icons/heart.json';
import star from '../icons/star.json';
import { ui } from './ui';

function Button({
    label,
    children,
    ...props
}: PressableProps & { label: string; children: ReactNode }) {
    return (
        <LordIcon.Target
            accessibilityRole="button"
            style={({ pressed }) => [ui.button, pressed && ui.pressed]}
            {...props}
        >
            {children}
            <Text style={ui.label}>{label}</Text>
        </LordIcon.Target>
    );
}

export default function OwnButton() {
    return (
        <View style={ui.page}>
            {/* Plays on every tap. */}
            <Button label="Download">
                <LordIcon icon={download} trigger="click" size={28} />
            </Button>
            {/* To its second look and back. */}
            <Button label="Like">
                <LordIcon icon={heart} state="morph-select" trigger="morph" size={28} />
            </Button>
            {/* There and straight back. */}
            <Button label="Files">
                <LordIcon icon={folder} state="morph-select" trigger="boomerang" size={28} />
            </Button>
            {/* The pressed state as a value: there while held, back on release. */}
            <LordIcon.Target style={({ pressed }) => [ui.button, pressed && ui.pressed]}>
                {({ pressed }) => (
                    <>
                        <LordIcon icon={star} state="morph-select" value={pressed} size={28} />
                        <Text style={ui.label}>Hold me</Text>
                    </>
                )}
            </LordIcon.Target>
        </View>
    );
}
