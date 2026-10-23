#!/usr/bin/env node
// Copies the web build's run-time files (the WebAssembly and the render worker) into a folder of
// the app's static files, for bundlers that do not copy them (Expo web): `lordicon-assets
// public/lordicon`, then `<LordIconProvider assets="/lordicon/">`. Run it after every install
// (`postinstall`), so the files always match the package's code.
import { copyFileSync, mkdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const FILES = ['lordicon.wasm', 'lordicon.worker.js'];
const dist = fileURLToPath(new URL('../dist/', import.meta.url));
const target = process.argv[2] ?? 'public/lordicon';

if (target === '-h' || target === '--help') {
    console.log('lordicon-assets [folder]: copies lordicon.wasm and lordicon.worker.js there');
    console.log('(public/lordicon by default); then <LordIconProvider assets="/lordicon/">.');
    process.exit(0);
}

mkdirSync(target, { recursive: true });
for (const file of FILES) copyFileSync(join(dist, file), join(target, file));
console.log(`@lordicon/react-native: ${FILES.join(', ')} -> ${relative('.', target) || '.'}`);
