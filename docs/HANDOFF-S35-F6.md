# HANDOFF S35-F6 — Scope-Hallucination Hard-Reject

**Datum:** 2026-04-20 (abends, nach der F9-Mittagssession)
**Vorgänger:** S35-F9 (`docs/HANDOFF-S35-F9.md`, Commits `1065cd3` + `bf22892` + Akzeptanztest-Close `73b5432`)
**Commits dieser Session:**
- `ba0406f` — docs: F6 spec (inspection + 3 hebel + akzeptanzkriterium)
- `8a4317d` — Code: F6 3 Hebel (via Copilot, wegen Server-Scope kein Workflow betroffen)
- `6064636` — Code: F9 followup (fire-and-forget regen-index aus /push entfernt, via Copilot)
- `d786372` — docs: Backlog-Audit (2 von 3 stale Tasks bereits erledigt)
- `272a2d9` — docs: SESSION-STATE Tasks 1/2/5 per Audit-Befunden aktualisiert
- `401b3a7` — Code: opus-task-async erweitert um scope/skipDeploy/targetFile (via Copilot, ermöglicht F6-Live-Verify-HTTP-Pfad)
- Drift 13 Fix (in Arbeit, via Copilot wegen Workflow-Scope) — `tools/wait-for-deploy.sh` akzeptiert Backfill-on-top-Commits
- Dieser Close-Commit
- Plus Session-Log-Backfill-Commits (docs-only)

**Live-Commit nach Session-Ende:** `401b3a7` (verifiziert via `/api/health`)

---

## 1. Was in S35-F6 passiert ist

### 1a. Kontext-Check fand zwei stale Tasks (Phase 1)

Beim Lesen des Handoffs aus F9 wurden Unstimmigkeiten sichtbar: in Section 4 standen drei „offene Tasks" als Kandidaten für nach F6. Per `docs/BACKLOG-AUDIT-2026-04-20.md` geprüft: **TSC-Retry Roundtable-Pfad** und **Block 5d PR #2 Context-Split** sind seit längerem erledigt, nur nie im Handoff nachgezogen. **Async Job-Pattern für /opus-task** ist teilweise erledigt (async-Endpoint lebt in `server/src/routes/health.ts:78+115`, aber ohne Persistenz über Container-Restarts, plus Body-Parameter-Limitation die in dieser Session mit fixiert wurde).

Das ist klassischer Drift 10 (Specs/Handoffs mit stale Umsetzungs-Stand) in Lehrbuchform. Die neue Session-Close-Template-Phase 3.3 (Satelliten-Docs-Audit) fängt solche Drifts zukünftig ab; für den Altbestand brauchte es einen periodischen Backlog-Audit.

### 1b. F6-Inspection (Phase 1 Fortsetzung)

Inspection vor dem Code: Der Resolver (`builderScopeResolver.ts`) ist bereits 100% deterministisch — er iteriert über `loadIndex()` und kann nichts erfinden. Die Halluzinations-Quellen liegen an **drei Nebeneinstiegen**, die den Index umgehen:
1. **manualScope-Override** in `opusTaskOrchestrator.ts:76-77` — Array wird ungeprüft durchgereicht
2. **Create-Regex-Fallback** in `builderScopeResolver.ts:136-152` — Regex-Match wird ohne Sanity-Check akzeptiert
3. **targetFile-Parameter** in `opusTaskOrchestrator.ts:80-86` — wird immer in Scope eingefügt

Inspection-Bericht vollständig dokumentiert in `docs/F6-SCOPE-HALLUCINATION-FIX.md`.

### 1c. F6-Umsetzung durch Copilot (Phase 2)

Copilot hat alle drei Hebel in einem atomaren Commit `8a4317d` umgesetzt, mit zwei kleineren Korrekturen gegenüber dem ursprünglichen Prompt:
1. `createTargets` sind nur die unindizierten Scope-Einträge, nicht pauschal alle Files bei `method === 'create'`
2. Der Doppelfund im Regex-Fallback (zwei identische Regex-Blöcke) wurde explizit entfernt, damit `rejectedPaths` nicht doppelte Einträge enthält

