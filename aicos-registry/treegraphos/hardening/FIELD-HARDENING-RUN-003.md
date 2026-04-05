# Field Hardening Run #003 — AICOS Card Migration

**Datum:** 05. April 2026  
**System unter Test:** Crush-Native Federated Tree-Graph OS v0.3  
**Problemtyp:** migration_case  
**Leitfrage:** Funktioniert die AICOS-Migration in der Praxis, oder ist sie nur auf dem Papier sauber?

---

## 1. Ausgangslage

### Was passiert ist

AICOS hat 101+ Karten. Sie haben aktuell: ID, Typ (error/solution/principle/idea/meta), Titel, Beschreibung, Tags, Crossing-Origin-Referenzen. Sie haben **nicht**: canonicality, verification, confidence, scope, freshness, applies_to, evidenced_by.

Die TreeOS v0.3 Spec sagt: "Jede bestehende AICOS-Karte bekommt schrittweise die neuen Achsen." Die Migrationsstrategie sagt: "Nicht alles sofort. Erst Achsen auf 10–15 starke Karten."

Dieser Run testet die Migration an 5 echten AICOS-Karten und prüft, ob das Schema, die Membranen und die Edges dabei funktionieren.

### 5 Testkarten

```
1. err-cross-001: Agent Context Decay
   Typ: error
   Beschreibung: Agents verlieren nach langen Sessions den Kontext und wiederholen Fehler
   Tags: [agent, context, session, error]
   Crossing: err-cross-002

2. err-cross-002: Complexity Ratchet
   Typ: error
   Beschreibung: Jede Agent-Interaktion fügt Komplexität hinzu, nie wird etwas vereinfacht
   Tags: [agent, complexity, drift]
   Crossing: err-cross-001

3. sol-cross-060: Test as Living Documentation
   Typ: solution
   Beschreibung: Tests als lebendige Dokumentation nutzen statt als Nachprüfung
   Tags: [testing, documentation, vitest, playwright]
   Crossing: keine

4. sol-cross-042: PROOF CORE Lite v2
   Typ: solution (agent prompt template)
   Beschreibung: Standard-Prompt für Windsurf/Agent-Arbeit mit Verifikationsschritten
   Tags: [prompt, agent, verification, windsurf]
   Crossing: keine

5. meta-001: Crush Solver Hypothesis
   Typ: idea
   Beschreibung: Crush fügt +25-40pp zu jedem Modell bei ARC-Puzzles hinzu
   Tags: [crush, arc, benchmark, hypothesis]
   Crossing: keine
```

---

## 2. Migration durchführen

### Karte 1: err-cross-001 Agent Context Decay

```yaml
id: aicos.error.agent_context_decay
card_type: error
title: "Agent Context Decay"
summary: "Agents verlieren nach langen Sessions den Kontext und wiederholen Fehler oder erfinden Strukturen neu, die bereits existieren."
canonicality: canonical
verification: field_tested
confidence: 0.88
scope: workflow
freshness: current
applicability: [agent_workflow, long_session, context_management]
applies_to: [ctx.soulmatch.section.agent_workflow]
evidenced_by: []
crossing_refs: [aicos.error.complexity_ratchet]
status: active
```

**Entscheidungen:**
- `canonicality=canonical`: Dieser Fehler ist vielfach beobachtet, robust, und grundlegend für die Agent-Arbeit. Nicht nur `supported`.
- `verification=field_tested`: Direkt aus realer Agent-Arbeit entstanden, nicht nur theoretisch.
- `confidence=0.88`: Hoch, weil reproduzierbar und über mehrere Sessions belegt.
- `scope=workflow`: Betrifft den Arbeitsprozess, nicht Systemarchitektur.
- `applies_to`: Nur Section-Level-Referenz, weil kein einzelnes File betroffen ist, sondern ein Prozessmuster.
- `evidenced_by`: Leer — es existieren noch keine formalen Cases für historische Beobachtungen. Das ist ehrlich.

**Problem erkannt:** `evidenced_by` ist laut Spec ein Pflichtbezug. Aber für historische Karten, die vor dem Case-Layer existierten, gibt es keine Cases. Entweder muss man:
- (a) rückwirkend historische Cases anlegen (aufwändig, künstlich)
- (b) einen Wert `pre_system` oder `historical` als `evidenced_by` erlauben
- (c) `evidenced_by` bei Migration temporär optional machen

**Korrekturbedarf K11:** `evidenced_by` muss für migrierte Karten temporär optional sein, oder es braucht einen expliziten Wert wie `historical_observation` als Platzhalter. Pflichtbezug bei Neukarten beibehalten.

