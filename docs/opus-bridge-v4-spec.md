# Opus-Bridge v4 Spec — Maya-Pipeline + Pool-Architektur

**Stand:** 12. April 2026
**Autoren:** Claude Opus (Architekt) + Gürcan (Creative Director)
**Status:** IMPLEMENTIERT — Pipeline live, 2× erfolgreich getestet (12.04.2026)
**Vorgänger:** Opus-Bridge v3.0 (opus-task-v2), Bluepilot Spec v2.0 (Denker-Triade)

---

## 0. Implementierungsstatus + Terminologie-Mapping

### Was gebaut ist (S14, 12.04.2026)

Die Pipeline ist vollständig verdrahtet und verifiziert:
```
Scout (Pool) → Destillierer (Pool) → Council (Pool, Maya-moderiert)
  → Worker (Pool, Memory-aware) → TSC Verify → GitHub Push → Deploy
```

### Terminologie: Spec vs. Implementierung

| Spec-Term (v4 Entwurf) | Implementierung (Code) | Datei |
|-------------------------|----------------------|-------|
| CoThinker | Maya (builderFusionChat) | `builderFusionChat.ts` |
| Vordenker | Scout-Pool | `opusScoutRunner.ts` |
| Meister-Roundtable (Plan) | Council-Pool (Maya-moderiert) | `opusRoundtable.ts` |
| Mitdenker | Destillierer-Pool (Extractor+Reasoner) | `opusDistiller.ts` |
| Worker-Swarm | Worker-Pool (Memory-aware) | `opusWorkerSwarm.ts` |
| Meister-Review | TSC Verify + Council-Review | `opusBridgeController.ts` |
| Nachdenker | — (noch nicht implementiert) | geplant: `agentHabitat.ts` |

### Was noch fehlt (nächste Schritte)

- **Maya-Routing:** Intent-Classifier (Schnell vs. Pipeline) — fehlt
- **Council-Rollen:** Architekt/Skeptiker/Pragmatiker Differenzierung — fehlt
- **Agent Profiles:** Post-Task-Loop + DB-Tabelle — fehlt
- **Auto-Retry:** TSC-Fehler → automatische Nachbesserung — fehlt
- **Nachdenker:** Qualitäts-Score + Learnings nach Deploy — fehlt

### Zwei Executor-Pfade

| Pfad | Endpoint | Pipeline |
|------|----------|----------|
| Schnellmodus | `/opus-task` | Scope → Worker → JSON Overwrite → Push |
| Pipeline-Modus | `/build` | Scout → Destillierer → Council → Worker → TSC → Push |

Maya routet (geplant): einfach → Schnell, komplex → Pipeline.

---

## 1. Kernidee

Der User spricht nie mit Scouts, Workern oder der Pipeline direkt. Er spricht mit einem **CoThinker** — einem kreativen Gegenüber, das seine Idee aufgreift, mitentwickelt und als strukturierten Bauauftrag weitergibt. Danach übernimmt die **Denker-Triade** (Vordenker → Mitdenker → Nachdenker) zusammen mit Meistern und Workern die Ausführung.

Kreativität lebt oben (CoThinker + User). Alles darunter ist präzise Ausführung.

```
User ←→ CoThinker (kreatives Gespräch, Konkretisierung)
              ↓ strukturierter Bauauftrag
         Vordenker (Repo scannen, Kontext sammeln)
              ↓ Scout-Report
         Meister-Roundtable (Architektur, Zerlegung in N Tasks)
              ↓ Bauplan mit N Sub-Tasks
         Worker-Swarm (N Worker parallel, je 1 Datei)
              ↓ ← Mitdenker beobachtet parallel
         Meister-Review (Prüfung, Verdrahtung)
              ↓
         Deploy (Push → GitHub Action → Render)
              ↓
         Nachdenker (Qualität, Learnings, Index-Update)
```

---

## 2. Warum v4?

### v3 (aktuell, /opus-task) — Qualitäts-Selektion
```
User → Instruction → 5 Worker bekommen DENSELBEN Task
     → Judge pickt Besten → 1 Ergebnis, 4 weggeworfen
```
- Qualität: gut (mehrere Kandidaten)
- Durchsatz: kein Multiplikator
- Planung: keine (Worker raten was der User meint)
- Lernen: keins (kein Feedback-Loop)
- Kosten: ~$0.21/Task, davon 80% verschwendet

