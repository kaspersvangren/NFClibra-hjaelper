/*
 * QR-koder til NFClibra: hold musen over et lånernummer eller Ciceros "CQL:"-linje → QR-knap → QR-kode.
 */
(() => {
  'use strict';
  const NH = window.NH;
  if (!NH || NH.qr) return;
  NH.qr = true;

  const LAANER_SEK = 30; // QR med lånernummer forsvinder af sig selv – det er en personoplysning
  const NUM = /^[A-Za-z]?\d{5,15}$/;
  const LABEL_END = /Lånern(?:r|ummer)\.?:?\s*$/i;
  const LABEL_IN = /Lånern(?:r|ummer)\.?:?\s*([A-Za-z]?\d{5,15})(?![\dA-Za-z])/i;

  const chip = NH.add(`<button class="chip" type="button" title="Vis som QR-kode til NFClibra">
    <svg viewBox="0 0 13 13" fill="currentColor" aria-hidden="true"><path d="M0 0h5v5H0zM1 1v3h3V1zM8 0h5v5H8zM9 1v3h3V1zM0 8h5v5H0zM1 9v3h3V9zM2 2h1v1H2zM10 2h1v1h-1zM2 10h1v1H2zM6 0h1v2H6zM6 3h1v3H6zM0 6h2v1H0zM3 6h3v1H3zM8 6h1v1H8zM10 6h3v1h-3zM6 8h2v1H6zM9 8h1v2H9zM11 8h2v1h-2zM6 10h1v3H6zM8 11h1v2H8zM10 11h3v1h-3zM12 9h1v1h-1z"/></svg>
    <span>QR</span></button>`);
  const back = NH.add(`<div class="back"><div class="card" role="dialog" aria-modal="true">
    <div class="head"><span class="title"></span><button class="x" type="button" title="Luk (Esc)">×</button></div>
    <div class="val"></div><div class="qr"></div><div class="foot"></div></div></div>`);
  const card = back.querySelector('.card');
  const elTitle = back.querySelector('.title');
  const elVal = back.querySelector('.val');
  const elQr = back.querySelector('.qr');
  const elFoot = back.querySelector('.foot');

  // ---------- Lånernummer ----------
  function labelBefore(tn) {
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    w.currentNode = tn;
    for (let i = 0; i < 2; ) {
      const p = w.previousNode();
      if (!p) return false;
      const s = p.data.trim();
      if (!s) continue;
      if (LABEL_END.test(s)) return true;
      i++;
    }
    return false;
  }

  function underHeader(nr) {
    const cx = (nr.left + nr.right) / 2;
    for (const h of NH.labelNodes()) {
      if (NH.kindOf(h.data.trim()) !== 'laaner' || !h.parentElement) continue;
      const cell = h.parentElement.closest('th,[role="columnheader"]') || h.parentElement;
      const hr = cell.getBoundingClientRect();
      if (!hr.width) continue;
      if (cx >= hr.left - 2 && cx <= hr.right + 2 && nr.top >= hr.bottom - 4) return true;
    }
    return false;
  }

  function laanerTarget(tn, x, y) {
    const raw = tn.data;
    const s = raw.trim();
    if (NUM.test(s)) {
      const start = raw.indexOf(s);
      const rect = () => NH.textRect(tn, start, start + s.length);
      const r = rect();
      if (!NH.inside(r, x, y, 3)) return null;
      if (labelBefore(tn) || underHeader(r)) return { kind: 'laaner', node: tn, rect, value: () => s };
      return null;
    }
    const m = raw.match(LABEL_IN);
    if (m) {
      const start = m.index + m[0].length - m[1].length;
      const rect = () => NH.textRect(tn, start, start + m[1].length);
      if (NH.inside(rect(), x, y, 3) || NH.inside(NH.textRect(tn), x, y, 3)) {
        return { kind: 'laaner', node: tn, rect, value: () => m[1] };
      }
    }
    return null;
  }

  // ---------- CQL ----------
  function balanced(s) {
    let d = 0, q = false;
    for (const c of s) {
      if (c === '"') q = !q;
      else if (!q && c === '(') d++;
      else if (!q && c === ')' && --d < 0) return false;
    }
    return d === 0 && !q;
  }

  /** "(X) and (bai=715900)" → "X" – Cicero sætter selv bibliotekets filter på */
  function stripBai(s) {
    const m = s.match(/^\((.*)\)\s+and\s+\(\s*bai\s*=\s*\d+\s*\)$/i);
    if (m && balanced(m[1])) return m[1].trim();
    return s
      .replace(/\s+and\s+\(\s*bai\s*=\s*\d+\s*\)\s*$/i, '')
      .replace(/\s+and\s+bai\s*=\s*\d+(?=\s*\)*\s*$)/i, '')
      .replace(/^\(\s*bai\s*=\s*\d+\s*\)$|^bai\s*=\s*\d+$/i, '')
      .trim();
  }
  NH.stripBai = stripBai;

  /** Hele søgningen fra linjen – også filtre fra søgeformularen (bhs, bfi …) – kun bibliotekets bai=… tages fra */
  function cqlFromLine(lineText) {
    return stripBai(lineText.replace(/^\s*CQL:\s*/i, '').replace(/\s+/g, ' ').trim());
  }

  function cqlTarget(tn, x, y) {
    if (!NH.inside(NH.textRect(tn), x, y, 3)) return null;
    let el = tn.parentElement;
    for (let i = 0; el && i < 5; i++, el = el.parentElement) {
      const t = el.textContent.trim();
      if (/^CQL:/i.test(t) && t.length > 6 && t.length < 4000) {
        const line = el;
        return {
          kind: 'cql', node: line,
          rect: () => {
            if (!line.isConnected) return null;
            const r = document.createRange();
            r.selectNodeContents(line);
            return r.getBoundingClientRect();
          },
          value: () => cqlFromLine(line.textContent),
        };
      }
    }
    return null;
  }

  function findTarget(x, y) {
    for (const el of NH.stack(x, y).slice(0, 4)) {
      for (const tn of NH.textNodes(el)) {
        const t = (NH.cfg.qrCql && cqlTarget(tn, x, y)) || (NH.cfg.qrLaaner && laanerTarget(tn, x, y));
        if (t) return t;
      }
    }
    return null;
  }

  // ---------- QR-knappen ----------
  let target = null, zone = null;

  function placeChip() {
    const r = target && target.rect();
    if (!r) return hideChip();
    chip.style.display = 'flex';
    const cw = chip.offsetWidth, ch = chip.offsetHeight;
    let left = r.right + 6;
    if (left + cw > innerWidth - 4) left = Math.max(4, r.left - cw - 6);
    const top = Math.max(4, Math.min(innerHeight - ch - 4, r.top + r.height / 2 - ch / 2));
    chip.style.left = left + 'px';
    chip.style.top = top + 'px';
    zone = {
      left: Math.min(r.left, left) - 8, right: Math.max(r.right, left + cw) + 8,
      top: Math.min(r.top, top) - 6, bottom: Math.max(r.bottom, top + ch) + 6,
    };
  }
  function hideChip() { target = null; zone = null; chip.style.display = 'none'; }

  chip.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!target) return;
    const kind = target.kind, value = target.value();
    hideChip();
    openQr(kind, value);
  });

  NH.onTick(({ x, y, ev }) => {
    if (back.style.display === 'flex') return;
    if ((!NH.cfg.qrLaaner && !NH.cfg.qrCql) || (ev && (ev.ctrlKey || ev.shiftKey))) return hideChip();
    if (target && NH.inside(zone, x, y) && target.node.isConnected) return placeChip();
    target = findTarget(x, y);
    if (target) placeChip(); else hideChip();
  });
  addEventListener('scroll', hideChip, { capture: true, passive: true });
  addEventListener('blur', hideChip);
  NH.onCfg(hideChip);

  // ---------- QR-vinduet ----------
  let countdown = 0;

  function qrSvg(text) {
    const { QrCode, QrSegment } = qrcodegen;
    const ecl = text.length > 120 ? QrCode.Ecc.LOW : QrCode.Ecc.MEDIUM;
    // Ren ASCII kodes så kompakt som muligt; med æøå mærkes koden som UTF-8 (ECI 26)
    const qr = /^[\x00-\x7f]*$/.test(text)
      ? QrCode.encodeText(text, ecl)
      : QrCode.encodeSegments([QrSegment.makeEci(26), QrSegment.makeBytes([...new TextEncoder().encode(text)])], ecl);
    const n = qr.size, m = 4, cell = Math.max(3, Math.min(10, Math.floor(300 / n)));
    let d = '';
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (qr.getModule(x, y)) d += `M${x + m},${y + m}h1v1h-1z`;
    const s = n + 2 * m;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${s * cell}" height="${s * cell}" viewBox="0 0 ${s} ${s}" shape-rendering="crispEdges"><rect width="${s}" height="${s}" fill="#fff"/><path d="${d}" fill="#000"/></svg>`;
  }

  function openQr(kind, value) {
    closeQr();
    const laaner = kind === 'laaner';
    elTitle.textContent = laaner ? 'Lånernummer' : 'CQL-søgning';
    elVal.textContent = value || '(tom søgning)';
    elFoot.classList.remove('err');
    if (!value) elFoot.textContent = 'Der er ingen søgning at vise.';
    else {
      try { elQr.innerHTML = qrSvg(value); } catch (_) {
        elFoot.classList.add('err');
        elFoot.textContent = 'Søgningen er for lang til en QR-kode.';
      }
    }
    back.style.display = 'flex';
    if (laaner && value) {
      let left = LAANER_SEK;
      const show = () => { elFoot.textContent = `Lukker af sig selv om ${left} s · Esc lukker nu`; };
      show();
      countdown = setInterval(() => { if (--left <= 0) closeQr(); else show(); }, 1000);
    } else if (value && !elFoot.textContent) {
      elFoot.textContent = 'Scan med NFClibras kamera · Esc lukker';
    }
  }

  function closeQr() {
    clearInterval(countdown);
    countdown = 0;
    back.style.display = 'none';
    elQr.innerHTML = '';
    elVal.textContent = '';
    elFoot.textContent = '';
  }

  back.querySelector('.x').addEventListener('click', closeQr);
  back.addEventListener('click', (e) => { if (!card.contains(e.composedPath()[0])) closeQr(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && back.style.display === 'flex') {
      e.stopPropagation();
      e.preventDefault();
      closeQr();
    }
  }, true);
})();
