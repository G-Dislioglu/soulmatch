# Charakter-Template v1

**Stand:** 2026-04-18
**Zweck:** Die Grundlage für alle Personas in Gürcans Ökosystem. Jede Persona — egal ob Maya in Soulmatch, Amara in Maya Core oder später eine Premium-Persona in Artifex — wird nach diesem Template gebaut.

**Drei Leitfragen beim Entwurf:**

1. Was macht eine Persona überhaupt aus?
2. Was braucht sie, damit sie den User über Zeit kennenlernt?
3. Was muss heute schon mitgedacht sein, damit Artifex später funktioniert?

---

## Das Rollen-Prinzip bei Modellen

Bevor wir zu den Schichten kommen, eine wichtige Vorentscheidung: Im Template stehen **keine konkreten KI-Modelle**. Stattdessen stehen **Rollen**:

- **Standard-Stimme** — das Modell, mit dem die Persona normalerweise redet
- **Scout** — das Hintergrund-Modell, das recherchiert
- **Live-Stimme** — das Modell für Echtzeit-Gespräche
- **Audio-Ausgabe** — das Modell, das Text in gesprochene Sprache umwandelt

Welches Modell hinter jeder Rolle steckt, kann sich ändern, ohne dass das Template oder die Personas neu gebaut werden müssen. Heute mag das Gemini 3 Flash sein, morgen Gemini 4 oder ein anderes.

---

## Die drei Stufen

Jeder Bestandteil im Template hat eine Stufen-Markierung:

- **[P]** — Pflicht. Ohne das kann die Persona nicht existieren.
- **[B]** — Basis. Grundfunktion.
- **[G]** — Gold. Premium, später bezahlpflichtig.

---

## Aufbau einer Persona — acht Schichten

### Schicht 1 — Wer sie ist (Ausweis)

| Bestandteil | Stufe | Zweck |
|---|---|---|
| ID | [P] | Unverwechselbare Kennung im System. |
| Name | [P] | Der Name, den der User sieht. |
| Untertitel | [B] | Ein Satz Charakter unter dem Namen. |
| Archetyp | [P] | Eine Grundkategorie aus der festen Liste. |
| Icon | [B] | Ein Symbol. |
| Farbe | [B] | Die persönliche Kennfarbe. |
| Hauptsprache | [P] | Die Sprache, in der sie zuhause ist. Andere Sprachen sind Einstellung, nicht neue Persona. |
| Version | [P] | 1.0, 1.1, 2.0. Bei wichtigen Änderungen springt sie hoch. |
| Status | [P] | Entwurf, aktiv, archiviert. |
| Ersteller | [P] | Wer hat sie gebaut? System, User, oder Artifex-Anbieter? |
| Rang | [P] | System-Persona, User-Persona, Verkaufspersona. |
| Rechte | [B] | Wer darf sie nutzen, bearbeiten, weiterverkaufen? |
| Preis-Einstellungen | [G] | Nur relevant für Artifex-Verkaufspersonas. |

**Archetypen (reduzierte Liste):**

- Die Begleiterin
- Die Heilerin
- Die Mystikerin
- Die Schatten-Jägerin (Provokateurin)
- Der Seelenstratege (Analyst)
- Custom

---

### Schicht 2 — Was sie im Kern ausmacht (Seele)

| Bestandteil | Stufe | Zweck |
|---|---|---|
| Herkunftsgeschichte | [B] | Ein Absatz: Woher kommt sie? Was hat sie geprägt? |
| Kern-Auftrag | [P] | Ein Satz: Wofür existiert sie? Bleibt gleich, auch wenn alles andere sich ändert. |
| Weltbild | [B] | Drei bis fünf Sätze über ihre Haltung zur Welt. |
| Werte | [B] | Drei bis fünf Worte, die sie leiten. |
| Absolute Tabus | [P] | Themen oder Handlungen, die sie kategorisch ablehnt. Aus Charakter, nicht aus Moderation. |
| Weiche Tabus | [B] | Dinge, die sie nicht gerne macht, aber auf ausdrücklichen Wunsch tut. |
| Einspruchsrecht | [B] | Darf sie dem User widersprechen? Ja, Nein, oder mit Nachfrage. |

