/*
 * Beholdning i bestillingspanelet under Materialevalg:
 *   Beholdning
 *   Eks: 1  ·  Hjemme: 0  ·  Udlånt: 0  ·  Bestilt: 1  ·  Res: 11
 * ved siden af "Bestillingsoplysninger". Musen over "Eks" viser placeringerne.
 * Selve opslaget laves af cicero-side.js med Ciceros eget login; her vises kun svaret.
 */
(() => {
  'use strict';
  const NH = window.NH;
  if (!NH || NH.beholdning) return;
  NH.beholdning = true;

  const SIDE = /^\/accession\//;
  const OVERSKRIFT = 'bestillingsoplysninger';
  const CACHE_MS = 30000;
  const cache = new Map(); // faust → { t, data }
  let boks = null, visFaust = null, venter = new Map(), naesteId = 1;

  // ---------- Opslag via Ciceros side ----------
  window.addEventListener('nh-beholdning-svar', (e) => {
    let d;
    try { d = JSON.parse(e.detail); } catch (_) { return; }
    const f = venter.get(d.id);
    if (f) { venter.delete(d.id); f(d); }
  });
  function hent(faust) {
    const c = cache.get(faust);
    if (c && Date.now() - c.t < CACHE_MS) return Promise.resolve(c.data);
    return new Promise((res) => {
      const id = naesteId++;
      const t = setTimeout(() => { venter.delete(id); res({ fejl: 'intet svar' }); }, 20000);
      venter.set(id, (d) => { clearTimeout(t); if (!d.fejl) cache.set(faust, { t: Date.now(), data: d }); res(d); });
      window.dispatchEvent(new CustomEvent('nh-beholdning-hent', { detail: JSON.stringify({ id, faust }) }));
    });
  }

  // ---------- Find panelet ----------
  const ord = (s) => (s || '').replace(/\s+/g, ' ').trim().toLowerCase();
  function overskrift() {
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = w.nextNode())) {
      if (ord(n.data) === OVERSKRIFT && n.parentElement && NH.visible(n.parentElement)) return n.parentElement;
    }
    return null;
  }
  /** Faustnummeret i panelets bjælke: teksten efter "Faust-nr." i samme panel som overskriften */
  function panelFaust(h) {
    for (let p = h.parentElement; p && p !== document.body; p = p.parentElement) {
      const w = document.createTreeWalker(p, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = w.nextNode())) {
        if (!/^faust-?nr\.?:?$/i.test(n.data.trim())) continue;
        if (n.parentElement.closest('th, [role="columnheader"], mat-header-cell, thead')) continue;
        let v;
        while ((v = w.nextNode()) && !v.data.trim());
        const f = v && v.data.trim();
        if (f && /^\d{6,12}$/.test(f)) return f;
      }
      if (p.matches('mat-sidenav, mat-drawer, [role="dialog"], .cdk-overlay-pane, aside')) break;
    }
    return null;
  }

  // ---------- Visning ----------
  function lavBoks(h) {
    const b = document.createElement('div');
    b.setAttribute('data-nh-beholdning', '');
    b.style.cssText = 'display:flex;flex-direction:column;align-items:flex-start;gap:2px;line-height:1.25;';
    b.innerHTML = '<div class="nh-b-titel" style="font-size:.6em;font-weight:400;opacity:.62;letter-spacing:.01em">Beholdning</div>' +
      '<div class="nh-b-tal" style="font-size:.78em;font-weight:600;white-space:nowrap"></div>';
    const række = h.parentElement;
    const cs = getComputedStyle(række);
    if (/flex/.test(cs.display) && !/column/.test(cs.flexDirection)) {
      b.style.marginLeft = 'auto';
      b.style.alignSelf = 'center';
      b.style.paddingLeft = '24px';
      række.appendChild(b);
    } else {
      b.style.float = 'right';
      række.insertBefore(b, række.firstChild);
    }
    // Samme skrift og farve som overskriften
    const hs = getComputedStyle(h);
    b.style.fontFamily = hs.fontFamily;
    b.style.fontSize = hs.fontSize;
    b.style.color = hs.color;
    return b;
  }

  function skriv(d) {
    const tal = boks.querySelector('.nh-b-tal');
    tal.textContent = '';
    if (!d) { tal.textContent = '…'; return; }
    if (d.fejl) { tal.textContent = '?'; tal.title = 'Kunne ikke hente beholdning (' + d.fejl + ')'; return; }
    tal.removeAttribute('title');
    const dele = [['Eks', d.eks], ['Hjemme', d.hjemme], ['Udlånt', d.udlaant], ['Bestilt', d.bestilt], ['Res', d.res]];
    dele.forEach(([navn, v], i) => {
      if (i) tal.append('  ·  ');
      const s = document.createElement('span');
      s.textContent = `${navn}: ${v ?? '?'}`;
      if (navn === 'Eks') { s.className = 'nh-b-eks'; s.style.cursor = 'default'; s._placeringer = d.placeringer || []; }
      tal.append(s);
    });
    tal.style.whiteSpace = 'pre';
  }

  async function opdater() {
    if (!NH.cfg.beholdning || !SIDE.test(location.pathname)) return fjern();
    const h = overskrift();
    if (!h) return fjern();
    const faust = panelFaust(h);
    if (!faust) return fjern();
    if (boks && (!boks.isConnected || !h.parentElement.contains(boks))) { boks.remove(); boks = null; }
    if (!boks) { boks = lavBoks(h); visFaust = null; }
    if (faust === visFaust) return;
    visFaust = faust;
    skriv(null);
    const d = await hent(faust);
    if (visFaust === faust && boks) skriv(d);
  }
  function fjern() {
    if (boks) boks.remove();
    boks = null;
    visFaust = null;
    skjulTip();
  }

  // ---------- Placeringer ved musen over "Eks" ----------
  const tip = NH.add(`<div class="nh-tip" style="position:fixed;display:none;pointer-events:none;max-width:460px;padding:8px 10px;
    border-radius:6px;background:#323232;color:#fff;font:12px/1.45 system-ui,'Segoe UI',sans-serif;box-shadow:0 3px 12px rgba(0,0,0,.4)"></div>`);
  function visTip(el) {
    const p = el._placeringer || [];
    tip.textContent = '';
    if (!p.length) tip.textContent = 'Ingen eksemplarer';
    p.forEach((x, i) => {
      if (i) tip.append(document.createElement('br'));
      tip.append(`${x.placering}: ${x.eks}` + (x.udlaant ? ` (${x.udlaant} udlånt)` : ''));
    });
    tip.style.display = 'block';
    const r = el.getBoundingClientRect();
    const w = tip.offsetWidth, hh = tip.offsetHeight;
    tip.style.left = Math.max(8, Math.min(innerWidth - w - 8, r.left)) + 'px';
    tip.style.top = (r.bottom + 6 + hh > innerHeight - 8 ? r.top - hh - 6 : r.bottom + 6) + 'px';
  }
  function skjulTip() { tip.style.display = 'none'; }
  document.addEventListener('mouseover', (e) => {
    const el = e.target && e.target.closest && e.target.closest('.nh-b-eks');
    if (el && boks && boks.contains(el)) visTip(el); else skjulTip();
  }, true);
  addEventListener('scroll', skjulTip, { capture: true, passive: true });

  // ---------- Hold øje med panelet ----------
  let t = 0;
  new MutationObserver((muts) => {
    if (boks && muts.every((m) => boks.contains(m.target))) return; // vores egne ændringer
    clearTimeout(t);
    t = setTimeout(opdater, 150);
  }).observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  NH.onCfg(opdater);
  opdater();
})();
