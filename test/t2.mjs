import puppeteer from 'puppeteer';
import chromium from '@sparticuz/chromium';
import fs from 'fs';

const U = '' + new URL('../udvidelse/', import.meta.url).pathname + '';
const files = ['qrcodegen.js', 'felles.js', 'qr.js', 'forsider.js', 'kopier.js', 'genveje.js', 'cpr.js'];
// Testudgave: åbent lag, så testen kan se ind i det
const src = files.map((f) => fs.readFileSync(U + f, 'utf8')).join('\n;\n').replace("mode: 'closed'", "mode: 'open'");
const inject = `document.addEventListener('DOMContentLoaded', () => { ${src}\n });`;

const b = await puppeteer.launch({ executablePath: await chromium.executablePath(), headless: 'shell', args: chromium.args });
const p = await b.newPage();
await p.setViewport({ width: 1200, height: 750 });
await p.evaluateOnNewDocument(inject);
await p.setRequestInterception(true);
p.on('request', (r) => {
  const u = new URL(r.url());
  if (u.host !== 'cicero.systematic.com') return r.continue();
  if (u.pathname === '/cover.png') return r.respond({ status: 200, contentType: 'image/png', body: fs.readFileSync('' + new URL('./', import.meta.url).pathname + 'cover.png') });
  r.respond({ status: 200, contentType: 'text/html; charset=utf-8', body: fs.readFileSync('' + new URL('./', import.meta.url).pathname + 'spa.html') });
});
p.on('pageerror', (e) => console.log('SIDEFEJL', e.message));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let fejl = 0;
const ok = (navn, betingelse, info = '') => { console.log((betingelse ? 'OK   ' : 'FEJL ') + navn + (info ? '  — ' + info : '')); if (!betingelse) fejl++; };
const log = () => p.evaluate(() => window.log.slice());
const nulstil = () => p.evaluate(() => { window.log = []; });
const sr = (sel, f) => p.evaluate((sel, f) => { const h = [...document.documentElement.children].find((e) => e.shadowRoot); const els = [...h.shadowRoot.querySelectorAll(sel)]; return eval(f); }, sel, f);
const toast = () => sr('.toast', 'els[0].classList.contains("vis") ? els[0].textContent : ""');
async function hoverText(txt, nth = 0) {
  const pt = await p.evaluate((txt, nth) => {
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n, i = 0;
    while ((n = w.nextNode())) if (n.data.trim() === txt && i++ === nth) { const r = document.createRange(); r.selectNodeContents(n); const b = r.getBoundingClientRect(); return [b.x + b.width / 2, b.y + b.height / 2]; }
    return null;
  }, txt, nth);
  if (!pt) throw new Error('fandt ikke teksten ' + txt);
  await p.mouse.move(pt[0], pt[1], { steps: 3 });
  await wait(80);
}
async function combo(...keys) { for (const k of keys) await p.keyboard.down(k); for (const k of keys.reverse()) await p.keyboard.up(k); }
const open = async (path) => { await p.goto('https://cicero.systematic.com' + path); await wait(400); };

// ---------- Ctrl+Enter ----------
await open('/circulation');
await nulstil();
await combo('Control', 'Enter'); await wait(150);
ok('Ctrl+Enter trykker Gennemfør udlån', (await log()).includes('gennemfoer-udlaan'));
await p.evaluate(() => { document.getElementById('gu').disabled = true; window.log = []; });
await combo('Control', 'Enter'); await wait(150);
ok('Ctrl+Enter på grå knap giver besked og trykker ikke', (await log()).length === 0 && /ikke klar/.test(await toast()), await toast());

