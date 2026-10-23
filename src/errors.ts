/**
 * What did not load: the icon's JSON (`icon`), or on the web the WebAssembly (`wasm`) or the
 * render worker (`worker`).
 */
export type LoadErrorKind = 'icon' | 'wasm' | 'worker';

const MESSAGES: Record<LoadErrorKind, string> = {
    icon: 'the icon could not be loaded: is it the Lottie JSON of a Lordicon icon?',
    wasm:
        'lordicon.wasm did not load. Where the bundler does not copy it (Expo web), host it ' +
        'and set LordIconProvider assets: see "Web" in the README',
    worker:
        'lordicon.worker.js did not load. Where the bundler does not copy it (Expo web), host it ' +
        'and set LordIconProvider assets: see "Web" in the README',
};

/** Why an icon did not load, as `onError` gets it. */
export class LordIconLoadError extends Error {
    readonly kind: LoadErrorKind;

    constructor(kind: LoadErrorKind, cause?: unknown) {
        const detail = cause === undefined ? '' : ` (${describe(cause)})`;
        super(`@lordicon/react-native: ${MESSAGES[kind]}${detail}`, { cause });
        this.name = 'LordIconLoadError';
        this.kind = kind;
    }
}

function describe(cause: unknown): string {
    if (cause instanceof Error) return cause.message;
    if (typeof cause === 'object' && cause && 'message' in cause) return String(cause.message);
    return String(cause);
}

const logged = new Set<LoadErrorKind>();

/** The error for `onError`, logged once per page and kind (as a missing image is). */
export function loadError(kind: LoadErrorKind, cause?: unknown): LordIconLoadError {
    const error = new LordIconLoadError(kind, cause);
    if (!logged.has(kind)) {
        logged.add(kind);
        console.error(error.message);
    }
    return error;
}
