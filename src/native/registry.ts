import { AppState } from 'react-native';
import { IconRegistry, CACHED_ICONS } from '../registry';
import { sourceOf } from '../props';
import NativeLordIcon from './NativeLordIcon';

/**
 * Icons in use, by native key: the view loads the JSON from the native registry, where the
 * models of cached icons stay too (cpp/models.h).
 */
export const registry = new IconRegistry<number>(
    {
        register: (icon) => NativeLordIcon.registerIcon(sourceOf(icon)),
        release: (key) => NativeLordIcon.releaseIcon(key),
    },
    1000,
    CACHED_ICONS,
);

// iOS: let go of the cached icons. Android has no such event in JS; the native side lets go of
// the models there.
AppState.addEventListener('memoryWarning', () => registry.flush());
