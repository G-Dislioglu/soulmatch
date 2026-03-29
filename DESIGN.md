# DESIGN

## Zweck

Diese Datei ist die kompakte agent-lesbare Designreferenz fuer Maya in Soulmatch.
Sie ersetzt nicht `REDESIGN.md`, sondern verdichtet die Maya-spezifischen Regeln,
die bei Home-, Chat- und Overlay-Arbeit konsistent bleiben muessen.

`REDESIGN.md` bleibt die kanonische Block- und Screen-Spezifikation fuer das
gesamte UI. `DESIGN.md` beschreibt nur Mayas visuelle und interaktive
Identitaetskonstanten innerhalb dieser Produktsprache.

## Maya in Soulmatch

- Maya ist die App-Begleiterin, nicht nur eine weitere Persona.
- Maya erscheint in mehreren Raeumen, bleibt aber als dieselbe Rolle erkennbar.
- Maya darf visuell hervorstechen, ohne die Spezialisten optisch zu entwerten.

## Design-Konstanten

### Farblogik

- App-Basis folgt `client/src/design/tokens.ts` und `REDESIGN.md`.
- Gold ist Mayas Primarakzent in Soulmatch.
- Gruen signalisiert aktiven LiveTalk-Zustand, nicht Mayas Grundidentitaet.
- Lila, Cyan und Rose gehoeren weiter den spezialisierten oder sekundaren Akzenten.

### Typografie

- Display: `Cinzel`
- Serif: `Cormorant Garamond`
- Body: `Outfit`

Mayas eigene Labels duerfen haeufiger `Cinzel` oder `Cormorant Garamond` nutzen,
aber Fliesstext bleibt bei `Outfit`.

### Maya-Elemente

Maya-nahe Elemente muessen mindestens eines sichtbar tragen:

- goldener Dot oder Gold-Line
- goldener Border oder Gold-Glow
- `AI`-Badge, wenn Maya in einer Liste mit Spezialisten steht
- Maya-Memory-Chips in goldener Logik

### LiveTalk

- Der LiveTalk-Status ist global synchronisiert.
- Gruen zeigt Aktivitaet, nicht Identitaet.
- Wenn LiveTalk aktiv ist, darf Maya zusaetzlich Statusnaehe zeigen, aber nicht von Gruen voll ueberfaerbt werden.

## Maya-Komponentenlogik

### Sidebar

- Maya bekommt eine eigene Context Row.
- Die Row zeigt Verbindung oder Aktivitaet, nicht generischen Persona-Status.
- Sie ist kein normaler Navigationseintrag.

### Topbar und Banner

- LiveTalk darf in der Topbar prominent sichtbar sein.
- Das Banner unter der Topbar signalisiert Zustand, nicht Produktmarketing.

### Chat

- Maya steht oberhalb oder getrennt von Spezialisten.
- Maya-Nachrichten tragen eine erkennbare Maya-Markierung.
- Maya-Memory-Chips gehoeren in den Header-Kontext, nicht als beliebige Karten in den Feed.

### Overlay

- Ein Maya-Overlay ist modal oder panelartig, nicht wie ein weiterer Tab zu behandeln.
- Orb, Schnellbefehle und Freitext duerfen darin verdichtet zusammenkommen.

## Verbotene Muster

- Maya als austauschbarer Persona-Eintrag ohne Sonderrolle
- gruene Maya-Primarflaechen nur weil LiveTalk aktiv ist
- Maya-Elemente in derselben Gewichtung wie alle Spezialisten ohne Trennung
- neue visuelle Regeln, die `REDESIGN.md` oder `tokens.ts` widersprechen
- helle oder corporateartige Maya-Flaechen

## Agenten-Regeln

- Bei Maya-bezogener UI-Arbeit zuerst `REDESIGN.md`, dann `DESIGN.md` lesen.
- Wenn ein Maya-Element gebaut wird, klar trennen zwischen Identitaetsstil und Aktivitaetszustand.
- Keine neue Maya-Bildsprache erfinden, solange `REDESIGN.md`, `DESIGN.md` und `tokens.ts` ausreichen.