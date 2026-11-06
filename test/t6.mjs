import puppeteer from 'puppeteer'; import chromium from '@sparticuz/chromium'; import fs from 'fs';
const U = '' + new URL('../udvidelse/', import.meta.url).pathname + '';
const src = ['qrcodegen.js', 'felles.js', 'qr.js', 'forsider.js', 'kopier.js', 'genveje.js', 'cpr.js'].map((f) => fs.readFileSync(U + f, 'utf8')).join('\n;\n').replace("mode: 'closed'", "mode: 'open'");
const stub = `window.__lyt=[];window.__st={};window.chrome={storage:{sync:{get:(d,cb)=>cb({...d,...window.__st}),set:(o)=>{const ch={};for(const k in o){ch[k]={newValue:o[k]};window.__st[k]=o[k];}window.__lyt.forEach(f=>f(ch,'sync'));}},onChanged:{addListener:(f)=>window.__lyt.push(f)}}};`;
const b = await puppeteer.launch({ executablePath: await chromium.executablePath(), headless: 'shell', args: chromium.args });
const p = await b.newPage(); await p.setViewport({ width: 1100, height: 600 });
await p.evaluateOnNewDocument(stub + `document.addEventListener('DOMContentLoaded', () => { ${src}\n });`);
await p.setRequestInterception(true);
p.on('request', (r) => r.respond({ status: 200, contentType: 'text/html; charset=utf-8', body: fs.readFileSync('' + new URL('./', import.meta.url).pathname + 'spa.html') }));
p.on('pageerror', (e) => console.log('SIDEFEJL', e.message));
const w = (ms) => new Promise(r => setTimeout(r, ms));
let fejl = 0; const ok = (n, c, i = '') => { console.log((c ? 'OK   ' : 'FEJL ') + n + (i ? '  — ' + i : '')); if (!c) fejl++; };
const attr = (sel) => p.$eval(sel, (e) => e.getAttribute('data-nh-cpr'));
const views = () => p.evaluate(() => { const h=[...document.documentElement.children].find(e=>e.shadowRoot); return [...h.shadowRoot.querySelectorAll('.cprv')].filter(e=>e.style.display==='flex').map(e=>e.textContent); });
const eyes = () => p.evaluate(() => { const h=[...document.documentElement.children].find(e=>e.shadowRoot); return [...h.shadowRoot.querySelectorAll('.eye')].filter(e=>e.style.display==='block').map(e=>{const r=e.getBoundingClientRect();return [r.x+11,r.y+11];}); });
const toast = () => p.evaluate(() => { const h=[...document.documentElement.children].find(e=>e.shadowRoot); const t=h.shadowRoot.querySelector('.toast'); return t.classList.contains('vis')?t.textContent:''; });

await p.goto('https://cicero.systematic.com/patron/detalje'); await w(500);
ok('CPR-felt uden fokus er skjult', await attr('#cprf') === 'skjult');
let v = await views();
ok('Viser 311210-**** i feltet og ved CPR-teksten', v.includes('311210-****') && v.includes('010180-****'), JSON.stringify(v));
ok('Materialenummer med samme form skjules ikke', await attr('#matnr') === null);
await p.screenshot({ path: 'test/cpr-visning.png', clip: { x: 0, y: 40, width: 700, height: 200 } });
let e = await eyes(); ok('Øje ved felt og tekst', e.length === 2, e.length + ' øjne');
await p.mouse.move(e[0][0], e[0][1]); await p.mouse.down(); await w(80);
ok('Øjet holdt nede viser hele nummeret', await attr('#cprf') === null && !(await views()).includes('311210-****'));
await p.screenshot({ path: 'test/cpr-oeje.png', clip: { x: 0, y: 40, width: 700, height: 200 } });
await p.mouse.up(); await w(80);
ok('Sluppet: skjult igen', await attr('#cprf') === 'skjult');
await p.click('#cprf'); await w(80);
ok('CPR-felt med fokus: prikker', await attr('#cprf') === 'prikker' && !(await views()).includes('311210-****'));
await p.screenshot({ path: 'test/cpr-fokus.png', clip: { x: 0, y: 40, width: 700, height: 200 } });
// Ctrl-kopiering
await p.keyboard.press('Escape'); await p.evaluate(() => document.activeElement.blur()); await w(50);
const r = await p.$eval('#cprf', (x) => { const b = x.getBoundingClientRect(); return [b.x + 30, b.y + b.height / 2]; });
await p.mouse.move(r[0], r[1]); await p.keyboard.down('Control'); await w(250); await p.keyboard.press('KeyC'); await p.keyboard.up('Control'); await w(150);
ok('Ctrl+C viser kun 311210-**** i beskeden', await toast() === 'Kopieret: 311210-****', await toast());

