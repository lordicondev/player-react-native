import { copyFile, mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';

const dist = resolve(import.meta.dirname, 'dist');
const require = createRequire(import.meta.url);
const runtime = dirname(require.resolve('@lordicon/runtime/package.json'));

/** The web build resolves `.web.*` files first, as react-native-web setups do. */
export const extensions = ['.web.tsx', '.web.ts', '.tsx', '.ts', '.js', '.json'];

/**
 * src/web/workers.ts starts the worker from `./worker.ts` (development, from source); the
 * package ships it built, as dist/lordicon.worker.js (vite.worker.config.ts).
 */
function workerFromDist(): Plugin {
    return {
        name: 'worker-from-dist',
        enforce: 'pre',
        transform(code, id) {
            if (!id.endsWith('/src/web/workers.ts')) return null;
            const source = "new URL('./worker.ts', import.meta.url)";
            if (!code.includes(source))
                throw new Error('workers.ts changed: check workerFromDist()');
            return code.replace(source, "new URL('./lordicon.worker.js', import.meta.url)");
        },
    };
}

/**
 * Keeps the URLs of the worker and the WebAssembly (`new URL('./lordicon.wasm',
 * import.meta.url)`, in the runtime too) as written: library mode would inline the files as
 * base64. Marked `@vite-ignore` for this build, unmarked in dist, so the consumer's bundler
 * (Vite, webpack) emits the files.
 */
export function keepAssetUrls(names: string[]): Plugin {
    const files = names.map((name) => name.replaceAll('.', '\\.')).join('|');
    const quoted = `(["'\`]\\./(?:${files})["'\`])`;
    const plain = new RegExp(`new URL\\(\\s*${quoted}\\s*,\\s*import\\.meta\\.url\\s*\\)`, 'g');
    const marked = new RegExp(`/\\*\\s*@vite-ignore\\s*\\*/\\s*${quoted}`, 'g');
    return {
        name: 'keep-asset-urls',
        enforce: 'pre',
        apply: 'build',
        transform(code) {
            if (!code.match(plain)) return null;
            return code.replace(plain, 'new URL(/* @vite-ignore */ $1, import.meta.url)');
        },
        renderChunk(code) {
            return code.replace(marked, '$1');
        },
    };
}

/** The runtime's WebAssembly next to the code, where both the page and the worker load it. */
function copyWasm(): Plugin {
    return {
        name: 'copy-wasm',
        apply: 'build',
        async writeBundle() {
            await mkdir(dist, { recursive: true });
            await copyFile(resolve(runtime, 'dist/lordicon.wasm'), resolve(dist, 'lordicon.wasm'));
        },
    };
}

/**
 * The web build of the package (dist/index.js): what `.web.tsx` files make of the library, with
 * the runtime's JavaScript bundled in and its WebAssembly next to it. React, React Native
 * (react-native-web in the app) and utils-lottie stay imports. iOS and Android use src/.
 */
export default defineConfig({
    resolve: { extensions },
    plugins: [workerFromDist(), keepAssetUrls(['lordicon.wasm', 'lordicon.worker.js']), copyWasm()],
    build: {
        target: 'es2022',
        outDir: dist,
        emptyOutDir: false,
        lib: {
            formats: ['es'],
            entry: resolve(import.meta.dirname, 'src', 'index.ts'),
            fileName: () => 'index.js',
        },
        rollupOptions: {
            external: [/^react($|\/)/, /^react-native($|\/)/, /^@lordicon\/utils-lottie($|\/)/],
        },
    },
});
