// Beskeden om ny version i Cicero og i opsætningen
import puppeteer from 'puppeteer'; import chromium from '@sparticuz/chromium'; import fs from 'fs';
const U = new URL('../udvidelse/', import.meta.url).pathname, T = new URL('./', import.meta.url).pathname;
const src = ['qrcodegen.js', 'felles.js', 'qr.js', 'forsider.js', 'kopier.js', 'genveje.js', 'cpr.js', 'opdatering.js']
  .map((f) => fs.readFileSync(U + f, 'utf8')).join('\n;\n').replace("mode: 'closed'", "mode: 'open'");
const stub = `(() => { const L = JSON.parse(sessionStorage.getItem('L') || '{}'), S = JSON.parse(sessionStorage.getItem('S') || '{}'), lyt = [];
  const gem = () => { sessionStorage.setItem('L', JSON.stringify(L)); sessionStorage.setItem('S', JSON.stringify(S)); };
  const set = (area, mål) => (o, cb) => { const ch = {}; for (const k in o) { ch[k] = { newValue: o[k] }; mål[k] = o[k]; } gem(); lyt.forEach((f) => f(ch, area)); cb && cb(); };
  const get = (kilde) => (k, cb) => { const ks = Array.isArray(k) ? k : typeof k === 'string' ? [k] : null; const r = {};
    if (ks) ks.forEach((x) => (r[x] = kilde[x])); else Object.assign(r, k, kilde); cb(r); };
  window.chrome = { runtime: { sendMessage: (m, cb) => { window.__besked = m; cb && cb(); }, lastError: null, getManifest: () => ({ version: '0.4.0' }) },
    storage: { local: { get: get(L), set: set('local', L) }, sync: { get: get(S), set: set('sync', S) }, onChanged: { addListener: (f) => lyt.push(f) } } };
  window.__L = L; window.__S = S; window.__set = (a, o) => window.chrome.storage[a].set(o); })();`;
const b = await puppeteer.launch({ executablePath: await chromium.executablePath(), headless: 'shell', args: chromium.args });
const p = await b.newPage(); await p.setViewport({ width: 1100, height: 500 });
await p.evaluateOnNewDocument(stub + `document.addEventListener('DOMContentLoaded', () => { ${src}\n });`);
await p.setRequestInterception(true);
p.on('request', (r) => r.respond({ status: 200, contentType: 'text/html; charset=utf-8', body: fs.readFileSync(T + 'spa.html') }));
p.on('pageerror', (e) => console.log('SIDEFEJL', e.message));
const w = (ms) => new Promise((r) => setTimeout(r, ms));
let fejl = 0; const ok = (n, c, i = '') => { console.log((c ? 'OK   ' : 'FEJL ') + n + (i ? '  — ' + i : '')); if (!c) fejl++; };
const bar = () => p.evaluate(() => { const h = [...document.documentElement.children].find((e) => e.shadowRoot); const o = h.shadowRoot.querySelector('.opd');
  return { vis: o.style.display === 'flex', tekst: o.querySelector('.txt').textContent, href: o.querySelector('.hent').href }; });

await p.goto('https://cicero.systematic.com/circulation'); await w(300);
ok('Cicero-fanen beder baggrunden tjekke', (await p.evaluate(() => window.__besked && window.__besked.type)) === 'tjekOpdatering');
ok('Ingen besked, når der ikke er noget nyt', !(await bar()).vis);
await p.evaluate(() => window.__set('local', { opdatering: { tjekket: Date.now(), version: '0.4.1', ny: true, zip: 'https://github.com/kaspersvangren/NFClibra-hjaelper/releases/download/v0.4.1/NFClibra-hjaelper-0.4.1.zip', side: 'x' } }));
await w(100);
let s = await bar();
ok('Ny version: besked med link til zip vises med det samme', s.vis && s.tekst.includes('0.4.1') && s.href.endsWith('NFClibra-hjaelper-0.4.1.zip'), s.tekst);
await p.screenshot({ path: T + 'opdatering.png', clip: { x: 500, y: 400, width: 600, height: 100 } });
await p.evaluate(() => { const h = [...document.documentElement.children].find((e) => e.shadowRoot); h.shadowRoot.querySelector('.opd .senere').click(); });
await w(100);
ok('"Senere" skjuler beskeden', !(await bar()).vis);
await p.reload(); await w(300);
ok('… også efter genindlæsning samme dag', !(await bar()).vis);
await p.evaluate(() => window.__set('local', { opdateringUdsat: { version: '0.4.1', t: Date.now() - 25 * 3600e3 } })); await w(100);
ok('Næste dag kommer den igen', (await bar()).vis);
await p.evaluate(() => window.__set('local', { opdatering: { ...window.__L.opdatering, version: '0.4.2' }, opdateringUdsat: { version: '0.4.1', t: Date.now() } })); await w(100);
ok('En endnu nyere version vises, selv om den forrige blev udsat', (await bar()).vis && (await bar()).tekst.includes('0.4.2'));
await p.evaluate(() => window.__set('sync', { tjekOpdatering: false })); await w(100);
ok('Slået fra i opsætningen: ingen besked', !(await bar()).vis);
await b.close();
console.log(fejl ? fejl + ' FEJL' : 'ALT OK');
