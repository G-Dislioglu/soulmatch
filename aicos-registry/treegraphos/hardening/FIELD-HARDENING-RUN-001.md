# Field Hardening Run #001 — Arcana Audio Reuse

**Datum:** 05. April 2026  
**System unter Test:** Crush-Native Federated Tree-Graph OS v0.3  
**Zweck:** Prüfen ob Signal → Case → Card → Edge praktisch sitzt  
**Methode:** Realer Fall aus Soulmatch, vollständiger Durchlauf durch alle Schichten  
**Leitfrage:** Wo war das TreeOS zu schwer, zu weich, zu blind oder zu elegant ohne Realitätsgewinn?

---

## 1. Ausgangslage (realer Kontext)

### Was passiert ist

ArcanaCreatorChat.tsx (M09) braucht Audio/Mic-Funktionalität für den Creator-Chat mit Maya. DiscussionChat.tsx (M08) hat dieselbe Funktionalität bereits kanonisch implementiert: `pauseSpeechForAudio`, `scheduleResumeSpeechAfterAudio`, Integration mit `useSpeechToText.ts`. 

Das Problem: Ohne ein Orientierungssystem hätte ein Agent für M09 die Audio/Mic-Logik komplett neu gebaut — weil er M08 nicht als kanonische Quelle kennt und kein Signal existiert, das Duplikation verhindert.

### Betroffene Artefakte

```
ctx.soulmatch.file.discussion_chat
  path: client/src/modules/M08_studio-chat/DiscussionChat.tsx
  status: done
  canonicality: canonical
  verification: repo_verified
  roles: [entry, pattern, seam]

ctx.soulmatch.file.arcana_creator_chat
  path: client/src/modules/M09_arcana/ArcanaCreatorChat.tsx
  status: active
  canonicality: supported
  verification: human_asserted
  roles: [hotspot, risk, task_target]

ctx.soulmatch.file.use_speech_to_text
  path: client/src/hooks/useSpeechToText.ts
  status: done
  canonicality: canonical
  verification: repo_verified
  roles: [entry, seam, pattern]
```

---

## 2. Schicht A — Deterministischer Kern

### Was hätte feuern sollen

Ein **Diff Watcher** hätte beim Commit `d9e0cbd` erkannt:
- M09 Arcana Creator Chat wurde stark geändert
- Neue Audio/Mic-Importe hinzugefügt
- Ähnliche Funktionsnamen wie in M08

### Was tatsächlich passiert ist

Kein deterministischer Kern existiert noch. Der Diff Watcher hätte hier einen `duplicate_suspected` Signal erzeugt. Stattdessen wurde das Problem manuell erkannt.

### Bewertung Schicht A

**Ergebnis:** Schicht A hätte hier einen echten Mehrwert geliefert — aber nur wenn der Diff Watcher nicht nur Dateiänderungen, sondern auch Funktionsnamen-Überlappung erkennt. Ein reiner Datei-Diff reicht nicht. Er müsste mindestens auf importierte Hook-Namen und exportierte Funktionsnamen matchen.

**Korrekturbedarf:** Diff Watcher braucht ein Mindest-Matching auf Funktionsnamen/Hook-Importe, nicht nur Dateinamen.

---

## 3. Schicht C — Signal Layer

### Welche Signale hätten entstehen sollen

```yaml
Signal 1:
  id: sig.arcana-audio.001
  signal_type: duplicate_suspected
  source: diff_watcher (hypothetisch) oder human_observation
  based_on_version: git:d9e0cbd
  created_at: 2026-04-03T20:00:00Z
  ttl: P7D
  confidence_band: high
  reason: "ArcanaCreatorChat imports audio/mic logic similar to DiscussionChat"
  target_refs: [ctx.soulmatch.file.arcana_creator_chat, ctx.soulmatch.file.discussion_chat]
  risk_context: hotspot

Signal 2:
  id: sig.arcana-audio.002
  signal_type: case_candidate
  source: human_observation
  based_on_version: git:d9e0cbd
  created_at: 2026-04-03T20:05:00Z
  ttl: P7D
  confidence_band: high
  reason: "Reuse decision needed before further Arcana audio work"
  target_refs: [ctx.soulmatch.file.arcana_creator_chat]
  risk_context: hotspot
```

