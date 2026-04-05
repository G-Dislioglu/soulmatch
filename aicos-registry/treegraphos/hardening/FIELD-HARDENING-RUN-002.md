# Field Hardening Run #002 — Maya UI Drift

**Datum:** 05. April 2026  
**System unter Test:** Crush-Native Federated Tree-Graph OS v0.3  
**Problemtyp:** drift_repair  
**Leitfrage:** Wo war das TreeOS zu schwer, zu weich, zu blind oder zu elegant ohne Realitätsgewinn?

---

## 1. Ausgangslage

### Was passiert ist

Maya Core hatte eine vollständige UI-Redesign-Session (Ende März 2026). 6 Blocks wurden via Copilot Agent umgebaut: Design System Tokens, Layout, Maya Core Audit, Startseite M00, Chat-Tab mit PersonaSettingsPanel/MayaOverlay/GearDropdown/LiveTalkBanner, restliche Tabs. Deployed bei buildSha `aacc932`.

Danach wurden in einer separaten K7-Session 8 Komponenten aus dem God Component `maya-chat-screen.tsx` (~900 Zeilen, 30+ useState Hooks) extrahiert: MayaMessageFeed, MayaThreadDigest, MayaCheckpointBoard, MayaThreadContinuity, MayaContinuityBriefing, MayaHydrationSkeleton, MayaWorkspaceContext, MayaActiveWorkrunPanel.

Das Drift-Problem: Nach der K7-Extraktion stimmten die Architektur-Annahmen aus dem UI-Redesign nicht mehr. Die Redesign-Session ging von einem monolithischen `maya-chat-screen.tsx` aus. Die K7-Session hat es in 8 Teile zerlegt. Aber die UI-Spec, die Designentscheidungen und die Agent-Prompts referenzierten weiterhin die alte Struktur.

### Betroffene Artefakte

```yaml
ctx.maya.file.maya_chat_screen:
  path: components/maya-chat-screen.tsx
  status: active
  canonicality: canonical
  verification: repo_verified
  roles: [entry, hotspot, seam]
  note: "Post-K7: significantly smaller, 8 components extracted"

ctx.maya.module.k7_components:
  path: components/maya/
  status: done
  canonicality: canonical
  verification: repo_verified
  roles: [pattern]
  note: "8 extracted components from K7 session"

ctx.maya.spec.ui_redesign:
  path: docs/maya-ui-redesign-v4.3.md
  status: done
  canonicality: supported
  verification: human_asserted
  roles: [spec]
  note: "Pre-K7 spec. References monolithic chat screen."
```

---

## 2. Schicht A — Deterministischer Kern

### Was hätte feuern sollen

Ein **Version Drift Checker** hätte erkannt:
- `maya-chat-screen.tsx` ist seit K7 drastisch kleiner (von ~900 auf ~300 Zeilen)
- 8 neue Dateien in `components/maya/` existieren
- `docs/maya-ui-redesign-v4.3.md` referenziert noch den alten Zustand

Ein **Stale Watcher** hätte erkannt:
- Die UI-Redesign-Spec ist seit der K7-Session nicht mehr aktualisiert worden

### Was tatsächlich passiert ist

Kein automatischer Watcher. Das Drift-Problem wurde bei der Matrix-Crush Bewertung erkannt, als drei UX-Issues auffielen: 20-30s Response-Latenz (kein Streaming), Personas nach LiveTalk-Deaktivierung weiterhin aktiv (kein globaler Stop), Maya mit falschem Context (fehlende `activePage`-Injection).

### Bewertung Schicht A

**Ergebnis:** Hier hätte Schicht A echten Wert geliefert. Ein Stale Watcher, der Spec-Dateien gegen referenzierte Code-Dateien auf LOC-Veränderung prüft, hätte den Drift innerhalb von Stunden nach K7 gefunden. Die 3 UX-Issues wären schneller aufgefallen.

