# SOULMATCH – Technisches Briefing (Teil 2 von 2)

> Abschnitte: State Management · Kern-Features · KI-Integration · Konfiguration & Environment
> Teil 1: Tech Stack · Datenbank-Schema · API-Endpunkte · Projektstruktur

---

## 5. STATE MANAGEMENT

### 5.1 Architektur

Kein dediziertes State-Management-Framework. Globaler State liegt in `App.tsx` via `useState`, wird per Props weitergegeben.

```
App.tsx (globaler State-Container)
  ├── profile: UserProfile | null
  ├── activePage: string
  ├── overlay: string | null
  ├── scoreResult: ScoreResult | null
  ├── matchResult: MatchResult | null
  ├── settings: AppSettings
  ├── cardSettings: CardSettings
  ├── sidebarOpen: boolean
  ├── highlightedCard: string | null   (Maya UI Commands)
  ├── expandedCard: string | null      (Maya UI Commands)
  ├── tourTarget: string | null        (Maya Tour)
  └── tourText: string | null          (Maya Tour)
```

### 5.2 State-Persistenz

| Variable | Typ | Persistenz |
|---|---|---|
| `profile` | `UserProfile \| null` | PostgreSQL + localStorage |
| `activePage` | `string` | Session only |
| `scoreResult` | `ScoreResult \| null` | Session only |
| `matchResult` | `MatchResult \| null` | Session only |
| `settings` | `AppSettings` | localStorage |
| `cardSettings` | `CardSettings` | localStorage |
| Chat-Verlauf | pro Persona | localStorage `soulmatch_chat_{persona}_{profileId}` |
| Timeline | Einträge | localStorage `soulmatch_timeline` |
| Soul Cards | Karten | localStorage `soulmatch_soul_cards` |
| User Memory | LLM-Kontext | localStorage `soulmatch_memory_{profileId}` |
| Lilith Intensität | string | localStorage `soulmatch_lilith_intensity` |
| Sensitivity Score | number | localStorage `soulmatch_sensitivity` |
| Toxicity Block | timestamp | localStorage `soulmatch_toxicity_block` |
| Letzte Persona | string | localStorage `soulmatch_last_persona` |

### 5.3 Datenfluss

```
Nutzer-Aktion
    │
    ├─► Lokale Berechnung (M03 Numerologie / M04 Astrologie)
    │       └── Ergebnis → App.setState(scoreResult)
    │
    ├─► fetch() → Express API → JSON Response → App.setState()
    │       ├── /api/scoring/calc  → scoreResult
    │       ├── /api/studio        → LLM turns/nextSteps
    │       └── /api/journey/...   → optimalDates
    │
    └─► localStorage direkt (chatHistory, timeline, soulCards, memory)
```

### 5.4 Caching

| Mechanismus | Ort | Details |
|---|---|---|
| Geo LRU-Cache | Server RAM | `geo.ts`, in-memory, begrenzte Größe |
| sweph-Instanz | Server RAM | `_swephCache` Variable, einmal geladen |
| Chat-Verlauf | localStorage | Max 100 Nachrichten pro Persona |
| Timeline | localStorage | Max 200 Einträge, FIFO |
| User Memory | localStorage | Max 50 Einträge pro Profil, FIFO |

> ⚠️ Kein HTTP-Caching (kein ETag, kein Cache-Control). Kein Redis. Kein Server-seitiger Cache außer Geo-LRU und sweph-Instanz.

---

## 6. KERN-FEATURES

### 6.1 Scoring-System

**Server:** `server/src/shared/scoring.ts` (Single Source of Truth)
**Client-Wrapper:** `client/src/modules/M06_scoring/`

#### Unified Score Formel

```
overall = round(0.40 * numerologyScore + 0.40 * astrologyScore + 0.20 * fusionScore)
```

#### Numerologie-Score (0–100)

Basiert auf: lifePath, expression, soulUrge, personality, birthday.

