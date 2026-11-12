// Beholdning i bestillingspanelet: opslag med Ciceros egen billet, visning, skift af post, udløbet billet, slået fra
import puppeteer from 'puppeteer'; import chromium from '@sparticuz/chromium'; import fs from 'fs';
const U = new URL('../udvidelse/', import.meta.url).pathname, T = new URL('./', import.meta.url).pathname;
const side = fs.readFileSync(U + 'cicero-side.js', 'utf8');
const src = ['qrcodegen.js', 'felles.js', 'qr.js', 'forsider.js', 'kopier.js', 'genveje.js', 'cpr.js', 'beholdning.js']
  .map((f) => fs.readFileSync(U + f, 'utf8')).join('\n;\n').replace("mode: 'closed'", "mode: 'open'");
const stub = `window.__S={};window.__lyt=[];window.chrome={storage:{sync:{get:(d,cb)=>cb({...d,...window.__S}),set:(o)=>{const ch={};for(const k in o){ch[k]={newValue:o[k]};window.__S[k]=o[k];}window.__lyt.forEach(f=>f(ch,'sync'));}},onChanged:{addListener:(f)=>window.__lyt.push(f)}}};`;
const jwt = (exp) => 'x.' + Buffer.from(JSON.stringify({ exp })).toString('base64url') + '.y';
const nu = () => Math.floor(Date.now() / 1000);
const DATA = {
  '143903591': { numberOfMaterials: 1, loanedMaterials: 0, reservedMaterials: 11, reservableMaterials: 1, orderedMaterials: 1, availableMaterials: 0,
    placementInfos: [{ numberOfMaterials: 1, loanedMaterials: 0, placement: 'Hovedbiblioteket/Voksen/Udlån/Playstation voksne' }] },
  '53873715': { numberOfMaterials: 3, loanedMaterials: 2, reservedMaterials: 6, reservableMaterials: 3, orderedMaterials: 0, availableMaterials: 1,
    placementInfos: [{ numberOfMaterials: 2, loanedMaterials: 2, placement: 'Hovedbiblioteket/Voksen/Musik' }, { numberOfMaterials: 1, loanedMaterials: 0, placement: 'Mørkhøj/Voksen/Musik' }] },
  '137267985': { numberOfMaterials: 0, loanedMaterials: 0, reservedMaterials: 1, reservableMaterials: 0, orderedMaterials: 0, availableMaterials: 0, placementInfos: [] },
};
let gyldig = jwt(nu() + 300), opslag = [];
const b = await puppeteer.launch({ executablePath: await chromium.executablePath(), headless: 'shell', args: chromium.args });
const p = await b.newPage(); await p.setViewport({ width: 1300, height: 700 });
await p.exposeFunction('__nyGyldig', () => { gyldig = jwt(nu() + 300); return gyldig; });
await p.evaluateOnNewDocument(`window.__billet = ${JSON.stringify(gyldig)};` + side);
await p.evaluateOnNewDocument(stub + `document.addEventListener('DOMContentLoaded', () => { ${src}\n });`);
await p.setRequestInterception(true);
p.on('request', (r) => {
  const u = new URL(r.url());
  if (u.pathname.startsWith('/FBS/rest/')) {
    const auth = r.headers()['authorization'];
    if (u.pathname.endsWith('bibliographicRecordDetails')) {
      const body = JSON.parse(r.postData());
      opslag.push({ faust: body.bibliographicRecordId.value, auth, ok: auth === 'Bearer ' + gyldig });
      if (auth !== 'Bearer ' + gyldig) return r.respond({ status: 401, body: '' });
      return r.respond({ status: 200, contentType: 'application/json', body: JSON.stringify({ bibliographicRecordCirculationInfo: DATA[body.bibliographicRecordId.value] || {}, bibliographicInformation: {} }) });
    }
    return r.respond({ status: 200, contentType: 'application/json', body: '[]' });
  }
  r.respond({ status: 200, contentType: 'text/html; charset=utf-8', body: fs.readFileSync(T + 'spa.html') });
});
p.on('pageerror', (e) => console.log('SIDEFEJL', e.message));
const w = (ms) => new Promise((r) => setTimeout(r, ms));
let fejl = 0; const ok = (n, c, i = '') => { console.log((c ? 'OK   ' : 'FEJL ') + n + (i ? '  — ' + i : '')); if (!c) fejl++; };
const boks = () => p.evaluate(() => { const b = document.querySelector('[data-nh-beholdning]'); if (!b) return null;
  const h = document.getElementById('bestil'); return { titel: b.querySelector('.nh-b-titel').textContent, tal: b.querySelector('.nh-b-tal').textContent,
    font: getComputedStyle(b.querySelector('.nh-b-tal')).fontFamily === getComputedStyle(h).fontFamily, farve: getComputedStyle(b).color === getComputedStyle(h).color,
    sammeRaekke: b.parentElement === h.parentElement, hoejre: b.getBoundingClientRect().left > h.getBoundingClientRect().right }; });
