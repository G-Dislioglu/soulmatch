# H3-async-1 Proposal

> Historischer Read-only-Proposalstand. Dieser Text beschreibt den Stand vor
> der Umsetzung von `307fa3d` (Mapping-Vorbau) und `ed27349`
> (Async-Health-Reconciliation) und bleibt als Designspur erhalten.

## Scope

Dieser Proposal-Schnitt betrachtet nur:

- `server/src/routes/builder.ts` execution-result-Handler
- `server/src/schema/builder.ts` `async_jobs`
- `server/src/routes/health.ts` `POST /api/health/opus-task-async`

Kein Code. Kein Commit. Kein neuer Folgeblock.

## Kurzurteil

Ja, diese Richtung ist sinnvoll.

Aber Claudes Formulierung braucht eine wichtige Praezisierung:

```text
Im persistierten async-Result geht es nicht primaer um `commitHash`,
sondern um die Result-Wahrheit des Orchestrators:
`landed`, `verifiedCommit`, `status` und die sichtbare Summary-/Blocker-Lesart.
```

`commitHash` ist heute ein Feld auf `builder_tasks` und im Callback-Payload.
Im eigentlichen `OpusTaskResult` heisst das kanonische Rueckgabefeld dagegen `verifiedCommit`.

Nach erneuter Review gilt aber auch:

```text
H3-async-1 ist ohne klares Mapping builder_tasks.id ↔ async_jobs.id
noch nicht implementierungsreif.
```

Das ist kein Gegenargument gegen den Schnitt, aber ein echter Vorbaupunkt.

## Aktueller Ist-Zustand

### 1. async_jobs-Persistenz existiert

In `schema/builder.ts` gibt es bereits:

- `async_jobs.status`
- `async_jobs.result`
- `async_jobs.error`

Das ist eine bestehende Persistenzschicht, kein Greenfield.

### 2. /opus-task-async nutzt diese Persistenz bereits

In `health.ts`:

1. Ein Job startet mit `status='running'`.
2. `orchestrateTask()` wird asynchron ausgefuehrt.
3. Das erste Result von `orchestrateTask()` wird in `async_jobs.result` geschrieben.

Das bedeutet:

```text
Der async-Health-Pfad hat schon einen Result-Speicherort.
```

### 3. Der spaete Callback reconciled diesen Speicherort nicht

In `builder.ts` macht der execution-result-Handler heute:

- `builderTasks.status = 'done'` plus `commitHash`, wenn `committed === true`
- `builderTasks.status = 'review_needed'`, wenn `committed === false`
- `signalPushResult(...)` fuer den In-Memory-Waiter

Er macht heute nicht:

- kein Update von `async_jobs.result`
- kein Update von `async_jobs.status`
- kein spaetes Nachziehen von `verifiedCommit` oder `landed` im bereits persistierten async-Result

### 4. Mapping-Realitaet heute

Der zentrale offene Punkt ist nicht nur "welche Felder mergen wir?", sondern zuerst:

```text
Wie findet der execution-result-Callback das richtige async_jobs-Tupel?
```

Der aktuelle Code gibt darauf keine implizite Antwort:

- `health.ts` erzeugt eine eigene `async_jobs.id` in Form `job-...`
- `orchestrateTask()` erzeugt zusaetzlich ein eigenes `runId`
- `builder.ts` execution-result-Callback kennt nur `taskId = builder_tasks.id`

Wichtig:

- `health.ts` uebergibt heute kein `sourceTaskId` und kein `sourceRunId`
- `smartPush()` / der `/push`-Pfad traegt den `async_jobs.id`-Wert nicht bis in den Callback
- das Callback-Payload enthaelt heute keinen `async_job_id`-Wert

Das heisst:

```text
Es gibt heute keine belastbare builder_tasks.id ↔ async_jobs.id-Bruecke.
```

Weder `instruction` noch `runId` sind aktuell als verifizierbarer Join-Pfad im Callback verwendbar.

## Das konkrete H3-async-1-Problem

Der Drift fuer den async-Health-Pfad sieht so aus:

1. `/api/health/opus-task-async` startet einen Job.
2. `orchestrateTask()` timed out im Waiter-Fenster und gibt ein Result mit pending Callback-Truth zurueck.
3. Dieses fruehe Result wird in `async_jobs.result` persistiert.
4. Spaeter kommt doch noch ein Erfolgs-Callback mit `committed === true` und `commit_hash`.
5. `builder_tasks` wird korrekt auf `done + commitHash` gesetzt.
6. `async_jobs.result` bleibt trotzdem auf dem alten pending/partial Stand.

Kurz:

```text
builder_tasks wird spaeter korrigiert,
async_jobs.result aber nicht.
```

Genau das ist der H3-async-1-Schnitt.

Vor dem Implementieren muss aber klar sein:

```text
Welches async_jobs-Tupel soll ueberhaupt reconciled werden?
```

Ohne diese Bruecke bleibt H3-async-1 ein richtiges Zielbild, aber noch kein direkt codierbarer Mini-Block.