### Karte 2: err-cross-002 Complexity Ratchet

```yaml
id: aicos.error.complexity_ratchet
card_type: error
title: "Complexity Ratchet"
summary: "Agent-Interaktionen fügen systematisch Komplexität hinzu, ohne dass je etwas vereinfacht wird. Das System wächst monoton in Richtung Unhandlichkeit."
canonicality: canonical
verification: field_tested
confidence: 0.85
scope: system_architecture
freshness: current
applicability: [agent_workflow, architecture, refactor_decision]
applies_to: [ctx.soulmatch.section.agent_workflow]
evidenced_by: []
crossing_refs: [aicos.error.agent_context_decay]
status: active
```

**Entscheidungen:**
- `scope=system_architecture` statt `workflow`: Complexity Ratchet betrifft nicht nur den Arbeitsprozess, sondern die Systemstruktur. Jede Agent-Session hinterlässt Architektur-Sediment.
- `crossing_refs=[aicos.error.agent_context_decay]`: Die beiden Fehler verstärken sich gegenseitig. Context Decay → Agent wiederholt Lösungen → Complexity steigt → mehr Context nötig → Context Decay verschärft sich.

**Edge aus Crossing:**

```yaml
id: edge.ratchet-crosses-decay.001
from: aicos.error.complexity_ratchet
to: aicos.error.agent_context_decay
type: crosses_with
verification: human_asserted
confidence: 0.82
reason: "Reinforcing loop: decay causes repetition, repetition causes complexity, complexity causes more decay"
```

**Was funktioniert:** `crosses_with` als Edge-Typ fängt die AICOS-Crossing-Semantik korrekt ein. Besser als die alte flache `crossing_origin` Referenz, weil jetzt `reason` und `confidence` dabei sind.

### Karte 3: sol-cross-060 Test as Living Documentation

```yaml
id: aicos.solution.test_as_living_documentation
card_type: solution
title: "Test as Living Documentation"
summary: "Tests sind nicht Nachprüfung, sondern lebendige Dokumentation. Sie beschreiben erwartetes Verhalten und machen Architekturannahmen explizit. PROVES-Kommentar-Konvention macht Testintention sichtbar."
canonicality: supported
verification: human_asserted
confidence: 0.72
scope: workflow
freshness: current
applicability: [testing, documentation, vitest, playwright]
applies_to: [ctx.maya.section.shared]
evidenced_by: []
crossing_refs: []
status: active
```

**Entscheidungen:**
- `canonicality=supported` statt `canonical`: Die Idee ist gut, aber noch nicht breit genug angewendet. Die Testing-Template wurde installiert, aber die PROVES-Konvention ist noch nicht durchgängig im Einsatz.
- `verification=human_asserted` statt `field_tested`: Die Karte basiert auf einer Design-Entscheidung, nicht auf einem dokumentierten Fehlerfall. Es gibt kein "vorher/nachher" wie bei den Error-Karten.
- `confidence=0.72`: Leicht unter Default für `human_asserted` (0.75), weil die breite Anwendung noch aussteht.

### Karte 4: sol-cross-042 PROOF CORE Lite v2

```yaml
id: aicos.solution.proof_core_lite_v2
card_type: solution
title: "PROOF CORE Lite v2 (Agent Prompt Template)"
summary: "Standard-Prompt für Agent-Arbeit mit Verifikationsschritten: typecheck, build, git-Hygiene, keine auto-pushes, ein Bug pro Chat. Escape Edition für Windsurf."
canonicality: canonical
verification: field_tested
confidence: 0.90
scope: workflow
freshness: current
applicability: [agent_workflow, prompt_engineering, verification]
applies_to: [ctx.soulmatch.section.agent_workflow]
evidenced_by: []
crossing_refs: []
status: active
```

**Entscheidungen:**
- `canonicality=canonical`: Dieses Prompt-Template ist aktiv im Einsatz und hat sich bewährt. Es ist der Standard.
- `confidence=0.90`: Hoch, weil es täglich benutzt wird und die Regeln (pnpm typecheck + build vor Commit, kein git add -A, kein auto-push) nachweislich Fehler verhindern.

### Karte 5: meta-001 Crush Solver Hypothesis