### Membranprüfung: Signal → Case

Welche Membranregel greift?

- **M1 (Wiederholungsschwelle):** ✓ — 2 unabhängige Signale auf überlappende Targets innerhalb von Minuten
- **M2 (Hotspot-Schwelle):** ✓ — `confidence_band=high` und `risk_context=hotspot`
- **M3 (Truth-Debt):** ✗ — kein bestehender Revisit-Trigger
- **M4 (Contradiction):** ✗ — kein Widerspruch zwischen Cards
- **M5 (Human-Forcing):** Nicht nötig, M1+M2 reichen

**Ergebnis:** Case-Erzeugung ist gerechtfertigt. Beide Schwellen greifen. Kein Membranverstoß.

### Bewertung Schicht C

**Was funktioniert:** Die Signaltypen passen. Die Membranregeln M1 und M2 greifen korrekt. Der Fall wäre nicht übersprungen worden.

**Was auffällt:** In der Praxis wurde das Problem nicht durch Signale erkannt, sondern durch menschliche Beobachtung. Der Signal Layer hätte hier nur dann selbständig gefeuert, wenn Schicht A einen ausreichend klugen Diff Watcher hat. Ohne den Watcher ist der Signal Layer für *diesen* Fall ein reiner Formalismus — er dokumentiert, was der Mensch ohnehin schon gesehen hat.

**Korrekturbedarf:** Signal Layer ist wertvoll als Formalisierung, aber der eigentliche Hebel liegt in Schicht A. Wenn der Watcher zu primitiv ist, entsteht der Signal nicht automatisch, und die Membran läuft leer.

---

## 4. Schicht D — Case Layer

### Der Case

```yaml
id: case.2026-04-05.arcana-audio-reuse.001
case_type: crush_run
problem: "Arcana audio/mic logic duplicates canonical M08 pattern"
problem_type: reuse_decision
affected_context:
  - ctx.soulmatch.file.arcana_creator_chat
  - ctx.soulmatch.file.discussion_chat
  - ctx.soulmatch.file.use_speech_to_text
created_from_signals:
  - sig.arcana-audio.001
  - sig.arcana-audio.002
based_on_version: git:d9e0cbd
```

### Crush Runtime — P1 Case Crush

**Schritt 1: Problem fassen**
ArcanaCreatorChat baut eigene Audio/Mic-Logik, die bereits kanonisch in DiscussionChat existiert.

**Schritt 2: Kontext bestimmen**
3 Context Nodes betroffen. DiscussionChat ist canonical + entry + pattern. ArcanaCreatorChat ist hotspot + risk. useSpeechToText ist canonical + seam.

**Schritt 3: Knowledge Pack ziehen**
Zum Zeitpunkt dieses Falls existieren noch keine AICOS-Cards mit Bezug auf Audio-Reuse. Das Knowledge Pack wäre leer. Das ist erwartbar für den ersten Durchlauf.

**Schritt 4: Case Pack ziehen**
Keine vorherigen Crush-Runs zu reuse_decision in Soulmatch. Case Pack wäre leer. Ebenfalls erwartbar.

**Schritt 5: Operatorpfad wählen**

Gewählt: `ZQ → IL → TE → SV` (Crossing: DL — Durchlichten)

Begründung: Reuse-Entscheidungen profitieren von Kompression (ZQ: was bleibt wenn man alles Überflüssige wegnimmt?) → Relationsanalyse (IL: was liegt zwischen den beiden Implementierungen?) → Gegenbeispiel (TE: wo bricht die Reuse-Annahme?) → Salvage (SV: was bleibt nach dem Angriff?).

**Schritt 6: Attack**

ZQ auf beide Dateien: Was ist der Kern jeder Implementierung?
- DiscussionChat: `pauseSpeechForAudio()`, `scheduleResumeSpeechAfterAudio()`, Mic-State über `useSpeechToText` Hook
- ArcanaCreatorChat: Ähnliche Pause/Resume-Logik, aber inline statt über Hook. Zusätzlich SSE-Streaming und Creator-spezifische Persona-Logik.

