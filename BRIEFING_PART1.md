# SOULMATCH – Technisches Briefing (Teil 1 von 2)

> Abschnitte: Tech Stack · Datenbank-Schema · API-Endpunkte · Projektstruktur  
> Teil 2: State Management · Kern-Features · KI-Integration · Konfiguration & Environment

---

## 1. TECH STACK

### 1.1 Frontend

| Schicht | Technologie | Version |
|---|---|---|
| Framework | React | 18.x |
| Sprache | TypeScript | ~5.x |
| Build-Tool | Vite | ~5.x |
| Styling | TailwindCSS | ~3.x |
| Routing | wouter | ~3.x |
| Icons | Lucide React | latest |
| HTTP-Client | nativer `fetch` | – |

Kein Redux, Zustand, React Query. Reines `useState`/`useEffect`.

### 1.2 Backend

| Schicht | Technologie |
|---|---|
| Runtime | Node.js ESM-Modus, ≥18 |
| Framework | Express 4.x |
| ORM | Drizzle ORM |
| Datenbank | PostgreSQL (Neon Serverless) |
| Sprache | TypeScript via `tsx` |
| Modul-System | ESM (`"type": "module"`) |

### 1.3 Astronomie / Astrologie

| Komponente | Technologie | Anmerkung |
|---|---|---|
| Server (Journey + Astro-Route) | `sweph` native Node.js Addon | Lädt via `createRequire(import.meta.url)`; deterministischer Fallback wenn nicht verfügbar |
| Client (M04) | Pure-JS (`astronomy.ts`) | Meeus-Algorithmen, JPL-Orbitalelemente; ~0.01° Sonne, ~0.3° Mond |

### 1.4 KI / LLM Provider

| Provider | Standard-Modell | Env-Var |
|---|---|---|
| OpenAI | `gpt-4o-mini` | `OPENAI_API_KEY` |
| DeepSeek | `deepseek-chat` | `DEEPSEEK_API_KEY` |
| xAI (Grok) | `grok-beta` | `XAI_API_KEY` |

### 1.5 Deployment

- **Plattform:** Render.com (Web Service, Free Plan)
- **Build:** `pnpm install && pnpm run build`
- **Start:** `node dist/index.js`
- **Node-Version:** 20.x (render.yaml)
- **Dockerfile** vorhanden als Alternative

---

## 2. DATENBANK-SCHEMA

### 2.1 Verbindung

```typescript
// server/src/db.ts
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';

export function getDb() {
  const sql = neon(process.env.DATABASE_URL!);
  return drizzle(sql, { schema: { profiles } });
}
```

`getDb()` wird per-Request aufgerufen. Kein App-Level Connection-Pooling (Neon verwaltet intern).

### 2.2 Tabelle: `profiles` (einzige persistente DB-Tabelle)

```sql
CREATE TABLE profiles (
  id           UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_json TEXT      NOT NULL,
  created_at   TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMP NOT NULL DEFAULT NOW()
);
```

Drizzle-Definition:

```typescript
export const profiles = pgTable('profiles', {
  id:          uuid('id').primaryKey().defaultRandom(),
  profileJson: text('profile_json').notNull(),
  createdAt:   timestamp('created_at').notNull().defaultNow(),
  updatedAt:   timestamp('updated_at').notNull().defaultNow(),
});
```

### 2.3 `profile_json` Inhalt (serialisiertes `UserProfile`)

```typescript
interface UserProfile {
  id:            string;       // UUID
  name:          string;
  birthDate:     string;       // "YYYY-MM-DD"
  birthTime?:    string;       // "HH:MM"
  birthPlace?:   string;       // Freitext-Stadtname
  birthLocation?: {
    lat:         number;
    lon:         number;
    countryCode: string;
    timezone:    string;
  };
  timezone?:     string;
  createdAt:     string;       // ISO 8601
  updatedAt:     string;       // ISO 8601
}
```

### 2.4 Persistenz-Übersicht

