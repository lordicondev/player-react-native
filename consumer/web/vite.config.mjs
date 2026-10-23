// react-native-web in a Vite app: the alias, and `.web.*` files first.
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const extensions = ['.web.tsx', '.web.ts', '.web.js', '.tsx', '.ts', '.js', '.json'];

export default defineConfig({
    plugins: [react()],
    resolve: { extensions, alias: { 'react-native': 'react-native-web' } },
    define: { __DEV__: 'false', global: 'globalThis' },
    optimizeDeps: { esbuildOptions: { resolveExtensions: extensions } },
});
