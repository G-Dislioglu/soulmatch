# HANDOFF S35-F10 — Async-Jobs-Persistenz + Drift-Folgebereinigungen

**Datum:** 2026-04-20 abends (18:13 – ca. 19:30)
**Vorgänger:** S35-F6 (`docs/HANDOFF-S35-F6.md`)
**Commits dieser Session:**
- `c4641d3` — docs: F10-Spec
- `de90e6a` — docs: HANDOFF-S23.md aus `/undefined` rekonstruiert (Drift 14 Teil 1)
- `3ad613e` — docs: CLAUDE-CONTEXT Drift 14 Eintrag
- `18922c4` — cleanup: `/undefined`-Datei via git rm entfernt (Drift 14 Teil 3)
- `5656998` — docs: Session-Historie-Lücke-Hinweis in beiden S35-Handoffs aktualisiert
- `5e63e2d` — F10 live-verify trigger (docblock auf health.ts für Container-Restart)
- `8f10249` — Drift 13 Nachfix (git fetch vor ancestor-check)
- `b7d3eb3` — Double-Deploy-Fix (DEPLOY_WAIT_SECONDS 180→600)
- F10-Followup (Copilot, letzter Commit dieser Session): `updateAsyncJob` DB-Lookup bei Cache-Miss
- Dieser Session-Close-Commit

**Aus Vorarbeit (gestern Abend, andere Session):**
- `851f7ba` — F10 Code: async_jobs-Tabelle + Persistenz-Pattern
- `693632b` — docs: HANDOFF-S22-S29-RECONSTRUCTED (Session-Historie-Lücke geschlossen)

**Live-Commit nach Session-Ende:** aktueller main-HEAD via Auto-Deploy.

---

## 1. Was in S35-F10 passiert ist

### 1a. Ausgangslage

Nach S35-F6 war der Plan: „der Reihe nach alles durchziehen". Geplant waren F10 (Async-Jobs-Persistenz), Bridge-Token Workflows-Scope Upgrade, F6 für /opus-feature-Pfad, Legacy-Handoff-Rekonstruktion. Zwei Überraschungen verschoben den Plan:

1. **F10 war bereits umgesetzt.** Copilot hatte gestern Abend parallel zur F6-Arbeit `851f7ba` gepusht. Code stand, nur Migration + Live-Verify fehlten.
2. **Legacy-Handoff war bereits rekonstruiert.** `693632b` vom Vortag hatte den Sammel-Handoff `HANDOFF-S22-S29-RECONSTRUCTED.md` bereits angelegt.

Beide Entdeckungen waren Beispiele für Drift 10 (stale Specs/Handoffs): der heutige S35-F6-Handoff hatte beide Aufgaben noch als offen gelistet, obwohl sie erledigt waren.

### 1b. Drift 14 entdeckt und geschlossen

Beim Durchgehen der Rekonstruktion fiel auf: S23 tauchte darin als Sonderfall auf — der damalige Handoff-Commit `6ff65f9` hatte den Inhalt unter dem Dateinamen `/undefined` im Repo-Root abgelegt statt unter `docs/HANDOFF-S23.md`. Vermutete Ursache: Bridge-Push-Endpoint hat das `file`-Feld nicht korrekt aus dem Payload gelesen oder ein Fallback-Literal `"undefined"` durchgereicht. Die Datei lag seitdem als historisches Residuum im Repo.

Dreifacher Fix in dieser Session:
- `de90e6a` — `docs/HANDOFF-S23.md` am korrekten Pfad angelegt mit Kopf-Kommentar und vollständigem Original-Inhalt
- `3ad613e` — Drift 14 als neuer Eintrag in `docs/CLAUDE-CONTEXT.md` (watchlist + Prosa-Block)
- `18922c4` — `/undefined`-Datei via `git rm` entfernt (lokal, da Bridge keine Delete-Semantik hat)

Session-Historie-Lücke-Hinweis in beiden laufenden S35-Handoffs auf „geschlossen" aktualisiert (`5656998`).

### 1c. F10 Migrate und Live-Verify

`POST /api/builder/opus-bridge/migrate?opus_token=…` antwortete mit „Changes applied" — die `async_jobs`-Tabelle wurde in Neon angelegt.

Live-Verify-Setup: docblock auf `server/src/routes/health.ts` (Commit `5e63e2d`) erzwang Container-Restart. Zwei Jobs zum Test:
- `job-mo7g1xba` — vor Restart angelegt, nach F6-Pfad-Rejection direkt `done`
- `job-mo7gj1ha` — nach Restart angelegt, vollständiger Lifecycle

