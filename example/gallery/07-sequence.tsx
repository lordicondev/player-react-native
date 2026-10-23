// README: "On its own". `sequence` is a script of steps: `play` a state, `wait` some time. It
// starts over at the end, unless it ends with `stop`.
import { Text, View } from 'react-native';
import { LordIcon } from '@lordicon/react-native';
import download from '../icons/download.json';
import trash from '../icons/trash.json';
import { Caption, ui } from './ui';

export default function Sequence() {
    return (
        <View style={[ui.row, { justifyContent: 'center', gap: 32 }]}>
            <View style={ui.item}>
                {/* Fills, empties, rests, and again. */}
                <LordIcon
                    icon={trash}
                    trigger="sequence(play morph-trash-full, wait 600, play morph-trash-full-to-empty, wait 1500)"
                    size={48}
                />
                <Text style={ui.label}>Fill, empty</Text>
                <Caption>and again</Caption>
            </View>
            <View style={ui.item}>
                {/* Enters, points down once, and stays. */}
                <LordIcon
                    icon={download}
                    trigger="sequence(play in-reveal, wait 600, play hover-slide, stop)"
                    size={48}
                />
                <Text style={ui.label}>Enter, point</Text>
                <Caption>once: ends with stop</Caption>
            </View>
        </View>
    );
}
