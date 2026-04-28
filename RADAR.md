# RADAR

## Zweck

Diese Datei sammelt relevante Soulmatch-Ideen, Risiken, externe Vorschlaege,
Review-Ableitungen und moegliche naechste Bloecke in einer kontrollierten,
KI-lesbaren Radaransicht.

`RADAR.md` ist nicht die operative Ist-Wahrheit. Dafuer ist `STATE.md`
zustaendig.

`RADAR.md` haelt fest:

- welche Kandidaten existieren
- wie ihr Status ist
- auf welcher Wahrheitsklasse sie beruhen
- warum etwas jetzt dran ist oder bewusst nicht jetzt
- welcher naechste Gate-Schritt noetig ist

## Update-Vertrag

Diese Datei muss aktualisiert werden, wenn:

- ein neuer Arbeitskandidat aus Code-Review oder Nutzerkontext entsteht
- ein Proposal aktiv, geparkt, uebernommen oder verworfen wird
- ein neuer Drift-Befund einen Doku- oder Audit-Block rechtfertigt
- ein Radar-Kandidat in reale Arbeit ueberfuehrt wird
- ein externer Review-Vorschlag bewusst fuer Soulmatch uebernommen oder abgegrenzt wird

## Status-Taxonomie

Bevorzugte Stati:

- `active`
- `parked`
- `adopted`
- `rejected`
- `unclear`

Truth Classes:

- `proposal_only`
- `repo_visible`
- `derived_from_review`
- `local_only`

Typische `next_gate`-Werte:

- `scan`
- `proposal`
- `user_approval`
- `implementation`
- `archive`

## Nutzung

Fuer neue Soulmatch-Arbeit zuerst lesen:

1. `STATE.md`
2. `RADAR.md`
3. `AGENTS.md`
4. erst dann relevante Code-Dateien oder alte Briefings

## Scan-Pipeline

Wenn neue Ideen oder Reviews hereinkommen, in dieser Reihenfolge arbeiten:

1. Quelle sichten
2. nicht wegstreichbaren Kern benennen
3. Risiken und betroffene Bereiche markieren
4. gegen Soulmatch-Fit pruefen
5. nur dann einen begrenzten Block vorschlagen
6. nur nach Nutzerfreigabe in echte Arbeit ueberfuehren

## Soulmatch-Fit-Fragen

Ein guter Soulmatch-Kandidat:

- ist direkt auf existierende Dateien oder reale Produktnaehten bezogen
- bleibt als enger Block formulierbar
- zieht nicht stillschweigend neue Provider-, Persistenz- oder UI-Achsen auf
- verbessert Wahrheit, Stabilitaet oder klaren Nutzwert
- laesst sich ohne Doku-Selbsttaeuschung in `STATE.md` spiegeln

## Aktuell relevante Radar-Eintraege

### Kandidat - Pipeline-Pfad-Konsolidierung (Orchestrator vs Council)

- `status`: `adopted`
- `truth_class`: `repo_visible_plus_runtime_probe`
- `source_type`: `code_audit`
- `next_gate`: `archive`
- `absorbed_into`: `server/src/routes/opusBridge.ts`, `server/src/lib/builderFusionChat.ts`, `server/src/lib/opusChainController.ts`, `server/src/lib/opusBuildPipeline.ts`, `server/src/lib/opusTaskOrchestrator.ts`, `STATE.md`, `FEATURES.md`
- `why_not_now`: `none`
- `non_scope`: neuer Pipeline-Neubau, Provider-Umbau, Persistenzschema-Aenderungen, Featurearbeit.
- `risk`: reduziert; Governance-Live-Smokes fuer class_1/class_2/class_3, Approval-Readiness und der kontrollierte strict-scope Push-Smoke sind gruen. Restoffenheit liegt jetzt in Benchmark-Evidenz und einer expliziten Operating-Grenze gegen zu breite autonome Featurearbeit.
- `betroffene_bereiche`: `server/src/routes/opusBridge.ts`, `server/src/lib/builderFusionChat.ts`, `server/src/lib/opusChainController.ts`, `server/src/lib/opusBuildPipeline.ts`, `server/src/lib/opusTaskOrchestrator.ts`, `server/src/routes/health.ts`
- `kurzurteil`: Split-Brain ist auf produktiven Schreibpfaden geschlossen, und der kanonische `/opus-task`-Pfad ist jetzt fuer kontrollierte kleine class_1 Builder-Tasks lokal sowie live abgenommen, inklusive strict-scope-clean Push. Das ist bewusst keine allgemeine Freigabe fuer grosse autonome Featurearbeit.
- `evidence`: Commit `9681fad` (`/execute` + Quick Mode -> orchestrateTask), Commit `86f5666` (`/chain` -> orchestrateTask), Commit `d0b6239` (`/build` nutzt orchestrateTask als inneren Executor und externalisiert post-push checks). Runtime-Evidenz: K2.1 lokal gruen fuer class_1/class_2/class_3 mit `grok`+`gemini`; K2.2 live gruen fuer class_1/class_2/class_3 mit dryRun, ohne Push/Deploy und ohne neue Git-Drift; K2.3/K2.4 live gruen ueber Approval-Validate- und fail-closed-Readiness-Pfad (`666060547e524df305f589b0101160f7fdbda3a0`, `8469150186bebaa8d8a2d9052b1cc483ff32cbb2`); K2.5 live gruen auf verifiedCommit `d31882257f91eb9ffecc729b5981450376539502` mit exakt einem geaenderten Pfad `docs/archive/push-test.md`, ohne `SESSION-LOG.md`, ohne `builder-repo-index.json` und ohne Folgecommits nach 90 Sekunden.

### Kandidat - Builder Benchmark / Operating Boundary

- `status`: `active`
- `truth_class`: `repo_visible_plus_runtime_history`
- `source_type`: `user_request`
- `next_gate`: `decision_gate`
- `why_not_now`: `Der breite Builder-Acceptance-Korridor braucht aktuell keinen neuen Nutzungsbeleg. Nach der repo-sichtigen Hardening-/Architect-Linie bis `741c8ab` ist der offene Builder-Restpunkt enger geworden: nicht weiterer Deep-Patrol- oder Architect-Ausbau, sondern die bewusste Folgeentscheidung, ob Routine Patrol clientseitig ehrlich an den vorhandenen body-losen Server-Trigger angeglichen wird.`
- `non_scope`: neue Builder-Features ausserhalb des schmalen Routine-Patrol-Folgeblocks, weitere Live-Push-Smokes ohne explizite Freigabe, freie Routine-Modellkonfiguration, Server-Umbauten fuer Patrol, grosse autonome Featurearbeit oder Mischbloecke aus Docs, Server und Client.
- `risk`: weiter reduziert, aber nicht null. Die Acceptance-Kette selbst ist repo-sichtbar bis H3-async belastbar, und die branch-sichtige Builder-Linie traegt inzwischen Team-Koordination, Architect-Control-Plane, `dispatchSections` sowie den Deep-Patrol-/Architect-UI-Slice bis `741c8ab`. Der reale Rest ist enger und vor allem clientseitig: Routine Patrol wirkt in der aktuellen PatrolConsole noch konfigurierbarer als der echte Server-Contract es hergibt, und daraus kann pseudo-steuerbare UI-Wahrheit entstehen. Offen bleiben daneben die bekannten allgemeinen Risiken eines formal gueltigen, aber semantisch schwachen Diffs; kein neuer Live-Runtime-Anspruch wird aus `741c8ab` abgeleitet.
- `betroffene_bereiche`: `server/src/lib/builderSafetyPolicy.ts`, `server/src/lib/opusTaskOrchestrator.ts`, `server/src/lib/opusJudge.ts`, `server/src/lib/opusEnvelopeValidator.ts`, `server/src/lib/builderControlPlane.ts`, `server/src/lib/architectPhase1.ts`, `client/src/modules/M16_builder/hooks/useBuilderApi.ts`, `client/src/modules/M16_builder/ui/PatrolConsole.tsx`, `client/src/modules/M16_builder/ui/BuilderStudioPage.tsx`, `docs/BUILDER-BENCHMARK-K2.6A-RUNNER-PREFLIGHT.md`, `docs/BUILDER-BENCHMARK-K2.6A-EXECUTION-PLAN.md`.
- `kurzurteil`: Der breite Acceptance-Korridor selbst braucht aktuell keinen neuen Benchmark-Landing-Beleg. Die branch-sichtige Builder-Linie ist nach H3-async nicht stehengeblieben, sondern wurde ueber `be952a7`, `8fab1e6`, `451a3a8`, `d0ec9ee`, `adf3658`, `3f08301` und `741c8ab` bis in Control Plane, Architect Dispatch, Observation, Orchestrator und Builder UI weitergezogen. P1 und P2 sind damit nicht mehr offen. Der verbleibende Builder-Restpunkt ist jetzt enger: Routine Patrol client contract alignment statt weiterer Deep-Patrol-Expansion oder neuer synchrone-H3-Erzaehlung.
- `evidence`: K2.6a Batch 1 Ergebnis-Datei `k26a-batch1-results-2026-04-26-19-02-43.json`; lokale Approval-Pair-Evidence `k26a-t06-result-1777261691167.json` und `k26a-t07-result-1777261744811.json` mit T06 `approval-validation=ok`, T07 `requiredExternalApproval=true` und `pushBlockedReason=class_2 requires approved plan + approvalId before live push.`; Cleanup-Evidence fuer das Test-Approval ueber `k26a-approval-cleanup.ts` mit `beforeFound=true`, `deleted=true`, `afterCount=0`; T02-Retry-Evidence `k26a-t02-retry-result-2026-04-27-04-18-44.json`; nicht akzeptierte Landing-Evidence `class1-builder-run-k26-t03-docfix-after-wiring-20260427-230936.json`; Reparatur-Commit `24fc1b8`; Hardening-Commits `77fbdd3`, `0619640`, `53af22a`, `b2d08ea`, `5c76561`, `bd9c2ef`, `c25a4e2`, `acb2b1b`, `cb5f510`, `1d7c6bc`, `307fa3d`, `ed27349`; branch-sichtige Builder-Linie `bad1eca`, `cfb88b0`, `b21859b`, `b7db2ee`, `be952a7`, `8fab1e6`, `451a3a8`, `d0ec9ee`, `adf3658`, `3f08301`, `741c8ab`; `origin/main` verifiziert auf `c98c8e7`; letzte live bestaetigte Runtime-Antwort bleibt auf Code-Head `ed27349`.

### Kandidat - Routine Patrol Client Contract Alignment