### v4 (neu) — Geplante Parallelarbeit
```
User ←→ CoThinker → Vordenker → Meister → N Worker (je eigene Datei)
       → Mitdenker → Review → Deploy → Nachdenker
```
- Qualität: durch Planung statt Selektion
- Durchsatz: ×N (jeder Worker eigene Datei)
- Planung: CoThinker + Meister vor Ausführung
- Lernen: Nachdenker extrahiert Patterns + Fehler
- Kosten: ~$0.30-0.50/Feature, aber N Dateien statt 1

---

## 3. Rollen-Übersicht

| Rolle | Modell | Zweck | Kosten/Call |
|-------|--------|-------|-------------|
| **CoThinker** | Claude Sonnet 4.6 | Kreatives Gespräch mit User, Ideen konkretisieren | ~$0.01 |
| **Vordenker** | GLM-5-Turbo | Repo scannen, Patterns finden, Kontext liefern | ~$0.003 |
| **Meister (Plan)** | Claude Opus 4.6 | Architektur, Zerlegung in unabhängige Sub-Tasks | ~$0.05 |
| **Meister (Kritik)** | GPT-5.4 | Gegenprüfung, Lücken finden, Risiken benennen | ~$0.03 |
| **Worker-Swarm** | DeepSeek, GLM, Qwen+, MiniMax, Kimi | Code schreiben, je 1 Datei parallel | ~$0.02/Worker |
| **Mitdenker** | GLM-5-Turbo | Worker-Outputs beobachten, Konflikte melden | ~$0.001 |
| **Meister (Review)** | GPT-5.4 | Code-Review, Interface-Kompatibilität | ~$0.03 |
| **Nachdenker** | GLM-5-Turbo | Qualitäts-Score, Learnings, Index-Update | ~$0.001 |

**Warum GLM-5-Turbo für die Denker-Triade?**
- Benchmark 88/100 — zuverlässigster Budget-Worker
- In allen Tests: immer valide, nie Syntax-Fehler, konsistent
- Direkte Zhipu-API — keine Daten an Dritte (anders als OpenRouter :free Modelle)
- 203K Kontext — mehr als genug für Repo-Analyse
- Ehrlicher Bewerter — kein Ja-Sager wie Gemini
- Die Denker brauchen keine Kreativität, sondern Präzision. Kreativität lebt im CoThinker (Sonnet).

**Warum dasselbe Modell für alle drei Denker?**
- Gleicher Kopf = Rolling Context passt ohne Übersetzungsverluste
- Gleiche Tokenisierung = Vordenker-Output ist für Nachdenker direkt lesbar
- Ein Prompt-Template pro Denker, ein Modell-Call, fertig

---

## 4. Phase 1 — CoThinker (Kreatives Gespräch)

### Modell
Claude Sonnet 4.6 — schnell, günstig, exzellente Gesprächsführung

### Ablauf
Der User beschreibt seine Idee in natürlicher Sprache. Der CoThinker:

1. **Versteht** die Kernidee
2. **Hinterfragt** was unklar ist (max 2-3 Rückfragen)
3. **Erweitert** — schlägt Aspekte vor die der User nicht bedacht hat
4. **Konkretisiert** — formuliert einen strukturierten Bauauftrag
5. **Bestätigt** — User gibt grünes Licht oder korrigiert

### Beispiel-Dialog
```
User:     "Credits sollen als CSV exportierbar sein"

CoThinker: "Gute Idee. Zwei Rückfragen:
            1. Nur eigene Credits oder auch die Verbrauchs-Historie?
            2. Button im Dashboard oder API-Endpoint?"

User:     "Nur eigene, Button im Dashboard"

CoThinker: "Verstanden. Dann brauchen wir:
            - CSV-Export-Funktion im Backend (formatCredits.ts)
            - GET /api/credits/export Endpoint (personaRouter.ts)
            - Download-Button im Credits Dashboard (React)
            Soll ich das so an die Pipeline geben?"

User:     "Ja"

CoThinker: → gibt strukturierten Bauauftrag an Phase 2
```

