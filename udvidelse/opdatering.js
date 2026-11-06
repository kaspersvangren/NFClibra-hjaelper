/*
 * Ny version: en lille besked nederst i Cicero med et link til zip-filen.
 * "Senere" skjuler beskeden for den version til næste dag.
 */
(() => {
  'use strict';
  const NH = window.NH;
  if (!NH || NH.opdatering) return;
  NH.opdatering = true;

  const bar = NH.add(`<div class="opd" role="status">
    <style>
      .opd { position: fixed; right: 16px; bottom: 16px; display: none; pointer-events: auto; align-items: center; gap: 12px;
        padding: 10px 12px 10px 14px; border-radius: 10px; background: #1f2937; color: #fff; max-width: min(92vw, 460px);
        font: 13px/1.35 system-ui, "Segoe UI", sans-serif; box-shadow: 0 6px 24px rgba(0,0,0,.35); }
      .opd img { width: 22px; height: 22px; flex: none; }
      .opd b { font-weight: 600; }
      .opd a, .opd button { flex: none; border: 0; border-radius: 6px; padding: 6px 10px; cursor: pointer;
        font: 600 12px system-ui, "Segoe UI", sans-serif; text-decoration: none; }
      .opd a { background: #4a9eff; color: #0b1a2b; }
      .opd button { background: transparent; color: #cbd5e1; }
      .opd button:hover { color: #fff; }
    </style>
    <span class="txt"></span><a class="hent" target="_blank" rel="noopener">Hent</a><button type="button" class="senere">Senere</button>
  </div>`);
  const txt = bar.querySelector('.txt');
  const hent = bar.querySelector('.hent');
  const DAG = 24 * 3600 * 1000;

  function vis(o, udsat) {
    if (!o || !o.ny || !o.version || !NH.cfg.tjekOpdatering) return (bar.style.display = 'none');
    if (udsat && udsat.version === o.version && Date.now() - udsat.t < DAG) return (bar.style.display = 'none');
    txt.innerHTML = '';
    const b = document.createElement('b');
    b.textContent = `NFClibra-hjælper ${o.version}`;
    txt.append(b, ' er klar. Pak den ud oven i den gamle mappe, og genindlæs udvidelsen.');
    hent.href = o.zip || o.side;
    hent.title = o.zip ? 'Hent zip-filen' : 'Åbn udgivelsen på GitHub';
    bar.style.display = 'flex';
  }

  let sidst = null;
  function opdater() {
    try {
      chrome.storage.local.get(['opdatering', 'opdateringUdsat'], (v) => { sidst = v.opdatering; vis(v.opdatering, v.opdateringUdsat); });
    } catch (_) { /* udvidelsen er genindlæst – denne side bruger den gamle udgave */ }
  }

  bar.querySelector('.senere').addEventListener('click', () => {
    bar.style.display = 'none';
    try { chrome.storage.local.set({ opdateringUdsat: { version: sidst && sidst.version, t: Date.now() } }); } catch (_) {}
  });
  hent.addEventListener('click', () => { setTimeout(() => (bar.style.display = 'none'), 300); });

  try {
    chrome.storage.onChanged.addListener((ch, area) => { if (area === 'local' && (ch.opdatering || ch.opdateringUdsat)) opdater(); });
    chrome.runtime.sendMessage({ type: 'tjekOpdatering' }, () => void chrome.runtime.lastError);
  } catch (_) {}
  NH.onCfg(opdater);
  opdater();
})();
