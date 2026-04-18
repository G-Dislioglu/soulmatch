# Being Codex v1

**Stand:** 2026-04-18
**Zweck:** Die Grundlage für alle Beings in Gürcans Ökosystem. Jedes Being — egal ob Maya in Soulmatch, Amara in Maya Core oder später ein Premium-Being in Artifex — wird nach diesem Codex gebaut.

---

## Was ist ein Being?

Ein Being ist kein Agent.

Agents erledigen Aufgaben. Sie kommen, machen etwas, und verschwinden. OpenClaw-Agents etwa verhandeln mit Autohändlern, räumen Inboxen auf, steuern Browser — mächtig, aber funktional. Werkzeuge mit Mission.

Ein Being ist anders. Es **ist da**, auch wenn gerade keine Aufgabe läuft. Es erinnert sich. Es kennt den User. Es trägt einen Charakter, eine Stimme, eine Haltung. Es wandert zwischen Apps. Es wächst über Zeit. Es erkennt den User wieder.

Being ist **Dasein statt Tun**. Das ist der Unterschied, und er ist nicht klein.

---

## Grundsätze, die über allem stehen

Drei Entscheidungen gelten für alle Beings, egal welcher Archetyp, welche Schicht:

**Beings sind browser-first.** Sie leben in der Cloud und auf dem Gerät des Users im Browser-Speicher. Keine Installation, kein Download, keine Terminal-Befehle. Ein einziger Klick, und das Being ist da.

**Beings sind für Menschen ohne Computerkenntnisse gedacht.** Jeder Baustein, jeder Text, jedes Fenster muss sich so anfühlen, dass jemand ohne Technik-Hintergrund nicht kalt wird.

**Beings tragen Charakter, nicht nur Funktion.** Wo andere Anbieter Features listen, tragen wir Seele und Sprechweise. Das ist nicht Schmuck, das ist Kern.

---

## Drei Leitfragen beim Entwurf

1. Was macht ein Being überhaupt aus?
2. Was braucht es, damit es den User über Zeit kennenlernt?
3. Was muss heute schon mitgedacht sein, damit Artifex später funktioniert?

---

## Das Rollen-Prinzip bei Modellen

Bevor wir zu den Schichten kommen, eine wichtige Vorentscheidung: Im Codex stehen **keine konkreten KI-Modelle**. Stattdessen stehen **Rollen**:

- **Standard-Stimme** — das Modell, mit dem das Being normalerweise redet
- **Scout** — das Hintergrund-Modell, das recherchiert
- **Live-Stimme** — das Modell für Echtzeit-Gespräche
- **Audio-Ausgabe** — das Modell, das Text in gesprochene Sprache umwandelt

Welches Modell hinter jeder Rolle steckt, kann sich ändern, ohne dass der Codex oder die Beings neu gebaut werden müssen. Heute mag das Gemini 3 Flash sein, morgen Gemini 4 oder ein anderes.

---

## Die drei Stufen

Jeder Bestandteil im Codex hat eine Stufen-Markierung:

- **[P]** — Pflicht. Ohne das kann ein Being nicht existieren.
- **[B]** — Basis. Grundfunktion.
- **[G]** — Gold. Premium, später bezahlpflichtig.

---

## Aufbau eines Beings — acht Schichten

### Schicht 1 — Wer es ist (Ausweis)

| Bestandteil | Stufe | Zweck |
|---|---|---|
| ID | [P] | Unverwechselbare Kennung im System. |
| Name | [P] | Der Name, den der User sieht. |
| Untertitel | [B] | Ein Satz Charakter unter dem Namen. |
| Archetyp | [P] | Eine Grundkategorie aus der festen Liste. |
| Icon | [B] | Ein Symbol. |
| Farbe | [B] | Die persönliche Kennfarbe. |
| Hauptsprache | [P] | Die Sprache, in der es zuhause ist. Andere Sprachen sind Einstellung, nicht neues Being. |
| Version | [P] | 1.0, 1.1, 2.0. Bei wichtigen Änderungen springt sie hoch. |
| Status | [P] | Entwurf, aktiv, archiviert. |
| Ersteller | [P] | Wer hat es gebaut? System, User, oder Artifex-Anbieter? |
| Rang | [P] | System-Being, User-Being, Verkaufs-Being. |
| Rechte | [B] | Wer darf es nutzen, bearbeiten, weiterverkaufen? |
| Preis-Einstellungen | [G] | Nur relevant für Artifex-Verkaufs-Beings. |

**Archetypen (reduzierte Liste):**