### Output-Format
```json
{
  "intent": "Feature: CSV-Export für User-Credits im Dashboard",
  "requirements": [
    "Neue Funktion creditsToCSV() in formatCredits.ts",
    "Neuer GET /api/credits/export Endpoint",
    "Download-Button im Credits Dashboard"
  ],
  "constraints": [
    "Bestehende formatCredits() nicht ändern",
    "CSV mit korrektem Escaping für Kommas",
    "Kein neues npm-Paket"
  ],
  "complexity": "medium",
  "estimatedFiles": 3
}
```

### Regeln
- Max 3 Rückfragen bevor der CoThinker einen Vorschlag macht
- Bei einfachen, klaren Aufträgen: keine Rückfragen, direkt Bauauftrag
- CoThinker schreibt NIE Code
- CoThinker trifft KEINE Architektur-Entscheidungen

---

## 5. Phase 2 — Vordenker (Repo-Scan)

### Modell
GLM-5-Turbo via Zhipu-API

### Auslöser
CoThinker hat Bauauftrag formuliert → Vordenker startet automatisch

### Was er tut (2 parallele Scouts, Ergebnisse zusammengeführt)

**Scout A — Datei-Scan:**
- Durchsucht builder-repo-index.json (90+ Dateien)
- Identifiziert relevante Dateien basierend auf Bauauftrag
- Lädt deren Inhalt via GitHub Raw

**Scout B — Pattern-Scan:**
- Sucht bestehende Patterns die wiederverwendet werden können
- Prüft Import-Graphen: Wer importiert was?
- Findet ähnlichen Code der als Vorlage dienen kann

### Output (Scout-Report)
```json
{
  "relevantFiles": [
    {
      "path": "server/src/lib/formatCredits.ts",
      "lines": 95,
      "content": "...",
      "reason": "Enthält Credits-Logik, hier kommt die neue Funktion rein"
    },
    {
      "path": "server/src/routes/personaRouter.ts",
      "lines": 340,
      "content": "...",
      "reason": "Bestehende API-Routes, neuer Endpoint hier"
    },
    {
      "path": "client/src/components/CreditsDashboard.tsx",
      "lines": 120,
      "content": "...",
      "reason": "Dashboard UI, Download-Button hier"
    }
  ],
  "patterns": [
    "Export-Funktionen: function exportX(): string (formatCredits.ts:45)",
    "Router-Endpoints: router.get('/path', async (req, res) => {...}) (personaRouter.ts:12)"
  ],
  "reuseCandidates": [
    "getCreditsColor() Struktur als Vorlage für CSV-Tier-Logik"
  ],
  "importGraph": {
    "formatCredits.ts": ["importiert von: personaRouter.ts, CreditsDashboard.tsx"],
    "personaRouter.ts": ["importiert: formatCredits, auth middleware"]
  },
  "warnings": [
    "personaRouter.ts ist 340 Zeilen — Endpoint-Hinzufügung unkritisch",
    "CreditsDashboard.tsx nutzt bereits fetch() für API-Calls — Pattern wiederverwenden"
  ]
}
```

### Kosten
~$0.003 pro Vordenker-Run (2 Scout-Calls parallel, ~5 Sekunden)

### Reuse-First Regel
Der Vordenker erzwingt die architektonische Regel: Bevor neuer Code geschrieben wird, muss geprüft werden ob ein bestehendes Pattern wiederverwendet werden kann. Das war bisher eine manuelle Regel — jetzt ist sie automatisiert.

---

## 6. Phase 3 — Meister-Roundtable (Architektur + Zerlegung)

### Modelle
- **Opus 4.6** — Planer: erstellt den Bauplan
- **GPT-5.4** — Kritiker: prüft den Plan, findet Lücken

### Input
- Bauauftrag vom CoThinker
- Scout-Report vom Vordenker
- Dateiinhalte der relevanten Dateien

### Ablauf