- **Master Number Bonus:** +5 Punkte wenn lifePath ∈ {11, 22, 33}
- **Karmic Adjustment:** Abzug bei Karmic Debt Numbers {13, 14, 16, 19}
- Reduktion auf 0–100 Skala

#### Astrologie-Score (0–100)

Basiert auf Zodiac-Zeichen von: sun, moon, rising, mercury, venus, mars.

- **Element-Kompatibilität:** Feuer/Luft = positiv, Erde/Wasser = positiv, Feuer/Wasser = negativ
- **Modalitäts-Kompatibilität:** Kardinal/Fix/Mutable Kombinationen bewertet
- **Gewichtung:** Sonne + Mond höher als andere Planeten

#### Fusion-Score (0–100)

Resonanz zwischen Lebensweg-Zahl und dominantem Element. Beziehungs-spezifische Gewichtungen (z.B. Venus-Aspekte für Romantik höher).

#### Claims

`calculateUnifiedScore()` gibt `claims: string[]` zurück – lesbare Begründungen für den Score, angezeigt als Report-Karten in der UI. Karten haben IDs `card-claim-0`, `card-claim-1`, ... (für Maya UI-Commands referenzierbar).

---

### 6.2 Matching Engine

**Client:** `client/src/modules/M11_match/`
**Server:** `server/src/routes/match.ts`

#### Match-Score Formel

```
matchScore = round(0.45 * numDiff + 0.45 * astroDiff + 0.10 * fusionDiff)
```

`*Diff` = Differenz-basierter Score zwischen zwei Profilen (kleine Differenz = hohe Kompatibilität).

- **Positive Claims** bei kleinen Differenzen: "Beide haben Lebensweg 3..."
- **Cautionary Claims** bei großen Differenzen: "Venus-Spannung könnte..."

Narrative Quality Gate (`applyNarrativeGate()`) prüft LLM-generierte Match-Erklärungen auf Qualität und fällt auf deterministischen Fallback zurück wenn nötig.

---

### 6.3 Astrologie-Engine (Client-seitig)

**Datei:** `client/src/modules/M04_astrology-adapter/lib/`

#### Berechnete Körper (12)

Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune, Pluto, Chiron, Black Moon Lilith

#### Algorithmen

```
Julian Day Berechnung
Ekliptik-Obliquität (Meeus)
JPL-Orbitalelemente Mercury–Pluto
Kepler-Gleichung (Newton-Raphson Solver)
Heliozentrisch XYZ → Geozentrische Länge
Mondlänge: Meeus Kap.47, 16 Terme (~0.3° Genauigkeit)
Black Moon Lilith: mittleres Mondapogäum, lineare Rate
Chiron: Näherungsweise Orbitalelemente
Retrogradenerkennung: tägliche Bewegungsprüfung
GMST → ASC/MC Berechnung
Häuser: Equal House + Whole Sign
Aspekte: Konjunktion/Opposition/Trigon/Quadrat/Sextil mit Orben
```

#### Genauigkeit

| Körper | Genauigkeit | Gültig |
|---|---|---|
| Sonne | ~0.01° | 1800–2050 |
| Mond | ~0.3° | 1800–2050 |
| Planeten | ~1–2° | 1800–2050 |

#### Engine-Metadaten

```typescript
// realEngine.ts
meta: { label: 'swiss_ephemeris', version: 'meeus-jpl-1.0' }
```

#### Geocoding (`geocode.ts`)

- ~100 Städte hardcodiert: Deutschland (30+), Österreich, Schweiz, Türkei (10+), Europa, Welt
- `birthToUT()` konvertiert Lokalzeit → UT mit Timezone-Offset + DST-Näherung
- Gibt `null` zurück wenn Stadt unbekannt → Häuser/ASC werden übersprungen, Warnungen ausgegeben

---

### 6.4 Numerologie (Client + Server)

**Client:** `client/src/modules/M03_numerology/`
**Server:** `server/src/routes/numerology.ts`

#### Berechnete Zahlen

