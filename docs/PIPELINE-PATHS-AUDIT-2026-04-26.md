# PIPELINE PATHS AUDIT (2026-04-26)

## Zweck

Dieses Audit fixiert die repo-sichtbare Zwei-Pfad-Realitaet im Builder-Stack,
um Drift zwischen Handoff-Texten, STATE/RADAR und Runtime-Code zu vermeiden.

Stand der Verifikation: HEAD `7cd6990` auf `main` und `origin/main`.

## Kurzfazit

Council ist produktiv angeschlossen, aber nicht im Orchestrator-Async-Pfad.
Es existieren zwei aktive Ausfuehrungspfade mit unterschiedlicher Tiefe.

## Pfad A: Async-Orchestrator (schlank)

Entry:
- `POST /api/health/opus-task-async`

Routing:
- `server/src/routes/health.ts` importiert dynamisch `orchestrateTask` und startet Job-Runner.

Kette:
- `server/src/lib/opusTaskOrchestrator.ts` -> `orchestrateTask(...)`
- Phasen u. a.: `hardening`, `architect-assembly`, `scope`, `fetch`, `swarm`, `validate`, `claim-gate`, `judge`, `push`.

Wichtige Eigenschaft:
- Kein Roundtable/Council im Standardfluss dieses Pfads.

## Pfad B: executeTask (schwer, council-zentriert)

Entry:
- Builder/Bridge-Pfade, die auf `executeTask(...)` gehen.

Routing und Nutzung:
- `server/src/routes/opusBridge.ts` nutzt `executeTask`.
- `server/src/lib/builderFusionChat.ts` nutzt `executeTask` im Quick-Mode/Builder-Kontext.

Kette (repo-sichtbar):
- Scout-Phase (`runScoutPhase`)
- Distiller (`runDistiller`)
- Council-Teilnehmeraufbau (`buildCouncilParticipants`)
- Roundtable (`runRoundtable`)
- Crush-Intensitaet und Case-Crush (`determineCrushIntensity`, `runCaseCrush`)
- Danach Patch/Verify/Push-Pfade

Wichtige Eigenschaft:
- Council- und Roundtable-Bausteine sind live in diesem Pfad verankert.

## Sicherheitsrandbedingung

Der Async-Health-Endpoint ist token-geschuetzt:
- `OPUS_BRIDGE_SECRET` wird in `server/src/routes/health.ts` geprueft.

## Auswirkungen auf Doku-Wahrheit

1. Formulierung "Council ist nicht angeschlossen" ist zu pauschal.
2. Korrekte Formulierung: "Council ist produktiv angeschlossen, aber nicht im Orchestrator-Async-Pfad."
3. STATE und RADAR muessen diese Zwei-Pfad-Realitaet explizit tragen.

## Offene Architekturentscheidung (nicht in diesem Audit umgesetzt)

Option 1:
- Health-Async von `orchestrateTask` auf `executeTask` umlenken (Adapterbedarf beachten).

Option 2:
- `orchestrateTask` kontrolliert um Council-Phasen erweitern (z. B. per Mode-Flag).

Option 3:
- Pfade bewusst getrennt lassen, Trennlinie und Einsatzkriterien explizit dokumentieren.

Empfehlung fuer Sequenz:
- Erst Truth-Sync (STATE/RADAR/Audit)
- Dann strategische Entscheidung mit engem Umsetzungsblock

## Verifizierte Referenzen

- `server/src/routes/health.ts`
- `server/src/lib/opusTaskOrchestrator.ts`
- `server/src/lib/opusBridgeController.ts`
- `server/src/lib/builderFusionChat.ts`
- `server/src/routes/opusBridge.ts`
- `server/src/lib/opusWorkerRegistry.ts`