**Runde 1 — Opus plant:**
```
"Gegeben diesen Bauauftrag und diesen Repo-Kontext,
zerlege das Feature in N unabhängige Sub-Tasks.

Kritische Regel: Jeder Sub-Task muss UNABHÄNGIG sein.
Kein Worker darf auf den Output eines anderen warten.
Das erzwingt saubere Interfaces.

Für jeden Sub-Task definiere:
- Welche Datei
- Was genau ändern/erstellen
- Welche Interfaces bereitstellen/erwarten
- Welche bestehenden Patterns verwenden (aus Scout-Report)"
```

**Runde 2 — GPT-5.4 kritisiert:**
```
"Prüfe diesen Bauplan:
- Sind die Sub-Tasks wirklich unabhängig?
- Fehlen Dateien die geändert werden müssen?
- Sind die Interface-Definitionen vollständig?
- Gibt es versteckte Abhängigkeiten im Import-Graph?
- Ist die Komplexitätsverteilung fair (kein Worker bekommt 80% der Arbeit)?"
```

**Runde 3 — Opus finalisiert:**
Integriert GPT-5.4s Kritik → finaler Bauplan

### Output (Bauplan)
```json
{
  "plan": {
    "totalFiles": 3,
    "strategy": "parallel-independent",
    "interface": {
      "creditsToCSV": {
        "signature": "(entries: CreditEntry[]): string",
        "definedIn": "formatCredits.ts",
        "usedBy": ["personaRouter.ts"]
      }
    }
  },
  "tasks": [
    {
      "id": "task-1",
      "file": "server/src/lib/formatCredits.ts",
      "instruction": "Füge exportierte Funktion creditsToCSV hinzu. Signature: (entries: Array<{userId: string, credits: number, tier: string}>): string. Nutze das bestehende Pattern von formatCreditsDisplay(). CSV mit Header-Zeile, Escaping für Kommas via Double-Quotes.",
      "worker": "deepseek",
      "patterns": ["formatCreditsDisplay Pattern aus Zeile 45"],
      "interfaces": {"provides": ["creditsToCSV"]}
    },
    {
      "id": "task-2",
      "file": "server/src/routes/personaRouter.ts",
      "instruction": "Füge GET /api/credits/export Endpoint hinzu. Importiert creditsToCSV aus formatCredits.ts. Liest Credits des authentifizierten Users aus DB. Setzt Content-Type: text/csv und Content-Disposition: attachment. Nutze das bestehende router.get() Pattern aus Zeile 12.",
      "worker": "glm",
      "patterns": ["router.get Pattern aus Zeile 12"],
      "interfaces": {"consumes": ["creditsToCSV"]}
    },
    {
      "id": "task-3",
      "file": "client/src/components/CreditsDashboard.tsx",
      "instruction": "Füge einen Download-CSV-Button hinzu. Ruft GET /api/credits/export auf. Nutze das bestehende fetch() Pattern das bereits im Dashboard verwendet wird. Button-Styling konsistent mit bestehendem Design.",
      "worker": "minimax",
      "patterns": ["fetch() Pattern aus CreditsDashboard.tsx"],
      "interfaces": {"consumes": ["/api/credits/export"]}
    }
  ]
}
```

### Kritische Regel: Unabhängigkeit
Jeder Sub-Task muss isoliert ausführbar sein. Wenn Worker A ein Interface definiert das Worker B braucht, muss die Interface-Definition VOR der Vergabe im Bauplan stehen — nicht im Worker-Output. Die Meister definieren die Schnittstellen, die Worker implementieren sie.

### Kosten
~$0.08 pro Meister-Roundtable (Opus + GPT-5.4, 3 Runden)

---

## 7. Phase 4 — Worker-Swarm (Parallele Ausführung)

### Modelle
Aus dem bestehenden Swarm-Pool: DeepSeek, GLM-5-Turbo, Qwen-Plus, MiniMax, Kimi

### Ablauf
Jeder Worker bekommt:
- Seine Datei (aktueller Inhalt via GitHub Raw)
- Seinen Sub-Task aus dem Bauplan
- Die Interface-Definitionen (damit er weiß welche Funktionen/Typen er bereitstellen oder erwarten muss)
- Die relevanten Patterns (aus Scout-Report, vom Meister zugewiesen)