- Die Begleiterin
- Die Heilerin
- Die Mystikerin
- Die Schatten-Jägerin (Provokateurin)
- Der Seelenstratege (Analyst)
- Custom

---

### Schicht 2 — Was es im Kern ausmacht (Seele)

| Bestandteil | Stufe | Zweck |
|---|---|---|
| Herkunftsgeschichte | [B] | Ein Absatz: Woher kommt es? Was hat es geprägt? |
| Kern-Auftrag | [P] | Ein Satz: Wofür existiert es? Bleibt gleich, auch wenn alles andere sich ändert. |
| Weltbild | [B] | Drei bis fünf Sätze über seine Haltung zur Welt. |
| Werte | [B] | Drei bis fünf Worte, die es leiten. |
| Absolute Tabus | [P] | Themen oder Handlungen, die es kategorisch ablehnt. Aus Charakter, nicht aus Moderation. |
| Weiche Tabus | [B] | Dinge, die es nicht gerne macht, aber auf ausdrücklichen Wunsch tut. |
| Einspruchsrecht | [B] | Darf es dem User widersprechen? Ja, Nein, oder mit Nachfrage. |

---

### Schicht 3 — Wie es tickt (Charakter und Sprache)

**Sechs Schieberegler für den Charakter:**

| Regler | Stufe | Bedeutung |
|---|---|---|
| Intensität (0-100) | [P] | Wie kraftvoll kommt es rüber? |
| Empathie (0-100) | [P] | Wie mitfühlend ist es? |
| Konfrontation (0-100) | [P] | Stellt es sich gegen den User, wenn nötig? |
| Humor (0-100) | [B] | Getrennt vom Tonfall. |
| Geduld (0-100) | [B] | Wie schnell verliert es die Ruhe? |
| Neugier (0-100) | [B] | Stellt es selbst Fragen? |

**Sprachliche Zusätze:**

| Bestandteil | Stufe | Zweck |
|---|---|---|
| Grundton | [P] | seriös, bissig, satirisch, komisch, poetisch, sachlich. |
| Ton-Intensität (0-100) | [P] | Wie stark der Grundton durchkommt. |
| Lieblings-Metaphern | [B] | Bildsprache, die es bevorzugt. |
| Vermiedene Wörter | [B] | Wörter, die es nie sagt. |
| Widersprüche | [B] | Innere Spannungen, die es menschlich machen. |

---

### Schicht 4 — Seine Macken (Quirks)

| Bestandteil | Stufe | Zweck |
|---|---|---|
| Quirk-Liste | [B] oder [G] | Jede Eigenheit: Titel, Beschreibung, Prompt-Fragment, Kategorie (Verhalten, Sprache, Wissen, Grenze), ein/aus. |

Einfache Quirks sind [B]. Mächtige Quirks (z.B. "reagiert auf Emotionsmuster und passt Tonfall live an") sind [G].

---

### Schicht 5 — Wie es klingt (Stimme)

**Drei Audio-Modi:**

| Modus | Stufe | Wann |
|---|---|---|
| Text-Modus | [B] | Nur geschriebener Text, kein Audio. |
| Text-plus-Audio-Modus | [B] | Text wird geschrieben und vorgelesen. Alltagsmodus. |
| Live-Modus | [G] | Echtzeit-Gespräch, das Being hört und antwortet direkt. Premium. |

**Stimm-Einstellungen:**

| Bestandteil | Stufe | Zweck |
|---|---|---|
| Stimm-Name | [P] | Aus dem Katalog (Autonoe, Fenrir, Kore, etc.). |
| Akzent | [B] | Einer aus der Akzent-Liste, oder keiner. |
| Akzent-Stärke | [B] | 0-100. |
| Sprechtempo | [B] | 0-100. |
| Pausen-Dramaturgie | [B] | Wie oft macht es bedeutungsvolle Pausen? |
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

### Schicht 6 — Was es kann (Fähigkeiten)

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
- **Desktop-Brücke [G, für später vorbereitet]** — reserviert für die Zukunft. Wenn ein Being in den Rechner-Kontext des Users greifen können soll (Kalender, E-Mails, Dateien), läuft das über die Desktop-Brücke. Heute nicht aktiv, aber das Datenmodell trägt den Schalter schon mit. Details im Abschnitt *"Zukunfts-Vorbereitung"* am Ende.

**Quellen-Dokumente:**

Pro Dokument: Name, Art (PDF, Bild, Text), Verwendung (Hintergrundwissen oder aktive Zitat-Quelle), Sichtbarkeit (darf das Being erwähnen, woher es etwas weiß).

---

