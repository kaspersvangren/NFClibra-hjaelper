# Ændringer

## 0.5.1
- Beholdningen slutter ud for tabellens sidste kolonne ("Total") i stedet for helt ude ved panelets højre kant.

## 0.5.0
- Beholdning i bestillingspanelet under Materialevalg: når en post åbnes, vises "Beholdning" og `Eks · Hjemme · Udlånt · Bestilt · Res` ved Bestillingsoplysninger i Ciceros egen skrift. Musen over "Eks" viser placeringerne.
- Tallene hentes med det samme opslag, som Ciceros egen post-flyin bruger, og med Ciceros eget login. Adgangsbilletten bliver i Ciceros side; udvidelsen ser kun tallene.
- Egen kontakt i opsætningen (Materialevalg).

## 0.4.0
- Tjek for nye versioner: spørger GitHub højst hver 6. time og viser en besked nederst i Cicero og i opsætningen med et link til zip-filen. "Senere" skjuler den til næste dag; "Tjek nu" i opsætningen; kan slås fra. Det eneste, udvidelsen kontakter uden for Cicero, er GitHub.
- Denne version skal hentes i hånden; fra nu af siger udvidelsen selv til.

## 0.3.3
- Øjet ved CPR-felter sættes som en ekstra ikonknap til venstre for Ciceros ikoner (samme afstand, højde og farve), ud fra tekstfeltets kant og ikonområdet. Før ledte udvidelsen efter Ciceros ikoner og ramte den skjulte historik-pil (0.3.1) eller gav op pga. knappernes gennemsigtige berøringsfelt og satte øjet oven på et ikon (0.3.2). Testsiden er bygget efter Ciceros rigtige Låner-felt.

## 0.3.2
- Øjet ved CPR-felter placeres kun ud fra Ciceros synlige ikoner inde i feltets ramme (i 0.3.1 kunne det havne under feltet).

## 0.3.1
- Øjet har samme størrelse, højde, afstand og farve som Ciceros egne ikoner i feltet.

## 0.3.0
- Skjul CPR-numre: prikker mens man taster i CPR-felter og Låner-feltet, ellers `311210-****`; øjet viser hele nummeret, så længe det holdes nede. Ctrl+C kopierer hele nummeret, beskeden viser det skjult. Egen kontakt i opsætningen.

## 0.2.2
- QR-koden til CQL indeholder hele søgningen med filtre (før kun det, der stod i adressen); kun `bai=…` fjernes.

## 0.2.1
- Ctrl+C: markeringen kommer, så snart Ctrl trykkes; feltoverskrifter på egen linje kommer ikke med.
- `B` søger faust uden kode (`142694336`), materialenumre med `bmn=`.
- `R` på et materiale, der allerede ligger i kurven, går til reservering; markerede rækker kommer med, selv om der ligger noget i kurven i forvejen.
- `L`, `M`, `B` tjekker, at feltet er udfyldt, før der søges.
- `L` søger på navn, når kun navnet står i rækken; åbner kun en låner, der hedder præcis det samme.
- Lånere-siden genkendes, selv om Cicero sender videre til en længere adresse; udvidelsen genindlæser aldrig Cicero selv.
- Ctrl+Enter i et felt åbner ikke samtidig feltets egen søgning.

## 0.2.0
- Opsætning via udvidelsens ikon, én kontakt pr. funktion.
- Ctrl + mus + C: kopiér hele feltet.
- Ctrl+Enter: Gennemfør udlån / Afslut aflevering / Opret reservation.
- Ctrl+Shift+L/M/B/R: træk låner, materiale, post eller reservering med, med vælger når der er flere muligheder.

## 0.1.0
- QR-kode ved lånernummer og CQL-linjen, store forsider ved mouse-over.