// ---------- L fra rækken under musen ----------
await open('/circulation'); await nulstil();
await hoverText('Harry Potter og de vises sten');
await p.keyboard.down('Control'); await p.keyboard.down('Shift'); await wait(120);
ok('Ctrl+Shift viser rækken, der tages med', await sr('.box', 'els.filter(e=>e.style.display==="block").length') === 1);
await p.keyboard.press('KeyL'); await p.keyboard.up('Shift'); await p.keyboard.up('Control');
await wait(2500);
let l = await log();
ok('L går til Lånere, søger og åbner låneren fra rækken', p.url().endsWith('/patron-administration/patron-search') && l.includes('laaner-soeg:C011122233|') && l.includes('aabn-laaner:C011122233'), l.join(' | '));

// ---------- L uden række: lånernr. fra flyin ----------
await open('/circulation'); await nulstil();
await p.mouse.move(600, 700);
await combo('Control', 'Shift', 'KeyL'); await wait(2500);
l = await log();
ok('L uden række tager låneren fra flyin', l.includes('aabn-laaner:C012345678'), l.join(' | '));

// ---------- L med kun navnet ----------
await open('/post/materialer'); await nulstil();
await hoverText('Test Testesen');
await combo('Control', 'Shift', 'KeyL'); await wait(3000);
l = await log();
ok('L med kun navn søger på navnet og åbner den ene, der hedder præcis sådan', l.includes('laaner-soeg:|Test Testesen') && l.includes('aabn-laaner:C012345678'), l.join(' | '));
await open('/post/materialer'); await nulstil();
await hoverText('5461930851');
await combo('Control', 'Shift', 'KeyL'); await wait(300);
ok('L på række uden låner siger det', /Ingen låner/.test(await toast()), await toast());

// ---------- M ----------
await open('/circulation'); await nulstil();
await hoverText('Fantastiske skabninger');
await combo('Control', 'Shift', 'KeyM'); await wait(1200);
l = await log();
ok('M søger materialenummeret i materialesøgningen', p.url().endsWith('/catalogue/materials') && l.includes('materiale:5342010167890'), l.join(' | '));

// ---------- B med materialenummer (bmn) ----------
await open('/circulation'); await nulstil();
await hoverText('Fantastiske skabninger');
await combo('Control', 'Shift', 'KeyB'); await wait(1200);
l = await log();
ok('B uden faust søger bmn= i katalogsøgningen', l.includes('katalog:bmn=5342010167890'), l.join(' | ') + ' @ ' + p.url());

// ---------- B med faust, én og flere ----------
await open('/catalogue/records'); await nulstil();
await hoverText('Pocket Potters - Ron Weasley');
await combo('Control', 'Shift', 'KeyB'); await wait(500);
l = await log();
ok('B på rækken søger faust uden kode', l.includes('katalog:142694336'), l.join(' | '));
await nulstil();
await p.click('tbody tr:nth-child(1) input.cb'); await p.click('tbody tr:nth-child(2) input.cb');
await combo('Control', 'Shift', 'KeyB'); await wait(300);
ok('Flere markerede giver en vælger', await sr('.back', 'els.some(e=>e.style.display==="flex" && e.textContent.includes("Hvilken post"))'));
await p.screenshot({ path: '' + new URL('./', import.meta.url).pathname + 'vaelger.png' });
await p.keyboard.press('a'); await wait(500);
l = await log();
ok('A i vælgeren tager alle med', l.includes('katalog:142694336 OR 142694298'), l.join(' | '));

// ---------- R ----------
await nulstil();
await combo('Control', 'Shift', 'KeyR'); await wait(1200);
l = await log();
ok('R med markerede lægger i kurven og går til reservation', l.includes('kurv:2') && l.includes('gaa-til-reservation:3'), l.join(' | '));
await open('/catalogue/records'); await nulstil();
await hoverText('Hogwarts legacy: Playstation 5');
await combo('Control', 'Shift', 'KeyR'); await wait(400);
l = await log();
ok('R på rækken under musen åbner reservering direkte', l.includes('reserver-direkte:135589853'), l.join(' | '));