| Datenkategorie | Speicherort | localStorage-Schlüssel |
|---|---|---|
| User-Profile | PostgreSQL | `profiles.profile_json` |
| Chat-Verlauf (pro Persona) | localStorage | `soulmatch_chat_{persona}_{profileId}` |
| Timeline-Einträge | localStorage | `soulmatch_timeline` |
| Soul Cards | localStorage | `soulmatch_soul_cards` |
| User Memory (LLM-Kontext) | localStorage | `soulmatch_memory_{profileId}` |
| Lilith Intensität | localStorage | `soulmatch_lilith_intensity` |
| Sensitivity Score | localStorage | `soulmatch_sensitivity` |
| Toxicity Block | localStorage | `soulmatch_toxicity_block` |
| Letzte Persona | localStorage | `soulmatch_last_persona` |
| App-Einstellungen | localStorage | `soulmatch_settings` |
| Card-Einstellungen | localStorage | `soulmatch_card_settings` |

> ⚠️ Alle Daten außer `UserProfile` sind ausschließlich in `localStorage`. Bei Browser-Cache-Löschung gehen sie verloren. Kein Server-seitiges Backup.

---

## 3. API-ENDPUNKTE

**Base URL:** `http://localhost:3001` (dev) / Render-URL (prod)  
**Auth:** Kein JWT/Session. Optionaler `DEV_TOKEN` Header nur für `/api/dev/*`. API-Keys werden client-seitig übergeben oder aus Server-Env gelesen.  
**Format:** JSON, `Content-Type: application/json`

---

### 3.1 Health & Meta

#### `GET /api/health`

```json
// Response 200
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "sweph": {
    "available": true,
    "runtime": "native"
  }
}
```

#### `GET /api/meta`

```json
// Response 200
{
  "version": "1.0.0",
  "scoringVersion": "1.0.0",
  "matchVersion": "1.0.0",
  "buildSha": "abc1234",
  "buildTs": "2024-01-01T00:00:00.000Z"
}
```

---

### 3.2 Profile CRUD (`/api/profile`)

#### `POST /api/profile` — Profil erstellen

```json
// Request
{
  "name": "Anna Müller",
  "birthDate": "1990-05-15",
  "birthTime": "14:30",
  "birthPlace": "Berlin",
  "birthLocation": { "lat": 52.52, "lon": 13.405, "countryCode": "DE", "timezone": "Europe/Berlin" }
}

// Response 201: vollständiges UserProfile-Objekt
// Response 400: { "error": "missing_required_fields", "message": "name and birthDate required" }
// Response 500: { "error": "db_error", "message": "..." }
```

#### `GET /api/profile` — Alle Profile

```json
// Response 200: UserProfile[]
```

#### `GET /api/profile/:id` — Einzelnes Profil

```json
// Response 200: UserProfile
// Response 404: { "error": "not_found" }
```

#### `PUT /api/profile/:id` — Profil aktualisieren

```json
// Request: Partial<UserProfile>
// Response 200: aktualisiertes UserProfile
// Response 404: { "error": "not_found" }
```

#### `DELETE /api/profile/:id` — Profil löschen

```json
// Response 200: { "success": true }
// Response 404: { "error": "not_found" }
```

---

### 3.3 Scoring (`/api/scoring`)

#### `POST /api/scoring/calc`

Berechnet Unified Score (Numerologie + Astrologie + Fusion) via `calculateUnifiedScore()`.

```json
// Request
{
  "numerology": {
    "lifePath": 7, "expression": 3, "soulUrge": 9,
    "personality": 5, "birthday": 6
  },
  "astrology": {
    "sun": "Aries", "moon": "Taurus", "rising": "Gemini",
    "mercury": "Pisces", "venus": "Aries", "mars": "Capricorn"
  }
}

// Response 200
{
  "overall": 72,
  "numerology": 68,
  "astrology": 75,
  "fusion": 70,
  "claims": ["Lebensweg 7 harmoniert mit Stier-Mond...", "..."]
}

// Response 400: { "error": "invalid_request", "message": "..." }
```

---

### 3.4 Numerologie (`/api/numerology`)

#### `POST /api/numerology/calc`