**Korrekturbedarf:** Stale Watcher braucht nicht nur Zeitbasierung ("Datei X Tage alt"), sondern auch Delta-Basierung ("referenzierte Datei hat sich um >50% verändert seit letztem Spec-Touch").

**Neuer Korrekturvorschlag: K7** — Stale Watcher braucht Delta-Sensitivität auf referenzierte Artefakte.

---

## 3. Schicht C — Signal Layer

### Hypothetische Signale

```yaml
Signal 1:
  id: sig.maya-drift.001
  signal_type: drift_suspected
  source: version_drift_checker (hypothetisch)
  based_on_version: git:aacc932
  created_at: 2026-03-28T14:00:00Z
  ttl: P14D
  confidence_band: high
  reason: "maya-chat-screen.tsx LOC dropped from ~900 to ~300. UI spec still references monolithic structure."
  target_refs: [ctx.maya.file.maya_chat_screen, ctx.maya.spec.ui_redesign]
  risk_context: hotspot

Signal 2:
  id: sig.maya-drift.002
  signal_type: stale_truth_hint
  source: stale_watcher (hypothetisch)
  based_on_version: git:aacc932
  created_at: 2026-03-28T14:05:00Z
  ttl: P14D
  confidence_band: medium
  reason: "UI redesign spec v4.3 not updated after K7 extraction"
  target_refs: [ctx.maya.spec.ui_redesign]
  risk_context: spec_anchor

Signal 3:
  id: sig.maya-drift.003
  signal_type: conflict_hint
  source: human_observation
  created_at: 2026-03-30T10:00:00Z
  ttl: P7D
  confidence_band: high
  reason: "3 UX issues found that trace back to stale assumptions about chat screen structure"
  target_refs: [ctx.maya.file.maya_chat_screen, ctx.maya.module.k7_components]
  risk_context: hotspot
```

### Membranprüfung: Signal → Case

- **M1 (Wiederholungsschwelle):** ✓ — 3 Signale auf überlappende Targets
- **M2 (Hotspot-Schwelle):** ✓ — Signal 1 und 3 haben `confidence_band=high` + `risk_context=hotspot`
- **M3 (Truth-Debt):** ✓ — Signal 2 zeigt stale Spec-Wahrheit
- **M4 (Contradiction):** ✗ — noch kein Case-Widerspruch

**Ergebnis:** Case-Erzeugung stark gerechtfertigt. Drei Membranregeln greifen gleichzeitig. Das ist das stärkste Signal bisher.

### Bewertung Schicht C

**Was funktioniert:** Die Signal-Typen decken den Fall vollständig ab. `drift_suspected` + `stale_truth_hint` + `conflict_hint` — drei verschiedene Typen für drei Aspekte desselben Problems. Das ist genau die Art von konvergierendem Signalcluster, die der Signal Triage Clerk erkennen und zum Case bündeln sollte.

**Neuer Fund:** Dieser Fall zeigt, dass ein guter Triage Clerk nicht nur einzelne Signale bewertet, sondern **Signalcluster** erkennt: Drei verschiedene Signaltypen auf überlappende Targets = starker Case-Kandidat. Das ist wertvoller als drei identische Signale.

**Korrekturbedarf K8:** Signal Triage Clerk Spezifikation braucht explizite Cluster-Erkennung als Fähigkeit, nicht nur einzelne Signal-Bewertung.

---

## 4. Schicht D — Case Layer (Crush Runtime P1)

### Operatorpfad

Gewählt: `MB → ZQ → TE → SV`

Begründung: Drift-Reparatur beginnt am besten mit Missing Branch (MB: was fehlt jetzt in der Spec?), dann Zerquetschen (ZQ: was ist der Kern des Drift?), dann Testen (TE: wo bricht die alte Annahme am härtesten?) und Salvage (SV: was von der alten Spec bleibt brauchbar?).

