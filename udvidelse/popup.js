// Opsætning: én kontakt pr. funktion, gemt i browserprofilen (følger med ved Chrome-/Edge-synkronisering)
const STD = { qrLaaner: true, qrCql: true, forsider: true, kopier: true, ctrlEnter: true, traek: true, skjulCpr: true };
document.getElementById('ver').textContent = 'Version ' + chrome.runtime.getManifest().version;
const boxes = [...document.querySelectorAll('input[data-k]')];
chrome.storage.sync.get(STD, (v) => {
  for (const b of boxes) b.checked = !!v[b.dataset.k];
});
for (const b of boxes) {
  b.addEventListener('change', () => chrome.storage.sync.set({ [b.dataset.k]: b.checked }));
}
