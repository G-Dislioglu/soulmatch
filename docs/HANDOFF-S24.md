# HANDOFF S24

**Datum:** 2026-04-14 (Abendsession)
**Vorgänger:** S23

---

## Deliverables

### 1. Token-Limits 100k ✅
- `opusWorkerSwarm.ts`: alle maxTokens/workerTokens/meisterTokens auf 100000
- `opusBridge.ts`: `/opus-status` liest jetzt aus `WORKER_MAX_TOKEN_CAP` (Config) statt hardcoded 6000
- **Commit:** `b8a5dc7` config: worker token limits 100k

### 2. Anchor-Patch-Modul ✅
- Neues Modul `server/src/lib/anchorPatch.ts` mit 5 Edit-Modi:
  - `insert-after` / `insert-before` — chirurgische Einfügungen via Anker-Zeile
  - `replace-block` — Block zwischen zwei Ankern ersetzen
  - `patch` — klassisches search/replace (bestehend)
  - `overwrite` — Full-File (Fallback)
- Exportiert: `parseWorkerEdit()`, `applyEdit()`, `validateEdit()`, `ANCHOR_PATCH_PROMPT`
- In `opusWorkerSwarm.ts` integriert: Worker-Outputs werden durch anchorPatch geparst/validiert/angewendet
- Test: `server/src/lib/anchorPatch.test.ts`
- **Commit:** `8aa8032` feat(pipeline): integrate anchor-patch into worker swarm
- **Beweis:** Erster erfolgreicher chirurgischer Edit auf opusBridge.ts (1400 Zeilen) — 4/5 Worker valide, ~1000 chars statt 50.000+

### 3. Client-Dateien im Scout-Index ✅
- Index-Generator scannte bereits `server/src/` + `client/src/` — war nur nicht frisch regeneriert
- Nach `/regen-index`: 439 Dateien indexiert (server + client)
- Pipeline kann jetzt Client-Komponenten (React/TSX) scopen und editieren
- **Getestet:** PatrolConsole.tsx erfolgreich über Pipeline gescoped und editiert

### 4. Patrol Console UI ✅
- Navigation: Builder ↔ Patrol (Links in beide Richtungen)
- Config-Sektion: 3 Routine-Scout-Karten + 5 Deep-Analysis-Karten
- Custom Dark-Theme Dropdown für Modell-Auswahl (kein natives Select)
- **Commits:** `f4c8f50`, `740a350`, `aa1d528`, `7053331`

### 5. Builder Studio UI-Fixes ✅
- Text-Overflow in Task-Karten: `word-break`, `text-overflow: ellipsis`, `-webkit-line-clamp`
- Status-Badges: `max-width` + ellipsis
- Task-Detail-Titel: `overflow-wrap: break-word` statt `break-all`
- Patrol Console Button: Border-Button-Stil passend zu Nachbar-Buttons
- **Commit:** `f4c8f50` fix(ui): overflow fixes + builder↔patrol navigation

### 6. Maya Chat Task-Erkennung ✅
- `looksLikeTaskRequest()` in `builderFusionChat.ts` exportiert + Umlaut-Normalisierung (ü→ue, ä→ae, ö→oe, ß→ss)
- `/maya/chat` Handler in `builder.ts`: erkennt Tasks via `looksLikeTaskRequest()` und routet sie direkt an die Builder-Task-Engine (kein HTTP-Self-Loop)
- Datei/Bild-Uploads bleiben auf normalem Chat-Pfad
- **Commit:** `539e358` feat(maya): auto-detect tasks in chat and route to opus-task
- **Getestet:** "füge einen health-check button hinzu" → Task erkannt, "wie geht es dir?" → Chat

### 7. UX-Polish ✅
- Maya Task-Antworten: goldene Bestätigungskarte statt rohem JSON (`✨ Task erstellt`)
- Task-Detail-Titel: natürliches Wrapping mit 3-Zeilen-Clamp
- **Commit:** `986072b` polish(ui): task confirmation card + detail title wrapping

### 8. Git DNS permanent gefixt ✅
- `git config --global --add http.curloptResolve "github.com:443:140.82.121.3"`
- Auto-Deploy funktioniert wieder (verifiziert bei `539e358`: "New commit via Auto-Deploy")

---

## Bekannte offene Punkte

### Pipeline
- **Render-Timeout (~60s)** blockiert echte `/opus-task` Pushes → Workaround: dryRun → git-push. Lösung: Async Job-Pattern (Task startet → Job-ID → Poll-Endpoint)
- **Patrol Config nicht persistent** — Modell-Auswahl in Patrol Console ist nur lokaler React-State. Backend-Endpoint zum Speichern fehlt
- **Visual Patrol** — GLM-5V-Turbo ($1.20/1M) kann Screenshots analysieren. Puppeteer-Integration geplant für automatische CSS/Layout-Bug-Erkennung

### UI
- **Task-Bestätigungskarte** — noch nicht im Browser verifiziert (Copilots lokaler Test scheiterte an DB-Auth, Deploy ist aber live)
- **Patrol Console** — Deep-Analyse-Button pro Finding existiert aber ist noch nicht an echtes Backend angebunden

---

## Nächste Session starten mit

```
Lies docs/HANDOFF-S24.md, dann:
1. Async Job-Pattern für Pipeline (löst Render-Timeout)
2. Visual Patrol mit GLM-5V-Turbo (Screenshot → Vision-Analyse)
3. Patrol Config Backend (Modell-Auswahl persistent speichern)
```

---

## Commit-Übersicht S24

| Commit | Message |
|--------|---------|
| `b8a5dc7` | config: worker token limits 100k |
| `8aa8032` | feat(pipeline): integrate anchor-patch into worker swarm |
| `f4c8f50` | fix(ui): overflow fixes + builder↔patrol navigation |
| `740a350` | fix(ui): patrol button style + patrol config section |
| `aa1d528` | feat(patrol): interactive model selection + scout config |
| `7053331` | fix(ui): custom dark-theme model dropdown |
| `539e358` | feat(maya): auto-detect tasks in chat and route to opus-task |
| `986072b` | polish(ui): task confirmation card + detail title wrapping |
