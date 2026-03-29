# Compression Check

## Zweck

Diese Datei ist die Methodenreferenz fuer Soulmatchs Zerquetsch-Disziplin.
Sie erklaert, wie aus diffusem Problemnebel ein enger, belastbarer Arbeitskern
geschnitten wird.

Die Kurzfassung fuer den Alltag bleibt in `AGENTS.md`. Diese Datei ist die
ausfuehrlichere Referenz, wenn ein Block unklar, hybrid oder scope-gefaehrdet ist.

## Grundprinzip

Ein Problem ist erst dann belastbar verstanden, wenn klar ist, was daran nicht
wegstreichbar ist.

Danach wird nicht sofort gebaut, sondern geprueft, wie der Kern auf eine kleine
Gegenbewegung reagiert.

## Modi

### crush

Nutzen:

- diffuse Aufgaben
- hybride Architekturfragen
- semantisch ueberladene Review-Bloecke
- Drift zwischen Code, Docs und Nutzerziel

Leitfrage:

`Was bleibt wahr, wenn ich fast alles andere wegstreiche?`

Output:

- ein harter Kern-Satz
- klarer Nicht-Scope

Warnsignal:

- wenn der Satz elegant, aber spannungsfrei klingt, wurde eher formuliert als zerquetscht

### press

Nutzen:

- wenn bereits ein brauchbarer Kern vorliegt
- wenn geprueft werden soll, ob der Kern operativ Hebel hat

Leitfrage:

`Welche kleinste Gegenoperation wuerde diesen Kern sichtbar angreifen?`

Output:

- Reaktionsklasse
- moegliche Interventionsflaeche

Regel:

- `press` nie als ersten Schritt verwenden

### provoke

Nutzen:

- UX-, Flow- und Friktionsprobleme
- sichtbare Failure-Modes
- Aufgaben mit realem Nutzerbruch statt abstrakter Architekturspannung

Leitfrage:

`Wenn das morgen 10x schlimmer wird, was geht konkret kaputt?`

Output:

- Bruchbild
- Schutzrichtung

Regel:

- Schutzrichtung ist nicht die Loesung, nur die Richtung

### remove

Nutzen:

- Ballastverdacht
- doppelte UI-Schichten
- Zusatzlogik ohne klaren Nutzereffekt

Leitfrage:

`Wenn wir das komplett entfernen, was verlieren wir real?`

Output:

- echter Verlust
- Keep/Drop-Tendenz

### relocate

Nutzen:

- wenn etwas am falschen Ort geloest wirkt
- State-vs-UI-, Prompt-vs-Runtime- oder Review-vs-Live-Flow-Spannung

Leitfrage:

`Ist das Problem falsch geloest, oder nur am falschen Ort geloest?`

Output:

- wahrscheinlicher Zielort
- Move/Keep-Tendenz

## Reaktionsklassen

### kippt

Die Gegenoperation trifft direkt den Hebel.

Folge:

- klein bauen
- schnell pruefen

### biegt

Es reagiert, erzeugt aber sofort einen neuen Widerstand.

Folge:

- Tradeoff sichtbar machen
- neuen Widerstand separat zerquetschen

### bleibt

Es passiert nichts Relevantes.

Folge:

- Kern, Modus oder Zugriffsstelle neu pruefen

### taeuscht

Es fuehlt sich nach Fortschritt an, aendert aber nichts Belastbares.

Folge:

- nicht ausbauen
- Aktivitaet stoppen statt kosmetisch weiterdrehen

## Soulmatch-Pruefformat

Wenn ein Block vor dem Bauen geprueft wird, dokumentiere mindestens:

- `mode`
- `core_sentence`
- `reaction_class`, falls ein Gegencheck gelaufen ist
- `direction`
- `why_not_more`

## Harte Regeln

- Kein Modus ist universell.
- `direction` ist nicht automatisch die Loesung.
- Sichtbare Aktivitaet ohne Nutzereffekt zaehlt nicht als Fortschritt.
- `taeuscht` nicht ausbauen.
- `bleibt` bedeutet: Kern oder Modus neu pruefen.
- Keine stillen Scope-Spruenge aus einer Diagnose ableiten.
- Nicht jede gute Diagnose rechtfertigt sofort einen Build-Schritt.
- Wenn zwei Pruefschritte hintereinander nur generische Saetze erzeugen: stoppen.

## Einsatz in Soulmatch

Besonders nuetzlich bei:

- UI-Redesign-Bloecken mit Breitenrefactor-Risiko
- Voice-/Audio-Ketten mit mehreren fragilen Naehten
- Persistenz- und Provider-Drift zwischen Code und Doku
- grossen Review- oder Audit-Aufgaben