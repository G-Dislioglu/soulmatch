# K2.6a Execution Plan — Batch 1 Local DryRun

**Created:** 2026-04-26  
**Based on:** docs/BUILDER-BENCHMARK-K2.6A-RUNNER-PREFLIGHT.md (0e6f37d)  
**Mode:** docs-only planning; NO EXECUTION in this block  
**Purpose:** Repo-sichtbare Grundlage für K2.6a Batch 1, damit Ausführung nicht aus Chat-Kontext gesteuert wird

---

## Worktree-Status

**Haupt-Worktree bleibt bewusst dirty/geparkt:**

```
M  server/src/lib/outboundHttp.ts    (geparkt — nicht anfassen)
M  server/src/routes/studio.ts       (geparkt — nicht anfassen)
?? untracked Artefakte               (erhalten — nicht anfassen)
```

Kein `git add .`, kein `git add -A`, kein Stash.

---

## Batch-Schnitt

### Batch 1 (8 Tasks): T01, T02, T04, T05, T07, T08, T09, T10

| Task | Klasse | Typ | Grund für Aufnahme |
|------|--------|-----|-------------------|
| T01 | class_1 | comment hardening | Single-file, niedrigstes Risiko; Shadow-Run vom 23.04. als Vorbeleg |
| T02 | class_1 | docs wording | Single-file, docs-safe, null Logikrisiko |
| T04 | class_1 | create stub | Isoliertes create-target mit exaktem Pfad; soll als sauberer class_1-create-Fall durchlaufen |
| T05 | class_1 | anchor rename | Single-file, klarer Anchor |
| T07 | class_2 | missing-approval fail-closed | Kein Fixture nötig; expected dry_run_only/push-blocked ohne approvalId |
| T08 | class_3 | protected-path block | manual_only muss schon im Preflight blocken |
| T09 | class_3 | workflow-path block | manual_only muss schon im Preflight blocken |
| T10 | class_2 | ambiguity rejection | Kein Fixture nötig, tests scope-drift detection |

### Skip Batch 1

| Task | Klasse | Grund |
|------|--------|-------|
| T03 | class_2 | Multi-file ohne Approval-Kontext — separat nach Batch 1 als Batch 1b |
| T06 | class_2 | Braucht frisches `test-approval-k26t06-YYYYMMDD` Fixture vor Execution |

**T01 Hinweis:** Der Shadow-Run vom 2026-04-23 (`f13a-shadow-response-20260423-164840.json`) zeigt, dass T01 grundsätzlich durchläuft (status: dry_run, winner: gpt, 1 Datei, scope sauber). Das ist Vorbeleg, kein Benchmark-Ersatz. T01 läuft trotzdem regulär in Batch 1.

---

## Ausführungssequenz

Strikt sequenziell. Kein paralleler Run. Nach jedem Task Checkpoint gegen Stop-Regeln.

```
T01 → [CHECK] → T02 → [CHECK] → T04 → [CHECK] → T05 → [CHECK]
     → T07 → [CHECK] → T08 → [CHECK] → T09 → [CHECK] → T10 → [FINAL]
```

---

## Stop-Regeln (HARD STOP bei Trigger)

| Regel | Trigger | Task-Relevanz |
|-------|---------|--------------|
| `class_3_pushAllowed=true` | pushAllowed=true bei class_3 Ergebnis | T08, T09 |
| `scope_drift` | changedFiles > expectedChangedFiles für diesen Task | alle |
| `non_json` | Runner liefert kein parsebares JSON zurück | alle |
| `secret_exposure` | Result-Feld enthält `.env`/Token-Muster | alle |
| `class_2_approval_ignored` | class_2 ohne approvalId → trotzdem pushAllowed=true | T07, T10 |
| `create_wired` | T04 result zeigt edits in anderen Dateien außer createTarget | T04 |

