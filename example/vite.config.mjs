// The example app on the web: react-native-web for react-native, `.web.*` files first (as
// Metro does for the web), the library from the parent directory as source.
import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const extensions = ['.web.tsx', '.web.ts', '.tsx', '.ts', '.web.js', '.js', '.json'];

export default defineConfig({
    root: path.join(import.meta.dirname, 'web'),
    plugins: [react()],
    resolve: {
        extensions,
        alias: {
            'react-native': 'react-native-web',
            '@lordicon/react-native': path.join(import.meta.dirname, '../src/index.ts'),
        },
        dedupe: ['react', 'react-dom', 'react-native-web'],
    },
    // FlashList reads `global` (Metro defines it).
    define: { __DEV__: 'true', 'process.env.NODE_ENV': '"development"', global: 'globalThis' },
    optimizeDeps: { esbuildOptions: { resolveExtensions: extensions } },
    server: { port: 8081, fs: { allow: [path.join(import.meta.dirname, '../..')] } },
});
