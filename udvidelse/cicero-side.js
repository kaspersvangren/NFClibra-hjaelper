/*
 * Kører i Ciceros egen side (ikke i udvidelsens afskærmede del), så opslag kan bruge Ciceros eget login.
 *
 * Cicero sender sin adgangsbillet (Authorization: Bearer …) med hvert opslag til /FBS/rest/.
 * Her huskes den seneste billet i sidens hukommelse – den gemmes ikke, forlader aldrig siden
 * og bruges kun til læse-opslag hos Cicero selv, når udvidelsen beder om det.
 *
 * Udvidelsens øvrige del beder om beholdning for et faustnummer med en hændelse
 * og får kun tallene og placeringerne tilbage – aldrig billetten.
 */
(() => {
  'use strict';
  if (window.__nhCiceroSide) return;
  window.__nhCiceroSide = true;

  const X = XMLHttpRequest.prototype;
  const open = X.open, setHeader = X.setRequestHeader, send = X.send;
  let billet = null, agency = null;
  const ventere = [];

  const udloeb = (b) => {
    try {
      const p = JSON.parse(atob(b.split(' ')[1].split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      return p.exp ? p.exp * 1000 : Infinity;
    } catch (_) { return Infinity; } // ukendt form: brug den, og lad et evt. 401 afgøre det
  };
  const frisk = (b) => !!b && udloeb(b) - Date.now() > 15000;

  X.open = function (m, u) {
    try {
      this.__nhUrl = String(u);
      const a = this.__nhUrl.match(/\/FBS\/rest\/cloud\/(DK-\d+)\//);
      if (a) agency = a[1];
    } catch (_) {}
    return open.apply(this, arguments);
  };
  X.setRequestHeader = function (k, v) {
    try {
      if (!this.__nhEgen && /^authorization$/i.test(k) && /^Bearer\s/.test(v) && /\/FBS\/rest\//.test(this.__nhUrl || '')) {
        if (v !== billet) {
          billet = v;
          ventere.splice(0).forEach((f) => f());
        }
      }
    } catch (_) {}
    return setHeader.apply(this, arguments);
  };

  /** Venter på en billet, der ikke er ved at udløbe (Cicero laver selv nye, når den bruges) */
  function frisBillet(ms) {
    if (frisk(billet)) return Promise.resolve(billet);
    return new Promise((res) => {
      const t = setTimeout(() => res(frisk(billet) ? billet : null), ms);
      ventere.push(() => { if (frisk(billet)) { clearTimeout(t); res(billet); } });
    });
  }

  function post(url, body, auth) {
    return new Promise((res) => {
      const x = new XMLHttpRequest();
      x.__nhEgen = true;
      open.call(x, 'POST', url);
      setHeader.call(x, 'Accept', 'application/json, text/plain, */*');
      setHeader.call(x, 'Content-Type', 'application/json');
      setHeader.call(x, 'Authorization', auth);
      x.onload = () => res({ status: x.status, text: x.responseText });
      x.onerror = () => res({ status: 0, text: '' });
      send.call(x, JSON.stringify(body));
    });
  }

  async function beholdning(faust) {
    if (!agency) return { fejl: 'ukendt bibliotek' };
    for (let forsoeg = 0; forsoeg < 2; forsoeg++) {
      const auth = await frisBillet(forsoeg ? 10000 : 4000);
      if (!auth) return { fejl: 'intet login' };
      const r = await post(`/FBS/rest/cloud/${agency}/bibliographicrecord/bibliographicRecordDetails`,
        { bibliographicRecordId: { value: faust, externalValue: '' }, marc21: null, searchBranchIds: [] }, auth);
      if (r.status === 401 || r.status === 403) { if (billet === auth) billet = null; continue; }
      if (r.status !== 200) return { fejl: 'HTTP ' + r.status };
      try {
        const c = JSON.parse(r.text).bibliographicRecordCirculationInfo || {};
        return {
          eks: c.numberOfMaterials, hjemme: c.availableMaterials, udlaant: c.loanedMaterials,
          bestilt: c.orderedMaterials, res: c.reservedMaterials,
          placeringer: (c.placementInfos || []).map((p) => ({ placering: p.placement, eks: p.numberOfMaterials, udlaant: p.loanedMaterials })),
        };
      } catch (_) { return { fejl: 'uventet svar' }; }
    }
    return { fejl: 'intet login' };
  }

  window.addEventListener('nh-beholdning-hent', (e) => {
    let d;
    try { d = JSON.parse(e.detail); } catch (_) { return; }
    if (!d || !/^\d{6,12}$/.test(String(d.faust))) return;
    beholdning(String(d.faust)).then((svar) =>
      window.dispatchEvent(new CustomEvent('nh-beholdning-svar', { detail: JSON.stringify({ id: d.id, faust: d.faust, ...svar }) })));
  });
})();