Beide Korrekturen sind inhaltlich richtig. Vor dem Push: `npx tsc -b` (client) und `npx tsc --noEmit` (server) beide grün. Lokale Akzeptanztests über `node --import tsx` auch grün.

### 1d. Nebenfund F9-Followup (auch Phase 2)

Während F6-Inspection aufgetaucht: der fire-and-forget `regenerateRepoIndex()` in `/push` (ca. Zeile 1028) läuft bei reiner Dispatch-Akzeptanz, nicht bei echter Commit-Landung. Der execution-result-Handler in `builder.ts:640` macht regen-index bereits korrekt bei `committed === true`. Der `/push`-Call war damit redundant und lief auch bei False-Positive-Dispatches. Copilot hat den Block in Commit `6064636` entfernt. Einzeiler-Fix, grüne TSC-Checks.

### 1e. F6-Live-Verify scheiterte zunächst — Fix an opus-task-async nötig

Der direkte HTTP-Pfad zu `orchestrateTask` ist `/api/health/opus-task-async`. Der Handler nahm aber nur `instruction` und `dryRun` aus dem Body — `scope`, `skipDeploy` und `targetFile` wurden ignoriert. Damit gab es keinen HTTP-Weg, um Hebel α (manualScope Hard-Reject) live zu testen. Copilot hat den Handler in Commit `401b3a7` erweitert um genau diese drei Body-Parameter. Zwei Mini-Edits im gleichen Handler, Scope eng gehalten.

### 1f. F6-Live-Verify komplett (Phase 3.1)

Mit dem erweiterten opus-task-async konnten alle drei Hebel live verifiziert werden:

**Probe 1 — Hebel α (manualScope Hard-Reject):**
- `POST /api/health/opus-task-async` mit `scope: ["client/src/lib/opusSmartPush.ts"]` (falscher client/-Prefix, echter Pfad ist server/src/...), Instruction ohne Create-Signal
- jobId `job-mo79mizv`
- Ergebnis: `result.status: failed`, `scope.status: error`, `detail.rejectedPaths: ["client/src/lib/opusSmartPush.ts"]`, summary `"Scope rejected 1 hallucinated path(s): client/src/lib/opusSmartPush.ts. Include exact paths in instruction or provide explicit create signal."`
- Laufzeit: **2ms in der scope-Phase** — keine Worker-Swarm-Phase, keine LLM-Tokens verbrannt

**Probe 2 — Hebel β (Regex-Prefix-Sanity):**
- `POST /api/health/opus-task-async` mit `instruction: "erstelle server/src/xyz1234unique/sondermodul.ts"`, kein manualScope
- jobId `job-mo79q986`
- Ergebnis: `result.status: failed`, `scope.status: error`, `detail.rejectedPaths: ["server/src/xyz1234unique/sondermodul.ts"]`, reasoning `"server/src/xyz1234unique/sondermodul.ts REJECTED: no indexed file shares the first 3 path segments, likely hallucination"`
- Laufzeit: **7ms in der scope-Phase**

**Hebel γ — Phase-Report-Felder:** In JEDER Scope-Response dieser Session sichtbar: `indexedFiles`, `createTargets`, `rejectedPaths`. Wären im alten Schema nicht vorhanden.

### 1g. CI-False-Positive-Drift entdeckt (Drift 13)

Während der Live-Verifikation fiel auf, dass alle F9/F6/workerProfiles-Commits auf GitHub rotes X zeigen — obwohl der Code live läuft. Root-Cause: der Session-Log-Hook aus S34 pusht einen docs-only Backfill-Commit auf main, der Render nimmt den als Auto-Deploy-Target. `tools/wait-for-deploy.sh` wartet aber auf den ursprünglichen Code-Commit-SHA und bekommt stattdessen den Backfill-SHA. Nach 10 Minuten Timeout → Workflow rot.

Das ist ein echter Drift, weil CI-Status unzuverlässig wird. Wir können nicht mehr verlassen darauf dass rotes X = Fehler bedeutet. Fix-Prompt an Copilot übergeben während der F6-Session: `git merge-base --is-ancestor $EXPECTED_COMMIT $LIVE_COMMIT` akzeptiert den Backfill-on-top-Fall, plus `fetch-depth: 0` im checkout-Step damit merge-base die History hat.

