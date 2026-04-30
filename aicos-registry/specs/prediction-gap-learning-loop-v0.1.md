# Prediction-Gap Learning Loop v0.1

**Status:** Cross-system draft / proposal-first  
**Datum:** 2026-04-29  
**Zielsysteme:** Maya Core, AICOS Registry, Soulmatch Builder, spaeter Bluepilot/MEC  
**Dokumenttyp:** Draft Spec / Learning-Governance Addendum  
**Scope:** Spezifikation, keine Implementierung, kein Runtime-Contract

## Einordnung

Diese Spec beschreibt einen moeglichen epistemischen Lern-Loop fuer mehrere Systeme.
Sie ist **keine** produktive Runtime-Mechanik, **kein** Speichervertrag, **kein**
Canon-Pfad und **keine** automatische Promotion-Policy.

Sie ist als moegliches spaeteres Addendum zur epistemischen Kontrolllogik gedacht,
nicht als konkurrierendes zweites Case-, Memory- oder Canon-System.

---

## 1. Kurzfassung

Der **Prediction-Gap Learning Loop** ist eine kleine epistemische Betriebsschicht fuer Maya, AICOS und Builder.

Er basiert auf einer einfachen Regel:

> Systemlernen entsteht nicht durch das Speichern von Antworten, sondern durch falsifizierbare Vorhersagen, Realitaetspruefung, erkannte Luecken, Modellkorrekturen und spaeteren Rueckfluss dieser Korrekturen in Entscheidungen.

Die zentrale Formel lautet:

```text
Prediction -> Falsifiability Gate -> Test -> Gap -> Model Update -> Reuse Decision -> Future Influence
```

Wichtig:

```text
Ein Prediction-Gap-Ledger allein ist nur Archiv.
Ein Ledger mit Rueckfluss in spaetere Entscheidungen ist Systemlernen.
```

---

## 2. Nicht-Ziel / Scope-Grenzen

Diese Spec ist **keine Runtime-Implementierung**.

Nicht im Scope:

- keine Builder-Pipeline-Aenderung
- keine TypeScript-Stubs
- keine neuen Agenten
- keine automatische AICOS-Registry-Mutation
- keine automatische Memory-Promotion
- keine Aenderung produktiver Workflows
- keine Behauptung, der zugrundeliegende Feynman-aehnliche Text sei eine verifizierte Feynman-Quelle

Der Textimpuls wird nur als didaktischer Anker fuer Predict-Test-Adapt genutzt, nicht als autoritative Quelle.

---

## 3. Problemdefinition

Viele KI-Systeme speichern zu viel und lernen zu wenig.

Typisches Fehlmuster:

```text
Aufgabe -> Antwort -> Log -> Zusammenfassung -> noch mehr Kontext
```

Das erzeugt Speicher, aber nicht zwingend Systemintelligenz.

Ein System lernt erst dann, wenn es:

1. sein aktuelles Modell explizit macht,
2. daraus eine testbare Erwartung ableitet,
3. die Erwartung gegen Realitaet prueft,
4. die Abweichung erkennt,
5. daraus eine wiederverwendbare Modellkorrektur ableitet,
6. diese Korrektur spaeter in einer Entscheidung nutzt.

Die harte Speicherregel:

```text
Memory speichert nicht alles.
Memory speichert gepruefte, wiederverwendbare Modellkorrekturen.
```

Die harte Lernregel:

```text
Ein gespeichertes Delta gilt erst als Systemlernen, wenn es spaeter eine Entscheidung beeinflusst oder dafuer eindeutig abrufbar ist.
```

---

## 4. Anschluss an bestehende Architektur

Diese Spec ergaenzt bestehende Maya- und AICOS-Prinzipien, ersetzt sie aber nicht.

| Bestehender Baustein | Anschluss des Prediction-Gap Loops |
|---|---|
| Assumption Registry | Vorannahmen werden vor dem Test sichtbar gemacht |
| Claim Lineage | Claims bekommen Herkunft, Test und Update-Spur |
| Mirror Overlay | Scheinsicherheit und ungetestete Annahmen werden sichtbar |
| Freshness Sentinel | Alte Modellkorrekturen koennen verfallen oder neu geprueft werden |
| Regime-Exit | Stop-Kriterium: Gap gemessen, Update formuliert, Reuse entschieden |
| Context Curator | Greift spaeter auf relevante Prediction-Gap-Deltas zurueck |
| Builder Judge | Bewertet nicht nur Diff, sondern auch Vorhersage-/Test-/Gap-Qualitaet |
| AICOS Card Promotion | Cards werden nach Vorhersagekraft, nicht nur Eloquenz bewertet |