Pythagoräische Numerologie.

```json
// Request
{ "name": "Anna Müller", "birthDate": "1990-05-15" }

// Response 200
{
  "lifePath": 3,
  "expression": 7,
  "soulUrge": 5,
  "personality": 2,
  "birthday": 6,
  "warnings": []
}
```

**Algorithmus:** Pythagoräische Tabelle A=1…Z=8, Reduktion auf 1–9 außer Master Numbers 11, 22, 33.

---

### 3.5 Astrologie (`/api/astro`)

#### `POST /api/astro/calc`

Vollständiges Geburtshoroskop via Swiss Ephemeris.

```json
// Request
{
  "birthDate": "1990-05-15",
  "birthTime": "14:30",
  "birthPlace": "Berlin",
  "lat": 52.52, "lon": 13.405,
  "timezone": "Europe/Berlin"
}

// Response 200
{
  "planets": [
    { "id": "sun", "longitude": 54.3, "sign": "Taurus", "degree": 24.3, "retrograde": false },
    { "id": "moon", "longitude": 210.1, "sign": "Scorpio", "degree": 0.1, "retrograde": false }
  ],
  "houses": [
    { "number": 1, "sign": "Gemini", "longitude": 70.2 }
  ],
  "aspects": [
    { "body1": "sun", "body2": "moon", "type": "trine", "orb": 3.2 }
  ],
  "warnings": []
}
```

#### `GET /api/astro/today`

Aktuelle Planetenkonstellationen (kein Request-Body).

#### `GET /api/astro/probe`

Prüft ob `sweph` native Modul verfügbar ist.

```json
// Response 200
{ "sweph": true, "runtime": "native" }
```

---

### 3.6 Match (`/api/match`)

#### `POST /api/match/score`

Vergleicht zwei Profile anhand ihrer Scores.

```json
// Request
{
  "profileA": { /* UserProfile */ },
  "profileB": { /* UserProfile */ }
}

// Response 200
{
  "overall": 78,
  "numerology": 80,
  "astrology": 75,
  "fusion": 72,
  "claims": ["Beide haben Lebensweg 3...", "Venus-Konjunktion..."]
}
```

#### `POST /api/match/single`

Match-Score mit Narrative Quality Gate (LLM-generierte Erklärung).

```json
// Request: wie /match/score + optionale LLM-Konfiguration
// Response: wie /match/score + "narrative": string
```

> ⚠️ Genaue Request/Response-Felder von `/api/match/single` sind in `server/src/routes/match.ts` definiert; Narrative-Generierung nutzt `applyNarrativeGate()`.

---

### 3.7 Journey (`/api/journey`)

#### `POST /api/journey/optimal-dates`

Berechnet optimale Termine für ein Lebensereignis basierend auf Planetenkonstellationen.

```json
// Request
{
  "eventType": "new_project",
  "startDate": "2024-02-01",
  "endDate":   "2024-03-31",
  "birthDate": "1990-05-15",
  "birthTime": "14:30"
}

// eventType Werte:
// travel | new_project | job_change | relationship | move
// health | financial | creative | learning | spiritual

// Response 200
{
  "eventType": "new_project",
  "optimalDates": [
    {
      "date": "2024-02-14",
      "score": 82,
      "rating": "excellent",
      "planetaryInfluences": [
        {
          "planet": "Jupiter",
          "aspect": "Trigon",
          "influence": "supportive",
          "description": "Glück und Expansion"
        }
      ],
      "summary": "Exzellenter Tag! Jupiter und Mars unterstützen dich.",
      "moonPhase": "Zunehmende Sichel",
      "dayOfWeek": "Mittwoch"
    }
  ],
  "generalAdvice": "Für Neues Projekt sind Jupiter und Mars besonders wichtig...",
  "avoidDates": ["2024-02-08", "2024-02-22"]
}

// Response 400: { "error": "invalid_request", "message": "eventType, startDate, endDate, birthDate required" }
// Response 500: { "error": "calculation_failed", "message": "..." }
```