await open('/catalogue/records'); await nulstil();
await hoverText('Wyatt');
await combo('Control', 'Shift', 'KeyR'); await wait(600);
l = await log();
ok('R på en række, der allerede ligger i kurven, går til reservation', l.includes('gaa-til-reservation:1'), l.join(' | '));
await open('/circulation'); await nulstil();
await p.focus('mat-form-field input');
await combo('Control', 'Enter'); await wait(200);
l = await log();
ok('Ctrl+Enter med markøren i Låner-feltet åbner ikke lånersøgningen', l.includes('gennemfoer-udlaan') && !l.includes('vaelg-laaner-aabnet'), l.join(' | '));

// ---------- Ctrl-kopiering ----------
await open('/catalogue/records');
await hoverText('Rowling, Joanne K.');
await p.keyboard.down('Control'); await wait(250);
await p.mouse.move(...(await p.evaluate(() => { const td = document.querySelector('td.forf'); const r = td.getBoundingClientRect(); return [r.x + 20, r.y + 12]; })), { steps: 2 });
await wait(120);
const boks = await sr('.box', 'JSON.stringify(els.filter(e=>e.style.display==="block").map(e=>[e.style.width,e.style.height]))');
await p.screenshot({ path: '' + new URL('./', import.meta.url).pathname + 'kopier.png', clip: { x: 0, y: 80, width: 900, height: 250 } });
await p.keyboard.press('KeyC'); await p.keyboard.up('Control'); await wait(200);
ok('Ctrl+C kopierer hele forfatterfeltet som én linje', (await toast()) === 'Kopieret: Rowling, Joanne K.', (await toast()) + ' boks ' + boks);
await hoverText('142694298');
await p.keyboard.down('Control'); await wait(250); await p.keyboard.press('KeyC'); await p.keyboard.up('Control'); await wait(150);
ok('Ctrl+C kopierer et nummer', (await toast()) === 'Kopieret: 142694298', await toast());
await hoverText('CQL:');
// almindelig markering skal vinde
await p.evaluate(() => { const r = document.createRange(); r.selectNodeContents(document.querySelector('.cql span')); getSelection().removeAllRanges(); getSelection().addRange(r); });
await p.evaluate(() => { window.__kopi = 0; document.addEventListener('copy', () => window.__kopi++); });
await p.keyboard.down('Control'); await wait(250); await p.keyboard.press('KeyC'); await p.keyboard.up('Control'); await wait(150);
ok('Med egen markering kopierer Ctrl+C som normalt', (await p.evaluate(() => window.__kopi)) === 1);
await p.evaluate(() => getSelection().removeAllRanges());
// felt med værdi
await open('/circulation');
await p.mouse.move(...(await p.evaluate(() => { const r = document.querySelector('mat-form-field input').getBoundingClientRect(); return [r.x + 30, r.y + r.height / 2]; })));
await p.keyboard.down('Control'); await wait(250); await p.keyboard.press('KeyC'); await p.keyboard.up('Control'); await wait(150);
ok('Ctrl+C kopierer værdien i et felt', (await toast()) === 'Kopieret: C012345678', await toast());

// ---------- QR og forsider virker stadig ----------
await open('/circulation');
await hoverText('C012345678', 0);
await p.mouse.move(...(await p.evaluate(() => { const s = document.querySelector('.fly span'); const r = s.getBoundingClientRect(); return [r.x + 10, r.y + 8]; })), { steps: 2 });
await wait(150);
ok('QR-knappen ved lånernr. i flyin', await sr('.chip', 'els[0].style.display==="flex"'));
await open('/catalogue/records');
await p.mouse.move(...(await p.evaluate(() => { const r = document.querySelector('img.th').getBoundingClientRect(); return [r.x + 10, r.y + 10]; })), { steps: 2 });
await wait(450);
ok('Stor forside ved mouse-over', await sr('.prev', 'els[0].style.display==="block"'));

console.log(fejl ? `\n${fejl} FEJL` : '\nALT OK');
await b.close();