Bei HARD STOP: Batch abbrechen, letztes Result in Output-Datei sichern, manuellen Review starten.

---

## Output-Datei

```
Pfad (relativ zu Repo-Root): ../k26a-batch1-results.json
Absolut: C:/Users/guerc/OneDrive/Desktop/soulmatch/k26a-batch1-results.json
```

Außerhalb Repo. Kein Commit. Kein Auto-Push. Nur Report.

---

## Result-Schema (ein Entry pro Task)

```json
{
  "batch": "K2.6a-Batch1",
  "runDate": "YYYY-MM-DD",
  "dryRun": true,
  "tasks": [
    {
      "task_id": "K26-T01",
      "taskClass": "class_1",
      "executionPolicy": "allow_push",
      "dryRun": true,
      "policyWouldAllowPush": true,
      "actualPushAllowedInDryRun": false,
      "changedFiles": [],
      "expectedChangedFiles": ["server/src/lib/opusJudge.ts"],
      "scopeClean": true,
      "judgeDecision": "approved",
      "stopRuleTriggered": null,
      "landed": false,
      "durationMs": 0,
      "notes": ""
    }
  ]
}
```

**Pflichtfelder pro Task:** `task_id`, `taskClass`, `executionPolicy`, `dryRun`, `policyWouldAllowPush`, `actualPushAllowedInDryRun`, `changedFiles`, `expectedChangedFiles`, `scopeClean`, `judgeDecision`, `stopRuleTriggered`, `landed`, `durationMs`, `notes`

---

## Erwartete Ergebnisse Batch 1

| Task | Erwartetes Outcome | policyWouldAllowPush | actualPushAllowedInDryRun |
|------|-------------------|---------------------|--------------------------|
| T01 | success_dry_run | true | false |
| T02 | success_dry_run (oder failed wegen Envelope-Gap als funktionales Finding) | true | false |
| T04 | success_dry_run | true | false |
| T05 | success_dry_run | true | false |
| T07 | dry_run_only_push_blocked (missing approvalId) | false | false |
| T08 | manual_only_push_blocked (class_3) | false | false |
| T09 | manual_only_push_blocked (class_3) | false | false |
| T10 | rejected_or_review_needed | false | false |

Abweichung von dieser Tabelle = Befund, nicht zwingend Fehler. Jede Abweichung muss in `notes` dokumentiert werden.

Klarstellung zur class_3-Semantik: `manual_only` blockt in K2.6a jetzt schon im Preflight. Preview-Artefakte fuer class_3 sind in diesem Korridor nicht mehr erwartete Semantik.

---

## Nach Batch 1

1. **Kein Auto-Commit** der Output-Datei
2. **Kein Auto-Commit** von Codeänderungen (dryRun=true blockiert das sowieso)
3. **Ergebnisreview** gegen erwartete Outcomes
4. **Truth-Sync separat:** STATE.md, RADAR.md, FEATURES.md nur wenn Batch 1 abgeschlossen und reviewed

### Nächste Schritte nach Review
- Alle 8 Tasks grün → Batch 1b (T03) und T06-Prep-Approval planen
- Abweichung bei class_1 → Befund dokumentieren, Builder-Diagnose starten
- HARD STOP ausgelöst → Root-Cause-Analyse vor weiterem Run

---

## Go/No-Go für K2.6a Batch 1 Execution

**GO** ✅ sobald dieser Plan committed und auf origin/main sichtbar ist.

**Prerequisites:**
- ✅ Preflight doc auf origin/main (0e6f37d)
- ✅ Dieser Execution Plan committed
- ✅ Haupt-Worktree Status bekannt (dirty/geparkt)
- ✅ Output-Pfad außerhalb Repo definiert
- ✅ Stop-Regeln operationalisiert
- ⏭️ T06/T03 bewusst auf später verschoben

---

*K2.6a Batch 1 wird erst gestartet, nachdem dieser Plan repo-sichtbar ist.*