const klik = async (f) => { await p.click(`#liste tr[data-f="${f}"]`); await w(600); };

await p.goto('https://cicero.systematic.com/accession/material-selection?materialSelectionList=1191304'); await w(300);
ok('Intet vises, før en post er åbnet', (await boks()) === null && opslag.length === 0);
await klik('143903591');
let x = await boks();
ok('Beholdning ved Bestillingsoplysninger med præcis den aftalte tekst', x && x.titel === 'Beholdning' && x.tal === 'Eks: 1  ·  Hjemme: 0  ·  Udlånt: 0  ·  Bestilt: 1  ·  Res: 11', JSON.stringify(x));
ok('Samme skrift og farve som overskriften, i samme række til højre', x && x.font && x.farve && x.sammeRaekke && x.hoejre);
ok('Opslaget brugte Ciceros egen billet og det rigtige faustnummer', opslag.length === 1 && opslag[0].ok && opslag[0].faust === '143903591');
await p.screenshot({ path: T + 'beholdning.png', clip: { x: 520, y: 150, width: 780, height: 140 } });
// Placeringer
const eks = await p.evaluate(() => { const r = document.querySelector('.nh-b-eks').getBoundingClientRect(); return [r.x + 10, r.y + r.height / 2]; });
await p.mouse.move(eks[0], eks[1]); await w(100);
const tip = await p.evaluate(() => { const h = [...document.documentElement.children].find((e) => e.shadowRoot); const t = h.shadowRoot.querySelector('.nh-tip'); return t.style.display === 'block' ? t.textContent : ''; });
ok('Musen over Eks viser placeringerne', tip === 'Hovedbiblioteket/Voksen/Udlån/Playstation voksne: 1', tip);
await p.screenshot({ path: T + 'beholdning-tip.png', clip: { x: 520, y: 150, width: 780, height: 180 } });
// Skift post
await klik('53873715');
x = await boks();
ok('Skift af post opdaterer tallene', x && x.tal === 'Eks: 3  ·  Hjemme: 1  ·  Udlånt: 2  ·  Bestilt: 0  ·  Res: 6', x && x.tal);
await p.mouse.move(...(await p.evaluate(() => { const r = document.querySelector('.nh-b-eks').getBoundingClientRect(); return [r.x + 10, r.y + r.height / 2]; }))); await w(100);
const tip2 = await p.evaluate(() => { const h = [...document.documentElement.children].find((e) => e.shadowRoot); return h.shadowRoot.querySelector('.nh-tip').innerText; });
ok('Flere placeringer, med udlånte', tip2.includes('Hovedbiblioteket/Voksen/Musik: 2 (2 udlånt)') && tip2.includes('Mørkhøj/Voksen/Musik: 1'), JSON.stringify(tip2));
// Samme post igen inden for 30 s: ingen nyt opslag
const før = opslag.length; await klik('143903591'); await klik('53873715');
ok('Tilbage til en nyligt vist post bruger de gemte tal', opslag.length === før, opslag.length - før + ' nye opslag');

// Udløbet billet: siden har en gammel billet; Cicero fornyer først, når der klikkes
opslag = [];
await p.evaluateOnNewDocument(`window.__billet = ${JSON.stringify(jwt(nu() - 60))}; window.__fornyBillet = async () => { window.__billet = await window.__nyGyldig(); };`);
await p.goto('https://cicero.systematic.com/accession/material-selection?materialSelectionList=1191304'); await w(300);
await p.click('#liste tr[data-f="137267985"]'); await w(1500);
x = await boks();
ok('Udløbet billet: venter på Ciceros nye og bruger kun den', x && x.tal === 'Eks: 0  ·  Hjemme: 0  ·  Udlånt: 0  ·  Bestilt: 0  ·  Res: 1' && opslag.length === 1 && opslag[0].ok, JSON.stringify({ tal: x && x.tal, opslag }));

// Kun på Materialevalg-siden, og kan slås fra
await p.evaluate(() => chrome.storage.sync.set({ beholdning: false })); await w(300);
ok('Slået fra: forsvinder', (await boks()) === null);
await p.goto('https://cicero.systematic.com/circulation'); await w(400);
ok('Andre sider: intet', (await boks()) === null);
await b.close();
console.log(fejl ? fejl + ' FEJL' : 'ALT OK');
