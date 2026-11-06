/*
 * Skjul CPR-numre for den, der kigger over skulderen:
 *  - CPR-felter og Låner-feltet: prikker, mens man taster (fra første ciffer, så længe der kun er cifre)
 *  - Når feltet ikke er i brug, og der står et CPR-nummer: 311210-****
 *  - Tekst med et CPR-nummer ved en CPR-etiket: 311210-****
 *  - Øjet viser hele nummeret, så længe museknappen holdes nede
 * Det er kun visningen, der ændres: Ciceros felter og værdier røres ikke.
 */
(() => {
  'use strict';
  const NH = window.NH;
  if (!NH || NH.cpr) return;
  NH.cpr = true;

  const letters = (s) => (s || '').toLowerCase().replace(/[^a-zæøå]/g, '');
  const validDate = (d) => { const dd = +d.slice(0, 2), mm = +d.slice(2, 4); return dd >= 1 && dd <= 31 && mm >= 1 && mm <= 12; };
  const CPR_RE = /^(\d{6})-?(\d{4})$/;
  NH.isCpr = (s) => { const m = (s || '').trim().match(CPR_RE); return !!m && validDate(m[1]); };
  /** "3112101234" / "311210-1234" → "311210-****" (også inde i en længere tekst) */
  NH.maskCpr = (s) => (s || '').replace(/(^|[^\d])(\d{6})-?(\d{4})(?!\d)/g, (all, pre, a) => (validDate(a) ? `${pre}${a}-****` : all));
  const onlyDigits = (v) => /^[\d\s-]*$/.test(v); // tomt felt tæller med, så første ciffer aldrig ses

  // ---------- Stil på Ciceros side (kun via en egenskab, der fjernes igen) ----------
  const css = document.createElement('style');
  css.textContent = `
    [data-nh-cpr="prikker"] { -webkit-text-security: disc !important; }
    [data-nh-cpr="skjult"] { color: transparent !important; -webkit-text-fill-color: transparent !important; }`;
  (document.head || document.documentElement).appendChild(css);

  NH.add(`<style>
    .cprv { position: fixed; display: none; pointer-events: none; align-items: center; white-space: pre; overflow: hidden; }
    .eye { position: fixed; display: none; pointer-events: auto; padding: 4px; border: 0; box-sizing: content-box;
      border-radius: 50%; background: transparent; color: inherit; cursor: pointer; }
    .eye:hover { background: rgba(127,127,127,.16); }
    .eye svg { width: 100%; height: 100%; display: block; }
  </style>`);
  const EYE = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 5C6.5 5 2.7 9.1 1.5 12c1.2 2.9 5 7 10.5 7s9.3-4.1 10.5-7C21.3 9.1 17.5 5 12 5zm0 11.5A4.5 4.5 0 1 1 12 7.5a4.5 4.5 0 0 1 0 9zm0-7a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z"/></svg>';
  const EYE_OFF = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M2.3 3.7 3.7 2.3l18 18-1.4 1.4-3.3-3.3A11.4 11.4 0 0 1 12 19C6.5 19 2.7 14.9 1.5 12a12.6 12.6 0 0 1 3.9-5L2.3 3.7zM12 5c5.5 0 9.3 4.1 10.5 7a12.4 12.4 0 0 1-2.9 4.1l-3.2-3.2A4.5 4.5 0 0 0 11.1 7.6L8.7 5.3A11 11 0 0 1 12 5z"/></svg>';

  // ---------- Hvilke felter og tekster ----------
  function labelOf(inp) {
    const ff = inp.closest('mat-form-field, .mat-mdc-form-field');
    const l = ff && ff.querySelector('mat-label, label');
    // "Låner (påkrævet)" og "Låner *" er stadig Låner-feltet
    const t = (l && l.textContent) || inp.getAttribute('aria-label') || inp.getAttribute('placeholder') || '';
    return letters(t.replace(/\([^)]*\)|\*/g, ''));
  }
  function fieldKind(inp) {
    if (!(inp instanceof HTMLInputElement) || /^(checkbox|radio|hidden|password|button|submit|date|file)$/.test(inp.type)) return null;
    const l = labelOf(inp);
    if (l.includes('cpr')) return 'cpr';
    if (l === 'låner') return 'laaner';
    return null;
  }
  /** Er teksten lige før tallet en CPR-etiket (fx "CPR-nr.")? Kun den nærmeste – ellers rammes andre tal på siden */
  function cprLabelNear(tn) {
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    w.currentNode = tn;
    let p;
    while ((p = w.previousNode()) && !p.data.trim());
    return !!p && /^cpr/.test(letters(p.data)) && letters(p.data).length <= 12;
  }

  // ---------- Det, der holdes øje med ----------
  const targets = new Map(); // element → { kind, node?, view, eye }
  let held = null;

  function track(el, kind, node) {
    if (targets.has(el)) return;
    const view = NH.add('<div class="cprv"></div>');
    const eye = NH.add(`<button class="eye" type="button" title="Hold nede for at se hele nummeret">${EYE}</button>`);
    eye.addEventListener('mousedown', (e) => { e.preventDefault(); e.stopPropagation(); held = el; eye.innerHTML = EYE_OFF; tick(); });
    targets.set(el, { kind, node, view, eye });
  }
  function untrack(el) {
    const t = targets.get(el);
    if (!t) return;
    t.view.remove();
    t.eye.remove();
    el.removeAttribute('data-nh-cpr');
    targets.delete(el);
  }
  const release = () => {
    if (!held) return;
    const t = targets.get(held);
    if (t) t.eye.innerHTML = EYE;
    held = null;
    tick();
  };
  addEventListener('mouseup', release, true);
  addEventListener('blur', release);

  function scan() {
    if (!NH.cfg.skjulCpr) return;
    for (const inp of document.querySelectorAll('input')) {
      const k = fieldKind(inp);
      if (k) track(inp, k);
    }
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = w.nextNode())) {
      const s = n.data.trim();
      if (s.length < 10 || s.length > 11 || !NH.isCpr(s)) continue;
      const p = n.parentElement;
      if (!p || p.closest('input, textarea, [contenteditable="true"]') || p.textContent.trim() !== s) continue;
      if (cprLabelNear(n)) track(p, 'tekst', n);
    }
    loop();
  }

  // ---------- Visning ----------
  function modeOf(el, t) {
    if (!NH.cfg.skjulCpr || held === el) return 'ingen';
    if (t.kind === 'tekst') return NH.isCpr(t.node.data) ? 'skjult' : 'ingen';
    const v = el.value || '';
    const focused = document.activeElement === el;
    if (t.kind === 'laaner' && !onlyDigits(v)) return 'ingen';
    if (!focused && NH.isCpr(v)) return 'skjult';
    return t.kind === 'cpr' || onlyDigits(v) ? 'prikker' : 'ingen';
  }

  function apply(el) {
    const t = targets.get(el);
    if (!t) return;
    if (!el.isConnected || (t.node && !t.node.isConnected)) return untrack(el);
    const mode = modeOf(el, t);
    if (mode === 'ingen') el.removeAttribute('data-nh-cpr');
    else if (el.getAttribute('data-nh-cpr') !== mode) el.setAttribute('data-nh-cpr', mode);

    const value = t.kind === 'tekst' ? t.node.data.trim() : el.value || '';
    const show = NH.visible(el) && value.trim() && (mode !== 'ingen' || held === el);
    let r = null;
    if (show) {
      r = t.kind === 'tekst' ? NH.textRect(t.node) : el.getBoundingClientRect();
      // Skjult bag noget andet (en dialog, en menu)? Så vises intet af vores
      if (r) {
        const top = NH.stack(Math.min(innerWidth - 1, r.left + 4), r.top + r.height / 2)[0];
        const ff = el.closest('mat-form-field, .mat-mdc-form-field');
        if (top && top !== el && !el.contains(top) && !(ff && ff.contains(top)) && !(t.kind === 'tekst' && top.contains(el))) r = null;
      }
    }
    if (!r) { t.view.style.display = 'none'; t.eye.style.display = 'none'; return; }

    // 311210-**** lagt præcis oven på feltets egen (gennemsigtige) tekst
    if (mode === 'skjult') {
      const cs = getComputedStyle(el);
      const padL = t.kind === 'tekst' ? 0 : parseFloat(cs.paddingLeft) + parseFloat(cs.borderLeftWidth);
      t.view.textContent = NH.maskCpr(value.trim());
      Object.assign(t.view.style, {
        display: 'flex', left: r.left + padL + 'px', top: r.top + 'px', height: r.height + 'px',
        maxWidth: Math.max(0, r.width - padL) + 'px', font: cs.font, letterSpacing: cs.letterSpacing,
        color: inheritColor(el),
      });
    } else t.view.style.display = 'none';

    const sp = eyeSpot(el, t, r);
    Object.assign(t.eye.style, {
      display: 'block', width: sp.size + 'px', height: sp.size + 'px', color: sp.color,
      left: Math.min(innerWidth - sp.size - 8, sp.x) - 4 + 'px', top: sp.cy - sp.size / 2 - 4 + 'px',
    });
  }

  /**
   * Hvor øjet skal sidde. I felter: inde i selve tekstfeltet, helt ude til højre – tekstfeltet slutter,
   * hvor Ciceros ikoner begynder, så øjet kommer lige til venstre for dem uden at gætte på, hvilke
   * elementer der er ikoner. 24 px og samme farve som ikonområdet. Ved tekst: lige efter teksten.
   */
  function eyeSpot(el, t, r) {
    if (t.kind === 'tekst') {
      const size = Math.round(Math.max(16, Math.min(24, r.height)));
      return { size, x: r.right + 6, cy: r.top + r.height / 2, color: inheritColor(el) };
    }
    const ff = el.closest('mat-form-field, .mat-mdc-form-field');
    const box = ((ff && ff.querySelector('.mat-mdc-text-field-wrapper, .mat-form-field-flex')) || ff || el).getBoundingClientRect();
    const suffix = ff && ff.querySelector('.mat-mdc-form-field-icon-suffix, .mat-form-field-suffix');
    const sr = suffix && NH.visible(suffix) ? suffix.getBoundingClientRect() : null;
    const size = 24;
    // Højre kant: tekstfeltets, men aldrig ind over ikonområdet eller ud over rammen
    const right = Math.min(r.right, sr ? sr.left : Infinity, box.right - 12);
    // Højde: midt i ikonområdet (Ciceros ikoner sidder lidt højere end teksten), ellers midt i teksten
    const cy = sr && sr.height <= box.height ? sr.top + sr.height / 2 : r.top + r.height / 2;
    return { size, x: right - size - 4, cy, color: sr ? getComputedStyle(suffix).color : inheritColor(el) };
  }

  /** Feltets egen tekstfarve (den er gjort gennemsigtig, så den læses med egenskaben slået fra et øjeblik) */
  const colorCache = new WeakMap();
  function inheritColor(el) {
    if (colorCache.has(el)) return colorCache.get(el);
    const m = el.getAttribute('data-nh-cpr');
    el.removeAttribute('data-nh-cpr');
    const c = getComputedStyle(el).color;
    if (m) el.setAttribute('data-nh-cpr', m);
    colorCache.set(el, c);
    return c;
  }

  function tick() { for (const el of [...targets.keys()]) apply(el); }

  let raf = 0;
  function loop() {
    if (raf || !targets.size) return;
    raf = requestAnimationFrame(() => { raf = 0; tick(); if (targets.size) loop(); });
  }

  // Taster man, sættes prikkerne, før browseren tegner tegnet
  const now = (e) => {
    const el = e.target;
    if (!(el instanceof HTMLInputElement) || !NH.cfg.skjulCpr) return;
    if (!targets.has(el)) { const k = fieldKind(el); if (!k) return; track(el, k); loop(); }
    apply(el);
  };
  for (const ev of ['input', 'focusin', 'focusout', 'keydown']) document.addEventListener(ev, now, true);

  let scanT = 0;
  new MutationObserver(() => { clearTimeout(scanT); scanT = setTimeout(scan, 120); })
    .observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  scan();

  NH.onCfg(() => {
    if (!NH.cfg.skjulCpr) for (const el of [...targets.keys()]) untrack(el);
    else scan();
  });
})();
