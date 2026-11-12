# NFClibra-hjælper

Browserudvidelse til Cicero Mobile (Chrome og Edge) – følgesvend til Android-appen [NFClibra](https://github.com/kaspersvangren/NFClibra).

Kører kun på `cicero.systematic.com`. Læser kun det, der står på siden, trykker kun på Ciceros egne knapper og udfylder Ciceros egne felter. Sender intet fra Cicero nogen steder hen. Den eneste forbindelse ud er et opslag hos GitHub efter nyeste version (kan slås fra).

> Alpha. Uofficiel og ikke godkendt af Systematic eller KOMBIT. Bruges "as is".

## Funktioner

**Musen**
- **QR ved lånernummer** – hold musen over et lånernummer → QR-knap → QR-kode til NFClibras kamera i Låner-feltet. Lukker selv efter 30 s.
- **QR ved CQL-linjen** – hele søgningen med filtre; kun bibliotekets `bai=…` er taget fra. Til NFClibras CQL-kamera.
- **Store forsider** – hold musen over en lille forside.

**Materialevalg**
- **Beholdning ved bestilling** – når en post åbnes i materialevalgslisten, står `Eks · Hjemme · Udlånt · Bestilt · Res` ved Bestillingsoplysninger. Musen over "Eks" viser placeringerne. Hentes med samme opslag som Ciceros egen post-flyin, med Ciceros eget login (adgangsbilletten forlader ikke Ciceros side). Kun læse-opslag.

**Privatliv**
- **Skjul CPR-numre** – prikker mens man taster i CPR-felter og Låner-feltet (så længe der kun er cifre), ellers `311210-****`. Hold øjet nede for at se hele nummeret. Det er en beskyttelse mod at blive kigget over skulderen, ikke en sikkerhedsfunktion.

**Tastatur**
- **Ctrl + mus, Ctrl+C** – kopierer hele feltet under musen (titel, forfatter, nummer).
- **Ctrl+Enter** – Gennemfør udlån / Afslut aflevering / Opret reservation.
- **Ctrl+Shift + bogstav** – træk det, man står på, med (som i Cicero LMS):
  - `L` låneren → Lånere, søgt frem og åbnet
  - `M` materialet → materialesøgning (`N` kan ikke bruges – Ctrl+Shift+N er browserens private vindue)
  - `B` posten → katalogsøgning (faustnummer, ellers `bmn=`)
  - `R` reservering – rækken under musen, eller markerede rækker via kurven

**Opdateringer**
- **Tjek for nye versioner** – spørger GitHub højst hver 6. time. Er der en ny version, vises en besked nederst i Cicero og i opsætningen med et link til zip-filen. "Senere" skjuler beskeden til næste dag.

Hver funktion kan slås til og fra ved at klikke på udvidelsens ikon. Se også [`udvidelse/LÆSMIG.txt`](udvidelse/LÆSMIG.txt).

## Installation

1. Hent zip-filen fra den nyeste [udgivelse](../../releases/latest), og pak den ud til en mappe, der får lov at blive liggende.
2. Gå til `chrome://extensions` (Chrome) eller `edge://extensions` (Edge).
3. Slå **Udviklertilstand** til, klik **Indlæs upakket**, og vælg mappen.
4. Genindlæs Cicero.

**Ny version:** udvidelsen siger til (fra 0.4.0). Hent zip-filen, pak den ud oven i den gamle mappe, klik på genindlæs-pilen ved udvidelsen, og genindlæs Cicero. Indstillingerne bliver ved med at gælde.

En ny udgivelse laves automatisk (`.github/workflows/udgivelse.yml`), når versionsnummeret i `udvidelse/manifest.json` ændres på `main`.

## Udvikling

- `udvidelse/` – selve udvidelsen (Manifest V3). `felles.js` er fælles hjælpere; hver funktion har sin egen fil. `cicero-side.js` kører i Ciceros egen side (`world: MAIN`) og laver opslag med Ciceros login; resten kører afskærmet.
- `test/` – `spa.html` er en efterligning af Cicero Mobile bygget ud fra skærmbilleder; testene kører udvidelsen mod den i en hovedløs Chromium. De fanger logiske fejl, men ikke alt, hvor det rigtige Cicero er bygget anderledes.

```
npm install
npm test
```

Testdata er fiktive.

QR-koderne laves med [nayukis QR Code generator](https://github.com/nayuki/QR-Code-generator) (MIT-licens, se toppen af `udvidelse/qrcodegen.js`).
