import { createContext, useContext, useMemo, type ComponentProps } from 'react';
import { Pressable } from 'react-native';
import { SignalEmitter } from './behavior';
import { fromKeyboard } from './focus';
import type { Signals } from './triggers/types';

const Target = createContext<Signals | null>(null);

/** The signals of the nearest `LordIcon.Target` around, or null. */
export function useTarget(): Signals | null {
    return useContext(Target);
}

export type LordIconTargetProps = ComponentProps<typeof Pressable>;

/**
 * A Pressable that tells the icons inside when it is tapped, hovered or focused, for the
 * triggers that need it (`hover`, `click`, `morph`, `boomerang`, `loop-on-hover`). In React
 * Native a touch belongs to the button, not to what is in it: put this in place of your
 * Pressable, once, in your own button component. It has no look of its own; every prop of
 * Pressable works, `style={({ pressed }) => …}` and a function as children included.
 *
 *     <LordIcon.Target onPress={save} style={styles.button}>
 *         <LordIcon icon={floppy} trigger="hover" />
 *         <Text>Save</Text>
 *     </LordIcon.Target>
 *
 * The icons hear a press before `onPress` runs: their animation starts before the app's work.
 */
export function LordIconTarget(props: LordIconTargetProps) {
    const { onPress, onHoverIn, onHoverOut, onFocus, onBlur, ...rest } = props;
    const signals = useMemo(() => new SignalEmitter(), []);
    return (
        <Target.Provider value={signals}>
            <Pressable
                {...rest}
                onPress={(event) => {
                    signals.emit('press');
                    onPress?.(event);
                }}
                onHoverIn={(event) => {
                    signals.emit('enter');
                    onHoverIn?.(event);
                }}
                onHoverOut={(event) => {
                    signals.emit('leave');
                    onHoverOut?.(event);
                }}
                onFocus={(event) => {
                    if (fromKeyboard(event)) signals.emit('focus');
                    onFocus?.(event);
                }}
                onBlur={(event) => {
                    signals.emit('blur');
                    onBlur?.(event);
                }}
            />
        </Target.Provider>
    );
}