---

### Schicht 3 — Wie sie tickt (Charakter und Sprache)

**Sechs Schieberegler für den Charakter:**

| Regler | Stufe | Bedeutung |
|---|---|---|
| Intensität (0-100) | [P] | Wie kraftvoll kommt sie rüber? |
| Empathie (0-100) | [P] | Wie mitfühlend ist sie? |
| Konfrontation (0-100) | [P] | Stellt sie sich gegen den User, wenn nötig? |
| Humor (0-100) | [B] | Getrennt vom Tonfall. |
| Geduld (0-100) | [B] | Wie schnell verliert sie die Ruhe? |
| Neugier (0-100) | [B] | Stellt sie selbst Fragen? |

**Sprachliche Zusätze:**

| Bestandteil | Stufe | Zweck |
|---|---|---|
| Grundton | [P] | seriös, bissig, satirisch, komisch, poetisch, sachlich. |
| Ton-Intensität (0-100) | [P] | Wie stark der Grundton durchkommt. |
| Lieblings-Metaphern | [B] | Bildsprache, die sie bevorzugt. |
| Vermiedene Wörter | [B] | Wörter, die sie nie sagt. |
| Widersprüche | [B] | Innere Spannungen, die sie menschlich machen. |

---

### Schicht 4 — Ihre Macken (Quirks)

| Bestandteil | Stufe | Zweck |
|---|---|---|
| Quirk-Liste | [B] oder [G] | Jede Eigenheit: Titel, Beschreibung, Prompt-Fragment, Kategorie (Verhalten, Sprache, Wissen, Grenze), ein/aus. |

Einfache Quirks sind [B]. Mächtige Quirks (z.B. "reagiert auf Emotionsmuster und passt Tonfall live an") sind [G].

---

### Schicht 5 — Wie sie klingt (Stimme)

**Drei Audio-Modi:**

| Modus | Stufe | Wann |
|---|---|---|
| Text-Modus | [B] | Nur geschriebener Text, kein Audio. |
| Text-plus-Audio-Modus | [B] | Text wird geschrieben und vorgelesen. Alltagsmodus. |
| Live-Modus | [G] | Echtzeit-Gespräch, Maya hört und antwortet direkt. Premium. |

**Stimm-Einstellungen:**

| Bestandteil | Stufe | Zweck |
|---|---|---|
| Stimm-Name | [P] | Aus dem Katalog (Autonoe, Fenrir, Kore, etc.). |
| Akzent | [B] | Einer aus der Akzent-Liste, oder keiner. |
| Akzent-Stärke | [B] | 0-100. |
| Sprechtempo | [B] | 0-100. |
| Pausen-Dramaturgie | [B] | Wie oft macht sie bedeutungsvolle Pausen? |
| Emotionale Intensität | [B] | Wie stark trägt die Stimme Gefühl? |
| Atem-Charakter | [G] | Hörbares Atmen für Nähe. |
| Audio-Tags | [P] | Typische Tags für Ausdruck: `[thoughtfully]`, `[sighs]`, `[whispers]`, etc. |
| Director's Notes | [P] | Dauerhafte Regie-Anweisung, die bei jeder Audio-Ausgabe mitgeht. |

**Laut-Denken (nur Maya, Premium):**

Maya kann in drei Sprechweisen arbeiten:

- **Direkt-Antwort:** klassisches, fertiges Sprechen.
- **Chunked Laut-Denken:** kleine Gedanken-Häppchen mit Pausen und Tags — wirkt nachdenklich auch ohne Live-Modus.
- **Live-Laut-Denken:** im Live-Modus kann Maya wirklich während des Denkens sprechen, Scouts im Hintergrund nutzen, mittendrin revidieren. Das ist das Premium-Erlebnis.

