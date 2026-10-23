import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import { extensions, keepAssetUrls } from './vite.config';

/** dist/lordicon.worker.js: the render worker in one file, the runtime's JavaScript in it. */
export default defineConfig({
    resolve: { extensions },
    plugins: [keepAssetUrls(['lordicon.wasm'])],
    build: {
        target: 'es2022',
        outDir: resolve(import.meta.dirname, 'dist'),
        emptyOutDir: false,
        lib: {
            formats: ['es'],
            entry: resolve(import.meta.dirname, 'src/web/worker.ts'),
            fileName: () => 'lordicon.worker.js',
        },
    },
});