**Implementierungsdetail:** Wenn `sweph` nicht verfügbar → `calculateFallback()` mit deterministischen Näherungsformeln (Sonnen-Länge, Mondphasen-Zyklus, mittlere Planetenlongituden). Max. 90 Tage Berechnung. Top 10 nicht-herausfordernde Tage werden zurückgegeben.

**Planeten-Gewichtungen** (pro `eventType`, Array-Index = Planet):

```
[SUN, MOON, MERCURY, VENUS, MARS, JUPITER, SATURN]
travel:       [1, 2, 3, 1, 1, 3, -1]
new_project:  [2, 1, 2, 1, 3, 2,  1]
relationship: [1, 3, 1, 3, 1, 2, -1]
financial:    [2, 1, 2, 2, 1, 3,  2]
spiritual:    [2, 3, 1, 2,-1, 3,  1]
```

---

### 3.8 Geo (`/api/geo`)

#### `GET /api/geo/autocomplete?q={query}`

Stadtvorschläge für Geburtsort-Eingabe.

```json
// Response 200
{
  "results": [
    { "name": "Berlin", "country": "DE", "lat": 52.52, "lon": 13.405 }
  ]
}
```

**Implementierung:** Hardcodierte statische Stadtliste (~100 Städte: Deutschland, Österreich, Schweiz, Türkei, Europa, Welt). In-Memory LRU-Cache + Throttling. Kein externer API-Aufruf.

---

### 3.9 Studio (`/api/studio`)

Zentraler LLM-Endpunkt für alle KI-Persona-Interaktionen.

#### `POST /api/studio` — Roundtable Chat

```json
// Request
{
  "systemPrompt":    string,
  "userPrompt":      string,
  "provider":        "openai" | "deepseek" | "xai",
  "apiKey":          string?,        // client-seitig übergeben, überschreibt Server-Env
  "model":           string?,
  "maxTokens":       number?,
  "temperature":     number?,
  "soloPersona":     "maya" | "luna" | "orion" | "lilith" | null,
  "lilithIntensity": "mild" | "ehrlich" | "brutal",
  "freeMode":        boolean,
  "chatExcerpt":     string?,        // komprimierter Chat-Verlauf
  "matchExcerpt":    string?,        // Match-Kontext
  "userMemory":      string?         // buildMemoryContext() Output
}

// Response 200
{
  "turns": [
    { "seat": "maya", "text": "..." },
    { "seat": "luna", "text": "..." }
  ],
  "nextSteps": ["...", "..."],
  "watchOut":  "...",
  "anchorsUsed": ["zodiac:taurus", "lifePath:7"]
}

// Response 400: { "error": "invalid_request" }
// Response 500: { "error": "llm_error", "message": "..." }
```

#### `POST /api/studio/portrait` — Soul Portrait

Generiert KI-Persönlichkeitsporträt für ein Profil.

```json
// Request: { profile: UserProfile, provider, apiKey?, model? }
// Response: { portrait: string }
```

#### `POST /api/studio/weekly` — Wöchentliche Insights

```json
// Request: { profile: UserProfile, weekStart: string, provider, apiKey? }
// Response: { insights: string }
```

#### `POST /api/studio/monthly` — Monatliches Horoskop

```json
// Request: { profile: UserProfile, month: string, provider, apiKey? }
// Response: { horoscope: string }
```

#### `POST /api/studio/compatibility` — Kompatibilitäts-Story

```json
// Request: { profileA: UserProfile, profileB: UserProfile, provider, apiKey? }
// Response: { story: string }
```

#### `POST /api/studio/oracle` — Oracle-Frage

```json
// Request: { question: string, profile: UserProfile, provider, apiKey? }
// Response: StudioResult (turns/nextSteps/watchOut/anchorsUsed)
```

---

### 3.10 Guide (`/api/guide`)

Generischer LLM-Endpunkt, primär für `CardMayaChat`.

```json
// POST /api/guide
// Request
{
  "systemPrompt": string,
  "userMessage":  string,
  "maxTokens":    number?,
  "temperature":  number?,
  "provider":     "openai" | "deepseek" | "xai",
  "apiKey":       string?,
  "model":        string?
}

// Response 200
{ "text": "LLM-Antwort als Freitext" }

// Response 400/500: { "error": "...", "message": "..." }
```

