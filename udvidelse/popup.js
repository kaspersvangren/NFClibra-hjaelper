// Opsætning: én kontakt pr. funktion, gemt i browserprofilen (følger med ved Chrome-/Edge-synkronisering)
const STD = { qrLaaner: true, qrCql: true, forsider: true, kopier: true, ctrlEnter: true, traek: true, skjulCpr: true, tjekOpdatering: true, beholdning: true };
document.getElementById('ver').textContent = 'Version ' + chrome.runtime.getManifest().version;
const boxes = [...document.querySelectorAll('input[data-k]')];
chrome.storage.sync.get(STD, (v) => {
  for (const b of boxes) b.checked = !!v[b.dataset.k];
});
for (const b of boxes) {
  b.addEventListener('change', () => chrome.storage.sync.set({ [b.dataset.k]: b.checked }));
}

// Ny version og status for seneste tjek
const ny = document.getElementById('ny'), status = document.getElementById('status');
function visOpdatering() {
  chrome.storage.local.get('opdatering', ({ opdatering: o }) => {
    if (o && o.ny && o.version) {
      ny.innerHTML = '';
      const a = document.createElement('a');
      a.href = o.zip || o.side; a.target = '_blank'; a.textContent = 'Hent';
      ny.append(`Version ${o.version} er klar. `, a, ' – pak den ud oven i den gamle mappe, og genindlæs udvidelsen.');
      ny.style.display = 'block';
    } else ny.style.display = 'none';
    status.textContent = o && o.tjekket
      ? (o.ny ? '' : 'Du har den nyeste. ') + 'Tjekket ' + new Date(o.tjekket).toLocaleString('da-DK', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
      : 'Ikke tjekket endnu';
  });
}
document.getElementById('tjeknu').addEventListener('click', () => {
  status.textContent = 'Tjekker …';
  chrome.runtime.sendMessage({ type: 'tjekOpdatering', tving: true }, () => { void chrome.runtime.lastError; visOpdatering(); });
});
visOpdatering();
