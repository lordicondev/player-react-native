import type { ColorMap, Stroke } from '@lordicon/utils-lottie';
import { createContext, useContext, type ReactNode } from 'react';
import type { ColorValue } from 'react-native';
import type { MotionMode } from './motion';
import type { Assets } from './web/assets';

export type { Assets } from './web/assets';

export interface RenderOptions {
    /**
     * Where frames are rendered. iOS and Android: `background` (default) on render threads, the
     * UI thread only swaps finished frames in; `ui` on the UI thread, in the frame callback.
     * Web: the main thread by default; `background` in render workers (OffscreenCanvas), which
     * leaves the main thread free at some more CPU in all.
     */
    thread?: 'ui' | 'background';
    /**
     * Render threads (workers on the web) for `background`: icons spread over this many.
     * Default 1 on iOS and Android, 2 on the web (1 on a two-core machine).
     */
    workers?: number;
    /**
     * Frames per second at most. iOS and Android: 60 by default (icons are made at 60; on a
     * 120 Hz screen this takes about a third less CPU), `0` for every display frame. Web: every
     * display frame by default.
     */
    frameRate?: number;
}

export interface CacheOptions {
    /**
     * Icons kept in memory once no `<LordIcon>` shows them (their JSON on the native side and
     * their parsed model), the ones unused the longest ago going first: showing one again costs
     * nothing. 32 by default; 0 lets them go at once. On a memory warning they go.
     */
    icons?: number;
}

export interface LordIconConfig {
    /** Colours of the icons inside that set none: a theme (light, dark) in one place. */
    colors?: ColorMap;
    /** One colour for the icons inside that set no `color` (a tint, like `currentColor`). */
    color?: ColorValue;
    /** Stroke of the icons inside that set none. */
    stroke?: Stroke;
    /** `always`: the icons inside animate even when the viewer asked for less motion. */
    motion?: MotionMode;
    render?: RenderOptions;
    /** For the whole app: the first `LordIconProvider` (at the root) should set it. */
    cache?: CacheOptions;
    /**
     * Web only: where the WebAssembly and the render worker are, when not next to the package's
     * code (own hosting, strict CSP). A folder URL, or a URL (or the `.wasm`'s bytes) per file.
     * The first icons on the page decide: the runtime loads once.
     */
    assets?: Assets;
}

const Config = createContext<LordIconConfig>({});

/** The configuration of the icons inside: `<LordIconProvider render={{ workers: 2 }}>`. */
export function LordIconProvider({
    children,
    ...config
}: LordIconConfig & { children?: ReactNode }) {
    return <Config.Provider value={config}>{children}</Config.Provider>;
}

export function useLordIconConfig(): LordIconConfig {
    return useContext(Config);
}