Der Prediction-Gap Loop soll bestehende Treegraphos-/AICOS-Schichten ergaenzen,
nicht duplizieren. Wenn er spaeter uebernommen wird, muss er an bestehende Case-,
Card-, Evidence- und Promotion-Regeln angeschlossen werden.

---

## 5. Single-Writer und Write-Grenzen

Prediction-Gap-Eintraege duerfen nur aus explizit gescopten Review- oder Execution-Kontexten entstehen.

Nicht erlaubt in v0.1:

- automatische Multi-Writer-Erzeugung
- Hintergrund-Promotion in Canon
- implizite Cross-System-Writebacks
- stille Mutation produktiver Registry-Objekte

Das Hauptrisiko dieser Spec ist nicht zu wenig Lernen, sondern eine zweite ungeklaerte Ontologie fuer Cases, Memory und Canon.
v0.1 ist nur akzeptabel, wenn diese Spec keinen parallelen Schatten-Kanon erzeugt.

---

## 6. Loop-Definition

### 6.1 compress_task

Die Aufgabe wird auf ihren pruefbaren Kern reduziert.

Beispiel:

```text
Nicht: Builder verbessern.
Sondern: buildTeamAwarenessBrief soll bei konfigurierter, aber fehlerhafter DB nicht throwen.
```

### 6.2 state_current_model

Das System beschreibt sein aktuelles Modell der Situation.

Beispiel:

```text
Aktuelles Modell: Team-Awareness ist read-only und soll die Builder-Pipeline nicht brechen.
```

### 6.3 make_prediction

Das System formuliert eine konkrete Vorhersage.

Beispiel:

```text
Wenn die Korrektur korrekt ist, liefert buildTeamAwarenessBrief bei DB-Read-Fehler SELF/TEAM/POSITION und wirft keinen Fehler.
```

### 6.4 falsifiability_gate

Die Prediction wird nur akzeptiert, wenn sie messbar oder binaer pruefbar ist.

Eine gueltige Prediction muss:

- vor dem Test formuliert sein
- ein binaeres oder messbares Outcome benennen
- einen konkreten Test- oder Beobachtungspfad haben
- nicht nachtraeglich an das Ergebnis angepasst werden

### 6.5 test_or_retrieve

Das System prueft die Prediction durch Test, Build, Runtime-Check, Repo-Inspection, Quellenpruefung oder kontrollierte Beobachtung.

### 6.6 record_gap

Das Ergebnis wird gegen die Prediction verglichen.

Gap-Typen:

```text
none          = Prediction bestaetigt
minor         = kleine Abweichung ohne Modellbruch
major         = wichtige Abweichung, Modellkorrektur noetig
contradiction = Prediction klar widerlegt
pending       = Test noch nicht abgeschlossen
```

### 6.7 update_model

Das System formuliert, was am bisherigen Modell korrigiert werden muss.

### 6.8 reuse_decision

Das System entscheidet, ob die Korrektur spaeter wiederverwendbar ist.

Nicht jede Beobachtung ist speicherwuerdig.

### 6.9 teachback_summary

Das System erklaert die Modellkorrektur kurz und verstaendlich.

### 6.10 store_reusable_delta_only

Nur wiederverwendbare Modellkorrekturen werden gespeichert.

### 6.11 future_influence_check

Die Spec muss definieren, wo das gespeicherte Delta spaeter wieder gelesen oder angewandt wird.

Rueckflussstellen muessen eng benannt werden: genau ein primaeres Reuse-Ziel, optional ein zweites.

---

## 7. Falsifiability Gate

### 7.1 Gueltige Predictions

Eine Prediction ist gueltig, wenn sie pruefbar ist.

Beispiele:

```text
Wenn der Fix korrekt ist, gibt buildTeamAwarenessBrief bei DB-Ausfall ein partielles Brief mit SELF/TEAM/POSITION zurueck und wirft keinen Fehler.
```