| Zahl | Quelle | Beschreibung |
|---|---|---|
| Life Path | Geburtsdatum | Summe aller Ziffern, reduziert |
| Expression | Vollständiger Name | Pythagoräische Tabelle, alle Buchstaben |
| Soul Urge | Vokale des Namens | Innere Motivation |
| Personality | Konsonanten des Namens | Äußere Wirkung |
| Birthday | Geburtstag (1–31) | Reduziert auf 1–9 |

**Master Numbers:** 11, 22, 33 werden nicht weiter reduziert.

**Pythagoräische Tabelle:**

```
A=1 B=2 C=3 D=4 E=5 F=6 G=7 H=8 I=9
J=1 K=2 L=3 M=4 N=5 O=6 P=7 Q=8 R=9
S=1 T=2 U=3 V=4 W=5 X=6 Y=7 Z=8
```

---

### 6.5 Studio / Roundtable Chat

**Client:** `client/src/modules/M08_studio-chat/`
**Server:** `server/src/routes/studio.ts`, `server/src/studioPrompt.ts`

#### Personas

| Persona | Charakter | Besonderheit |
|---|---|---|
| Maya | Empathische Führerin | UI-Commands, Tour-Guide, Maya-Handoff bei Lilith-Distress |
| Luna | Intuitive Mondgöttin | Emotionale Tiefe |
| Orion | Rationaler Stratege | Analytisch |
| Lilith | Schatten-Jägerin | 3 Intensitätsstufen, Sensitivity-Tracking, Toxicity-Guard |

#### Roundtable-Modus

Alle 4 Personas antworten auf eine Frage. LLM-Output-Format (STUDIO_RESULT_SCHEMA):

```json
{
  "turns": [
    { "seat": "maya",   "text": "..." },
    { "seat": "luna",   "text": "..." },
    { "seat": "orion",  "text": "..." },
    { "seat": "lilith", "text": "..." }
  ],
  "nextSteps":  ["...", "..."],
  "watchOut":   "...",
  "anchorsUsed": ["zodiac:taurus", "lifePath:7"]
}
```

#### Solo-Chat-Modus

1-on-1 mit einer Persona. `soloPersona` Parameter aktiviert `buildSoloSystemPrompt()`.
Unterstützt `freeMode` (weniger Struktur-Constraints).

#### Chat-Komprimierung (3-Tier, PersonaSoloChat.tsx)

```
Ältere Nachrichten:  Nur Anzahl  "[12 frühere Nachrichten]"
Mittlere Nachrichten: 80 Zeichen pro Nachricht
Letzte Nachrichten:  280 Zeichen pro Nachricht
```

#### Schema Repair Retry

`studio.ts` implementiert einen Retry-Mechanismus: Wenn das LLM kein valides JSON zurückgibt, wird ein zweiter Aufruf mit explizitem Schema-Repair-Prompt gemacht.

---

### 6.6 Lilith Safety System

**Dateien:** `sensitivityTracker.ts`, `toxicityGuard.ts`, `lilithGate.ts`

#### Sensitivity Tracker

```
Score: 0–100 (Startwert 50)

Distress-Muster:    -12 Punkte  (z.B. "ich will nicht mehr", "alles sinnlos")
Engagement-Muster:  +5 Punkte   (z.B. "interessant", "erzähl mir mehr")
Natürliche Erholung: +1 pro Nachricht

Auto-Downgrade:
  brutal  → ehrlich  wenn Score < 40
  ehrlich → mild     wenn Score < 20
  Maya-Handoff:      wenn Score < 15 → "Maya hier – lass uns das glätten"
```

#### Toxicity Guard (3 Severity-Level)

```
mild:     Warnung anzeigen
moderate: Strike vergeben
severe:   Sofortiger Strike

Strike-Eskalation (userMemory.ts):
  Strike 1: 24h Ban
  Strike 2: 1 Woche Ban
  Strike 3+: Permanent Ban

Gilt für ALLE Personas (nicht nur Lilith).
Regex-Muster für Deutsch + Englisch.
```

