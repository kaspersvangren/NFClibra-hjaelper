/*
 * Ctrl + mus: feltet under musen markeres; Ctrl+C kopierer hele feltets tekst (titel, forfatter, nummer …).
 * Har man selv markeret tekst, kopierer Ctrl+C som normalt.
 */
(() => {
  'use strict';
  const NH = window.NH;
  if (!NH || NH.kopier) return;
  NH.kopier = true;

  let ctrl = false, ready = false, cur = null, timer = 0;

  function feltVed(x, y) {
    for (const el of NH.stack(x, y).slice(0, 6)) {
      // Et felt med en værdi (fx Navn i lånerens flyin)
      const ff = el.closest && el.closest('mat-form-field, .mat-mdc-form-field');
      const inp = (el.matches && el.matches('input, textarea') ? el : null) ||
        (ff && ff.querySelector('input:not([type="checkbox"]):not([type="radio"]):not([type="hidden"]), textarea'));
      if (inp && inp.value && inp.value.trim() && NH.visible(inp) && !/^(password|checkbox|radio)$/.test(inp.type)) {
        return { text: inp.value.replace(/\s+/g, ' ').trim(), rect: () => inp.getBoundingClientRect() };
      }
      // Tekst: hele elementet, teksten står i
      for (const tn of NH.textNodes(el)) {
        if (!NH.inside(NH.textRect(tn), x, y, 2)) continue;
        const p = tn.parentElement;
        let text = NH.textOf(p);
        let rect = () => { const r = document.createRange(); r.selectNodeContents(p); return r.getBoundingClientRect(); };
        // Står der andet i samme element på sin egen linje (fx feltets overskrift over værdien),
        // tages kun den tekst, musen peger på
        const egenLinje = [...p.children].some((c) => c.tagName === 'BR' ||
          (c.textContent.trim() && !/^inline/.test(getComputedStyle(c).display)));
        if (!text || text.length > 400 || egenLinje) {
          text = tn.data.replace(/\s+/g, ' ').trim();
          rect = () => NH.textRect(tn);
        }
        return text ? { text, rect } : null;
      }
    }
    return null;
  }

  function update() {
    if (!ctrl || !ready || !NH.cfg.kopier || NH.chooserOpen()) {
      if (cur) { cur = null; NH.hideBoxes(); }
      return;
    }
    cur = NH.mouse.x >= 0 ? feltVed(NH.mouse.x, NH.mouse.y) : null;
    const r = cur && cur.rect();
    if (r) NH.showBoxes([r]); else { cur = null; NH.hideBoxes(); }
  }

  const off = () => { clearTimeout(timer); if (ctrl) { ctrl = false; ready = false; update(); } };
  addEventListener('keydown', (e) => {
    if (e.key === 'Control' && !e.shiftKey && !e.altKey && !e.metaKey) {
      if (!ctrl) { ctrl = true; ready = false; timer = setTimeout(() => { ready = true; update(); }, 150); }
      return;
    }
    if (e.key === 'Shift' || e.key === 'Alt') return off();
    if (e.ctrlKey && !e.shiftKey && !e.altKey && e.code === 'KeyC' && NH.cfg.kopier) {
      if (!cur && NH.mouse.x >= 0) cur = feltVed(NH.mouse.x, NH.mouse.y); // C trykket før markeringen nåede frem
      if (!cur || !egenMarkeringTom()) return;
      e.preventDefault();
      e.stopPropagation();
      kopier(cur.text);
    }
  }, true);
  addEventListener('keyup', (e) => { if (e.key === 'Control') off(); }, true);
  addEventListener('blur', off);
  addEventListener('scroll', () => ctrl && update(), { capture: true, passive: true });
  NH.onTick(({ ev }) => {
    if (ev && !ev.ctrlKey) return off();
    if (ev && (ev.shiftKey || ev.altKey)) return off();
    if (ev && ev.ctrlKey) { ctrl = true; ready = true; }
    update();
  });
  NH.onCfg(update);

  /** Har brugeren selv markeret noget, skal Ctrl+C virke som normalt */
  function egenMarkeringTom() {
    const sel = getSelection();
    if (sel && !sel.isCollapsed && sel.toString().trim()) return false;
    const a = document.activeElement;
    if (a && /^(INPUT|TEXTAREA)$/.test(a.tagName)) {
      try { if (a.selectionStart !== a.selectionEnd) return false; } catch (_) {}
    }
    return true;
  }

  async function kopier(text) {
    let ok = false;
    try { await navigator.clipboard.writeText(text); ok = true; } catch (_) {}
    if (!ok) {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0;';
      const active = document.activeElement;
      document.body.appendChild(ta);
      ta.select();
      try { ok = document.execCommand('copy'); } catch (_) {}
      ta.remove();
      if (active && active.focus) active.focus();
    }
    NH.toast(ok ? `Kopieret: ${NH.maskCpr ? NH.maskCpr(text) : text}` : 'Kunne ikke kopiere');
  }
})();
