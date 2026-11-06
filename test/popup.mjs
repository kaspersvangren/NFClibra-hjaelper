import puppeteer from 'puppeteer'; import chromium from '@sparticuz/chromium'; import fs from 'fs';
const b = await puppeteer.launch({ executablePath: await chromium.executablePath(), headless: 'shell', args: [...chromium.args, '--allow-file-access-from-files'] });
const p = await b.newPage(); await p.setViewport({ width: 330, height: 520 });
await p.evaluateOnNewDocument(() => { const st = { forsider: false }; window.chrome = { runtime: { getManifest: () => ({ version: '0.2.0' }) }, storage: { sync: { get: (d, cb) => cb({ ...d, ...st }), set: (o) => Object.assign(st, o) } } }; });
for (const [navn, mode] of [['lys', 'light'], ['moerk', 'dark']]) {
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: mode }]);
  await p.goto('file://' + new URL('../udvidelse/', import.meta.url).pathname + 'popup.html'); await new Promise(r => setTimeout(r, 200));
  await p.screenshot({ path: `test/popup-${navn}.png`, fullPage: true });
}
await b.close();
