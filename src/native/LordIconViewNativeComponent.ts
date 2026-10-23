// Codegen spec of the native view (Android: Kotlin, iOS: Objective-C++). The view only renders:
// it loads the icon (by its key in the native registry) and draws what the player's commands
// set (colours, stroke, playback); they come through the module (NativeLordIcon), addressed by
// `viewId`. States and promises are the player's (src/player), in TypeScript.
import type { CodegenTypes, HostComponent, ViewProps } from 'react-native';
import { codegenNativeComponent } from 'react-native';

export interface NativeProps extends ViewProps {
    /** Where the module's commands for this view go (NativeLordIcon); unique per <LordIcon>. */
    viewId?: CodegenTypes.Int32;
    /** The icon's key in the native registry (NativeLordIcon); 0 for none. */
    icon?: CodegenTypes.Int32;
    /** Where frames are rendered: on the UI thread, or on render threads. */
    renderMode?: CodegenTypes.WithDefault<'ui' | 'background', 'background'>;
    /** Render threads for `background`: icons spread over this many. */
    workers?: CodegenTypes.WithDefault<CodegenTypes.Int32, 1>;
    /** Frames per second at most; 0 for every display frame. */
    frameRate?: CodegenTypes.WithDefault<CodegenTypes.Float, 0>;
    /** Watch for the view to come into view: `onVisible` once, when half of it shows. */
    observeVisibility?: CodegenTypes.WithDefault<boolean, false>;
    /** The icon loaded (`ok`) or could not be read. Commands sent before it may be lost. */
    onLoad?: CodegenTypes.DirectEventHandler<Readonly<{ ok: boolean }>>;
    /** The segment played to its end; `token` is the one `play` was given. */
    onComplete?: CodegenTypes.DirectEventHandler<Readonly<{ token: CodegenTypes.Int32 }>>;
    /** Half of the view shows on screen, with `observeVisibility`; once per observation. */
    onVisible?: CodegenTypes.DirectEventHandler<Readonly<{ visible: boolean }>>;
}

type ComponentType = HostComponent<NativeProps>;

export default codegenNativeComponent<NativeProps>('LordIconView') as ComponentType;
