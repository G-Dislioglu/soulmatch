# Builder Operator Gate v1

Dieses Dokument definiert wie der Soulmatch Builder-Pipeline fuer Repo-Tasks eingesetzt werden darf um Copilot-Quota zu sparen ohne Sicherheit zu kompromittieren.

## Kernprinzip

Pipeline ist Ausfuehrung. Du plus Claude sind externe Kontrolle. Builder-Kern bleibt geschuetzt vor autonomen Aenderungen. VAL-K3 als dreistufige Verifikation.

## Drei-Klassen-Routing

Builder-Tasks werden in drei Klassen eingeteilt nach Komplexitaet und Risiko.

### Klasse 1 Trivial

- Einzeilen-Bugfix
- Type-Annotation korrigieren
- String-Konstanten aendern
- Imports sortieren

Workflow: dryRun true zuerst, Review durch Claude und User, bei Freigabe dryRun false, Live-Verifikation. Ziel-Latenz: 2 bis 3 Minuten gesamt. Copilot-Verbrauch: 0 Prozent.

### Klasse 2 Strukturell

- neue Helper-Funktion
- Refactoring innerhalb einer Datei
- neue API-Route
- neue Markdown-Spec-Datei
- UI-Komponente erstellen

Workflow: Claude formuliert Plan mit Scope und Non-Scope und Acceptance-Kriterien, dann Pipeline mit dryRun true, dann Review von Diff plus Judge-Begruendung plus Worker-Konsens, bei Freigabe dryRun false, dann Live-Verifikation und Truth-Sync. Ziel-Latenz: 5 bis 15 Minuten. Copilot-Verbrauch: 0 Prozent bei glattem Lauf.

### Klasse 3 Builder-Kern und Sicherheit

Diese Tasks duerfen NICHT autonom durch die Pipeline.

- server/src/lib/opusTaskOrchestrator.ts
- server/src/lib/opusSmartPush.ts
- server/src/lib/specHardening.ts
- server/src/lib/builderFusionChat.ts
- server/src/lib/opusBridgeController.ts
- server/src/lib/opusBridgeAuth.ts
- .github/workflows/*.yml
- server/.env*
- alle Auth- und Token- und Deploy-Logik

Workflow: Pipeline darf hier planen und Alternativen vorschlagen aber NICHT autonom committen. Finaler Patch via Copilot manuell oder Branch-PR mit Review.

## DryRun-Review-Checkliste

1. Geaenderte Files nur die im Scope
2. Diff nur die beabsichtigten Zeilen
3. keine ungeplanten Refactorings
4. Worker-Konsens 6 von 6 Workern stimmen ueberein
5. Judge-Begruendung passt zur Anweisung
6. Token-Hygiene keine Secrets im Output

Wenn ein Punkt rot ablehnen nicht freigeben.

## Token-Hygiene-Regeln

- OPUS_BRIDGE_SECRET niemals im Chat-Klartext
- beim Job-Polling auf Token-Erscheinen achten
- bei Auth-Fehlern nicht Token im Klartext zur Diagnose teilen
- am Ende einer Token-exponierten Session rotieren

## Eskalationspfad bei Problemen

1. Pipeline liefert falschen Patch im DryRun ablehnen plus neue Anweisung
2. Pipeline liefert nichts 2 bis 3 Minuten warten dann Copilot-Fallback
3. Pipeline pusht falschen Code git revert plus push
4. Pipeline-Hardening blockt Anweisung pruefen ob Trigger-Pattern vorliegt

## Builder-Endpunkte

- POST /api/health/opus-task-async fuer Job-Submit mit JSON body containing instruction string und dryRun boolean
- GET /api/health/opus-job-status mit query params opus_token und id fuer Status-Polling
- GET /api/health fuer Live-Commit und Pipeline-Version

## Pipeline-Phasen

- hardening
- architect-assembly
- scope
- fetch
- swarm
- validate
- claim-gate
- judge
- push
- deploy-wait
- self-test

Bei dryRun true endet Pipeline nach judge.

## Versionierung und Aenderungen

Diese Spec ist v1. Aenderungen werden mit neuer Versionsnummer in neuer Datei BUILDER-OPERATOR-GATE-v2.md dokumentiert. Aktuelle Spec wird nicht ueberschrieben.
