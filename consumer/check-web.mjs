// Builds a consumer web app (vite, webpack or expo, from create.sh), serves it and opens it in
// browsers: passes on `LORDICON_CONSUMER PASS`. Playwright comes from ../example.
// Usage: node check-web.mjs <vite|webpack|expo> <dir> [chromium,firefox,webkit]
import { spawn, spawnSync } from 'node:child_process';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { extname, join, resolve } from 'node:path';

const [flavour, dirArg, browserList = 'chromium,firefox'] = process.argv.slice(2);
if (!flavour || !dirArg)
    throw new Error('usage: check-web.mjs <vite|webpack|expo> <dir> [browsers]');
const dir = resolve(dirArg);
const playwright = createRequire(join(import.meta.dirname, '../example/package.json'))(
    'playwright',
);
const run = (command, args) => {
    const result = spawnSync(command, args, {
        cwd: dir,
        stdio: 'inherit',
        env: { ...process.env, CI: '1' },
    });
    if (result.status !== 0) throw new Error(`${command} ${args.join(' ')} failed`);
};

let url;
let stop;
if (flavour === 'expo') {
    run('npx', ['expo', 'export', '--platform', 'web', '--output-dir', 'dist']);
    const port = 8790;
    const server = spawn('npx', ['expo', 'serve', 'dist', '--port', String(port)], {
        cwd: dir,
        stdio: 'ignore',
        env: { ...process.env, CI: '1' },
        detached: true,
    });
    stop = () => process.kill(-server.pid);
    url = `http://localhost:${port}/`;
    for (let i = 0; i < 60; i++) {
        const ok = await fetch(url).then(
            (r) => r.ok,
            () => false,
        );
        if (ok) break;
        await new Promise((r) => setTimeout(r, 500));
    }
} else {
    run('npm', ['run', 'build']);
    const root = join(dir, 'dist');
    const types = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.wasm': 'application/wasm',
        '.css': 'text/css',
        '.json': 'application/json',
    };
    const server = createServer((request, response) => {
        let file = join(root, decodeURIComponent(new URL(request.url, 'http://x').pathname));
        if (!existsSync(file) || statSync(file).isDirectory()) file = join(root, 'index.html');
        response.writeHead(200, {
            'content-type': types[extname(file)] ?? 'application/octet-stream',
        });
        createReadStream(file).pipe(response);
    });
    await new Promise((r) => server.listen(0, r));
    stop = () => server.close();
    url = `http://localhost:${server.address().port}/`;
}

let failed = 0;
for (const [name, query] of browserList.split(',').flatMap((b) => [
    [b, ''],
    [b, '?workers'],
])) {
    const browser = await playwright[name].launch();
    const page = await browser.newPage();
    const outcome = new Promise((done) => {
        page.on('pageerror', (error) => done(`FAIL: ${error.message}`));
        page.on('console', (message) => {
            const line = /LORDICON_CONSUMER (.*)/.exec(message.text())?.[1];
            if (line) done(line);
        });
        setTimeout(() => done('FAIL: no result in 60 s'), 60000);
    });
    await page.goto(url + query);
    const line = await outcome;
    console.log(`consumer ${flavour} ${name}${query && ' (workers)'}: ${line}`);
    if (!line.startsWith('PASS')) failed++;
    await browser.close();
}
stop();
process.exit(failed ? 1 : 0);
