# Worker-Swarm Spec v1.0 - Paralleles Multi-KI Coding mit Meister-Validierung

**Status:** Draft
**Autor:** Guercan + Claude Opus
**Datum:** 06. April 2026
**Abhaengig von:** Opus-Bridge v3.0, codeWriter-Parameter

---

## 1. Vision

Statt einer KI die sequenziell Datei fuer Datei schreibt, arbeitet ein Schwarm
guenstiger Worker-KIs parallel - jede bekommt eine klar definierte Aufgabe.
Opus sitzt nicht mehr am Code, sondern validiert, verdrahtet und repariert.

**Metapher:** Opus ist der Meister in der Fabrik. Die Worker liefern Material.
Der Meister prueft Qualitaet, verbindet die Teile, und greift ein wenn noetig.

---

## 2. Architektur-Ueberblick

```text
TASK EINGANG
     |
ROUNDTABLE PHASE 1 - Analyse + Arbeitsteilung
  Opus + GPT + GLM diskutieren gemeinsam:
  - Was muss gebaut werden?
  - Welche Dateien sind betroffen?
  - Welche Abhaengigkeiten gibt es?
  - WER macht WAS? (basierend auf Worker-Scores)

  Ergebnis: @ASSIGN Befehle
     |
PARALLEL WORKER-PHASE
  Worker 1 (DeepSeek)  -> route.ts + schema.ts
  Worker 2 (Sonnet)    -> component.tsx
  Worker 3 (Qwen 3.5)  -> service.ts
  Worker 4 (Kimi K2.5) -> migration.sql
  Worker 5 (Grok)      -> tests.ts
  Worker 6 (MiniMax)   -> utils.ts

  Alle parallel via Promise.allSettled()
     |
  Worker 3: FAIL ESCALATE - Import-Pfad unklar
     |
MINI-ROUNDTABLE (1 Runde, schnell)
  Das Team loest das Problem gemeinsam
  Ergebnis: @RESOLVE mit Antwort
     |
  Worker 3: Faehrt fort mit Loesung
     |
MEISTER-PHASE (Opus als Validator)
  - Liest ALLE Worker-Ergebnisse ($0.03 Input)
  - Prueft: Passen die Teile zusammen?
  - Repariert: Import-Pfade, Export-Namen, Typen
  - Verdrahtet: Index-Exports, Router-Registration
  - Bewertet: Quality-Score pro Worker (0-100)
  - Output: Combined Validated Patch
     |
GITHUB ACTION (ein Commit, alle Dateien)
     |
QUALITY FEEDBACK
  - Worker-Scores in DB speichern
  - Error-Cards bei Fehlern generieren
  - Naechste Task-Vergabe beruecksichtigt Scores
```

---

## 3. Neue BDL-Befehle

### @ASSIGN - Roundtable vergibt Arbeit

```text
@ASSIGN file:"server/src/routes/newFeature.ts" writer:deepseek reason:"Standard CRUD, schnell"
@ASSIGN file:"server/src/schema/newTable.ts" writer:deepseek reason:"Einfaches Drizzle-Schema"
@ASSIGN file:"client/src/components/NewWidget.tsx" writer:sonnet reason:"Komplexe UI-Logik mit State"
```

Felder:
- `file` - Zieldatei (Pfad)
- `writer` - Worker-ID (deepseek/sonnet/grok/glm/qwen/kimi/minimax)
- `reason` - Warum dieser Worker (1 Satz)
- `depends_on` - Optional: Datei die zuerst fertig sein muss

### @ESCALATE - Worker meldet Problem

```text
@ESCALATE reason:"Import von schema.ts - welcher Export-Name wird verwendet?"
```

Triggt ein Mini-Roundtable (1 Runde, alle Teilnehmer).

### @RESOLVE - Team loest Blockade

```text
@RESOLVE answer:"Export ist `export const userSchema`" target:worker3
```

### @SCORE - Meister bewertet Worker

```text
@SCORE worker:deepseek quality:85 speed:95 notes:"Sauberer Code, korrekte Typen"
@SCORE worker:grok quality:40 speed:90 notes:"Regex statt Literal im SEARCH/REPLACE"
```