Nach Restart zeigte `GET /api/health/opus-job-status`:
- `job-mo7g1xba` war noch da (Persistenz bestätigt)
- `job-mo7gj1ha` lief neuen Lifecycle komplett durch (Schreibweg bestätigt)
- Jobs aus der Zeit **vor** der Migration (`job-mo7fzn8y`, `job-mo7g17v4`) waren weg — erwartet, weil sie noch ohne DB-Backing angelegt wurden

Ein Befund fiel auf: `job-mo7g1xba` hing nach dem Restart auf `status: 'running'` statt `done`. Ursache: die Status-Update-Callback-Kette (`.then(...)`) aus dem alten Container schrieb in die in-memory Map, die beim Restart verloren ging, und `persistAsyncJobAsync` wurde in dem Race-Fenster nicht mehr ausgeführt. Das führte zum Followup-Fix.

### 1d. Drift 13 Nachfix

Parallel zur F10-Verify wurde beobachtet, dass der Drift-13-Fix aus S35-F6 (`859d980`) nicht in allen Fällen griff. Grund: `tools/wait-for-deploy.sh` nutzte `git merge-base --is-ancestor`, scheiterte aber wenn der `LIVE_COMMIT` nach dem Runner-Checkout erst gepusht wurde (der Runner kannte ihn lokal nicht). `fetch-depth: 0` im Checkout-Step hilft nur beim Clone-Zeitpunkt.

Copilot-Fix `8f10249` fügt ein `git fetch --quiet origin main 2>/dev/null || true` direkt vor dem ancestor-Check ein. Damit werden nachträglich gepushte Session-Log-Backfills sichtbar.

### 1e. Double-Deploy-Bug

Aus der Render-Dashboard-Beobachtung: jeder Commit wurde zweimal deployed (einmal Auto-Deploy, einmal 3 Minuten später via Deploy-Hook-Fallback). Ursache: `render-deploy.yml` Schritt 1 hatte `DEPLOY_WAIT_SECONDS: 180`, reicht aber nicht für typische Render-Deploy-Zeiten von 4-6 Minuten. Timeout → `outcome != 'success'` → Fallback-Hook feuerte unnötig → zweiter Deploy.

Historisch war der Bug von Drift 13 überdeckt, weil Workflows eh rot waren. Mit funktionierendem Drift-13-Fix wurde er sichtbar. Copilot-Fix `b7d3eb3` setzt Timeout auf 600s.

### 1f. F10-Followup

Der in 1c entdeckte Update-Pfad-Race wurde als letzter Commit der Session gefixt. `updateAsyncJob` konsultiert jetzt bei Cache-Miss die DB, bevor es still returned. Damit überleben Status-Wechsel auch Container-Restart-Fenster, solange das Create in DB gelandet ist.

---

## 2. Prozess-Lehren

### 2a. Parallel-Arbeit zahlt sich aus, aber erzeugt Synchronisationsaufwand

Copilot hatte gestern Abend F10 und Legacy-Handoff ohne Abstimmung erledigt. Das spart Zeit, aber führt zu Drift in den Handoff-Dokumenten. Lehre: wenn parallele Arbeit stattfindet, sollte sie sichtbar im SESSION-STATE oder einem Scratchpad landen. Sonst kommt man in Sessions wie dieser in Doppelchecks.

### 2b. Fix-Kaskaden beim Drift-Fix

Drift 13 hatte zwei Schichten: erst die merge-base-Logik, dann die Timing-Race mit dem Fetch. Jeder Fix legte einen tieferen Defekt frei. Double-Deploy-Bug war wieder eine Schicht tiefer. Gute Faustregel für künftige Drift-Fixes: „nach dem Fix die Dashboard-Events mindestens einen kompletten Deploy-Zyklus beobachten, bevor die Session als geschlossen gilt."

### 2c. Migrations-Endpoint ist kritisches Infrastruktur-Asset

`POST /api/builder/opus-bridge/migrate` ist der einzige praktikable Weg, Schema-Änderungen in Neon zu bringen. F10 hing komplett daran. Sollte dokumentiert bleiben (vermutlich schon in Spec, wenn nicht: Nachtrag in Session-Close-Template).

### 2d. Session-Close-Template v2 trägt weiterhin

