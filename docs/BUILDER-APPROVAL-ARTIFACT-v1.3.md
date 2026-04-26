# BUILDER-APPROVAL-ARTIFACT v1.3

## 1. Ziel

approvalId wird von einem freien String zu einem pruefbaren Freigabe-Artefakt.

In v1.3 gilt fuer class_2 live push:

- approvalId vorhanden
- approval artifact existiert
- artifact_type = approval_ticket
- verdict = approved
- instruction_fingerprint passt
- scope_fingerprint passt
- approval nicht abgelaufen
- approval nicht verbraucht

dryRun bleibt moeglich, aber mit sichtbarer Warnung bei fehlendem oder ungueltigem Approval.

## 2. Nicht-Ziele

- keine neue Tabelle
- kein UI-Feature
- kein /build-Umbau
- kein Provider- oder Memory-Umbau
- keine Aenderung an studio.ts
- kein Eingriff in Deploy-Pipeline

## 3. Warum builder_artifacts statt builder_reviews/actions/neue Tabelle

Option B ist Favorit, weil Approval ein verifizierbares Artefakt ist, nicht nur Kommentar oder Event.

- builder_reviews: gut fuer Review-Meinungen, aber nicht als robustes, konsumierbares Ticket gedacht
- builder_actions: Event-Log ist heterogen und schwach als stabile Referenz
- neue Tabelle: sauber, aber fuer v1.3 zu breit
- builder_artifacts: bereits vorhanden, JSON-payload-faehig, auditierbar, minimal erweiterbar

## 4. approval_ticket Payload-Schema

Persistierte Felder (schema-neutral, gemappt auf bestehendes Schema):

- artifactType oder artifact_type = approval_ticket
- lane = review (oder policy)
- payload-Feld ist schema-abhaengig benannt (jsonPayload oder json_payload)

Beispiel fuer das Approval-Payload im payload-Feld:

```json
{
  "approval_kind": "operator_gate_v1_3",
  "instruction_fingerprint": "sha256:...",
  "scope_fingerprint": "sha256:...",
  "source_task_id": "uuid",
  "source_run_id": "run-...",
  "issued_by": "external_operator",
  "verdict": "approved",
  "expires_at": "2026-04-27T10:00:00.000Z",
  "consumed_at": null
}
```

Minimal-Pflichtfelder in v1.3:

- approval_kind
- instruction_fingerprint
- scope_fingerprint
- verdict
- expires_at
- consumed_at

## 5. Fingerprint-Regeln fuer instruction und scope

instruction_fingerprint:

- input: instruction nach trim, Zeilenenden auf \n normalisieren, mehrfach-spaces auf single-space reduzieren
- hash: sha256
- format: sha256:<hex>

scope_fingerprint:

- input: scope-liste nach
  - slash-normalisierung (\\ -> /)
  - trim
  - dedupe
  - sort asc
- serialisierung: JSON-array in stabiler Reihenfolge
- hash: sha256
- format: sha256:<hex>

Wenn input.scope leer ist, wird der effektiv aufgeloeste Scope aus der Scope-Phase verwendet.

## 6. Validierungsregeln

Bei approvalId-Pruefung muessen alle Checks gruen sein:

1. artifact mit id = approvalId existiert
2. artifact_type == approval_ticket
3. verdict == approved
4. approval_kind == operator_gate_v1_3
5. instruction_fingerprint matcht aktuelle instruction
6. scope_fingerprint matcht aktuellen/effektiven scope
7. expires_at > now
8. consumed_at == null
9. optional bindung: source_task_id/source_run_id passt, falls im Request gesetzt

Verhalten:

- dryRun=false und Check fail: pushAllowed=false, requiredExternalApproval=true, klarer approvalReason
- dryRun=true und Check fail: run darf weiterlaufen, aber Ergebnis enthaelt warnenden approvalReason

consumed_at Regel in v1.3:

- consumed_at darf bei dryRun niemals gesetzt werden
- consumed_at darf nicht vor erfolgreicher Push-/Dispatch-Annahme gesetzt werden
- bei asyncDispatch darf consumed_at erst nach bestaetigtem landed/verifiedCommit gesetzt werden
- wenn diese Bestaetigung im Pfad nicht sicher vorliegt, wird in v1.3 bewusst nicht auto-consumed; es gilt nur die Reject-Regel fuer bereits gesetztes consumed_at

## 7. Geplanter Code-Scope

- server/src/lib/builderApprovalArtifacts.ts (neu)
  - fingerprint helpers
  - validateApprovalArtifact(...)
- server/src/routes/opusBridge.ts
  - kleine validate-route fuer Preflight
- server/src/lib/opusTaskOrchestrator.ts
  - interne approval-validierung vor Push-Gate
- server/src/lib/builderSafetyPolicy.ts
  - optional input-Feld fuer approvalValid/approvalReason

Nicht im Scope: /build, studio.ts, UI, untracked Artefakte.

## 8. Acceptance Tests

1. class_2 dryRun=false, gueltiges approval_ticket -> push kann erlaubt sein (wenn restliche Gates gruen)
2. class_2 dryRun=false, approvalId fehlt -> push block + requiredExternalApproval=true
3. class_2 dryRun=false, falscher artifact_type -> push block
4. class_2 dryRun=false, fingerprint mismatch -> push block
5. class_2 dryRun=false, expires_at in Vergangenheit -> push block
6. class_2 dryRun=false, consumed_at != null -> push block
7. class_2 dryRun=true, invalid approval -> run weiter, aber sichtbare Warnung im Ergebnis
8. class_1 ohne approval bleibt unveraendert
9. class_3 protected paths bleibt manual_only/block unveraendert

## 9. Migrationsverzicht

v1.3 fuehrt keine neue Tabelle ein. Speicherung erfolgt ueber bestehende builder_artifacts.

## 10. Offene Risiken

- Fingerprint-Normalisierung muss exakt stabil definiert sein, sonst false mismatches
- Alte approval tickets ohne neue Pflichtfelder koennen nicht validiert werden
- consumed_at-Setzung bei asyncDispatch braucht verifizierten Abschluss (landed/verifiedCommit), sonst droht Approval-Verbrauch ohne echten Live-Land
- Timezone/Clock-Drift kann expires_at-Check beeinflussen
- Wenn scope erst spaet aufgeloest wird, muss derselbe effektive scope fuer die Validierung genutzt werden