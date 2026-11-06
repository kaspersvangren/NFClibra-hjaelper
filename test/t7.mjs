// Tjek for ny version: baggrund.js med en falsk chrome og et optaget svar fra GitHub
import fs from 'fs';
import vm from 'vm';
const dir = new URL('./', import.meta.url).pathname;
const svar = JSON.parse(fs.readFileSync(process.argv[2] || dir + 'github-latest.json', 'utf8'));
let fejl = 0; const ok = (n, c, i = '') => { console.log((c ? 'OK   ' : 'FEJL ') + n + (i ? '  — ' + i : '')); if (!c) fejl++; };

function kør(manifestVersion, { fetchFejl = false } = {}) {
  const local = {}, sync = {}, lyt = {}; let kald = 0;
  const chrome = {
    runtime: { getManifest: () => ({ version: manifestVersion }), onInstalled: { addListener: (f) => (lyt.inst = f) },
      onStartup: { addListener: (f) => (lyt.start = f) }, onMessage: { addListener: (f) => (lyt.msg = f) } },
    alarms: { create: () => {}, onAlarm: { addListener: (f) => (lyt.alarm = f) } },
    storage: {
      local: { get: async (k) => (typeof k === 'string' ? { [k]: local[k] } : { ...local }), set: async (o) => Object.assign(local, o), remove: async (k) => delete local[k] },
      sync: { get: async (d) => ({ ...d, ...sync }) },
    },
  };
  const fetch = async () => { kald++; if (fetchFejl) throw new Error('offline'); return { ok: true, json: async () => svar }; };
  vm.runInNewContext(fs.readFileSync(dir + '../udvidelse/baggrund.js', 'utf8'), { chrome, fetch, console, Date, setTimeout });
  const msg = (m) => new Promise((r) => lyt.msg(m, null, r));
  return { local, sync, lyt, msg, kald: () => kald };
}
const nyeste = svar.tag_name.replace(/^v/, '');

let k = kør(nyeste); await k.lyt.inst(); await new Promise((r) => setTimeout(r, 10));
ok(`Har nyeste (${nyeste}): ingen besked`, k.local.opdatering && k.local.opdatering.ny === false && k.local.opdatering.version === nyeste, JSON.stringify(k.local.opdatering));

k = kør('0.1.0'); await k.lyt.inst(); await new Promise((r) => setTimeout(r, 10));
ok('Gammel version: besked med link til zip', k.local.opdatering.ny === true && /NFClibra-hjaelper-.*\.zip$/.test(k.local.opdatering.zip), k.local.opdatering.zip);
await k.msg({ type: 'tjekOpdatering' });
ok('Tjek fra Cicero-fanen inden 6 timer spørger ikke GitHub igen', k.kald() === 1);
await k.msg({ type: 'tjekOpdatering', tving: true });
ok('"Tjek nu" spørger altid', k.kald() === 2);
k.local.opdatering.tjekket -= 7 * 3600e3; await k.msg({ type: 'tjekOpdatering' });
ok('Efter 6 timer spørges der igen', k.kald() === 3);

k = kør('0.1.0'); k.sync.tjekOpdatering = false; await k.msg({ type: 'tjekOpdatering' });
ok('Slået fra: GitHub spørges ikke', k.kald() === 0);

k = kør('0.1.0'); await k.lyt.inst(); await new Promise((r) => setTimeout(r, 10));
const før = { ...k.local.opdatering };
const k2 = kør('0.1.0', { fetchFejl: true }); Object.assign(k2.local, { opdatering: { ...før, tjekket: 0 } });
await k2.msg({ type: 'tjekOpdatering' });
ok('Uden forbindelse: det gamle svar beholdes', k2.local.opdatering.ny === true && k2.local.opdatering.version === før.version && k2.local.opdatering.tjekket > 0);

// Talsammenligning
const ctx = {}; vm.runInNewContext(fs.readFileSync(dir + '../udvidelse/baggrund.js', 'utf8') + ';this.nyere=nyere', Object.assign(ctx, { chrome: kør('0').lyt && { runtime: { onInstalled: { addListener() {} }, onStartup: { addListener() {} }, onMessage: { addListener() {} } }, alarms: { onAlarm: { addListener() {} } } } }));
ok('0.10.1 er nyere end 0.9.3, og 0.4.0 ikke nyere end 0.4.0', ctx.nyere('0.10.1', '0.9.3') && !ctx.nyere('0.4.0', '0.4.0') && !ctx.nyere('0.3.3', '0.4.0'));
console.log(fejl ? fejl + ' FEJL' : 'ALT OK');