## Welche Felder im async_jobs.result reconciled werden muessen

### Pflichtfelder

Diese Felder sollten bei spaetem Erfolgs-Callback mindestens nachgezogen werden:

- `landed`
  - von `undefined` oder altem Wert auf `true`

- `verifiedCommit`
  - aus `commit_hash` des Callbacks abgeleitet
  - das ist das kanonische Result-Feld, nicht `commitHash`

- `status`
  - wenn das fruehe Result auf pending/partial blieb, muss die finale Result-Wahrheit neu bewertet werden

### Sehr wahrscheinlich mitzuziehen

Diese Felder sollten im Proposal mindestens bewusst entschieden werden:

- `summary`
  - damit Operatoren nicht weiter einen alten pending-/failure-Text lesen

- `pushBlockedReason`
  - falls das fruehe Result wegen Timeout oder pending truth wie ein Blocker wirkte

- `phases[].push.detail`
  - wenn dieser Detailbaum spaeter weiter ausgelesen wird, sollte dort ebenfalls `landed` / `verifiedCommit` konsistent sein

### Nicht das primaere Result-Feld

- `commitHash`
  - ist als DB-/Task-Feld wichtig
  - aber fuer `async_jobs.result` ist `verifiedCommit` die passendere Rueckgabe-Wahrheit

## H3-async-0 als Vorbau

Bevor H3-async-1 umgesetzt werden kann, braucht es sehr wahrscheinlich einen kleinen Vorbau:

### H3-async-0

Ziel:

- einen eindeutigen Reconciliation-Schluessel zwischen
  - `builder_tasks.id` aus dem execution-result-Callback
  - und dem passenden `async_jobs.id`

Warum das ein eigener Sub-Block ist:

- es ist kein Merge-Detail, sondern eine fehlende Verknuepfung
- ohne diese Verknuepfung kann der Callback das Zielobjekt nicht sicher finden

Aktueller Befund:

- heute existiert diese Verknuepfung nicht sichtbar im Code
- deshalb sollte H3-async-0 explizit als Vorbau benannt werden, nicht still in H3-async-1 hineinrutschen

## Wie der Callback sie setzen wuerde

### Erfolgs-Callback

Bei `committed === true && commit_hash`:

1. `builderTasks.status = 'done'`
2. `builderTasks.commitHash = commit_hash`
3. zusaetzlich: das zugehoerige `async_jobs.result` laden
4. dort mindestens setzen:
   - `landed = true`
   - `verifiedCommit = commit_hash`
5. danach `status` und `summary` so korrigieren, dass die persistierte Result-Wahrheit nicht mehr pending bleibt

### Fehler-Callback

Bei `committed === false`:

1. `builderTasks.status = 'review_needed'`
2. zusaetzlich: falls ein persistiertes `async_jobs.result` existiert, dort die Negativ-Wahrheit ebenfalls nachziehen
3. insbesondere:
   - `landed = false`
   - `status` nicht mehr success/pending
   - `summary` / `pushBlockedReason` auf den terminalen Grund schieben

Diese Beschreibung reicht als Zielrichtung, aber noch nicht als Implementierungsregel.
Fuer ein sauberes Go braucht es deshalb eine explizite Merge-Tabelle.

## Deterministische Merge-Tabelle

Die folgende Tabelle trennt bewusst:

- `async_jobs.status` als Job-Lifecycle
- `async_jobs.result.status` als `OpusTaskResult.status`

### Merge-Regeln

| Feld | bei terminalem Erfolgs-Callback | bei terminalem Fehler-Callback |
|---|---|---|
| `async_jobs.status` | in `H3-async-1` unveraendert lassen; Lifecycle bleibt primaer dem `health.ts`-Pfad zugeordnet | in `H3-async-1` unveraendert lassen; Lifecycle bleibt primaer dem `health.ts`-Pfad zugeordnet |
| `async_jobs.result.landed` | auf `true` setzen | auf `false` setzen |
| `async_jobs.result.verifiedCommit` | auf `commit_hash` setzen | unveraendert lassen oder auf `undefined` normalisieren; kein neuer SHA-Wert |
| `async_jobs.result.status` | nur dann auf `success` anheben, wenn das alte Result ausschliesslich wegen pending/timeout am Push-Seam `partial` blieb | bei reinem spaetem Push-Fehler auf `partial` halten oder auf `partial` setzen; nicht blind auf `failed`, weil der aktuelle Push-Fehler-Pfad im Orchestrator `partial` liefert |
| `async_jobs.result.summary` | Timeout-/pending-Text durch finale Erfolgssummary ersetzen oder deterministisch um `later landed at <sha>` erweitern | Timeout-/pending-Text durch terminalen Push-Fehlertext mit Callback-`reason` ersetzen |
| `async_jobs.result.pushBlockedReason` | loeschen, wenn der alte Wert nur den pending/timeout-Fall beschreibt | auf terminalen Callback-Grund setzen |
| `async_jobs.result.phases[].push.detail.landed` | auf `true` setzen | auf `false` setzen |
| `async_jobs.result.phases[].push.detail.verifiedCommit` | auf `commit_hash` setzen | unveraendert lassen oder loeschen |
| `async_jobs.result.phases[].push.detail.error` | pending-timeout-Hinweis entfernen oder auf historischen Hinweis reduzieren, wenn Erfolg final bestaetigt ist | auf terminalen Callback-Grund setzen |