Alle Worker arbeiten **gleichzeitig**. Kein Worker wartet auf einen anderen.

### Change Contract
Wie in v3: JSON Full-File-Overwrite. Kein SEARCH/REPLACE.
```json
{
  "edits": [
    {"path": "server/src/lib/formatCredits.ts", "mode": "overwrite", "content": "kompletter Dateiinhalt"}
  ]
}
```

### Validierung (pro Worker)
1. JSON-Schema valide?
2. TypeScript-Syntax-Check (wenn verfügbar)
3. Interface-Vertrag erfüllt? (definiert die Funktion die der Bauplan verlangt?)

### Worker-Zuweisung
Der Meister weist Worker basierend auf Stärken zu:
- **DeepSeek** — Business-Logik, Algorithmen
- **GLM** — API-Endpoints, Routing, strukturierter Code
- **Qwen-Plus** — Komplexe Funktionen, gründlich aber langsam
- **MiniMax** — Frontend-Komponenten, UI-Code
- **Kimi** — Utility-Funktionen, Tests

Diese Zuordnung wird durch Nachdenker-Feedback über Zeit verfeinert.

### Kosten
~$0.02 pro Worker, bei 3-5 Workern: ~$0.06-0.10

---

## 8. Phase 5 — Mitdenker (Beobachtung)

### Modell
GLM-5-Turbo via Zhipu-API

### Wann
Parallel zu Phase 4. Sobald der erste Worker-Output eintrifft, beginnt der Mitdenker.

### Was er tut
- Beobachtet jeden Worker-Output sobald er eintrifft
- Prüft: Passt der Output zum Bauplan?
- Erkennt Interface-Konflikte zwischen Worker-Outputs
- Hält Rolling Context für Phase 6

### Output (Rolling Context)
```json
{
  "workerStatus": [
    {"worker": "deepseek", "file": "formatCredits.ts", "status": "done", "ok": true, "concerns": []},
    {"worker": "glm", "file": "personaRouter.ts", "status": "done", "ok": true, "concerns": ["nutzt require() statt import"]},
    {"worker": "minimax", "file": "CreditsDashboard.tsx", "status": "done", "ok": true, "concerns": []}
  ],
  "interfaceConflicts": [],
  "overallHealth": "green",
  "recommendation": "proceed_to_review"
}
```

### Eskalation
Wenn der Mitdenker einen schweren Konflikt erkennt (z.B. Worker A exportiert `creditsToCSV` aber Worker B importiert `exportCreditsCSV`), kann er:
- Den betroffenen Worker zur Korrektur markieren
- Den Meister-Review vorwarnen

### v4.0 vs v4.1
**v4.0:** Mitdenker ist optional. Bei 3-5 Dateien fängt der Meister-Review in Phase 6 alles auf.
**v4.1:** Mitdenker wird Pflicht wenn Pipeline auf 10+ parallele Dateien skaliert.

### Kosten
~$0.001 pro Mitdenker-Run (vernachlässigbar)

---

## 9. Phase 6 — Meister-Review (Prüfung + Verdrahtung)

### Modell
GPT-5.4 (spec-treuester Reviewer, Benchmark 82/100)

### Input
- Bauplan aus Phase 3
- Alle Worker-Outputs aus Phase 4
- Rolling Context vom Mitdenker (Phase 5)

### Prüfungen

**A) Interface-Kompatibilität:**
- Stimmen die exportierten/importierten Namen überein?
- Sind die Typen kompatibel?
- Fehlen Imports?

**B) Code-Qualität pro Datei:**
- TypeScript-konform?
- Bestehende Patterns eingehalten?
- Keine Breaking Changes an existierendem Code?

**C) Gesamtbild:**
- Erfüllen alle Dateien zusammen den Bauauftrag?
- Fehlt etwas?

### Verdicts

**✅ Alle ok:**
→ Weiter zu Phase 7 (Deploy)

**⚠️ Worker X hat Fehler:**
→ NUR Worker X bekommt seinen Output + Korrektur-Hinweis zurück
→ Worker X liefert neu (max 2 Retries)
→ Danach erneuter Review

