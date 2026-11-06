/*
 * Tjek for ny version: spørger GitHub om den nyeste udgivelse højst hver 6. time
 * og gemmer svaret, så Cicero-fanen og opsætningen kan vise en besked.
 * Det eneste, der sendes, er et almindeligt opslag hos GitHub – intet fra Cicero.
 */
const REPO = 'kaspersvangren/NFClibra-hjaelper';
const INTERVAL_MIN = 6 * 60;

/** "0.10.1" > "0.9.3" – sammenligner tal for tal */
function nyere(a, b) {
  const x = String(a).replace(/^v/, '').split('.').map(Number);
  const y = String(b).replace(/^v/, '').split('.').map(Number);
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    const d = (x[i] || 0) - (y[i] || 0);
    if (d) return d > 0;
  }
  return false;
}

async function tjek(tving = false) {
  const { tjekOpdatering = true } = await chrome.storage.sync.get({ tjekOpdatering: true });
  if (!tjekOpdatering && !tving) return;
  const { opdatering } = await chrome.storage.local.get('opdatering');
  if (!tving && opdatering && Date.now() - (opdatering.tjekket || 0) < INTERVAL_MIN * 60000 - 60000) return;
  try {
    const r = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
      headers: { Accept: 'application/vnd.github+json' }, cache: 'no-store',
    });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const j = await r.json();
    const version = String(j.tag_name || '').replace(/^v/, '');
    const zip = (j.assets || []).find((a) => /\.zip$/i.test(a.name));
    await chrome.storage.local.set({
      opdatering: {
        tjekket: Date.now(),
        version,
        ny: nyere(version, chrome.runtime.getManifest().version),
        side: j.html_url || `https://github.com/${REPO}/releases/latest`,
        zip: zip ? zip.browser_download_url : null,
      },
    });
  } catch (_) {
    // Ingen forbindelse eller GitHub svarer ikke: prøv igen ved næste tjek, behold det gamle svar
    await chrome.storage.local.set({ opdatering: { ...(opdatering || {}), tjekket: Date.now() } });
  }
}

chrome.runtime.onInstalled.addListener(async () => {
  // Efter en opdatering er den gamle besked ikke længere rigtig
  await chrome.storage.local.remove('opdatering');
  chrome.alarms.create('tjek', { periodInMinutes: INTERVAL_MIN });
  tjek(true);
});
chrome.runtime.onStartup.addListener(() => {
  chrome.alarms.create('tjek', { periodInMinutes: INTERVAL_MIN });
  tjek();
});
chrome.alarms.onAlarm.addListener((a) => { if (a.name === 'tjek') tjek(); });
chrome.runtime.onMessage.addListener((m, _s, svar) => {
  if (m && m.type === 'tjekOpdatering') { tjek(!!m.tving).then(() => svar(true)); return true; }
  return false;
});