---

## 4. PROJEKTSTRUKTUR

```
soulmatch/
├── .env                          # Lokale Env-Variablen (nicht committed)
├── .env.example                  # Vorlage für Env-Variablen
├── render.yaml                   # Render.com Deployment-Konfiguration
├── Dockerfile                    # Docker-Alternative
├── package.json                  # Root: pnpm workspace scripts
├── BRIEFING_PART1.md             # Diese Datei
├── BRIEFING_PART2.md             # Teil 2
│
├── client/                       # React Frontend (Vite)
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   ├── index.html
│   └── src/
│       ├── app/
│       │   └── App.tsx           # Root-Komponente, globales State Management, Routing
│       ├── index.css             # Globale Styles, Keyframe-Animationen
│       ├── main.tsx              # React-Einstiegspunkt
│       └── modules/              # Feature-Module (M01–M13)
│           ├── M01_profile/      # Profil-Erstellung & -Verwaltung
│           ├── M02_ui-kit/       # Shared UI-Komponenten (SoulmatchCard, etc.)
│           ├── M03_numerology/   # Client-seitige Numerologie-Berechnung
│           ├── M04_astrology-adapter/  # Client-seitige Astronomie-Engine
│           │   └── lib/
│           │       ├── astronomy.ts    # Meeus-Algorithmen, JPL-Orbitalelemente
│           │       ├── geocode.ts      # ~100 Städte, birthToUT()
│           │       └── realEngine.ts   # RealAstrologyEngine (implements AstrologyEngine)
│           ├── M05_report/       # Score-Report-Anzeige
│           ├── M06_scoring/      # Scoring-Engine (computeScore, buildScoreRequest)
│           ├── M07_journey/      # Journey Planner UI
│           ├── M08_studio-chat/  # Studio/Roundtable Chat
│           │   ├── lib/
│           │   │   ├── chatHistory.ts        # Per-Persona localStorage (max 100 msgs)
│           │   │   ├── commandBus.ts         # UI-Command-Queue (400ms delay)
│           │   │   ├── commandParser.ts      # parseResponse(), parseSoulCard()
│           │   │   ├── insightExtractor.ts   # Client-seitige Keyword-Extraktion
│           │   │   ├── lilithGate.ts         # Intensitäts-Speicherung localStorage
│           │   │   ├── personaPersist.ts     # getLastPersona/setLastPersona
│           │   │   ├── sensitivityTracker.ts # Score 0-100, Distress-Erkennung
│           │   │   ├── toxicityGuard.ts      # Regex-Muster, 3 Severity-Level, 24h Block
│           │   │   └── userMemory.ts         # JSON Timeline, max 50 Einträge, Strikes
│           │   └── ui/
│           │       ├── LilithAvatar.tsx
│           │       ├── LilithEyes.tsx
│           │       ├── PersonaSoloChat.tsx   # 1-on-1 Persona Modal
│           │       ├── SeatBadge.tsx
│           │       ├── StudioPage.tsx        # Studio-Seite, Match-Modus
│           │       ├── StudioPanel.tsx       # Chat-Input, Roundtable-Anzeige
│           │       └── TurnsView.tsx
│           ├── M09_settings/     # Einstellungen (Provider, API-Keys)
│           │   └── lib/
│           │       └── providerRouter.ts     # generateStudio(), StudioCallOptions
│           ├── M10_timeline/     # ⚠️ Möglicherweise veraltet/umbenannt zu M13
│           ├── M11_match/        # Matching Engine
│           ├── M12_soul-cards/   # ⚠️ Möglicherweise in M13 integriert
│           └── M13_timeline/     # Timeline Sidebar + Soul Cards
│               ├── lib/
│               │   ├── entryTypes.ts         # 8 Entry-Typen mit Icons/Farben
│               │   ├── soulCardService.ts    # Soul Cards CRUD (localStorage)
│               │   ├── timelineService.ts    # Timeline CRUD, max 200 Einträge
│               │   └── types.ts              # TimelineEntry, SoulCard, SoulCardProposal
│               └── ui/
│                   ├── CrossingModal.tsx     # 2-Karten-Kreuzung, LLM-Synthese
│                   ├── Sidebar.tsx           # 280px fixed left, mobile drawer
│                   └── SoulCardDetail.tsx    # Modal: view/edit/delete
│
└── server/                       # Express Backend
    ├── package.json              # sweph als native dependency
    └── src/
        ├── index.ts              # Server-Einstiegspunkt, Route-Mounting
        ├── db.ts                 # Drizzle ORM, Neon-Verbindung, profiles-Schema
        ├── studioPrompt.ts       # Prompt-Builder (buildSystemPrompt, buildSoloSystemPrompt,
        │                         #   buildUserPrompt, buildOraclePrompt, buildCrossingPrompt)
        ├── studioSchema.ts       # STUDIO_RESULT_SCHEMA (JSON Schema für LLM-Output)
        ├── lib/
        │   ├── studioAnchors.ts  # buildStudioAnchors(), renderAnchorInstructionBlock()
        │   └── studioQuality.ts  # applyNarrativeGate() Quality Control
        ├── routes/
        │   ├── astro.ts          # /api/astro/* (calc, today, probe)
        │   ├── geo.ts            # /api/geo/autocomplete
        │   ├── guide.ts          # /api/guide
        │   ├── health.ts         # /api/health
        │   ├── journey.ts        # /api/journey/optimal-dates
        │   ├── match.ts          # /api/match/score, /api/match/single
        │   ├── meta.ts           # /api/meta
        │   ├── numerology.ts     # /api/numerology/calc
        │   ├── profile.ts        # /api/profile CRUD
        │   ├── scoring.ts        # /api/scoring/calc
        │   └── studio.ts         # /api/studio/* (alle KI-Endpunkte)
        └── shared/
            └── scoring.ts        # calculateUnifiedScore() – Single Source of Truth
```

