# REDESIGN.md — Soulmatch UI Neugestaltung v1.0

## Zweck

Diese Datei ist die kanonische Spezifikation fuer den vollstaendigen UI-Umbau von Soulmatch.
Sie ist die Single Source of Truth fuer Agent, Claude und Guercan.

Lies diese Datei zuerst, bevor du irgendeinen UI-Code anfasst.

Referenz-Prototypen lokal, nicht im Repo:

- `soulmatch-startseite-v2.html` — Startseite Referenz
- `soulmatch-chat-v4.html` — Chat-Tab Referenz inklusive LiveTalk und Persona Settings

---

## STATUS

| Phase | Inhalt | Status |
|---|---|---|
| Design | Startseite + Chat HTML-Prototypen | completed |
| Spec | Dieses Dokument | completed |
| Impl 1 | Design System (Tokens + CSS) | completed |
| Impl 2 | Layout-Komponenten (Sidebar, Topbar) | completed |
| Impl 3 | LiveTalk State Management | completed |
| Impl 4 | Startseite | completed |
| Impl 5 | Chat-Tab | completed |
| Impl 6 | Weitere Tabs | completed |

---

## 1. DESIGN SYSTEM

### 1.1 Farben

Verbindlich — aus `client/src/design/tokens.ts` uebernehmen.

```ts
// Hintergruende
bg: '#08060e'
bg2: '#0d0a1a'
bg3: '#13102a'
card: 'rgba(18,14,32,0.97)'
card2: 'rgba(22,17,42,0.95)'

// Borders — drei Staerken
b1: 'rgba(255,255,255,0.22)'
b2: 'rgba(255,255,255,0.14)'
b3: 'rgba(255,255,255,0.08)'

// Text
text: 'rgba(255,255,255,0.92)'
text2: 'rgba(255,255,255,0.55)'
text3: 'rgba(255,255,255,0.28)'

// Akzente
gold: '#d4af37'
gold-s: 'rgba(212,175,55,0.25)'
gold-g: 'rgba(212,175,55,0.10)'
green: '#4ade80'
green-s: 'rgba(74,222,128,0.25)'
purple: '#a78bfa'
cyan: '#22d3ee'
rose: '#f472b6'
```

### 1.2 Typographie

```txt
Display: Cinzel
Serif: Cormorant Garamond
Body: Outfit 300/400/500
```

### 1.3 Border-Regeln

```txt
Sidebar-Rand:          border-right: 2px solid b1
Topbar-Rand:           border-bottom: 2px solid b1
Sidebar-interne Trenn: border-bottom: 1.5px solid b1
Cards:                 border: 1.5px solid b2
Buttons:               border: 1.5px solid b1
Input-Wrap:            border: 1.5px solid b1
Messages:              border: 1.5px solid b2
```

Regel: Nie 0.5px an sichtbaren Elementen. Mindestens 1px.

### 1.4 Schatten

```txt
Sidebar:   box-shadow: 3px 0 30px rgba(0,0,0,0.6)
Topbar:    box-shadow: 0 2px 20px rgba(0,0,0,0.4)
Panels:    box-shadow: -4px 0 40px rgba(0,0,0,0.7)
Dropdowns: box-shadow: 0 8px 40px rgba(0,0,0,0.7)
```

### 1.5 Border-Radius

```txt
Cards / Panels: 18px
Buttons rund: 24px
Kleine Elemente: 10-12px
Pills / Chips: 20px
Avatar: 50%
```

---

## 2. LAYOUT-ARCHITEKTUR

```txt
SIDEBAR (248px, fixed) | MAIN (flex: 1)
Sidebar border-right: 2px b1
Topbar height: 58px, fixed
Topbar border-bottom: 2px b1
```

### 2.1 Sidebar-Aufbau

1. Logo
2. LiveTalk Button
3. Maya Context Row
4. Navigation
5. Profile Row

### 2.2 LiveTalk Button — Verhalten

Dieser Button ist der einzige Ein/Aus-Schalter fuer Sprach-Modus.

AUS-Zustand:

- Hintergrund: `rgba(255,255,255,0.05)`
- Border: `1.5px solid b1`
- Label: `LiveTalk`
- Sub-Label: `Klicken zum Aktivieren`
- Ring: grau

AN-Zustand:

- Hintergrund: `rgba(74,222,128,0.12)`
- Border: `1.5px solid rgba(74,222,128,0.55)`
- Box-Shadow: `0 0 24px rgba(74,222,128,0.15)`
- Label: `LiveTalk aktiv`
- Sub-Label: `Sprich oder schreib frei`
- Ring: `#4ade80` mit pulsierender Animation

