// The self-test in browsers, without an emulator: starts the example on Vite, opens
// /selftest-tap in each browser, clicks what the self-test asks for (`LORDICON_SELFTEST TAP
// <label>`: the view with that accessibility label) and fails when it does not pass.
// Usage: node e2e-web.mjs [--headed] [--browsers chromium,firefox,webkit] [--out dir]
// Browsers: `npx playwright install chromium firefox webkit` once.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium, firefox, webkit } from 'playwright';
import { createServer } from 'vite';

const args = process.argv.slice(2);
const option = (name, fallback) => {
    const i = args.indexOf(name);
    return i >= 0 ? args[i + 1] : fallback;
};
const headed = args.includes('--headed');
const names = option('--browsers', 'chromium,firefox').split(',');
const out = option('--out', 'e2e-web-out');
const TIMEOUT_MS = 180_000;
const BROWSERS = { chromium, firefox, webkit };

const server = await createServer({
    configFile: join(import.meta.dirname, 'vite.config.mjs'),
    server: { port: 0, strictPort: false },
    logLevel: 'warn',
});
await server.listen();
const base = server.resolvedUrls.local[0].replace(/\/$/, '');
mkdirSync(out, { recursive: true });

async function run(name) {
    const browser = await BROWSERS[name].launch({ headless: !headed });
    const page = await browser.newPage({ viewport: { width: 420, height: 900 } });
    const log = [];
    const result = new Promise((resolve) => {
        page.on('pageerror', (error) => resolve(`FAIL: ${error.message}`));
        page.on('console', (message) => {
            const text = message.text();
            log.push(`[${message.type()}] ${text}`);
            const line = /LORDICON_SELFTEST (.*)/.exec(text)?.[1];
            if (!line) return;
            console.log(`${name}: ${line}`);
            const tap = /^TAP (\S+)/.exec(line)?.[1];
            if (tap) void page.locator(`[aria-label="${tap}"]`).first().click();
            if (/^(PASS|FAIL)/.test(line)) resolve(line);
        });
    });
    await page.goto(`${base}/selftest-tap`);
    const timer = new Promise((resolve) =>
        setTimeout(() => resolve(`FAIL: no result in ${TIMEOUT_MS / 1000} s`), TIMEOUT_MS),
    );
    const outcome = await Promise.race([result, timer]);
    writeFileSync(join(out, `${name}.log`), log.join('\n') + '\n');
    if (!outcome.startsWith('PASS')) await page.screenshot({ path: join(out, `${name}.png`) });
    await browser.close();
    return outcome;
}

let failed = 0;
for (const name of names) {
    const outcome = await run(name).catch((error) => `FAIL: ${error.message.split('\n')[0]}`);
    console.log(`e2e-web ${name}: ${outcome}`);
    if (!outcome.startsWith('PASS')) failed++;
}
await server.close();
process.exit(failed ? 1 : 0);