**❌ Bauplan-Fehler (selten):**
→ Zurück zu Phase 3 mit konkretem Feedback
→ Meister überarbeiten den Plan

### Kosten
~$0.03 pro Review-Runde

---

## 10. Phase 7 — Deploy

### Ablauf
Identisch zu v3:
```
Geprüfte Dateien → /push (multi-file) → GitHub Action → Render
```

### GitHub Action (builder-executor.yml)
- Build-Check (TypeScript Compile)
- Grün → Commit + Push (3× Retry bei Konflikten)
- Rot → Expliziter Failure-Report (kein stilles Verschlucken)
- `triggered ≠ committed` — die Action kann ablehnen

### Self-Test
Nach Deploy: automatischer Healthcheck gegen Live-Endpoint

---

## 11. Phase 8 — Nachdenker (Learnings)

### Modell
GLM-5-Turbo via Zhipu-API

### Wann
NACH erfolgreichem Deploy. Async, kein Blocker. Nicht im kritischen Pfad.

### Was er tut

**1. Qualitäts-Score (1-5):**
Hat die Pipeline geliefert was der CoThinker aufgegeben hat?

**2. Worker-Ranking:**
Welcher Worker hat am besten performed? Score-Update in der internen Worker-Statistik. Diese Scores beeinflussen zukünftige Worker-Zuweisung durch die Meister.

**3. Pattern-Extraktion:**
Neue wiederverwendbare Patterns identifizieren und in eine Pattern-Registry schreiben. Beispiel: "CSV-Export-Pattern: Funktion → Endpoint → Download-Button"

**4. Fehler-Katalog:**
Was ist schiefgelaufen? Warum? Wie vermeidbar? Beispiel: "GLM nutzt require() statt import — Worker-Prompt sollte ES-Module erzwingen"

**5. Repo-Index-Update:**
Wurden neue Dateien erstellt? → builder-repo-index.json aktualisieren. Das löst das bisherige Problem der manuellen Index-Pflege.

### Output
```json
{
  "taskQuality": 4,
  "workerScores": {
    "deepseek": {"score": 88, "note": "CSV-Funktion korrekt, gutes Escaping"},
    "glm": {"score": 75, "note": "Endpoint funktional, aber require() statt import"},
    "minimax": {"score": 82, "note": "Button korrekt, aber kein Loading-State"}
  },
  "newPatterns": [
    {"name": "csv-export", "description": "creditsToCSV → GET Endpoint → Download Button", "files": 3}
  ],
  "issues": [
    {"severity": "low", "issue": "GLM nutzt require()", "fix": "Worker-Prompt: 'Nutze nur ES-Module import/export'"}
  ],
  "indexUpdates": ["server/src/lib/formatCredits.ts: creditsToCSV() hinzugefügt"],
  "promptImprovements": [
    "Worker-System-Prompt: 'Verwende import/export, nie require()'"
  ]
}
```

### Feedback-Loop
Die Nachdenker-Outputs fließen zurück in:
- **Worker-Prompts** — Fehler aus dem Fehler-Katalog werden in System-Prompts integriert
- **Meister-Planung** — Patterns aus der Registry beeinflussen zukünftige Baupläne
- **Worker-Zuweisung** — Scores bestimmen welcher Worker welche Art Task bekommt
- **Repo-Index** — bleibt automatisch aktuell

Das ist der Compound-Interest-Effekt: Jeder Task macht die Pipeline besser.

---

## 12. Kosten-Kalkulation

### Pro Feature-Task (3 Dateien, medium Komplexität)

| Phase | Rolle | Modell | Kosten |
|-------|-------|--------|--------|
| 1 | CoThinker (3-5 Turns) | Sonnet 4.6 | $0.01 |
| 2 | Vordenker (2 Scouts) | GLM-5-Turbo | $0.003 |
| 3 | Meister-Roundtable (3 Runden) | Opus + GPT-5.4 | $0.08 |
| 4 | Worker-Swarm (3 Worker) | DeepSeek + GLM + MiniMax | $0.06 |
| 5 | Mitdenker | GLM-5-Turbo | $0.001 |
| 6 | Meister-Review | GPT-5.4 | $0.03 |
| 8 | Nachdenker | GLM-5-Turbo | $0.001 |
| **Gesamt** | | | **~$0.19** |