Warum gueltig:

- binaer pruefbar: throwt / throwt nicht
- Output pruefbar: SELF/TEAM/POSITION vorhanden oder nicht
- Testpfad klar: DB-Read-Fehler simulieren

---

```text
Wenn die UI-Reduktion korrekt ist, bleibt /maya die primaere Surface und /chat wird nicht veraendert.
```

Warum gueltig:

- Repo-Diff pruefbar
- betroffene Dateien pruefbar
- Surface-Semantik pruefbar

---

```text
Wenn eine Card redundant ist, muss sie auf bestehende meta-007 oder sol-cross-043 verweisen statt eine neue Candidate-Card zu erzeugen.
```

Warum gueltig:

- Card-Content pruefbar
- Referenzierung pruefbar
- Nicht-Redundanz pruefbar

### 7.2 Ungueltige Predictions

```text
Die Loesung wird besser.
```

Warum ungueltig:

- kein messbares Outcome
- kein Testpfad
- unklar, was besser bedeutet

Schaerfung:

```text
Die Loesung ist besser, wenn der vorher fehlende DB-Failure-Fall ohne Throw behandelt wird und bestehende Tests gruen bleiben.
```

---

```text
Das System wird intelligenter.
```

Warum ungueltig:

- zu abstrakt
- keine Einzelentscheidung oder Messung
- nicht falsifizierbar

Schaerfung:

```text
Das System nutzt ein gespeichertes Prediction-Gap-Delta in einer spaeteren Builder-Judge-Entscheidung.
```

---

```text
Der Agent versteht den Kontext.
```

Warum ungueltig:

- Verstaendnis ist nicht direkt messbar
- keine beobachtbare Handlung definiert

Schaerfung:

```text
Der Agent referenziert den korrekten Scope, benennt die betroffenen Dateien und veraendert keine out-of-scope-Dateien.
```

---

## 8. JSON-Schema

```json
{
  "id": "pgl-YYYYMMDD-short-token",
  "task_ref": "string",
  "source_context": {
    "project": "maya_core | aicos | soulmatch_builder | bluepilot | mec | cross_app",
    "repo": "optional string",
    "branch": "optional string",
    "related_files": ["string"],
    "related_cards": ["string"],
    "source_notes": ["string"]
  },
  "current_model": "string",
  "hypothesis": "string",
  "prediction": "string",
  "falsifiability_check": {
    "accepted": true,
    "reason": "string",
    "testable_outcome": "string",
    "test_method": "string"
  },
  "test_method": {
    "type": "repo_inspection | unit_test | build | runtime_check | source_check | manual_review | other",
    "description": "string"
  },
  "observed_result": "string",
  "gap_type": "none | minor | major | contradiction | pending",
  "model_update": "string",
  "reusable_delta": "string",
  "reuse_decision": {
    "store": true,
    "reason": "string",
    "primary_influence_target": "context_curator | builder_judge | maya_reasoning | aicos_card_promotion | agent_briefing | handoff",
    "secondary_influence_target": "optional same enum"
  },
  "storage_decision": "discard | temporary | reusable_delta | candidate_card",
  "confidence": 0.0,
  "expiry_or_decay_hint": "string"
}
```

Canon-Promotion ist in v0.1 explizit out of scope und braucht ein separates Promotion Gate ausserhalb dieses Loops.

---

## 9. Beispiel: Builder Team-Awareness DB-Failure

