/*
 * Tastaturgenveje som i Cicero LMS:
 *   Ctrl+Enter        trykker Gennemfør udlån / Afslut aflevering / Opret reservation
 *   Ctrl+Shift+L      låneren → Lånere (fremsøgt og åbnet)
 *   Ctrl+Shift+M      materialet → materialesøgning   (N kan ikke bruges: Ctrl+Shift+N er browserens privat-vindue)
 *   Ctrl+Shift+B      posten → katalogsøgning (faust, ellers materialenummer)
 *   Ctrl+Shift+R      reservering (rækken under musen, markerede rækker eller den åbne post)
 * Udvidelsen trykker kun på Ciceros egne knapper og udfylder Ciceros egne felter.
 */
(() => {
  'use strict';
  const NH = window.NH;
  if (!NH || NH.genveje) return;
  NH.genveje = true;

  // ---------- Ctrl+Enter ----------
  const AFSLUT = ['Gennemfør udlån', 'Afslut aflevering', 'Opret reservation'];
  function ctrlEnter() {
    for (const name of AFSLUT) {
      const bs = NH.buttons(name);
      if (!bs.length) continue;
      const b = bs.find((b) => !NH.disabled(b));
      if (b) b.click(); else NH.toast(`"${name}" er ikke klar endnu`);
      return true;
    }
    return false;
  }

  // ---------- Hjælpere ----------
  /** Værdierne man står på: en liste, null hvis man annullerede vælgeren, undefined hvis der ingen er */
  async function pick(kind, title, allowAll) {
    const s = NH.source(kind);
    if (!s) return undefined;
    if (s.vals.length === 1) return s.vals;
    return NH.choose(title, s.vals, allowAll, s.names);
  }

  /** Klik på teksten v i rækken (så Ciceros klik på rækken/cellen udløses) */
  function clickValueInRow(row, v) {
    const tn = NH.textNodes(row, 200).find((n) => n.data.trim() === v);
    (tn ? tn.parentElement : row).click();
  }

  /** Udfyld Ciceros felt og tryk Søg. Lige efter et sideskift kan Cicero nulstille feltet, så der tjekkes efter. */
  async function fillAndSearch(field, v) {
    await NH.sleep(250);
    for (let i = 0; i < 3; i++) {
      const f = field();
      if (!f) return false;
      NH.setValue(f, v);
      await NH.sleep(150);
      if (field() && field().value.trim() === v) break;
    }
    const f = field();
    if (!f || f.value.trim() !== v) return false;
    NH.search(f);
    return true;
  }

  // ---------- L: låner ----------
  async function laaner() {
    const vals = await pick('laaner', 'Hvilken låner?', false);
    if (vals === null) return;
    if (vals) return laanerSoeg('nummer', vals[0]);
    // Står der kun lånerens navn (fx under Materialer på en post), søges der på navnet
    const s = NH.source('laanernavn', true);
    if (!s) return NH.toast('Ingen låner at trække med her');
    const navne = s.vals.length === 1 ? s.vals : await NH.choose('Hvilken låner?', s.vals, false);
    if (navne) return laanerSoeg('navn', navne[0]);
  }

  async function laanerSoeg(how, v) {
    const nrFelt = () => NH.field(/^låner$/), navnFelt = () => NH.field(/^navn$/);
    if (!(await NH.goTo('/patron-administration', nrFelt))) return NH.toast('Fandt ikke Låner-feltet under Lånere');
    // Ryd det andet felt, så en gammel søgning ikke blandes ind
    const andet = how === 'nummer' ? navnFelt() : nrFelt();
    if (andet && andet.value) NH.setValue(andet, '');
    const felt = how === 'nummer' ? nrFelt : navnFelt;
    if (!felt()) return NH.toast('Fandt ikke feltet Navn under Lånere');
    if (!(await fillAndSearch(felt, v))) return NH.toast('Kunne ikke udfylde feltet');
    await NH.sleep(500); // lad den nye søgning erstatte en gammel resultatliste
    if (how === 'nummer') {
      const row = await NH.waitFor(() => [...document.querySelectorAll(NH.ROW_SEL)]
        .find((r) => NH.visible(r) && NH.rowValues(r).laaner.includes(v)), 5000);
      if (row) clickValueInRow(row, v);
      return;
    }
    // Navn: åbn låneren, hvis præcis én hedder sådan; ellers står listen klar
    const same = (t) => t.replace(/\s+/g, ' ').trim().toLowerCase() === v.toLowerCase();
    const rows = () => [...document.querySelectorAll(NH.ROW_SEL)]
      .filter((r) => NH.visible(r) && NH.textNodes(r, 80).some((n) => same(n.data)));
    if (!(await NH.waitFor(() => rows().length, 5000))) return;
    await NH.sleep(300);
    const hits = rows();
    if (hits.length === 1) {
      const tn = NH.textNodes(hits[0], 80).find((n) => same(n.data));
      (tn ? tn.parentElement : hits[0]).click();
    } else NH.toast(`${hits.length} lånere hedder ${v} – vælg selv i listen`);
  }

  // ---------- M: materialesøgning ----------
  async function materiale(o) {
    const vals = o ? o.vals : await pick('materiale', 'Hvilket materiale?', true);
    if (vals === null) return;
    if (!vals) return NH.toast('Ingen materialenumre her');
    const field = () => NH.field(/^materialen(r|ummer)$/);
    const ok = await NH.goTo('/catalogue/materials', field);
    if (!ok) return NH.toast('Fandt ikke feltet Materialenummer');
    for (const v of vals) {
      if (!(await fillAndSearch(field, v))) return NH.toast('Kunne ikke udfylde feltet Materialenummer');
      if (vals.length > 1) await NH.sleep(900);
    }
  }

  // ---------- B: katalogsøgning ----------
  async function katalog(o) {
    let cql = o && o.cql;
    if (!cql) {
      // Faust søges uden kode (Cicero finder posten på nummeret); materialenumre med bmn=
      let prefix = '';
      let vals = await pick('faust', 'Hvilken post?', true);
      if (vals === undefined) { prefix = 'bmn='; vals = await pick('materiale', 'Hvilket materiale?', true); }
      if (vals === null) return;
      if (!vals) return NH.toast('Intet faust- eller materialenummer her');
      cql = vals.map((v) => prefix + v).join(' OR ');
    }
    const field = () => NH.field(/^cql$/);
    const path = '/catalogue/records';
    let ok = location.pathname === path && field() ? true
      : await NH.goTo(`${path}?cqlFreetext=${encodeURIComponent(cql)}`, field);
    if (!ok) return NH.toast('Fandt ikke CQL-feltet i katalogsøgningen');
    if (!(await fillAndSearch(field, cql))) NH.toast('Kunne ikke udfylde CQL-feltet');
  }

  // ---------- R: reservering ----------
  const outsideRows = (b) => !b.closest(NH.ROW_SEL);
  async function reserver() {
    const marked = NH.markedRows();
    if (marked.length) {
      const g0 = NH.buttons('Gå til reservation')[0];
      const foer = g0 ? NH.textOf(g0) : null; // tallet på kurven før
      const b = NH.buttons('Reserver').filter(outsideRows).find((b) => !NH.disabled(b));
      if (b) b.click();
      else if (!g0) return NH.toast('Fandt ikke Reserver-knappen');
      // Vent til kurven har taget imod de nye (tallet skifter), så de kommer med over
      if (b) await NH.waitFor(() => { const g = NH.buttons('Gå til reservation')[0]; return g && NH.textOf(g) !== foer; }, 3000);
      const g = await NH.waitFor(() => NH.buttons('Gå til reservation').find((b) => !NH.disabled(b)), 1000);
      if (g) g.click(); else NH.toast('Lagt i kurven – fandt ikke "Gå til reservation"');
      return;
    }
    const tilKurven = async () => {
      const g = await NH.waitFor(() => NH.buttons('Gå til reservation').find((b) => !NH.disabled(b)), 1500);
      if (g) g.click(); else NH.toast('Ligger i kurven – fandt ikke "Gå til reservation"');
    };
    const row = NH.mouse.x >= 0 ? NH.rowAt(NH.mouse.x, NH.mouse.y) : null;
    if (row) {
      const b = NH.buttons('Reserver', row).find((b) => !NH.disabled(b));
      if (b) return b.click();
      if (NH.buttons('Fjern fra reservation', row).length) return tilKurven();
    }
    const b = NH.buttons('Reserver').filter(outsideRows).find((b) => !NH.disabled(b));
    if (b) return b.click();
    if (NH.buttons('Fjern fra reservation').filter(outsideRows).length) return tilKurven();
    NH.toast('Ingen Reserver-knap her');
  }

  // ---------- Tasterne ----------
  const TRAEK = { KeyL: laaner, KeyM: materiale, KeyN: materiale, KeyB: katalog, KeyR: reserver };
  let busy = false, swallowEnter = false;
  const swallow = (e) => {
    if (!swallowEnter || e.key !== 'Enter') return;
    e.preventDefault();
    e.stopImmediatePropagation();
    if (e.type === 'keyup') swallowEnter = false;
  };
  addEventListener('keypress', swallow, true);
  addEventListener('keyup', swallow, true);
  addEventListener('keydown', (e) => {
    if (e.repeat || !e.ctrlKey || e.altKey || e.metaKey || NH.chooserOpen()) return;
    if (!e.shiftKey && e.key === 'Enter' && NH.cfg.ctrlEnter) {
      if (ctrlEnter()) { e.preventDefault(); e.stopImmediatePropagation(); swallowEnter = true; }
      return;
    }
    const f = e.shiftKey && NH.cfg.traek && TRAEK[e.code];
    if (!f) return;
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;
    busy = true;
    NH.hideBoxes();
    Promise.resolve(f()).catch(() => NH.toast('Noget gik galt')).finally(() => { busy = false; });
  }, true);

  // ---------- Ctrl+Shift holdt nede: vis hvad der tages med ----------
  let showing = false;
  function preview(on) {
    if (!on || !NH.cfg.traek || NH.chooserOpen()) { if (showing) { showing = false; NH.hideBoxes(); } return; }
    const marked = NH.markedRows();
    const rows = marked.length ? marked : [NH.mouse.x >= 0 && NH.rowAt(NH.mouse.x, NH.mouse.y)].filter(Boolean);
    showing = true;
    NH.showBoxes(rows.map((r) => r.getBoundingClientRect()));
  }
  NH.onTick(({ ev }) => preview(ev && ev.ctrlKey && ev.shiftKey && !ev.altKey));
  addEventListener('keydown', (e) => {
    if ((e.key === 'Shift' || e.key === 'Control') && e.ctrlKey && e.shiftKey && !e.altKey) preview(true);
  }, true);
  addEventListener('keyup', (e) => { if (e.key === 'Shift' || e.key === 'Control') preview(false); }, true);
  addEventListener('blur', () => preview(false));

})();