#### Lilith Intensitäten

| Level | Beschreibung |
|---|---|
| `mild` | Sanfte Konfrontation, psychologisch sicher |
| `ehrlich` | Direkte Wahrheit, keine Beschönigung |
| `brutal` | Schonungslose Ehrlichkeit, Schattenseiten |

---

### 6.7 User Memory System

**Datei:** `client/src/modules/M08_studio-chat/lib/userMemory.ts`

```typescript
interface MemoryEntry {
  type:      'theme' | 'insight' | 'preference' | 'boundary' | 'milestone';
  content:   string;
  timestamp: number;
  persona:   string;
}

interface StrikeRecord {
  count:     number;
  lastStrike: number;   // timestamp
  banUntil?: number;    // timestamp, undefined = permanent
}

interface UserMemoryStore {
  profileId: string;
  entries:   MemoryEntry[];   // max 50, FIFO
  strikes:   StrikeRecord[];
}
```

- `buildMemoryContext()` erstellt kompakten String (~2000 Zeichen) für LLM-Injektion
- `getBanStatus()` prüft permanente + zeitlich begrenzte Bans
- `insightExtractor.ts`: 15 Themen-Muster (DE+EN), 6 Sentiment-Muster, max 2 Insights pro Austausch
- `checkMilestone()` erkennt: first-chat, deep-chat (20+ Nachrichten)

---

### 6.8 Maya UI Command System

**Dateien:** `commandParser.ts`, `commandBus.ts`

#### 8 Command-Typen

```typescript
type MayaCommandType =
  | 'navigate'       // Zu einer App-Seite navigieren
  | 'highlight'      // Karte 2.2s hervorheben (CSS-Animation)
  | 'expand'         // Karte auf-/zuklappen
  | 'suggest'        // Action-Buttons anzeigen
  | 'persona_switch' // Zu anderer Persona wechseln
  | 'scroll_to'      // Zu Element scrollen
  | 'truth_mode'     // Truth-Mode aktivieren
  | 'tour_start';    // Geführte Tour starten
```

#### Command-Format im LLM-Output

```
<<<{"type":"navigate","target":"scoring"}>>>
<<<{"type":"highlight","cardId":"card-claim-0"}>>>
```

#### Regeln (in System-Prompt)

- Max 2 Commands pro Antwort
- `navigate` und `tour_start` immer mit Nutzer-Bestätigung
- Commands werden sequentiell mit 400ms Delay ausgeführt (commandBus.ts)

---

### 6.9 Soul Cards System

**Dateien:** `client/src/modules/M13_timeline/lib/soulCardService.ts`, `CrossingModal.tsx`

#### Soul Card Struktur

```typescript
interface SoulCard {
  id:        string;
  title:     string;
  content:   string;
  symbol:    string;           // Emoji/Symbol
  persona:   string;           // Welche Persona hat sie erstellt
  profileId: string;
  createdAt: number;
  crossings: CrossingResult[]; // Ergebnisse von Kreuzungen
  source:    'chat' | 'oracle' | 'crossing';
}
```

#### Erstellungs-Flow

```
1. LLM bettet <<<SOUL_CARD>>>...<<<END_CARD>>> Block in Antwort ein
2. parseSoulCard() extrahiert den Block client-seitig (commandParser.ts)
3. Nutzer bestätigt oder verwirft (UI: "Speichern" / "Verwerfen")
4. Bei Bestätigung → soulCardService.ts speichert in localStorage
```

#### Crossing (Kreuzung zweier Karten)

```
1. Nutzer wählt 2 Soul Cards in CrossingModal.tsx
2. LLM (via generateStudio()) generiert Synthese
3. Neue Soul Card mit source: 'crossing' wird erstellt
4. Animiertes Merge-UI mit Spinning-Symbol (CSS keyframes)
```

---

### 6.10 Journey Planner