```json
{
  "id": "pgl-20260429-builder-team-awareness-db-failure",
  "task_ref": "builder-team-awareness-db-failure-hardening",
  "source_context": {
    "project": "soulmatch_builder",
    "repo": "G-Dislioglu/soulmatch",
    "branch": "builder-k26-next",
    "related_files": [
      "server/src/lib/builderTeamAwareness.ts",
      "server/src/lib/opusScoutRunner.ts",
      "server/src/lib/opusRoundtable.ts"
    ],
    "related_cards": [],
    "source_notes": [
      "Team-Awareness soll read-only bleiben.",
      "Keine Pipeline-Aenderung, kein main-push vor Korrektur."
    ]
  },
  "current_model": "Team-Awareness degradiert bei fehlendem DATABASE_URL, aber moeglicherweise nicht bei konfigurierter, temporaer fehlerhafter DB.",
  "hypothesis": "Der Helper braucht interne Fehlerkapselung fuer DB-Reads, nicht nur missing-env fallback.",
  "prediction": "Wenn die Korrektur korrekt ist, wirft buildTeamAwarenessBrief bei DB-Read-Fehler nicht und liefert SELF/TEAM/POSITION plus degraded oder leere MEMORY zurueck.",
  "falsifiability_check": {
    "accepted": true,
    "reason": "Binaer testbar: throwt oder throwt nicht; Output enthaelt oder enthaelt nicht SELF/TEAM/POSITION; MEMORY ist degraded/leer oder nicht.",
    "testable_outcome": "No throw; partial brief returned; memory degraded or empty.",
    "test_method": "DB-Read-Fehler simulieren oder loadMemoryLines mocken."
  },
  "test_method": {
    "type": "unit_test",
    "description": "Mock configured DB read to throw and call buildTeamAwarenessBrief."
  },
  "observed_result": "pending",
  "gap_type": "pending",
  "model_update": "pending",
  "reusable_delta": "DB-abhaengige read-only Helper muessen configured-but-failing-safe sein, nicht nur missing-env-safe.",
  "reuse_decision": {
    "store": true,
    "reason": "Wiederverwendbar fuer Builder, Maya und andere DB-abhaengige Hilfsschichten.",
    "primary_influence_target": "builder_judge",
    "secondary_influence_target": "agent_briefing"
  },
  "storage_decision": "reusable_delta",
  "confidence": 0.78,
  "expiry_or_decay_hint": "Recheck when DB helper architecture changes."
}
```

---

## 10. Challenge Slot / Surprise Control

Der Context Curator darf Surprise nicht einfach als Activation-Score-Bonus behandeln.

Falscher Ansatz:

```text
Knoten bekommt mehr Score, weil er widerspricht.
```

Risiko:

```text
Das System zieht absichtlich widerspruechlichen Muell rein.
```

Richtiger Ansatz:

```text
Top-K Pflichtkontext = 2 relevante Knoten + optional 1 Challenge Node
```

Challenge Node darf nur aufgenommen werden, wenn er:

- task-relevant ist
- evidence-backed ist
- nicht spekulativ ist
- eine produktive Gegenpruefung ermoeglicht
- nicht bloss Widerspruch um des Widerspruchs willen erzeugt

Beispiel:

```text
Agent erwartet Audio-Bug.
Challenge Node erinnert an frueheren aehnlichen Fall, der tatsaechlich Race Condition war.
```

Das Ziel ist produktive Reibung, nicht Rauschen.

---

## 11. Vier-Ebenen-Trennung

Sichere Lernarchitektur braucht getrennte Ebenen.

```text
1. Prediction-Ebene
   frei, hypothetisch, darf falsch sein

2. Worktree-Ebene
   kontrolliert, pruefbar, reversibel

3. Commit-/Push-Ebene
   hart gegated, keine falschen Claims, keine scope-fremden Aenderungen

4. Memory-/Canon-Ebene
   nur gepruefte, wiederverwendbare Modellkorrekturen
```

Diese Trennung erlaubt fruehes Denken und spaete Strenge.

```text
Prediction darf falsch sein.
Code auf main darf nicht falsch sein.
Canon darf keine ungepruefte Prediction als Wahrheit speichern.
```

---

## 12. Anwendungsszenarien

### 12.1 Maya Reasoning Task

Maya soll vor einer komplexen Analyse ihr aktuelles Modell benennen.

Beispiel:

```text
Prediction:
Wenn der aktuelle Maya-UI-Block korrekt isoliert ist, betrifft der Diff nur /maya und nicht /chat.
```

Rueckfluss:

- Maya Reasoning nutzt das Delta spaeter bei UI-Isolationsentscheidungen.
- Handoff nennt den geprueften Scope.

### 12.2 Builder Repo Task

Builder soll vor Umsetzung eine testbare Erwartung formulieren.

Beispiel:

```text
Prediction:
Wenn die Aenderung korrekt ist, bleibt pnpm build gruen und der neue Helper veraendert keine Pipeline-Phase.
```

Rueckfluss:

- Builder Judge prueft Scope- und Build-Konsistenz.
- Agent Briefing erinnert bei aehnlichen Aufgaben an das Delta.

### 12.3 AICOS Card Review

AICOS soll neue Cards nicht nur nach Plausibilitaet bewerten.

Beispiel:

```text
Prediction:
Wenn diese Card nicht redundant ist, muss sie eine neue wiederverwendbare Modellkorrektur enthalten, die nicht bereits durch meta-007 oder sol-cross-043 abgedeckt ist.
```

Rueckfluss:

- Card Promotion Gate fordert Prediction-Power oder klare Nicht-Redundanz.

---

## 13. Wann kein Prediction-Gap-Eintrag erzeugt werden soll

Kein Eintrag sollte erzeugt werden, wenn:

- die Aufgabe rein clerical ist
- die Prediction trivial ist
- keine wiederverwendbare Modellkorrektur entsteht
- kein realistisches spaeteres Reuse-Ziel benannt werden kann
- nur Dokumentation umformuliert wird, ohne Modellkorrektur

---

## 14. Grenzen

Der Loop ist nicht fuer alles gleich stark.

Geringer Nutzen bei:

1. **Einfacher Codegenerierung**  
   Wenn Input/Output vollstaendig klar sind, ist die Prediction trivial.

2. **Kreativen oder geschmacklichen Aufgaben**  
   Aussagen wie "wirkt empathischer" sind schwer falsifizierbar.

3. **Langzeit-Predictions**  
   Architekturentscheidungen koennen oft erst Wochen spaeter geprueft werden.

4. **Reiner Dokumentationsarbeit**  
   Wenn kein Modell korrigiert wird, sollte kein Delta gespeichert werden.

---

## 15. Guardrails

- keine automatische Canon-Mutation
- keine Repo-Mutation ohne expliziten Scope
- keine Memory-Speicherung roher Beobachtungen
- keine Quellenwaesche
- keine Formulierung "Feynman sagt" ohne verifizierte Quelle
- Tests/Evidence entscheiden, nicht Intuition
- Predictions muessen falsifizierbar sein oder verworfen werden
- Surprise Nodes duerfen produktiv herausfordern, nicht zufaellig widersprechen
- kein Ledger-Eintrag zaehlt als Lernen ohne Reuse-Pfad
- kein neues Grossframework aus diesem Loop machen

---

## 16. Akzeptanzkriterien

Diese Spec gilt als akzeptabel, wenn:

- sie unter 2.000 Woerter bleibt oder bewusst als ausfuehrliche Draft-Spec markiert ist
- sie keine Implementierung enthaelt
- sie keine produktiven Workflows veraendert
- sie Hypothesis, Prediction, Evidence, Observed Gap, Model Update, Reusable Delta und Future Influence klar trennt
- sie mindestens drei gute und drei schlechte Prediction-Beispiele enthaelt
- sie erklaert, warum Memory nicht alles speichert
- sie erklaert, warum ein gespeichertes Delta ohne Rueckfluss nur Archiv ist
- sie an Meta-Cognition Pack v1 und Context Curator anschliesst, ohne beide umzubauen
- sie den Challenge Slot als Slot-Mechanismus definiert, nicht als Score-Bonus
- sie falsifizierbare Predictions erzwingt

---

## 17. Kurzform fuer Worker-Briefing

```text
Arbeite nicht antwortzentriert, sondern modellpruefend.
Formuliere vor dem Test eine falsifizierbare Prediction.
Pruefe sie gegen Realitaet.
Speichere nur die wiederverwendbare Modellkorrektur.
Benenne, wo diese Korrektur spaeter wieder genutzt wird.
Wenn keine spaetere Nutzung erkennbar ist, ist es kein Systemlernen, sondern Archiv.
```

---

## 18. Fazit

Der Prediction-Gap Learning Loop macht KI-Modelle nicht magisch intelligenter.

Er macht das Gesamtsystem disziplinierter, weniger selbsttaeuschungsanfaellig und lernfaehiger ueber mehrere Projekte hinweg.

Die wichtigste Architekturregel lautet:

```text
Systemintelligenz entsteht nicht aus mehr Kontext.
Systemintelligenz entsteht aus wiederverwendbaren Modellkorrekturen, die spaetere Entscheidungen beeinflussen.
```