- `status`: `active`
- `truth_class`: `repo_visible_plus_review`
- `source_type`: `branch_review`
- `next_gate`: `implementation`
- `why_not_now`: `Der Folgeblock ist bewusst noch nicht gezogen, weil der gerade gelandete Deep-Patrol-/Architect-UI-Slice erst branch-sichtig abgeschlossen wurde und die Routine-Flaeche jetzt getrennt, eng und ohne Serverumbau geschnitten werden soll.`
- `non_scope`: freie Routine-Modellkonfiguration, weitere Deep-Patrol-Arbeit, Server-Aenderungen, Docs-Sync, neue Patrol-Panels, Scheduling, Policy-Settings oder Patrol-Profiles.
- `risk`: mittel-niedrig; die aktuelle Routine-Scout-Flaeche kann pseudo-steuerbar wirken, obwohl der echte Server-Contract feste `ROUTINE_MODELS` und nur einen body-losen Trigger anbietet. Wenn das so bleibt, entsteht UI-Wahrheit, die mehr Steuerung suggeriert als die Runtime hergibt.
- `betroffene_bereiche`: `client/src/modules/M16_builder/ui/PatrolConsole.tsx`, `client/src/modules/M16_builder/hooks/useBuilderApi.ts`, `server/src/routes/opusBridge.ts`, `server/src/lib/scoutPatrol.ts`
- `kurzurteil`: Der kleinste sinnvolle Folgeblock ist kein neuer Feature-Bau, sondern Ehrlichkeitsarbeit: Routine-Slots read-only auf echte Server-Wahrheit ziehen und optional einen minimalen `Run Routine Patrol`-Trigger fuer `POST /api/builder/opus-bridge/patrol-trigger-round` verdrahten. Deep Patrol bleibt dabei unberuehrt.
- `evidence`: `server/src/routes/opusBridge.ts` bietet `POST /patrol-trigger-round` ohne Request-Body sowie `GET /patrol-status` und `GET /patrol-findings`; `server/src/lib/scoutPatrol.ts` fuehrt feste `ROUTINE_MODELS`; `client/src/modules/M16_builder/ui/PatrolConsole.tsx` zeigt derzeit Routine-Scout-Slots in einer staerker steuerbar wirkenden Form, waehrend branch-sichtige Contract-Treue nur fuer Deep Patrol auf `741c8ab` umgesetzt wurde.

### Kandidat - Builder Hardening 2 (Side-Effect Suppression)

- `status`: `adopted`
- `truth_class`: `repo_visible`
- `source_type`: `runtime_verify`
- `next_gate`: `archive`
- `absorbed_into`: `server/src/lib/builderSideEffects.ts`, `server/src/lib/opusTaskOrchestrator.ts`, `server/src/lib/opusSmartPush.ts`, `server/src/lib/opusIndexGenerator.ts`, `server/src/routes/builder.ts`, `server/src/routes/opusBridge.ts`, `server/src/lib/opusBridgeController.ts`, `STATE.md`, `RADAR.md`
- `why_not_now`: `none`
- `non_scope`: `planned`-Modus voll ausbauen, Async-Truth-Reparatur, Claim-/Judge-Semantik, Workflow Simulation Gate bauen, weitere Builder-Nutzungsbelege.
- `risk`: reduziert; der sichtbare Side-Effect-Leckpfad fuer kontrollierte Runs ist geschlossen, das bewusste V1-Risiko bleibt der pragmatische Marker im `task.goal`.
- `betroffene_bereiche`: `server/src/lib/builderSideEffects.ts`, `server/src/routes/opusBridge.ts`, `server/src/routes/builder.ts`, `server/src/lib/opusIndexGenerator.ts`, `server/src/lib/opusSmartPush.ts`, `server/src/lib/opusTaskOrchestrator.ts`, `server/src/lib/opusBridgeController.ts`
- `kurzurteil`: H2A ist repo-sichtbar auf main abgeschlossen. `sideEffects.mode=none` unterdrueckt fuer kontrollierte Runs `SESSION-LOG.md`, den session-log SHA-Backfill und den repo-index Folgepush; fehlender Contract bzw. `mode=default` lassen das bisherige Verhalten unveraendert.
- `evidence`: Folgecommits `c634249` und `25f84fc` markierten die urspruengliche Fehlerklasse; Read-only-H2A-Analyse, Branch-Review und Commit `b2d08ea` fuehren den additiven Contract ein und legen ihn auf `main`. Statischer Verify: Branch-Diff sauber, `pnpm build` gruen, kein Builder-Run.

### Kandidat - Builder H2B (Pre-Push Workflow Simulation Gate v0.1)

- `status`: `adopted`
- `truth_class`: `repo_visible`
- `source_type`: `user_request`
- `next_gate`: `archive`
- `absorbed_into`: `docs/PRE_PUSH_WORKFLOW_SIMULATION_GATE_V0_1.md`, `server/src/lib/builderWorkflowSimulation.ts`, `server/src/lib/opusTaskOrchestrator.ts`, `STATE.md`, `RADAR.md`
- `why_not_now`: `none`
- `non_scope`: echten Workflow-Simulator bauen, Callback-/Truth-Reparatur, neue Builder-Nutzungsbelege, weiterer Push-Smoke, Architekturgraph- oder Telemetrie-Pflichtinputs.
- `risk`: reduziert; der neue Hook bleibt lokal und additiv, das offene Risiko liegt eher in spaeterer Recommendation/Clarification-Semantik und in getrennten Truth-/Telemetry-Themen als in einem offenen Pre-Push-Leckpfad.
- `betroffene_bereiche`: `docs/PRE_PUSH_WORKFLOW_SIMULATION_GATE_V0_1.md`, `server/src/lib/builderWorkflowSimulation.ts`, `server/src/lib/opusTaskOrchestrator.ts`
- `kurzurteil`: H2B ist repo-sichtbar auf main abgeschlossen. `5c76561` fuehrt das minimale Pre-Push Workflow Simulation Gate v0.1 additiv in den Orchestrator ein; `bd9c2ef` korrigiert die Dry-Run-Semantik auf konsequent `dry_run_only`. Pushes werden bei non-allow Entscheidungen vor dem Dispatch gestoppt, ohne H2A, H3 oder breitere Pipeline-Architektur zu oeffnen.
- `evidence`: Read-only-H2B-Scan gegen `docs/PRE_PUSH_WORKFLOW_SIMULATION_GATE_V0_1.md`; Commit `5c76561` (`fix(builder): add pre-push workflow simulation gate`); Folgecommit `bd9c2ef` (`fix(builder): keep workflow simulation dry-run only`); lokaler Static-Verify mit `pnpm build` und helper checks fuer `dryRun`, `manual_only`, protected paths, `pushAllowed=false`, clean allow und outside-scope; kein Builder-Run.

### Kandidat - Builder H2C-1 (Recommendation Output on canonical orchestrator result)

- `status`: `adopted`
- `truth_class`: `repo_visible`
- `source_type`: `user_request`
- `next_gate`: `archive`
- `absorbed_into`: `server/src/lib/builderRecommendationOutput.ts`, `server/src/lib/opusTaskOrchestrator.ts`, `STATE.md`, `RADAR.md`
- `why_not_now`: `none`
- `non_scope`: Legacy-`/build`-Mapping, H3 Async-Truth-Reparatur, neuer Workflow-Simulator, neuer Builder-Test, `requires_clarification` als neuer Gate-Wert.
- `risk`: reduziert; Recommendation-Output bleibt ein additiver Presentation-Layer auf der bestehenden `workflowSimulation`, ohne die Gate-Semantik selbst zu aendern.
- `betroffene_bereiche`: `server/src/lib/builderRecommendationOutput.ts`, `server/src/lib/opusTaskOrchestrator.ts`
- `kurzurteil`: H2C-1 ist repo-sichtbar auf main abgeschlossen. `c25a4e2` fuehrt fuer den kanonischen Orchestrator-Pfad ein eigenes `recommendation`-Objekt mit deterministischen Feldern fuer User-/Operator-Sprache, naechste Aktion, Entscheidungspflicht und sichere Optionen ein; `recommendation.kind` bleibt exakt an `workflowSimulation.recommendedAction` gebunden.
- `evidence`: Read-only-H2C-Scan identifizierte `workflowSimulation` als vorhandene Wahrheit und den Legacy-`/build`-Pfad als getrennten Folgepunkt; Commit `c25a4e2` (`fix(builder): add recommendation output for workflow simulation`); lokaler Static-Verify mit `pnpm build` und helper checks fuer `allow_push`, `dry_run_only`, `require_review`, `block_push`; kein Builder-Run.

### Kandidat - Builder H2C-2 (Legacy /build Result Mapping)

- `status`: `adopted`
- `truth_class`: `repo_visible`
- `source_type`: `repo_review`
- `next_gate`: `archive`
- `absorbed_into`: `server/src/lib/opusBuildPipeline.ts`, `STATE.md`, `RADAR.md`
- `why_not_now`: `none`
- `non_scope`: neuer Gate-Wert, H3 Async-Truth-Reparatur, neuer Builder-Test, `requires_clarification`.
- `risk`: reduziert; der Legacy-Build-Pfad traegt jetzt dieselben additiven Result-Felder wie der kanonische Orchestrator-Pfad, ohne seine Status- oder Governance-Mapping-Logik zu aendern.
- `betroffene_bereiche`: `server/src/lib/opusBuildPipeline.ts`
- `kurzurteil`: H2C-2 ist repo-sichtbar auf main abgeschlossen. `cb5f510` reicht `workflowSimulation`, `recommendation` und `analysis` additiv durch Snapshot- und Build-Result-Typen des Legacy-`/build`-Pfads, statt diese Wahrheit weiter auf `summary` und `pushBlockedReason` zu verflachen.
- `evidence`: H2C-Read-only-Befund zeigte, dass `health.ts` Orchestrator-Result roh durchreicht, waehrend `opusBuildPipeline.ts` nur Governance-Felder spiegelte; Commit `cb5f510` (`fix(builder): carry workflow outputs through legacy build path`); lokaler Static-Verify mit `pnpm build` und Typ-/Shape-Pruefung ueber den Legacy-Pfad; kein Builder-Run.

### Kandidat - Builder H2D-1 (Analysis Before Schema on canonical orchestrator result)

- `status`: `adopted`
- `truth_class`: `repo_visible`
- `source_type`: `user_request`
- `next_gate`: `archive`
- `absorbed_into`: `server/src/lib/builderAnalysisOutput.ts`, `server/src/lib/opusTaskOrchestrator.ts`, `STATE.md`, `RADAR.md`
- `why_not_now`: `none`
- `non_scope`: Legacy-`/build`-Mapping, H3 Async-Truth-Reparatur, neuer Builder-Test, neue Gate-Werte oder Recommendation-Semantik.
- `risk`: reduziert; Analysis-Layer bleibt ein additiver canonical-result-Hook auf Basis schon vorhandener `workflowSimulation`-Signale und aendert die Push-Entscheidung nicht.
- `betroffene_bereiche`: `server/src/lib/builderAnalysisOutput.ts`, `server/src/lib/opusTaskOrchestrator.ts`
- `kurzurteil`: H2D-1 ist repo-sichtbar auf main abgeschlossen. `acb2b1b` fuehrt fuer denselben kanonischen Orchestrator-Pfad ein eigenes `analysis`-Objekt ein, das Evidence-Level, Schema-Lock-Risiko, offene Fragen und Vorsichtsgruende deterministisch aus `confidence`, `missingEvidence`, `ambiguityRisk`, `claimAnchoringRisk`, `scopeRisk` und `protectedPathRisk` ableitet.
- `evidence`: Read-only-H2D-Scan gegen `PRE_PUSH_WORKFLOW_SIMULATION_GATE_V0_1.md` und den bestehenden Orchestrator-/Workflow-Simulation-Pfad; Commit `acb2b1b` (`fix(builder): add analysis output for workflow simulation`); lokaler Static-Verify mit `pnpm build` und helper checks fuer `converged`, `limited`, `fragile`; kein Builder-Run.

