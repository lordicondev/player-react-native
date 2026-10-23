// README: "On its own". `loop` plays a state over and over: a `loop-*` state is made for it, its
// end runs into its start. `loop(1500)` rests between rounds: give it a state that plays once,
// such as a `hover-*` one, repeated now and then.
import { Text, View } from 'react-native';
import { LordIcon } from '@lordicon/react-native';
import cog from '../icons/cog.json';
import spinnerCircle from '../icons/spinner-circle.json';
import { Caption, ui } from './ui';

export default function Loops() {
    return (
        <View style={[ui.row, { justifyContent: 'center', gap: 32 }]}>
            <View style={ui.item}>
                <LordIcon icon={spinnerCircle} state="loop-snake-alt" trigger="loop" size={48} />
                <Text style={ui.label}>Loading</Text>
                <Caption>loop</Caption>
            </View>
            <View style={ui.item}>
                <LordIcon icon={cog} state="hover-mechanic" trigger="loop(1500)" size={48} />
                <Text style={ui.label}>Settings</Text>
                <Caption>loop(1500)</Caption>
            </View>
        </View>
    );
}