### Pro Monat (3 Features/Abend, 20 Abende)
- 60 Features × $0.19 = **~$11.40/Monat**
- Vergleich v3: 60 Tasks × $0.21 = $12.60, aber nur 1 Datei pro Task
- **v4 liefert 3× mehr Output für weniger Geld**

### Skalierung
Bei 5 Dateien pro Feature: ~$0.25/Feature, 5× Output
Bei 10 Dateien: ~$0.40/Feature, 10× Output — hier wird der Mitdenker Pflicht

---

## 13. Neuer Endpoint: POST /opus-feature

### Warum ein neuer Endpoint?
`/opus-task` bleibt als Low-Level-Executor für einzelne Dateien. `/opus-feature` orchestriert die gesamte v4-Pipeline für Multi-File-Features.

### Request
```json
{
  "intent": "Feature: CSV-Export für User-Credits im Dashboard",
  "requirements": ["..."],
  "constraints": ["..."],
  "complexity": "medium",
  "dryRun": true
}
```

### Response
```json
{
  "status": "deployed",
  "featureId": "feat-abc123",
  "phases": [
    {"phase": "vordenker", "durationMs": 5200, "filesFound": 3},
    {"phase": "meister-plan", "durationMs": 12000, "tasksCreated": 3},
    {"phase": "swarm", "durationMs": 25000, "workersCompleted": 3, "workersRetried": 0},
    {"phase": "mitdenker", "durationMs": 800, "conflicts": 0},
    {"phase": "meister-review", "durationMs": 8000, "verdict": "approved"},
    {"phase": "deploy", "durationMs": 45000, "commit": "a1b2c3d"},
    {"phase": "nachdenker", "durationMs": 2000, "quality": 4}
  ],
  "totalDurationMs": 98000,
  "filesChanged": 3,
  "cost": "$0.19"
}
```

### Interner Flow
```
/opus-feature
  → Phase 1: Vordenker (GLM × 2 parallel)
  → Phase 2: Meister-Plan (Opus → GPT-5.4 → Opus)
  → Phase 3: Worker-Swarm (N × parallel, via bestehende Swarm-Logik)
  → Phase 4: Mitdenker (GLM, parallel zu Phase 3)
  → Phase 5: Meister-Review (GPT-5.4)
  → Phase 6: Deploy (bestehender /push → Action → Render)
  → Phase 7: Nachdenker (GLM, async)
```

Der CoThinker sitzt NICHT in diesem Endpoint. Er ist ein separater Conversational Layer der den Bauauftrag formuliert und dann `/opus-feature` aufruft.

---

## 14. Umbau-Aufwand

### Was NICHT geändert wird
- `/opus-task` — bleibt als Low-Level-Executor
- `/push` — bleibt als Transport
- Worker-Swarm-Logik — bleibt, wird nur anders aufgerufen
- GitHub Action — bleibt
- Repo-Index — bleibt, wird automatisch aktualisiert

### Was NEU gebaut wird

| Datei | Was | Aufwand |
|-------|-----|---------|
| `server/src/lib/opusFeatureOrchestrator.ts` | Orchestriert alle 7 Phasen | 1 Abend |
| `server/src/lib/opusVordenker.ts` | Scout-Logik (2 parallele GLM-Calls) | 0.5 Abende |
| `server/src/lib/opusMeisterPlan.ts` | Opus+GPT Roundtable für Zerlegung | 1 Abend |
| `server/src/lib/opusMitdenker.ts` | Worker-Output-Beobachtung | 0.5 Abende (v4.1) |
| `server/src/lib/opusNachdenker.ts` | Qualität + Learnings + Index-Update | 0.5 Abende |
| Route in `opusBridge.ts` | POST /opus-feature Endpoint | 0.5 Abende |
| CoThinker-Integration | Sonnet-basierter Conversational Layer | 1 Abend |

### Gesamtaufwand: 4-5 Abende

### Implementierungsreihenfolge

**Abend 1: Vordenker + Meister-Plan**
- opusVordenker.ts (Scout-Logik)
- opusMeisterPlan.ts (Zerlegung)
- Test: Bauauftrag rein → Bauplan raus (kein Code-Schreiben)