### Kandidat - Builder H3A (Pending callback truth on timeout)

- `status`: `adopted`
- `truth_class`: `repo_visible`
- `source_type`: `runtime_verify`
- `next_gate`: `archive`
- `absorbed_into`: `server/src/lib/opusSmartPush.ts`, `server/src/lib/pushResultWaiter.ts`, `STATE.md`, `RADAR.md`
- `why_not_now`: `none`
- `non_scope`: spaete Callback->Result-/DB-Reconciliation, neuer Builder-Test, Deploy-Pfad-Neubau, Side-effect-Contract-Umbau.
- `risk`: reduziert; der konkrete False-Negative-Fall fuer reine Callback-Timeouts ist enger gezogen, aber die tiefere Async-Truth-Reparatur bleibt offen.
- `betroffene_bereiche`: `server/src/lib/opusSmartPush.ts`, `server/src/lib/pushResultWaiter.ts`
- `kurzurteil`: H3A ist repo-sichtbar auf main abgeschlossen. `1d7c6bc` behandelt einen reinen Waiter-Timeout nicht mehr als harte Negativ-Wahrheit `landed=false`, sondern als `landed=undefined` mit explizitem pending-truth-Hinweis; terminale committed:false-Callbacks bleiben unveraendert echte Negativ-Signale.
- `evidence`: H3-Read-only-Scan ueber Waiter, `smartPush` und den execution-result-Callback; Commit `1d7c6bc` (`fix(builder): keep callback timeout truth pending`); lokaler Static-Verify mit `pnpm build` und Waiter-Helper (`undefined|timeout_10ms|true|abc123|false|commit_not_landed`); kein Builder-Run.

### Kandidat - Builder H3-async-0 (Async job callback bridge)

- `status`: `adopted`
- `truth_class`: `repo_visible`
- `source_type`: `derived_from_review`
- `next_gate`: `archive`
- `absorbed_into`: `server/src/schema/builder.ts`, `server/src/routes/health.ts`, `server/src/lib/opusTaskOrchestrator.ts`, `server/src/lib/opusSmartPush.ts`, `server/src/routes/opusBridge.ts`, `server/migrations/0002_builder_tasks_source_async_job_id.sql`, `STATE.md`, `RADAR.md`
- `why_not_now`: `none`
- `non_scope`: allgemeine `/opus-task`-/`/execute`-/`/build`-Reconciliation, neuer Builder-Test, Gate-Umbau.
- `risk`: reduziert; die fehlende Identitaetsbruecke zwischen `async_jobs.id` und spaeterem `builder_tasks.id` ist jetzt explizit und persistent, bleibt aber vorerst nur fuer den Async-Health-Pfad benutzt.
- `betroffene_bereiche`: `server/src/schema/builder.ts`, `server/src/routes/health.ts`, `server/src/lib/opusTaskOrchestrator.ts`, `server/src/lib/opusSmartPush.ts`, `server/src/routes/opusBridge.ts`, `server/migrations/0002_builder_tasks_source_async_job_id.sql`
- `kurzurteil`: H3-async-0 ist repo-sichtbar auf main abgeschlossen. `307fa3d` fuehrt die neue nullable Bruecke `builder_tasks.sourceAsyncJobId` ein und traegt sie vom Async-Health-Job ueber Orchestrator, SmartPush und `/push` bis in die spaet callback-lesbare Builder-Task.
- `evidence`: Read-only-Designscan in `docs/H3-ASYNC-0-DESIGNSCAN.md`; Commit `307fa3d` (`fix(builder): add async job callback bridge`); additive DB-Anwendung lokal ueber `pnpm db:push`; lokaler Static-Verify mit `pnpm build`; kein Builder-Run.

### Kandidat - Builder H3-async-1 (Async job result reconciliation)

- `status`: `adopted`
- `truth_class`: `repo_visible`
- `source_type`: `derived_from_review`
- `next_gate`: `archive`
- `absorbed_into`: `server/src/lib/builderAsyncJobReconciliation.ts`, `server/src/routes/builder.ts`, `STATE.md`, `RADAR.md`
- `why_not_now`: `none`
- `non_scope`: allgemeine synchrone Result-Persistenz fuer `/opus-task`, `/execute` oder `/build`, neuer Builder-Test, neuer Gate-Wert.
- `risk`: reduziert; der Async-Health-Pfad traegt spaete committed:true|false-Callback-Wahrheit jetzt in `async_jobs.result`, bleibt dabei aber bewusst konservativ und dreht spaet gelandete Jobs nicht still auf vollstaendiges `success`.
- `betroffene_bereiche`: `server/src/lib/builderAsyncJobReconciliation.ts`, `server/src/routes/builder.ts`
- `kurzurteil`: H3-async-1 ist repo-sichtbar auf main abgeschlossen. `ed27349` zieht im execution-result-Callback `landed`, `verifiedCommit`, Summary, Blocker-Lesart und Push-Phase fuer den Async-Health-Pfad nach, wenn ein bereits als pending/partial persistierter Job spaeter terminal bestaetigt wird.
- `evidence`: Read-only-Proposal in `docs/H3-ASYNC-1-PROPOSAL.md`; Commit `ed27349` (`fix(builder): reconcile async job callback truth`); lokaler Static-Verify mit `pnpm build` und `tsx`-Helper fuer spaetes Erfolgs-/Fehler-Merging; kein Builder-Run.

### Kandidat - Builder Hardening 3 (Async Truth Repair)

- `status`: `active`
- `truth_class`: `repo_visible`
- `source_type`: `runtime_verify`
- `next_gate`: `decision_gate`
- `why_not_now`: `Bleibt bewusst getrennt von der Hardening-1-Kette und vom Side-effect-Pfad, weil sonst Push-, Callback- und Waiter-Wahrheit in einem Mischblock kippen wuerden.`
- `non_scope`: neue Side-effect-Suppression, Claim-/Judge-Umbau, neue Builder-Nutzungsbelege, Deploy-Pfad-Neubau.
- `risk`: deutlich reduziert, aber als Gesamtlinie noch nicht voll geschlossen. H3A sowie H3-async-0/1 nehmen dem Async-Health-Pfad jetzt den False-Negative- und Persistenz-Drift; offen bleibt nur noch die spaetere Entscheidung, ob synchrone Caller ebenfalls eine persistierte Reconciliation-Wahrheit brauchen.
- `betroffene_bereiche`: `server/src/lib/opusSmartPush.ts`, `server/src/lib/pushResultWaiter.ts`, `server/src/routes/builder.ts`, `server/src/routes/health.ts`, `server/src/routes/opusBridge.ts`, `server/src/schema/builder.ts`
- `kurzurteil`: H3 ist repo-sichtbar deutlich enger. Timeout bleibt seit `1d7c6bc` pending statt false; `307fa3d` baut die explizite Async-Job-Bruecke; `ed27349` zieht fuer `/api/health/opus-task-async` die spaete Callback-Wahrheit jetzt bis in `async_jobs.result` nach. Nicht automatisch geloest ist damit die breitere Frage, ob `/opus-task`, `/execute` und `/build` je einen spaet reconcileten Persistenzpfad brauchen.
- `evidence`: `class1-builder-run-k26-t03-docfix-after-wiring-20260427-230936.json`, analysierter Timeout `timeout_180000ms`, spaeter repo-sichtbarer Commit-Landing-Widerspruch, H3A-Commit `1d7c6bc`, H3-async-0-Commit `307fa3d`, H3-async-1-Commit `ed27349`, additive DB-Anwendung fuer `source_async_job_id`; Live-Health auf Render antwortete danach ebenfalls mit `commit=ed27349`.

### Kandidat - Builder Operator Gate v1.2 (External Approval & Plan Gate)

- `status`: `adopted`
- `truth_class`: `repo_visible`
- `source_type`: `user_request`
- `next_gate`: `archive`
- `absorbed_into`: `server/src/lib/builderSafetyPolicy.ts`, `server/src/lib/opusJudge.ts`, `server/src/lib/opusTaskOrchestrator.ts`, `server/src/routes/opusBridge.ts`, `server/src/routes/health.ts`, `STATE.md`, `FEATURES.md`
- `why_not_now`: `none`
- `non_scope`: Neubau der Pipeline, Aenderung des Legacy-`/build`-Verhaltens, Provider-Wechsel, Persistenzschema-Umbau, UI-Redesign.
- `risk`: mittel; Gate-Logik greift direkt in Push-Freigaben ein, daher klarer Fokus auf false-positive/false-negative Push-Blocks noetig.
- `betroffene_bereiche`: `server/src/lib/builderSafetyPolicy.ts`, `server/src/lib/opusJudge.ts`, `server/src/lib/opusTaskOrchestrator.ts`, `server/src/routes/opusBridge.ts`, `server/src/routes/health.ts`
- `kurzurteil`: V1.2 und der enge Folgeblock v1.2.1 sind repo-sichtbar abgeschlossen: Der Gate-Vertrag ist auf main live und liefert jetzt auch ueber den Async-Health-Pfad fruehe Safety-Felder fuer kritische oder frueh scheiternde Faelle.
- `evidence`: Commit `d69455a` fuehrt decision (`approve|block|uncertain`), `requiredExternalApproval` und class_2 Plan/Approval-Gate ein; Commit `37eec4f` reicht `approvalId`/`hasApprovedPlan` auch ueber `health.ts` weiter und ergaenzt Scope-/Judge-Failures in `opusTaskOrchestrator.ts` um Safety-Felder. Live-Production-Acceptance ueber `/api/health/opus-task-async` ist am 2026-04-26 fuer A/B/C/D gruen verifiziert.

### Kandidat - wait-for-deploy operational diagnosis