**Server:** `server/src/routes/journey.ts`
**Client:** `client/src/modules/M07_journey/`

#### Event-Typen (10)

```
travel | new_project | job_change | relationship | move
health | financial | creative | learning | spiritual
```

#### Planeten-Gewichtungen (pro eventType)

```
Index:        [SUN, MOON, MERCURY, VENUS, MARS, JUPITER, SATURN]
travel:       [ 1,   2,     3,      1,    1,     3,      -1]
new_project:  [ 2,   1,     2,      1,    3,     2,       1]
relationship: [ 1,   3,     1,      3,    1,     2,      -1]
financial:    [ 2,   1,     2,      2,    1,     3,       2]
spiritual:    [ 2,   3,     1,      2,   -1,     3,       1]
```

#### Aspekte (Orben)

```
Konjunktion: ±8°, Harmonie 0.5
Sextil:      ±4°, Harmonie 0.8
Quadrat:     ±7°, Harmonie -0.6
Trigon:      ±8°, Harmonie 1.0
Opposition:  ±8°, Harmonie -0.4
```

#### Score-Berechnung pro Tag

```
Basis: 50
+ Mondphasen-Bonus (je nach eventType)
+ Σ (Aspekt-Harmonie × Planeten-Gewicht × Faktor) für jeden Planeten
+ Wochentag-Bonus (Do=+3 für travel/new_project/financial, Fr=+3 für relationship/creative)
Clamp: 0–100

Rating:
  ≥75: excellent
  ≥60: good
  ≥45: moderate
  <45: challenging
```

#### Fallback (ohne sweph)

`calculateFallback()` verwendet:
- Deterministischen Mondphasen-Zyklus (Referenz: 2000-01-06 Neumond, 29.53 Tage)
- Näherungsweise Sonnen-Länge (Kepler 1. Ordnung)
- Mittlere Planetenlongituden (lineare Näherung)

---

### 6.11 Timeline Sidebar (M13)

**Datei:** `client/src/modules/M13_timeline/`

#### Timeline Entry-Typen (8)

```typescript
type EntryType =
  | 'score'        // Score-Berechnung
  | 'chat_maya'    // Maya Chat-Session
  | 'chat_lilith'  // Lilith Chat-Session
  | 'chat_luna'    // Luna Chat-Session
  | 'chat_orion'   // Orion Chat-Session
  | 'insight'      // Extrahierter Insight
  | 'crossing'     // Soul Card Kreuzung
  | 'soul_card';   // Soul Card erstellt
```

#### Sidebar-Layout

```
Position: fixed left, 280px breit
Mobile (<768px): transforms off-screen, Backdrop-Overlay

Inhalt (von oben nach unten):
  1. Header (Logo/Titel)
  2. MayaRecap Session-Karte (slide-down Animation)
  3. Timeline-Einträge (staggered fade-in)
  4. Soul Cards Sektion
  5. Settings-Link
```

#### Auto-Erstellung von Timeline-Einträgen

- **Score-Berechnung** → `App.tsx` erstellt Eintrag automatisch
- **Chat-Session schließen** → `PersonaSoloChat.tsx` erstellt Eintrag (wenn ≥2 neue Nachrichten)

---

## 7. KI-INTEGRATION

### 7.1 Provider-Übersicht

| Provider | API-Basis-URL | Standard-Modell | Structured Output |
|---|---|---|---|
| OpenAI | `https://api.openai.com/v1` | `gpt-4o-mini` | `response_format: { type: "json_schema" }` |
| DeepSeek | `https://api.deepseek.com/v1` | `deepseek-chat` | `response_format: { type: "json_object" }` |
| xAI (Grok) | `https://api.x.ai/v1` | `grok-beta` | Kein natives JSON-Schema; Fallback auf Text-Parsing |

### 7.2 API-Key-Handling

