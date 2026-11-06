import puppeteer from 'puppeteer'; import chromium from '@sparticuz/chromium'; import fs from 'fs';
const U = '' + new URL('../udvidelse/', import.meta.url).pathname + '';
const src = ['qrcodegen.js', 'felles.js', 'qr.js', 'forsider.js', 'kopier.js', 'genveje.js'].map((f) => fs.readFileSync(U + f, 'utf8')).join('\n;\n').replace("mode: 'closed'", "mode: 'open'");
const b = await puppeteer.launch({ executablePath: await chromium.executablePath(), headless: 'shell', args: chromium.args });
const p = await b.newPage(); await p.setViewport({ width: 1200, height: 750 });
await p.evaluateOnNewDocument(`document.addEventListener('DOMContentLoaded', () => { ${src}\n });`);
await p.setRequestInterception(true);
p.on('request', (r) => r.respond({ status: 200, contentType: 'text/html; charset=utf-8', body: fs.readFileSync('' + new URL('./', import.meta.url).pathname + 'spa.html') }));
const w = (ms) => new Promise(r => setTimeout(r, ms));
await p.goto('https://cicero.systematic.com/circulation'); await w(400);
const toast = () => p.evaluate(() => { const h=[...document.documentElement.children].find(e=>e.shadowRoot); const t=h.shadowRoot.querySelector('.toast'); return t.classList.contains('vis')?t.textContent:''; });
for (const [sel, last] of [['#f1', true], ['#f2', true], ['#f1 div', false]]) {
  const pt = await p.evaluate((sel, last) => { const el = document.querySelector(sel); const n = last ? el.lastChild : el.firstChild; const r = document.createRange(); r.selectNodeContents(n); const b = r.getBoundingClientRect(); return [b.x + 10, b.y + b.height/2]; }, sel, last);
  await p.mouse.move(pt[0], pt[1], { steps: 2 }); await w(80);
  await p.keyboard.down('Control'); await w(250); await p.keyboard.press('KeyC'); await p.keyboard.up('Control'); await w(150);
  console.log(sel, last ? 'værdi' : 'overskrift', '→', await toast());
}
await b.close();