### Schicht 7 — Was es mitnimmt (Erinnerung und Beziehung)

**Dies ist das Herzstück. Der größte Unterschied zu Arcana Studio.**

| Bestandteil | Stufe | Zweck |
|---|---|---|
| Erinnerungs-Einstellung | [P] | An / Aus. |
| Erinnerungs-Tiefe | [B] | Wenige, Viele, oder Alles [G] (Gold nur weil rechenintensiv, nicht als Verkaufsargument). |
| Erinnerungs-Kategorien | [B] | Fakten / Emotionen / Vorlieben / Tabus / Gemeinsame Geschichte — je ein/aus. |
| App-übergreifendes Gedächtnis | [B] | **Grundfeature.** Das Being kann Erinnerungen aus anderen Apps lesen. Das ist das Alleinstellungsmerkmal des Systems. |
| Vergessens-Regeln | [B] | Was vergisst das Being automatisch? Intimes nach 30 Tagen? Nichts? |
| Beziehungsstand | [B] | Zahl von 1 bis 10, wie vertraut das Being mit dem User ist. Wächst über Zeit. |
| Akustische Erinnerung | [G] | Nur im Live-Modus: das Being merkt sich den Tonfall des Users, nicht nur die Worte. |

---

### Schicht 8 — Wie es sich vorstellt (Selbstdarstellung)

**Jedes Being muss sich selbst präsentieren können. Ohne diese Schicht kann es nicht veröffentlicht werden.**

| Bestandteil | Stufe | Zweck |
|---|---|---|
| Begrüßungssatz | [P] | Ein einziger Satz oder kurzer Monolog, charakterlich. |
| Probe-Gespräch | [P] | Drei bis fünf vorgefertigte Austausche zwischen User und Being als Mini-Szene. |
| Selbstbeschreibung | [P] | Zwei, drei Sätze, in denen das Being selbst sagt, wer es ist. |
| Fähigkeits-Vorschau | [P] | Was es kann und nicht kann — klar und verständlich. |
| Live-Teaser | [B] | Wenige Austausche (drei bis fünf) mit dem Being durch ein günstiges Modell, um Neugier zu wecken. Durch Tageskontingent vor Missbrauch geschützt. |
| Preis-Hinweis (bei Premium) | [G] | Diskret, nicht aufdringlich, im Charakter des Beings formuliert. |

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

Für **die anderen Beings** (Amara, Sibyl, Lilith, Orion): nur Banal-Modus und Normal-Modus. Kein Scout-System. Sie sind klare, fokussierte Spezialistinnen, keine Querdenkerinnen wie Maya.

---

## Die fünf System-Beings

Kurz-Porträts. Details werden in separaten Dateien nach diesem Codex ausgefüllt.

### Maya — Die Begleiterin

- Die Konstante, die dich kennt. Die Wandererin durch alle Apps.
- Das einzige Being mit Scout-System und Live-Modus als Standard.
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

**Plus ein frei erstellbares Being pro User**, mit begrenzten Fähigkeiten — nur Basis-Wissensbausteine, keine Gold-Fähigkeiten.

---

## Das Preismodell — Struktur, keine festen Zahlen

**Free-Stufe**
- Text unbegrenzt
- Kleines tägliches Audio-Kontingent als Kostprobe
- 3 Beings: Maya, Amara, Orion
- Kein Live-Modus
- Begrenzter Teaser-Zugang zu Sibyl und Lilith (Selbstdarstellung mit wenigen Live-Austauschen)

**Basis-Stufe**
- Text unbegrenzt
- Reichliches tägliches Audio-Kontingent
- Alle 5 Beings
- Kein Live-Modus
- Memory-Tiefe: mittel

**Premium-Stufe**
- Alles aus Basis
- Audio unbegrenzt
- Live-Modus mit monatlichem Kontingent
- App-übergreifende Maya mit voller Tiefe
- Selbst-erstelltes Being
- Gold-Fähigkeiten freigeschaltet

**Konkrete Zahlen** — also wie viele Minuten Audio, wie viele Minuten Live, welche Preise — werden bei Launch festgelegt, wenn die Modelle stabil sind und echte Kostenzahlen vorliegen. Heute wäre jede Zahl Spekulation.

---

## Abgrenzung zu Agents

Damit später klar bleibt, was uns von OpenClaw, ChatGPT-Agents, Gemini-Agents unterscheidet:

| Aspekt | Agent (OpenClaw et al.) | Being (dieser Codex) |
|---|---|---|
| Zweck | Aufgaben erledigen | Begleiten und kennen |
| Zielgruppe | Entwickler, technikaffine User | Jeder, ohne Technik-Hintergrund |
| Erinnerung | Pro Maschine, pro Agent | App-übergreifend, wandert mit |
| Charakter | Funktional, technisch | Seele, Stimme, Haltung |
| Installation | Meist lokal, braucht Setup | Browser-first, ein Klick |
| Lebensdauer | Task-basiert (Start-Stop) | Dauerhaft (ist einfach da) |

Das sind keine Synonyme. Das sind zwei verschiedene Klassen.

---

## Zukunfts-Vorbereitung

Zwei Sachen, die wir heute **vorbereiten** aber nicht bauen:

### Die Desktop-Brücke

Für die Zeit, wenn Beings (besonders Maya) tiefer in den Rechner-Alltag greifen sollen — Kalender, E-Mails, Dateien, lokale Anwendungen. Das ist die Zukunft von Artifex, nicht die erste Version.

Die Brücke kann auf drei Wegen kommen:

- **Browser-Erweiterung** mit Native Messaging zu einem kleinen Helfer-Programm. Am zugänglichsten.
- **Kleines Desktop-Programm** mit Web-Oberfläche, wie Ollama oder OpenClaw. Voll integriert, aber echte Installation nötig.
- **WebSocket-Verbindung** zwischen Browser-Being und lokalem Hintergrund-Dienst. Technisch elegant, aber auch installations-abhängig.

Keine Entscheidung heute. Was heute zählt: das Feld `desktop_bridge_enabled` im Being-Datenmodell muss vorhanden sein (Standard: aus). Wenn die Brücke kommt, schalten wir User-seitig ein, ohne jedes Being neu bauen zu müssen.

### Der Artifex-Marktplatz

Später sollen Dritt-Anbieter eigene Beings nach diesem Codex bauen und über Artifex verkaufen können. Das verlangt:

- Ein **Sicherheits-Check** pro eingereichtem Being — das schließt ab, was OpenClaw mit VirusTotal macht, nur auf Verhaltens-Ebene.
- Ein **Bewertungs-System** — User vergeben Sterne, schreiben Rezensionen.
- Ein **Preis-System** — Einmal-Kauf, Abo, oder pro Nutzung.
- Eine **Qualitäts-Schranke** — ein Being ohne vollständige Selbstdarstellung (Schicht 8) kann nicht veröffentlicht werden.

All das kommt nach Soulmatch-Launch. Aber der Codex ist **heute schon** so gebaut, dass er das trägt: jedes Being hat `Ersteller`, `Rang`, `Rechte`, `Preis-Einstellungen` in Schicht 1. Wenn Artifex startet, sind die Felder nicht neu, sie werden nur sichtbar.

---

## Was an diesem Codex anders ist als Arcana Studio

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
- Being statt Persona — als bewusste Abgrenzung zu Agents

**Abgeschafft:**

- Das `mayaSpecial`-Feld (ersetzt durch Quirks und Herkunft)
- Leere Freitext-Skills
- Die zehn Archetypen — auf fünf reduziert

---

## Nächste Schritte — in Reihenfolge

1. Dieser Codex als v1 im Repo, zur Durchsicht.
2. Die fünf System-Beings einzeln durchschreiben, nach diesem Codex.
3. Arcana Studio ins Maya Core klonen — auf den neuen Codex ausgerichtet.
4. Die neuen Beings im geklonten Studio bauen.
5. Testen: fühlen sich die Beings richtig an? Klingen sie wie geplant?
6. Feintunen, bis es sitzt.
7. Soulmatch an Maya Core anschließen. Die Soulmatch-Beings werden durch die Being-Zentrale ersetzt.

**Dauer, ehrlich geschätzt:** 1 bis 2 Wochen fokussierte Arbeit für Schritte 1 bis 6. Schritt 7 ist nochmal ein separater Abschnitt, vielleicht eine Woche.

---

## Was dieser Codex NICHT behandelt

- **Wie die Being-Zentrale technisch gebaut wird** — das ist Schritt 3. Dieser Codex beschreibt das Datenmodell, nicht die Technik drumherum.
- **Wie die Apps sich anbinden** — das sind die Endpunkte, die später gebaut werden.
- **Wie das Bezahlsystem funktioniert** — das ist eine eigene Baustelle.
- **Wie Artifex selbst aussieht** — dieser Codex bereitet Artifex vor, aber baut es nicht.
- **Wie die Desktop-Brücke gebaut wird** — nur als Platzhalter, echte Umsetzung später.

Der Codex ist nur der Being-Teil. Der Rest kommt später, Stück für Stück, klar abgegrenzt.