Dritte Session in Folge wo das Template durchgelaufen ist. Phase 1 Selbst-Check hat die beiden bereits-erledigten Aufgaben (F10, Legacy-Handoff) gefunden — ohne das Protokoll wäre das erst beim ersten Umsetzungsversuch aufgeschlagen.

---

## 3. Was live ist nach S35-F10

- **F10 komplett** — async-jobs DB-Persistenz, cache-first-Pattern, graceful degradation, Restart-Race im Update-Pfad geschlossen
- **Drift 13 gedoppelt abgesichert** — merge-base-Check + vorhergehender git-fetch
- **Drift 14 geschlossen** — S23-Handoff am korrekten Pfad, `/undefined` entfernt, Eintrag in watchlist
- **Double-Deploy-Bug gefixt** — Render-Deploy läuft nicht mehr doppelt
- **Session-Historie-Lücke final geschlossen** — `HANDOFF-S22-S29-RECONSTRUCTED.md` deckt alles ab, S23 zusätzlich am korrekten Pfad
- **RADAR-Kandidat F10** auf `adopted`
- **SESSION-STATE Task 5** auf DONE

---

## 4. Offen für die nächste Session

### 4a. Kurze Follow-ups

1. **F10-Followup Live-Verify** — neuer Job, Container-Restart, Status-Wechsel auf `done` muss jetzt auch bei Cache-Miss persistiert werden. Geht mit dem gleichen `5e63e2d`-ähnlichen Trigger-Pattern.
2. **Double-Deploy-Fix live beobachten** — nächster Code-Commit sollte im Render-Dashboard nur einen Deploy zeigen, nicht zwei.

### 4b. Strukturell offene Blöcke

3. **opus-feature HTTP-Pfad für F6 erweitern** — `runBuildPipeline`-Weg läuft nicht durch `orchestrateTask`, deshalb greift F6-Hard-Reject dort nur indirekt. Eigener Block wenn explizite Sicherheit für `/opus-feature` gewünscht.
4. **Bridge-Token Workflows-Scope Upgrade** — Drift 12 strukturell lösen. Entweder Token in GitHub-Settings erweitern oder dedizierte Workflow-Push-Route mit eigenem PAT-Secret. `20 Min Clickwork` oder `~20 Min Code + Secret`.
5. **Render-Deploy-Fallback-Hook ganz entfernen?** — Nach Double-Deploy-Fix feuert er so gut wie nie. Könnte als nicht-kritischer Hardening-Block später entfernt werden. Risiko: wenn Render wirklich mal ein Push verpasst, fehlt der Rettungsanker.

### 4c. Altlast aus früheren Sessions

6. **FUSION-ENGINE-SPEC umsetzen** — Multi-Provider-Ensemble pro Persona
7. **ARCHITECTURE-GRAPH-SPEC v1.1** bauen
8. **Maya-Core-Cut** — seit 2026-04-05 offen
9. **Kaya-Rename im Code** — 16 Orion-Stellen, wartet auf Maya-Core-Migration

---

## 5. Für neue Chats

Einstiegs-Reihenfolge unverändert, jetzt mit aktuellem Stand:

1. `docs/CLAUDE-CONTEXT.md` — Anker (14 Drift-Einträge, last_session: S35_F10_complete)
2. `STATE.md`
3. `RADAR.md` (F10 jetzt `adopted`)
4. `docs/SESSION-STATE.md`
5. **Dieser Handoff** (`docs/HANDOFF-S35-F10.md`)
6. Bei Bedarf: `HANDOFF-S35-F6.md`, `HANDOFF-S35-F9.md`, ...

**Wichtige Erinnerungen:**
- Drift 12 (Bridge-Token ohne workflows-Scope) unverändert aktiv — Workflow-Commits bleiben Copilots Domäne
- Drift 13 + Drift 14 geschlossen, aber Einträge bleiben in watchlist als historische Referenz
- Session-Close-Template v2 (drei Phasen) ist Pflicht — `docs/SESSION-CLOSE-TEMPLATE.md`
- Bei parallelem Copilot-Arbeit immer prüfen ob geplante Aufgaben bereits erledigt sind (Drift 10)

Session-Historie-Lücke: geschlossen am 2026-04-20. HANDOFF-S22-S29-RECONSTRUCTED.md deckt S22+S23+S26-S29 ab; HANDOFF-S23.md zusätzlich am korrekten Pfad.
