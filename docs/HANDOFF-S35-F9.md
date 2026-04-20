# HANDOFF S35-F9 — False-Positive Pipeline Path Fix (partial)

**Datum:** 2026-04-20 (vormittags, Gürcan auf der Arbeit, Claude arbeitet eigenständig unter Aufsicht)
**Vorgänger:** S34b (`docs/HANDOFF-S34b.md`, Live-Commit `9cf39f8`)
**Commits dieser Session:**
- `ee966f5` — docs: STATE.md body sync + SESSION-STATE task 0b DONE
- `1065cd3` — Code: F9 Schritt A+D live
- `5e8131b` — docs: CLAUDE-CONTEXT drift 12 + SESSION-STATE task 8 mostly-done
- dieser Handoff-Close-Commit
- Plus Auto-Backfill-Commits vom Session-Log-Hook (docs-only, paths-ignore)

**Live-Commit-Kette:** Code-Stand enthält `1065cd3` (F9 Schritt A+D). Render-Build wurde auf den nachfolgenden Session-Log-Backfill-Commit (`e019029`) gemacht, der aber nur `docs/SESSION-LOG.md` ändert — Code-Content identisch zu `1065cd3`.

---

## 1. Was in S35-F9 passiert ist

### 1a. Kontext-Check vor Code-Änderungen (30 Min)

Externer Handoff-Text beschrieb F9 als nächsten Arbeitsblock. Vor jeder Code-Arbeit habe ich CLAUDE-CONTEXT, STATE, RADAR, SESSION-STATE, S31-CANDIDATES, HANDOFF-S34b und die vier Ziel-Code-Dateien (`opusSmartPush.ts`, `opusTaskOrchestrator.ts`, `builderGithubBridge.ts`, `builder-executor.yml`) via curl auf `raw.githubusercontent.com` geholt und gelesen.

**Befundene Unstimmigkeiten beim Kontext-Check:**
- STATE.md-Header war frisch (`current_repo_head: 9cf39f8`), aber STATE.md-Body hing auf `2f87a39` im "Current Repo-Visible Truth"-Block. Gefixt in `ee966f5`.
- SESSION-STATE.md Task 0b ("RADAR-Kandidat F6 eintragen") war in S34b erledigt, aber nicht als DONE markiert. Gefixt in `ee966f5`.
- `/api/health` meldete beim ersten Request `DNS cache overflow` HTTP 503, 2s später HTTP 200 — Cold-Start-Symptom. Der Fix aus Task #4 (undici-Dispatcher) betrifft ausgehende Calls; der eingehende Health-Endpoint selbst stolpert beim Container-Start kurz. Nicht kritisch, als Beobachtung notiert.

### 1b. Design-Entscheidung: Callback statt SHA-Polling

Die ursprüngliche S31-Spec schlug 3×15s SHA-Polling via GitHub API vor. Beim Design-Check wurden zwei Probleme sichtbar:
1. **45s reicht nicht** — pnpm install + tsc + build dauern typischerweise 60-150s, SHA-Polling würde echte Erfolge als Fehler melden.
2. **Race Condition** bei parallelen Tasks — postSha könnte vom anderen Task sein.

Alternative auf Vorschlag des Nutzers: Callback-basierter Wait. Der Workflow ruft heute bereits `/api/builder/tasks/:id/execution-result` zweimal auf (einmal nach Build, einmal nach Push/Fail). Die taskId aus der URL löst Race-Probleme deterministisch, und ein Signal-Waiter-Pattern vermeidet API-Rate-Limit-Sorgen komplett.

### 1c. F9 Schritt A+D Umsetzung (Commit `1065cd3`)

**Neue Datei:** `server/src/lib/pushResultWaiter.ts` (~90 Zeilen)
- In-Memory `Map<taskId, Waiter>` mit `setTimeout.unref()` damit der Prozess nicht hängt
- `waitForPushResult(taskId, timeoutMs)` → Promise, resolved bei Signal oder Timeout
- `signalPushResult(taskId, {landed, commitHash, reason})` → löst Promise auf
- Bei Doppel-Waiter für dieselbe taskId (sollte nie passieren): älterer wird ersetzt mit `reason:'replaced_by_newer_waiter'`

**Edit:** `server/src/lib/opusSmartPush.ts`
- Liest jetzt `taskId` aus jeder `/push`-Response
- Sammelt dispatchte taskIds, wartet am Ende via `Promise.all` auf Callbacks
- Timeout 3 Minuten (`PUSH_CALLBACK_TIMEOUT_MS`)
- `pushed: true` nur bei verifizierter Landung (`landed: true` für alle dispatches UND keine errors)
- Der Direct-Patch-Pfad mit ghToken bleibt synchron — der ist bereits konsistent und braucht keinen Wait
- Neue optionale Felder in `SmartPushResult`: `commitHash` und `landed`