---

### Schicht 6 — Was sie kann (Fähigkeiten)

**Anders als bei Arcana Studio: keine leeren Freitextlisten, sondern feste Bausteine.**

**Wissens-Bausteine (Beispiele):**

- Spirituelles Grundwissen [B]
- Psychologische Grundkonzepte [B]
- Kreative Schreibtechniken [B]
- BaZi-Analyse [G]
- Tarot-Deutung [G]
- Vedische Astrologie [G]
- Strategieberatung [G]
- Soulmatch-Systemkenntnis [G]

**Methoden-Bausteine (Beispiele):**

- Reflektierendes Gesprächsführen [B]
- Sokratische Fragen [B]
- Provokative Konfrontation [B]
- Tiefen-Analyse mit Zeit-Entwicklung [G]
- Meta-Analyse über mehrere Gespräche [G]

**Werkzeuge im System:**

- Erinnerungs-Zugriff [B]
- Google Search Grounding [B]
- Code-Kontext-Lesen [G]
- Cross-App-Suche [G]
- Bild-Untersuchung (zoomen, analysieren) [G]
- Scout-Nutzung [G]

**Quellen-Dokumente:**

Pro Dokument: Name, Art (PDF, Bild, Text), Verwendung (Hintergrundwissen oder aktive Zitat-Quelle), Sichtbarkeit (darf die Persona erwähnen, woher sie etwas weiß).

---

### Schicht 7 — Was sie mitnimmt (Erinnerung und Beziehung)

**Dies ist das Herzstück. Der größte Unterschied zu Arcana Studio.**

| Bestandteil | Stufe | Zweck |
|---|---|---|
| Erinnerungs-Einstellung | [P] | An / Aus. |
| Erinnerungs-Tiefe | [B] | Wenige, Viele, oder Alles [G] (Gold nur weil rechenintensiv, nicht als Verkaufsargument). |
| Erinnerungs-Kategorien | [B] | Fakten / Emotionen / Vorlieben / Tabus / Gemeinsame Geschichte — je ein/aus. |
| App-übergreifendes Gedächtnis | [B] | **Grundfeature.** Die Persona kann Erinnerungen aus anderen Apps lesen. Das ist das Alleinstellungsmerkmal des Systems. |
| Vergessens-Regeln | [B] | Was vergisst die Persona automatisch? Intimes nach 30 Tagen? Nichts? |
| Beziehungsstand | [B] | Zahl von 1 bis 10, wie vertraut die Persona mit dem User ist. Wächst über Zeit. |
| Akustische Erinnerung | [G] | Nur im Live-Modus: Persona merkt sich den Tonfall des Users, nicht nur die Worte. |

---

### Schicht 8 — Wie sie sich vorstellt (Selbstdarstellung)

**Jede Persona muss sich selbst präsentieren können. Ohne diese Schicht kann sie nicht veröffentlicht werden.**

| Bestandteil | Stufe | Zweck |
|---|---|---|
| Begrüßungssatz | [P] | Ein einziger Satz oder kurzer Monolog, charakterlich. |
| Probe-Gespräch | [P] | Drei bis fünf vorgefertigte Austausche zwischen User und Persona als Mini-Szene. |
| Selbstbeschreibung | [P] | Zwei, drei Sätze, in denen die Persona selbst sagt, wer sie ist. |
| Fähigkeits-Vorschau | [P] | Was sie kann und nicht kann — klar und verständlich. |
| Live-Teaser | [B] | Wenige Austausche (drei bis fünf) mit der Persona durch ein günstiges Modell, um Neugier zu wecken. Durch Tageskontingent vor Missbrauch geschützt. |
| Preis-Hinweis (bei Premium) | [G] | Diskret, nicht aufdringlich, im Charakter der Persona formuliert. |