IL zwischen den Resten: Die Audio-Pause/Resume-Logik ist strukturell identisch. Die Unterschiede liegen in der Creator-spezifischen Persona-Behandlung und dem SSE-Streaming — beides hat nichts mit Audio/Mic zu tun.

TE — stärkstes Gegenbeispiel: Gibt es einen Fall, wo ArcanaCreatorChat eine *andere* Audio-Logik bräuchte als DiscussionChat?
- Creator-Mic-States bei gleichzeitigem TTS und User-Input → Ja, es gibt Edge Cases bei der Reihenfolge von Mic-Mute und TTS-Start. Aber diese betreffen das *Timing*, nicht das *Pattern*. Das Pattern (Pause → Play → Resume) bleibt identisch, nur die Triggerbedingung ist spezifischer.

SV — was überlebt den Angriff?
- **SV-2 (Teilkern geborgen):** Das Pause-Resume-Pattern ist reuse-fähig. Die Creator-spezifischen Timing-Edge-Cases sind eine Erweiterung, kein Ersatz. Import + Extend statt Rebuild.

**Schritt 7: ST / DTT / MB**

```yaml
st_profile:
  heat: 0.7       # Aktiv bearbeitetes Gebiet
  drain: 0.3      # Geringer Aufwand für diese Entscheidung
  resonance: 0.8  # Hohe Querverbindung (3 Nodes, Reuse-Potential für zukünftige Module)
  entropy_risk: low
  collapse_risk: low

dtt_state:
  working_truth: "M08 pause-resume pattern covers 90%+ of Arcana audio needs"
  open_truth_debt: "Creator-specific mic timing edge cases (TTS+User-Input overlap) ungetestet"
  debt_risk: medium
  revisit_trigger: "first creator-side audio regression or 14 days"

mb_state:
  missing_branch_suspected: false
  suspected_type: null
  reason: "Kein fehlender Ast erkennbar. Reuse vs. Rebuild ist die richtige Frage."
```

**Schritt 8: Outcome**

`real_gain` — Die Entscheidung verhindert eine eigenständige Audio/Mic-Implementierung in ArcanaCreatorChat. Stattdessen: Import von M08 Pattern + Extend für Creator-spezifische Edge Cases. Geschätzter Zeitgewinn: 2–4 Stunden Implementierung, plus vermiedene zukünftige Sync-Bugs.

**Schritt 9: Case speichern**

```yaml
id: case.2026-04-05.arcana-audio-reuse.001
case_type: crush_run
problem: "Arcana audio/mic logic duplicates canonical M08 pattern"
problem_type: reuse_decision
affected_context:
  - ctx.soulmatch.file.arcana_creator_chat
  - ctx.soulmatch.file.discussion_chat
  - ctx.soulmatch.file.use_speech_to_text
created_from_signals: [sig.arcana-audio.001, sig.arcana-audio.002]
based_on_version: git:d9e0cbd
operator_path: [ZQ, IL, TE, SV]
crossing: DL
attack_mode: reuse_vs_rebuild
st_profile:
  heat: 0.7
  drain: 0.3
  resonance: 0.8
  entropy_risk: low
  collapse_risk: low
dtt_state:
  working_truth: "M08 pause-resume pattern covers 90%+ of Arcana audio needs"
  open_truth_debt: "Creator-specific mic timing edge cases ungetestet"
  debt_risk: medium
  revisit_trigger: "first creator-side audio regression or 14 days"
mb_state:
  missing_branch_suspected: false
outcome: real_gain
salvage_depth: SV-2
evidence_strength: field_tested
status: done
promotion_candidate: true
produced_cards: [aicos.solution.audio_reuse_pause_resume]
created_at: 2026-04-05T15:00:00Z
```

### Bewertung Schicht D