Kein Standard-Crossing — dieser Pfad ist ein neuer Kandidat. `MB→ZQ` als Einstieg für Drift-Probleme könnte ein eigenes Crossing werden.

### Attack

**MB:** Was fehlt der Spec nach K7?
- Keine Beschreibung der 8 extrahierten Komponenten
- Keine Beschreibung der neuen Komponentenhierarchie
- Keine Aktualisierung der State-Flows (30+ useState → verteilt auf 8 Module)
- Keine Aktualisierung der Inspector-/FOCUS-Knoten
- Agent-Prompts referenzieren `maya-chat-screen.tsx` als Ganzes

**ZQ:** Was ist der Kern des Drift?
- Die Spec beschreibt eine Welt, die nicht mehr existiert. Der monolithische Chat-Screen ist tot. Die 8 Module sind die neue Realität. Aber das Wissen darüber existiert nur in der K7-Session-History und im Code — nicht in der operativen Spec.

**TE:** Wo bricht die alte Annahme am härtesten?
- Ein Agent, der die UI-Redesign-Spec v4.3 als Orientierung benutzt und `maya-chat-screen.tsx` als monolithische Einheit behandelt, würde Änderungen an der falschen Stelle machen. Statt `MayaMessageFeed` zu editieren, würde er versuchen, in der Haupt-Datei zu arbeiten — die jetzt nur noch ein Orchestrator ist.
- Die 3 UX-Issues (Latenz, Persona-Stopp, Context-Fehler) sind genau solche Folgen: Sie erfordern Eingriffe in spezifische K7-Module, nicht im Orchestrator.

**SV:** Was überlebt?
- **SV-2:** Die Design-Entscheidungen aus v4.3 (Dark Theme, Chat als Primäroberfläche, 48px Icon Rail, Streaming-Cursor, Memory Chips) sind weiterhin gültig. Nur die Architektur-Beschreibung ist stale. Die Lösung ist kein Neuschreiben der Spec, sondern ein Architektur-Nachtrag mit K7-Komponentenbaum.

### Case Record

```yaml
id: case.2026-04-05.maya-ui-drift.002
case_type: repair_case
problem: "UI redesign spec v4.3 references monolithic chat screen that K7 decomposed into 8 modules"
problem_type: drift_repair
affected_context:
  - ctx.maya.file.maya_chat_screen
  - ctx.maya.module.k7_components
  - ctx.maya.spec.ui_redesign
created_from_signals: [sig.maya-drift.001, sig.maya-drift.002, sig.maya-drift.003]
based_on_version: git:aacc932
operator_path: [MB, ZQ, TE, SV]
crossing: null
attack_mode: spec_vs_code
st_profile:
  heat: 0.6
  drain: 0.4
  resonance: 0.7
  entropy_risk: medium
  collapse_risk: low
dtt_state:
  working_truth: "K7 decomposition is the new reality. Spec v4.3 design decisions remain valid, architecture description is stale."
  open_truth_debt: "Agent prompts and task packs may still reference monolithic structure"
  debt_risk: high
  revisit_trigger: "next agent task touching Maya UI or after spec update"
mb_state:
  missing_branch_suspected: true
  suspected_type: "stale_spec"
  reason: "No post-K7 architecture description exists. Agents operating on Maya UI have no reliable current map."
outcome: decision_gain
salvage_depth: SV-2
evidence_strength: field_tested
status: done
promotion_candidate: true
produced_cards:
  - aicos.warning.spec_code_drift_after_refactor
  - aicos.solution.post_refactor_spec_update
created_at: 2026-04-05T16:00:00Z
```

### Bewertung Schicht D

**Was funktioniert:** Der Case-Typ `repair_case` passt. Der Pfad MB→ZQ→TE→SV war effektiv für Drift-Probleme — MB als Einstieg zeigte sofort die Lücken, ZQ fand den Kern (Spec beschreibt tote Welt), TE zeigte die reale Konsequenz (Agenten arbeiten an falscher Stelle).

