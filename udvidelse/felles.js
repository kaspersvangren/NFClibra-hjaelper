/*
 * NFClibra-hjælper – fælles del: indstillinger, laget oven på Cicero, hjælpere til felter, knapper og tabeller.
 * Filerne qr.js, forsider.js, kopier.js og genveje.js bygger på det, der ligger i window.NH.
 * Udvidelsen læser kun det, der står på siden, og sender intet nogen steder hen.
 */
(() => {
  'use strict';
  if (window.NH) return;
  const NH = (window.NH = {});

  // ---------- Indstillinger ----------
  NH.STD = { qrLaaner: true, qrCql: true, forsider: true, kopier: true, ctrlEnter: true, traek: true, skjulCpr: true, tjekOpdatering: true };
  NH.cfg = { ...NH.STD };
  const cfgLyttere = [];
  NH.onCfg = (f) => cfgLyttere.push(f);
  try {
    chrome.storage.sync.get(NH.STD, (v) => { Object.assign(NH.cfg, v); cfgLyttere.forEach((f) => f()); });
    chrome.storage.onChanged.addListener((ch, area) => {
      if (area !== 'sync') return;
      for (const k in ch) if (k in NH.STD) NH.cfg[k] = ch[k].newValue ?? NH.STD[k];
      cfgLyttere.forEach((f) => f());
    });
  } catch (_) { /* uden for udvidelsen (fx test): standardvalg */ }

  // ---------- Laget oven på siden ----------
  const host = (NH.host = document.createElement('div'));
  host.style.cssText = 'all:initial;position:fixed;left:0;top:0;width:0;height:0;z-index:2147483647;';
  const root = (NH.root = host.attachShadow({ mode: 'closed' }));
  root.innerHTML = `<style>
    :host { all: initial; }
    * { box-sizing: border-box; }
    .chip { position: fixed; display: none; pointer-events: auto; cursor: pointer;
      align-items: center; gap: 4px; padding: 4px 7px; border: 0; border-radius: 6px;
      background: #1976d2; color: #fff; font: 600 11px/1 system-ui, "Segoe UI", sans-serif;
      box-shadow: 0 1px 5px rgba(0,0,0,.45); }
    .chip:hover { background: #1565c0; }
    .chip svg { width: 13px; height: 13px; display: block; }
    .prev { position: fixed; display: none; pointer-events: none; border-radius: 6px; background: #fff;
      box-shadow: 0 8px 28px rgba(0,0,0,.55); opacity: 0; transition: opacity .15s; }
    .prev.vis { opacity: 1; }
    .box { position: fixed; pointer-events: none; border-radius: 4px;
      background: rgba(25,118,210,.22); outline: 2px solid rgba(25,118,210,.85); }
    .toast { position: fixed; pointer-events: none; max-width: 360px; padding: 6px 10px; border-radius: 6px;
      background: #323232; color: #fff; font: 13px/1.3 system-ui, "Segoe UI", sans-serif;
      box-shadow: 0 3px 12px rgba(0,0,0,.4); opacity: 0; transition: opacity .15s; white-space: nowrap;
      overflow: hidden; text-overflow: ellipsis; }
    .toast.vis { opacity: 1; }
    .back { position: fixed; inset: 0; display: none; pointer-events: auto; background: rgba(0,0,0,.45);
      align-items: center; justify-content: center; }
    .card { --bg: #2b2b2b; --fg: #eee; --line: #444; background: var(--bg); color: var(--fg);
      border-radius: 12px; padding: 14px 18px 16px; width: max-content; min-width: 260px; max-width: min(92vw, 560px);
      font: 14px/1.4 system-ui, "Segoe UI", sans-serif; box-shadow: 0 12px 40px rgba(0,0,0,.5); }
    @media (prefers-color-scheme: light) { .card { --bg: #fff; --fg: #222; --line: #ddd; } }
    .head { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
    .title { font-weight: 700; font-size: 15px; }
    .x { border: 0; background: transparent; color: inherit; font-size: 22px; line-height: 1;
      cursor: pointer; padding: 0 2px; opacity: .7; }
    .x:hover { opacity: 1; }
    .val { font-family: ui-monospace, Consolas, monospace; font-size: 13px; word-break: break-all;
      max-height: 4.4em; overflow: auto; margin: 4px 0 12px; opacity: .85; }
    .qr { background: #fff; border-radius: 8px; display: flex; justify-content: center; }
    .qr svg { display: block; }
    .foot { font-size: 12px; opacity: .7; margin-top: 10px; text-align: center; }
    .err { color: #e57373; }
    .valg { display: flex; flex-direction: column; gap: 4px; margin-top: 10px; }
    .valg button { display: flex; gap: 10px; align-items: center; text-align: left; width: 100%;
      padding: 7px 10px; border: 1px solid var(--line); border-radius: 8px; background: transparent;
      color: inherit; font: inherit; cursor: pointer; }
    .valg button:hover { background: rgba(25,118,210,.18); }
    .valg kbd { display: inline-block; min-width: 20px; padding: 1px 5px; border-radius: 4px; text-align: center;
      background: rgba(127,127,127,.25); font: 600 12px ui-monospace, Consolas, monospace; }
  </style>`;
  NH.ensureHost = () => { if (!host.isConnected) document.documentElement.appendChild(host); };
  NH.ensureHost();
  NH.add = (html) => {
    const t = document.createElement('template');
    t.innerHTML = html.trim();
    const el = t.content.firstElementChild;
    root.appendChild(el);
    return el;
  };

  // ---------- Musen (én fælles lytter; modulerne får besked pr. billede) ----------
  NH.mouse = { x: -1, y: -1, ev: null };
  const tickers = [];
  NH.onTick = (f) => tickers.push(f);
  let raf = 0;
  document.addEventListener('mousemove', (e) => {
    NH.mouse = { x: e.clientX, y: e.clientY, ev: e };
    if (!raf) raf = requestAnimationFrame(() => {
      raf = 0;
      NH.ensureHost();
      for (const f of tickers) { try { f(NH.mouse); } catch (_) {} }
    });
  }, { capture: true, passive: true });

  // ---------- Tekst og geometri ----------
  NH.textOf = (el) => ((el && (el.innerText || el.textContent)) || '').replace(/\s+/g, ' ').trim();
  NH.visible = (el) => {
    if (!el || !el.isConnected) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden';
  };
  NH.textRect = (node, start, end) => {
    const r = document.createRange();
    if (start == null) r.selectNodeContents(node);
    else { r.setStart(node, start); r.setEnd(node, end); }
    const rect = r.getBoundingClientRect();
    return rect.width || rect.height ? rect : null;
  };
  NH.inside = (r, x, y, pad = 0) =>
    !!r && x >= r.left - pad && x <= r.right + pad && y >= r.top - pad && y <= r.bottom + pad;
  NH.textNodes = (el, max = 60) => {
    const out = [];
    const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = w.nextNode()) && out.length < max) if (n.data.trim()) out.push(n);
    return out;
  };
  NH.stack = (x, y) => document.elementsFromPoint(x, y).filter((e) => e !== host);
  NH.uniq = (a) => [...new Set(a)];

  // ---------- Toast og markeringsbokse ----------
  const toast = NH.add('<div class="toast"></div>');
  let toastT = 0;
  NH.toast = (msg, ms = 2200) => {
    toast.textContent = msg;
    const { x, y } = NH.mouse;
    toast.style.display = 'block';
    const w = toast.offsetWidth, h = toast.offsetHeight;
    const left = x < 0 ? innerWidth / 2 - w / 2 : Math.min(innerWidth - w - 8, x + 14);
    const top = y < 0 ? innerHeight - h - 24 : Math.min(innerHeight - h - 8, y + 18);
    toast.style.left = Math.max(8, left) + 'px';
    toast.style.top = Math.max(8, top) + 'px';
    toast.classList.add('vis');
    clearTimeout(toastT);
    toastT = setTimeout(() => toast.classList.remove('vis'), ms);
  };

  const boxes = [];
  NH.showBoxes = (rects) => {
    while (boxes.length < rects.length) boxes.push(NH.add('<div class="box"></div>'));
    boxes.forEach((b, i) => {
      const r = rects[i];
      if (!r) { b.style.display = 'none'; return; }
      Object.assign(b.style, { display: 'block', left: r.left - 2 + 'px', top: r.top - 1 + 'px',
        width: r.width + 4 + 'px', height: r.height + 2 + 'px' });
    });
  };
  NH.hideBoxes = () => NH.showBoxes([]);

  // ---------- Knapper ----------
  /** Tooltip-, aria- og titeltekster for et element (Ciceros ikonknapper har kun tooltip) */
  NH.tipOf = (el) => {
    const t = [el.getAttribute('aria-label'), el.getAttribute('title'), el.getAttribute('mattooltip'),
      el.getAttribute('ng-reflect-message')];
    for (const id of (el.getAttribute('aria-describedby') || '').split(/\s+/)) {
      const d = id && document.getElementById(id);
      if (d) t.push(d.textContent);
    }
    return t.filter(Boolean).map((s) => s.replace(/\s+/g, ' ').trim());
  };
  NH.disabled = (b) => b.disabled || b.getAttribute('aria-disabled') === 'true' ||
    b.classList.contains('mat-mdc-button-disabled') || b.classList.contains('mat-button-disabled');
  /** Synlige knapper med netop den tekst eller tooltip (ikon-tekst ved siden af teksten tillades) */
  NH.buttons = (name, scope = document) => {
    const want = name.toLowerCase();
    return [...scope.querySelectorAll('button, [role="button"], a[href]')].filter((b) => {
      if (!NH.visible(b)) return false;
      const t = NH.textOf(b).toLowerCase();
      if (t === want) return true;
      if (t.includes(want)) {
        const rest = t.replace(want, '').trim();
        if (/^[a-z_ ]{0,30}$/.test(rest)) return true; // fx "check_circle Gennemfør udlån"
      }
      return NH.tipOf(b).some((s) => s.toLowerCase() === want);
    });
  };

  // ---------- Felter ----------
  const letters = (s) => (s || '').toLowerCase().replace(/[^a-zæøå]/g, '');
  /** Ciceros felt (mat-form-field) med en etiket, der passer – giver input/textarea */
  NH.field = (labelRe) => {
    for (const ff of document.querySelectorAll('mat-form-field, .mat-mdc-form-field')) {
      const l = ff.querySelector('mat-label, label');
      if (!l || !labelRe.test(letters(l.textContent))) continue;
      const inp = ff.querySelector('input:not([type="checkbox"]):not([type="radio"]), textarea');
      if (inp && NH.visible(inp)) return inp;
    }
    return null;
  };
  /** Sætter værdien, så Cicero (Angular) opdager den, som var den tastet */
  NH.setValue = (input, v) => {
    const proto = input instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    input.focus();
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(input, v);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  };
  /** Tryk Søg i samme søgekort som feltet (ledes udad fra feltet), ellers Enter i feltet */
  NH.search = (input) => {
    for (let a = input.parentElement; a; a = a.parentElement) {
      const b = [...a.querySelectorAll('button')].find((b) => /^s[øo]g$/i.test(NH.textOf(b)) && !NH.disabled(b) && NH.visible(b));
      if (b) { b.click(); return true; }
    }
    for (const type of ['keydown', 'keypress', 'keyup']) {
      input.dispatchEvent(new KeyboardEvent(type, { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));
    }
    return false;
  };
  NH.waitFor = (fn, ms) => new Promise((res) => {
    const t0 = Date.now();
    (function poll() {
      let v = null;
      try { v = fn(); } catch (_) {}
      if (v) return res(v);
      if (Date.now() - t0 > ms) return res(null);
      setTimeout(poll, 100);
    })();
  });
  NH.sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // ---------- Navigation inde i Cicero ----------
  /**
   * Går til en side i Cicero uden at genindlæse (som Ciceros egne links).
   * Cicero sender ofte videre til en længere adresse (fx /patron-administration → /patron-administration/patron-search),
   * så siden tæller, når adressen starter med stien. Udvidelsen genindlæser aldrig Cicero selv.
   */
  NH.goTo = async (path, readyFn) => {
    const target = new URL(path, location.href);
    const here = () => location.pathname === target.pathname || location.pathname.startsWith(target.pathname + '/');
    const ready = () => here() && readyFn();
    if (!target.search && (await NH.waitFor(ready, 300))) return true;
    const link = target.search ? null : [...document.querySelectorAll('a[href]')].find((a) => {
      try {
        const p = new URL(a.href, location.href).pathname;
        return p === target.pathname || p.startsWith(target.pathname + '/');
      } catch (_) { return false; }
    });
    if (link) link.click();
    else {
      history.pushState(history.state, '', target.pathname + target.search);
      dispatchEvent(new PopStateEvent('popstate', { state: history.state }));
    }
    return !!(await NH.waitFor(ready, 6000));
  };

  // ---------- Tabeller: rækker, flueben og kolonner ----------
  const ROW_SEL = 'tr, [role="row"], mat-row, .mat-mdc-row, .mat-row';
  NH.ROW_SEL = ROW_SEL;
  const isHeaderRow = (r) => !!(r.closest('thead') || r.querySelector('th, [role="columnheader"], mat-header-cell'));
  NH.rowAt = (x, y) => {
    for (const el of NH.stack(x, y).slice(0, 8)) {
      const r = el.closest && el.closest(ROW_SEL);
      if (r && !isHeaderRow(r)) return r;
    }
    return null;
  };
  NH.markedRows = () => {
    const out = new Set();
    for (const cb of document.querySelectorAll('input[type="checkbox"]')) {
      if (!cb.checked) continue;
      const r = cb.closest(ROW_SEL);
      if (r && !isHeaderRow(r) && NH.visible(r)) out.add(r);
    }
    return [...out];
  };

  // Hvad kolonner og etiketter hedder, og hvordan værdien ser ud
  const KINDS = {
    laaner: { label: /^lånern(r|ummer)$/, val: /^[A-Za-z]?\d{5,15}$/ },
    materiale: { label: /^materialen(r|ummer)$/, val: /^[A-Za-z]?\d{5,16}$/ },
    faust: { label: /^faust(nr|nummer)?$/, val: /^\d{7,10}$/ },
    // Kolonnen "Låner" viser kun navnet (fx under Materialer på en post) – bruges kun fra tabelrækker
    laanernavn: { label: /^låner$/, val: /^(?=.*[A-Za-zÆØÅæøåÄÖÜäöüé])[^\d]{2,80}$/ },
  };
  NH.KINDS = KINDS;
  const kindOf = (text) => {
    const l = letters(text);
    for (const k in KINDS) if (KINDS[k].label.test(l)) return k;
    return null;
  };
  NH.kindOf = kindOf;

  let headCache = { t: -Infinity, list: [] };
  /** Tekst-noder, der er en kolonneoverskrift eller etiket (Lånernummer, Faust-nr. …) */
  NH.labelNodes = () => {
    const now = performance.now();
    if (now - headCache.t > 800) {
      const list = [];
      const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = w.nextNode())) {
        const s = n.data.trim();
        if (s.length < 30 && kindOf(s.replace(/:$/, ''))) list.push(n);
      }
      headCache = { t: now, list };
    }
    return headCache.list.filter((n) => n.isConnected);
  };

  /** Værdier i en tabelrække, fundet via kolonneoverskrifterne over den */
  NH.rowValues = (row) => {
    const out = { laaner: [], materiale: [], faust: [], laanernavn: [] };
    const table = row.closest('table, [role="table"], [role="grid"], mat-table, .mat-mdc-table');
    const rr = row.getBoundingClientRect();
    const texts = NH.textNodes(row, 200).map((n) => ({ n, r: NH.textRect(n) })).filter((o) => o.r);
    for (const h of NH.labelNodes()) {
      if (table && !table.contains(h)) continue;
      if (!h.parentElement) continue;
      const cell = h.parentElement.closest('th, [role="columnheader"], mat-header-cell') || h.parentElement;
      if (row.contains(cell)) continue;
      const hr = cell.getBoundingClientRect();
      if (!hr.width || hr.bottom > rr.top + 2) continue;
      const k = kindOf(h.data.trim().replace(/:$/, ''));
      const v = texts
        .filter((o) => { const cx = (o.r.left + o.r.right) / 2; return cx >= hr.left - 2 && cx <= hr.right + 2; })
        .map((o) => o.n.data.trim()).join(' ').replace(/\s+/g, ' ').trim();
      if (v && KINDS[k].val.test(v)) out[k].push(v);
    }
    return out;
  };

  /** Værdier med en etiket foran (fx "Lånernr. C012345678" i en flyin) og i Ciceros felter */
  NH.labeledValues = (k) => {
    const vals = [];
    const re = KINDS[k];
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (const h of NH.labelNodes()) {
      if (kindOf(h.data.trim().replace(/:$/, '')) !== k || !NH.textRect(h)) continue;
      if (h.parentElement && h.parentElement.closest('th, [role="columnheader"], mat-header-cell, thead')) continue;
      w.currentNode = h;
      let n;
      while ((n = w.nextNode()) && !n.data.trim());
      const v = n && n.data.trim();
      if (v && re.val.test(v) && NH.textRect(n)) vals.push(v);
    }
    // Samme etiket og nummer i én tekst ("Lånernr. C012345678")
    const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let n;
    const inline = { laaner: /Lånern(?:r|ummer)\.?:?\s+([A-Za-z]?\d{5,15})(?![\dA-Za-z])/i,
      materiale: /Materialen(?:r|ummer)\.?:?\s+([A-Za-z]?\d{5,16})(?![\dA-Za-z])/i,
      faust: /Faust(?:-?nr\.?|nummer)?:?\s+(\d{7,10})(?!\d)/i }[k];
    while ((n = tw.nextNode())) {
      const m = n.data.length < 200 && n.data.match(inline);
      if (m && NH.textRect(n)) vals.push(m[1]);
    }
    // Ciceros felter med etiket (fx en flyin, hvor værdien står i et felt)
    for (const ff of document.querySelectorAll('mat-form-field, .mat-mdc-form-field')) {
      const l = ff.querySelector('mat-label, label');
      if (!l || kindOf(l.textContent) !== k) continue;
      const inp = ff.querySelector('input, textarea');
      const v = inp && inp.value.trim();
      if (v && re.val.test(v) && NH.visible(inp)) vals.push(v);
    }
    return NH.uniq(vals);
  };

  /**
   * Hvad står man på? Markerede rækker først, så rækken under musen, så det, der står med etiket på siden.
   * Giver { vals, rows } eller null.
   */
  /** Første tekst i rækken, der ikke bare er et nummer (typisk titel eller navn) – vises i vælgeren */
  const rowName = (row) => (NH.textNodes(row, 40).map((n) => n.data.trim()).find((t) => t.length > 2 && !/^[A-Za-z]?[\d\s./-]+$/.test(t)) || '');
  NH.source = (k, rowsOnly = false) => {
    const marked = NH.markedRows();
    if (marked.length) {
      const names = {};
      const v = NH.uniq(marked.flatMap((r) => NH.rowValues(r)[k].map((x) => (names[x] = rowName(r), x))));
      if (v.length) return { vals: v, rows: marked, names };
    }
    const row = NH.mouse.x >= 0 ? NH.rowAt(NH.mouse.x, NH.mouse.y) : null;
    if (row) {
      const v = NH.rowValues(row)[k];
      if (v.length) return { vals: v, rows: [row] };
    }
    if (rowsOnly) return null;
    const v = NH.labeledValues(k);
    return v.length ? { vals: v, rows: [] } : null;
  };

  // ---------- Vælger ("Hvilken vil du have med?") ----------
  const vback = NH.add(`<div class="back"><div class="card" role="dialog" aria-modal="true">
    <div class="head"><span class="title"></span><button class="x" type="button" title="Annullér (Esc)">×</button></div>
    <div class="valg"></div></div></div>`);
  let vDone = null;
  const vClose = (v) => { vback.style.display = 'none'; const d = vDone; vDone = null; if (d) d(v); };
  vback.querySelector('.x').addEventListener('click', () => vClose(null));
  vback.addEventListener('click', (e) => { if (e.composedPath()[0] === vback) vClose(null); });
  NH.choose = (title, vals, allowAll, names = {}) => new Promise((res) => {
    if (vDone) vClose(null);
    vDone = res;
    vback.querySelector('.title').textContent = title;
    const box = vback.querySelector('.valg');
    box.innerHTML = '';
    const add = (key, text, value) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.innerHTML = '<kbd></kbd><span></span>';
      b.querySelector('kbd').textContent = key;
      b.querySelector('span').textContent = text;
      b.addEventListener('click', () => vClose(value));
      box.appendChild(b);
    };
    vals.slice(0, 9).forEach((v, i) => add(String(i + 1), names[v] ? `${v}  ·  ${names[v]}` : v, [v]));
    if (allowAll) add('A', `Alle (${vals.length})`, vals.slice());
    vback.style.display = 'flex';
    vback.keys = (e) => {
      if (e.key === 'Escape') return vClose(null), true;
      const i = parseInt(e.key, 10);
      if (i >= 1 && i <= Math.min(9, vals.length)) return vClose([vals[i - 1]]), true;
      if (allowAll && /^a$/i.test(e.key)) return vClose(vals.slice()), true;
      return false;
    };
  });
  NH.chooserOpen = () => vback.style.display === 'flex';
  document.addEventListener('keydown', (e) => {
    if (NH.chooserOpen() && vback.keys && vback.keys(e)) { e.preventDefault(); e.stopPropagation(); }
  }, true);
})();
