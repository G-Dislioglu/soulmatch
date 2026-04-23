# F14 Phase 1 - Claim Gate Contract Clarification

Created: 2026-04-23
Status: adopted (implementation live and production runtime-verified on d375304)
Scope: Phase-1 spec with implementation in opusClaimGate.ts and opusTaskOrchestrator.ts

## Zerquetsch-Satz

F14 Phase 1 klaert drei Dinge an der bestehenden Opus-Task-Runtime: ein zweites explizites Scope-Signal im Claim-Gate, den Vertrag zwischen Claim-Gate und Judge, und eine enge Index-Drift-Policy fuer manuelle Scope-Pfade.

## Repo-visible baseline

Die aktuelle Runtime-Wahrheit liegt in diesen Dateien:

- server/src/lib/opusClaimGate.ts
- server/src/lib/opusTaskOrchestrator.ts
- server/src/lib/opusJudge.ts
- server/src/lib/builderScopeResolver.ts
- server/src/lib/opusAnchorPaths.ts

F13-A ist heute so gebaut:

- Das Claim-Gate laeuft nach Validate und vor Judge.
- Das Claim-Gate kennt aktuell nur die strukturelle Claim-Wahrheit anchorStatus = anchored oder no_anchor.
- Gate-Hard-Blocking existiert nur fuer missing_claims und no_anchor, gesteuert ueber F13_GATE_MODE.
- Der Judge bleibt die finale normative Instanz fuer Scope-Disziplin und kann alle Kandidaten ablehnen.
- Fruehe Halluzinations-Rejects fuer manuelle Scope-Pfade passieren heute vor dem Claim-Gate in runScopePhase beziehungsweise builderScopeResolver.

## Korrektur gegen den ersten Entwurf

Der erste F14-Entwurf war in drei Punkten zu offen:

1. Er vermischte Index-Drift mit dem Claim-Gate, obwohl die aktuelle Fruehablehnung davor sitzt.
2. Er deutete eine moegliche Anchor-Staerke-Hierarchie an, obwohl die aktuelle Runtime alle gematchten Pfadtypen gleich behandelt und dafuer noch kein belastbarer Zwang aus den Shadow-Funden vorliegt.
3. Er liess zu viel Spielraum zwischen Gate und Judge, obwohl der aktuelle Code bereits eine klare Zustandsgrenze hat: Gate bewertet Claim-Struktur, Judge bewertet Kandidaten-Zulaessigkeit.

Phase 1 korrigiert genau diese Punkte und fuehrt keine neue Governance-Achse ein.

## Kapitel 1 - Scope-aware claim signal

### Problem

Die Shadow-Hardening-Laeufe haben gezeigt: Ein Claim kann strukturell anchored sein, obwohl der zugehoerige Candidate spaeter wegen Scope-Verletzung vom Judge verworfen wird. Das ist aktuell technisch moeglich und sichtbar plausibel.

### Entscheidung

Phase 1 behaelt anchorStatus unveraendert als strukturelle Aussage bei und fuehrt zusaetzlich ein zweites explizites Claim-Signal ein:

- scopeCompatibility = compatible
- scopeCompatibility = mismatch
- scopeCompatibility = not_evaluated

Semantik:

- anchored + compatible: Der Claim ist strukturell verankert und sein gematchter Pfadbezug ist mit dem erlaubten Scope vereinbar.
- anchored + mismatch: Der Claim ist strukturell verankert, aber der relevante Pfadbezug zeigt auf einen Edit oder Referenzpfad ausserhalb des erlaubten Candidate-Scopes.
- no_anchor + not_evaluated: Es gibt keinen belastbaren Anchor; darum wird auch keine Scope-Kompatibilitaet behauptet.

### Phase-1 guardrail

Scope-Kompatibilitaet ist in Phase 1 nur ein sichtbares Signal. Sie erzeugt noch keinen neuen Gate-Reject-Code und keinen neuen Hard-Blocker.

Wenn ein Claim nur `scope_path` oder `explicit_path` matcht und keinen `edit_path`-Ref hat, gilt `scopeCompatibility = compatible` per Definition. In Phase 1 gibt es dann keinen konkreten Edit-Pfad, an dem eine Scope-Verletzung markiert werden koennte.

### Non-scope

- keine neue Anchor-Staerke-Hierarchie zwischen edit_path, scope_path und explicit_path
- keine semantische Beweispruefung des Claim-Texts
- kein neuer Reject-Code fuer scope_mismatch in Phase 1

## Kapitel 2 - Gate/Judge contract

### Problem

Ohne expliziten Vertrag wirkt der Fall anchored + spaetere Judge-Ablehnung wie ein Widerspruch, obwohl Gate und Judge unterschiedliche Wahrheiten pruefen.

### Entscheidung

Phase 1 schreibt den Vertrag explizit fest:

- Claim-Gate verantwortet strukturelle Claim-Wahrheit.
- Claim-Gate liefert zusaetzlich sichtbare Scope-Kompatibilitaet auf Claim-Ebene.
- Judge verantwortet weiterhin die normative Zulaessigkeit des gesamten Candidates.
- Judge bleibt die einzige Instanz, die Kandidaten wegen Scope-Ueberschreitung final verwirft.

Normativer Satz:

Ein Claim darf in Phase 1 anchored und zugleich scopeCompatibility = mismatch haben. Das ist kein Drift, sondern die beabsichtigte Trennung zwischen strukturellem Claim-Signal und normativer Candidate-Entscheidung.

### Non-scope

- keine neue Planner- oder Auditor-Rolle
- keine Merge-Gate-Phase
- keine Pflicht, dass der Judge Gate-Signale bereits erklaerend zitieren muss

## Kapitel 3 - Index-drift policy for manual scope

### Problem

Unindexierte manuelle Scope-Pfade werden heute frueh verworfen, wenn sie nicht als Create-Fall gelten. Das ist korrekt fuer Halluzinationen, kann aber repo-reale Pfade wegen stale index assumptions verlieren.

### Entscheidung

Phase 1 verortet diese Policy ausdruecklich im Scope-Resolver-Pfad, nicht im Claim-Gate.

Fuer manuelle Scope-Pfade gilt kuenftig diese enge Regel:

1. Erst Index-Pruefung wie heute.
2. Wenn der Pfad unindexiert ist und kein klarer Create-Fall vorliegt, genau ein zusaetzlicher Fresh-Check gegen dieselbe Repo-Wahrheitsquelle, die die Pipeline fuer Dateiwahrheit nutzt.
3. Nur wenn auch dieser Fresh-Check scheitert, bleibt der fruehe Reject als hallucinated path korrekt.

### Guardrail

Es gibt keinen globalen Reindex pro Request und kein stilles Auto-Heilen beliebiger unbekannter Pfade.

### Non-scope

- kein globaler Index-Rebuild pro Run
- keine implizite Freigabe unbekannter Pfade ohne Repo-Truth-Check
- keine Vermischung dieser Policy mit Claim-Evidence-Logik
- kein Reuse des Fresh-Check-Contents zur Vermeidung von Double-Fetch in Phase 1

## Acceptance checks

Phase 1 ist nur dann sauber geschnitten, wenn diese vier Faelle eindeutig klassifizierbar sind:

1. In-scope edit mit echter Pfadreferenz: Claim endet bei anchored + compatible; Judge darf approven.
2. Out-of-scope edit mit echter Pfadreferenz: Claim endet bei anchored + mismatch; Judge darf rejecten.
3. Manueller Scope auf repo-realen, aber unindexierten Pfad: Fruehreject wird durch genau einen Fresh-Check verhindert.
4. Manueller Scope auf nicht existierenden Pfad ohne echten Create-Fall: Fruehreject bleibt bestehen. Nur der Netz- oder Reachability-Fall wird sichtbar als Fresh-Check-Failure markiert; ein echter Nichtfund bleibt ein normaler Halluzinations-Reject.

## Production runtime verification

Die vier Acceptance-Faelle sind inzwischen ueber den echten HTTP-Pfad
`/api/health/opus-task-async` gegen die Production-Instanz auf Basis von
Commit `d375304727421e11be62a43f4fcdf4f26c96c915` geprueft.

1. Case 1, In-Scope: `anchored + compatible`, Judge approvt. Live-Job: `job-mobq28w2`.
2. Case 2, Out-of-Scope: `anchored + mismatch`, Judge rejectet. Der zuerst naheliegende grosse Probeweg ueber `opusTaskOrchestrator.ts` war dafuer zu rauschig; der belastbare Mismatch-Nachweis kam ueber kleinen realen Scope auf `opusBridgeConfig.ts` bei tatsaechlicher Aenderung in `opusBridgeAuth.ts`. Live-Job: `job-mobq72r1`.
3. Case 3, realer unindexierter manueller Scope: kein Fruehreject; stattdessen `(FRESH)` in der Scope-Phase fuer `F14-PHASE1-CLAIM-GATE-SPEC.md`. Live-Job: `job-mobpxh4b`.
4. Case 4, nicht existierender Pfad ohne Create-Signal: sauberer Fruehreject mit `rejectedPaths`. Live-Job: `job-mobpt6rd`.

## Explizit nicht Teil von F14 Phase 1

- missing_claims-Vertiefung
- neuer hard blocker auf Gate-Ebene fuer scope mismatch
- Claim-Evidence-Scoring oder Risk-Class-System
- Planner-Auditor-Governance
- Merge-Gate-Phase
- breiter Resolver-Umbau ausserhalb des manuellen Drift-Pfads

## Naechster Schritt nach Phase 1

Phase 1 ist damit als enger Block abgeschlossen.

1. Double-Fetch-Reuse bleibt ein moeglicher Phase-2-Kandidat, kein Phase-1-Muss.
2. Breitere Opus-Bridge-Runtime-Themen wie `@READ`, BDL-Disziplin oder Distiller-Treue bleiben bewusst ausserhalb dieses Vertragsblocks.