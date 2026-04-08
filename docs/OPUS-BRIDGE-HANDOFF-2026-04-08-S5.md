# OPUS-BRIDGE HANDOFF — Stand 08. April 2026, Session 4+5

## Was in diesen Sessions gebaut wurde

Aufbauend auf Session 3 (Worker-Swarm, Multi-Meister-Rat, Full-File Mode) wurden
autonomes Deployment, eine algorithmische Decomposer-Pipeline und Worker-Performance-
Analyse implementiert. Claude kann jetzt selbststaendig Code schreiben, pushen,
deployen und testen — ohne Copilot, ohne manuelles Copy-Paste.

---

## Neue Architektur: Drei Wege zum Commit

### 1. Roundtable-Pfad (fuer Reviews, Architektur)
```
Task → Scout → Roundtable (3 KIs, max 4 Runden) → @PATCH → GitHub Action → Commit
```
- Kosten: ~$0.10-0.20 pro Task
- Verifiziert: unanimous, 2 Runden, 1043 Tokens

### 2. Decomposer-Direct-Pfad (fuer Features, schnell)
```
Task → Scout → Decompose(5x$0) → Swarm → Meister → GitHub Action → Commit
```
- Parameter: `useDecomposer: true` in /execute
- Kosten: ~$0.05-0.15 pro Task (kein Roundtable)
- Verifiziert: getRecommendedWriter() auto-committed, 3369 Tokens

### 3. Direct Push (fuer manuelle Fixes von Claude)
```
Claude → /push → GitHub Action → Commit
```
- Kein LLM, nur Datei-Ueberschreibung
- Limit: <10KB Gesamtpayload (GitHub dispatch Limit)
- Fuer groessere Pushes: git push mit GITHUB_PAT noetig

---

## Neue Endpoints (19 → 29)

| # | Methode | Pfad | Beschreibung |
|---|---------|------|-------------|
| 20 | POST | /push | Dateien direkt committen ohne LLM |
| 21 | GET | /render/status | Deploy-Status + Server-Info |
| 22 | POST | /render/redeploy | Render-Deployment triggern |
| 23 | GET | /render/env | Env-Vars auflisten (Keys only) |
| 24 | PUT | /render/env/:key | Env-Var setzen (critical keys geschuetzt) |
| 25 | POST | /decompose | Dry-Run: zeigt Schnittplan ohne LLM-Kosten |
| 26 | GET | /pipeline-info | Pipeline-Metadaten (auto-committed) |
| 27 | GET | /session-info | Session-Status mit Uptime (auto-committed) |
| 28 | GET | /standup | Daily Standup Report ($0) |
| 29 | POST | /standup/cleanup | Invalide Worker-Scores entfernen |

---

## Neue Dateien

```
server/src/lib/opusDecomposer.ts       — 7-Stufen Decomposer Pipeline (700 Zeilen)
server/src/lib/opusDailyStandup.ts     — Worker-Performance-Analyse (270 Zeilen)
server/src/lib/opusRenderBridge.ts     — Render API Controller (auto-generiert vom Builder)
```

---

## Decomposer Pipeline v1.0

7 Stufen, davon 5 kosten $0:

```
① GRAPH SCAN ($0)    — Architecture Graph lesen, Abhaengigkeiten, Seams, Forbidden Zones
② FILE ANALYSIS ($0) — Dateien in semantische Bloecke schneiden (imports, types, functions, routes)
③ CUT PLAN ($0)      — Bloecke in CutUnits gruppieren (max ~120 Zeilen), Anker setzen
④ WORKER MATCH ($0)  — Bester Worker pro CutUnit aus DB-Scores + Live Complexity MAP
⑤ SWARM ($$$)        — Worker bearbeiten ihre CutUnits parallel
⑥ SMART MERGE ($0)   — Anker-basierte Zusammensetzung, Import-Dedup, Bracket-Check
⑦ MEISTER ($$$)      — Multi-Meister-Rat validiert das Ergebnis
```

### Auto-Decomposer
Wenn der Roundtable-Pfad einen @PATCH auf eine >200-Zeilen-Datei schreibt,
wird der Patch automatisch durch die Decomposer-Pipeline geroutet:
- Roundtable-Patch wird zur "Spezifikation" fuer die Worker
- Original-Datei wird in-memory gelesen
- SEARCH/REPLACE wird in-memory angewandt (Safe Overwrite)
- Full-File Overwrite an GitHub Action

### File Analysis Erkennung
Block-Typen: imports, types, constants, function, route, class, export, other.
Brace-Depth-Tracking fuer korrekte Block-Grenzen.

### Worker Match (Live)
- Laedt alle Worker-Scores aus DB
- Berechnet: avgScore, recentAvg (letzte 20 Tasks), confidence, effectiveScore
- Blend: 70% Recent + 30% All-time, gewichtet mit Confidence
- `buildLiveComplexityMap()`: Generiert die Complexity-MAP aus echten Scores
- Schlecht performende Worker (Qwen: 18 avg) werden automatisch aussortiert

---

## Daily Standup

`GET /standup` — reine DB-Analyse, $0.

Liefert:
- **Worker-Ranking**: avgScore, recentAvg, taskCount, Trend (improving/declining/stable/new)
- **Insights**: Staerken, Schwaechen, Opportunities, Risks
- **MAP-Empfehlung**: Optimierte WORKER_COMPLEXITY_MAP basierend auf Scores
- **Action Items**: Automatische Empfehlungen (z.B. "Qwen aus Medium entfernen")