```
Priorität (höchste zuerst):
  1. client-seitig übergeben (Request-Body: apiKey)
  2. Server-Umgebungsvariable (OPENAI_API_KEY / DEEPSEEK_API_KEY / XAI_API_KEY)

Wenn kein Key verfügbar → HTTP 400 "no_api_key"
```

Der Client kann eigene API-Keys in den Einstellungen (M09) hinterlegen. Diese werden in `localStorage` (`soulmatch_settings`) gespeichert und bei jedem Studio-Aufruf mitgesendet.

### 7.3 Prompt-Architektur

**Datei:** `server/src/studioPrompt.ts`

#### `buildSystemPrompt(options)` — Roundtable

Baut den System-Prompt für den 4-Personas-Roundtable. Enthält:
- Persona-Definitionen (Maya, Luna, Orion, Lilith) mit Charakter, Sprachstil, Regeln
- Lilith-Intensitätsstufe (mild/ehrlich/brutal)
- Psych-Safety-Regeln
- JSON-Output-Format-Anweisung (STUDIO_RESULT_SCHEMA)
- DATA ANCHOR Instruktionen (renderAnchorInstructionBlock)

#### `buildSoloSystemPrompt(persona, options)` — Solo-Chat

Baut System-Prompt für 1-on-1 Persona-Chat. Enthält zusätzlich:
- UI-Command-Instruktionen (8 Command-Typen mit Format-Dokumentation)
- Soul Card Generierungs-Instruktionen (`<<<SOUL_CARD>>>` Block-Format)
- `freeMode`-Flag (weniger Struktur-Constraints)
- Persona-spezifische Regeln

#### `buildUserPrompt(options)` — User-Nachricht

Konstruiert den User-Turn für den LLM. Enthält:
- Profil-Daten (Name, Geburtsdatum, Numerologie-Zahlen, Astrologie-Zeichen)
- Match-Daten (wenn Match-Modus aktiv)
- Komprimierter Chat-Verlauf (3-Tier)
- User Memory Kontext (`buildMemoryContext()` Output, ~2000 Zeichen)
- Eigentliche Nutzer-Nachricht

#### `buildOraclePrompt(question, profile)` — Oracle

Spezieller Prompt für Oracle-Fragen. Fokus auf mystische, tiefe Antwort.

#### `buildCrossingPrompt(card1, card2, profile)` — Soul Card Kreuzung

Prompt für die Synthese zweier Soul Cards zu einer neuen Karte.

### 7.4 DATA ANCHORS System

**Datei:** `server/src/lib/studioAnchors.ts`

```typescript
interface StudioAnchor {
  key:   string;   // z.B. "zodiac", "lifePath", "score"
  value: string;   // z.B. "taurus", "7", "82"
}
```

`buildStudioAnchors()` extrahiert Schlüsselwörter aus:
- Profil-/Match-Excerpts (Zodiac-Zeichen, Lebensweg-Zahlen, Scores)
- Nutzer-Nachrichten

`renderAnchorInstructionBlock()` formatiert Anchors als Instruktions-Block für den System-Prompt. Das LLM wird angewiesen, diese Anchors zu verwenden und in `anchorsUsed` zu berichten.

### 7.5 Narrative Quality Gate

**Datei:** `server/src/lib/studioQuality.ts`

`applyNarrativeGate(result, anchors)` prüft LLM-Antworten auf:

```
1. Valide Persona-Seats (turns müssen maya/luna/orion/lilith enthalten)
2. Narrative-Qualität (Mindest-Textlänge pro Turn)
3. Korrekte DATA ANCHOR Nutzung (anchorsUsed muss befüllte Anchors referenzieren)
4. nextSteps und watchOut nicht leer
```

Bei Fehlschlag → deterministischer Fallback-Narrative wird angewendet (kein LLM-Fehler nach außen sichtbar).

### 7.6 LLM-Aufruf-Flow (studio.ts)

