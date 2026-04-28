# H3 Reconciliation Analysis

> Historischer Read-only-Vorbau. Diese Analyse entstand vor der Umsetzung
> von `307fa3d` (H3-async-0) und `ed27349` (H3-async-1) und bleibt als
> Designspur erhalten.

## Scope

Diese Analyse beschreibt nur den H3-Seam zwischen:

- `server/src/lib/opusSmartPush.ts`
- `server/src/lib/pushResultWaiter.ts`
- `server/src/routes/builder.ts` (`POST /api/builder/tasks/:id/execution-result`)

Kein Code-Patch. Kein Builder-Run. Kein neuer Implementierungsblock.

## Korrektur nach Zweitreview

Ein wichtiger Zusatzbefund zur ersten Fassung:

- Es existiert bereits eine Persistenzschicht `async_jobs.result` in `server/src/schema/builder.ts`.
- Diese Persistenz wird in `server/src/routes/health.ts` fuer `POST /api/health/opus-task-async` bereits genutzt.
- Der `execution-result`-Callback in `server/src/routes/builder.ts` schreibt heute aber nur in `builderTasks` und `builderActions`, nicht in `async_jobs.result`.

Das aendert die Bewertung von H3 teilweise, aber nicht komplett:

- fuer den speziellen async-Health-Caller ist bereits ein Result-Persistenzort vorhanden
- fuer die synchronen Caller `/opus-task`, `/execute` und indirekt `/build` existiert weiterhin keine spaet reconciled Endwahrheit

Deshalb war die erste Fassung zu grob an einer Stelle:

```text
"Weg 1 braucht neue Persistenz" stimmt so pauschal nicht.
```

Praeziser ist:

```text
Fuer den async-Health-Pfad existiert bereits Result-Persistenz.
Fuer die allgemeine H3-Schliessung ueber alle Caller existiert aber noch
kein einheitlicher Reconciliation-Vertrag.
```

## Aktueller Ablauf

### 1. Dispatch und lokaler Wait

`smartPush()` dispatcht bei `/push`-basierten Schreibpfaden einen GitHub-Action-Run und sammelt die `taskId`s aus den `/push`-Responses.

Danach wartet `smartPush()` pro `taskId` ueber `waitForPushResult(taskId, PUSH_CALLBACK_TIMEOUT_MS)` auf den spaeteren `execution-result`-Callback.

Seit H3A gilt dabei:

- `landed=true` nur bei terminalem Erfolgs-Callback
- `landed=false` nur bei terminalem Fehler-Callback
- `landed=undefined` bei reinem Timeout

Das ist bereits ehrlicher als der alte Zustand, in dem Timeout still wie ein negatives Landing behandelt wurde.

### 2. Callback-Wahrheit

Der `execution-result`-Handler in `builder.ts` verarbeitet spaeter den echten Workflow-Ausgang:

- bei `committed === true && commit_hash`
  - `builderTasks.status = 'done'`
  - `builderTasks.commitHash = commit_hash`
  - `signalPushResult(taskId, { landed: true, commitHash })`

- bei `committed === false`
  - `builderTasks.status = 'review_needed'`
  - `signalPushResult(taskId, { landed: false, reason })`

- bei fruehem Build-Erfolg ohne Commit-Entscheidung
  - `builderTasks.status = 'push_candidate'`

### 3. Result-Wahrheit

Der kanonische Orchestrator-Result-Pfad bekommt seine Push-Wahrheit nur aus dem synchronen `smartPush()`-Rueckgabewert.

Wenn der Callback rechtzeitig kommt, ist das konsistent.

Wenn der Callback zu spaet kommt, entsteht ein Split:

- der bereits zurueckgegebene Task-Result-Block bleibt auf dem alten Stand
- spaeter wird nur die DB-Wahrheit in `builder_tasks` auf `done + commitHash` korrigiert
- die fruehere Rueckgabe an den Aufrufer wird nicht mehr reconciled

### 4. Bereits vorhandene Persistenz

Es gibt schon eine relevante bestehende Infrastruktur:

- `async_jobs.result` als JSONB-Feld im Schema
- `health.ts` persistiert dort das Result von `orchestrateTask()` fuer `POST /api/health/opus-task-async`
- `GET /api/health/opus-job-status` liest genau diese persistierte Result-Wahrheit spaeter wieder aus

Wichtig:

Der `execution-result`-Callback reconciled diesen Persistenzpfad heute nicht.

Das heisst:

- der async-Health-Pfad hat bereits einen Ort fuer spaetere Result-Rewrites
- der Callback nutzt ihn aktuell aber nicht
- fuer `/opus-task`, `/execute` und `/build` gibt es diesen Persistenzort im Rueckgabepfad heute gar nicht

## Das konkrete Reconciliation-Problem

Das Problem ist nicht mehr nur ein falsches `landed=false`.

Seit H3A ist das schmaler und konkreter:

1. `smartPush()` timed out im Waiter-Fenster.
2. Der Aufrufer bekommt ein Result mit:
   - `pushed=false`
   - `landed=undefined`
   - Fehlertext in Richtung `landing truth still pending`
3. Minuten spaeter kommt doch noch ein echter Erfolgs-Callback.
4. `builder.ts` setzt die DB korrekt auf:
   - `status='done'`
   - `commitHash=<sha>`
5. Das bereits ausgelieferte Orchestrator-Result bleibt trotzdem alt.

Kurz:

```text
Callback-Wahrheit und DB-Wahrheit koennen spaeter korrekt sein,
aber die fruehe Result-Wahrheit bleibt pending/partial.
```

Das ist der eigentliche H3-Rest.

## Warum das relevant ist

Der Split erzeugt drei verschiedene Wahrheitslagen fuer denselben Task:

- `smartPush`-/Orchestrator-Result: pending oder partial
- `builder_tasks`: spaeter done + commitHash
- eventuelle Health-/Polling-Konsumenten: abhaengig davon, welchen Pfad sie lesen
- im async-Health-Pfad zusaetzlich `async_jobs.result`, das heute nach spaetem Callback unveraendert alt bleiben kann

Dadurch ist fuer Operatoren unklar:

- ob der Run wirklich fehlgeschlagen ist
- ob nur der Callback zu spaet war
- ob eine spaetere Commit-Landung bereits eingetreten ist

## Drei Loesungswege

### Weg 1: Callback reconciled das persistierte Task-Result

Idee:

Der spaete `execution-result`-Callback schreibt nicht nur `builderTasks.status` und `commitHash`, sondern reconciled auch den persistierten/auslesbaren Task-Result-Block fuer denselben Task.

Praktisch:

- den zuletzt persistierten Result-Zustand je Task als kanonisches JSON fuehren
- beim spaeten Erfolgs-Callback `landed`, `verifiedCommit`, `summary` und ggf. `status` auf die spaetere Wahrheit nachziehen

Praezisierung nach Zweitreview:

- fuer `POST /api/health/opus-task-async` koennte dieses Reconcile sehr wahrscheinlich direkt auf `async_jobs.result` aufsetzen
- fuer `/opus-task`, `/execute` und `/build` reicht `async_jobs` allein nicht, weil diese Caller heute dort nicht persistieren
- eine allgemeine Weg-1-Loesung braucht also entweder:
  - einen einheitlichen Result-Persistenzvertrag ueber mehr als nur `async_jobs`, oder
  - einen bewusst nur auf den async-Health-Pfad begrenzten ersten H3-Schritt

Vorteile:

- eine kanonische Wahrheit pro Task
- spaetere Polling-/Health-Leser sehen dieselbe reconciled Wahrheit
- sauberste Operator-Sicht
- fuer den async-Health-Pfad ist ein Teil der Infrastruktur schon vorhanden

Nachteile:

- braucht fuer die allgemeine Loesung weiter einen expliziten Result-Persistenzvertrag
- `async_jobs` hilft nur fuer einen Teil der Caller
- wird groesser, sobald `/opus-task` und `/execute` dieselbe spaete Endwahrheit tragen sollen

Einschaetzung:

Das ist weiter die sauberste Langfrist-Loesung, aber weniger Greenfield als zuerst formuliert.

### Weg 2: Timeout-Runs bleiben explizit async-pending und werden ueber separaten Status erneut abgefragt

Idee:

Der Orchestrator behandelt Timeout-Runs nicht mehr als normales `partial`, sondern als bewusst unvollstaendige async-pending Wahrheit, die spaeter ueber einen separaten Statuspfad erneut abgefragt werden muss.

Praktisch:

- Rueckgabe bleibt absichtlich vorlaeufig
- klarer Marker wie `callbackTruthPending=true`
- Konsumenten muessen fuer finale Wahrheit den Task-/Health-Pfad erneut lesen

Vorteile:

- kleiner als vollstaendige Reconciliation
- kein stilles Ueberschreiben alter Resultate
- ehrliche Semantik: “wir wissen es noch nicht”

Nachteile:

- split truth bleibt strukturell bestehen
- Aufrufer muessen aktiv einen zweiten Lesepfad kennen
- UX/Operator-Last steigt

Einschaetzung:

Das ist der kleinste weitere H3-Weg, wenn man Reconciliation bewusst noch nicht bauen will.

### Weg 3: Callback-Erfolg fuehrt eine spaete Result-Nachricht / Task-Log-Reconciliation ein

Idee:

Die fruehe Rueckgabe bleibt wie sie ist, aber der spaete Callback schreibt einen expliziten Reconciliation-Eintrag in einen bereits vorhandenen Beobachtungspfad, z. B. Task-Log / Opus-Log / async-job-result.

Praktisch:

- der erste Result-Block wird nicht mutiert
- spaeterer Callback schreibt einen klaren “late landing confirmed”-Datensatz
- Operatoren sehen zwei bewusst getrennte Wahrheiten:
  - initiales pending Result
  - spaetere Landing-Bestaetigung

Vorteile:

- kleiner als vollstaendige Result-Rewrite-Loesung
- gute Audit-Spur
- weniger invasive Datenmodell-Aenderung moeglich

Nachteile:

- weiterhin keine einzelne Endwahrheit
- Konsumenten muessen Log + Result zusammendenken
- kann leicht wie “noch ein Side-Channel” statt wie echte Reconciliation wirken

Einschaetzung:

Guter Mittelweg fuer Observability, aber schwach, wenn das Ziel eine einzige kanonische Task-Wahrheit ist.

## Trade-off Kurzvergleich

### Weg 1

- Beste Konsistenz
- fuer den async-Health-Pfad kleiner als zuerst angenommen
- fuer alle Caller zusammen weiter der groesste Eingriff
- beste Grundlage fuer spaetere H3-Schliessung

### Weg 2

- kleinster Eingriff
- ehrlich, aber strukturell weiter gesplittet
- gut, wenn vorerst nur Fehlklassifikation vermieden werden soll

### Weg 3

- gute Auditierbarkeit
- mittlerer Eingriff
- keine vollstaendige Endwahrheit

## Empfehlung

Wenn H3 wirklich geschlossen werden soll, ist `Weg 1` die beste Zielrichtung:

```text
persistierte Result-Wahrheit pro Task,
spaeterer Callback reconciled diese Wahrheit deterministisch.
```

Nach dem Zweitreview gilt dazu die wichtige Einschraenkung:

```text
Der schnellste Read-only Folgecheck ist nicht "brauchen wir neue Persistenz?",
sondern "koennen wir fuer den async-Health-Pfad direkt async_jobs.result
reconcilen, und wie weit traegt das wirklich?".
```

Wenn der naechste Block dagegen weiter klein bleiben muss, ist `Weg 2` der engste Folge-Schnitt:

```text
pending truth explizit machen,
spaetere Wahrheit nur ueber erneuten Read/Poll holen,
noch keine vollstaendige Reconciliation.
```

## Caller-Relevanz

Nicht jeder Caller ist gleich betroffen:

- `/api/health/opus-task-async`
  - hat bereits `async_jobs.result`
  - ist damit der naheliegendste erste Reconciliation-Kandidat

- `/api/builder/opus-bridge/opus-task`
  - gibt das Orchestrator-Result direkt synchron zurueck
  - hat heute keinen spaeter reconcileten Persistenzpfad fuer dieselbe Rueckgabe

- `/api/builder/opus-bridge/execute`
  - gleiche Lage wie `/opus-task`, nur als Legacy-Shape

- `/api/builder/opus-bridge/build`
  - mapped das Orchestrator-Result zusaetzlich in `BuildResult`
  - braucht fuer volle H3-Schliessung ebenfalls eine bewusste Strategie

## Realer Beleg

Der bekannte T03-Fall ist nicht nur theoretischer Hintergrund, sondern der konkrete Real-World-Beleg fuer diesen H3-Bereich:

- lokales/persistiertes Result zeigte keinen sauberen Commit-Landing-Erfolg
- spaeter war der Remote-Commit trotzdem repo-sichtbar

Der H3-Rest ist deshalb kein rein akademischer Edge-Case, sondern eine bereits belegte Truth-Drift.

## Nicht Teil dieser Analyse

- Builder-Test
- neuer Push-Smoke
- Side-effect-Contract-Umbau
- Judge-/Claim-Gate-Umbau
- H2B-/H2C-/H2D-Logik
- Deploy-Wait-Neubau
- Callback-Worker/Action-Architektur ausserhalb dieses H3-Seams