**Edit:** `server/src/routes/builder.ts` execution-result-Handler
- Import `signalPushResult`
- Neuer Branch: `committed === false` → DB-Status `review_needed` + `signalPushResult({landed:false, reason})`
- Erfolgs-Branch: `committed === true && commit_hash` → wie gehabt + `signalPushResult({landed:true, commitHash})`
- Erster Callback (ohne `committed`-Feld) signalisiert nicht — der zweite folgt zuverlässig wegen `if: always()` im Workflow
- `reason` wird zusätzlich in `builderActions.payload` und `builderActions.result` geschrieben

**Schritt D** ist automatisch erledigt, weil `opusTaskOrchestrator.ts:323` seit jeher `status: push.pushed ? 'ok' : 'error'` macht. Sobald `push.pushed` der Realität entspricht, ist die Phase-Status-Propagation ehrlich.

### 1d. Pre-Push-Verifikation

Das Repo lokal flach geklont, eigene Edits reinkopiert, pnpm install + `npx tsc --noEmit` (server) + `npx tsc -b` (client) — beide grün. Damit war die größte Unsicherheit (Render's strikter noUnusedParameters-Check) vor dem Push ausgeräumt.

### 1e. Push-Blockade entdeckt (Drift 12)

Der erste kombinierte Push (Code + Workflow-File in einem atomaren Commit) schlug mit GitHub 404 bei Tree-Creation fehl. Separater Docs-Push ging durch, Push ohne Workflow-File ging durch — Ursache identifiziert: **Der Bridge-GitHub-Token hat keinen `workflows`-Scope**. GitHub rejected den atomaren Tree-Create sobald eine Datei unter `.github/workflows/*` im Tree ist. Das erklärt rückwirkend, warum historische Workflow-Änderungen immer manuell gemacht wurden — wir hatten die Limitation nie explizit dokumentiert.

Konsequenz für F9: Schritt A+D gingen als Code-Commit durch. Schritt C (Workflow-File-Edit) wurde als Aufgabe für den Nutzer übergeben — fertige Datei liegt lokal bereit, manueller Commit via Web-UI oder persönlichem PAT nötig.

Als Drift 12 in `docs/CLAUDE-CONTEXT.md` dokumentiert.

### 1f. Live-Verifikation (Probe-Test)

Um zu belegen dass der neue Code auf Render läuft — nicht nur dass der Commit existiert —, habe ich einen preiswerten Probe-Test gefahren:
- `POST /api/builder/opus-bridge/push` mit einer neuen Testdatei (`server/src/f9-probe-delete-me.ts`) die absichtlich TypeScript-invaliden Code enthält
- taskId `d6fbfb91-0bde-4ea3-8d61-4ecd393bfd1c` zurück
- Nach 150s: `GET /observe/:taskId` zeigte zwei Action-Einträge:
  - Erster Callback (Build-Result): `tsc:"true"`, `build:"false"`, **`result.reason: null`** (mein neuer Handler schreibt das Feld, altes hatte es nicht)
  - Zweiter Callback (Commit-Result): `committed:false`, `reason:"checks_failed"`, **`result.reason: "checks_failed"`**
- Task-Status: `review_needed`
- Probe-Datei NICHT auf main (404 auf raw.githubusercontent.com) — tsc-fail hat den Commit wie erwartet blockiert

Das `reason`-Feld im result-Objekt ist der entscheidende Fingerabdruck: altes Schema hat es nicht, neues schon. **Mein Code ist live und funktioniert.**

---

## 2. Prozess-Lehren

### 2a. Drift 12 — Bridge-Token-Workflows-Scope

Strukturelle Limitation der Push-Infrastruktur. Workaround ist klar (manueller Commit via Web-UI), aber die Reibung sollte langfristig adressiert werden — entweder Bridge-Token upgraden auf `workflow`-Scope, oder dedizierte Workflow-Push-Route mit eigenem PAT-Secret bauen. Letzteres wäre sauberer weil Scope-Erweiterung des Bridge-Tokens die Angriffsoberfläche für alle anderen Bridge-Operationen vergrößert.

### 2b. Callback-Pattern schlägt Polling

Die ursprüngliche Spec schlug SHA-Polling vor. Das Callback-Pattern hat drei konkrete Vorteile:
1. Kein Rate-Limit-Risiko (null GitHub-API-Calls statt 3-12 pro Push)
2. Sofortige Fehler-Erkennung statt Polling-Fenster
3. Task-ID-basierte Disambiguation löst Race-Conditions bei parallelen Pushes

Nachteil: In-memory-Queue überlebt keinen Server-Restart. Das ist akzeptabel, weil die Fallback-Semantik (Timeout → pushed:false) safe ist — keine False-Positives bei Server-Restart, nur verlangsamte Fehlererkennung.

### 2c. Pre-Push-TSC-Check ist robust wertvoll

Der lokale `pnpm install` + `tsc --noEmit` vor jedem Bridge-Push hat meine Confidence von ~70% auf ~95% gehoben. Der Render-Build ist strikter als viele lokale Configs (noUnusedParameters etc.), und ohne Pre-Check hätte ich vermutlich einen Rundreise-Build-Fail gehabt. Die 2-3 Minuten sind gut investiert.

---

## 3. Was live ist nach S35-F9

- **F9 Schritt A** (SHA/Landung-Verify in smartPush): live via `1065cd3`, über Callback-Pattern statt Polling
- **F9 Schritt D** (Orchestrator-Status-Treue): automatisch mitgefixt durch Schritt A
- **F9 Schritt C** (Workflow-Härtung): OFFEN, fertige Datei wartet auf manuellen Commit
- **pushResultWaiter.ts**: neues Modul, in-memory-Koordination zwischen smartPush und execution-result-Handler
- **execution-result-Handler**: kennt jetzt `committed === false` explizit, schreibt `reason` in DB, signalisiert terminale Ergebnisse
- **STATE.md Body**: teilweise gesyncht (Zeile 406 von `2f87a39` auf `9cf39f8`); die "Last Completed Block" und "Next Recommended Block" Sektionen weiter unten werden in diesem Handoff-Close-Commit nachgezogen
- **CLAUDE-CONTEXT.md**: Drift 12 eingetragen, last_session auf `S35_F9_partial`, active_threads `builder_S31_observability` auf `mostly_done`
- **Probe-Datei** (`server/src/f9-probe-delete-me.ts`): nicht auf main gelandet (tsc-fail hat Commit blockiert) — nichts aufzuräumen

---

## 4. Offen für die nächste Session

### 4a. Sofort (gehört zu F9)

1. **Schritt C manuell committen** — `builder-executor.yml` Zeile 141-144: statt `echo "No changes to commit" / exit 0` sendet der Branch jetzt einen Callback mit `{"committed": false, "reason": "empty_staged_diff"}` und macht `exit 1`. Diff ist 2 Zeilen raus, 5 rein. Via GitHub-Web-UI: Repo → Datei → Bleistift-Icon → Inhalt aus dem während der F9-Session bereitgestellten File reinkopieren → Commit to main.

2. **Akzeptanztest nach Schritt C** — `/opus-feature` mit `"fuege Code nach der Zeile UNIQUE_MARKER_THAT_DOES_NOT_EXIST ein"` → erwartet `status: 'partial'` oder `'failed'`, nicht `'success'`. Mit Schritt C in Sekunden, ohne Schritt C nach 3-Min-Timeout.

### 4b. Sauberer Nebenbefund aus F9

3. **Fire-and-forget `regenerateRepoIndex()` in `/push`** — in `server/src/routes/opusBridge.ts` (um Zeile 1028-1033) wird regen-index getriggert wenn `result.triggered` (Dispatch-Akzeptanz), nicht bei echter Landung. Der execution-result-Handler in `builder.ts:639` macht regen-index bereits korrekt bei `committed === true`. Der Call in `/push` ist damit redundant und läuft auch bei False-Positive-Dispatches. Entfernen wäre sauber. Kleiner Einzeiler-Fix, aber triggert Deploy.

### 4c. Aus älteren Sessions weiter offen

4. **TSC-Retry Roundtable-Pfad** (aus S30, ~30 Min) — Im Roundtable-only-Pfad `tscRetryContext` aus Roundtable-Patches synthetisieren und an Decomposer delegieren. Schließt den TSC-Retry-Mechanismus auf 100%.

5. **Block 5d PR #2 — Context-Split** (aus S30, ~45 Min) — Maya-Guide via React Context statt Prop-Drilling.

6. **F6 File-Scout gegen Scope-Halluzination** (RADAR) — Deterministische Verifikation jedes Dateipfads im Worker-Scope gegen den Repo-Index vor dem Lauf. War bis F9-Fix auf `why_not_now: Aktuell hoehere Prioritaet auf S31-False-Positive-Pipeline-Path-Fix`. Nach Schritt C ist F9 geschlossen und F6 als nächster strukturell sinnvoller Block offen.

7. **Async Job-Pattern für /opus-task** (aus S24) — löst Render 60s Timeout bei großen Tasks.

8. **Kaya-Rename im Code** (16 Orion-Stellen) — zurückgestellt bis Maya-Core-Migration.

### 4d. Strategische Entscheidungen (unverändert)

- Maya-Core-Cut (blockiert seit 2026-04-05)
- FUSION-ENGINE-SPEC umsetzen
- ARCHITECTURE-GRAPH-SPEC v1.1 bauen

---

## 5. Für neue Chats

Einstiegs-Reihenfolge unverändert:

1. `docs/CLAUDE-CONTEXT.md` — Anker (jetzt mit 12 Drift-Einträgen)
2. `STATE.md`
3. `RADAR.md` (F9-Kandidat jetzt `mostly_adopted`)
4. `docs/SESSION-STATE.md`
5. **Dieser Handoff** (`docs/HANDOFF-S35-F9.md`)
6. Bei Bedarf: `HANDOFF-S34b.md`, `HANDOFF-S34.md`, ...

**Wichtige Erinnerung für F9-Folge-Arbeit:** Bevor Code in `.github/workflows/*` geändert wird, gilt Drift 12 — Bridge-Token kann nicht committen. Änderungen an Workflow-Files müssen manuell laufen.

Session-Historie-Lücke unverändert: S22, S23, S26, S27, S28, S29.

---

## 6. Session-Close-Nachtrag — Akzeptanztest und finale Anker-Sync (nachmittags)

Nachdem Copilot den Workflow-Commit `bf22892` (Schritt C) durchgezogen hatte, lief der Live-Akzeptanztest:

**Probe:** `/api/builder/opus-bridge/push` mit einem search/replace-Payload, in dem `search` den nicht-existenten Anchor `UNIQUE_MARKER_THAT_DOES_NOT_EXIST_F9_ACCEPTANCE_TEST` enthielt. Ziel-Datei: `server/src/index.ts`. Erwartet: Der Workflow schreibt die Datei mit unverändertem Inhalt (kein Match), `git add -A` zeigt keine staged changes, der neue empty-diff-Branch feuert den Callback mit `reason:"empty_staged_diff"` und beendet mit `exit 1`.

**Task-ID:** `f5d6ac23-aac2-48bc-89ac-5e69d86ff445`

**Ergebnis nach ~2 Minuten:**
- Task-Status: `review_needed`
- `task.commitHash`: `None`
- Zweiter `GITHUB_ACTION_RESULT`-Action-Eintrag zeigt im payload: `reason:"empty_staged_diff"`, `committed:false`; im result: `reason:"empty_staged_diff"`, `tsc_ok:false`, `build_ok:false`, `committed:false`, `commit_hash:null`
- Keine Probe-Datei-Änderung auf `main` (`server/src/index.ts` unverändert)

**Bedeutung:** Die komplette Kette aus Schritt A (Workflow sendet Callback → builder.ts schreibt reason in DB → signalPushResult terminal → opusSmartPush Promise.all resolved mit landed:false) + Schritt C (empty-diff-Callback aus dem Workflow) + Schritt D (Orchestrator-Status auf partial/failed durch push.pushed) funktioniert End-to-End wie spezifiziert. False-Positive-Success ist strukturell ausgeschlossen.

**F9 Status:** adopted in RADAR, DONE in SESSION-STATE Task 8, done in CLAUDE-CONTEXT active_threads, last_completed_block in STATE.md.

**Commit-Uebersicht dieser Session (chronologisch):**
- `ee966f5` — docs: STATE body sync + SESSION-STATE task 0b DONE
- `1065cd3` — Code: F9 Schritt A+D (pushResultWaiter.ts neu, opusSmartPush.ts Callback-Wait, builder.ts signal-Integration)
- `5e8131b` — docs: CLAUDE-CONTEXT Drift 12 + SESSION-STATE Task 8 mostly-done
- `5432fea` — docs: HANDOFF-S35-F9, STATE Last/Next Block, RADAR F9 mostly_adopted
- `a1e666a` — docs: S31-CANDIDATES Session-Tracking S35-F9
- `0ffd896` — docs: BUILDER-STUDIO-SPEC Umsetzungs-Stand F9
- `0a8aa88` — docs: SESSION-CLOSE-TEMPLATE v2 mit 3 Phasen + Anti-Vergessen-Mechanik
- `bf22892` — Workflow: F9 Schritt C (via Copilot, workflows-Scope)
- **Dieser Close-Commit** — docs: F9 komplett (RADAR adopted, Handoff-Close, STATE next = F6)

**Dogfood-Feedback zum neuen SESSION-CLOSE-TEMPLATE:** Das Template wurde in dieser Session zum ersten Mal angewandt. Phase 1 (Kontext-Check mit Selbst-Check) hatte am Morgen die beiden kleinen Drifts gefunden (STATE-body-Head, SESSION-STATE task 0b). Phase 2 (Pre-Push-TSC) hat lokal bestaetigt dass der F9-Code vor dem Bridge-Push sauber compiliert. Phase 3 (Live-Verify + Anker-Sync) ist jetzt gerade durch. Der grosse Mehrwert gegenueber Version 1 des Templates: der Live-Verify-Schritt ist explizit, nicht optional. Ohne diesen Schritt haette ich F9 als "deployed" markiert ohne die Gewissheit dass der Code im Container tatsaechlich ausgefuehrt wird.
