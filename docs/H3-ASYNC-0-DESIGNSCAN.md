# H3-async-0 Designscan

> Historischer Read-only-Designscan. Die hier empfohlene Option A wurde
> spaeter in `307fa3d` umgesetzt; der Scan bleibt als Entwurfs- und
> Reviewspur erhalten.

## Scope

Dieser Scan betrachtet nur die Mapping-Entscheidung vor H3-async-1:

- `server/src/routes/health.ts`
- `server/src/lib/opusTaskOrchestrator.ts`
- `server/src/routes/opusBridge.ts`
- `server/src/lib/builderGithubBridge.ts`
- `server/src/routes/builder.ts`
- `server/src/schema/builder.ts`

Kein Code. Kein Commit. Kein Push.

## Kurzurteil

H3-async-0 ist kein Merge-Detail, sondern eine echte Identitaetsentscheidung:

```text
Wie kommt ein spaeter execution-result-Callback von builder_tasks.id
zum passenden async_jobs.id?
```

Heute gibt es dafuer keine belastbare Bruecke.

Die kleinste saubere Loesung ist deshalb nicht "irgendwie mergen",
sondern zuerst:

```text
eine explizite async-job -> builder-task Verknuepfung bauen.
```

## Ist-Zustand

### 1. Drei getrennte Identitaeten

Heute entstehen drei voneinander getrennte IDs:

- `async_jobs.id`
  - in `health.ts`
  - Form: `job-...`

- `runId`
  - in `opusTaskOrchestrator.ts`
  - Form: `run-...`

- `builder_tasks.id`
  - in `opusBridge.ts` `/push`
  - UUID fuer den GitHub-Dispatch-Task

Diese drei IDs werden heute nicht deterministisch zusammengefuehrt.

### 2. Der async-Health-Pfad kennt nur die Job-ID

`POST /api/health/opus-task-async`:

1. erzeugt `async_jobs.id`
2. startet `orchestrateTask()`
3. persistiert spaeter das erste Orchestrator-Result in `async_jobs.result`

Der Health-Pfad kennt damit:

- `async_jobs.id`
- spaeter `result.runId`

Er kennt aber nicht automatisch:

- `builder_tasks.id`

### 3. Der Push-/Callback-Pfad kennt nur die Builder-Task-ID

Der `/push`-Pfad:

1. legt `builder_tasks` an
2. dispatcht GitHub Actions mit `client_payload.task_id = builder_tasks.id`

Der spaete `execution-result`-Callback kennt dadurch:

- `builder_tasks.id`

Er kennt heute nicht:

- `async_jobs.id`
- `runId`

### 4. Vorhandene Felder sind noch keine fertige Bruecke

Es gibt schon:

- `OpusTaskInput.sourceTaskId`
- `OpusTaskInput.sourceRunId`
- `OpusTaskResult.runId`

Aber:

- `health.ts` uebergibt heute weder `sourceTaskId` noch `sourceRunId`
- `/push` traegt weder `runId` noch `async_jobs.id` in die Builder-Task hinein
- der Callback bekommt weder `runId` noch `async_job_id`

Das heisst:

```text
Die noetigen Namensbausteine existieren teilweise schon,
die tatsaechliche Mapping-Kette aber nicht.
```

## Ziel von H3-async-0

Nicht:

- schon `async_jobs.result` reconciled mergen
- schon `landed` / `verifiedCommit` nachziehen

Sondern nur:

```text
eine belastbare, spaet callback-lesbare Bruecke
zwischen builder_tasks.id und async_jobs.id definieren.
```

Danach kann H3-async-1 gezielt den `/api/health/opus-task-async`-Pfad reconciled nachziehen.

## Designoptionen

## Option A - Persistierte Bruecke auf builder_tasks

### Idee

`builder_tasks` bekommt ein eigenes Feld wie:

- `sourceAsyncJobId`

Der async-Health-Pfad reicht seine `jobId` bis in den `/push`-Pfad durch.
Wenn `/push` die `builder_tasks`-Zeile anlegt, speichert sie:

- `builder_tasks.id`
- `builder_tasks.sourceAsyncJobId`

Der spaete Callback kann dann:

1. `builder_tasks` ueber `taskId` laden
2. `sourceAsyncJobId` lesen
3. gezielt `async_jobs` ueber `id = sourceAsyncJobId` updaten

### Vorteile

- sauberste und direkteste Identitaetsbruecke
- callback braucht nur einen simplen DB-Lookup auf `builder_tasks`
- kein JSONB-Join
- kein Rateversprechen ueber freifliegende Payload-Felder
- auch spaeter fuer allgemeineres H3 gut erweiterbar

### Nachteile

- Schema-Migration noetig
- mehrere Schichten muessen den Wert bis `/push` durchreichen
- nur sinnvoll, wenn der Lauf tatsaechlich ueber `/push` geht

### Bewertung

```text
Die beste Langfristform fuer H3,
wenn eine kleine Schema-Erweiterung akzeptabel ist.
```

## Option B - Callback-Payload-Bruecke ohne Schema-Migration

### Idee

`async_jobs.id` wird aus dem async-Health-Pfad bis in den GitHub-Dispatch durchgereicht:

1. `health.ts` kennt `jobId`
2. Orchestrator / `smartPush()` / `/push` bekommen diese ID mit
3. `triggerGithubAction*()` sendet sie als zusaetzliches Callback-Metafeld
4. GitHub Action sendet sie im `execution-result`-Callback zurueck

Der Callback kann dann direkt sagen:

- dieses Ergebnis gehoert zu `async_jobs.id = job-...`