---

## 2. Prozess-Lehren

### 2a. Drift 13 — Session-Log-Hook racet Render-Deploy-Verify

Ein Feature (Session-Log mit SHA-Backfill, S34) hat unintendiert ein anderes Feature gebrochen (deploy-verify CI-Status). Lehre: jedes neue Feature, das Commits auf main erzeugt, muss gegen die bestehende Deploy-Kette geprüft werden. Der Fix ist klein, aber strukturell wichtig — CI-Verlässlichkeit ist ein Infrastruktur-Baustein, der nicht degradieren darf.

### 2b. HTTP-Endpoints können Library-Parameter ignorieren

`opus-task-async` ignorierte drei von vielen orchestrateTask-Parametern. Das war beim Handler-Schreiben vermutlich "YAGNI" — bis eine Live-Verify-Session diese Parameter brauchte. Gleiche Lehre wie bei Build-Scripts: wenn eine Library-Funktion N Parameter hat und der HTTP-Adapter nur M < N durchreicht, ist das eine versteckte Schnittstellen-Reduktion. Besser vollständig durchreichen und nur die ausdrücklich nicht-gewünschten bewusst weglassen.

### 2c. Backlog-Audit sollte Routine werden

Zwei von drei Handoff-Resttasks waren seit längerem erledigt. Das kostet Denk-Zeit bei jedem neuen Chat, der die offenen Tasks liest. Empfehlung: alle ~10 Sessions oder bei Session-Umbrüchen einen 20-Minuten-Backlog-Audit einschieben. Wurde heute das erste Mal formalisiert in `docs/BACKLOG-AUDIT-2026-04-20.md`.

### 2d. Session-Close-Template v2 hat sich bewährt

Die drei Phasen (Kontext-Check → Kern-Arbeit → Session-Close) sind in dieser Session zum ersten Mal vollständig durchlaufen worden. Phase 1 hat die stale Tasks sichtbar gemacht und das opus-task-async-Limit früh aufgedeckt (bevor das zum Blocker wurde). Phase 2 war Copilots Domäne. Phase 3 Live-Verify war der entscheidende Moment — ohne den wäre F6 als „adopted" deklariert worden, bevor wir wussten dass die Hebel live greifen. **Die Template-Investition aus S35-F9 hat sich schon in der nächsten Session gelohnt.**

---

## 3. Was live ist nach S35-F6

- **F6 komplett live** — alle drei Hebel verifiziert, halluzinierte Scope-Pfade werden in 2-7ms early-rejected, keine Token-Verschwendung mehr
- **opus-task-async** akzeptiert jetzt scope, skipDeploy, targetFile
- **fire-and-forget regen-index** in /push entfernt (F9-Followup)
- **Backlog-Audit** durchgeführt, SESSION-STATE Tasks 1+2 auf DONE, Task 5 auf PARTIAL
- **F6-Spec** als Referenz in `docs/F6-SCOPE-HALLUCINATION-FIX.md`
- **RADAR-Kandidat F6** auf `adopted`
- **Drift 13 Fix** in Arbeit (via Copilot, Workflow-Scope)

---

## 4. Offen für die nächste Session

### 4a. Sofort (Session-Nachlauf)

1. **Drift 13 Fix verifizieren** — sobald Copilots Commit auf main landet, sollte der nächste Code-Commit einen GRÜNEN Deploy-Workflow zeigen. Beobachten, nicht aktiv testen.

### 4b. Strukturell offene Blöcke

2. **Persistenz für async-Jobs** — `asyncOpusJobs` ist in-memory, Container-Restart verliert laufende Jobs. Für kurze Tasks unkritisch, für große Decomposer-Runs mit mehreren Minuten Laufzeit relevant. Kleiner Block: DB-Persistenz ähnlich wie `pool_state` (F7).

3. **opus-feature HTTP-Pfad** — der `/opus-feature`-Endpoint läuft über `runBuildPipeline` statt `orchestrateTask`. F6 greift dort deshalb nur indirekt (über den gleichen Resolver, aber nicht über den manualScope-Pfad). Falls F6 auch für /opus-feature nötig: eigener Block, weil die Architektur unterschiedlich ist.