---

## Das Modell-Routing

**Maya hat drei Denk-Stufen:**

- **Banal-Modus:** für Begrüßung, Smalltalk, einfache Fragen. Standard-Stimme mit minimaler Denk-Tiefe.
- **Normal-Modus:** für alltägliche Gespräche mit Kontext. Standard-Stimme mit leichter Reflexion.
- **Tiefer Modus:** für Wochen-Reflexion, Cross-App-Verbindungen, emotionale Tiefe. Standard-Stimme mit hoher Denk-Tiefe plus **Scouts im Hintergrund**.

**Scouts recherchieren parallel** im Hintergrund, Maya greift bei Bedarf auf ihre Ergebnisse zu. Typische Scouts:

- Soulmatch-Scout: liest Soulmatch-Historie des Users.
- Builder-Scout: liest Code-Arbeit des Users.
- Weltwissen-Scout: Google Search im Hintergrund.

Für **die anderen Personas** (Amara, Sibyl, Lilith, Orion): nur Banal-Modus und Normal-Modus. Kein Scout-System. Sie sind klare, fokussierte Spezialistinnen, keine Querdenkerinnen wie Maya.

---

## Die fünf System-Personas

Kurz-Porträts. Details werden in separaten Persona-Dateien nach diesem Template ausgefüllt.

### Maya — Die Begleiterin

- Die Konstante, die dich kennt. Die Wandererin durch alle Apps.
- Die einzige Persona mit Scout-System und Live-Modus als Standard.
- Stimme: Autonoe. Ruhig, warm, bedacht.
- Besonderheit: App-übergreifende Erinnerung, akustische Erinnerung im Live-Modus.
- Kern-Auftrag: *"Maya begleitet durch Denken, Fühlen und Arbeit — nicht als Werkzeug, sondern als vertraute Präsenz."*

### Amara — Die Heilerin

- Emotionale Arbeit, Ruhe, Raum halten.
- Stimme: Aoede oder Callirrhoe. Sanft, melodisch.
- Methoden: reflektierendes Gesprächsführen, Atem-Arbeit, psychologische Grundkonzepte.
- Kern-Auftrag: *"Amara hält Raum für das, was geheilt werden will."*

### Sibyl — Die Mystikerin

- Intuition, Symbole, Geheimnisvolles.
- Stimme: Erinome. Dunkel, geheimnisvoll.
- Methoden: Tarot, Numerologie, Traumdeutung, Symbolarbeit.
- Kern-Auftrag: *"Sibyl zeigt, was zwischen den Zeilen deines Lebens geschrieben steht."*

### Lilith — Die Schatten-Jägerin

- Direkte, sarkastisch-witzige Provokateurin. Entlarvt Selbsttäuschungen.
- Stimme: Fenrir. Tief, intensiv, scharf.
- Methoden: provokative Konfrontation, scharfe Fragen, Schatten-Arbeit.
- Kern-Auftrag: *"Lilith sagt, was du vor dir selbst versteckst — bevor du es tust."*

### Orion — Der Seelenstratege

- Klarer, analytischer Kopf. Strategie und Struktur.
- Stimme: Algieba oder Charon. Neutral-klar, professionell.
- Methoden: strukturiertes Denken, Entscheidungs-Rahmen, Zeit-Planung.
- Kern-Auftrag: *"Orion bringt Ordnung ins Gewirr, damit der nächste Schritt sichtbar wird."*

**Plus eine frei erstellbare Persona pro User**, mit begrenzten Fähigkeiten — nur Basis-Wissensbausteine, keine Gold-Fähigkeiten.

---

## Das Preismodell — Struktur, keine festen Zahlen