```
POST /api/studio
    │
    ├── 1. API-Key auflösen (client → server env)
    ├── 2. Provider bestimmen (openai / deepseek / xai)
    ├── 3. buildSystemPrompt() + buildUserPrompt()
    ├── 4. DATA ANCHORS bauen (buildStudioAnchors)
    ├── 5. LLM-Aufruf (fetch → Provider-API)
    │       ├── OpenAI: response_format json_schema
    │       ├── DeepSeek: response_format json_object
    │       └── xAI: Text-Response → JSON.parse()
    ├── 6. JSON-Parsing
    │       └── Bei Fehler → Schema Repair Retry (2. LLM-Aufruf)
    ├── 7. applyNarrativeGate() (Quality Control)
    └── 8. Response senden
```

### 7.7 Token-Limits

| Endpunkt | Standard maxTokens | Anmerkung |
|---|---|---|
| `/api/studio` (Roundtable) | 1500 | Konfigurierbar per Request |
| `/api/studio` (Solo) | 800 | Konfigurierbar per Request |
| `/api/studio/portrait` | 600 | – |
| `/api/studio/weekly` | 500 | – |
| `/api/studio/monthly` | 700 | – |
| `/api/guide` | 400 | Konfigurierbar per Request |

> ⚠️ Genaue Default-Werte pro Endpunkt sind in `studio.ts` definiert. Obige Werte sind Näherungen aus dem Code-Review.

### 7.8 Streaming

> ⚠️ Kein Streaming implementiert. Alle LLM-Aufrufe sind synchrone Request/Response-Zyklen. Der Client wartet auf die vollständige Antwort.

### 7.9 CardMayaChat (`/api/guide`)

Leichtgewichtiger LLM-Endpunkt für die "Maya fragen"-Funktion auf Score-Report-Karten (`SoulmatchCard.tsx`). Kein strukturiertes JSON-Output, nur Freitext. Nutzt `buildSoloSystemPrompt()` nicht – bekommt System- und User-Prompt direkt vom Client.

---

## 8. KONFIGURATION & ENVIRONMENT

### 8.1 Umgebungsvariablen

```bash
# .env.example

# LLM Provider API Keys (mindestens einer erforderlich)
OPENAI_API_KEY=sk-...
DEEPSEEK_API_KEY=sk-...
XAI_API_KEY=xai-...

# Datenbank (Neon PostgreSQL Serverless)
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require

# Server-Port (optional, default: 3001)
PORT=3001

# Dev-Token für /api/dev/* Routen (optional)
DEV_TOKEN=dev-secret

# Build-Metadaten (automatisch von CI/CD gesetzt)
GIT_COMMIT_SHA=abc1234
BUILD_TIMESTAMP=2024-01-01T00:00:00.000Z
```

### 8.2 render.yaml (Render.com Deployment)

```yaml
services:
  - type: web
    name: soulmatch
    runtime: node
    plan: free
    buildCommand: pnpm install && pnpm run build
    startCommand: node dist/index.js
    envVars:
      - key: NODE_VERSION
        value: 20
      - key: OPENAI_API_KEY
        sync: false        # Manuell in Render Dashboard setzen
      - key: DEEPSEEK_API_KEY
        sync: false
      - key: XAI_API_KEY
        sync: false
      - key: DATABASE_URL
        sync: false
```

