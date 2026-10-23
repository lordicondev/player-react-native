// README: "Following your app". A boolean `value` with a `morph-*` state: the icon goes to its
// second look when true, and back when false. The state stays in your app.
import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { LordIcon } from '@lordicon/react-native';
import eye from '../icons/eye.json';
import star from '../icons/star.json';
import { Button, ui } from './ui';

export default function Toggle() {
    const [saved, setSaved] = useState(false);
    const [shown, setShown] = useState(false);

    return (
        <View style={ui.page}>
            <Button label={saved ? 'Saved' : 'Save'} onPress={() => setSaved(!saved)}>
                <LordIcon icon={star} state="morph-select" value={saved} size={28} />
            </Button>
            <View style={ui.field}>
                <TextInput
                    style={ui.input}
                    defaultValue="correct horse"
                    secureTextEntry={!shown}
                    placeholder="Password"
                />
                <Pressable
                    accessibilityLabel={shown ? 'Hide password' : 'Show password'}
                    onPress={() => setShown(!shown)}
                >
                    <LordIcon icon={eye} state="morph-close" value={shown} size={24} />
                </Pressable>
            </View>
        </View>
    );
}