- `status`: `adopted`
- `truth_class`: `repo_visible_plus_runtime_probe`
- `source_type`: `runtime_verify`
- `next_gate`: `archive`
- `absorbed_into`: `tools/wait-for-deploy.sh`, `README.md`, `DEPLOY.md`, Runtime-Operator-Playbook (EXPECT_COMMIT + resolve path)`
- `why_not_now`: `none`
- `non_scope`: Deploypfad-Neubau, CI-Refactor, Builder-Gate-Weiterbau, allgemeine Netzwerk-Hardening-Arbeit.
- `risk`: niedrig; Diagnose ist als Operatorspur abgeschlossen, verbleibende Schwankung liegt in lokaler Umgebung (DNS/TTY) statt Produktlogik.
- `betroffene_bereiche`: `tools/wait-for-deploy.sh`, `DEPLOY.md`, `README.md`, lokale Windows/Git-Bash-Operator-Umgebung.
- `kurzurteil`: Der Diagnoseschnitt ist operativ abgeschlossen: Deploy-Truth wurde robust ueber EXPECT_COMMIT plus resolve-basierten Health-Check verifiziert, und der fruehere `HTTP 000`-Drift ist als lokaler Operator-/Netzpfad eingegrenzt statt als Produktfehler.
- `evidence`: Historisch reproduzierter Drift (`HTTP 000` im Script bei gleichzeitig gruener manueller Resolve-Probe) wurde bis zur Live-Wahrheit aufgeloest. Finale Runtime-Evidenz steht auf Commit `8469150186bebaa8d8a2d9052b1cc483ff32cbb2` mit erfolgreichem `/api/health`-Match und nachgelagertem authentifiziertem Route-Check.

### Kandidat - Builder Approval Artifact Validation v1.3

- `status`: `adopted`
- `truth_class`: `repo_visible_plus_runtime_probe`
- `source_type`: `user_request`
- `next_gate`: `archive`
- `absorbed_into`: `server/src/lib/builderApprovalArtifacts.ts`, `server/src/lib/builderSafetyPolicy.ts`, `server/src/lib/opusTaskOrchestrator.ts`, `server/src/routes/opusBridge.ts`
- `why_not_now`: `none`
- `non_scope`: weiterer Gate-Refactor, neue Pipeline, UI-Ausbau, Builder-Memory- oder Provider-Umbau.
- `risk`: mittel; adressiert durch fail-closed v1.3.1 fuer DB-unavailable inkl. getDb()-Throw-Pfad.
- `betroffene_bereiche`: `server/src/lib/builderApprovalArtifacts.ts`, `server/src/lib/builderSafetyPolicy.ts`, `server/src/lib/opusTaskOrchestrator.ts`, `server/src/routes/opusBridge.ts`
- `kurzurteil`: V1.3 und v1.3.1 sind abgeschlossen und live verifiziert: Approval-Artefakte werden deterministisch gegen Instruction+Scope geprueft, und DB-Probleme laufen fail-closed als valid=false statt als Runtime-Throw.
- `evidence`: Commit `666060547e524df305f589b0101160f7fdbda3a0` (v1.3) plus Commit `8469150186bebaa8d8a2d9052b1cc483ff32cbb2` (v1.3.1 fail-closed hotfix). Finale Runtime-Pruefung: `/api/health` zeigt Commit `8469150...`; authentifizierter Fake-ID-Call auf `/api/builder/opus-bridge/approval-validate` liefert `valid=false` mit not_found-Reason und ohne `errorClass`.

### Kandidat F11 - Context-Broker fuer Claude

- `status`: `adopted`
- `truth_class`: `repo_visible`
- `source_type`: `user_request`
- `next_gate`: `archive`
- `absorbed_into`: `server/src/routes/contextBroker.ts`, `server/src/index.ts`, `docs/F11-CONTEXT-BROKER.md`, `STATE.md`, `FEATURES.md`
- `why_not_now`: `none`
- `non_scope`: MCP-Protokoll, Write-Endpoints, freie SQL-Queries, Deploy-Trigger, neue Persistenz
- `risk`: niedrig bis mittel; Nutzen kippt sofort, wenn der Block in generische Tooling-Plattform statt enger read-only Kontextschicht ausfranst oder wenn Repo-Root-Wahrheit still an den Runtime-Container gebunden bleibt
- `betroffene_bereiche`: `server/src/routes/contextBroker.ts`, `server/src/index.ts`, `docs/F11-CONTEXT-BROKER.md`
- `kurzurteil`: Der enge Vorbau fuer spaeteres MCP ist repo-sichtbar umgesetzt; der Followup trennt jetzt sauber zwischen lokalem Runtime-Dateisystem und Repo-Wahrheit auf GitHub main.
- `evidence`: Neuer `/api/context`-Mount im Server, read-only Router mit drei Endpoints und expliziter Tabellen-Whitelist; Followup in `contextBroker.ts` liest fehlende Root-/docs-Dateien via GitHub raw/API und nutzt `SESSION-STATE.md` als kanonischen Handoff-Anker. Live-Verify 2026-04-20 abends nach Commit `0a71429`: Probe 1 `POST /api/context/session-start` liefert HTTP 200, 137 KB Response mit allen vier Ankern (claudeContext 27K, state 46K, radar 34K, sessionState 12K), latestHandoff automatisch auf docs/HANDOFF-S35-F10.md ermittelt, 15 recentCommits, 14 activeDrifts, 6 runtimeSeams. Probe 2 `/files/read` mit 4 gemischten Pfaden (2× server/, 2× docs/) liefert alle vier Dateien im outline-mode, notFound leer — lokal-first + GitHub-Fallback funktionieren. Probe 3 `/ops/query` gegen pool_state + builder_agent_profiles liefert korrekte Rows, unbekannte Tabelle wird mit 400 + allowed-Liste rejected (Whitelist greift).

### Kandidat F12 - Architecture-Digest

- `status`: `adopted`
- `truth_class`: `repo_visible`
- `source_type`: `user_request`
- `next_gate`: `archive`
- `absorbed_into`: `server/src/lib/architectureDigest.ts`, `server/src/routes/contextBroker.ts`, `docs/F12-ARCHITECTURE-DIGEST.md`, `STATE.md`, `FEATURES.md`
- `why_not_now`: `none`
- `non_scope`: MCP-Protokoll-Export, Write-Operationen, Versioning, Cross-Repo-Introspektion, LLM-basierte Code-Zusammenfassung
- `risk`: niedrig bis mittel; deterministisch-statisch und read-only, aber Nutzen kippt sofort wenn Beispielpfade als Runtime-Wahrheit behandelt oder Modul-Abhaengigkeiten nur aus index.ts erraten werden.
- `betroffene_bereiche`: `server/src/lib/architectureDigest.ts`, `server/src/routes/contextBroker.ts`, `docs/F12-ARCHITECTURE-DIGEST.md`
- `kurzurteil`: F12 erweitert den Context-Broker um einen strukturierten Repo-Aufbau statt nur Dateiinhalt. Der Digest bleibt deterministisch, cached 5 Minuten und respektiert die Container-Realitaet ueber lokal-first/GitHub-fallback.
- `evidence`: Neue Lib `architectureDigest.ts` mit Module-/Route-/DB-Parsern und statischen `cross_repos`/`conventions`, neuer Endpoint `/api/context/architecture-digest`, Spec auf `adopted` aktualisiert. Live-Verify 2026-04-20 nach Commit `f3cbc57`: Probe 1 (alle Sections) HTTP 200 mit 15.8 KB, 19 Module mit echten `depends_on`/`used_by` (M02_ui-kit hat 9 `used_by`-Einträge, plausibel für UI-Kit), 16 Routes mit Subrouter-Gruppierung (builder → opus-bridge + patrol korrekt erkannt), 18 DB-Tabellen in drei Gruppen (builder_stack 14, arcana_stack 3, product_stack 1) — Copilots Erweiterung über builder.ts hinaus hat arcana_stack+product_stack sichtbar gemacht. Probe 2 (sections-Filter) liefert nur generatedAt+repoHead+routes+db_tables, andere Sections fehlen → 70% Token-Ersparnis bei gezielten Nachfragen. Probe 3 (Cache-Hit) identischer generatedAt zwischen zwei Calls + initialem Call 2 Min früher → 5-Min-Cache greift.

### Kandidat A - UI Redesign Design System Foundation

- `status`: `adopted`
- `truth_class`: `repo_visible`
- `source_type`: `user_spec`
- `next_gate`: `archive`
- `absorbed_into`: `REDESIGN.md`, `client/src/design/tokens.ts`, `client/src/index.css`, `STATE.md`, `AGENTS.md`
- `why_not_now`: `none`
- `non_scope`: Layout-Komponenten, Home-Modul, Chat-Umbau, Backend-Aenderungen
- `risk`: niedrig, solange der Block auf Tokens und globale CSS-Grundlagen begrenzt bleibt
- `betroffene_bereiche`: `REDESIGN.md`, `client/src/design/tokens.ts`, `client/src/index.css`
- `kurzurteil`: Die Redesign-Spezifikation ist jetzt kanonisch im Repo verankert, und Block 1 des UI-Umbaus ist als Design-System-Foundation umgesetzt.
- `evidence`: `REDESIGN.md` eingecheckt; Tokens und globale CSS-Regeln wurden auf den neuen Design-System-Vertrag umgestellt.

### Kandidat B - UI Redesign Layout Components

- `status`: `adopted`
- `truth_class`: `repo_visible`
- `source_type`: `user_spec`
- `next_gate`: `archive`
- `absorbed_into`: `client/src/modules/M01_app-shell/**`, `client/src/hooks/useLiveTalk.ts`, `client/src/app/App.tsx`, `STATE.md`, `REDESIGN.md`
- `why_not_now`: `none`
- `non_scope`: Chat-Umbau im Ganzen, Startseite, Backend-Routen
- `risk`: kann bei schlechtem Zuschnitt in breiten App-Shell-Refactor kippen
- `betroffene_bereiche`: `client/src/modules/M01_app-shell/**`, `client/src/hooks/useLiveTalk.ts`, `client/src/app/App.tsx`
- `kurzurteil`: Die neue Shell-Struktur mit Sidebar, Topbar, synchronem LiveTalk-Button und Banner ist repo-sichtbar umgesetzt.
- `evidence`: M01-App-Shell-Komponenten und globaler LiveTalk-Shell-State sind eingecheckt und in `App.tsx` aktiv verdrahtet.

### Kandidat C - UI Redesign Startseite

- `status`: `adopted`
- `truth_class`: `repo_visible`
- `source_type`: `user_spec`
- `next_gate`: `archive`
- `absorbed_into`: `client/src/modules/M00_home/**`, `client/src/app/App.tsx`, `REDESIGN.md`, `STATE.md`, `FEATURES.md`
- `why_not_now`: `none`
- `non_scope`: Chat-Umbau, Backend-Routen, Persistenz-Aenderungen, globales State-Redesign
- `risk`: kann in breiten Home- und Discovery-Refactor kippen, wenn bestehende Module ohne engen Schnitt vermischt werden
- `betroffene_bereiche`: `client/src/modules/M00_home/**`, `client/src/app/App.tsx`, Design-System-Bausteine
- `kurzurteil`: Die neue Startseite ist repo-sichtbar umgesetzt und als Default-Flaeche in die Shell integriert.
- `evidence`: `client/src/modules/M00_home/**` existiert, `client/src/app/App.tsx` startet auf `activePage === 'home'`, und `REDESIGN.md` markiert Impl 4 als `completed`.

### Kandidat C2 - UI Redesign Chat-Tab Umbau

- `status`: `adopted`
- `truth_class`: `repo_visible`
- `source_type`: `user_spec`
- `next_gate`: `archive`
- `absorbed_into`: `client/src/modules/M06_discuss/ui/**`, `client/src/app/App.tsx`, `REDESIGN.md`, `STATE.md`, `FEATURES.md`
- `why_not_now`: `none`
- `non_scope`: Backend-Routen, Scoring-Aenderungen, globale State-Neuarchitektur, breite Persistenzarbeit
- `risk`: kann in M06-Voice-, Persona- und Layout-Refactor zugleich kippen, wenn Feed, Input und Settings nicht eng geschnitten werden
- `betroffene_bereiche`: `client/src/modules/M06_discuss/**`, `client/src/app/App.tsx`, Design-System-Bausteine, bestehende Shell-Komponenten
- `kurzurteil`: Der neue Chat-Tab ist repo-sichtbar umgesetzt und nutzt jetzt Maya-Sonderrolle, globale LiveTalk-Steuerung und Slide-in-Settings.
- `evidence`: `client/src/modules/M06_discuss/ui/` enthaelt die neuen Chat-Komponenten, `DiscussionChat.tsx` nutzt sie aktiv, und `REDESIGN.md` markiert Impl 5 als `completed`.

### Kandidat C3 - UI Redesign Weitere Tabs

- `status`: `adopted`
- `truth_class`: `repo_visible`
- `source_type`: `user_spec`
- `next_gate`: `archive`
- `why_not_now`: `none`
- `non_scope`: Backend-Routen, State-Neuarchitektur, Persistenz-Aenderungen, Voice-Audit als Nebenpfad
- `risk`: kann in breit verteilten UI-Umbau kippen, wenn Tab fuer Tab nicht eng geschnitten wird
- `betroffene_bereiche`: weitere Client-Module gemaess `REDESIGN.md`, `client/src/app/App.tsx`, Design-System-Bausteine
- `kurzurteil`: Astro, Report/Match, Hall of Souls und Explore sind jetzt sichtbar in die neue Shell- und Frame-Sprache eingehaengt, ohne ihre bestehende Produktlogik umzuschreiben.
- `evidence`: `client/src/app/App.tsx` nutzt jetzt `TabPageShell` und `TabSectionFrame` fuer diese Seiten, und `REDESIGN.md` markiert Impl 6 als `completed`.

### Kandidat D - Freisprechen / Voice Reliability Audit

- `status`: `adopted`
- `truth_class`: `derived_from_review`
- `source_type`: `repo_review`
- `next_gate`: `archive`
- `absorbed_into`: `client/src/modules/M06_discuss/**`, `client/src/modules/M08_studio-chat/ui/StudioSession.tsx`, `client/src/lib/globalMediaController.ts`, `server/src/routes/studio.ts`, `server/src/studioPrompt.ts`, `STATE.md`, `FEATURES.md`
- `why_not_now`: `none`
- `non_scope`: neue TTS-Engine, Credits-System, grosser Persona-Router-Refactor, tokenweises Provider-Streaming
- `risk`: Restlatenz bleibt, solange `server/src/lib/providers.ts` keine echten Token-Deltas liefert
- `betroffene_bereiche`: `client/src/hooks/useSpeechToText.ts`, `client/src/modules/M06_discuss/**`, `server/src/routes/studio.ts`, `server/src/lib/ttsService.ts`
- `kurzurteil`: Der enge Voice-Hardening-Block ist jetzt repo-sichtbar umgesetzt: frueheres Chat-Feedback, globaler Stop/Abort fuer Chat und Studio und sauberer Moduskontext fuer Maya.
- `evidence`: `useDiscussApi.ts` ist abortierbar und streamt M06 immer ueber SSE; `Topbar.tsx`, Shell-LiveTalk und `StudioSession.tsx` teilen jetzt einen globalen Stop-Pfad; `studioPrompt.ts` nutzt `appMode`.

### Kandidat I - True Provider Streaming

- `status`: `active`
- `truth_class`: `repo_visible`
- `source_type`: `repo_review`
- `next_gate`: `proposal`
- `why_not_now`: Der aktuelle Crush-Block hat die sichtbare UX-Haerte geliefert; fuer echte weitere Latenzsenkung muesste jetzt gezielt die Provider-Schicht geoeffnet werden.
- `non_scope`: neuer Persona-Umbau, allgemeiner SSE-Refactor ueber alle Routen
- `risk`: mittel bis hoch, weil `server/src/lib/providers.ts` heute request/response-zentriert arbeitet und Provider unterschiedlich streamen
- `betroffene_bereiche`: `server/src/lib/providers.ts`, `server/src/routes/studio.ts`, ggf. Provider-spezifische Adapter
- `kurzurteil`: Die aktuelle Verbesserung ist fruehes SSE-Feedback, aber noch kein echtes Token-Streaming aus dem Modell.
- `evidence`: `server/src/routes/studio.ts` sendet `typing` und danach fertigen Text; `server/src/lib/providers.ts` streamt keine Provider-Deltas.

### Kandidat J - LiveTalk Real-Provider Probe Execution

- `status`: `active`
- `truth_class`: `repo_visible`
- `source_type`: `repo_review`
- `next_gate`: `implementation`
- `why_not_now`: `none`
- `non_scope`: neuer Provider-Stack, Persona-Router-Refactor, browserweite Audio-Neuarchitektur
- `risk`: niedrig bis mittel; Kosten und Laufzeit liegen eher in realen Provider-Calls als im Repo-Scope
- `betroffene_bereiche`: `server/scripts/discuss-audio-probe-check.mjs`, `server/src/routes/studio.ts`, laufende Ziel-Runtime
- `kurzurteil`: Der Verifikationsblock hat jetzt ein eigenes Probe-Werkzeug und eine geschlossene Cancel-Naht; offen ist vor allem die Ausfuehrung gegen echte Zielumgebungen.
- `evidence`: `server/scripts/discuss-audio-probe-check.mjs` prueft SSE-Timings, Audio-Telemetrie und Round-Cancel-Verhalten; `server/src/routes/studio.ts` unterdrueckt spaete Events aus ueberholten Runden.

### Kandidat E - Dev Token Hardening

- `status`: `active`
- `truth_class`: `repo_visible`
- `source_type`: `repo_review`
- `next_gate`: `user_approval`
- `why_not_now`: Voice-Stabilitaet hat den groesseren direkten Produkthebel.
- `non_scope`: komplette Auth-Einfuehrung, Rollenmodell, Benutzerkonten
- `risk`: klein; Gefahr liegt eher in stillen lokalen Tools, die das eingebaute Passwort nutzen koennten
- `betroffene_bereiche`: `server/src/routes/dev.ts`, evtl. Root-Doku
- `kurzurteil`: Das eingebaute Passwort sollte entfernt oder mindestens klar als temporarer Sonderfall behandelt werden.
- `evidence`: `server/src/routes/dev.ts` nutzt `process.env.DEV_TOKEN || BUILTIN_PASSWORD`.

### Kandidat F - Persistence Reality Audit

- `status`: `active`
- `truth_class`: `repo_visible`
- `source_type`: `repo_review`
- `next_gate`: `proposal`
- `why_not_now`: Erst Voice-Audit oder Security-Hardening schneiden; sonst oeffnet sich Scope in DB, Docs und Runtime zugleich.
- `non_scope`: Migration-Neudesign, komplette Vereinheitlichung aller Speicherorte
- `risk`: mittel, weil Tabelle-vorhanden nicht automatisch gleich produktiv-genutzt bedeutet
- `betroffene_bereiche`: `migration.sql`, `server/src/lib/memoryService.ts`, weitere DB-nahe Dateien, Root-Doku
- `kurzurteil`: Soulmatch braucht eine ehrliche Sicht darauf, welche DB-Tabellen wirklich produktiv genutzt werden und welche nur Schema-Vorrat sind.
- `evidence`: `session_memories` ist aktiv im Code; `persona_memories` und `voice_profiles` sind im Schema sichtbar.

### Kandidat F2 - Builder Memory Live Verification

- `status`: `active`
- `truth_class`: `repo_visible`
- `source_type`: `repo_review`
- `next_gate`: `implementation`
- `why_not_now`: Der Codeblock ist gebaut und typgeprueft; offen ist jetzt nicht mehr Architektur, sondern der manuelle Deploy-Schritt fuer die neue Tabelle und der Live-Nachweis der Persistenzkette.
- `non_scope`: weitere Builder-Architektur, neuer Prompt-Umbau, breite Persistenzvereinheitlichung ueber das Gesamtprodukt
- `risk`: mittel; ohne manuellen Render-Schema-Push bleibt die neue Builder-Memory im Deploy nur teilweise wirksam, obwohl der Code bereits darauf vertraut und nur weich degradiert.
- `betroffene_bereiche`: `server/src/schema/builder.ts`, `server/src/lib/builderMemory.ts`, `server/src/lib/builderFusionChat.ts`, `server/src/lib/builderDialogEngine.ts`, `server/src/routes/builder.ts`, Deploy-Runtime
- `kurzurteil`: Der naechste saubere Block ist die echte Laufzeitverifikation der neuen Maya-Builder-Memory nach manuellem Schema-Push.
- `evidence`: `builder_memory` ist im Schema angelegt; Builder chat, engine und routes synchronisieren Memory bereits im Code; Fehlerpfade fuer fehlende Tabelle sind abgefedert.

### Kandidat F3 - Opus Bridge Live Verification

- `status`: `active`
- `truth_class`: `repo_visible`
- `source_type`: `repo_review`
- `next_gate`: `implementation`
- `why_not_now`: `none`
- `non_scope`: neuer Scout-Mix, Kostenpolitik fuer Default-Writer, Heavy-Crush-Ausbau
- `risk`: mittel; die direkte `/git-push`-Commit-Semantik ist jetzt live belegt, aber Render kann im breiteren Opus-Pfad weiter an `@READ`-Pfaden, BDL-Disziplin oder Judge-/Distiller-Drift scheitern.
- `betroffene_bereiche`: `server/src/lib/providers.ts`, `server/src/lib/opusScoutRunner.ts`, `server/src/lib/opusRoundtable.ts`, `server/src/lib/builderBdlParser.ts`, `server/src/lib/opusBridgeController.ts`, `server/src/routes/opusBridge.ts`, Ziel-Runtime auf Render
- `kurzurteil`: Der direkte GitHub-Commit-Pfad ist nach dem atomaren Mehrdatei-Probe nicht mehr die offene Hauptnaht; der naechste enge Block ist der Live-Nachweis der kompletten Opus-Bridge von Roundtable-BDL und `@READ` bis Distiller-/Judge-Treue unter Render.
- `evidence`: Der Provider-Layer kennt `zhipu` und `openrouter`; der aktive GLM-Pfad fuer Scout, Distiller, Roundtable und Worker ist auf OpenRouter-Modelle umgestellt; `builderBdlParser.ts` erkennt SEARCH/REPLACE-`@PATCH` jetzt wieder als Patch-Body; `server/src/routes/opusBridge.ts` schreibt Mehrdatei-Payloads atomar ueber die Git Data API; der Live-Probe-Commit `ad8abd0` erzeugte drei Dateien mit identischem `commitSha` in allen `/git-push`-Results.

### Kandidat F4 - Builder S17 Live Verification

- `status`: `active`
- `truth_class`: `repo_visible`
- `source_type`: `repo_review`
- `next_gate`: `implementation`
- `why_not_now`: `none`
- `non_scope`: weiterer Builder-Umbau, Persona-Routing, Scoring, breite UI-Politur
- `risk`: mittel; die Repo-Naht ist gebaut, aber der eigentliche Produktwert haengt jetzt an drei Live-Pruefpunkten statt an weiterem Code.
- `betroffene_bereiche`: `server/src/lib/builderFusionChat.ts`, `server/src/lib/opusDistiller.ts`, `server/src/lib/builderStaleDetector.ts`, `server/src/index.ts`, `server/src/routes/opusBridge.ts`, `client/src/modules/M16_builder/ui/BuilderStudioPage.tsx`, Render-Runtime
- `kurzurteil`: S17 ist repo-sichtbar live im Code, aber der naechste enge Block ist jetzt die Verifikation von Distiller-Intent-Treue, sichtbarem UI-Cancel und `[stale-detector]`-Logs auf Render.
- `evidence`: `builderFusionChat.ts` kennt `cancel` inkl. `all_stuck`; `BuilderStudioPage.tsx` zeigt einen Cancel-Knopf fuer offene Tasks; `builderStaleDetector.ts` loggt `[stale-detector]` und blockiert alte Tasks; `opusDistiller.ts` verankert `getWorstPerformers` explizit gegen Drift auf `getTopPerformers`; `opusBridge.ts` bietet `debug-scope`.

### Kandidat F5 - Director Live Verification

- `status`: `active`
- `truth_class`: `repo_visible`
- `source_type`: `repo_review`
- `next_gate`: `live_async_validation`
- `why_not_now`: `none`
- `non_scope`: neuer Director-Skill-Baum, breite UI-Politur, neuer Patrol-Endpoint-Faecherschnitt
- `risk`: mittel; die grundlegende Action-Delegation ist jetzt live belegt, aber der produktive Nutzwert haengt weiter an echtem Async-Task-Lauf, Statusnachfuehrung und sauberer Chat-/UI-Rueckmeldung.
- `betroffene_bereiche`: `server/src/lib/directorContext.ts`, `server/src/lib/directorPrompt.ts`, `server/src/lib/directorActions.ts`, `server/src/routes/builder.ts`, `server/src/routes/health.ts`, `client/src/modules/M16_builder/hooks/useMayaApi.ts`, `client/src/modules/M16_builder/ui/BuilderStudioPage.tsx`, Render-Runtime
- `kurzurteil`: Der bisherige Director fuehlt sich jetzt repo-sichtbar als Maya-Werkzeug an statt wie ein zweites Wesen: Maya Brain, Maya-Labels, direkte Memory-Tools und automatische Continuity-Notizen sind gebaut. Der fruehere UI-Drift ist enger bereinigt: die live Route `/builder` zeigt diese Brain-Steuerung nur noch in `BuilderStudioPage`, und die tote Nebenflaeche ist aus dem aktiven Builder-Modul entfernt. Der naechste enge Block bleibt trotzdem der Live-Nachweis fuer delegierte Async-Tasks samt Status, UI-Spur und echter Memory-Rueckwirkung.
- `evidence`: `BuilderStudioPage.tsx` zeigt den sichtbaren Brain-Toggle inkl. Opus/GPT 5.4/GLM 5.1, Fast/Deep und Action-Badges auf der realen `/builder`-Route; `builder.ts` persistiert nach jeder Brain-Interaktion eine neue Continuity-Notiz in `builder_memory`; `directorActions.ts` bietet direkte `memory-read`- und `memory-write`-Tools; `directorPrompt.ts` beschreibt Maya explizit als dieselbe Identitaet mit wechselbarem Brain; `opusWorkerSwarm.ts`, `opusWorkerRegistry.ts` und `poolState.ts` fuehren `GLM 5.1` als Meister-/Worker-Pfad.

### Kandidat F5b - Builder Index Refresh Randpfad

- `status`: `adopted`
- `truth_class`: `repo_visible`
- `source_type`: `repo_review`
- `next_gate`: `archive`
- `why_not_now`: `none`
- `non_scope`: neuer Resolver, breitere Pipeline-Architektur, Render-Deploy
- `risk`: niedrig; der Fix haengt nur den bereits existierenden Repo-Index-Refresh an den spaeteren GitHub-Commit-Callback.
- `betroffene_bereiche`: `server/src/routes/builder.ts`, `server/src/lib/opusBridgeController.ts`, `server/src/lib/opusIndexGenerator.ts`, `server/src/lib/builderScopeResolver.ts`
- `kurzurteil`: Der bestehende Index-Refresh war auf mehreren direkten Push-Pfaden schon da, aber nicht sauber auf dem Callback-Randpfad abgesichert. Dieser Pfad zieht den Refresh jetzt nach Commit-Bestaetigung ebenfalls.
- `evidence`: `opusBridgeController.ts` regeneriert den Index nach erfolgreichem Push bereits direkt; `builder.ts` triggert `regenerateRepoIndex()` jetzt auch im `execution-result`-Commit-Callback; `opusIndexGenerator.ts` invalidiert danach den Resolver-Cache.

### Kandidat F5c - Builder Create-Mode explizit

- `status`: `adopted`
- `truth_class`: `repo_visible`
- `source_type`: `repo_review`
- `next_gate`: `archive`
- `why_not_now`: `none`
- `non_scope`: neuer Judge, Related-Files-Recherche, UI-Ausbau, Deploy-Verifikation
- `risk`: niedrig; der Block macht einen schon halb vorhandenen New-File-Pfad explizit, statt ein zweites Erstellungsmodell einzufuehren.
- `betroffene_bereiche`: `server/src/lib/builderScopeResolver.ts`, `server/src/lib/opusChangeRouter.ts`, `server/src/lib/opusTaskOrchestrator.ts`, `server/src/lib/opusSmartPush.ts`
- `kurzurteil`: Neue Dateien sind im internen Opus-Task jetzt kein impliziter Sonderfall mehr. Resolver, ChangeRouter, Worker-Prompt und SmartPush tragen denselben Create-Zustand durch, statt sich nur auf fehlende Datei-Inhalte zu verlassen.
- `evidence`: `builderScopeResolver.ts` liefert fuer Create-Faelle jetzt `method: create`; `opusChangeRouter.ts` kennt `create` als eigenen Modus; `opusTaskOrchestrator.ts` gibt Create-Targets explizit in den Worker-Prompt; `opusSmartPush.ts` behaelt den Envelope-Modus bis zum Push statt ihn wieder zu erraten.

### Kandidat F5d - Semantischer Judge gegen Instruktionsdrift

- `status`: `adopted`
- `truth_class`: `repo_visible`
- `source_type`: `repo_review`
- `next_gate`: `archive`
- `why_not_now`: `none`
- `non_scope`: neuer Parallel-Judge, breite Pipeline-Neuarchitektur, Scout-Umbau
- `risk`: mittel; der Block haertet den bestehenden Judge sichtbar, aber die Laufzeitqualitaet haengt weiter daran, ob der spaetere Briefing-Kontext deterministisch und nicht driftig bleibt.
- `betroffene_bereiche`: `server/src/lib/opusJudge.ts`, `server/src/lib/opusTaskOrchestrator.ts`, Worker-Briefing-Kontext
- `kurzurteil`: Der bestehende Judge ist jetzt haerter statt breiter geworden: Er kann Kandidaten bei fehlenden expliziten Zielpfaden, fehlenden Create-Targets oder zu breitem Scope auch komplett ablehnen, statt immer einen Sieger zu kueren.
- `evidence`: `opusJudge.ts` bewertet jetzt Blocking-Issues und Warnings pro Kandidat und kann per `approved: false` alle Kandidaten verwerfen; `opusTaskOrchestrator.ts` bricht nach einer Judge-Ablehnung vor dem Push sauber ab.

### Kandidat F5e - Deterministische Related-Files-Briefing-Lane

- `status`: `active`
- `truth_class`: `derived_from_review`
- `source_type`: `repo_review`
- `next_gate`: `implementation`
- `why_not_now`: `none`
- `non_scope`: neuer Scout-Mix, LLM-Dateisuche, breiter Resolver-Umbau
- `risk`: mittel; ohne diesen Block bekommt der Worker weiter weniger belastbaren Kontext als ueber Imports, Rueckreferenzen und Dateinaehe eigentlich moeglich waere.
- `betroffene_bereiche`: `server/src/lib/opusTaskOrchestrator.ts`, Repo-Index-/Import-Helfer, Worker-Briefing-Kontext
- `kurzurteil`: Nach Create-Mode und Judge-Hardening ist der naechste enge Hebel keine neue Intelligenzschicht, sondern ein deterministischer Neben-Kontext fuer thematisch benachbarte Dateien.
- `evidence`: Der Scope-Resolver ist heute deterministisch, aber das nachgelagerte Worker-Briefing kennt noch keine gezielte Related-Files-Anreicherung aus Imports oder Rueckreferenzen.

### Kandidat F6 - File-Scout gegen Scope-Halluzination

- `status`: `adopted`
- `truth_class`: `repo_visible`
- `source_type`: `repo_review`
- `next_gate`: `archive`
- `absorbed_into`: `server/src/lib/builderScopeResolver.ts`, `server/src/lib/opusTaskOrchestrator.ts`, `server/src/routes/health.ts`, `docs/F6-SCOPE-HALLUCINATION-FIX.md`, `STATE.md`, `SESSION-STATE.md`, `CLAUDE-CONTEXT.md`
- `why_not_now`: `none`
- `non_scope`: neuer LLM-Scout, breiter Resolver-Umbau, LSP-basierte Symbol-Aufloesung
- `risk`: geschlossen — halluzinierte Scope-Pfade werden bei der Scope-Phase abgefangen bevor der Worker-Swarm startet, keine verschwendeten Tokens oder GitHub-Action-Runs.
- `betroffene_bereiche`: `server/src/lib/opusTaskOrchestrator.ts`, `server/src/lib/builderScopeResolver.ts`, `server/src/routes/health.ts`
- `kurzurteil`: Drei Hebel in einem atomaren Commit (Copilot `8a4317d`): Hebel α prueft manualScope gegen Repo-Index und rejected ohne Create-Signal; Hebel β prueft Regex-Fallback-Pfade auf plausiblen 3-Segment-Prefix im Index; Hebel γ erweitert Phase-Report um indexedFiles/createTargets/rejectedPaths. opus-task-async wurde in separatem Commit (`401b3a7`) erweitert um scope/skipDeploy/targetFile fuer HTTP-Live-Verify-Pfad.
- `evidence`: Live-Akzeptanztests 2026-04-20 abends. Probe 1 (`job-mo79mizv`): manualScope mit falschem client/-Prefix → scope.status `error`, rejectedPaths enthaelt den Pfad, summary "Scope rejected 1 hallucinated path(s)". Probe 2b (`job-mo79q986`): `erstelle server/src/xyz1234unique/sondermodul.ts` → scope.status `error`, reasoning "no indexed file shares the first 3 path segments, likely hallucination". Beide Proben: 2-7ms Laufzeit (Early-Reject, keine Worker-Swarm-Phase, keine LLM-Tokens verbrannt). F6-Spec-Dokument in `docs/F6-SCOPE-HALLUCINATION-FIX.md`.

### Kandidat F14A - Claim-Gate Contract Clarification

- `status`: `adopted`
- `truth_class`: `repo_visible`
- `source_type`: `repo_review`
- `next_gate`: `archive`
- `why_not_now`: `none`
- `non_scope`: neuer hard blocker fuer scope mismatch, Planner/Auditor-Formalisierung, Merge-Gate-Phase, Claim-Scoring, breiter Resolver-Umbau
- `risk`: niedrig; der enge Block ist jetzt nicht nur lokal gebaut, sondern ueber den echten Production-HTTP-Pfad runtime-verifiziert. Residualrisiko liegt eher in breiteren Opus-Bridge-Themen ausserhalb des F14A-Schnitts.
- `betroffene_bereiche`: `server/src/lib/opusClaimGate.ts`, `server/src/lib/opusTaskOrchestrator.ts`, `server/src/lib/opusJudge.ts`, `server/src/lib/builderScopeResolver.ts`, `docs/F14-PHASE1-CLAIM-GATE-SPEC.md`
- `kurzurteil`: Der enge F14-Block ist kein Governance-Ausbau, sondern eine Vertragsklaerung auf drei Naehten: zweites Scope-Signal im Claim-Gate, explizite Arbeitsteilung zwischen Gate und Judge, und genau ein Fresh-Check fuer unindexierte manual-scope-Pfade gegen Repo-Wahrheit.
- `evidence`: Repo-sichtbar pruefbar ist jetzt: `opusClaimGate.ts` liefert zusaetzlich `scopeCompatibility = compatible | mismatch | not_evaluated`; `opusTaskOrchestrator.ts` fuehrt Gate weiter vor Judge aus und macht fuer unindexierte manual-scope-Pfade genau einen Repo-Raw-Fetch-Check, bevor ein frueher Reject bleibt; `opusJudge.ts` bleibt die finale normative Reject-Instanz fuer out-of-scope edits. Production-Runtime-Verify auf Basis von `d375304` lief ueber `/api/health/opus-task-async`: Case 1 in-scope `anchored + compatible` mit Judge-Approve (`job-mobq28w2`), Case 2 out-of-scope `anchored + mismatch` mit Judge-Reject (`job-mobq72r1`), Case 3 realer unindexierter manual-scope-Pfad mit Fresh-Check statt Fruehreject (`job-mobpxh4b`), Case 4 nicht existierender Pfad ohne Create-Signal mit fruehem Reject ueber `rejectedPaths` (`job-mobpt6rd`). Der Phase-1-Entwurf liegt in `docs/F14-PHASE1-CLAIM-GATE-SPEC.md`.

### Kandidat F15 - Builder Spec-Hardening vor Phase 1

- `status`: `adopted`
- `truth_class`: `repo_visible`
- `source_type`: `user_request`
- `next_gate`: `archive`
- `absorbed_into`: `server/src/lib/specHardening.ts`, `server/src/lib/opusTaskOrchestrator.ts`, `server/src/lib/architectPhase1.ts`, `server/src/routes/architect.ts`, `docs/PHASE-1-SPEC-HARDENED.md`, `STATE.md`, `FEATURES.md`
- `why_not_now`: `none`
- `non_scope`: `Phase 1 AICOS-Meta-Loader, neue Routes, UI-Ausleitung, Maya-Core-Anbindung, Webhooks, Capability-Learning`
- `risk`: `niedrig bis mittel; der Hardening-Zwischenschritt ist live in den Phase-1-Pfad eingelassen, 910fbed, a5220e1 und bf36900 nehmen jetzt sowohl die zentralen Forbidden-Patterns als auch die vier heuristischen Randchecks aus reiner Prosa heraus und schaerfen den BACKTICK-Fall innerhalb von Code weiter. Die offene Designfrage ist fuer den aktuellen Stand bewusst geschlossen: `BACKTICK_IN_REGEX` bleibt `block`, global bleibt nur `checkLengthLimits`, und Verlaufstelemetrie wird ohne echten Entscheidungsdruck nicht vorgezogen. Der AICOS-Wahrheitsschnitt bleibt, ist aber enger: Soulmatch traegt unter `aicos-registry/` weiter nur einen eingebetteten Snapshot, dieser Snapshot enthaelt nach dem engen Import jetzt auch `sol-cross-057` bis `061`, waehrend das separate Public-Upstream-Repo auf `master` weiterhin die breitere Quelle bleibt.`
- `betroffene_bereiche`: `server/src/lib/specHardening.ts`, `server/src/lib/opusTaskOrchestrator.ts`, `server/src/lib/architectPhase1.ts`, `server/src/routes/health.ts`, `server/src/routes/opusBridge.ts`, `server/src/routes/architect.ts`
- `kurzurteil`: `Der vorgeschaltete Hardening-Block ist umgesetzt und live verifiziert: Builder-Instruktionen werden vor dem Dispatch deterministisch gehaertet, vergiftete Assumptions blocken vor dem Swarm, der Regex-False-Positive wurde mit 4a072ec nachgeschaerft, 910fbed macht die zentralen Forbidden-Patterns kontextbewusst, 0e4c075 erweitert den bestehenden Architect-State um kompakte Observability, a5220e1 zieht die vier heuristischen Randchecks auf denselben Code-vs-Prosa-Schnitt, bf36900 schaerft den verbliebenen BACKTICK-False-Positive auf echte backtick-delimited Regex-Spans nach, und die nachgelagerte Designrunde hat den aktuellen Zustand bestaetigt statt neuen Scope zu erfinden. Der offene AICOS-Punkt ist jetzt nochmals enger gerahmt: Die lokale Verfuegbarkeit von `sol-cross-057` bis `061` ist durch den engen Snapshot-Import hergestellt, aber Soulmatch nutzt operativ weiterhin getrennte Wahrheiten fuer lokalen Snapshot und separates Upstream-Repo.`
- `evidence`: `65e705d` fuehrt den Hardening-Pfad repo-sichtbar ein; `47deb25` baut Phase 1 mit AICOS-Meta-Loader, Assumption-Registry, Dispatch-Gate und `/api/architect/state`; `4a072ec` korrigiert einen produktiv nachgewiesenen False-Positive im Exfiltration-Regex; `910fbed` macht die wichtigsten Forbidden-Patterns in `server/src/lib/specHardening.ts` code-block-aware; `0e4c075` aggregiert in `server/src/lib/architectPhase1.ts` Findings-, Truncation- und Signal-Metriken sowie den bewusst ehrlich benannten Counter `observedAssemblies`; `a5220e1` macht `checkBacktickRegexPattern`, `checkUnescapedBackslashes`, `checkCurlyTemplatePattern` und `checkQuoteImbalance` code-aware; `bf36900` verengt `BACKTICK_IN_REGEX` auf echte backtick-delimited Regex-Spans. Live-Proben 2026-04-24/25: Render-Deploys auf `47deb25`, `4a072ec`, `910fbed`, `0e4c075`, `a5220e1` und `bf36900` verifiziert, produktive Migration von `builder_assumptions` ueber `/api/builder/opus-bridge/migrate`, `/api/architect/state` zeigt `persistenceMode=database`, der Async-Gate-Smoke `job-mod99ozd` blockt die vergiftete Assumption vor dem Worker-Swarm bei gleichzeitig akzeptierten Meta-Karten `meta-001` bis `meta-007`, ein weiterer Async-Dry-Run mit prose-eingebetteten Triggerwoertern wurde live akzeptiert statt vom Hardening-Gate geblockt, der Observability-Smoke hob `observedAssemblies` live von 0 auf 1, der Phase-2B-Smoke hob `observedAssemblies` live von 1 auf 2, und der Praezisions-Smoke liess das harmlose Codebeispiel `console.log("/api/users"); /* doc \`text\` and more \`text\` */` live durch bei weiterhin leeren Block-/Warn-Counts. Korrektur- und Importblock 2026-04-25: Im Soulmatch-Unterordner `aicos-registry/` zeigen `git remote -v` und `git log` weiterhin das Hauptrepo `G-Dislioglu/soulmatch` auf `main`, `.gitmodules` fehlt, `server/src/lib/architectPhase1.ts` und `server/src/lib/councilScout.ts` lesen weiterhin direkt das Upstream-Index auf `master`, `server/src` traegt keine hart codierten `sol-cross-*`-Verweise auf diese lokalen Dateien, und der enge Folgeblock importiert `sol-cross-057` bis `sol-cross-061` repo-sichtbar in den lokalen Snapshot und korrigiert den stale `tree/main`-Link in `server/src/lib/architectureDigest.ts` auf `tree/master`.`