**Was funktioniert:** Das Case-Schema fängt alles Wesentliche ein. Problem, Kontext, Crush-Pfad, ST/DTT/MB, Outcome, Salvage, Revisit-Trigger — alles hat einen Platz. Nichts musste improvisiert werden.

**Was auffällt:** Das Feld `attack_mode` ist im Schema als Pflichtfeld, aber es gibt keine Enum-Liste für erlaubte Werte. Ich habe `reuse_vs_rebuild` gesetzt, aber das ist ein ad-hoc-Wert. Für zukünftige Vergleichbarkeit brauchen Cases eine standardisierte `attack_mode`-Taxonomie.

**Korrekturbedarf:** `attack_mode` Enum definieren. Vorschlag: `counterexample`, `banal_fix`, `null_probe`, `boundary_test`, `cost_line`, `reuse_vs_rebuild`, `spec_vs_code`, `working_truth_vs_evidence`.

---

## 5. Schicht E — Knowledge Layer (Card-Erzeugung)

### Membranprüfung: Case → Card

1. Outcome mindestens `decision_gain`? → **Ja**, sogar `real_gain` ✓
2. Salvage nicht rein sprachlich? → **Ja**, konkrete Implementierungsentscheidung ✓
3. Betroffener Kontext benannt? → **Ja**, 3 Context Nodes ✓
4. Review findet keine bestehende Gegenkarte? → **Ja**, keine AICOS-Cards zu Audio-Reuse vorhanden ✓
5. Mindestens eine Zusatzbedingung?
   - Zweiter ähnlicher Case? → Nein, erster Fall
   - Realer Fehler/Lösung klar dokumentiert? → **Ja** ✓
   - Judge/Human bewertet als stark genug? → Nicht nötig, Bedingung 5b reicht

**Card-Typ:** `solution` — Schwelle für solution: "braucht klare Fall- oder Kontextbindung" ✓

**Ergebnis:** Card-Erzeugung gerechtfertigt. Startet als `canonicality=supported`.

### Die erzeugte Card

```yaml
id: aicos.solution.audio_reuse_pause_resume
card_type: solution
title: "Reuse M08 pause-resume pattern for audio/mic in new modules"
summary: "When building audio/mic functionality in new Soulmatch modules, import the canonical pauseSpeechForAudio + scheduleResumeSpeechAfterAudio pattern from DiscussionChat (M08) and extend for module-specific edge cases instead of rebuilding."
canonicality: supported
verification: field_tested
confidence: 0.82
scope: workflow
freshness: current
applicability: [reuse_decision, audio_implementation, new_module_setup]
applies_to:
  - ctx.soulmatch.file.discussion_chat
  - ctx.soulmatch.file.arcana_creator_chat
  - ctx.soulmatch.file.use_speech_to_text
evidenced_by:
  - case.2026-04-05.arcana-audio-reuse.001
crossing_refs: []
status: active
```

### Bewertung Schicht E

**Was funktioniert:** Die Membranregeln haben korrekt gegriffen. Der Card-Typ passt. Die Pflichtbezüge (`applies_to`, `evidenced_by`) sind gesetzt. Die Card startet richtig als `supported`, nicht als `canonical`.

**Was auffällt:** Die Card ist stark als erste Karte. Aber die Frage "wann steigt sie zu canonical auf?" ist noch nicht praxisgetestet. Laut v0.3 §8.3 braucht sie dafür ≥5 stützende Cases oder ≥2 cross_context Cases + adversarialen Angriff + Judge-Freigabe. Das ist eine hohe Schwelle für eine offensichtlich richtige Lösung. In der Praxis könnte das zu lang dauern.

**Korrekturbedarf:** Prüfen ob die Schwelle Card → Canonical für offensichtliche, repo-verifizierbare Lösungen zu hoch ist. Mögliche Ergänzung: Eine `fast_track_canonical`-Regel für Solutions, die direkt im Code sichtbar und von ≥2 Personen/Agenten bestätigt sind.

---

## 6. Schicht F — Edge Layer

### Erzeugte Edges

