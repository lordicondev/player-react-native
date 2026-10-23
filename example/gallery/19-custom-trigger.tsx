// README: "Custom triggers". A trigger of your own: it hears signals (`press` and, on the web,
// `enter`, from a LordIcon.Target) and plays the icon's states. This one is a bin: it enters
// once ready, a tap fills or empties it, a hover nudges it the way that fits.
import { Text } from 'react-native';
import { BaseTrigger, defineTrigger, LordIcon, type TriggerContext } from '@lordicon/react-native';
import trash from '../icons/trash.json';
import { ui } from './ui';

class Bin extends BaseTrigger {
    #full = false;

    constructor(context: TriggerContext) {
        super(context);
        this.on('press', () => {
            this.#full = !this.#full;
            void this.player.play({
                state: this.#full ? 'morph-trash-full' : 'morph-trash-full-to-empty',
            });
        });
        this.on('enter', () => {
            void this.player.play({ state: this.#full ? 'hover-trash-full' : 'hover-trash-empty' });
        });
    }

    onReady(): void {
        void this.player.play({ state: 'in-trash-empty' });
    }
}

defineTrigger('bin', Bin);

export default function CustomTrigger() {
    return (
        <LordIcon.Target style={({ pressed }) => [ui.button, pressed && ui.pressed]}>
            <LordIcon icon={trash} trigger="bin" size={48} />
            <Text style={ui.label}>Tap to fill or empty</Text>
        </LordIcon.Target>
    );
}