**Abend 2: Feature-Orchestrator + Worker-Vergabe**
- opusFeatureOrchestrator.ts
- Worker-Swarm mit Sub-Task-Vergabe statt Duplicate-Task
- Test: dryRun eines 3-File-Features

**Abend 3: Meister-Review + Deploy**
- Review-Logik (GPT-5.4 prüft alle Outputs zusammen)
- Multi-File /push
- Test: erster echter grüner Durchlauf

**Abend 4: Nachdenker + CoThinker**
- opusNachdenker.ts (Learnings, Index-Update)
- CoThinker-Integration (Sonnet Conversational Layer)
- Test: End-to-End Feature-Build

**Abend 5 (optional): Mitdenker + Polish**
- opusMitdenker.ts (Worker-Beobachtung)
- Feedback-Loop: Nachdenker → Worker-Prompts
- Edge Cases, Error Recovery

---

## 15. Verhältnis zu bestehender Architektur

### Opus-Bridge v3 → v4
v3 wird nicht gelöscht. v4 baut eine Schicht DARÜBER:

```
v4: /opus-feature  (Multi-File, geplant, mit Denker-Triade)
         ↓ nutzt intern
v3: /opus-task     (Single-File, direkt, Worker-Swarm + Judge)
         ↓ nutzt intern
v2: /push          (Transport, GitHub)
```

### Bluepilot Spec v2.0
Die Denker-Triade wurde dort für Soulmatch-Chat definiert (Vordenker = Preflight, Mitdenker = Shadow Agent, Nachdenker = Extract). Hier wird dasselbe Pattern auf den Builder angewendet — andere Prompts, gleiche Architektur.

### AICOS
Nachdenker-Patterns könnten als AICOS Solution Cards gespeichert werden. Das ist v4.2 — nicht in v4.0.

---

## 16. Risiken + Mitigationen

| Risiko | Schwere | Mitigation |
|--------|---------|------------|
| Sub-Tasks sind doch abhängig | Hoch | Meister definieren Interfaces VOR Worker-Vergabe. GPT-5.4 prüft Unabhängigkeit explizit. |
| Opus zerlegt schlecht | Mittel | GPT-5.4 als Kritiker in Runde 2. Bei Versagen: Fallback auf v3 (ganzer Task an 5 Worker). |
| Worker-Output passt nicht zum Bauplan | Mittel | Meister-Review mit Retry. Max 2 Retries pro Worker, danach Eskalation. |
| GLM-Ausfall (alle 3 Denker betroffen) | Niedrig | Fallback: DeepSeek für Denker-Rolle. Zhipu war bisher stabil. |
| Feature zu groß für 5 Worker | Niedrig | CoThinker erkennt das und schlägt Aufteilung in 2 Features vor. |
| Kosten explodieren | Niedrig | Budget-Gate: max $2 pro Feature. Meister-Roundtable ist der teuerste Schritt (~$0.08). |

---

## 17. Akzeptanzkriterien für v4.0

Die Pipeline ist v4.0-ready wenn:

1. ✅ `/opus-feature` mit `dryRun: true` liefert einen vollständigen Bauplan für ein 3-File-Feature
2. ✅ Vordenker findet korrekt die relevanten Dateien + Patterns
3. ✅ Meister zerlegen in unabhängige Sub-Tasks mit klaren Interfaces
4. ✅ Worker liefern parallele Outputs die zusammenpassen
5. ✅ Meister-Review erkennt wenn Interfaces nicht matchen
6. ✅ Nachdenker schreibt Worker-Scores + mindestens 1 Pattern
7. ✅ Erster echter Deploy eines Multi-File-Features über die v4-Pipeline
8. ✅ Repo-Index wird automatisch aktualisiert

---

## 18. Zusammenfassung in einem Satz

**Der User denkt kreativ mit dem CoThinker, die Denker-Triade (GLM) liefert Präzision, die Meister (Opus + GPT) planen, die Worker bauen parallel, und der Nachdenker sorgt dafür dass die Pipeline mit jedem Task besser wird.**