### Bewusste Einschraenkung

Diese Merge-Regeln sollten nur angewandt werden, wenn das alte persistierte Result klar als callback-pending Push-Fall erkannt wird.

Das bedeutet:

- nicht blind jedes `partial`-Result zu `success` drehen
- nicht andere Fehlerphasen ueberbuegeln
- nicht ungeprueft alte Summary-Texte stehen lassen

## Wo Synchronisations-Konflikte entstehen koennen

### 1. Race zwischen fruehem orchestrateTask-Return und spaetem Callback

Das ist der Kernkonflikt:

- zuerst wird das fruehe Result in `async_jobs.result` geschrieben
- spaeter kommt ein Callback mit besserer Wahrheit
- ohne Reconcile bleibt das persistierte Result stale

### 2. Race zwischen Fehler- und Erfolgsdeutung

Moeglicher Konflikt:

- fruehes Result liest sich wie partial/pending
- spaeterer Erfolgs-Callback zeigt echte Landing-Wahrheit
- ohne klare overwrite-Regel koennen alte Summary-/Blocker-Texte stehen bleiben

### 3. Race zwischen mehrfachen Callback-Phasen

Der Callback-Pfad kennt heute mehrere Stadien:

- Build erfolgreich, noch kein Commit (`push_candidate`)
- terminaler Erfolg
- terminaler Fehler

Wenn H3-async-1 nur den terminalen Erfolgsfall reconciled, aber Zwischenzustand oder Fehlerpfad nicht klar behandelt, bleibt die Persistenz teilweise inkonsistent.

### 4. Mapping-Konflikt zwischen builder_tasks und async_jobs.result

Wenn `builder_tasks.status = done` sagt, aber `async_jobs.result.status` weiter `partial` oder pending sagt, gibt es zwei DB-Wahrheiten fuer denselben Task.

Das ist genau der Konflikt, den H3-async-1 vermeiden sollte.

### 5. Mapping-Konflikt builder_tasks.id ↔ async_jobs.id

Noch vor jeder Merge-Regel steht der groebste Konflikt:

- der Callback kennt `builder_tasks.id`
- der async-Health-Pfad kennt `async_jobs.id`
- heute gibt es keinen sicheren Join

Ohne H3-async-0 oder eine sichtbar vorhandene Bruecke bleibt H3-async-1 konzeptionell richtig, aber operativ unadressierbar.

## Kleinster sinnvolle H3-async-1-Schnitt

Der kleinste sinnvolle Proposal-fitte Folgeblock waere:

1. Vorher H3-async-0: Mapping builder-task ↔ async-job explizit herstellen oder nachweisbar machen
2. Danach nur den `POST /api/health/opus-task-async`-Pfad betrachten
3. Nur `async_jobs.result` nach spaetem terminalem Callback reconciled nachziehen
4. Keine allgemeine Loesung fuer `/opus-task`, `/execute` oder `/build`

Warum das klein ist:

- Persistenz existiert schon
- der Caller pollt bereits ueber `GET /api/health/opus-job-status`
- der Nutzen ist direkt operator-sichtbar

Warum das noch nicht die Gesamtloesung ist:

- die synchronen Builder-Caller bleiben weiter ohne spaete Result-Reconciliation

## Trade-off

### Pro

- kleiner als allgemeines H3
- nutzt bestehende Persistenz
- klarer echter Nutzwert
- guter erster Reconciliation-Schnitt

### Contra

- ohne H3-async-0 heute nicht direkt implementierbar
- loest nur den async-Health-Pfad
- kein allgemeiner Fix fuer `/opus-task` oder `/execute`
- braucht klare Regeln, welche Result-Felder callback-authoritativ ueberschrieben werden duerfen

## Empfehlung

Wenn du H3 weiter klein und sauber schneiden willst, ist H3-async-1 sinnvoll:

```text
erst H3-async-0 fuer das Mapping klaeren,
dann nur async_jobs.result fuer /api/health/opus-task-async reconciled nachziehen,
mit Fokus auf landed, verifiedCommit, result.status und summary/blocker-Lesart.
```

Wichtige Korrektur zu Claudes Formulierung:

```text
Nicht nur "landed, commitHash, status",
sondern praeziser:
landed, verifiedCommit, status
und sehr wahrscheinlich summary / pushBlockedReason.
```

## Nicht Teil von H3-async-1

- Mapping-Vorbau selbst, falls er als eigener H3-async-0-Block geschnitten wird
- allgemeine Reconciliation fuer `/opus-task`
- allgemeine Reconciliation fuer `/execute`
- allgemeine Reconciliation fuer `/build`
- neuer Builder-Test
- neuer Push-Smoke
- Umbau von H2A/H2B/H2C/H2D