### Kandidat F7 - Pool-Config-Persistenz ueber DB

- `status`: `adopted`
- `truth_class`: `repo_visible`
- `source_type`: `repo_review`
- `next_gate`: `archive`
- `absorbed_into`: `server/src/lib/poolState.ts`, `server/src/schema/builder.ts`, `STATE.md`
- `kurzurteil`: UI-Pool-Selektionen ueberleben jetzt Render-Deploys und Container-Neustarts. Vorher wurde `activePools` pro Container-Boot aus dem Code-Default geladen, sodass jede UI-Aenderung nach dem naechsten Restart verloren war.
- `evidence`: S33b-Session hat die `poolState`-Tabelle in Neon angelegt, `initializePoolState()` laedt beim Serverstart die persistierten Pools, `persistPoolsAsync()` schreibt Aenderungen fire-and-forget zurueck. Live verifiziert per Test (Pool-Wechsel -> Redeploy -> Config intakt).

### Kandidat F8 - Session-Log-Endpoint mit SHA-Backfill

- `status`: `adopted`
- `truth_class`: `repo_visible`
- `source_type`: `repo_review`
- `next_gate`: `archive`
- `absorbed_into`: `server/src/routes/opusBridge.ts`, `server/src/lib/builderGithubBridge.ts`, `docs/SESSION-LOG.md`, `docs/CLAUDE-CONTEXT.md`
- `kurzurteil`: Jeder erfolgreiche `/git-push` schreibt automatisch einen strukturierten Eintrag in `docs/SESSION-LOG.md` im selben Commit. Ein Fire-and-forget Follow-up-Commit ersetzt den `pending`-SHA-Marker durch den echten Commit-SHA.
- `evidence`: S34-Session (2026-04-20) hat den Endpoint live geschaltet und verifiziert: Test-Push c342ddd generierte Log-Eintrag mit `pending`, 2s spaeter kam Follow-up 9c72a6f mit echtem SHA. SHA-Backfill-Commit ist docs-only und loest keinen Render-Deploy aus (paths-ignore in render-deploy.yml). Damit ist die Runtime-Schicht des Anti-Drift-Systems scharf.