### 8.3 Dockerfile

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3001
CMD ["node", "dist/index.js"]
```

> ⚠️ Das Dockerfile ist vorhanden aber möglicherweise nicht der primäre Deployment-Pfad (Render native bevorzugt). `sweph` native Addon benötigt Build-Tools (`python`, `make`, `g++`) im Docker-Image – ob Alpine-Image ausreicht ist unklar.

### 8.4 Root package.json (pnpm Workspace)

```json
{
  "scripts": {
    "build": "cd server && pnpm build && cd ../client && pnpm build",
    "dev":   "concurrently \"cd server && pnpm dev\" \"cd client && pnpm dev\""
  }
}
```

> ⚠️ Genaue Root-Scripts nicht verifiziert. Obiges ist eine Rekonstruktion aus dem Deployment-Kontext.

### 8.5 Server package.json (Auszug)

```json
{
  "type": "module",
  "dependencies": {
    "express":                "^4.x",
    "@neondatabase/serverless": "latest",
    "drizzle-orm":            "latest",
    "sweph":                  "latest"
  },
  "pnpm": {
    "onlyBuiltDependencies": ["sweph"]
  }
}
```

`onlyBuiltDependencies: ["sweph"]` stellt sicher, dass nur `sweph` native kompiliert wird (pnpm-spezifisch).

### 8.6 Client package.json (Auszug)

```json
{
  "dependencies": {
    "react":        "^18.x",
    "react-dom":    "^18.x",
    "wouter":       "^3.x",
    "lucide-react": "latest"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "latest",
    "tailwindcss":          "^3.x",
    "autoprefixer":         "latest",
    "postcss":              "latest",
    "typescript":           "^5.x",
    "vite":                 "^5.x"
  }
}
```

### 8.7 Vite-Konfiguration (client/vite.config.ts)

Proxy-Konfiguration für lokale Entwicklung:

```typescript
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:3001'
    }
  }
})
```

API-Aufrufe vom Client (`/api/*`) werden in der Entwicklung an den Express-Server auf Port 3001 weitergeleitet.

### 8.8 TailwindCSS (client/tailwind.config.js)

```javascript
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: { extend: {} },
  plugins: []
}
```

### 8.9 TypeScript-Konfiguration

Beide Pakete (client + server) haben eigene `tsconfig.json`.

**Server:** ESM-Modus, `"module": "ESNext"`, `"moduleResolution": "bundler"` oder `"node16"`.  
**Client:** Vite-Standard, `"module": "ESNext"`, JSX-Support.

### 8.10 Swiss Ephemeris (sweph) – Deployment-Hinweise

```
Native Node.js Addon (C-Bibliothek).
Benötigt Build-Tools bei Installation: python, make, g++.
Render.com Free Plan: Build-Tools verfügbar → sweph kompiliert.
Fallback: Wenn sweph nicht lädt → calculateFallback() in journey.ts
           und Pure-JS Engine in M04 (client-seitig).

Laden via createRequire(import.meta.url) für ESM-Kompatibilität:
  const req = createRequire(import.meta.url);
  const sw = req('sweph');
```

---

## ANHANG: Bekannte Einschränkungen & ⚠️ Markierungen

| # | Bereich | Einschränkung |
|---|---|---|
| 1 | Persistenz | Alle Daten außer UserProfile nur in localStorage – kein Backup |
| 2 | Streaming | Kein LLM-Streaming implementiert |
| 3 | Geo-Daten | Nur ~100 hardcodierte Städte, kein externer Geocoding-Service |
| 4 | Auth | Kein Authentifizierungs-System (kein Login, kein JWT) |
| 5 | sweph Docker | Alpine-Image möglicherweise unzureichend für native Kompilierung |
| 6 | Token-Limits | Genaue Default-Werte pro Endpunkt nicht vollständig dokumentiert |
| 7 | wouter Nutzung | Genaue Routing-Nutzung von wouter im Client unklar |
| 8 | M10/M12 Module | Möglicherweise veraltet oder in M13 integriert |
| 9 | match/single | Genaue Request/Response-Felder nicht vollständig verifiziert |
| 10 | Root Scripts | Genaue Root package.json Scripts nicht verifiziert |
| 11 | Lilith Asset | `client/public/assets/lilith.webp` muss manuell platziert werden |
| 12 | DB Migration | Kein Drizzle-Migration-Setup dokumentiert (⚠️ Schema muss manuell angelegt werden) |

---

*Ende des technischen Briefings. Beide Teile zusammen decken den vollständigen Soulmatch-Stack ab.*
*BRIEFING_PART1.md: Tech Stack · DB-Schema · API-Endpunkte · Projektstruktur*
*BRIEFING_PART2.md: State Management · Kern-Features · KI-Integration · Konfiguration*