---

## 4. Worker-Schablone (Template)

Jeder Worker bekommt eine praezise Schablone damit alle Teile zusammenpassen:

```text
=== DEIN AUFTRAG ===
Datei: server/src/routes/newFeature.ts
Typ: Express Route Handler
Muss exportieren: router (Router)
Muss importieren:
  - { getDb } from '../db.js'
  - { newFeatureTable } from '../schema/newTable.js'
Funktionen die du schreibst:
  - GET /api/new-feature -> Liste zurueckgeben
  - POST /api/new-feature -> Neuen Eintrag anlegen
Konventionen: Async/await, try/catch, res.json()

=== PROJECT DNA ===
[automatisch eingefuegt]

=== SCHREIB NUR DEN @PATCH ===
Keine Diskussion, keine Analyse. Nur:
@PATCH file:"server/src/routes/newFeature.ts"
<<<SEARCH
===REPLACE
[vollstaendiger Datei-Inhalt]
>>>
```

Durch die Schablone kann selbst ein schwaecherer Worker brauchbaren Code liefern -
die Signatur, Imports und Exports sind vorgegeben.

---

## 5. Quality-Score System

### Pro-Task Bewertung (durch Opus nach Meister-Phase)

| Dimension | Gewicht | Beschreibung |
|-----------|---------|-------------|
| correctness | 40% | Code funktioniert, keine Syntax-Fehler |
| format | 20% | SEARCH/REPLACE korrekt, keine Format-Bugs |
| conventions | 20% | Folgt Project DNA, Naming, Patterns |
| completeness | 20% | Alle geforderten Funktionen implementiert |

### Rolling Average (letzte 20 Tasks)

```sql
CREATE TABLE worker_scores (
  id SERIAL PRIMARY KEY,
  task_id TEXT NOT NULL,
  worker TEXT NOT NULL,
  correctness INTEGER,
  format INTEGER,
  conventions INTEGER,
  completeness INTEGER,
  total_score INTEGER,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Score-basierte Vergabe

| Score-Range | Vergabe-Regel |
|-------------|--------------|
| 80-100 | Bekommt komplexe + einfache Tasks |
| 60-79 | Nur Standard-Tasks, kein Architektur-Code |
| 40-59 | Nur isolierte, einfache Tasks (Tests, Utils) |
| 0-39 | Worker wird ersetzt oder Prompt wird optimiert |

---

## 6. Daily Standup - Selbstoptimierung

Einmal taeglich (oder nach N Tasks) kommt der Roundtable zusammen:

```text
DAILY STANDUP PROMPT:
=== WORKER PERFORMANCE (letzte 24h) ===
DeepSeek: 14 Tasks, Avg Score 82, Schwaeche: vergisst Error-Handling
Sonnet: 8 Tasks, Avg Score 91, Schwaeche: keine
Grok: 6 Tasks, Avg Score 58, Schwaeche: SEARCH/REPLACE Format-Bugs
Qwen: 10 Tasks, Avg Score 75, Schwaeche: TypeScript-Typen manchmal falsch