// Indtastning i Låner-feltet
await p.goto('https://cicero.systematic.com/reservations/create'); await w(400);
await p.click('#resl'); await p.keyboard.type('3', { delay: 0 });
ok('Første ciffer er prikket, allerede når det tastes', await p.evaluate(() => window.attrVedInput) === 'prikker');
await p.keyboard.type('112101234'); await w(50);
ok('Hele CPR tastet: prikker', await attr('#resl') === 'prikker');
const geo = await p.evaluate(() => {
  const h=[...document.documentElement.children].find(e=>e.shadowRoot);
  const eye=[...h.shadowRoot.querySelectorAll('.eye')].find(e=>e.style.display==='block');
  const e=eye.querySelector('svg').getBoundingClientRect();
  const a=document.querySelector('#ik1 svg').getBoundingClientRect(), b=document.querySelector('#ik2 svg').getBoundingClientRect();
  const sk=document.querySelector('.mat-mdc-select-arrow svg').getBoundingClientRect(), box=document.querySelector('.mat-mdc-text-field-wrapper').getBoundingClientRect();
  return { eye:[Math.round(e.left),Math.round(e.right),e.top+e.height/2,e.width], ik1:[a.left,a.top+a.height/2], ik2:[b.left,b.top+b.height/2],
    afstand: Math.round(a.left-e.right), ikonafstand: Math.round(b.left-a.right), iRammen: e.top>=box.top && e.bottom<=box.bottom,
    overlap:[a,b].some(x=>e.right>x.left && e.left<x.right && e.bottom>x.top && e.top<x.bottom), farve:getComputedStyle(eye).color };
});
ok('Øjet sidder som et ekstra ikon til venstre for Ciceros (samme afstand, højde, størrelse og farve)',
  !geo.overlap && geo.iRammen && Math.abs(geo.afstand - geo.ikonafstand) <= 1 && Math.abs(geo.eye[2]-geo.ik1[1]) <= 1 && geo.eye[3] === 24 && geo.farve === 'rgb(85, 85, 85)', JSON.stringify(geo));
await p.screenshot({ path: 'test/cpr-taster.png', clip: { x: 0, y: 40, width: 700, height: 120 } });
await p.keyboard.press('Enter'); await w(400);
ok('Efter søgning står navnet, prikker væk', await attr('#resl') === null && (await p.$eval('#resl', x => x.value)) === 'Test Testesen');
await p.$eval('#resl', (x) => { x.value = ''; x.dispatchEvent(new Event('input', { bubbles: true })); });
await p.keyboard.type('C036'); await w(50);
ok('Lånernummer med bogstav skjules ikke', await attr('#resl') === null);
await p.$eval('#resl', (x) => { x.value = ''; x.dispatchEvent(new Event('input', { bubbles: true })); });
await p.keyboard.type('12345678'); await w(50);
ok('8-cifret lånernummer: prikker (øjet kan bruges)', await attr('#resl') === 'prikker' && (await eyes()).length === 1);
await p.evaluate(() => document.activeElement.blur()); await w(80);
ok('8-cifret uden fokus: stadig prikker (ikke et CPR)', await attr('#resl') === 'prikker');

// Slået fra i opsætningen
await p.goto('https://cicero.systematic.com/patron/detalje'); await w(400);
await p.evaluate(() => chrome.storage.sync.set({ skjulCpr: false })); await w(100);
ok('Slået fra: alt vises som normalt', await attr('#cprf') === null && (await views()).length === 0 && (await eyes()).length === 0);
await p.evaluate(() => chrome.storage.sync.set({ skjulCpr: true })); await w(300);
ok('Slået til igen: skjult', await attr('#cprf') === 'skjult');
console.log(fejl ? fejl + ' FEJL' : 'ALT OK');
await b.close();