Synchronisation:

- Sidebar- und Topbar-LiveTalk muessen denselben State schalten.

Nebenwirkungen bei Aktivierung:

- Banner unter Topbar erscheint gruen
- Mic-Button im Input wechselt zu Stop-Zustand
- Input-Placeholder wird auf LiveTalk gesetzt
- Input-Border wird gruen
- Maya Context Row zeigt `LiveTalk aktiv`

LiveTalk bedeutet:

- STT: User spricht zu Text
- TTS: KI-Antworten werden vorgelesen via Gemini TTS
- Tippen bleibt weiterhin moeglich

---

## 3. MAYA — SONDERROLLE

### 3.1 Status

Maya ist kein Persona-Eintrag wie die Spezialisten, sondern die App-Begleiterin.

### 3.2 UI-Differenzierung

Maya in der Sidebar:

- eigene Maya Context Row
- goldener Live-Dot
- Status zeigt Maya-Core-Verbindung

Maya im Chat-Tab:

- eigener Eintrag oben in der Persona-Liste
- visuell von Spezialisten getrennt
- goldener Rahmen und Glow
- `AI`-Badge
- Maya-Memory-Chips unter dem Chat-Header

Maya als Persona im Tarot-Modus:

- tritt als `Maya & Lilith` auf
- ist ein separater Modus

### 3.3 Maya Overlay

Wird ueber die Maya Context Row geoeffnet und enthaelt:

- Orb-Visualisierung mit Puls-Animation
- aktuelle Begruessung
- Schnellbefehle als Chips
- Freitext-Eingabe
- Hinweis auf Maya Core Gedaechtnis

### 3.4 Maya App-Steuerung

Nice-to-have nach MVP:

- Tabs oeffnen
- LiveTalk ein- oder ausschalten
- Stimme wechseln
- Personas aufrufen

---

## 4. CHAT-TAB SPEZIFIKATION

### 4.1 Layout

```txt
TOPBAR
  LiveTalk | Neue Session | Verlauf | Gear | Benachrichtigungen

[LiveTalk Banner]
[Maya Memory Chips]

Persona List (210px) | Chat Area
```

### 4.2 Persona-Eintraege

Maya:

- goldener Hintergrundtint
- `1.5px` Gold-Border
- Gold-Line oben
- Live-Dot und `AI`-Badge

Spezialisten:

- Standard transparent
- Hover und Active mit sichtbarem Border
- Gear-Icon bei Hover oder Active

### 4.3 Nachrichten

KI-Nachricht:

- `card2`
- `1.5px solid b2`
- links ausgerichtet

User-Nachricht:

- goldener Tint
- `1.5px solid rgba(212,175,55,0.28)`
- rechts ausgerichtet

Maya-Nachricht:

- `border-left: 2px solid gold`
- goldener Hintergrundtint

Seelenkarten in Nachrichten:

- goldener Tint
- Gold-Line oben
- eigener Speichern-Button

### 4.4 Persona Settings Panel

Slide-in von rechts, 520px breit.

Enthaelt pro Persona:

1. Signature Quirks
2. Charakter-Tuning
3. Ton-Modus
4. Stimme waehlen
5. Beispielantwort Preview
6. Maya Spezial-Funktion

Maya-spezifisch zusaetzlich:

1. Gemini TTS an/aus
2. Mikrofon an/aus
3. App-Steuerung an/aus
4. Proaktive Insights an/aus
5. Maya Core Sync an/aus
6. Stimme waehlen

### 4.5 Gear-Dropdown

Schnellzugriff fuer LiveTalk-Einstellungen:

- Mikrofon an/aus
- TTS an/aus
- Auto-Senden an/aus
- Stimme waehlen
- Maya-Hinweis

---

## 5. STARTSEITE SPEZIFIKATION

### 5.1 Grid-Layout

```txt
3 Spalten:
  1fr | 1fr | 320px

Row 1: Greeting Card volle Breite
Row 2: Tagesenergie | Profil/Score | Seelenkarten + Timeline
Row 3: Guides | Heute entdecken | rechte Spalte fortgesetzt
```

### 5.2 Greeting Card

- volle Breite
- Gold-Line oben
- Gold-Glow rechts
- Tageszeit und Datum
- Willkommenstext
- kosmischer Sub-Status
- Gold-CTA plus Ghost-Buttons

