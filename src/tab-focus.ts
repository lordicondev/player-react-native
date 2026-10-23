import { useEffect, useState } from 'react';

/** What `useTabFocus` needs of a screen's `navigation`: React Navigation's, Expo Router's. */
export interface FocusSource {
    isFocused(): boolean;
    addListener(type: 'focus' | 'blur', listener: () => void): () => void;
}

/**
 * Whether the screen of this `navigation` is focused, kept up to date by its `focus` and `blur`
 * events: the value for a tab's icon, in a component of its own (`tabBarIcon` is no component).
 *
 *     function TabIcon({ navigation, ...props }: LordIconProps & { navigation: FocusSource }) {
 *         return <LordIcon {...props} state="morph-select" value={useTabFocus(navigation)} />;
 *     }
 *
 * A tab bar draws its icon twice, focused and not, and shows one, so `focused` of `tabBarIcon`
 * never changes for either copy; and `navigation.isFocused()` read while the bar renders can be
 * a step behind (Expo Router). The events come once the focus has changed.
 */
export function useTabFocus(navigation: FocusSource): boolean {
    const [focused, setFocused] = useState(() => navigation.isFocused());

    useEffect(() => {
        const offFocus = navigation.addListener('focus', () => setFocused(true));
        const offBlur = navigation.addListener('blur', () => setFocused(false));
        return () => {
            offFocus();
            offBlur();
        };
    }, [navigation]);

    return focused;
}