### Kandidat F9 - S31 False-Positive Pipeline Path

- `status`: `adopted`
- `truth_class`: `repo_visible`
- `source_type`: `repo_review`
- `next_gate`: `archive`
- `absorbed_into`: `server/src/lib/pushResultWaiter.ts` (neu), `server/src/lib/opusSmartPush.ts`, `server/src/routes/builder.ts`, `.github/workflows/builder-executor.yml`, `STATE.md`, `SESSION-STATE.md`, `CLAUDE-CONTEXT.md`, `docs/HANDOFF-S35-F9.md`
- `why_not_now`: `none`
- `non_scope`: neuer Executor-Pfad, Renderer-Umbau, breiter Workflow-Umbau
- `risk`: geschlossen — die Pipeline kann false-positive success nicht mehr melden; bei empty-diff, REPLACE_FAILED oder Build-Fehlern kommt der execution-result-Callback mit `reason` zurueck und smartPush meldet `pushed: false`.
- `betroffene_bereiche`: `server/src/lib/pushResultWaiter.ts` (neu), `server/src/lib/opusSmartPush.ts`, `server/src/routes/builder.ts`, `.github/workflows/builder-executor.yml`
- `kurzurteil`: Callback-basierter Wait statt SHA-Polling. Drei Hebel live: Schritt A (smartPush wartet via in-memory Waiter-Queue auf execution-result-Callbacks), Schritt C (Workflow-empty-diff sendet Callback + `exit 1` statt stillem `exit 0`), Schritt D (Orchestrator-Status-Treue automatisch durch `push.pushed` in `opusTaskOrchestrator.ts:323`).
- `evidence`: S30-Befund (2026-04-17) mit Task feat-mo38m9f0-jyy1 dokumentiert in docs/S31-CANDIDATES.md. F9-Session-Protokoll in docs/HANDOFF-S35-F9.md. Live-Akzeptanztest 2026-04-20 nachmittags mit taskId `f5d6ac23-aac2-48bc-89ac-5e69d86ff445`: search/replace mit nicht-existentem Anchor `UNIQUE_MARKER_THAT_DOES_NOT_EXIST_F9_ACCEPTANCE_TEST` fuehrte zu Workflow-Callback `reason:"empty_staged_diff"`, Task-Status `review_needed`, kein Commit auf main. Kommit-Kette: `1065cd3` (Code Schritt A+D, Bridge-Push), `bf22892` (Workflow Schritt C, Copilot-Push wegen workflows-Scope).