### 5.3 Profil/Score Card

- Gold-Border
- Score-Ring per SVG
- Score-Bars fuer Numerologie, Astrologie und Fusion
- Zodiac und Lebensweg

### 5.4 Guides

- 4-Spalten-Grid
- Persona als Chip mit Orb, Farbe und Hover-Border

---

## 6. IMPLEMENTIERUNGS-REIHENFOLGE

### Block 1 — Design System

Dateien:

- `client/src/design/tokens.ts`
- `client/src/index.css`

Was:

- alle CSS-Variablen aus Section 1 uebernehmen
- Border-Staerken als globale Klassen
- Button-Basis-Klassen
- Card-Basis-Klassen
- Animation-Keyframes: `pulse`, `up`, `ltPulse`, `micPulse`

### Block 2 — Layout-Komponenten

Dateien:

- `client/src/modules/M01_app-shell/`
- `client/src/app/App.tsx`

Komponenten:

- `Sidebar`
- `SidebarLogo`
- `LiveTalkButton`
- `MayaContextRow`
- `SidebarNav`
- `ProfileRow`
- `Topbar`

### Block 3 — LiveTalk State Management

Datei:

- `client/src/hooks/useLiveTalk.ts`

State:

- `liveTalkActive`
- `ttsEnabled`
- `micEnabled`
- `autoSend`
- `selectedVoice`

Actions:

- `toggleLiveTalk()`
- `toggleTTS()`
- `toggleMic()`
- `setVoice()`

### Block 4 — Startseite

Datei:

- `client/src/modules/M00_home/`

### Block 5 — Chat-Tab Umbau

Dateien:

- `client/src/modules/M06_discuss/ui/DiscussionChat.tsx`

Neue Komponenten:

- `ChatPersonaList`
- `MayaEntry`
- `PersonaDivider`
- `PersonaEntry`
- `ChatHeader`
- `MayaChips`
- `MessageFeed`
- `TypingIndicator`
- `SuggestionChips`
- `ChatInput`
- `PersonaSettingsPanel`
- `MayaOverlay`
- `GearDropdown`
- `LiveTalkBanner`

### Block 6 — Persona Settings

Datei:

- `client/src/modules/M06_discuss/ui/PersonaSettingsPanel.tsx`

---

## 7. TECHNISCHE CONSTRAINTS

### Was NICHT geaendert wird

- Routing: `wouter` und `activePage` bleiben
- State: `App.tsx` bleibt globaler Container
- Backend-Routen bleiben unveraendert
- Profile-Schema bleibt
- `/api/*`-Endpunkte bleiben
- Scoring-Formel bleibt in `server/src/shared/scoring.ts`

### Was NEU gebaut wird

- `client/src/modules/M00_home/`
- `client/src/hooks/useLiveTalk.ts`
- `client/src/modules/M06_discuss/ui/PersonaSettingsPanel.tsx`
- `client/src/modules/M06_discuss/ui/MayaOverlay.tsx`
- `client/src/modules/M06_discuss/ui/GearDropdown.tsx`
- `client/src/modules/M06_discuss/ui/LiveTalkBanner.tsx`

### TTS Provider

- Gemini TTS, nicht Chatterbox
- Stimmen: `Kore`, `Puck`, `Fenrir`, `Aoede`
- bestehender Pfad: `server/src/lib/ttsService.ts`

---

## 8. AGENT-REGELN

Vor jedem Block:

1. `STATE.md` lesen
2. `REDESIGN.md` lesen
3. Zerquetsch-Check formulieren

Nach jedem Block:

1. `cd client && pnpm typecheck`
2. `REDESIGN.md` Status-Tabelle aktualisieren
3. `STATE.md` next block aktualisieren

Niemals:

- Scoring-Logik anfassen
- Backend-Routen aendern
- mehr als 3 Dateien gleichzeitig aendern ohne Zusammenfassung
- Erfolg behaupten ohne gruenen Typecheck

---

## 9. OFFENE ENTSCHEIDUNGEN

| Frage | Status | Notiz |
|---|---|---|
| `M00_home` als neues Modul oder in `App.tsx`? | offen | Empfehlung: eigenes Modul |
| PersonaSettings in DB oder `localStorage`? | offen | Erstmal `localStorage` |
| Maya Overlay als Route oder Modal? | offen | Modal |
| LiveTalk State: Context oder Zustand? | offen | Custom Hook reicht |
| Welche Tabs nach Chat? | offen | Astro -> Match -> Seelen |