```yaml
Edge 1:
  id: edge.arcana-reuse-discussion.001
  from: ctx.soulmatch.file.arcana_creator_chat
  to: ctx.soulmatch.file.discussion_chat
  type: reuse_candidate
  verification: field_tested
  confidence: 0.88
  strength: 0.91
  recommended_action: copy_exact
  reason: "pauseSpeechForAudio + scheduleResumeSpeech pattern overlap"
  created_at: 2026-04-05T15:05:00Z
  based_on_version: git:d9e0cbd

Edge 2:
  id: edge.case-produced-card.001
  from: case.2026-04-05.arcana-audio-reuse.001
  to: aicos.solution.audio_reuse_pause_resume
  type: produced
  verification: field_tested
  confidence: 0.82
  reason: "Crush run produced reusable solution card"
  created_at: 2026-04-05T15:05:00Z
  based_on_version: git:d9e0cbd

Edge 3:
  id: edge.card-applies-to-discussion.001
  from: aicos.solution.audio_reuse_pause_resume
  to: ctx.soulmatch.file.discussion_chat
  type: applies_to
  verification: field_tested
  confidence: 0.88
  reason: "Solution references canonical M08 pattern"
  created_at: 2026-04-05T15:05:00Z
  based_on_version: git:d9e0cbd

Edge 4:
  id: edge.case-applied-to-arcana.001
  from: case.2026-04-05.arcana-audio-reuse.001
  to: ctx.soulmatch.file.arcana_creator_chat
  type: applied_to
  verification: field_tested
  confidence: 0.82
  reason: "Case addressed audio duplication risk in Arcana"
  created_at: 2026-04-05T15:05:00Z
  based_on_version: git:d9e0cbd
```

### Bewertung Schicht F

**Was funktioniert:** Die Edge-Typen aus v0.3 decken diesen Fall ab. `reuse_candidate`, `produced`, `applies_to`, `applied_to` — alles vorhanden, nichts musste erfunden werden.

**Was auffällt:** Es werden 4 Edges aus einem einzigen Case erzeugt. Das ist korrekt, aber bei 50+ Cases entsteht schnell ein dichter Graph. Die Spec hat keine Guidance für Edge-Dichte oder Priorität. Nicht jede plausible Edge ist gleich wichtig.

**Korrekturbedarf:** Edges brauchen ein optionales `priority`-Feld oder zumindest eine Anzeige-Filterregel: Welche Edges werden in Packs aufgenommen, welche nur im Graph?

---

## 7. Schicht G — Crush Runtime Bewertung

### Pulse-Crush-Stufe

P1 (Case Crush) war korrekt. Kein P0 (zu konkret für Ambient), kein P2 (kein Widerspruch, keine Promotion, kein Protected Research).

### Operatorpfad-Bewertung

ZQ→IL→TE→SV (DL) hat funktioniert. Der Pfad war effizient: 4 Schritte, klares Outcome, keine Oversearch.

Gegenprobe: Hätte ein anderer Pfad besser funktioniert?
- `BL→AN` (UM — Umleitung): Nicht nötig, weil die Blockade bekannt war (Duplikation), nicht versteckt.
- `ZL→SE` (KS — Kernschlag): Möglich, aber ZQ→IL ist für Reuse-Entscheidungen treffender, weil es nicht um das tragende Teil geht, sondern um den Überlapp.

**Ergebnis:** Pfadwahl war gut. Dieser Fall stützt DL für `reuse_decision`.

---

## 8. Schicht K — Derived Views

### Start Pack Auswirkung

Nach diesem Case würde der Soulmatch Start Pack folgendes enthalten:

```
## Canonical entry points
- ctx.soulmatch.file.discussion_chat (canonical, entry, pattern)
- ctx.soulmatch.file.use_speech_to_text (canonical, entry, seam)

## Reuse candidates
- ctx.soulmatch.file.arcana_creator_chat should reuse from discussion_chat
  Action: copy_exact | Confidence: 0.88

## Forbidden / do-not-rebuild zones
- Audio/Mic pattern: do not rebuild (use M08 pattern)

## Knowledge
- aicos.solution.audio_reuse_pause_resume (supported, conf=0.82)
```