### Vorteile

- keine Schema-Migration
- direkte Reconcile-Zieladresse im Callback
- keine DB-Bruecke ueber `builder_tasks` noetig

### Nachteile

- laengste Durchreichkette
- hoehere Drift-Gefahr zwischen Health -> Orchestrator -> SmartPush -> `/push` -> GitHub dispatch -> Workflow -> Callback
- jede spaetere Aenderung am Workflow-Payload kann die Bruecke brechen
- weniger robust fuer spaetere nicht-GitHub-basierte Push-Pfade

### Bewertung

```text
Funktioniert wahrscheinlich mit wenig Schema-Aufwand,
ist aber die driftanfaelligste Option.
```

## Option C - runId als Bruecken-Identifier

### Idee

Statt `async_jobs.id` direkt zu mappen, wird `runId` zur gemeinsamen Identitaet:

1. `orchestrateTask()` erzeugt `runId`
2. der async-Health-Pfad persistiert dieses `runId`
3. der Push-/Builder-Task-Pfad speichert oder dispatcht ebenfalls dieses `runId`
4. der Callback reconciled spaeter ueber `runId`

### Vorteile

- nutzt bereits vorhandenen Orchestrator-Identifier
- semantisch nah am eigentlichen Task-Result
- spaeter eventuell auch fuer nicht-Health-Caller nuetzlich

### Nachteile

- heute nirgends im Builder-Callback-Pfad verankert
- braucht entweder Schema-Erweiterung oder Callback-Payload-Erweiterung trotzdem
- `runId` loest das Mapping-Problem nicht allein, sondern verschiebt nur den Join-Key
- groessere Gefahr, bestehende `sourceRunId`-/Approval-Semantik zu verwirren, wenn man zu viel ueberlaedt

### Bewertung

```text
Als Architekturidee sauber,
als kleinster H3-async-0-Schnitt aber nicht die direkteste Option.
```

## Option D - JSONB-/Instruction-basierte heuristische Ruecksuche

### Idee

Der Callback sucht das passende `async_jobs`-Tupel indirekt, zum Beispiel ueber:

- `instruction`
- `result.runId`
- Zeitfenster
- JSONB-Inhalte

### Vorteile

- formal wenig Vorbau

### Nachteile

- nicht deterministisch
- kollisionsanfaellig
- schwer testbar
- schlechte Truth-Class-Disziplin

### Bewertung

```text
Nicht empfehlenswert.
```

## Kritische Vergleichspunkte

| Option | Migration | Durchreichkette | Drift-Risiko | Callback-Eindeutigkeit | Bewertung |
|---|---|---|---|---|---|
| A - `builder_tasks.sourceAsyncJobId` | ja | mittel | niedrig | hoch | beste Empfehlung |
| B - `async_job_id` im Callback-Payload | nein | hoch | hoch | hoch | moeglich, aber fragiler |
| C - `runId` als Bridge | vielleicht | mittel bis hoch | mittel | mittel | architektonisch okay, nicht kleinster Schnitt |
| D - heuristische Ruecksuche | nein | niedrig | sehr hoch | niedrig | ablehnen |

## Empfehlung

Meine Empfehlung fuer H3-async-0 ist:

```text
Option A:
eine persistierte Bruecke auf builder_tasks,
am klarsten als sourceAsyncJobId.
```

Warum diese Option vorne liegt:

1. Der Callback kennt sicher `builder_tasks.id`.
2. `builder_tasks` ist damit der natuerliche Lookup-Einstieg.
3. Eine explizite FK-nahe Bruecke ist robuster als Workflow-Payload-Weiterreichen.
4. H3-async-1 kann danach klein bleiben:
   - `builder_tasks.id` -> `sourceAsyncJobId`
   - dann `async_jobs.result` reconciled updaten

## Warum nicht Option B als erste Wahl

Option B sieht auf den ersten Blick leichter aus, weil keine Migration noetig ist.
Im konkreten Repo ist sie aber anfaelliger:

- Health
- Orchestrator
- SmartPush
- `/push`
- GitHub Dispatch
- GitHub Workflow
- Callback

muessen dieselbe Zusatz-ID verlustfrei tragen.

Das ist fuer einen kleinen H3-Block mehr Drift-Oberflaeche als noetig.

## Warum nicht sourceTaskId/sourceRunId ueberladen

`sourceTaskId` und `sourceRunId` existieren bereits als allgemeinere Herkunfts-/Approval-Kontextfelder.

Fuer H3-async-0 gilt:

```text
lieber eine explizite async-job Bruecke
als die bestehende source*-Semantik still umzudeuten.
```

Das haelt die spaetere Analyse lesbar und vermeidet Mehrdeutigkeit.

## Minimaler Folgeblock nach diesem Scan

Wenn du H3 weiter klein schneiden willst, ist der naechste Block:

### H3-async-0 Implementation

Ziel:

- explizite `builder_tasks.id -> sourceAsyncJobId -> async_jobs.id`-Bruecke bauen

Noch nicht Teil davon:

- `async_jobs.result` merge-logik
- `landed` / `verifiedCommit` reconciliation
- allgemeine `/opus-task`-/`/execute`-/`/build`-Loesung

Danach erst:

### H3-async-1

- spaeter terminalen Callback auf `async_jobs.result` anwenden
- nur fuer `/api/health/opus-task-async`

## Nicht Teil dieses Scans

- Code-Aenderung
- Migration
- Builder-Test
- allgemeines H3 fuer alle Caller
- neue Push-/Workflow-Semantik