4. **Bridge-Token workflows-Scope Upgrade** — Drift 12 ist ein wiederkehrender Reibungspunkt. Entweder Token upgraden oder dedizierte Workflow-Push-Route mit eigenem PAT bauen.

### 4c. Altlast aus früheren Sessions (aktualisiert)

5. **FUSION-ENGINE-SPEC umsetzen** — Multi-Provider-Ensemble pro Persona.
6. **ARCHITECTURE-GRAPH-SPEC v1.1** bauen — Graph-basierte Repo-Wahrheit.
7. **Maya-Core-Cut** — seit 2026-04-05 offen, wartet auf explizite Produktentscheidung.
8. **Kaya-Rename im Code** — 16 Orion-Stellen, wartet auf Maya-Core-Migration.

---

## 5. Für neue Chats

Einstiegs-Reihenfolge unverändert:

1. `docs/CLAUDE-CONTEXT.md` — Anker (jetzt mit 13 Drift-Einträgen)
2. `STATE.md`
3. `RADAR.md` (F6 jetzt `adopted`, F9 `adopted`)
4. `docs/SESSION-STATE.md`
5. **Dieser Handoff** (`docs/HANDOFF-S35-F6.md`)
6. Bei Bedarf: `HANDOFF-S35-F9.md`, `HANDOFF-S34b.md`, ...

**Wichtige Erinnerungen:**
- Drift 12 (Bridge-Token ohne workflows-Scope): Workflow-Files müssen manuell / via Copilot committet werden.
- Drift 13 (CI-False-Positive durch Session-Log-Race): Fix in Arbeit, nach Landung sollte CI wieder verlässlich sein.
- Session-Close-Template v2 (drei Phasen) ist Pflicht, nicht optional — `docs/SESSION-CLOSE-TEMPLATE.md`.

Session-Historie-Lücke: geschlossen am 2026-04-20. HANDOFF-S22-S29-RECONSTRUCTED.md deckt S22+S23+S26-S29 ab; HANDOFF-S23.md wurde zusätzlich aus der fehlbenannten `/undefined`-Datei rekonstruiert (siehe Drift 14 in CLAUDE-CONTEXT.md).

---

## 6. Session-Close-Nachtrag — Drift 13 Live-Verifikation

**Datum:** 2026-04-20 abends, nach Copilots `859d980`

Copilots Fix-Commit `859d980` konnte seinen eigenen Fix nicht testen — GitHub Actions checkt den Workflow-Code aus dem Commit aus, der getestet wird, nicht aus einem späteren. Der Workflow-Lauf für `859d980` endete deshalb erwartungsgemäß rot mit 13m 20s (alte Script-Version, alter Timeout).

**Verifikations-Probe:** `3596012` — harmloser Kommentar-Header in `tools/wait-for-deploy.sh` selbst, der den Drift-13-Kontext für spätere Leser erklärt. Die Datei liegt unter `tools/`, daher kein workflows-Scope nötig, Bridge-Push möglich.

**Ergebnis:** Workflow-Lauf `Render Deploy #103` für `3596012`: **7m 17s, Conclusion: success**. Der merge-base-ancestor-Check hat den Backfill-Commit akzeptiert, statt auf exakten SHA-Match zu warten.

**Beweis:** Vergleich der letzten drei CI-Läufe:
- `859d980` (Fix-Commit selbst): 13m 20s, **rot** — testet mit altem Script
- `3596012` (erster Commit nach Fix): 7m 17s, **grün** — testet mit neuem Script
- Alle F-Commits davor (F9 `1065cd3`, workerProfiles `01e35e2`, F6 `8a4317d`, regen-index `52b7e28`): ~13 Min rot — alle false-positive

**Konsequenz:** CI-Status ist wieder verlässlich. Drift 13 ist geschlossen. RADAR benötigt keinen eigenen Eintrag mehr; der Fix ist Bestandteil der Render-Deploy-Kette und die Drift-Erklärung steht in `docs/CLAUDE-CONTEXT.md` drift_watchlist + Prosa-Block.