```yaml
id: aicos.idea.crush_solver_hypothesis
card_type: idea
title: "Crush adds +25-40pp to any model's ARC performance"
summary: "Manuelle Crush-Anwendung erzielte 65% auf 20 blinden ARC-Puzzles (60% Runde 1, 70% Runde 2). DeepSeek ohne Crush: 14%. Hypothese: Crush-Methodik verbessert jedes Modell um 25-40 Prozentpunkte bei ARC."
canonicality: speculative
verification: human_asserted
confidence: 0.55
scope: cross_system
freshness: aging
applicability: [crush, benchmark, arc, reasoning]
applies_to: []
evidenced_by: []
crossing_refs: []
status: parked
```

**Entscheidungen:**
- `canonicality=speculative`: Korrekt. 20 Puzzles, manuelles Prompting, keine Kontrollgruppe. Interessant, aber nicht belastbar.
- `freshness=aging`: Die Daten sind von Ende März. Keine neuen Tests seit dem.
- `status=parked`: Der Crush Solver v2 ist geplant aber nicht gebaut. Die Hypothese wartet auf Härtung.
- `applies_to=[]`: Diese Karte bezieht sich nicht auf ein Soulmatch-Artefakt, sondern auf eine Cross-System-Hypothese. Kein Context Node passt. Das ist erlaubt.
- `confidence=0.55`: Genau am `ai_inferred` Default, obwohl es `human_asserted` ist. Absichtlich niedrig, weil die Datenbasis dünn ist. Confidence spiegelt Belegstärke, nicht Ursprung.

**Problem erkannt:** Die Spec sagt `applies_to` ist ein Pflichtbezug. Aber für cross_system-Hypothesen ohne Artefaktbezug gibt es keinen sinnvollen Context Node. Entweder:
- (a) ein Meta-Trunk `cross_system` oder `research` als Context anlegen
- (b) `applies_to` bei `scope=cross_system` optional machen
- (c) einen virtuellen Context Node `ctx.research.crush_methodology` anlegen

**Korrekturbedarf K12:** `applies_to` bei `scope=cross_system` oder `scope=protected_research` optional machen. Oder: Trunk `research` als Meta-Context anlegen.

---

## 3. Migrationsaufwand real gemessen

| Karte | Zeitaufwand | Schwierigste Entscheidung |
|---|---|---|
| err-cross-001 | ~4 min | canonicality: canonical vs supported |
| err-cross-002 | ~4 min | scope: workflow vs system_architecture |
| sol-cross-060 | ~5 min | verification: human_asserted vs field_tested |
| sol-cross-042 | ~3 min | Einfach. Klarer Fall. |
| meta-001 | ~6 min | applies_to: leer lassen oder Meta-Context? |
| **Gesamt** | **~22 min für 5 Karten** | |

**Hochrechnung für 101 Karten:** ~7–8 Stunden. Die Spec schätzte 2–3 Stunden. Das war zu optimistisch — die schwierigsten Entscheidungen (Canonicality, Scope, Verification) brauchen pro Karte echtes Nachdenken, nicht nur Ausfüllen.

**Korrekturbedarf K13:** Migrationsaufwand in der Spec auf 6–10 Stunden korrigieren, nicht 2–3.

---

## 4. Case Record

```yaml
id: case.2026-04-05.aicos-migration-pilot.003
case_type: migration_case
problem: "AICOS cards lack semantic axes needed for TreeOS integration"
problem_type: migration
affected_context: [ctx.aicos.trunk]
created_from_signals: []
based_on_version: aicos-registry-current
operator_path: [ZL, IL, BL, SV]
crossing: null
attack_mode: null
st_profile:
  heat: 0.5
  drain: 0.5
  resonance: 0.6
  entropy_risk: low
  collapse_risk: low
dtt_state:
  working_truth: "Migration ist machbar. Schema passt. Zeitaufwand höher als geschätzt."
  open_truth_debt: "evidenced_by für historische Karten ungeklärt. applies_to für cross_system ungeklärt."
  debt_risk: medium
  revisit_trigger: "before migrating next 20 cards"
mb_state:
  missing_branch_suspected: true
  suspected_type: "migration_tooling"
  reason: "Manual migration of 101 cards is tedious. A migration helper script or checklist would reduce errors and time."
outcome: decision_gain
salvage_depth: SV-2
evidence_strength: field_tested
status: done
promotion_candidate: false
produced_cards: []
created_at: 2026-04-05T17:00:00Z
```

### Bewertung

**Was auffällt:** Dieser Case hat `attack_mode=null`. Die Spec sagt `attack_mode` ist ein Pflichtfeld. Aber Migration ist kein adversarialer Vorgang — es gibt nichts zu "attackieren". Der Operator-Pfad war ZL (Karten einzeln prüfen) → IL (Beziehungen zwischen Achsen lesen) → BL (wo klemmt die Zuordnung?) → SV (was bleibt als Arbeitslösung?). Kein Attack im Crush-Sinn.