### 4.1 Server-Einstiegspunkt (`server/src/index.ts`)

Route-Mounting-Reihenfolge:

```typescript
app.use(express.json());
// Request-Logging Middleware

app.use('/api', healthRouter);
app.use('/api', metaRouter);
app.use('/api/profile', profileRouter);
app.use('/api/scoring', scoringRouter);
app.use('/api/numerology', numerologyRouter);
app.use('/api/astro', astrologyRouter);
app.use('/api/match', matchRouter);
app.use('/api/journey', journeyRouter);
app.use('/api/geo', geoRouter);
app.use('/api/studio', studioRouter);
app.use('/api/guide', guideRouter);

// Static Files (client/dist)
app.use(express.static(path.join(__dirname, '../../client/dist')));

// SPA Fallback (alle nicht-API Routen → index.html)
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, '../../client/dist/index.html'));
  }
});

app.listen(process.env.PORT ?? 3001);
```

### 4.2 Client-Einstiegspunkt (`client/src/app/App.tsx`)

- Definiert `APP_PAGES` Array für Navigation
- Verwaltet globalen State: `profile`, `activePage`, `overlay`, `scoreResult`, `matchResult`, `settings`, `cardSettings`, `sidebarOpen`
- Mountet Sidebar (M13), SoulCardDetail-Modal, CrossingModal
- Rendert aktive Seite via `activePage`-State (kein URL-basiertes Routing für Hauptnavigation)
- `wouter` wird für Sub-Routing innerhalb von Modulen verwendet ⚠️ (genaue Nutzung unklar)

### 4.3 Modul-Konventionen

Jedes Modul unter `client/src/modules/M{nn}_{name}/` hat:
- `index.ts` — Barrel-Exports (public API des Moduls)
- `lib/` — Business-Logik, Services, Utilities
- `ui/` — React-Komponenten
- `README.md` — Modul-Dokumentation (nicht alle vorhanden)

---

*→ Weiter in BRIEFING_PART2.md: State Management, Kern-Features, KI-Integration, Konfiguration*