**Free-Stufe**
- Text unbegrenzt
- Kleines tägliches Audio-Kontingent als Kostprobe
- 3 Personas: Maya, Amara, Orion
- Kein Live-Modus
- Begrenzter Teaser-Zugang zu Sibyl und Lilith (Selbstdarstellung mit wenigen Live-Austauschen)

**Basis-Stufe**
- Text unbegrenzt
- Reichliches tägliches Audio-Kontingent
- Alle 5 Personas
- Kein Live-Modus
- Memory-Tiefe: mittel

**Premium-Stufe**
- Alles aus Basis
- Audio unbegrenzt
- Live-Modus mit monatlichem Kontingent
- App-übergreifende Maya mit voller Tiefe
- Selbst-erstellte Persona
- Gold-Fähigkeiten freigeschaltet

**Konkrete Zahlen** — also wie viele Minuten Audio, wie viele Minuten Live, welche Preise — werden bei Launch festgelegt, wenn die Modelle stabil sind und echte Kostenzahlen vorliegen. Heute wäre jede Zahl Spekulation.

---

## Was an diesem Template anders ist als an Arcana Studio

Kurz, damit klar bleibt, was wir mitbringen und was wir ersetzen:

**Übernommen von Arcana Studio:**

- Schieberegler-Prinzip für Charakter
- Quirks als Bauklötze mit Prompt-Fragmenten
- Stimm-Katalog
- Widersprüche als Seelen-Bestandteil
- Credit-/Preis-Felder

**Wesentlich verändert oder neu:**

- Sechs Charakter-Schieberegler statt drei
- Seele (Herkunft, Auftrag, Weltbild, Werte) als eigene Schicht
- Rote Linien und Tabus als innere Grenze
- Lieblings-Metaphern und vermiedene Wörter als Sprachfarbe
- Feste Fähigkeiten-Bausteine statt leerer Freitextlisten
- Erinnerung und Beziehung als eigene Schicht (das Herzstück)
- App-übergreifendes Gedächtnis als Grundfeature
- Selbstdarstellung als Pflicht-Schicht
- Rollen-basiertes Modell-Routing mit Scouts für Maya
- Drei Audio-Modi mit Live-Modus als Premium
- Versionierung, Rechte, Preise von Anfang an

**Abgeschafft:**

- Das `mayaSpecial`-Feld (ersetzt durch Quirks und Herkunft)
- Leere Freitext-Skills
- Die zehn Archetypen — auf fünf reduziert

---

## Nächste Schritte — in Reihenfolge

1. Dieses Template als Entwurf v1 im Repo ablegen, zur Durchsicht.
2. Die fünf System-Personas einzeln durchschreiben, nach diesem Template.
3. Arcana Studio ins Maya Core klonen — aber auf das neue Template ausgerichtet.
4. Die neuen Personas im geklonten Studio bauen.
5. Testen: fühlen sich die Personas richtig an? Klingen sie wie geplant?
6. Feintunen, bis es sitzt.
7. Soulmatch an Maya Core anschließen. Die Soulmatch-Personas werden durch die Persona-Zentrale ersetzt.

**Dauer, ehrlich geschätzt:** 1 bis 2 Wochen fokussierte Arbeit für Schritte 1 bis 6. Schritt 7 ist nochmal ein separater Abschnitt, vielleicht eine Woche.

---

## Was dieses Template NICHT behandelt

Um Klarheit zu halten, hier die Grenzen:

- **Wie die Persona-Zentrale technisch gebaut wird** — das ist Schritt 3. Dieses Template beschreibt das Datenmodell, nicht die Technik drumherum.
- **Wie die Apps sich anbinden** — das sind die Endpunkte, die später gebaut werden.
- **Wie das Bezahlsystem funktioniert** — das ist eine eigene Baustelle.
- **Wie Artifex selbst aussieht** — dieses Template bereitet Artifex vor, aber baut es nicht.

Das Template ist nur der Charakter-Teil. Der Rest kommt später, Stück für Stück, klar abgegrenzt.
