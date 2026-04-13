# HANDOFF — S20 Complete: Cleanup + Status-Tracking + Fuzzy Matching
# Stand: 13.04.2026

## WAS HEUTE GEBAUT WURDE (S20)

### Deployed & Verifiziert

| # | Feature | Status |
|---|---------|--------|
| 1 | Duplikat POST /cleanup geloescht (alter Endpoint Zeile 1009) | Deployed |
| 2 | FK-Luecke gefixt: builderMemory + sourceTaskId Cascade | Deployed |
| 3 | Resilientes Cleanup: per-task try/catch + raw SQL fallback | Deployed |
| 4 | 363 alte Tasks geloescht: DB sauber (506 total, 505 done) | Verifiziert |
| 5 | Status-Tracking-Bug gefixt: updateTaskStatus() Helper + 5 Phasen-Updates | Deployed |
| 6 | Stale-Detector: council Status (15min Threshold) | Deployed |
| 7 | Fuzzy Line Matching fuer SEARCH/REPLACE auf grossen Dateien (70% Threshold) | Deployed |
| 8 | /migrate cwd-Fix (process.cwd() statt parent dir) | Deployed |
| 9 | Chat-Intent-Heuristik gestaerkt (mehr Verben, Code-Hints, Action-Phrases) | Deployed |

---

## GEAENDERTE DATEIEN (S20)

### Geaenderte Dateien
- `server/src/routes/opusBridge.ts` — Duplikat /cleanup geloescht, /migrate cwd-Fix
- `server/src/lib/opusBridgeController.ts` — updateTaskStatus() Helper, 4 Phasen-Updates (planning/council/swarm/applying), fuzzyFindBlock() Funktion
- `server/src/lib/builderStaleDetector.ts` — council Status (15min Threshold)
- `server/src/lib/builderFusionChat.ts` — looksLikeTaskRequest() gestaerkt (mehr Verben, codeHint, actionPhrase)
- `docs/SESSION-STATE.md` — S20 Stand

---

## ARCHITEKTUR-AENDERUNGEN

### Status-Tracking (NEU S20)
Pipeline-Tasks durchlaufen jetzt sichtbare Phasen in builder_tasks.status:
```
scouting -> planning -> council -> swarm -> applying -> done/error
```
- `updateTaskStatus(taskId, status)` Helper in opusBridgeController.ts
- Stale-Detector kennt alle Phasen (planning=10min, council=15min, swarm=15min, applying=10min)
- Quick Mode (/opus-task) ist NICHT betroffen — hat keinen DB-Record

### Fuzzy Line Matching (NEU S20)
Wenn exakter SEARCH-Block-Match fehlschlaegt:
1. Normalisiert Zeilen (trim + collapse whitespace)
2. Sliding Window ueber Originaldatei
3. Testet auch +/-2 Zeilen Differenz (Model kann Zeilen hinzufuegen/entfernen)
4. Akzeptiert ab 70% Line-Match-Confidence
5. Loggt Score und Zeilenbereich fuer Debugging

Funktion: `fuzzyFindBlock()` in opusBridgeController.ts

### Cleanup-Endpoint (gefixt S20)
POST /cleanup mit vollstaendiger FK-Cascade:
- 9 FK-Tabellen: builderChatpool, builderActions, builderOpusLog, builderReviews, builderWorkerScores, builderErrorCards, builderArtifacts, builderTestResults, builderMemory
- Zusaetzlich: builderErrorCards.sourceTaskId
- Per-task try/catch — einzelne Fehler blockieren nicht den Rest
- Raw SQL fallback wenn Drizzle-Delete fehlschlaegt

---

## IM NAECHSTEN CHAT

### 1. Fuzzy Matching live testen
Pipeline-Task auf einer grossen Datei (>20KB) triggern und pruefen ob:
- Status-Phasen korrekt durchlaufen werden (scouting→planning→council→swarm→applying→done)
- Fuzzy Matching greift wenn Worker ungenaue SEARCH-Bloecke produziert
- Log-Output Score und Zeilenbereich zeigt

### 2. Produkt-Prioritaeten
Laut Roadmap: verify audio → Crush-Score 70+ → Builder Studio Phase B1

### 3. Provider-Specs
Letzte Pruefung: 09.04.2026. Faellig ab ~23.04.2026 (2-Wochen-Regel).

---

## OFFENE PROBLEME (alle Mittel oder Perspektivisch)

### Mittel
1. Fuzzy Matching in Praxis testen
2. /builder + /maya Konsolidierung (beide >50KB, braucht Copilot)
3. Task-Detail-View "undefined" — nicht reproduzierbar, Rendering hat korrekte Guards
4. /migrate: cwd gefixt, drizzle-kit nur devDep (Schema-Push via Build-Step)

### Perspektivisch
5. Nachdenker-Aggregation
6. Pipeline-Monitoring UI (Live-Fortschritt im Chat)
7. AICOS-Card-Integration

---

## TECHNISCHE DETAILS

- **Repo:** github.com/G-Dislioglu/soulmatch, Branch main
- **Live:** soulmatch-1.onrender.com
- **Auth:** token=builder-2026-geheim, opus_token=opus-bridge-2026-geheim
- **Task-DB:** 506 total (505 done, 1 aktiv)
- **Letzte Commits:** 0f78c4d (migrate+intent), vorher fuzzy-matching, status-tracking, cleanup