**Korrekturbedarf K14:** `attack_mode` sollte `null` oder `not_applicable` als Wert erlauben für Case-Typen, die keinen adversarialen Charakter haben (migration_case, decision_record).

---

## 5. Outcome Reality Check

| Frage | Antwort |
|---|---|
| Ist real etwas besser geworden? | Ja. 5 AICOS-Karten sind jetzt TreeOS-kompatibel mit allen Achsen. |
| Wurde Handlungskraft erzeugt? | Ja. Migrationsaufwand ist kalibriert. 3 Schema-Probleme identifiziert. |
| Ist das Outcome sichtbar? | Ja. 5 fertige Cards, 1 Edge, 3 Korrekturvorschläge. |
| War der Crush-Aufwand proportional? | Ja. ~25 Minuten für den gesamten Run inklusive Dokumentation. |

**ORC-Urteil:** `decision_gain`

---

## 6. Neue Korrekturvorschläge aus Run #003

| Nr | Korrektur | Priorität |
|---|---|---|
| K11 | `evidenced_by` für migrierte Karten temporär optional oder `historical_observation` als Platzhalter | hoch |
| K12 | `applies_to` bei `scope=cross_system` oder `protected_research` optional. Oder: Meta-Trunk `research` | mittel |
| K13 | Migrationsaufwand in Spec korrigieren: 6–10h statt 2–3h | niedrig |
| K14 | `attack_mode` erlaubt `null` oder `not_applicable` für nicht-adversariale Cases | mittel |

---

## 7. Kumulative Operatorpfad-Daten

| Run | Problemtyp | Pfad | Crossing | Outcome | Funktioniert? |
|---|---|---|---|---|---|
| #001 | reuse_decision | ZQ→IL→TE→SV | DL | real_gain | ja |
| #002 | drift_repair | MB→ZQ→TE→SV | (Kandidat) | decision_gain | ja |
| #003 | migration | ZL→IL→BL→SV | — | decision_gain | ja |

3 verschiedene Problemtypen, 3 verschiedene Pfade, alle funktional. Noch zu früh für Operator-Canonicality, aber die Daten wachsen.

---
---

# Kumulative Korrekturliste (Runs #001–003)

| Nr | Korrektur | Quelle | Priorität |
|---|---|---|---|
| K1 | `attack_mode` Enum definieren | Run #001 | hoch |
| K2 | Diff Watcher: Funktionsnamen-/Import-Matching | Run #001 | hoch |
| K3 | Edge-Priorität oder Anzeige-Filter | Run #001 | mittel |
| K4 | `fast_track_canonical` für repo-verifizierbare Solutions prüfen | Run #001 | mittel |
| K5 | Cold-Start-Kommunikation (~10 Cases für vollen Nutzen) | Run #001 | niedrig |
| K6 | Pack-Feldschema (Pflichtfelder, Sortierung, Länge) | Run #001 | mittel |
| K7 | Stale Watcher: Delta-Sensitivität auf referenzierte Artefakte | Run #002 | hoch |
| K8 | Signal Triage Clerk: Cluster-Erkennung als explizite Fähigkeit | Run #002 | mittel |
| K9 | Case darf mehrere Cards erzeugen, Membranprüfung pro Card | Run #002 | mittel |
| K10 | Scope-Zuordnung: Leitfragen/Beispiele in Spec | Run #002 | niedrig |
| K11 | `evidenced_by` für migrierte Karten: temporär optional oder `historical_observation` | Run #003 | hoch |
| K12 | `applies_to` bei `scope=cross_system`: optional oder Meta-Trunk `research` | Run #003 | mittel |
| K13 | Migrationsaufwand korrigieren: 6–10h statt 2–3h | Run #003 | niedrig |
| K14 | `attack_mode` erlaubt `null`/`not_applicable` für nicht-adversariale Cases | Run #003 | mittel |

**Prioritätsverteilung:** 4 hoch, 7 mittel, 3 niedrig.

**Kein einziger Strukturbruch.** Alle 14 Korrekturvorschläge sind Verfeinerungen innerhalb des bestehenden Schemas, keine Abrisse oder Umbauten.

---

*Field Hardening Runs #001–003 abgeschlossen. 3 Problemtypen. 3 Operatorpfade. 14 Korrekturvorschläge. 0 Strukturbrüche. Das System hält. 05. April 2026.*
