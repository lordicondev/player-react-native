/** The files the web build loads at run time, as the package ships them in `dist`. */
export type AssetName = 'lordicon.wasm' | 'lordicon.worker.js';

/**
 * Where the WebAssembly and the render worker are: a folder URL (`'/static/lordicon/'`), or per
 * file a URL (or for the `.wasm`, its bytes). By default they load from next to the package's
 * code, where bundlers (Vite, webpack) find and copy them.
 */
export type Assets = string | Partial<Record<AssetName, string | URL | ArrayBuffer>>;

/** The page's base URL. Read through globalThis: this file is typed without the DOM on native. */
function baseUri(): string {
    return (globalThis as { document?: { baseURI: string } }).document?.baseURI ?? '';
}

/** The asset as `assets` say, or undefined for the default, next to the code. */
export function assetOf(
    name: AssetName,
    assets: Assets | undefined,
): string | ArrayBuffer | undefined {
    if (assets === undefined) return undefined;
    if (typeof assets === 'string') {
        const folder = assets.endsWith('/') ? assets : `${assets}/`;
        return new URL(name, new URL(folder, baseUri())).href;
    }
    const asset = assets[name];
    if (asset === undefined || asset instanceof ArrayBuffer) return asset;
    return new URL(asset, baseUri()).href;
}