=== AUFGABE ===
1. Optimiere die System-Prompts der schwaecheren Worker
2. Entscheide ob ein Worker ersetzt werden soll
3. Aktualisiere die Vergabe-Regeln
```

Ergebnis: Angepasste Worker-Prompts, gespeichert in DB.

So lernt das System aus seinen eigenen Fehlern - die AICOS Error-Cards +
Worker-Scores + Prompt-Tuning bilden einen geschlossenen Feedback-Loop.

---

## 7. Kosten-Vergleich

### Aktuell: Sequenziell (1 Writer, 6 Dateien)

| Phase | Kosten | Dauer |
|-------|--------|-------|
| Roundtable (3 Runden) | $0.15 | 120s |
| Opus schreibt 6 Dateien | $1.20 | 600s |
| **Gesamt** | **$1.35** | **720s** |

### Worker-Swarm: Parallel (6 Worker, 6 Dateien)

| Phase | Kosten | Dauer |
|-------|--------|-------|
| Roundtable + Assign (2 Runden) | $0.12 | 80s |
| 6 Worker parallel | $0.007 | 60s |
| Opus validiert + verdrahtet | $0.05 | 30s |
| **Gesamt** | **$0.18** | **170s** |

**Ergebnis: 7.5x guenstiger, 4x schneller.**

---

## 8. Provider-Integration (neue Worker)

| Worker | Provider | Modell | API-Base | Env-Key | $/1M In/Out |
|--------|----------|--------|----------|---------|-------------|
| deepseek | deepseek | deepseek-chat | api.deepseek.com | DEEPSEEK_API_KEY | $0.28/$0.42 |
| sonnet | anthropic | claude-sonnet-4-6 | api.anthropic.com | ANTHROPIC_API_KEY | $3/$15 |
| grok | xai | grok-4-1-fast | api.x.ai | XAI_API_KEY | $0.20/$0.50 |
| glm | zhipu | glm-5-turbo | api.z.ai | ZHIPU_API_KEY | $0.96/$3.20 |
| qwen | qwen* | qwen3.5-27b | ? | QWEN_API_KEY | ~$0.10/$0.10 |
| kimi | moonshot* | kimi-k2.5 | api.moonshot.cn | KIMI_API_KEY | $0.60/$2.80 |
| minimax | minimax* | m2.7 | ? | MINIMAX_API_KEY | $0.30/$1.20 |

*Provider noch nicht in providers.ts integriert - API-Keys und Endpoints muessen recherchiert werden.

---

## 9. Implementierungs-Phasen

### Phase S1: Grundstruktur (1 Abend)
- `opusWorkerSwarm.ts` - Worker-Runner mit Promise.allSettled
- `@ASSIGN` Parser in builderBdlParser.ts
- Worker-Schablone Generator
- Einzelne Worker-Aufrufe (erstmal nur bestehende Provider)

### Phase S2: Meister-Phase (1 Abend)
- Opus als Validator - liest alle Worker-Outputs
- Combined-Patch Generator
- Import/Export Verdrahtung
- Erweiterter Patch-Validator (alle Patches zusammen)

### Phase S3: Quality-Score + Escalation (1 Abend)
- `worker_scores` DB-Tabelle
- `@SCORE` Auswertung nach jeder Meister-Phase
- `@ESCALATE` -> Mini-Roundtable -> `@RESOLVE` Flow
- Score-basierte Vergabe-Logik

### Phase S4: Daily Standup + Selbstoptimierung (1 Abend)
- Cron-Job oder manueller Trigger
- Performance-Report Generierung
- Prompt-Optimierung durch Roundtable
- Worker-Replacement Logik

### Phase S5: Neue Provider (bei Bedarf)
- Qwen, Kimi, MiniMax in providers.ts
- API-Keys auf Render
- Benchmark gegen bestehende Worker

---

## 10. Risiken + Mitigations

| Risiko | Wahrscheinlichkeit | Mitigation |
|--------|-------------------|------------|
| Worker-Code passt nicht zusammen | HOCH | Schablone mit festen Imports/Exports |
| Opus-Validierung kostet mehr als erwartet | MITTEL | Max-Token-Limit fuer Meister-Phase |
| Mini-Roundtable verbraucht zu viele Runden | MITTEL | Max 1 Escalation pro Task |
| Worker halluziniert Dateien | NIEDRIG | Graph-Kontext im Worker-Prompt (bereits implementiert) |
| API-Rate-Limits bei 6 parallelen Calls | NIEDRIG | Retry mit Backoff, Budget-Gate |

---

## 11. Verhaeltnis zu bestehenden Specs

- **Opus-Bridge Spec v3.0:** Worker-Swarm ist Phase 2 der Bridge. Roundtable + Scouts bleiben.
- **Builder Studio Spec v3.2:** Worker-Swarm ersetzt die sequenzielle Code-Lane.
- **Bluepilot Spec v1.0:** Worker-Swarm ist der Vorlaeufer - gleiche Idee, aber leichtgewichtig.
- **Crush v4.1:** Pulse-Crush bleibt aktiv, bewertet Swarm-Ergebnisse.
- **AICOS Cards:** Error-Cards entstehen aus Worker-Fehlern, Sol-Cards aus Worker-Staerken.