### Aktueller Worker-Stand (08.04.2026)
```
Worker      avg  recent  tasks  trend
minimax     52.3   53.6    15    →
kimi        52.2   52.2     6    →
deepseek    50.6   50.6    10    →
sonnet      46.3   46.3     3    →
qwen        17.8   17.8     6    →  ← automatisch entfernt
```

---

## Render-Controller

Claude kann jetzt Render autonom kontrollieren:
- Deploy-Status pruefen: `GET /render/status`
- Redeploy triggern: `POST /render/redeploy`
- Env-Vars lesen: `GET /render/env`
- Env-Vars setzen: `PUT /render/env/:key` (DATABASE_URL, GITHUB_PAT, RENDER_API_KEY geschuetzt)

Env-Vars auf Render gesetzt:
- `RENDER_API_KEY`: (auf Render gesetzt)
- `RENDER_SERVICE_ID`: srv-d69537c9c44c7384tl50

### Autonomer Claude-Workflow
```
Claude schreibt Code
  → POST /push (Dateien an GitHub Action)
  → GitHub Action: tsc + build + commit
  → Render auto-deploys
  → Claude prueft GET /render/status
  → Claude testet per curl
```

---

## Safe Overwrite (Patch-Bug Fix)

Problem: Bei grossen Dateien konnte ein @PATCH mit leerem SEARCH-Block die
ganze Datei ueberschreiben statt nur den neuen Code einzufuegen.

Fix: `toSafeOverwritePayloads()` in opusBridgeController.ts:
1. Liest die Original-Datei vom Render-Container
2. Parst SEARCH/REPLACE aus dem Patch-Body
3. Wendet den Patch in-memory an
4. Sendet das Ergebnis als Full-File Overwrite an GitHub Action

---

## Roundtable-Optimierungen

### Smart File Truncation
Vorher: Erste 15000 Zeichen, Rest abgeschnitten.
Nachher: 60% Anfang + 40% Ende (25000 Zeichen gesamt).
KIs sehen jetzt auch Endpoints am Dateiende.

### @ASSIGN entfernt
Der Roundtable schreibt nur noch @PATCH.
Das System entscheidet automatisch ob der Patch direkt angewandt wird
oder durch den Decomposer geroutet wird (>200 Zeilen Datei).

---

## Bekannte Limits / Offene Punkte

### /push Payload-Limit
GitHub repository_dispatch hat ein ~10KB Payload-Limit.
Fuer groessere Pushes (mehrere Dateien): git push mit GITHUB_PAT noetig.
Fix-Idee: Dateien einzeln nacheinander pushen, oder Base64+Chunking.

### Lokale Aenderungen nicht deployed
4 Dateien sind lokal geaendert aber noch nicht gepusht (Payload war zu gross):
- `server/src/lib/providers.ts` — 60s Provider-Timeout (AbortSignal.timeout)
- `server/src/lib/opusDecomposer.ts` — Live Worker MAP aus DB-Scores
- `server/src/lib/opusDailyStandup.ts` — cleanupInvalidScores() Funktion
- `server/src/routes/opusBridge.ts` — POST /standup/cleanup Endpoint

WICHTIG: Diese muessen in der naechsten Session einzeln via /push oder per git push deployed werden.

### Haengende Tasks
Einige Tasks bleiben in "scouting" haengen — Provider-Timeout.
Fix (lokal, noch nicht deployed): `AbortSignal.timeout(60_000)` in fetchWithRetries.

### Worker "58" in DB
Geist-Eintrag vom alten Parser-Bug. Cleanup-Endpoint gebaut aber noch nicht deployed.

---

## Commit-Historie Session 4+5

```text
4a32085 feat(builder): auto-applied patches (getRecommendedWriter via Decomposer E2E)
bee094f feat: useDecomposer direct mode — skip roundtable
31a69b8 feat: getWorkerRanking() + fix: safe in-memory patch application
822c7f9 docs: session 4 handoff
88dd0f7 feat(builder): auto-applied patches (session-info endpoint)
28d6da6 feat(builder): auto-applied patches (pipeline-info endpoint)
6595c77 fix: smart file truncation (head+tail) + MAX_FILE_SIZE 25K
e16e1f2 fix(S2): auto-decomposer based on file size, remove @ASSIGN
083ee47 feat(S2): algorithmic decomposer pipeline (700 Zeilen)
c91ba21 feat(builder): auto-applied (S2-STATUS.md push test)
4e19886 feat: /push endpoint for direct file commits
dbd24ce feat(S2): Roundtable→Swarm @ASSIGN delegation
983d790 fix: validate worker name in score parsing
```
Plus 6 Auto-Commits vom Builder und diverse push_candidate Tasks.

---

## Auth / Zugang

```
Opus-Bridge:     ?opus_token=opus-bridge-2026-geheim
Render API Key:  (auf Render als RENDER_API_KEY gesetzt)
GitHub PAT:      (auf Render als GITHUB_PAT gesetzt — nicht in Dateien speichern)
Service ID:      srv-d69537c9c44c7384tl50
```

---

## Naechste Schritte (priorisiert)

1. **Lokale Aenderungen deployen** — 4 Dateien einzeln via /push oder git push
2. **DB-Cleanup** — POST /standup/cleanup um "58" Ghost zu entfernen
3. **Push-Chunking** — /push fuer groessere Payloads (einzeln nacheinander)
4. **Multi-File Decomposer E2E** — Task der 2-3 Dateien gleichzeitig aendert
5. **Architecture Graph erweitern** — Opus-Bridge Dateien als Nodes, damit Decomposer Graph-Kontext hat
6. **Daily Standup Automation** — Standup-Report automatisch nach X Tasks generieren