### Kandidat F10 - Async-Jobs-Persistenz

- `status`: `adopted`
- `truth_class`: `repo_visible`
- `source_type`: `repo_review`
- `next_gate`: `archive`
- `absorbed_into`: `server/src/schema/builder.ts` (neue async_jobs Tabelle), `server/src/routes/health.ts`, `server/src/index.ts` (startup-Aufruf), `docs/F10-ASYNC-JOBS-PERSISTENCE.md`, `docs/HANDOFF-S35-F10.md`
- `why_not_now`: `none`
- `non_scope`: Cleanup-Job fuer alte Jobs, Queue-Logik, Parallelisierungs-Gate
- `risk`: geschlossen fuer Haupt-Anwendung — lange Decomposer-Runs ueberleben Container-Restart. Restart-Race beim Update-Pfad als F10-Followup geschlossen.
- `betroffene_bereiche`: `server/src/schema/builder.ts`, `server/src/routes/health.ts`, `server/src/index.ts`
- `kurzurteil`: F7-Pool-State-Pattern auf asyncOpusJobs uebertragen. DB ist Single Source of Truth, in-memory Map ist Read-Cache, fire-and-forget UPSERT auf Status-Wechsel, initializeAsyncJobsCache() laedt letzte 100 Jobs bei Startup, graceful degradation bei DB-Fehler. GET-Handler cache-first mit DB-Fallback. Commit `851f7ba` (Copilot, gestern Abend parallel zur F6-Arbeit), F10-Followup-Fix fuer Update-Pfad-Race nach Restart separat.
- `evidence`: Live-Verify 2026-04-20 abends. Migrate via `POST /api/builder/opus-bridge/migrate` legte Tabelle in Neon an ("Changes applied"). Deploy-Force via `5e63e2d` (health.ts docblock-trigger) loeste Container-Restart aus. Nach Restart: Job `job-mo7g1xba` ueberlebt im opus-job-status (war vor-Restart angelegt), Job `job-mo7gj1ha` nach-Restart-Lifecycle komplett (status: done, result: failed mit F6-reject-reason). Liste aller Jobs zeigt 2 Eintraege sortiert nach createdAt DESC — DB-Fallback-Pfad funktioniert, Cache-Load beim Startup funktioniert.