**Neuer Fund:** `attack_mode=spec_vs_code` war der richtige Wert. Das bestätigt, dass dieser Enum-Wert aus Korrekturvorschlag K1 (Run #001) sinnvoll ist.

**Neuer Fund:** MB→ZQ als Einstiegspaar für Drift-Probleme funktioniert gut. Das ist ein Crossing-Kandidat. Vorläufiger Name: **SD** (Spec-Drift? oder Sichtdurchbruch?). Noch zu früh für formale Aufnahme — erst weitere Fälle abwarten. Das bestätigt Crush-Regel: "Neue Kreuzungen entstehen bei Anwendung, nicht durch Spekulation."

**Was auffällt:** Der Case erzeugt zwei Cards (warning + solution). Das ist erlaubt, aber die Membranprüfung Case→Card muss dann zweimal laufen. Die Spec sagt dazu nichts Explizites.

**Korrekturbedarf K9:** Klären ob ein Case mehrere Cards erzeugen darf und ob die Membranprüfung pro Card einzeln läuft. Vorschlag: Ja, pro Card einzeln. Aber in `produced_cards` als Liste dokumentiert.

---

## 5. Schicht E — Card-Erzeugung

### Card 1: Warning

**Membranprüfung Case → Card (Typ: warning):**
1. Outcome `decision_gain`? → ✓
2. Nicht rein sprachlich? → ✓ (drei reale UX-Bugs als Evidenz)
3. Kontext benannt? → ✓
4. Keine bestehende Gegenkarte? → ✓
5. Zusatzbedingung: Realer Fehler dokumentiert? → ✓

```yaml
id: aicos.warning.spec_code_drift_after_refactor
card_type: warning
title: "Specs drift silently after large refactors"
summary: "After a major component extraction or refactor, existing specs, agent prompts, and task packs continue to reference the old structure. This causes agents to work on wrong targets and produces subtle UX bugs."
canonicality: supported
verification: field_tested
confidence: 0.78
scope: workflow
freshness: current
applicability: [refactor, component_extraction, spec_maintenance, agent_orientation]
applies_to: [ctx.maya.spec.ui_redesign, ctx.maya.file.maya_chat_screen]
evidenced_by: [case.2026-04-05.maya-ui-drift.002]
status: active
```

### Card 2: Solution

**Membranprüfung Case → Card (Typ: solution):**
1. Outcome `decision_gain`? → ✓
2. Nicht rein sprachlich? → ✓ (konkreter Handlungsvorschlag)
3. Kontext benannt? → ✓
4. Keine bestehende Gegenkarte? → ✓
5. Zusatzbedingung: Klare Lösung dokumentiert? → ✓

```yaml
id: aicos.solution.post_refactor_spec_update
card_type: solution
title: "Update spec architecture section after major refactors"
summary: "After any component extraction or major structural refactor, immediately update the architecture section of affected specs. Design decisions may remain valid while the architecture description becomes stale. A K7-style component list or tree is sufficient as update."
canonicality: supported
verification: field_tested
confidence: 0.76
scope: workflow
freshness: current
applicability: [refactor, component_extraction, spec_maintenance]
applies_to: [ctx.maya.spec.ui_redesign, ctx.maya.module.k7_components]
evidenced_by: [case.2026-04-05.maya-ui-drift.002]
status: active
```

### Bewertung

**Was funktioniert:** Warning und Solution ergänzen sich. Die Warning sagt "das passiert", die Solution sagt "das tust du dagegen". Die Membranen greifen korrekt für beide.

**Was auffällt:** Die Warning hat `scope=workflow`, nicht `system_architecture`. Das ist richtig — Spec-Drift nach Refactor ist ein Workflow-Problem, kein Architektur-Problem. Aber die Solution hat ebenfalls `scope=workflow`. Das zeigt: Die Scope-Zuordnung ist bisher rein manuell. Bei 100+ Cards wird das inkonsistent.

**Korrekturbedarf K10:** Scope-Zuordnung braucht Leitfragen oder Beispiele in der Spec, nicht nur eine Enum-Liste.

---

## 6. Edges

```yaml
Edge 1:
  id: edge.case-drift-applied-to-chatscreen.002
  from: case.2026-04-05.maya-ui-drift.002
  to: ctx.maya.file.maya_chat_screen
  type: applied_to
  verification: field_tested
  confidence: 0.78
  reason: "Drift case directly concerned post-K7 chat screen structure"

Edge 2:
  id: edge.warning-caused-by-spec.002
  from: aicos.warning.spec_code_drift_after_refactor
  to: ctx.maya.spec.ui_redesign
  type: caused_by
  verification: field_tested
  confidence: 0.78
  reason: "Stale spec caused agent disorientation"

Edge 3:
  id: edge.solution-solves-warning.002
  from: aicos.solution.post_refactor_spec_update
  to: aicos.warning.spec_code_drift_after_refactor
  type: solved_by
  verification: field_tested
  confidence: 0.76
  reason: "Immediate spec update prevents drift"

Edge 4:
  id: edge.case-produced-warning.002
  from: case.2026-04-05.maya-ui-drift.002
  to: aicos.warning.spec_code_drift_after_refactor
  type: produced
  verification: field_tested
  confidence: 0.78

Edge 5:
  id: edge.case-produced-solution.002
  from: case.2026-04-05.maya-ui-drift.002
  to: aicos.solution.post_refactor_spec_update
  type: produced
  verification: field_tested
  confidence: 0.76
```

**Bewertung:** 5 Edges aus einem Case. Mehr als Run #001 (4 Edges). Das bestätigt den Korrekturvorschlag K3 (Edge-Priorität): Hier sind `solved_by` und `caused_by` die wichtigsten Edges. `produced` und `applied_to` sind sekundär. Die Spec sollte Primary/Secondary Edges unterscheiden können.

---

## 7. Outcome Reality Check

| Frage | Antwort |
|---|---|
| Ist real etwas besser geworden? | Ja. Drift ist erkannt und dokumentiert. Handlungsanweisung existiert. |
| Wurde Handlungskraft erzeugt? | Ja. Nächster Agent, der Maya UI berührt, bekommt die Warning + Solution im Pack. |
| Ist das Outcome sichtbar? | Ja. Spec-Update als konkreter nächster Schritt. |
| War der Crush-Aufwand proportional? | Ja. |

**ORC-Urteil:** `decision_gain` (nicht `real_gain`, weil das Spec-Update selbst noch nicht durchgeführt ist)

---

## 8. Neue Korrekturvorschläge aus Run #002

| Nr | Korrektur | Priorität |
|---|---|---|
| K7 | Stale Watcher braucht Delta-Sensitivität auf referenzierte Artefakte | hoch |
| K8 | Signal Triage Clerk braucht Cluster-Erkennung als explizite Fähigkeit | mittel |
| K9 | Klären: Case darf mehrere Cards erzeugen, Membranprüfung pro Card einzeln | mittel |
| K10 | Scope-Zuordnung braucht Leitfragen/Beispiele in der Spec | niedrig |

---

## 9. Operatorpfad-Daten

| Run | Problemtyp | Pfad | Crossing | Outcome | Funktioniert? |
|---|---|---|---|---|---|
| #001 | reuse_decision | ZQ→IL→TE→SV | DL | real_gain | ja |
| #002 | drift_repair | MB→ZQ→TE→SV | (neu, MB→ZQ Kandidat) | decision_gain | ja |

MB→ZQ als Einstieg für Drift ist ein Crossing-Kandidat. Noch 1 Run zu früh für formale Aufnahme.

---
---

