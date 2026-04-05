# Crush-Native Federated Tree-Graph OS v0.3.2

**Datum:** 05. April 2026  
**Status:** Proposal-first / repo-taugliche Vollspec  
**Typ:** Gesamtarchitektur für Context Tree, Graph-Relationen, Signal Layer, Case Layer, AICOS Knowledge Layer, Crush Runtime, bounded Clerks, Pulse-Crush und epistemische Kontrollmechanik  
**Feldgehärtet durch:** 3 Runs (#001 Arcana Audio Reuse, #002 Maya UI Drift, #003 AICOS Migration), 0 Strukturbrüche, 14 Korrekturen → 4 Bundles + 6 Ergänzungen → integriert  
**Referenzdokumente (Legacy, read-only):** Crush v4.1, Architecture Graph v1.1

---

## 1. Zweck

Dieses Dokument definiert eine föderierte Betriebsarchitektur für ein lernfähiges, koordinierbares und anti-drift-fähiges Arbeitsbetriebssystem. Es vereinigt:

- **Architecture Graph v1.1**: Trunks, Sections, Edge-Typen, Radar, Compare, DSL, Badge-System, Mutation Policy, AI Views
- **Unified System v1.0**: Cross-Type-Edges, AICOS-Migration, Packs, Operator-Canonicality als spätes Modul
- **Crush v4.1**: Search OS, 12 Operatoren, Crossing-Logik, Core Perception Triad, Branch Protocol, Anti-Patterns, Protected Research mit Promotion Gate
- **Federated TreeOS v0.1**: Föderierter Schnitt, Signal Layer, Case Layer, Pulse-Crush, bounded Clerks
- **v0.3.1 Hardening**: Typed Field Contracts, semantisch wachere Watcher, Pack-Primat, Bootstrap-Ehrlichkeit
- **v0.3.2 Epistemic Control**: Assumption Registry, Mirror-Check, Sprachstärke-Prinzip, Trigger-Priorität, Overclaim-Signal, Resonanz-Guardrail

---

## 2. Nicht-Ziele

1. **Kein One-Graph-Totalismus.** Nicht alles wird auf dieselbe ontologische Stufe gezogen.
2. **Kein Agentenschwarm als Primärlogik.** Kleine Modelle sind bounded Clerks, nicht freie semantische Souveräne.
3. **Keine sofortige Vollautomatisierung.** v0.3.2 ist zuerst ein Betriebs- und Datenrahmen.
4. **Keine stille Kanonisierung.** Weder Clerks noch automatische Regeln dürfen still Principles, Canonicality oder Protected-Research-Aufstiege setzen.
5. **Kein Ersatz aller Vorgänger an Tag 1.** v0.3.2 ist ein Integrationsrahmen.
6. **Kein permanenter Voll-Crush.** Nicht jedes Problem braucht den vollen Zyklus.

---

## 3. Kernprinzipien

### P0 — Proposal-first
Keine Schicht, kein Agent, kein Datentyp und kein Score wird still als produktive Wahrheit behandelt, bevor Drift-Schutz, Schreibrechte, Membranen und reale Fälle mitgedacht sind.

### P1 — Tree als primäre Navigationsform
Menschen und operative Arbeit orientieren sich primär über Kontext, Nähe, Scope, Hierarchie und Arbeitsraum.

### P2 — Graph als primäre Relationsform
Querbeziehungen, Reuse, Drift, Konflikte, Lücken und Cross-Type-Fragen sind primär graphisch. Tree und Graph koexistieren.

### P3 — Signale vor Materialisierung
Nicht jedes Ereignis darf sofort zu Case, Card, Edge oder kanonischem Objekt werden. Signale puffern Suchdruck ohne Ontologieverschmutzung.

### P4 — Cases tragen episodische Wahrheit
Cases verbinden Problem, Kontext, Crush-Pfad, Outcome, Salvage, Truth Debt und Revisit Trigger.

### P5 — Cards sind späte Verdichtung
Knowledge Cards sind verdichtete, geerdete Wissenseinheiten. Robuste Cards müssen auf Cases, Kontext oder wiederkehrende Muster rückführbar sein.

### P6 — Crush ist Methode, nicht Gesamtrealität
Crush steuert Exploration, Verdichtung, Angriff, Salvage und Promotion. Crush ist kein Primärspeicher und keine Default-UI.

### P7 — Determinismus vor Agentik
Alles Zeit-, Version-, TTL-, Lock-, Budget- oder Triggerbasierte wird deterministisch gebaut, bevor LLMs eingreifen.

### P8 — Typed Semantics und Typed Field Contracts
Achsen und Vokabular sind geteilt, ihre Bedeutung bleibt typ-spezifisch. Pflichtfelder sind typ- und situationsbewusst: Nicht jedes Feld ist für jeden Objekt- oder Case-Typ in gleicher Stärke verpflichtend.

### P9 — Bounded Clerks statt Agentenschwarm
Kleine günstige Modelle markieren, verdichten, entwerfen und eskalieren. Sie dürfen nicht still promoten, kanonisieren oder globale Semantik verschieben.

### P10 — Single-Writer-Prinzip
Jede semantisch relevante Schicht hat klar definierte Schreibrechte. Konfligierende Mehrfachschreiber sind zu vermeiden.

### P11 — Inline Crush statt End-Crush
Die wichtigsten Crush-Fragen laufen leicht mit. Voller Crush wird nur bei Unsicherheit, Reibung, Konflikt oder Promotion aktiviert.

### P12 — Wirtschaftlichkeit ist Architektur
Kosten, Tokenfluss, Eventrate und Clerk-Aktivität sind keine Randdetails. Budgetschutz ist Teil der Semantik- und Stabilitätsarchitektur.

### P13 — Reuse First
Vor jedem Neubau muss das System helfen, kanonische Pfade, ähnliche Implementierungen, bewährte Patterns und verbotene Rebuild-Zonen zu finden.

### P14 — Evidence over Decoration
Jeder Score, jede Warnung, jede Ähnlichkeitsbehauptung und jeder Radar-Eintrag braucht Quelle, Begründung und Confidence.

### P15 — Protected Research bleibt geschützt
Spekulative, identitätsnahe, bewusstseinsnahe oder stark offene Forschung bleibt eigener Scope mit Promotion Gate. Kein stilles Leakage.

### P16 — Pack-Primat
Der operative Wert des Systems liegt primär in Packs, nicht in der bloßen Existenz von Cases oder Edges. Cases sind Mittel. Packs sind der primäre Orientierungsoutput.

### P17 — Sprachstärke folgt Evidenzstärke
Assertions ohne starke Evidence brauchen sprachliche Dämpfung. Hohe Formulierungssicherheit bei schwacher Evidenzbasis ist Anti-Pattern.

| Evidenzlage | Erlaubte Sprachstärke |
|---|---|
| `canonical` + `repo_verified/runtime_verified` + conf ≥ 0.90 | Direkte Assertion |
| `supported` + `field_tested` + conf ≥ 0.80 | Moderate Assertion |
| `supported` + `human_asserted` + conf 0.70–0.80 | Gedämpft |
| `speculative` oder conf < 0.70 | Klar spekulativ |
| `ai_inferred` ohne Case-Stützung | Explizit markiert |

Gilt für Pack-Texte, Card-Summaries, AI-Notes, Radar-Empfehlungen. Gilt nicht für menschliche Freitext-Kommunikation, Crush-interne Exploration oder Protected Research.

---

## 4. Gesamtbild

```
┌──────────────────────────────────────────────────────────────┐
│ A — Deterministischer Kern                                   │
│ Events · Versions · Trigger · Locks · TTL · Budget           │
│ Diff/Stale/Drift Watcher · Cluster · Overclaim-Heuristik    │
├──────────────────────────────────────────────────────────────┤
│ B — Context Tree                                             │
│ Trunks · Domains · Workspaces · Modules · Files · Seams      │
├──────────────────────────────────────────────────────────────┤
│ C — Signal Layer                                             │
│ 13 Typen · append-only · TTL · Cluster-fähig                 │
├──────────────────────────────────────────────────────────────┤
│ D — Case Layer                                               │
│ 7 Typen · typ-bewusste Pflichtfelder · assumptions[]         │
├──────────────────────────────────────────────────────────────┤
│ E — Knowledge Layer (AICOS)                                  │
│ 6 Card-Typen · evidence_mode · scope-bewusstes applies_to   │
├──────────────────────────────────────────────────────────────┤
│ F — Edge Layer                                               │
│ 4 Kategorien · edge_priority · recommended_action            │
├──────────────────────────────────────────────────────────────┤
│ G — Crush Runtime                                            │
│ Search OS · Pulse P0/P1/P2 · 12 Operatoren · 6 Crossings    │
├──────────────────────────────────────────────────────────────┤
│ H — Protected Research                                       │
│ Promotion Gate (8 Bedingungen inkl. Mirror) · Consciousness  │
├──────────────────────────────────────────────────────────────┤
│ I — Micro-Agent Fabric                                       │
│ 6 Sensoren · 7 Clerks · Cap 0.65 · event-driven             │
├──────────────────────────────────────────────────────────────┤
│ J — Judge / Escalation                                       │
│ 5 Rollen · Promotion · Conflict · Architecture · Protected   │
├──────────────────────────────────────────────────────────────┤
│ K — Derived Views                                            │
│ Radar 5P · Compare 4T · Packs 4T mit Feldschema · DSL       │
│ Badge System 4 Achsen                                        │
└──────────────────────────────────────────────────────────────┘
```

---

## 5. Tree- und Graph-Rollen

**Tree:** Navigation, UI/UX, Scope, Lokalität, Arbeitsraum. "Wo bin ich?"
**Graph:** Relationen, Cross-Type, Widerspruch, Reuse, Ursache/Wirkung. "Was hängt zusammen?"
**Leitregel:** Tree = Arbeitsform. Graph = Relationsform. Keiner ersetzt den anderen.

---

## 6. Schichten

### Schicht A — Deterministischer Kern

**Zweck:** Stabilität, Zeitlogik, Versionierung, Trigger, Budgets. Keine KI. Aber semantisch wacher als pure Zeitlogik.

**Bauteile:** Event Log, Snapshot/Version Store, Trigger Engine, TTL/Cooldown, Revisit Scheduler, Locking/Single-Writer, Action Budget Registry, Schema Validation

**Watcher und Heuristiken:**

**Diff Watcher v0.3.1:** Funktionsnamen-/Import-Matching, Export-Überschneidung, LOC-Delta, Pfadähnlichkeit, Referenz-Drift. Mindest-Trigger für `duplicate_suspected`: ≥2 von 4 (identischer Funktionsname, identischer Hook-Import, starker Delta auf ähnlichem Pfad, existierende reuse-Nachbarschaft). Phase-1: grep-basiert.

**Stale Watcher v0.3.1:** Delta-sensitiv. `stale_truth_hint` bei: LOC-Änderung >50%, ≥3 neue Sibling-Components aus Split, Export-Struktur stark verändert, referenzierte Funktion verschoben/gelöscht.

**Spec-Anchor Drift Check:** Wenn Spec/Pack konkrete Artefakte referenziert und diese sich stark ändern → `drift_suspected`.

**Deterministische Cluster-Erkennung:** Gleiche `target_refs` + verschiedene `signal_type` + ≤7 Tage = Cluster-Tag. 2 verschiedene Typen = medium, 3+ = high.

**Overclaim-Heuristik:** `overclaim_suspected` wenn: `confidence ≥ 0.75` AND `verification ∈ {ai_inferred, stale}` AND (`risk_context ∈ {hotspot, seam}` OR `scope ≥ workflow`).

---

### Schicht B — Context Tree

**Node-Typen:** `trunk`, `domain`, `workspace`, `module`, `file`, `feature`, `pattern`, `seam`, `spec`, `api`, `infra`, `task`, `artifact`

**Pflichtachsen:** `status`, `canonicality`, `verification`, `confidence`, `roles`, `freshness`

**Optionale:** `risk`, `hotspot`, `do_not_rebuild`, `ai_note`, `commit_last_seen`, `metrics`, `labels`, `summary`, `based_on_version`

**Sections:** CLIENT MODULES, SHARED, SERVER, DATABASE, SPECS & DOCS, AGENT & WORKFLOW, APIs & PROVIDER, FEATURES ACTIVE, ROADMAP, CONNECTIONS

---

### Schicht C — Signal Layer

**13 Signal-Typen:** `drift_suspected`, `case_candidate`, `duplicate_suspected`, `revisit_due`, `promotion_candidate`, `orphan_detected`, `conflict_hint`, `missing_branch_hint`, `entropy_risk`, `collapse_risk`, `stale_truth_hint`, `cost_risk`, `overclaim_suspected`

**Pflichtfelder:** `id`, `signal_type`, `source`, `based_on_version`, `created_at`, `ttl`, `confidence_band`, `reason`, `target_refs`, `risk_context`

**Optionale Cluster-Felder:** `cluster_id`, `cluster_strength`, `cluster_reason`, `member_signals`

**Regeln:** append-only, TTL-basiert, keine Kanonwirkung, keine stille Mutation.

---

### Schicht D — Case Layer

**7 Case-Typen:** `crush_run`, `field_case`, `decision_record`, `repair_case`, `migration_case`, `contradiction_case`, `promotion_review_case`

**Typ-bewusste Pflichtfelder:**

| Feld | crush_run | field/repair | decision | migration | contradiction | promotion_review |
|---|---|---|---|---|---|---|
| problem, problem_type, affected_context, outcome, evidence_strength, status, based_on_version | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| operator_path | ✓ | ✓ | empf. | empf. | ✓ | optional |
| attack_mode | **req.** | **req.** | empf. | opt./n.a. | **req.** | optional |
| st_profile | ✓ | ✓ | empf. | optional | ✓ | optional |
| dtt_state | ✓ | ✓ | ✓ | empf. | ✓ | empf. |
| mb_state | ✓ | ✓ | empf. | optional | ✓ | optional |
| salvage_depth | ✓ | ✓ | empf. | optional | ✓ | optional |
| assumptions | empf. | empf. | empf. | optional | **req.** | **req.** |

`assumptions` zusätzlich pflichtig wenn `attack_mode ∈ {counterexample, contradiction_resolution, spec_vs_code, working_truth_vs_evidence}`.

**`attack_mode` Enum:** `counterexample`, `banal_fix`, `null_probe`, `boundary_test`, `cost_line`, `reuse_vs_rebuild`, `spec_vs_code`, `working_truth_vs_evidence`, `contradiction_resolution`, `not_applicable`

**`assumptions[]` Schema:**

```yaml
assumptions:
  - text: "Creator-specific mic edge cases behave identically to standard chat"
    type: data        # data | definition | constraint | context
    confidence_hint: medium  # low | medium | high
    status: open      # open | verified | rejected
```

Max 7 pro Case. `status=rejected` erzwingen Case-Review. Cards aus Cases mit ≥2 `open`+`low` Assumptions starten maximal `speculative`.

---

### Schicht E — AICOS Knowledge Layer

**6 Card-Typen:** `error`, `solution`, `principle`, `warning`, `idea`, `insight`

**Pflichtachsen:** `canonicality`, `verification`, `confidence`, `scope`, `freshness`, `applicability`

**Canonicality:** `canonical`, `supported`, `speculative`, `legacy`, `deprecated`, `forbidden`, `disproven`

**Pflichtbezüge (typ-bewusst):**

| Feld | Neue Cards | Migrierte Alt-Cards |
|---|---|---|
| `applies_to` | req. (local/workflow/system) / optional (cross_system/protected) | gleich |
| `evidenced_by` | **required** | optional mit `evidence_mode` |

**`evidence_mode`:** `case_backed`, `historical_observation`, `legacy_registry`, `human_memory`, `mixed`

Migrierte Card ohne `evidenced_by` bleibt max `supported`/`speculative`, außer Judge/Human bestätigt `canonical`.

**Meta-Context bei breitem Scope:** `ctx.research.crush_methodology`, `ctx.cross_system.agent_workflow`, `ctx.protected.consciousness_track`

**Scope-Leitfragen:**

| Frage | Scope |
|---|---|
| Betrifft nur eine Datei/Modul? | `local_technical` |
| Betrifft primär wie man arbeitet? | `workflow` |
| Betrifft was man baut / Systemstruktur? | `system_architecture` |
| Gilt über Trunks/Produkte hinweg? | `cross_system` |
| Spekulativ / identitätsnah / bewusstseinsnah? | `protected_research` |

**`promotion_path`:** Optional. `accelerated_review` wenn: repo-nah sichtbar, ≥1 starker Case, ≥1 Reviewer bestätigt.

---

### Schicht F — Edge Layer

**Intra-Context:** `depends_on`, `reuse_candidate`, `canonical_source_for`, `uses`, `cross_trunk_link`, `duplicates`, `derived_from`

**Intra-Knowledge:** `contradicts`, `supersedes`, `refines`, `complements`, `generalizes`, `crosses_with`

**Case↔Case:** `extends`, `reopens`, `contradicts_case`, `supports_case`, `outperformed_by`, `duplicates`

**Cross-Type:**

| Typ | Von → Zu |
|---|---|
| `applies_to` | Card → Context |
| `evidenced_by` | Card → Case |
| `caused_by` | Card (error) → Context |
| `solved_by` | Card → Card/Context |
| `prevents` | Card (principle) → Card (error) |
| `learned_from` | Context → Card |
| `best_approached_via` | Context → Case/Method |
| `produced` | Case → Card |
| `applied_to` | Case → Context |
| `recommended_by` | Card → Case/Method |
| `blocked_by` | Any → Any |
| `reviews` | Case → Card/Context |

**Pflichtfelder:** `id`, `from`, `to`, `type`, `verification`, `confidence`, `reason`, `created_at`, `based_on_version`

**Edge-Priorität:**

| Priorität | Standard-Zuweisung |
|---|---|
| `primary` | solved_by, caused_by, prevents, best_approached_via |
| `secondary` | produced, applied_to, reviews, evidenced_by |
| `background` | duplicates (bis bestätigt), crosses_with |

Pack-Regel: Default-Packs zeigen `primary`, dann optional `secondary`.

**Recommended Action:** `copy_exact`, `adapt_pattern`, `extract_shared_util`, `import_or_extend`, `keep_separate`, `forbid_rebuild`, `respect_server_contract`, `review_required`

**Edge-Regeln:** Keine Edge ohne `reason`. Keine starke Edge (≥0.8) ohne `field_tested`. Clerks dürfen vorschlagen, nicht `canonical_source_for`/`supersedes`/`best_approached_via` final setzen.

---

### Schicht G — Crush Runtime

#### G.1 Search OS
`Erupt → Crush → Attack → Salvage → Contract → Score`. Nicht starr. ST/DTT/MB/NR dürfen vorziehen, Rücksprünge erzwingen oder Kontrakte öffnen.

#### G.2 Pulse-Crush

**P0 Ambient** — immer leicht: ST, DTT, MB. Schreibt: Signale. Nie Cases/Cards.

**P1 Case** — bei realem Problem: Operatorpfad (max 4), Attack, Salvage, ORC, Case speichern, Membranprüfung.

**P2 Heavy** — bei Eskalation: +TE, OM, NS, SD, volle Crossings, Economy/Closure/Portfolio.

#### G.3 Trigger-Pfad

```
Event → Schicht A → Signal → Cluster-Check → Membranprüfung
→ Case Crush → Card/Edge-Vorschlag → Judge/Human → bestätigte Änderung
```

#### G.4 Die 12 Operatoren

**Reduktiv:** ZL (Zerlegen), ZQ (Zerquetschen), SE (Selektion), BL (Blockade)
**Analytisch:** IL (Inter-legere), TE (Testen)
**Generativ:** IV (Invertieren), AN (Analogisieren)
**Meta:** SV (Salvage), OB (Offenlassen), MB (Missing Branch), NR (Negativraum)

Jeder braucht: Zweck, Input, Transformation, Output, Wann verboten, Fehlleistung, Gute/Schlechte Nachfolger.

#### G.5 Die 6 Kreuzungen

| Kürzel | Kreuzung | Name |
|---|---|---|
| DL | ZQ→IL | Durchlichten |
| KS | ZL→SE | Kernschlag |
| EP | ZQ→BL | Engpressen |
| SB | IL→IV | Schattenblick |
| UM | BL→AN | Umleitung |
| FR | SE→TE | Feuerprobe |

Crossing-Kandidat aus Feldtest: MB→ZQ für Drift (Run #002). Noch nicht formalisiert.

Regeln: Max 4 pro Kette. TE am Ende. AN nie nach AN. SV nach TE. Neue bei Anwendung.

#### G.6 CPT als Graph-Radar
ST: Heat/Drain/Resonance. DTT: Working Truth vs Debt. MB: Lücken zwischen Context/Cards/Cases.

#### G.7 Operator-Canonicality
Informativ ab ≥30 Runs. `canonical_for` erst ab ≥50. Nie ohne Problemtyp-Normalisierung.

---

### Schicht H — Protected Research

**Scope:** `protected_research`. Nicht minderwertig — geschützt.

**Regeln S1–S5:** Markiert, kein stiller Produktfakt, Clerks markieren nie promoten, Heavy Crush erlaubt aber Gate, Faszination ≠ Aufstieg.

**Promotion Gate (8 Bedingungen, alle erfüllt):**

1. Nicht-metaphysische Gegenformulierung
2. Scope explizit benannt
3. Evidence ≥ `repeated_local_success`
4. Adversarialer Angriff durchgeführt
5. **Mirror-Check durchgeführt** (max 400 Token, keine neuen Claims, keine Tools, Truth nie erhöhen)
6. Outcome sichtbar
7. Kein stilles Leakage
8. Human Checkpoint

**Mirror-Check Output (strikt):**

```yaml
mirror_check:
  summary: "1 Satz"
  hidden_assumptions: ["max 3"]
  overclaim_flag: none | mild | strong
  overclaim_reason: "1 Satz"
  falsification_test: "1 konkreter Test"
  next_best_check: "1 Prüfschritt"
  confidence_adjustment: up | down | keep
  adjustment_reason: "1 Satz"
```

Bei `overclaim=strong` → Promotion zurückgewiesen oder Judge. Mirror-Output im `promotion_review_case` gespeichert.

**Consciousness Track:** Vollständig aus Crush v4.1. Lebt unter `protected-research/consciousness-track.json`.

---

### Schicht I — Micro-Agent Fabric

**Sensoren (keine LLMs):** Diff Watcher v0.3.1, Stale Watcher v0.3.1, Revisit Timer, Orphan Detector, Version Drift Checker, Lock Enforcer, Cluster Tagger, Overclaim-Heuristik.

**Clerks:**

| Clerk | Output | Darf nicht |
|---|---|---|
| Signal Triage | Relevanz, Cluster-Bewertung, discard/keep/escalate | Kanonisieren |
| Case Draft | Case-Entwurf, Draft-ST/DTT/MB | Principles setzen |
| Card Suggestion | Card-Vorschläge, Dedup | `canonical` setzen |
| Drift Clerk | Konflikt-/Drift-Signale | Konflikte lösen |
| Revisit Clerk | `revisit_due`, Priorisierung | Debt schließen |
| Pack Refresh | Pack-Entwürfe | Graph umstrukturieren |
| Cost/Budget | Budgetwarnungen | Budgets setzen |

**Cap: 0.65.** Max 500 Token/Aktion. Event-driven.

**Kosten:** ~$0.50–2.00/Tag bei ~50 Signalen.

---

### Schicht J — Judge / Escalation

| Rolle | Zuständig für |
|---|---|
| Promotion Judge | Card→Canonical, Principle, accelerated_review |
| Conflict Judge | Widersprüchliche Cards/Truths/Drifts |
| Architecture Judge | Trunk-Umbauten, Tree-Restrukturierung |
| Protected Research Judge | Promotion Gate, Consciousness |
| Method Judge | Operator-Canonicality (ab ≥50 Runs) |

---

### Schicht K — Derived Views

**Radar (5 Panels):** Cold, Risk, Duplication, Drift, Orphan. Pflichtfelder: `score`, `reason`, `source`, `confidence`, `last_updated`, `recommended_action`.

**Compare:** Structure, Knowledge, Process, Cross-Type. Output: `overlap_score`, `divergence_zones`, `extraction_potential`, `recommended_action`, `confidence`, `evidence`.

**Pack-Schemata:**

| Pack | Max | Pflichtfelder |
|---|---|---|
| Start Pack | ~40 Zeilen | target_scope, canonical_entries, hotspots, reuse_candidates, forbidden_zones, top_cards, recent_cases, recommended_actions, generated_from_version |
| Task Pack | ~60 Zeilen | task_target, entry_order, related_context, relevant_cards, similar_cases, guardrails, recommended_actions, open_truth_debt, generated_from_version |
| Knowledge Pack | ~30 Einträge | problem_or_context, errors, solutions, principles, warnings, ideas_or_insights, supporting_cases |
| Case Pack | ~20 Einträge | problem_type, similar_cases, operator_paths, outcomes, typical_misfires, candidate_reuse |

Sortierung: relevance → confidence → freshness.

**Badge-System:** Lifecycle (seed/active/blocked/done/parked/archived), Authority (canonical/.../disproven), Role (entry/hotspot/.../task_target), Truth (repo/.../conflict). MAP: 1+1+max 1. FOCUS: alle. AI: Textmarker.

---

## 7. Achsen mit Typed Semantics

| Typ | Status | Canonicality | Verification | Confidence | Freshness |
|---|---|---|---|---|---|
| Context Node | Arbeitszustand | stark relevant | repo/runtime | hoch bei Code | wichtig |
| Signal | TTL-gebunden | nicht relevant | Quellenherkunft | Band | sehr wichtig |
| Case | episodisch | meist supported/speculative | field_tested | mittelhoch | wichtig |
| Card | reifungsfähig | zentral | field/human/ai | stark, evidenzgebunden | zentral |
| Edge | selten Statusobjekt | nur indirekt | erklärungspflichtig | begrenzt | indirekt |
| Pack | abgeleitet | nicht kanonisch | basiert auf Inputs | abgeleitet | sehr wichtig |

Confidence-Caps: Clerk 0.65, `stale` max 0.40. Cases sind fast nie primäre Kanonquellen. `status` ≠ `freshness`.

---

## 8. Membranregeln

### Signal → Case
**M1 Wiederholung:** ≥2 Signale auf gleiche Targets ≤7 Tage.
**M2 Hotspot:** conf=high + risk=hotspot/seam.
**M3 Truth-Debt:** revisit/stale auf Working Truth mit aktivem Debt.
**M4 Contradiction-Escalation:** ≥2 conflict_hints conf≥medium → Judge.
**M5 Human-Forcing:** Erzwungen, markiert als `forced`.

### Case → Card
Outcome ≥ decision_gain, nicht rein sprachlich, Kontext benannt, Dedup negativ, plus Zusatzbedingung. **Pro Card eigene Membranprüfung.**

| Card-Typ | Schwelle |
|---|---|
| `idea` | Niedrig. Spekulativ erlaubt. |
| `insight` | Mittel. Mindestens 1 Fallbezug. |
| `error`/`solution`/`warning` | Hoch. Fall-/Kontextbindung. applies_to + evidenced_by. |
| `principle` | Sehr hoch. ≥3 Cases, Scope ≥ workflow, Gegenprüfung, Judge/Human. |

### Card → Canonical
≥5 Cases oder ≥2 cross_context. Adversarialer Angriff + Mirror-Check. Kein offener conflict. Judge/Human.

---

## 9. Schreibrechte

**Schicht A:** Events, TTL, Locks, Timer, regelbasierte Signale, Cluster-Tags, Overclaim-Signale.
**Sensoren:** Nur Signale.
**Clerks:** Signal-Bewertung, Case-Entwürfe, Card-Vorschläge, Pack-Entwürfe, Edge-Vorschläge (max 0.65).
**Crush:** Ambient→Signale, Case→Cases+Edge-Vorschläge, Heavy→Cases+Promotion-Vorschläge+Judge.
**Judge/Human:** Canonicality, Principles, Protected Research, Operator-Canonicality, globale Regeln, kanonische Edges, Tree-Umbau.

**Verboten:** Auto-`canonical`, Auto-Protected-Promotion, Auto-Löschung, Clerk>0.65, Cards aus `no_real_gain`.

---

## 10. Trigger

### 10.1 Deterministische Trigger
Datei/Spec geändert (Delta>Schwelle) → `drift_suspected`. Funktions-/Import-Overlap → `duplicate_suspected`. Confidence≥0.75 + weak verification + high scope → `overclaim_suspected`. Card >90 Tage → `stale_truth_hint`. Context ohne Cases → `orphan_detected`. Signal-Cluster erkannt → Cluster-Tag.

### 10.2 Semantische Trigger (Clerk-erzeugt)
Drift nach Prüfung → `drift_suspected` (erhöht). Mehrfach ähnlich → `case_candidate`. Widersprüchliche Cards → `conflict_hint`. Hoher Debt → `revisit_due`. MB-Hinweis → `missing_branch_hint`. Kosten steigen → `cost_risk`.

### 10.3 Eskalationstrigger
≥2 conflict_hints conf≥medium → Judge. Protected-Research-Nähe → Protected Judge. Case→Principle → Promotion Judge. Heavy-Crush trivial → Budget Review.

### 10.4 Stabilitätsregeln
**Hysterese:** Signal <24h nach Löschung erneut → braucht conf≥medium.
**Cooldown:** Nach Judge 72h keine Eskalation ohne neue Evidenz.
**Oscillation Guard:** ≥3 Zyklen → `contradiction_case`.

### 10.5 Trigger-Prioritäten

Wenn mehrere Trigger gleichzeitig aktiv:

| Priorität | Bedingung | Aktion |
|---|---|---|
| 1 | `stale_truth_hint` + risk hotspot/seam | Verify/Refresh |
| 2 | `overclaim_suspected` oder `conflict_hint` conf≥medium | Mirror oder Sprachdämpfung |
| 3 | ≥2 `conflict_hint` auf überlappende Targets | Case-Eskalation oder Judge |
| 4 | Stagnation (≥3 Zyklen oder ≥2 identische Signals ohne Fortschritt) | Exit: Verify oder Stop |
| 5 | `cost_risk` oder Budget-Überschreitung | Stop oder Scope-Reduktion |

**Regel:** Ein Trigger-Durchlauf, eine Aktion. Bei Gleichrang: höhere confidence gewinnt, dann älterer Trigger.

---

## 11. Wirtschaftlichkeit

| Stufe | Betrifft | Kosten |
|---|---|---|
| B0 | Deterministisch | 0 |
| B1 | Nano-Clerks | ~$0.50–2.00/Tag |
| B2 | Medium Judge | Situativ |
| B3 | Human/Heavy | Situativ |

Clerk max 500 Token. Event-driven. `cost_risk` bei Überschreitung. Mirror-Check: ~$0.01–0.05/Woche.

---

## 12. DSL

```
@graph version=0.3.2

@node ctx.soulmatch.file.discussion_chat
  kind=file status=done canon=canonical verify=repo_verified
  conf=0.97 freshness=current role=entry,pattern,seam
  do_not_rebuild=true

@signal sig.2026-04-05.001
  type=drift_suspected source=stale_watcher_v031
  version=git:abc123 ttl=P7D conf_band=medium
  target=[ctx.maya.module.chat_screen] risk_context=hotspot

@case case.2026-04-05.reuse.audio.01
  type=crush_run problem_type=reuse_decision
  path=ZQ→IL→TE→SV crossing=DL attack=reuse_vs_rebuild
  outcome=real_gain salvage=SV-2 verify=field_tested conf=0.82
  assumptions=[{text:"Mic edge cases identical",type:data,conf:medium,status:open}]

@card aicos.principle.reuse_first
  type=principle canon=canonical verify=field_tested conf=0.92
  scope=system_architecture freshness=current
  applies_to=[ctx.soulmatch.file.discussion_chat]
  evidenced_by=[case.2026-04-05.reuse.audio.01]

@edge edge.reuse.001
  from=ctx.arcana.module.creator_chat to=ctx.soulmatch.file.discussion_chat
  type=reuse_candidate verify=human_asserted conf=0.88
  strength=0.91 action=copy_exact priority=primary

@rule no_new_audio_mic
  scope=soulmatch mode=forbid_rebuild target=audio_mic
  reason="Use M08 pattern first"
```

IDs: lowercase + Punkte/Bindestriche. Keine impliziten Defaults. Jede Edge braucht `type`. `forbidden` nie ohne `reason`.

---

## 13. File Layout

```
aicos-registry/
  treegraphos/
    TREEGRAPHOS-SPEC-v0.3.2.md        ← dieses Dokument
    hardening/
      FIELD-HARDENING-RUN-001.md
      FIELD-HARDENING-RUN-002.md
      FIELD-HARDENING-RUN-003.md
    legacy/
      unified-crush-v4.1.md
      architecture-graph-spec-v1.1.md
    runtime/
      graph.meta.json
      context/
        trunks/
          soulmatch.json
          maya-core.json
          aicos.json
          bluepilot.json
      signals/
        active.jsonl
        expired/
          2026-04.jsonl
      cases/
        crush-runs.json
        field-cases.json
        decisions.json
        promotion-reviews.json
      knowledge/
        errors.json
        solutions.json
        principles.json
        warnings.json
        ideas.json
        insights.json
      edges/
        intra-context.json
        intra-knowledge.json
        case-case.json
        cross-type.json
      events/
        2026-04.jsonl
      derived/
        human/
          map.json
          radar.json
          compare.json
        ai/
          start-packs/
          task-packs/
          knowledge-packs/
          case-packs/
          dsl/
          json/
      protected-research/
        consciousness-track.json
        promotion-log.jsonl
```

---

## 14. AICOS-Migration

101+ Karten → Knowledge Layer. Pro Karte: `canonicality`, `verification`, `confidence`, `scope`, `freshness`, `applicability`, `applies_to`, `evidenced_by` (oder `evidence_mode`). Crossing → `crosses_with`/`refines`/`complements`/`contradicts`/`generalizes`/`supersedes`. Erst 10–15, dann iterativ. **Realistischer Aufwand: 6–10 Stunden.**

---

## 15. Bootstrap-Ehrlichkeit

| Fallbasis | Aussage |
|---|---|
| 0–3 Cases | Testbar, Packs dünn |
| 4–9 | Erste Orientierung |
| ~10 | Packs erzeugen Präventionswert |
| ≥25 | Radar/Compare tragfähig |
| ≥50 | Methodenprofile interpretierbar |

---

## 16. Guardrails

| Nr | Guardrail |
|---|---|
| G1 | Kein One-Graph-Zwang |
| G2 | Keine frühe Vollmaterialisierung (Membranen Pflicht) |
| G3 | Kein Clerk-Kanon (Cap 0.65) |
| G4 | Kein Protected-Track-Leakage |
| G5 | Kein Crush-Theater |
| G6 | Kein Confidence-Fetisch |
| G7 | Keine Mehrfachschreiber ohne Membran |
| G8 | Kein Dauergeplapper (event-driven) |
| G9 | Revisit-Pflicht |
| G10 | Outcome vor Eleganz |
| G11 | Reuse vor Neubau |
| G12 | Keine Operator-Canonicality ohne Datenbasis |
| G13 | Keine Automation ohne semantischen Ertrag |
| G14 | Pack-Primat |
| G15 | Keine harte Sprache bei weicher Evidenz |
| G16 | Keine Wahrheitserhöhung durch Resonanz |

---

## 17. Anti-Patterns

| Anti-Pattern | Kern |
|---|---|
| Phasenfalsche Kritik | Endprüfung auf Rohmaterial |
| Bewertungsreflex | Rating vor Suchraum |
| Formalisieren vor Exploration | Dokumente als Start |
| TE am Anfang | Ideen kaputtprüfen |
| Oversearch | Komplexität ohne Outcome |
| Language-only-Risk | Sprache schöner, Resultate gleich |
| Suchverbrennung | Heat + Drain + Entropy |
| Umbenennungs-Konservativismus | Umbenennen als Fortschritt |
| Operatoren ohne Vertrag | Name ohne Plan |
| Volle Matrix sofort | Explosion ohne Evidenz |
| Bürokratie als Denkersatz | Pflichtfelder statt Gedanken |
| Truth Debt Accumulation | Schulden still verschwinden |
| System ohne Treiber | Kein Ehrgeiz |
| Cross-Type-Kanten erfinden | Unbelegte Edges |
| Agentenschwarm statt Klarheit | Agents ohne Membranen |
| Semantische Oszillation | Schleife ohne Fortschritt |
| Protected-Track-Leakage | Spekulation still in Wahrheit |
| Automation without semantic yield | Aufwand ohne Ertrag |
| Tool vor Inhalt | UI vor 50 Nodes |
| Confidence-Inflation | 0.85+ ohne Basis |
| Confidence-Sprache-Mismatch | Starke Formulierung bei schwacher Evidenz |
| Resonanz-Truth-Uplift | Viele Verbindungen ≠ wahr |

---

## 18. Acceptance Criteria

1. Tree/Graph-Rolle getrennt
2. Signal Layer mit TTL + Cluster
3. ≥1 Membranregel implementiert
4. Cases mit typ-bewussten Pflichtfeldern
5. `attack_mode` typisiert
6. Cards mit `applies_to` + `evidenced_by`/`evidence_mode`
7. Cross-Type-Edges mit `edge_priority`
8. Pack-Schemata mit Pflichtfeldern + Limits
9. Clerk-Cap 0.65
10. Promotion Gate mit 8 Bedingungen inkl. Mirror
11. Diff Watcher mit semantischer Heuristik
12. Stale Watcher delta-sensitiv
13. Mutation Policy dokumentiert
14. AICOS-Migration adressiert
15. Bootstrap-Schwellen dokumentiert
16. Budget-Stufen B0–B3
17. Scope-Leitfragen vorhanden
18. DSL deckt Context/Signal/Case/Card/Edge/Rule
19. `assumptions[]` spezifiziert mit Pflichtregeln
20. Mirror-Check als Promotion-Gate-Schritt
21. Trigger-Prioritätstabelle definiert
22. `overclaim_suspected` mit deterministischer Heuristik

---

## 19. Einführungsreihenfolge

**Phase 1 (Wo. 1–2):** Context Tree Soulmatch, Signal Queue, Case Schema, AICOS-Achsen auf 10–15 Karten, Start/Task Pack, Ambient Crush, Diff Watcher (grep), 1 DSL-Datei.

**Phase 2 (Wo. 3–4):** Signal Triage + Case Draft + Revisit Clerk, M1–M5 aktiv, Cluster-Erkennung, Kostenmonitoring, erste Cross-Type Edges.

**Phase 3 (Wo. 5–6):** Card Suggestion + Drift Clerk, Promotion Pipeline, Drift/Orphan Radar, Compare, Knowledge/Case Pack.

**Phase 4 (Wo. 7–8):** Principle-Gate + Mirror-Check, Protected-Research-Gate, Cold/Risk/Duplication Radar, Cost Clerk, Overclaim-Heuristik, Graph View.

**Phase 5 (Wo. 9+):** Heavy Crush, Operator-Profile, Heatmaps ab ≥30 Cases, AICOS-Migration abschließen, Stale Watcher voll, Trigger-Prioritäten aktiv.

---

## 20. Verdichtung

**Crush-Native Federated Tree-Graph OS v0.3.2** ist eine föderierte kognitive Betriebsarchitektur, in der der Tree den Arbeitsraum bildet, der Graph die Querrelationen trägt, 13 Signal-Typen Suchdruck und Overclaim-Verdacht puffern, Cases mit Assumptions und typ-bewussten Feldern episodische Wahrheit binden, AICOS-Cards spät verdichtetes Wissen halten, Crush als Pulse-Methode inline mitdenkt, ein Mirror-Check vor jeder Promotion Overclaiming abfängt, Sprachstärke der Evidenzstärke folgt, semantisch geweckte Watcher Drift und Duplikation deterministisch erkennen, eine Trigger-Prioritätstabelle Koordinationskollisionen verhindert, bounded Clerks unter Confidence-Cap arbeiten, Judges über Promotion und geschützte Forschung wachen, Resonanz nie Wahrheit erhöht, und Packs als primärer Orientierungsoutput mit Feldschemata Mensch und KI dienen — gesteuert von einem Menschen, der den Hunger mitbringt, den keine Maschine von sich aus hat.

---

*v0.3.2. Feldgehärtet. Integriert. 18 Prinzipien. 16 Guardrails. 22 Anti-Patterns. 22 Acceptance Criteria. 13 Signal-Typen. 8 Promotion-Bedingungen. 11 Schichten. 1 Mensch treibt. 05. April 2026.*