### Kandidat G - Provider Truth Sync

- `status`: `active`
- `truth_class`: `repo_visible`
- `source_type`: `repo_review`
- `next_gate`: `proposal`
- `why_not_now`: Der Repo-Brain-Block hat den Drift markiert; ein eigener Sync-Block sollte danach gezielt Docs und ggf. Naming bereinigen.
- `non_scope`: Provider-Neuauswahl oder Modellpolitik neu erfinden
- `risk`: mittel, weil Persona-Routing und Studio-Konfiguration ueber mehrere Dateien verteilt sind
- `betroffene_bereiche`: `server/src/lib/personaRouter.ts`, `server/src/routes/studio.ts`, `CLAUDE.md`, `BRIEFING_PART1.md`
- `kurzurteil`: Docs und Code sollen dieselbe Provider-Wahrheit tragen; aktuell tun sie das nicht.
- `evidence`: Repo-sichtbar ist Gemini heute aktiver Bestandteil mehrerer Routen und Persona-Zuordnungen.

### Kandidat H - Credits Reality Audit

- `status`: `parked`
- `truth_class`: `derived_from_review`
- `source_type`: `repo_review`
- `next_gate`: `scan`
- `why_not_now`: Noch unklar, ob Credits bereits Produktvertrag oder nur internes Meta-Signal sind.
- `non_scope`: Pricing, Bezahlfluss, Auth, Accounts
- `risk`: hoher semantischer Drift, wenn interne Zahlen vorschnell als fertige Monetarisierungslogik gelesen werden
- `betroffene_bereiche`: `server/src/studioPrompt.ts`, `server/src/routes/studio.ts`, Settings-/UI-Bereiche
- `kurzurteil`: Erst klaeren, was Credits heute real bedeuten, bevor darauf Produkt- oder UX-Entscheidungen gebaut werden.
- `evidence`: Credits-Signale tauchen im Servercode auf, ohne sauberen Endnutzervertrag in den Root-Dokumenten.

### Kandidat I - Chatterbox TTS Integration

- `status`: `parked`
- `truth_class`: `proposal_only`
- `source_type`: `prior_chat_context`
- `next_gate`: `user_approval`
- `why_not_now`: Aktuell existiert bereits eine produktive Gemini/OpenAI-TTS-Linie; ein neuer Engine-Import waere Scope-Drift vor dem Stabilitaetsaudit.
- `non_scope`: Ersatz der bestehenden Audio-Linie ohne Vorab-Audit
- `risk`: oeffnet Audio-, Infra- und Qualitaetsscope gleichzeitig
- `betroffene_bereiche`: kuenftige Audio-Linie, derzeit keine repo-sichtbare Implementierung
- `kurzurteil`: Nicht verwerfen, aber klar als spaeteres Proposal fuehren.
- `evidence`: Im aktuellen Repo ist Chatterbox nicht als produktive TTS-Engine sichtbar.

## Abgeschlossene Radar-Eintraege

### Repo Brain Foundation

- `status`: `adopted`
- `truth_class`: `repo_visible`
- `source_type`: `repo_review`
- `next_gate`: `archive`
- `absorbed_into`: `STATE.md`, `FEATURES.md`, `RADAR.md`, `AGENTS.md`
- `kurzurteil`: Soulmatch hat jetzt eine eigene truth-marked Repo-Brain-Schicht statt verstreuter grober Meta-Doku.

### UI Redesign Spec Intake

- `status`: `adopted`
- `truth_class`: `repo_visible`
- `source_type`: `user_spec`
- `next_gate`: `archive`
- `absorbed_into`: `REDESIGN.md`, `STATE.md`, `AGENTS.md`
- `kurzurteil`: Der UI-Umbau ist jetzt nicht mehr nur Chat-Kontext, sondern eine explizite Repo-Spezifikation mit eigener Blockreihenfolge.

## Erkannte Luecken

| Bereich | Luecke | Prioritaet |
|---|---|---|
| Visuelle Checks | Home, Sidebar und Chat sind per Browser-Script geprueft, aber Astro, Match, Souls und Explore noch nicht gleich tief | hoch |
| Voice / Audio | Kein enger, eingecheckter Audit-Rahmen fuer STT + SSE + TTS-Zusammenspiel | mittel |
| Persistenz | Nutzungsgrad von `persona_memories` und `voice_profiles` nicht sauber verdichtet | mittel |
| Sicherheitsgrenzen | `/api/dev/*` hat weiterhin ein eingebautes Passwort-Fallback | mittel |
| Provider-Wahrheit | Code und Root-Doku tragen nicht dieselbe Provider-Realitaet | mittel |

## Aufnahme-Regeln fuer neue Radar-Eintraege

Ein neuer Eintrag soll mindestens enthalten:

- Titel
- Status
- `truth_class`
- `next_gate`
- `why_not_now`
- `non_scope`
- `risk`
- betroffene Bereiche
- 1-Satz-Kurzurteil
- knappe Evidenz oder Quelle

## Adoption-Regeln

Ein Radar-Eintrag darf nur dann auf `adopted` wechseln, wenn mindestens eines klar belegt ist:

- reale Repo-Aenderung vorhanden
- `STATE.md` fuehrt den Block als abgeschlossene Arbeitswahrheit
- die geaenderten Dateien oder die neue Doku-Verankerung sind benennbar

Ein Eintrag darf nicht stillschweigend von `parked` oder `active` nach `adopted`
wandern.

## Nicht-Ziele

`RADAR.md` ist nicht dafuer da,

- komplette Architekturwahrheit zu ersetzen
- Proposal-Material als gebaut darzustellen
- jede interessante Idee in aktive Arbeit zu verwandeln
- den gesamten Dirty Tree zu inventarisieren

## Naechste sinnvolle Pflege

- Nach dem naechsten UI-, Audio-, Provider- oder Persistenzblock Status und Gate sauber nachziehen.
- Externe Vorschlaege nur dann uebernehmen, wenn sie als enger Soulmatch-Block formulierbar bleiben.
- Geparkte Ideen regelmaessig auf echten Soulmatch-Fit pruefen statt sie unmarkiert mitzuschleppen.
