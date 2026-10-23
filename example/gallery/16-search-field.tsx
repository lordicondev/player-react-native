// README: "Following your app". A search field: the magnifier plays when the field gets focus,
// the cross enters when there is text to clear. Two booleans of the field, as values.
import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { LordIcon } from '@lordicon/react-native';
import cross from '../icons/cross.json';
import magnifier from '../icons/magnifier.json';
import { colors, ui } from './ui';

export default function SearchField() {
    const [focused, setFocused] = useState(false);
    const [query, setQuery] = useState('');

    return (
        <View style={[ui.field, focused && ui.fieldFocused]}>
            <LordIcon icon={magnifier} value={focused} size={24} />
            <TextInput
                style={ui.input}
                value={query}
                onChangeText={setQuery}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                placeholder="Search"
                placeholderTextColor={colors.inkMuted}
            />
            {/* Hidden while there is nothing to clear; it enters again each time text comes. */}
            <Pressable
                accessibilityLabel="Clear"
                disabled={!query}
                onPress={() => setQuery('')}
                style={{ opacity: query ? 1 : 0 }}
            >
                <LordIcon icon={cross} state="in-reveal" value={query !== ''} size={20} />
            </Pressable>
        </View>
    );
}
