/*
 * Store forsider: hold musen over en lille forside, så vises den i fuld størrelse.
 */
(() => {
  'use strict';
  const NH = window.NH;
  if (!NH || NH.forsider) return;
  NH.forsider = true;

  const prev = NH.add('<img class="prev" alt="">');
  let thumb = null, timer = 0;

  function isThumb(el) {
    if (!(el instanceof HTMLImageElement) || !el.complete || !el.naturalWidth) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.width <= 110 && r.height <= 160 && el.naturalWidth >= r.width * 1.4;
  }

  function show(img) {
    if (!img.isConnected) return;
    const r = img.getBoundingClientRect();
    const scale = Math.min(1, (innerHeight * 0.7) / img.naturalHeight, (innerWidth * 0.4) / img.naturalWidth);
    const w = Math.round(img.naturalWidth * scale), h = Math.round(img.naturalHeight * scale);
    let left = r.right + 14;
    if (left + w > innerWidth - 8) left = Math.max(8, r.left - w - 14);
    const top = Math.max(8, Math.min(innerHeight - h - 8, r.top + r.height / 2 - h / 2));
    prev.src = img.currentSrc || img.src;
    Object.assign(prev.style, { width: w + 'px', height: h + 'px', left: left + 'px', top: top + 'px', display: 'block' });
    requestAnimationFrame(() => prev.classList.add('vis'));
  }

  function hide() {
    clearTimeout(timer);
    thumb = null;
    prev.classList.remove('vis');
    prev.style.display = 'none';
  }

  NH.onTick(({ x, y }) => {
    if (!NH.cfg.forsider) return thumb && hide();
    const img = NH.stack(x, y).slice(0, 5).find(isThumb) || null;
    if (img === thumb) return;
    hide();
    if (img) {
      thumb = img;
      timer = setTimeout(() => show(img), 250);
    }
  });
  addEventListener('scroll', hide, { capture: true, passive: true });
  addEventListener('blur', hide);
  document.addEventListener('mousedown', hide, true);
  NH.onCfg(hide);
})();