**Bewertung:** Der Start Pack wäre nach einem einzigen Case schon nützlich. Ein Agent, der den Start Pack vor Arbeit an M09 liest, hätte die Duplikation vermieden. Das ist der eigentliche Wert des Systems.

---

## 9. Gesamtbewertung: Wo war das TreeOS zu schwer, zu weich, zu blind oder zu elegant?

### Zu schwer

**`attack_mode` als Pflichtfeld ohne Enum.** In der Praxis muss man sich einen Wert ausdenken. Das verlangsamt und erzeugt inkonsistente Daten.

**Card→Canonical Schwelle (≥5 Cases).** Für offensichtliche, repo-verifizierbare Lösungen ist das zu hoch. Eine Solution, die im Code direkt sichtbar ist, sollte schneller canonical werden können.

### Zu weich

**Schicht A hat keine Spezifikation für Funktionsnamen-Matching.** Der Diff Watcher ist als "deterministisch" beschrieben, aber für Duplikationserkennung braucht man mindestens Funktionsnamen-/Import-Overlap. Das ist nicht deterministisch im einfachen Sinn — es braucht ein Mindest-Matching.

**Edge-Dichte hat keine Priorisierung.** 4 Edges aus 1 Case ist okay, aber bei 50 Cases × 4 Edges = 200 Edges wird der Graph ohne Priorität unübersichtlich.

### Zu blind

**Knowledge Pack und Case Pack waren leer beim ersten Durchlauf.** Das ist logisch (erster Case), aber es bedeutet: Die ersten 5–10 Cases profitieren kaum vom System. Der Wert entsteht erst ab ~10 Cases. Das ist eine ehrliche Einschränkung, die kommuniziert werden sollte.

### Zu elegant ohne Realitätsgewinn

**Nichts.** Jedes Feld, das ausgefüllt wurde, hatte einen Zweck. Kein Feld war Formularfüllerei. Das ist ein gutes Zeichen.

---

## 10. Konkrete Korrekturvorschläge für v0.3.1

| Nr | Korrektur | Priorität |
|---|---|---|
| K1 | `attack_mode` Enum definieren | hoch |
| K2 | Diff Watcher Spezifikation: Mindest-Matching auf Funktionsnamen/Imports | hoch |
| K3 | Edge-Priorität oder Anzeige-Filter einführen | mittel |
| K4 | `fast_track_canonical` Regel für repo-verifizierbare Solutions prüfen | mittel |
| K5 | Cold-Start-Kommunikation: System braucht ~10 Cases für vollen Nutzen | niedrig |
| K6 | Pack-Feldschema (Pflichtfelder, Sortierung, max. Länge) | mittel |

---

## 11. Outcome Reality Check

| Frage | Antwort |
|---|---|
| Ist real etwas besser geworden? | Ja. Agent hätte Duplikation vermieden. |
| Wurde Handlungskraft erzeugt? | Ja. Klare Empfehlung: copy_exact. |
| Ist das Outcome sichtbar? | Ja. Start Pack wäre nach diesem Case sofort nützlich. |
| War der Crush-Aufwand proportional? | Ja. ~30 Minuten für eine Entscheidung, die 2-4h Arbeit + zukünftige Bugs spart. |

**ORC-Urteil:** `real_gain`

---

## 12. Was dieser Durchlauf über das System sagt

Das TreeOS v0.3 hat den ersten realen Fall ohne Bruch geschafft. Kein Feld musste erfunden werden, kein Schema war unpassend, kein Membranschritt war überflüssig. Die 6 Korrekturvorschläge sind Verfeinerungen, keine Strukturfehler.

Der wichtigste Fund: **Der Wert entsteht nicht im Case selbst, sondern im Start Pack danach.** Das System ist ein Orientierungssystem, kein Dokumentationssystem. Der Case ist Mittel, der Pack ist Zweck.

---

*Field Hardening Run #001. Signal → Case → Card → Edge → Pack. Alles hat gehalten. 6 Korrekturen identifiziert. Kein Strukturbruch. 05. April 2026.*
