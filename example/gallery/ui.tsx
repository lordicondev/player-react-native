// The gallery's look: colours and a few plain components, so that each example is about its
// icon and stays short. Nothing here knows about icons.
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type PressableProps } from 'react-native';

export const colors = {
    ink: '#0a0b0e',
    inkSoft: '#565c68',
    inkMuted: '#767c89',
    surface: '#ffffff',
    surfaceMuted: '#f7f8fa',
    surfaceSunken: '#eef0f3',
    border: '#dee1e6',
    brand: '#08c18a',
    brandSurface: '#e6f8f1',
};

/** A button with an icon (its children) and a label. */
export function Button({
    label,
    children,
    style,
    ...props
}: PressableProps & { label: string; children?: ReactNode }) {
    return (
        <Pressable
            accessibilityRole="button"
            style={(state) => [
                ui.button,
                state.pressed && ui.pressed,
                props.disabled && ui.disabled,
                typeof style === 'function' ? style(state) : style,
            ]}
            {...props}
        >
            {children}
            <Text style={ui.label}>{label}</Text>
        </Pressable>
    );
}

/** A choice among a few, on or off. */
export function Chip(props: { label: string; on: boolean; onPress: () => void }) {
    return (
        <Pressable onPress={props.onPress} style={[ui.chip, props.on && ui.chipOn]}>
            <Text style={[ui.chipLabel, props.on && ui.chipLabelOn]}>{props.label}</Text>
        </Pressable>
    );
}

/** A short line under or next to an icon. */
export function Caption(props: { children: ReactNode }) {
    return <Text style={ui.caption}>{props.children}</Text>;
}

export const ui = StyleSheet.create({
    page: { alignItems: 'flex-start', gap: 16 },
    center: { alignItems: 'center', gap: 16 },
    row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12 },
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 12,
        backgroundColor: colors.surfaceSunken,
    },
    pressed: { backgroundColor: colors.border },
    disabled: { opacity: 0.6 },
    label: { color: colors.ink, fontSize: 16, fontWeight: '500' },
    chip: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: colors.border,
    },
    chipOn: { borderColor: colors.brand, backgroundColor: colors.brandSurface },
    chipLabel: { color: colors.inkSoft },
    chipLabelOn: { color: colors.ink },
    item: { alignItems: 'center', gap: 8, minWidth: 96 },
    caption: { color: colors.inkMuted, fontSize: 13, textAlign: 'center' },
    field: {
        alignSelf: 'stretch',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
    },
    fieldFocused: { borderColor: colors.inkMuted },
    // The field's border shows the focus: no outline of the browser's on the web.
    input: {
        flex: 1,
        paddingVertical: 12,
        fontSize: 16,
        color: colors.ink,
        outlineStyle: 'solid',
        outlineWidth: 0,
    },
});
