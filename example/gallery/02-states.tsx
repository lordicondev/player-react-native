// README: "Your first icon". An icon holds several animations: `in-*` enters, `hover-*` plays
// once, `loop-*` repeats, `morph-*` goes to a second look and back. `state` picks one.
import { useRef, useState } from 'react';
import { View } from 'react-native';
import { LordIcon, type LordIconHandle } from '@lordicon/react-native';
import trash from '../icons/trash.json';
import { Chip, ui } from './ui';

export default function States() {
    const icon = useRef<LordIconHandle>(null);
    const [states, setStates] = useState<string[]>([]);
    const [state, setState] = useState<string>();

    return (
        <View style={ui.center}>
            <LordIcon
                ref={icon}
                icon={trash}
                state={state}
                trigger="loop(800)"
                size={96}
                onReady={() => setStates(icon.current?.states.map((s) => s.name) ?? [])}
            />
            <View style={[ui.row, { justifyContent: 'center' }]}>
                {states.map((name) => (
                    <Chip
                        key={name}
                        label={name}
                        on={name === (state ?? states[0])}
                        onPress={() => setState(name)}
                    />
                ))}
            </View>
        </View>
    );
}
