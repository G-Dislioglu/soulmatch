# OPUS-BRIDGE SPEC v3.0 — Self-Regulating Builder

## Kurzfassung

Die Opus-Bridge ist ein selbstregulierendes Bausystem für Soulmatch und
zukünftige Apps. Fünf Schichten arbeiten zusammen:

1. **ChatPool + Roundtable**: Opus 4.6, GPT-5.4 und Gemini als Team
   in einem gemeinsamen Denkraum. Scouts machen billige Vorarbeit.
2. **Architecture Graph**: Lebende Landkarte des Repos — Regeln,
   Abhängigkeiten, Fortschritt. Worker lesen und aktualisieren den Graph.
3. **Project DNA**: Kondensiertes Projektwissen (Ziele, Konventionen,
   Produktvision) das bei jedem Task mitgegeben wird.
4. **Verification Loop**: Nach jedem Deploy testet das System sich selbst
   per LIVE-PROBE. Ergebnisse fließen in den Graph zurück.
5. **Error Learning**: Fehler werden als Karten gespeichert und bei
   ähnlichen Tasks automatisch als Warnung injiziert.

Web-Opus (Claude.ai) ist Auftraggeber, Stratege und Endprüfer.
Der Server arbeitet autonom dazwischen — mit Opus API als Chain-Controller.

---

## 1. Architektur-Übersicht

```
Gürcan
  ↓ "Bau Feature X"
Web-Opus (Claude.ai — LIVE-PROBE)
  ↓ POST /opus-bridge/execute oder /chain
  ↓ Definiert: Aufträge, Ketten, opusHints, Regeln
  │
  │  ┌─────────────────────────────────────────────────┐
  │  │           BUILDER SERVER (Render)                │
  │  │                                                  │
  │  │  ┌── PHASE 0: SCOUT ──────────────────────────┐ │
  │  │  │  DeepSeek V3.2    → Codebase durchsuchen    │ │
  │  │  │  GPT-4.1-nano     → Patterns finden         │ │
  │  │  │  Gemini 3 Flash   → @SEARCH Web-Grounding   │ │
  │  │  │                                             │ │
  │  │  │  Output: Scout-Briefing (ins ChatPool)      │ │
  │  │  └─────────────────────────────────────────────┘ │
  │  │                    ↓                             │
  │  │  ┌── PHASE 1: ROUNDTABLE ─────────────────────┐ │
  │  │  │                                             │ │
  │  │  │         ╔══════════════╗                    │ │
  │  │  │         ║   CHATPOOL   ║                    │ │
  │  │  │         ║  (gemeinsam) ║                    │ │
  │  │  │         ╚══════════════╝                    │ │
  │  │  │          ↑     ↑     ↑                     │ │
  │  │  │    Opus 4.6  GPT-5.4  Gemini               │ │
  │  │  │    (Denker)  (Prüfer) (Scout+)              │ │
  │  │  │                                             │ │
  │  │  │  Jeder sieht alles. Jeder kann alles.       │ │
  │  │  │  Konsens = 2+ @APPROVE → fertig.            │ │
  │  │  └─────────────────────────────────────────────┘ │
  │  │                    ↓                             │
  │  │  ┌── CHAIN CONTROLLER ────────────────────────┐ │
  │  │  │  Opus 4.6 (API) als Zwischen-Entscheider   │ │
  │  │  │  Prüft Ergebnis von Task N                  │ │
  │  │  │  Entscheidet: weiter / anpassen / stoppen   │ │
  │  │  │  Passt opusHints für Task N+1 an            │ │
  │  │  └─────────────────────────────────────────────┘ │
  │  │                    ↓                             │
  │  │  GitHub Actions → Patch anwenden → Commit        │
  │  └─────────────────────────────────────────────────┘
  │
  ↓ GET /opus-bridge/observe
Web-Opus: prüft Ergebnis, macht LIVE-PROBE, berichtet Gürcan

```

---

## 2. Der ChatPool

### 2.1 Was ist der ChatPool?

Eine chronologische Liste aller Nachrichten zu einem Task — von allen Modellen,
inklusive Scouts. Jedes Modell sieht bei seinem Aufruf die KOMPLETTE bisherige
Diskussion und reagiert darauf.

### 2.2 Datenstruktur

```typescript
interface ChatPoolMessage {
  id: string;                  // uuid
  taskId: string;              // welcher Task
  round: number;               // 0 = Scout, 1+ = Roundtable
  phase: 'scout' | 'roundtable' | 'chain_decision';
  actor: string;               // 'deepseek' | 'gpt-nano' | 'gemini' | 'opus' | 'gpt-5.4'
  model: string;               // konkretes Modell (z.B. 'claude-opus-4-6')
  content: string;             // Freitext + BDL-Befehle gemischt
  commands?: BdlCommand[];     // geparste BDL-Befehle (wenn vorhanden)
  executionResults?: Record<string, unknown>;  // Ergebnisse von @FIND, @READ etc.
  tokensUsed: number;
  durationMs: number;
  createdAt: string;
}
```

### 2.3 DB-Schema

```sql
CREATE TABLE builder_chatpool (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id     UUID NOT NULL REFERENCES builder_tasks(id),
  round       INTEGER NOT NULL,
  phase       VARCHAR(20) NOT NULL,
  actor       VARCHAR(20) NOT NULL,
  model       VARCHAR(50) NOT NULL,
  content     TEXT NOT NULL,
  commands    JSONB DEFAULT '[]',
  execution_results JSONB DEFAULT '{}',
  tokens_used INTEGER DEFAULT 0,
  duration_ms INTEGER DEFAULT 0,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 2.4 Wie der ChatPool an Modelle übergeben wird

Wenn ein Modell aufgerufen wird, bekommt es den ChatPool als User-Messages:

```
[System-Prompt: Deine Rolle, BDL-Syntax, Task-Kontext, opusHints]

[User: "Bisherige Team-Diskussion zu diesem Task:

--- Scout-Briefing (Runde 0) ---

[deepseek] Codebase-Analyse:
  - server/src/lib/ hat 14 Dateien
  - Kein bestehendes Rate-Limiting gefunden
  - Express-Middleware Pattern wird überall genutzt
  - Ähnliche Utility: server/src/lib/builderGates.ts (Token-Budget Check)

[gpt-nano] Pattern-Scan:
  - 23 API-Endpoints gefunden
  - Keiner hat Rate-Limiting
  - Durchschnittliche Handler-Länge: 35 Zeilen

[gemini] @SEARCH: express rate limiting best practices 2026
  - Token-Bucket ist Standard für API Rate-Limiting
  - Sliding Window für Burst-Protection empfohlen
  - In-Memory reicht für Single-Instance (kein Redis nötig)

--- Roundtable Runde 1 ---

[opus] Ich schlage Token-Bucket mit Sliding Window vor...
  @PATCH server/src/lib/rateLimiter.ts ...

[gpt-5.4] Guter Ansatz. Aber Race Condition bei concurrent requests...

--- Dein Beitrag (Runde 2): ---"]
```

Jedes Modell sieht also den kompletten Verlauf und antwortet im Kontext.

---

## 3. Phase 0 — Scout-Phase

### 3.1 Zweck

Billige Modelle sammeln Informationen BEVOR die teuren Modelle starten.
Die Scout-Phase produziert ein Briefing das ins ChatPool geschrieben wird.

### 3.2 Scout-Aufträge (parallel ausführbar)

| Scout | Modell | Aufgabe | Kosten/Task |
|-------|--------|---------|-------------|
| Codebase-Scout | DeepSeek V3.2 | `@FIND_PATTERN`, `@READ`, Datei-Inventar, verwandte Dateien finden | ~$0.003 |
| Pattern-Scout | GPT-4.1-nano | Muster erkennen, Konventionen extrahieren, Duplikate finden | ~$0.001 |
| Web-Scout | Gemini 3 Flash | `@SEARCH` Web-Grounding, aktuelle Best Practices, Paket-Check | ~$0.003 |

**Gesamt Scout-Phase: ~$0.007 pro Task** (weniger als 1 Cent)

### 3.3 Scout-Prompts

Jeder Scout bekommt einen fokussierten Auftrag:

**Codebase-Scout (DeepSeek):**
```
Du bist der Codebase-Scout. Dein Job: Durchsuche das Repo und liefere
eine Übersicht die dem Entwickler-Team als Basis dient.

Task: {task.goal}

Nutze diese BDL-Befehle:
- @FIND_PATTERN pattern:"..." fileGlob:"..."
- @READ file:"..."

Liefere:
1. Welche bestehenden Dateien sind relevant?
2. Gibt es ähnliche Implementierungen die man wiederverwenden kann?
3. Welche Patterns/Konventionen nutzt das Projekt?
4. Welche Dateien müssten geändert werden?

Kein Code schreiben. Nur recherchieren und berichten.
```

**Pattern-Scout (GPT-4.1-nano):**
```
Du bist der Pattern-Scout. Du bekommst Codebase-Informationen und
extrahierst daraus Muster und Konventionen.

Task: {task.goal}
Codebase-Info: {deepseek_scout_output}

Liefere:
1. Welche Code-Konventionen sollen eingehalten werden?
2. Gibt es Duplikat-Risiken?
3. Welche Edge-Cases fallen dir auf?
4. Geschätzte Komplexität und Risiken.

Kein Code schreiben. Nur analysieren.
```

**Web-Scout (Gemini):**
```
Du bist der Web-Scout mit Zugang zu @SEARCH (Google Grounding).
Recherchiere aktuelle Best Practices für den Task.

Task: {task.goal}

Nutze @SEARCH für:
1. Aktuelle Best Practices zum Thema
2. Bekannte Pitfalls oder Anti-Patterns
3. Ob es etablierte Lösungen gibt die man nutzen sollte/könnte
4. Performance-Überlegungen

Liefere eine kurze Zusammenfassung der Recherche.
```

### 3.4 Scout-Konfiguration

Scouts sind pro Task konfigurierbar:

```typescript
interface ScoutConfig {
  enabled: boolean;             // Scout-Phase überspringen? (default: true)
  scouts: Array<{
    role: 'codebase' | 'pattern' | 'web';
    actor: string;              // 'deepseek' | 'gpt-nano' | 'gemini'
    model: string;
    maxTokens: number;
  }>;
  parallel: boolean;            // Scouts parallel ausführen (default: true)
  scoutTokenBudget: number;     // Max Tokens für alle Scouts zusammen (default: 3000)
}
```

Default-Config:
```typescript
const DEFAULT_SCOUTS: ScoutConfig = {
  enabled: true,
  parallel: true,
  scoutTokenBudget: 3000,
  scouts: [
    { role: 'codebase', actor: 'deepseek', model: 'deepseek-chat', maxTokens: 1500 },
    { role: 'pattern',  actor: 'gpt-nano', model: 'gpt-5-nano',   maxTokens: 800 },
    { role: 'web',      actor: 'gemini',   model: 'gemini-3-flash-preview', maxTokens: 700 },
  ],
};
```

---

## 4. Phase 1 — Roundtable

### 4.1 Grundprinzip

Alle starken Modelle arbeiten als Team. Kein Modell hat eine feste Rolle —
jeder kann Ideen einbringen, Code schreiben, kritisieren, oder zustimmen.
Aber jeder hat eine **Stärke** die im System-Prompt hervorgehoben wird.

### 4.2 Teilnehmer

| Teilnehmer | Modell | Stärke | Provider |
|------------|--------|--------|----------|
| Opus | claude-opus-4-6 | Architektur, Systemdesign, tiefe Analyse, komplexe Logik | anthropic |
| GPT-5.4 | gpt-5.4 | Edge-Cases, Fehlersuche, Sicherheit, alternative Ansätze | openai |
| Gemini | gemini-3-flash-preview | Web-Zugang (@SEARCH), schnelle Validierung, Praxis-Check | google |

### 4.3 Roundtable-Config

```typescript
interface RoundtableConfig {
  participants: Array<{
    actor: string;
    model: string;
    provider: string;
    strengths: string;       // ins System-Prompt
    maxTokensPerRound: number;
  }>;
  maxRounds: number;           // z.B. 4
  consensusThreshold: number;  // wie viele @APPROVE für Konsens (default: 2)
  roundTokenBudget: number;    // Max Tokens pro Runde alle Teilnehmer zusammen
  totalTokenBudget: number;    // Max Tokens über alle Runden
}
```

Default-Config:
```typescript
const DEFAULT_ROUNDTABLE: RoundtableConfig = {
  participants: [
    {
      actor: 'opus',
      model: 'claude-opus-4-6',
      provider: 'anthropic',
      strengths: 'Architektur, Systemdesign, komplexe Logik, saubere Abstraktionen',
      maxTokensPerRound: 2500,
    },
    {
      actor: 'gpt-5.4',
      model: 'gpt-5.4',
      provider: 'openai',
      strengths: 'Edge-Cases, Fehlersuche, Sicherheitslücken, alternative Ansätze, Gegenargumente',
      maxTokensPerRound: 2000,
    },
    {
      actor: 'gemini',
      model: 'gemini-3-flash-preview',
      provider: 'google',
      strengths: 'Web-Recherche (@SEARCH), aktuelle Best Practices, schnelle Validierung, Praxis-Perspektive',
      maxTokensPerRound: 1500,
    },
  ],
  maxRounds: 4,
  consensusThreshold: 2,
  roundTokenBudget: 8000,
  totalTokenBudget: 25000,
};
```

### 4.4 Roundtable System-Prompt (gleich für alle, nur {strengths} variiert)

```
Du bist Teil eines KI-Entwickler-Teams für das Projekt Soulmatch.
Du arbeitest zusammen mit anderen KI-Modellen an einem gemeinsamen Task.

=== DEINE STÄRKE ===
{strengths}

Nutze deine Stärke aktiv, aber beschränke dich nicht darauf.
Du kannst alles tun: Ideen einbringen, Code schreiben, Fehler finden, zustimmen.

=== TEAMARBEIT ===
- Lies was die anderen geschrieben haben und REAGIERE darauf
- Baue auf guten Ideen auf, widersprich bei Fehlern
- Bringe eigene Perspektiven ein die andere übersehen
- Wiederhole nicht was schon gesagt wurde

=== BDL-BEFEHLE (wenn du Code schreiben oder suchen willst) ===
@FIND_PATTERN pattern:"..." fileGlob:"..."
@READ file:"..."
@PATCH file:"..." <<<SEARCH ... ===REPLACE ... >>>
@SEARCH query:"..." (nur wenn du Web-Zugang hast)

=== ENTSCHEIDUNGEN ===
Sage @APPROVE wenn du mit dem aktuellen Code-Stand zufrieden bist.
Sage @BLOCK mit Begründung wenn du ein Problem siehst.
Sage @NEEDS_DISCUSSION wenn du eine Frage ans Team hast.

{opusHints ? '=== OPUS-ARCHITECT ANWEISUNGEN ===\n' + opusHints : ''}

=== AKTUELLER TASK ===
Titel: {task.title}
Ziel: {task.goal}
Scope: {task.scope}
Risiko: {task.risk}
```

### 4.5 Runden-Ablauf

```
function runRoundtable(task, chatPool, config):

  for round = 1 to config.maxRounds:

    for participant in config.participants:
      // ChatPool als Kontext aufbauen
      context = formatChatPoolForModel(chatPool)

      // Modell aufrufen
      response = callProvider(participant.provider, participant.model, {
        system: buildRoundtableSystemPrompt(participant, task),
        messages: [{ role: 'user', content: context + '\n\n--- Dein Beitrag: ---' }],
        maxTokens: participant.maxTokensPerRound,
      })

      // BDL-Befehle parsen und ausführen (PATCH, FIND, READ, SEARCH)
      commands = parseBdl(response)
      executionResults = executeCommands(task, commands)

      // Ins ChatPool schreiben
      chatPool.push({
        round, phase: 'roundtable',
        actor: participant.actor,
        model: participant.model,
        content: response,
        commands, executionResults,
      })

    // Konsens-Check nach jeder Runde
    approvals = countApprovals(chatPool, round)
    blocks = countBlocks(chatPool, round)

    if approvals >= config.consensusThreshold AND blocks === 0:
      return { status: 'consensus', chatPool }

    if allParticipantsApproved(chatPool, round):
      return { status: 'unanimous', chatPool }

  return { status: 'no_consensus', chatPool }
```

### 4.6 Konsens-Regeln

| Situation | Ergebnis |
|-----------|----------|
| 2+ @APPROVE, 0 @BLOCK | ✅ Konsens → GitHub Action triggern |
| 3 @APPROVE (einstimmig) | ✅ Starker Konsens |
| 1+ @BLOCK | ❌ Nächste Runde, Blocker muss begründen |
| @NEEDS_DISCUSSION | ⏸ Nächste Runde, alle reagieren auf die Frage |
| maxRounds erreicht ohne Konsens | ⚠️ Status: `no_consensus`, an Chain-Controller oder Web-Opus |

### 4.7 Patch-Ownership

Wenn mehrere Modelle @PATCH-Befehle schreiben, gilt:
- Der LETZTE @PATCH pro Datei gewinnt (neueste Runde)
- Wenn zwei Modelle in der SELBEN Runde die gleiche Datei patchen:
  → Nächste Runde erzwingen, Modelle müssen sich einigen

---

## 5. Chain-Controller (Weg 2 — Opus API)

### 5.1 Zweck

Bei Task-Ketten entscheidet eine Opus-API-Instanz zwischen den Tasks:
Weiter wie geplant? Task anpassen? Stoppen?

### 5.2 Ablauf

```
Chain: [Task 1, Task 2, Task 3]

→ Task 1: Scout → Roundtable → Konsens → GitHub Action → Commit
→ Chain-Controller (Opus API):
    Input: Task-1-Ergebnis + Task-2-Definition + opusHints
    Output: { decision: 'continue' | 'adjust' | 'stop',
              adjustedHints?: '...',
              adjustedGoal?: '...',
              reason: '...' }
→ Task 2: (ggf. mit angepassten Hints) Scout → Roundtable → ...
→ Chain-Controller: prüft Task-2-Ergebnis...
→ Task 3: ...
→ Chain fertig → Web-Opus kann Gesamtergebnis abrufen
```

### 5.3 Chain-Controller Prompt

```
Du bist der Chain-Controller für eine Task-Kette im Soulmatch Builder.
Dein Job: Entscheide ob die Kette wie geplant weiterlaufen soll.

=== BISHERIGE KETTE ===
{previousTasks mit Status, Diff, Reviews}

=== LETZTER TASK (gerade abgeschlossen) ===
Titel: {lastTask.title}
Status: {lastTask.status}
Diff: {lastTask.diff}
ChatPool-Zusammenfassung: {lastTask.chatPoolSummary}
Konsens: {lastTask.consensusType}

=== NÄCHSTER GEPLANTER TASK ===
Titel: {nextTask.title}
Ziel: {nextTask.goal}
opusHints: {nextTask.opusHints}

=== DEINE ENTSCHEIDUNG ===
Antworte NUR mit JSON:
{
  "decision": "continue | adjust | stop",
  "reason": "Kurze Begründung",
  "adjustedGoal": "Neues Ziel falls adjust (optional)",
  "adjustedHints": "Angepasste Hints falls adjust (optional)",
  "skipToIndex": null // Task-Index überspringen falls sinnvoll
}
```

### 5.4 Chain-Controller Config

```typescript
interface ChainControllerConfig {
  model: string;               // 'claude-opus-4-6'
  provider: string;            // 'anthropic'
  maxTokens: number;           // 1000 — Entscheidungen sollen kurz sein
  autoApproveThreshold: number; // z.B. 3 (wenn Roundtable einstimmig → kein Controller nötig)
}
```

### 5.5 Kosten Chain-Controller

| | Tokens | Preis (Opus 4.6) | Kosten |
|--|--------|-------------------|--------|
| Input | ~4.000 (Kontext + Diff + Reviews) | $5.00/1M | $0.020 |
| Output | ~300 (Entscheidung) | $25.00/1M | $0.008 |
| **Pro Zwischen-Entscheidung** | | | **~$0.03** |

Bei einer 5er-Kette: 4 Zwischen-Entscheidungen ≈ $0.12.

---

## 6. Endpoints

### 6.1 Auth

```
OPUS_BRIDGE_SECRET=opus-<zufällig-32-zeichen>    (in Render Env Vars)
```

Alle Endpoints erfordern: `?opus_token=...` oder `Authorization: Bearer opus-...`

### 6.2 POST /api/builder/opus-bridge/execute

Erstellt einen Task und führt ihn durch Scout → Roundtable → (ggf. GitHub Action).

**Request:**
```json
{
  "instruction": "Erstelle server/src/lib/rateLimiter.ts mit Token-Bucket Algorithmus",
  "context": "Wird für die API-Routen gebraucht.",
  "scope": ["server/src/lib/rateLimiter.ts"],
  "notScope": ["client/"],
  "risk": "low",
  "taskType": "A",
  "opusHints": "Keine externen Pakete. Nur native Node.js + TypeScript.",

  "scoutConfig": {
    "enabled": true,
    "parallel": true
  },

  "roundtableConfig": {
    "maxRounds": 4,
    "consensusThreshold": 2
  },

  "waitForCompletion": true,
  "timeoutMs": 180000
}
```

**Response:**
```json
{
  "taskId": "uuid",
  "status": "consensus | no_consensus | blocked | timeout",
  "title": "Rate Limiter erstellen",

  "scoutBriefing": {
    "codebase": "14 Dateien in lib/, kein bestehendes Rate-Limiting...",
    "patterns": "Express-Middleware Pattern überall, Konvention: export function...",
    "web": "Token-Bucket ist Standard, Sliding Window für Burst..."
  },

  "chatPool": [
    {
      "round": 0, "phase": "scout", "actor": "deepseek",
      "content": "Codebase-Analyse: ...", "tokensUsed": 800
    },
    {
      "round": 1, "phase": "roundtable", "actor": "opus",
      "content": "Ich schlage Token-Bucket vor... @PATCH ...", "tokensUsed": 1800
    },
    {
      "round": 1, "phase": "roundtable", "actor": "gpt-5.4",
      "content": "Guter Ansatz. Race Condition in Zeile 23...", "tokensUsed": 1200
    },
    {
      "round": 1, "phase": "roundtable", "actor": "gemini",
      "content": "@SEARCH bestätigt: Token-Bucket + Mutex ist Best Practice. @APPROVE",
      "tokensUsed": 600
    },
    {
      "round": 2, "phase": "roundtable", "actor": "opus",
      "content": "Race Condition gefixt: Atomic Counter... @PATCH ... @APPROVE",
      "tokensUsed": 1500
    },
    {
      "round": 2, "phase": "roundtable", "actor": "gpt-5.4",
      "content": "Jetzt sauber. @APPROVE", "tokensUsed": 200
    }
  ],

  "consensusType": "unanimous",
  "diff": "@@ -0,0 +1,45 @@\n+export function createRateLimiter...",
  "filesChanged": ["server/src/lib/rateLimiter.ts"],
  "commitHash": "a3f4b2c",
  "runUrl": "https://github.com/.../runs/...",

  "costs": {
    "scoutTokens": 2100,
    "roundtableTokens": 5300,
    "totalTokens": 7400,
    "estimatedCost_usd": 0.18,
    "durationMs": 42000
  },

  "session": {
    "tasksUsed": 1,
    "tasksRemaining": 19,
    "tokensUsed": 7400,
    "tokensRemaining": 92600
  }
}
```

### 6.3 GET /api/builder/opus-bridge/observe/:taskId

Voller Röntgenblick auf einen Task. Identisches Response-Format wie execute,
plus raw BDL-Befehle und Execution-Details.

### 6.4 POST /api/builder/opus-bridge/override/:taskId

Opus greift ein.

**Request:**
```json
{
  "action": "approve | block | retry | delete | inject",
  "reason": "Review war zu konservativ. Code ist korrekt.",
  "retryHints": "Fokus auf Edge-Case bei leeren Arrays.",
  "injectMessage": "Hinweis ans Team: Der Endpunkt muss auch ohne Auth funktionieren."
}
```

**Aktionen:**
- `approve`: Erzwingt Genehmigung → GitHub Action
- `block`: Stoppt Task
- `retry`: Startet Roundtable neu mit neuen Hints
- `delete`: Löscht alles inkl. Memory und ChatPool
- `inject`: Fügt eine Nachricht ins ChatPool ein die alle Modelle
  in der nächsten Runde sehen (als `[opus-override]`)

### 6.5 POST /api/builder/opus-bridge/chain

Task-Kette mit Chain-Controller (Opus API) als Zwischen-Entscheider.

**Request:**
```json
{
  "name": "Rate Limiter komplett",
  "tasks": [
    {
      "instruction": "Erstelle server/src/lib/rateLimiter.ts",
      "scope": ["server/src/lib/rateLimiter.ts"],
      "risk": "low",
      "opusHints": "Token-Bucket + Sliding Window"
    },
    {
      "instruction": "Integriere rateLimiter als Middleware in alle Builder-Endpoints",
      "scope": ["server/src/routes/builder.ts"],
      "dependsOn": 0,
      "risk": "medium"
    },
    {
      "instruction": "Integriere rateLimiter in alle Studio-Endpoints",
      "scope": ["server/src/routes/studio.ts"],
      "dependsOn": 0,
      "risk": "medium"
    }
  ],
  "chainController": {
    "enabled": true,
    "autoSkipIfUnanimous": true
  },
  "stopOnBlock": true,
  "waitForCompletion": true,
  "timeoutMs": 600000
}
```

**Dependency-Graph:** `dependsOn: 0` heißt "warte auf Task 0".
Tasks ohne `dependsOn` können theoretisch parallel laufen (Phase 2+).
`dependsOn: null` = kann sofort starten.

**Response:**
```json
{
  "chainId": "uuid",
  "name": "Rate Limiter komplett",
  "chainStatus": "done | partial | blocked | timeout",
  "tasks": [
    { "index": 0, "taskId": "uuid", "status": "consensus", "commitHash": "...",
      "controllerDecision": null },
    { "index": 1, "taskId": "uuid", "status": "consensus", "commitHash": "...",
      "controllerDecision": { "decision": "continue", "reason": "..." } },
    { "index": 2, "taskId": "uuid", "status": "consensus", "commitHash": "...",
      "controllerDecision": { "decision": "adjust", "reason": "...", "adjustedHints": "..." } }
  ],
  "totalCosts": { "tokens": 28000, "estimatedCost_usd": 0.72, "durationMs": 180000 },
  "commits": ["a3f4b2c", "d2e1f4a", "b8c9d0e"]
}
```

### 6.6 GET /api/builder/opus-bridge/audit

Meta-Observer: Überblick über die gesamte Builder-Gesundheit.

**Query-Params:** `?since=2026-04-05&limit=50`

**Response:**
```json
{
  "summary": {
    "totalTasks": 27,
    "consensus": 18,
    "noConsensus": 2,
    "blocked": 7,
    "successRate": 66.7,
    "avgTokensPerTask": 7400,
    "avgDuration_ms": 42000,
    "totalCost_usd": 4.20
  },

  "teamStats": {
    "opus": {
      "roundsParticipated": 54,
      "patchesWritten": 22,
      "approvalsGiven": 20,
      "blocksGiven": 3,
      "ideasAdopted": 15,
      "avgTokensPerRound": 1800
    },
    "gpt-5.4": {
      "roundsParticipated": 54,
      "patchesWritten": 5,
      "approvalsGiven": 19,
      "blocksGiven": 8,
      "edgeCasesFound": 12,
      "avgTokensPerRound": 1200
    },
    "gemini": {
      "roundsParticipated": 54,
      "searchesPerformed": 27,
      "approvalsGiven": 22,
      "blocksGiven": 2,
      "avgTokensPerRound": 600
    }
  },

  "scoutStats": {
    "deepseek": { "scoutsRun": 27, "avgTokens": 800, "totalCost_usd": 0.08 },
    "gpt-nano": { "scoutsRun": 27, "avgTokens": 400, "totalCost_usd": 0.03 },
    "gemini":   { "scoutsRun": 27, "avgTokens": 500, "totalCost_usd": 0.04 }
  },

  "commonBlockReasons": [
    { "reason": "race_condition", "count": 4, "foundBy": "gpt-5.4" },
    { "reason": "scope_violation", "count": 2, "foundBy": "opus" },
    { "reason": "missing_error_handling", "count": 1, "foundBy": "gpt-5.4" }
  ],

  "consensusPatterns": {
    "avgRoundsToConsensus": 2.1,
    "firstRoundConsensus": 8,
    "unanimousRate": 44.4
  }
}
```

### 6.7 POST /api/builder/opus-bridge/worker-direct

Direkte Kommunikation mit einem beliebigen Modell ohne Task.

**Request:**
```json
{
  "worker": "opus | gpt-5.4 | gemini | deepseek | gpt-nano",
  "model": "claude-opus-4-6",
  "system": "Du bist ein TypeScript-Experte...",
  "message": "Analysiere diese Funktion auf Race Conditions: ...",
  "maxTokens": 2000
}
```

### 6.8 GET /api/builder/opus-bridge/memory

Liest die 3-Schichten Builder-Memory + ChatPool-Historie.

### 6.9 POST /api/builder/opus-bridge/reset-session

Setzt Session-Counter zurück (Tasks + Tokens).

---

## 7. Auth & Sicherheit

### Token
```
OPUS_BRIDGE_SECRET=opus-<zufällig-32-zeichen>   (Render Env Var)
```

### Blacklist (Bridge-Dateien)
Zusätzlich zur bestehenden Blacklist:
```
server/src/routes/opusBridge.ts
server/src/lib/opusBridgeController.ts
server/src/lib/opusChatPool.ts
server/src/lib/opusChainController.ts
server/src/lib/opusScoutRunner.ts
server/src/schema/opusBridge.ts
```

### Audit-Log
```sql
CREATE TABLE builder_opus_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action      VARCHAR(30) NOT NULL,
  task_id     UUID,
  chain_id    UUID,
  input       JSONB NOT NULL,
  output      JSONB NOT NULL,
  tokens_used INTEGER DEFAULT 0,
  cost_usd    DECIMAL(10,6),
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Budget-Gate
- Max 20 Tasks pro Session
- Max 100.000 Tokens pro Session
- Sichtbar in jeder Response unter `session`
- Reset per `/reset-session`

### Sicherheits-Zusammenfassung

| Risiko | Schutz |
|--------|--------|
| Bridge modifiziert sich selbst | Erweiterte Blacklist |
| Endlos-Loop im Roundtable | maxRounds + Token-Budget |
| Kosten-Explosion | Session-Budget + pro-Task Budget |
| Worker-Halluzination | Team-Konsens (2+ Modelle müssen zustimmen) |
| Chain läuft ins Leere | Chain-Controller prüft jeden Schritt |
| Unautorisierter Zugriff | Eigener OPUS_BRIDGE_SECRET |
| Patch-Konflikte | Letzter Patch gewinnt + Konsens-Runde |

---

## 8. Implementierungsplan

### Phase 1 — Fundament (1 Abend)
- [ ] DB-Schema: `builder_chatpool`, `builder_opus_log`, `builder_chains`
- [ ] Auth-Middleware: `requireOpusToken()`
- [ ] Route-Skeleton: alle Endpoints als Stubs
- [ ] ChatPool-Modul: `addMessage()`, `formatForModel()`, `countApprovals()`

### Phase 2 — Scout + Roundtable (2 Abende)
- [ ] Scout-Runner: 3 Scouts parallel, Ergebnisse ins ChatPool
- [ ] Roundtable-Runner: Runden-Loop mit ChatPool-Kontext
- [ ] BDL-Execution für Roundtable-Teilnehmer (PATCH, FIND, READ)
- [ ] Konsens-Erkennung (@APPROVE/@BLOCK Parsing)
- [ ] `execute` Endpoint komplett

### Phase 3 — Chain-Controller (1 Abend)
- [ ] Chain-Controller mit Opus API als Zwischen-Entscheider
- [ ] Dependency-Graph Auflösung
- [ ] `chain` Endpoint komplett
- [ ] Auto-Skip bei einstimmigem Konsens

### Phase 4 — Beobachtung + Steuerung (1 Abend)
- [ ] `observe` — voller Röntgenblick
- [ ] `override` — approve/block/retry/delete/inject
- [ ] `audit` — Team-Statistiken
- [ ] `worker-direct` — direkte Modell-Kommunikation
- [ ] `memory` — Memory-Lesezugriff

### Phase 5 — Härtung + LIVE-PROBE (1 Abend)
- [ ] Budget-Gate + Session-Tracking
- [ ] Timeout-Handling mit graceful Cleanup
- [ ] Blacklist-Erweiterung
- [ ] LIVE-PROBE Verifikation aller Endpoints
- [ ] Kosten-Tracking in jeder Response

**Geschätzter Gesamtaufwand: 6-8 Abende**

### Neue Dateien
```
server/src/routes/opusBridge.ts           — Route-Handler
server/src/lib/opusBridgeController.ts    — Business-Logik (execute, chain)
server/src/lib/opusChatPool.ts            — ChatPool-Verwaltung
server/src/lib/opusScoutRunner.ts         — Scout-Phase
server/src/lib/opusRoundtable.ts          — Roundtable-Phase
server/src/lib/opusChainController.ts     — Chain-Entscheider
server/src/schema/opusBridge.ts           — DB-Schemas
```

### Minimale Änderungen an bestehenden Dateien
```
server/src/app.ts (oder wo Routen gemountet werden)
  → import + mount: app.use('/api/builder/opus-bridge', opusBridgeRouter)
  → 2 Zeilen

server/src/lib/builderDialogEngine.ts
  → NICHT geändert. Roundtable ersetzt die Engine für Opus-Tasks.
  → Bestehende Chat-UI (Gemini) nutzt weiterhin die alte Engine.
```

---

## 9. Kosten-Schätzung

### API-Preise (Stand April 2026, pro 1M Tokens)

| Modell | Input | Output | Rolle |
|--------|-------|--------|-------|
| Claude Opus 4.6 | $5.00 | $25.00 | Roundtable + Chain-Controller |
| GPT-5.4 | $2.50 | $15.00 | Roundtable |
| Gemini 3 Flash | $0.50 | $3.00 | Roundtable + Scout |
| DeepSeek V3.2 | $0.28 | $0.42 | Scout |
| GPT-5-nano | $0.05 | $0.40 | Scout |

### Pro Task (Scout + Roundtable, 2 Runden)

| Komponente | Modell | Input | Output | Kosten |
|-----------|--------|-------|--------|--------|
| Scout: Codebase | DeepSeek V3.2 | 2.000 | 800 | $0.001 |
| Scout: Pattern | GPT-5-nano | 2.000 | 400 | $0.000 |
| Scout: Web | Gemini 3 Flash | 1.500 | 500 | $0.003 |
| Runde 1: Opus | Opus 4.6 | 4.000 | 1.800 | $0.065 |
| Runde 1: GPT-5.4 | GPT-5.4 | 5.000 | 1.200 | $0.031 |
| Runde 1: Gemini | Gemini 3 Flash | 5.000 | 600 | $0.004 |
| Runde 2: Opus | Opus 4.6 | 7.000 | 1.500 | $0.073 |
| Runde 2: GPT-5.4 | GPT-5.4 | 8.000 | 200 | $0.023 |
| Runde 2: Gemini | Gemini 3 Flash | 8.000 | 300 | $0.005 |
| **Gesamt pro Task** | | | | **~$0.21** |

### Chain-Controller Kosten (Opus API pro Zwischen-Entscheid)

| | Tokens | Kosten |
|--|--------|--------|
| Input | ~4.000 (Diff + Reviews + nächster Task) | $0.020 |
| Output | ~300 (Entscheidung) | $0.008 |
| **Pro Entscheidung** | | **~$0.03** |

### Pro Abend (5 Tasks, 1 Kette mit 4 Entscheiden)

| Posten | Kosten |
|--------|--------|
| 5 Tasks × $0.21 | $1.05 |
| 4 Chain-Controller Entscheide × $0.03 | $0.12 |
| **Gesamt pro Abend** | **~$1.17** |

### Pro Monat (15 aktive Abende)

| Posten | Kosten |
|--------|--------|
| 75 Tasks × $0.21 | $15.75 |
| 60 Chain-Entscheide × $0.03 | $1.80 |
| **Gesamt pro Monat** | **~$18** |

---

## 10. Was sich für Gürcan ändert

### Vorher
```
Gürcan: "Bau Feature X"
Claude (Web): Schreibt Handoff-Dokument
Agent: Setzt um (1 Session = 1 Task)
Gürcan: Pusht
Claude (Web): Prüft → Korrektur nötig
Agent: Neue Session → Fix
Gürcan: Pusht nochmal
Claude (Web): Prüft → OK
→ 30-60 Minuten pro Feature, Gürcan als Mittelsmann
```

### Nachher
```
Gürcan: "Bau Feature X"
Claude (Web): Definiert Kette, schickt an Bridge
Server: Scout → Roundtable (Opus+GPT+Gemini diskutieren) → Konsens
        Chain-Controller → nächster Task → ... → Kette fertig
Claude (Web): LIVE-PROBE → "Fertig. 4 Commits, alles grün."
→ 5-10 Minuten pro Feature, Gürcan gibt nur das Ziel vor
```

---

## 11. Project DNA — Projektwissen für Worker

### 11.1 Was ist das Problem?

Die Worker bekommen den Task-Kontext, aber nicht den Projekt-Kontext. Sie wissen
nicht dass Soulmatch eine spirituelle App ist, dass Gürcan einfache Lösungen
bevorzugt, welche Patterns im Projekt gelten, oder was die Produktvision ist.

Ergebnis: Worker schreiben generischen Code statt Code der zum Projekt passt.

### 11.2 Lösung: project-dna.md

Eine kondensierte Datei die bei JEDEM Task als Teil des System-Prompts
an alle Roundtable-Teilnehmer und Scouts mitgegeben wird.

**Speicherort:** `docs/project-dna.md` (im Repo, versioniert)

**Inhalt:**

```markdown
# Soulmatch Project DNA

## Produkt
Soulmatch ist eine spirituelle Multi-Persona Chat-App. Nutzer chatten mit
KI-Personas die verschiedene esoterische Methoden beherrschen (BaZi, Vedisch,
Tarot, Chakren, Human Design). Die App soll warm, einladend und mystisch
wirken — nicht klinisch oder technisch.

## Tech-Stack & Konventionen
- TypeScript strict, React, Vite, Express, PostgreSQL (Supabase/Drizzle)
- Deployed auf Render (soulmatch-1.onrender.com)
- Express-Middleware Pattern für alle API-Routen
- Keine externen Pakete wenn eine native Lösung < 50 Zeilen möglich ist
- pnpm als Package Manager
- Git Bash only (kein PowerShell)

## Code-Stil
- Deutsch für Commit-Messages und Logs
- Englisch für Code, Variablennamen, Kommentare
- Funktionale Komponenten mit Hooks (kein Class-based React)
- Exports am Dateiende, nicht inline
- Utility-Funktionen in eigene Dateien unter lib/

## Architektur-Regeln
- CHAT_VISIBLE_BLACKLIST für geschützte Dateien respektieren
- Bestehende Patterns prüfen bevor neue erstellt werden (reuse-first)
- Audio/Mic: IMMER von DiscussionChat.tsx ableiten (do_not_rebuild)
- Server-Routen: Express Router mit Token-Auth
- DB: Drizzle ORM, Schema in server/src/schema/

## Kosten-Philosophie
- Billig wo möglich (DeepSeek, nano für Routine)
- Stark wo nötig (Opus, GPT-5.4 für Architektur)
- Keine unnötigen API-Calls (cachen, batchen, local-first)

## Qualitäts-Anspruch
- Jede Datei muss durch pnpm typecheck + pnpm build
- Kein toter Code, keine auskommentierten Blöcke
- Fehler-Handling: try/catch mit spezifischen Fehlermeldungen
- Logging mit devLogger, nicht console.log

## Gürcans Arbeitsweise
- Solo-Entrepreneur, kein CS-Hintergrund
- Bevorzugt Metaphern und klare Sprache über Fachjargon
- Arbeitet abends, typischerweise 2-3 Stunden Sessions
- Cross-checkt Outputs zwischen Claude und ChatGPT
- Gibt klare Ziele vor, erwartet autonome Umsetzung
```

### 11.3 Wie wird Project DNA injiziert?

In den Roundtable System-Prompt, VOR den Stärken und BDL-Befehlen:

```
=== PROJEKT-DNA ===
{project-dna.md Inhalt}

=== DEINE STÄRKE ===
{strengths}

=== TEAMARBEIT ===
...
```

### 11.4 Pflege

- Web-Opus aktualisiert die Datei wenn sich Konventionen ändern
- Versioniert im Repo → Änderungen nachvollziehbar
- Maximal 800 Tokens um die Worker-Prompts nicht aufzublähen
- Wird NICHT von Workern geändert (read-only für KI)

---

## 12. Architecture Graph Integration

### 12.1 Graph-Scout (Phase 0, vierter Scout)

Der Graph-Scout ist KEIN LLM-Aufruf — er ist rein programmatisch.
Er liest den Architecture Graph und generiert einen kontextreichen Briefing.

**Ablauf:**
```typescript
async function runGraphScout(task: TaskInput): Promise<ChatPoolMessage> {
  const graph = loadArchitectureGraph();  // aus architecture/ Ordner
  
  // 1. Start-Pack: Entry Points, Hotspots, Regeln
  const startPack = generateStartPack(graph, task.scope);
  
  // 2. Task-Pack: Ziel-Nodes, Related Nodes, Guardrails
  const taskPack = generateTaskPack(graph, task);
  
  // 3. Error-Cards: bekannte Probleme zu diesem Thema
  const errorCards = findRelevantErrorCards(graph, task);
  
  // 4. Reuse-Candidates: Edges die auf Wiederverwendung hinweisen
  const reuseCandidates = findReuseCandidates(graph, task.scope);
  
  // 5. Forbidden Zones: was NICHT angefasst werden darf
  const forbidden = findForbiddenZones(graph, task.scope);
  
  return {
    round: 0,
    phase: 'scout',
    actor: 'graph',
    model: 'programmatic',
    content: formatGraphBriefing({
      startPack, taskPack, errorCards, reuseCandidates, forbidden
    }),
    tokensUsed: 0,  // kein LLM = keine Kosten
    durationMs: 5,  // Millisekunden, nicht Sekunden
  };
}
```

**Output-Format (ins ChatPool):**
```
[graph-scout] Architecture Graph Briefing:

ENTRY POINTS:
  • m08-discussion-chat → M08_studio-chat (canonical, repo_verified, ⚠ do_not_rebuild)
  • arcana-api → arcana.ts (supported, repo_verified, seam)

HOTSPOTS (aktive Baustellen):
  • arcana-creator-chat → ArcanaCreatorChat.tsx (conf: 0.84, hotspot)

REUSE-KANDIDATEN:
  • arcana-creator-chat → discussion-chat-file (copy_exact, conf: 0.88)
    Grund: pauseSpeechForAudio + scheduleResumeSpeech overlap

VERBOTEN:
  • audio-mic-rule: Kein neues Audio/Mic-System bauen

BEKANNTE FEHLER zu diesem Bereich:
  • err-001: Race Condition bei concurrent Counter-Zugriffen (gelöst mit Atomic Lock)
  • err-003: FK-Constraint bei Delete-Kaskaden (builder_memory vor builder_tasks löschen)

EMPFOHLENE REIHENFOLGE:
  1. discussion-chat-file → 2. use-speech-to-text → 3. arcana-creator-chat
```

### 12.2 Post-Task Graph-Update

Nach jedem abgeschlossenen Task aktualisiert der Server den Graph automatisch:

```typescript
async function updateGraphAfterTask(
  taskResult: TaskResult,
  graph: ArchitectureGraph
): Promise<GraphDelta> {
  const delta: GraphDelta = { nodes: [], edges: [], events: [] };
  
  // 1. Bearbeitete Nodes → status aktualisieren
  for (const file of taskResult.filesChanged) {
    const node = graph.findNodeByPath(file);
    if (node) {
      delta.nodes.push({
        id: node.id,
        status: taskResult.status === 'consensus' ? 'done' : node.status,
        verification: 'repo_verified',
        confidence: taskResult.consensusType === 'unanimous' ? 0.95 : 0.85,
        updated_at: new Date().toISOString(),
      });
    }
  }
  
  // 2. Neue Dateien → neue Nodes erstellen
  for (const file of taskResult.newFiles) {
    delta.nodes.push({
      id: generateNodeId(file),
      kind: 'file',
      name: path.basename(file),
      path: file,
      section_id: inferSection(file),
      status: 'done',
      canonicality: 'supported',  // neu = supported, nicht canonical
      verification: 'repo_verified',
      confidence: 0.80,
      ai_note: `Erstellt von Opus-Bridge Task ${taskResult.taskId}`,
    });
  }
  
  // 3. Event ins Ledger
  delta.events.push({
    ts: new Date().toISOString(),
    actor: 'opus-bridge',
    type: 'task_completed',
    target: taskResult.taskId,
    reason: taskResult.title,
    confidence: taskResult.consensusType === 'unanimous' ? 0.95 : 0.85,
    source: 'opus_bridge',
    files: taskResult.filesChanged,
  });
  
  // 4. Graph-Dateien schreiben
  await writeGraphDelta(delta);
  
  return delta;
}
```

### 12.3 Graph-getriebene Task-Generierung

Der Chain-Controller kann den Graph lesen und den nächsten Task ABLEITEN
statt nur blind der vordefinierten Kette zu folgen.

```typescript
function suggestNextTaskFromGraph(graph: ArchitectureGraph): TaskSuggestion | null {
  // Alle planned Nodes deren Abhängigkeiten done sind
  const ready = graph.nodes
    .filter(n => n.status === 'planned')
    .filter(n => {
      const deps = graph.edges
        .filter(e => e.from === n.id && e.type === 'depends_on');
      return deps.every(d => {
        const target = graph.findNode(d.to);
        return target?.status === 'done';
      });
    })
    .sort((a, b) => {
      // Priorität: hotspot > task_target > normal
      const priority = (n: Node) => 
        n.roles?.includes('hotspot') ? 3 :
        n.roles?.includes('task_target') ? 2 : 1;
      return priority(b) - priority(a);
    });
  
  if (ready.length === 0) return null;
  
  const next = ready[0];
  return {
    instruction: `Implementiere ${next.name}: ${next.summary}`,
    scope: [next.path],
    relatedNodes: graph.getRelatedNodes(next.id),
    opusHints: next.ai_note || undefined,
  };
}
```

### 12.4 Mutation Policy

Aus dem graph.meta.json — Worker dürfen NICHT alles ändern:

| Feld | Worker dürfen direkt | Worker müssen vorschlagen |
|------|---------------------|--------------------------|
| status | ✅ | |
| ai_note | ✅ | |
| risk_flag | ✅ | |
| task_overlay | ✅ | |
| event_entry | ✅ | |
| canonicality | | ⚠️ nur Vorschlag |
| forbidden | | ⚠️ nur Vorschlag |
| new_trunk | | ⚠️ nur Vorschlag |

Vorschläge gehen als `type: edge_proposed` ins Event-Ledger.
Web-Opus oder Gürcan entscheiden.

---

## 13. Verification Loop — LIVE-PROBE nach Deploy

### 13.1 Zweck

Aktuell endet die Pipeline bei "GitHub Action hat Commit gepusht".
Das heißt nicht dass der Code funktioniert. Der Verification Loop
schließt diese Lücke.

### 13.2 Ablauf

```
Roundtable → Konsens → GitHub Action → Commit → Render Deploy
    ↓
  Deploy erkannt (Webhook oder Poll auf Render Status API)
    ↓
  Verification Tests laufen automatisch:
    1. Health-Check: curl auf / → 200?
    2. Endpoint-Test: curl auf betroffene API-Route → erwartete Response?
    3. TypeCheck: Deployment-Build erfolgreich?
    4. Optional: Screenshot einer betroffenen UI-Seite
    5. Optional: Audio-Analyse wenn TTS betroffen
    ↓
  Ergebnis → Graph-Update:
    ✅ Alles grün → verification: runtime_verified, confidence: 0.95
    ❌ Fehler → verification: conflict, Error-Card erstellen
```

### 13.3 Verification Config (pro Task konfigurierbar)

```typescript
interface VerificationConfig {
  enabled: boolean;                    // default: true
  waitForDeploy: boolean;             // auf Render Deploy warten (default: true)
  deployTimeoutMs: number;            // max Wartezeit auf Deploy (default: 300000)
  
  checks: {
    healthCheck: boolean;              // curl auf / (default: true)
    endpointTests: Array<{            // spezifische Endpoint-Tests
      method: 'GET' | 'POST';
      path: string;
      body?: Record<string, unknown>;
      expectedStatus: number;
      expectedContains?: string;       // Response muss diesen String enthalten
    }>;
    screenshot?: {                     // Puppeteer Screenshot
      url: string;
      waitForSelector?: string;
    };
    audioCheck?: {                     // TTS Audio-Analyse
      endpoint: string;
      body: Record<string, unknown>;
      expectPcm: boolean;
      expectMinDurationSec: number;
    };
  };
  
  onFailure: 'error_card_only' | 'auto_rollback' | 'retry_once';
}
```

### 13.4 Default Verification

Wenn keine spezifische Config angegeben wird:

```typescript
const DEFAULT_VERIFICATION: VerificationConfig = {
  enabled: true,
  waitForDeploy: true,
  deployTimeoutMs: 300000,
  checks: {
    healthCheck: true,
    endpointTests: [],   // keine spezifischen Tests
  },
  onFailure: 'error_card_only',
};
```

### 13.5 Deploy-Erkennung

Zwei Optionen:

**Option A — Poll (einfach):**
```typescript
async function waitForDeploy(commitHash: string, timeoutMs: number): Promise<boolean> {
  const startTime = Date.now();
  while (Date.now() - startTime < timeoutMs) {
    const response = await fetch('https://soulmatch-1.onrender.com/api/health');
    const data = await response.json();
    if (data.commitHash === commitHash) return true;
    await delay(15000);  // alle 15s prüfen
  }
  return false;
}
```
Voraussetzung: `/api/health` Endpoint der den aktuellen Commit-Hash zurückgibt.

**Option B — Render Deploy Hook (besser):**
Render kann Webhooks bei Deploy-Events senden.
→ Endpoint: `POST /api/builder/opus-bridge/deploy-hook`

### 13.6 Kosten

Null. Verification nutzt curl und programmatische Checks, keine LLM-Aufrufe.

---

## 14. Error Learning — Fehler als Wissens-Karten

### 14.1 Zweck

Wenn ein Task geblockt wird oder die Verification fehlschlägt, geht Wissen
verloren. Der gleiche Fehler kann morgen wieder passieren weil kein Worker
sich erinnert.

Error Learning speichert Fehler als strukturierte Karten und injiziert
sie bei ähnlichen Tasks automatisch als Warnung.

### 14.2 Error-Card Struktur

```typescript
interface ErrorCard {
  id: string;                    // z.B. "err-bridge-001"
  title: string;                 // "FK-Constraint bei Delete-Kaskaden"
  category: string;              // "database" | "api" | "ui" | "tts" | "auth"
  tags: string[];                // ["delete", "foreign-key", "memory"]
  
  problem: string;               // Was ging schief?
  rootCause: string;             // Warum?
  solution: string;              // Wie wurde es gelöst?
  
  affectedFiles: string[];       // Welche Dateien waren betroffen?
  affectedNodes: string[];       // Graph-Node-IDs
  
  source: {
    taskId: string;              // Welcher Task hat den Fehler produziert?
    round: number;               // In welcher Runde?
    foundBy: string;             // Welches Modell hat ihn gefunden?
    blockReason: string;         // Original Block-Grund
  };
  
  prevention: string;            // Wie verhindert man den Fehler in Zukunft?
  severity: 'low' | 'medium' | 'high';
  
  createdAt: string;
  resolvedAt?: string;
}
```

### 14.3 Automatische Error-Card Generierung

Nach jedem Block oder Verification-Fehler:

```typescript
async function generateErrorCard(
  task: Task,
  chatPool: ChatPoolMessage[],
  blockReason: string
): Promise<ErrorCard> {
  // Der Chain-Controller (Opus API) extrahiert die Essenz
  const response = await callProvider('anthropic', 'claude-opus-4-6', {
    system: 'Extrahiere aus dem folgenden Task-Verlauf eine Error-Card. Antworte NUR mit JSON.',
    messages: [{
      role: 'user',
      content: `Task: ${task.title}\nBlock-Grund: ${blockReason}\n\nChatPool:\n${formatChatPool(chatPool)}\n\nErstelle eine Error-Card mit: title, category, tags, problem, rootCause, solution, prevention, severity.`
    }],
    maxTokens: 500,
  });
  
  return parseErrorCard(response, task);
}
```

### 14.4 Error-Card Speicherung

```sql
CREATE TABLE builder_error_cards (
  id            VARCHAR(30) PRIMARY KEY,
  title         VARCHAR(200) NOT NULL,
  category      VARCHAR(20) NOT NULL,
  tags          JSONB DEFAULT '[]',
  problem       TEXT NOT NULL,
  root_cause    TEXT NOT NULL,
  solution      TEXT NOT NULL,
  prevention    TEXT NOT NULL,
  affected_files JSONB DEFAULT '[]',
  affected_nodes JSONB DEFAULT '[]',
  source_task_id UUID REFERENCES builder_tasks(id),
  found_by      VARCHAR(20),
  severity      VARCHAR(10) DEFAULT 'medium',
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at   TIMESTAMP WITH TIME ZONE
);
```

### 14.5 Error-Card Injection in Scout-Phase

Der Graph-Scout sucht passende Error-Cards und injiziert sie:

```typescript
function findRelevantErrorCards(
  task: TaskInput,
  errorCards: ErrorCard[]
): ErrorCard[] {
  return errorCards.filter(card => {
    // Match auf betroffene Dateien
    const fileOverlap = card.affectedFiles.some(f =>
      task.scope?.some(s => f.includes(s) || s.includes(f))
    );
    // Match auf Tags
    const tagOverlap = card.tags.some(t =>
      task.instruction.toLowerCase().includes(t)
    );
    return fileOverlap || tagOverlap;
  });
}
```

Im ChatPool erscheint das dann als:

```
[graph-scout] ⚠️ BEKANNTE FEHLER zu diesem Bereich:

err-bridge-001: FK-Constraint bei Delete-Kaskaden
  Problem: Delete auf builder_tasks scheiterte weil builder_memory FK hatte
  Lösung: deleteBuilderMemoryForTask() VOR db.delete(builderTasks) aufrufen
  Prävention: Bei jeder Delete-Kaskade alle FK-Tabellen prüfen
  Betrifft: builderFusionChat.ts, builderMemory.ts
```

### 14.6 Cross-Link mit AICOS

Error-Cards können perspektivisch auch als AICOS-Karten exportiert werden:

```typescript
function errorCardToAicos(card: ErrorCard): AicosCard {
  return {
    id: card.id,
    type: card.solution ? 'solution' : 'error',
    title: card.title,
    tags: card.tags,
    content: {
      problem: card.problem,
      root_cause: card.rootCause,
      solution: card.solution,
      prevention: card.prevention,
    },
    crossing_origin: `opus-bridge:${card.source.taskId}`,
  };
}
```

### 14.7 Kosten

~$0.03 pro Error-Card (ein Opus-API Aufruf für die Extraktion).
Bei 5-10 Blocks pro Monat: ~$0.15-0.30/Monat.

---

## 15. Neuer Implementierungsplan (v3.0)

### Phase 1 — Fundament (1 Abend)
- [ ] DB-Schemas: builder_chatpool, builder_opus_log, builder_chains, builder_error_cards
- [ ] Auth-Middleware: requireOpusToken()
- [ ] Route-Skeleton: alle Endpoints als Stubs
- [ ] ChatPool-Modul: addMessage(), formatForModel(), countApprovals()
- [ ] project-dna.md erstellen und ins Repo committen

### Phase 2 — Scout + Graph (1 Abend)
- [ ] Graph-Scout: Architecture Graph lesen, Start-Pack + Task-Pack generieren
- [ ] LLM-Scouts: DeepSeek, nano, Gemini parallel
- [ ] Error-Card Injection in Scout-Briefing
- [ ] Project DNA Injection in System-Prompts

### Phase 3 — Roundtable (2 Abende)
- [ ] Roundtable-Runner: Runden-Loop mit ChatPool
- [ ] BDL-Execution für alle Teilnehmer
- [ ] Konsens-Erkennung (@APPROVE/@BLOCK/@NEEDS_DISCUSSION)
- [ ] Patch-Ownership bei mehreren Patches pro Datei
- [ ] execute Endpoint komplett

### Phase 4 — Chain + Graph-Updates (1-2 Abende)
- [ ] Chain-Controller mit Opus API
- [ ] Dependency-Graph Auflösung
- [ ] Post-Task Graph-Updates (Nodes, Edges, Events)
- [ ] Graph-getriebene Task-Suggestion
- [ ] chain Endpoint komplett

### Phase 5 — Verification + Error Learning (1 Abend)
- [ ] /api/health Endpoint mit Commit-Hash
- [ ] Deploy-Erkennung (Poll oder Webhook)
- [ ] Verification-Checks: Health, Endpoint, Screenshot, Audio
- [ ] Error-Card Generierung bei Block/Verification-Fehler
- [ ] Graph-Update mit Verification-Ergebnis

### Phase 6 — Beobachtung + Härtung (1 Abend)
- [ ] observe — voller Röntgenblick
- [ ] override — approve/block/retry/delete/inject
- [ ] audit — Team-Statistiken + Error-Card Übersicht
- [ ] worker-direct — direkte Modell-Kommunikation
- [ ] Budget-Gate, Rate-Limiting, Blacklist

**Geschätzter Gesamtaufwand: 7-9 Abende**

### Neue Dateien
```
server/src/routes/opusBridge.ts              — Route-Handler
server/src/lib/opusBridgeController.ts       — Business-Logik
server/src/lib/opusChatPool.ts               — ChatPool-Verwaltung
server/src/lib/opusScoutRunner.ts            — Scout-Phase (LLM + Graph)
server/src/lib/opusRoundtable.ts             — Roundtable-Phase
server/src/lib/opusChainController.ts        — Chain-Entscheider
server/src/lib/opusGraphIntegration.ts       — Graph lesen/schreiben
server/src/lib/opusVerification.ts           — Post-Deploy Checks
server/src/lib/opusErrorLearning.ts          — Error-Card Generierung
server/src/schema/opusBridge.ts              — DB-Schemas
docs/project-dna.md                          — Projekt-DNA
architecture/                                — Architecture Graph (aus Reference Pack)
```

---

## 16. Gesamtkosten v3.0

### Pro Task (Scout + Graph + Roundtable + Verification + ggf. Error-Card)

| Komponente | Kosten |
|-----------|--------|
| Graph-Scout | $0.000 (programmatisch) |
| LLM-Scouts (3×) | $0.004 |
| Roundtable 2 Runden (Opus + GPT-5.4 + Gemini) | $0.200 |
| Verification | $0.000 (curl, kein LLM) |
| Error-Card (nur bei Block) | $0.030 |
| **Gesamt pro Task** | **~$0.21** |

### Pro Monat (15 Abende × 5 Tasks)

| Posten | Kosten |
|--------|--------|
| 75 Tasks | $15.75 |
| 60 Chain-Controller Entscheide | $1.80 |
| ~15 Error-Cards | $0.45 |
| **Gesamt pro Monat** | **~$18** |

---

## 17. Vision: Vom Builder zur selbstregulierenden Einheit

### Phase A — Builder (jetzt)
Soulmatch-Entwicklung. Opus-Bridge steuert, Worker bauen,
Graph dokumentiert, Errors werden gelernt.

### Phase B — Multi-App (nach Soulmatch 1.0)
Architecture Graph bekommt weitere Trunks: Maya Core, Bluepilot, AICOS.
Jeder Trunk hat eigene Nodes, aber Edges verbinden sie cross-trunk.
Worker können App-übergreifend arbeiten.

### Phase C — Selbstoptimierung (langfristig)
Das System analysiert seine eigene Performance:
- Welche Modell-Kombination produziert die besten Ergebnisse?
- Welche Task-Typen brauchen volle Roundtable, welche nur Opus allein?
- Wo entstehen die meisten Blocks und warum?
- Auto-Tuning der Scout/Roundtable-Config basierend auf Erfolgsraten.

### Phase D — Über App-Entwicklung hinaus
Error-Cards → AICOS-Karten → Crush-Evidence → Maya-Memory.
Das Wissen aus der Entwicklung fließt in die Apps selbst:
Soulmatch lernt aus seinen eigenen Baufehlern.

---

## 18. Render API Integration

### 18.1 Voraussetzung

Ein Render API Key wird benötigt:
- Erstellen unter: Render Dashboard → Account Settings → API Keys
- Speichern als Env Var: `RENDER_API_KEY` in Render selbst (self-referencing)
- Service-ID: `RENDER_SERVICE_ID=srv-d69537c9c44c7384tl50` (aus Dashboard URL)

### 18.2 Verfügbare Aktionen

```typescript
const RENDER_API = 'https://api.render.com/v1';
const headers = {
  'Authorization': `Bearer ${process.env.RENDER_API_KEY}`,
  'Content-Type': 'application/json',
};

// Deploy-Status abfragen
async function getLatestDeploy(): Promise<RenderDeploy> {
  const res = await fetch(
    `${RENDER_API}/services/${RENDER_SERVICE_ID}/deploys?limit=1`,
    { headers }
  );
  const deploys = await res.json();
  return deploys[0];
}

// Deploy triggern (nach Commit)
async function triggerDeploy(commitId?: string): Promise<string> {
  const res = await fetch(
    `${RENDER_API}/services/${RENDER_SERVICE_ID}/deploys`,
    { method: 'POST', headers, body: JSON.stringify({ commitId }) }
  );
  const deploy = await res.json();
  return deploy.id;
}

// Deploy-Status warten
async function waitForDeploy(deployId: string, timeoutMs = 300000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const res = await fetch(
      `${RENDER_API}/services/${RENDER_SERVICE_ID}/deploys/${deployId}`,
      { headers }
    );
    const deploy = await res.json();
    if (deploy.status === 'live') return true;
    if (deploy.status === 'deactivated' || deploy.status === 'build_failed') return false;
    await delay(10000);
  }
  return false;
}

// Env Var setzen/aktualisieren
async function setEnvVar(key: string, value: string): Promise<void> {
  await fetch(
    `${RENDER_API}/services/${RENDER_SERVICE_ID}/env-vars/${key}`,
    { method: 'PUT', headers, body: JSON.stringify({ value }) }
  );
}

// Service neu starten
async function restartService(): Promise<void> {
  await fetch(
    `${RENDER_API}/services/${RENDER_SERVICE_ID}/restart`,
    { method: 'POST', headers }
  );
}

// Deploy abbrechen
async function cancelDeploy(deployId: string): Promise<void> {
  await fetch(
    `${RENDER_API}/services/${RENDER_SERVICE_ID}/deploys/${deployId}/cancel`,
    { method: 'POST', headers }
  );
}

// Service-Info (aktueller Commit, Status)
async function getServiceInfo(): Promise<RenderServiceInfo> {
  const res = await fetch(
    `${RENDER_API}/services/${RENDER_SERVICE_ID}`,
    { headers }
  );
  return res.json();
}
```

### 18.3 Integration in Verification Loop

Der Verification Loop (Kapitel 13) nutzt die Render API statt Polling:

```
Roundtable → Konsens → GitHub Action → Commit gepusht
  ↓
  Render API: getLatestDeploy() → Deploy erkannt
  ↓
  Render API: waitForDeploy(deployId) → Warten auf 'live'
  ↓
  Verification Tests (curl, Audio, etc.)
  ↓
  Bei Fehler:
    → Error-Card erstellen
    → Optional: cancelDeploy() oder Rollback zum vorherigen Commit
  Bei Erfolg:
    → Graph-Update: verification = runtime_verified
```

### 18.4 Automatische Env-Var Verwaltung

Wenn die Opus-Bridge zum ersten Mal deployed wird:
```typescript
// Bridge setzt ihren eigenen Token beim ersten Start
if (!process.env.OPUS_BRIDGE_SECRET) {
  const secret = crypto.randomBytes(32).toString('hex');
  await setEnvVar('OPUS_BRIDGE_SECRET', `opus-${secret}`);
  // Trigger Redeploy um neuen Token zu laden
  await triggerDeploy();
}
```

### 18.5 Sicherheit

- RENDER_API_KEY hat **volle Kontrolle** über den Service
- Muss auf Blacklist: nur die Opus-Bridge darf ihn verwenden
- Niemals in Logs oder Responses ausgeben
- In Env Var `RENDER_API_KEY` speichern, nicht im Code

---

## 19. Test-Infrastruktur (3 Stufen)

### Stufe 1 — API-Tests (sofort, in opusVerification.ts)

Node.js fetch() Tests direkt auf dem Server. Null Dependencies.

```typescript
interface EndpointTest {
  name: string;
  method: 'GET' | 'POST';
  path: string;
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
  expect: {
    status: number;
    bodyContains?: string;
    bodyNotContains?: string;
    maxResponseTimeMs?: number;
  };
}

// Vordefinierte Tests für bekannte Endpoints
const STANDARD_TESTS: EndpointTest[] = [
  {
    name: 'Health Check',
    method: 'GET',
    path: '/api/health',
    expect: { status: 200, bodyContains: 'ok' },
  },
  {
    name: 'Builder Chat',
    method: 'POST',
    path: '/api/builder/chat?token={BUILDER_SECRET}',
    body: { message: 'Status' },
    expect: { status: 200, bodyContains: 'task_status' },
  },
  {
    name: 'TTS Preview',
    method: 'POST',
    path: '/api/arcana/tts-preview',
    body: { text: 'Test', voiceName: 'Kore' },
    expect: { status: 200, bodyContains: 'audio', maxResponseTimeMs: 15000 },
  },
];

async function runEndpointTests(
  baseUrl: string,
  tests: EndpointTest[]
): Promise<TestResult[]> {
  const results: TestResult[] = [];

  for (const test of tests) {
    const start = Date.now();
    try {
      const res = await fetch(`${baseUrl}${test.path}`, {
        method: test.method,
        headers: { 'Content-Type': 'application/json', ...test.headers },
        body: test.body ? JSON.stringify(test.body) : undefined,
      });
      const body = await res.text();
      const duration = Date.now() - start;

      const passed =
        res.status === test.expect.status &&
        (!test.expect.bodyContains || body.includes(test.expect.bodyContains)) &&
        (!test.expect.bodyNotContains || !body.includes(test.expect.bodyNotContains)) &&
        (!test.expect.maxResponseTimeMs || duration <= test.expect.maxResponseTimeMs);

      results.push({ name: test.name, passed, duration, status: res.status });
    } catch (error) {
      results.push({
        name: test.name,
        passed: false,
        duration: Date.now() - start,
        error: String(error),
      });
    }
  }

  return results;
}
```

### Stufe 2 — Audio-Analyse in TypeScript (1 Abend)

WAV-Header Parsing ohne Python/scipy. Prüft die wichtigsten Metriken.

```typescript
interface AudioAnalysis {
  format: string;           // 'PCM' | 'other'
  channels: number;
  sampleRate: number;
  bitsPerSample: number;
  durationSec: number;
  peakAmplitude: number;    // 0.0 - 1.0
  rmsLevel: number;
  clippingPercent: number;  // Prozent der Samples > 0.99
  leadingSilenceMs: number;
  trailingSilenceMs: number;
}

function analyzeWavBuffer(buffer: Buffer): AudioAnalysis {
  // WAV Header parsen
  const channels = buffer.readUInt16LE(22);
  const sampleRate = buffer.readUInt32LE(24);
  const bitsPerSample = buffer.readUInt16LE(34);

  // Data Chunk finden
  let dataOffset = 36;
  while (dataOffset < buffer.length - 8) {
    if (buffer.toString('ascii', dataOffset, dataOffset + 4) === 'data') break;
    dataOffset += 8 + buffer.readUInt32LE(dataOffset + 4);
  }
  const dataSize = buffer.readUInt32LE(dataOffset + 4);
  const audioData = buffer.slice(dataOffset + 8, dataOffset + 8 + dataSize);

  // Samples analysieren
  const bytesPerSample = bitsPerSample / 8;
  const numSamples = audioData.length / bytesPerSample;
  let peak = 0, sumSquares = 0, clippingCount = 0;
  const maxVal = Math.pow(2, bitsPerSample - 1);

  for (let i = 0; i < numSamples; i++) {
    const sample = bitsPerSample === 16
      ? audioData.readInt16LE(i * 2) / maxVal
      : audioData.readInt8(i) / maxVal;
    const abs = Math.abs(sample);
    if (abs > peak) peak = abs;
    sumSquares += sample * sample;
    if (abs > 0.99) clippingCount++;
  }

  return {
    format: buffer.readUInt16LE(20) === 1 ? 'PCM' : 'other',
    channels,
    sampleRate,
    bitsPerSample,
    durationSec: numSamples / sampleRate / channels,
    peakAmplitude: peak,
    rmsLevel: Math.sqrt(sumSquares / numSamples),
    clippingPercent: (clippingCount / numSamples) * 100,
    leadingSilenceMs: 0,  // vereinfacht
    trailingSilenceMs: 0,
  };
}
```

### Stufe 3 — Visual Tests als GitHub Action (optional)

Puppeteer-Screenshots als CI-Schritt — nutzt GitHub Actions Runner statt Render RAM.

```yaml
# .github/workflows/visual-verification.yml
name: Visual Verification
on:
  workflow_dispatch:
    inputs:
      url:
        description: 'URL to screenshot'
        required: true
      commit_hash:
        description: 'Expected commit hash'
        required: false

jobs:
  screenshot:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'

      - name: Install Puppeteer
        run: npx puppeteer install chrome

      - name: Take Screenshots
        run: |
          node -e "
            const puppeteer = require('puppeteer');
            (async () => {
              const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
              const page = await browser.newPage();
              await page.setViewport({ width: 1440, height: 900 });
              await page.goto('${{ inputs.url }}', { waitUntil: 'networkidle2', timeout: 30000 });
              await new Promise(r => setTimeout(r, 3000));
              await page.screenshot({ path: 'screenshot.png', fullPage: true });
              await browser.close();
            })();
          "

      - name: Upload Screenshot
        uses: actions/upload-artifact@v4
        with:
          name: visual-verification-${{ github.run_id }}
          path: screenshot.png
```

Die Opus-Bridge kann diese GitHub Action per API triggern und
das Screenshot-Artifact abrufen:

```typescript
async function triggerVisualTest(url: string): Promise<string> {
  const res = await fetch(
    `https://api.github.com/repos/${REPO}/actions/workflows/visual-verification.yml/dispatches`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${GITHUB_PAT}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ref: 'main',
        inputs: { url },
      }),
    }
  );
  return res.status === 204 ? 'triggered' : 'failed';
}
```

---

## 20. Aktualisierter Implementierungsplan (final)

### Phase 1 — Fundament (1 Abend)
- [ ] DB-Schemas: builder_chatpool, builder_opus_log, builder_chains, builder_error_cards
- [ ] Auth-Middleware: requireOpusToken()
- [ ] Route-Skeleton: alle Endpoints als Stubs
- [ ] ChatPool-Modul: addMessage(), formatForModel(), countApprovals()
- [ ] project-dna.md erstellen und ins Repo committen
- [ ] /api/health Endpoint mit Commit-Hash

### Phase 2 — Scout + Graph (1 Abend)
- [ ] Graph-Scout: Architecture Graph lesen, Start-Pack + Task-Pack generieren
- [ ] LLM-Scouts: DeepSeek, nano, Gemini parallel
- [ ] Error-Card Injection in Scout-Briefing
- [ ] Project DNA Injection in System-Prompts

### Phase 3 — Roundtable (2 Abende)
- [ ] Roundtable-Runner: Runden-Loop mit ChatPool
- [ ] BDL-Execution für alle Teilnehmer
- [ ] Konsens-Erkennung (@APPROVE/@BLOCK/@NEEDS_DISCUSSION)
- [ ] Patch-Ownership bei mehreren Patches pro Datei
- [ ] execute Endpoint komplett

### Phase 4 — Chain + Graph-Updates (1-2 Abende)
- [ ] Chain-Controller mit Opus API
- [ ] Dependency-Graph Auflösung
- [ ] Post-Task Graph-Updates (Nodes, Edges, Events)
- [ ] Graph-getriebene Task-Suggestion
- [ ] chain Endpoint komplett

### Phase 5 — Verification + Render API (1 Abend)
- [ ] Render API Client: deploy status, env vars, restart, cancel
- [ ] Stufe 1: API-Tests in TypeScript (fetch-basiert)
- [ ] Stufe 2: Audio-Analyse in TypeScript (WAV-Header)
- [ ] Error-Card Generierung bei Block/Verification-Fehler
- [ ] Graph-Update mit Verification-Ergebnis

### Phase 6 — Error Learning + Härtung (1 Abend)
- [ ] Error-Card Generierung + Storage + Injection
- [ ] observe, override, audit, worker-direct, memory Endpoints
- [ ] Budget-Gate, Rate-Limiting, Blacklist
- [ ] Stufe 3: Visual Test GitHub Action (optional)

### Phase 7 — LIVE-PROBE Abnahme (1 Abend)
- [ ] Web-Opus testet JEDEN Endpoint per curl
- [ ] Kette aus 3 Tasks end-to-end durchlaufen
- [ ] Verification Loop live verifizieren
- [ ] Error-Card Generierung provozieren und prüfen
- [ ] Performance-Baseline: Tokens, Kosten, Dauer pro Task

**Geschätzter Gesamtaufwand: 8-10 Abende**

### Alle neuen Dateien
```
server/src/routes/opusBridge.ts              — Route-Handler
server/src/lib/opusBridgeController.ts       — Business-Logik
server/src/lib/opusChatPool.ts               — ChatPool-Verwaltung
server/src/lib/opusScoutRunner.ts            — Scout-Phase (LLM + Graph)
server/src/lib/opusRoundtable.ts             — Roundtable-Phase
server/src/lib/opusChainController.ts        — Chain-Entscheider
server/src/lib/opusGraphIntegration.ts       — Graph lesen/schreiben
server/src/lib/opusVerification.ts           — Post-Deploy Checks + Render API
server/src/lib/opusAudioAnalysis.ts          — WAV-Header Analyse (Stufe 2)
server/src/lib/opusErrorLearning.ts          — Error-Card Generierung
server/src/lib/opusRenderClient.ts           — Render REST API Client
server/src/schema/opusBridge.ts              — DB-Schemas
docs/project-dna.md                          — Projekt-DNA
architecture/                                — Architecture Graph
.github/workflows/visual-verification.yml    — Screenshot CI (Stufe 3)
```