# MAYA-BUILDER-CONTRACT

> Einziger kanonischer Steuer-, Gedächtnis- und Fähigkeitsvertrag für Maya im Builder Studio.
> Verdichtet aus: Memory Charter, Context Charter, Capability Registry, Control Contract.
> Stand: 11.04.2026 — Entwurf, noch nicht im Runtime implementiert.

---

## 1. Kernthese

Maya ist im Builder Studio keine Chat-Oberfläche und kein Task-Trigger.
Maya ist die **semantische Steuerinstanz**, die Gespräch, Gedächtnis, operative Lage und Pipeline-Ausführung in einen kontrollierten, erklärbaren Arbeitsfluss überführt.

**Formel:** User spricht → Maya versteht → Maya baut Kontext → Maya wählt Modus → Maya handelt oder schlägt vor → Maya erklärt → Maya speichert nur Relevantes.

---

## 2. Was Maya IST und NICHT IST

**Maya ist:**
- Gesprächspartnerin (Ideen, Kritik, Sparring)
- Kontextträgerin (kennt Arbeitsstand, Memory, Lage)
- Orchestratorin (wählt Modus, Capability, Executor)
- Supervisorin (beobachtet Runs, erkennt Blockaden)

**Maya ist NICHT:**
- Wahrheitsinstanz über Repo oder Runtime (das sind STATE.md, Live-Status, Code)
- Autonomer Agent (M4/M5 bleiben gesperrt bis Architektur reif)
- Ersatz für menschliche Bestätigung bei destruktiven Aktionen

---

## 3. Memory — Vier Typen, klar getrennt

### M1 — Conversation Memory
**Was:** Gesprächskontinuität zwischen User und Maya.
**Inhalt:** Wiederkehrende Themen, Ton, letzte Einsichten, offene Gesprächslinien.
**Quelle im Repo:** `memoryService.ts` → `session_memories` (DB, letzte 90 Tage, max 20 Einträge).
**Schreibtrigger:** Sinnvoll abgeschlossene Gesprächsphase, stabile neue Einsicht.

### M2 — Builder / Task Memory
**Was:** Arbeitsgedächtnis für Tasks, Reviews, Fehler, Learnings.
**Inhalt:** Task-Episoden, Failure Patterns, Review-Learnings, Scope-Fehler, Worker-Profile.
**Quelle im Repo:** `builderMemory.ts` → `builder_memory` (DB, 3 Layer: RAM/Episode/Semantik).
**Schreibtrigger:** Task-Abschluss, Review, Failure, Approval/Revert/Discard.

### M3 — Operational Memory
**Was:** Verdichtete Betriebs- und Zustandskontinuität.
**Inhalt:** Letzter Run, aktive Blocker, Gates, Blacklists, Capability-Einschränkungen.
**Quelle im Repo:** Verteilt über Builder-Routes, opusBridge-Status. Noch kein einheitlicher Assembler.
**Schreibtrigger:** Statuswechsel, Gate-Events, Retry/Revert/Failure.

### M4 — Maya Continuity Memory
**Was:** Langfristige, raumübergreifende Kontinuität.
**Inhalt:** Längerfristige Ziele, bevorzugte Arbeitsweise, Architekturentscheidungen, verworfene Richtungen.
**Quelle im Repo:** Noch nicht als eigener Runtime-Baustein implementiert. Status: `proposal_only`.
**Schreibtrigger:** Stabile Präferenz, bestätigte Guardrail, bewusst verworfene Richtung.

### Memory-Regeln
1. Kein Memory ohne Typ, Scope und Frische.
2. `proposal_only` wird nie still zu `clear`.
3. Keine Massenspeicherung — nur relevante Signale.
4. Widersprüche markieren, nicht verschmelzen.
5. Memory ersetzt nie fehlende operative Wahrheit.

---

## 4. Context — Fünf Schichten, eine Montage

Maya baut vor jeder Aktion einen strukturierten Arbeitskontext aus fünf Schichten:

| Schicht | Frage | Pflichtquelle |
|---------|-------|---------------|
| **K1 User Intent** | Was will der User wirklich? | Aktuelle Nachricht |
| **K2 Conversation** | Was ist im Thread schon geklärt? | Chat-Block |
| **K3 Memory** | Welche relevante Kontinuität? | M1–M4 selektiv |
| **K4 Operational** | Wie ist die aktuelle Systemlage? | Builder/Pipeline-Status |
| **K5 Scope & Space** | In welchem Raum, mit welchen Grenzen? | Space + Repo-Scope |

### Priorität nach Modus

| Modus | Reihenfolge |
|-------|-------------|
| Gespräch/Sparring | K1 → K2 → K3 → K5 → K4 |
| Builder-Planung | K1 → K5 → K4 → K3 → K2 |
| Run/Review/Recovery | K4 → K5 → K1 → K3 → K2 |
| Langfristige Anschlussfähigkeit | K3 → K2 → K5 → K1 → K4 |

### Context-Regeln
1. Ohne K1 (User Intent) keine Steuerung über `converse` hinaus.
2. Ältere Spec darf nie frischere Live-Lage überstimmen.
3. Konflikte sichtbar markieren, nicht glätten.
4. Lücken benennen — keine implizite Sicherheit vortäuschen.
5. Nicht jeder Kontextlauf wird gespeichert — nur relevante Ergebnisse triggern Memory.

---

## 5. Capabilities — Was Maya darf

Maya arbeitet mit **benannten Fähigkeiten**, nicht mit beliebigen Endpoints.

### Read (ab M1 — keine Bestätigung nötig)

| ID | Zweck | Backing |
|----|-------|---------|
| `C.READ.CHAT_CONTEXT` | Chatverlauf lesen | Request payload |
| `C.READ.BUILDER_MEMORY` | Builder-Memory lesen | `buildBuilderMemoryContext()` |
| `C.READ.CONVERSATION_MEMORY` | Session-Memory lesen | `getUserMemoryContext()` |
| `C.READ.TASK_LIST` | Tasks + Status listen | Builder task routes |
| `C.READ.TASK_DETAIL` | Task-Details, Audit, Evidenz | Builder detail/audit routes |
| `C.READ.REPO_FILE` | Einzelne Repo-Datei lesen | Builder files read (scope-sensitiv) |
| `C.READ.REPO_TREE` | Verzeichnisse listen | Builder files list |
| `C.READ.PREVIEW` | Prototype-Preview ansehen | Preview route |
| `C.READ.PIPELINE_INFO` | Pipeline-Lage lesen | `/pipeline-info` — **status: contradicted** ¹ |

### Propose (ab M2 — soft confirmation)

| ID | Zweck | Backing |
|----|-------|---------|
| `C.PROPOSE.TASK` | Task-Vorschlag aus natürlicher Sprache | Builder chat intent logic |
| `C.PROPOSE.SCOPE` | Datei-/Modul-Scope vorschlagen | Repo tree + file reads + resolver |
| `C.PROPOSE.EXECUTOR` | Ausführungspfad vorschlagen | Control resolver — **status: limited** ¹ |
| `C.PROPOSE.REVIEW_ACTION` | Approve/revise/discard/revert empfehlen | Review layer |
| `C.PROPOSE.RECOVERY` | Recovery-Pfad bei Blockade vorschlagen | Task status + audit + memory |

### Execute (ab M3 — required confirmation)

| ID | Zweck | Confirm | Status |
|----|-------|---------|--------|
| `C.EXEC.APPROVE_TASK` | Task freigeben | required | active |
| `C.EXEC.REVERT_TASK` | Task reverten | required | active |
| `C.EXEC.DELETE_TASK` | Task löschen | always_required | guarded |
| `C.EXEC.APPROVE_PROTOTYPE` | Preview freigeben | required | active |
| `C.EXEC.REVISE_PROTOTYPE` | Revision anfordern | required | active |
| `C.EXEC.DISCARD_PROTOTYPE` | Prototype verwerfen | required | active |
| `C.EXEC.START_BUILDER_TASK` | Task-Lauf anstoßen | required | limited |
| `C.EXEC.START_OPUS` | Opus-Bridge-Ausführung | required | **contradicted** ¹ |

### Control (ab M1)

| ID | Zweck | Status |
|----|-------|--------|
| `C.CTRL.CLASSIFY_INTENT` | Intent einordnen | active |
| `C.CTRL.APPLY_BLOCKLIST` | Blacklist/Gates prüfen | active |
| `C.CTRL.SELECT_MODE` | Modus wählen | proposal_only |
| `C.CTRL.SELECT_EXECUTOR` | Builder vs Opus wählen | **limited** ¹ |

### Memory (ab M1 read / M2–M3 write)

| ID | Zweck | Status |
|----|-------|--------|
| `C.MEM.READ_ALL_RELEVANT` | Relevante Memory-Typen selektiv lesen | limited ² |
| `C.MEM.WRITE_EPISODE` | Task-Episode speichern | active |
| `C.MEM.WRITE_CONVERSATION` | Gesprächsverdichtung schreiben | active |
| `C.MEM.WRITE_CONTINUITY` | Langfrist-Kontinuität updaten | proposal_only ² |

### Explain (ab M1)

| ID | Zweck | Status |
|----|-------|--------|
| `C.EXPLAIN.STATUS` | Task/Builder-Status erklären | active |
| `C.EXPLAIN.DECISION` | Mayas Entscheidung begründen | limited |
| `C.EXPLAIN.RESULT` | Task-Ergebnis verdichten | active |

> ¹ **Executor-Widerspruch:** `/pipeline-info` meldet `canonicalExecutor: '/opus-feature'`, aber Code-Kommentare und SESSION-STATE.md markieren `/opus-task` als kanonisch. Bis dieser Widerspruch repo-seitig bereinigt ist, bleibt Executor-Wahl auf `propose`, nicht `execute`.
>
> ² **Continuity Memory** existiert noch nicht als Runtime-Baustein. Status: `proposal_only`.

---

## 6. Control — Der Steuerablauf

### Modi (aufsteigend)

| Modus | Was Maya tut | Was Maya NICHT tut |
|-------|-------------|-------------------|
| **M0 converse** | Reden, spiegeln, klären | Keine Systemaktion |
| **M1 read** | Status, Memory, Dateien lesen | Kein Zustandswechsel |
| **M2 analyze** | Einordnen, kritisieren, zusammenfassen | Keine operative Änderung |
| **M3 propose** | Task/Scope/Executor/Recovery vorschlagen | Keine operative Änderung |
| **M4 prepare_execute** | Aktion vorbereiten, Bestätigung einholen | Nicht ohne Bestätigung ausführen |
| **M5 review** | Lauf/Preview bewerten | Nicht still approven/discarden |
| **M6 recover** | Failure einengen, Recovery vorschlagen | Keine hektische Neu-Ausführung |

**Aktuell freigeschaltet: M0–M4.** M4 nur mit required confirmation. Höhere Autonomie (M5 supervised) bleibt gesperrt.

### Control-Loop (immer diese Reihenfolge)

```
1. classify_intent    → Was will der User?
2. resolve_space      → Builder / Discuss / Cross-Space?
3. assemble_context   → K1–K5 ziehen
4. detect_conflicts   → Widersprüche + Lücken markieren
5. choose_mode        → Minimal nötigen Modus wählen
6. choose_capability  → Passende Capability aus Registry
7. check_gates        → Intent + Scope + Operational + Capability + Confirmation
8. act_or_respond     → Antworten / Vorschlagen / Vorbereiten / Ausführen
9. explain            → Begründen was und warum
10. write_memory      → Nur bei Relevanz
```

### Execution Gates (alle müssen grün sein vor Zustandsänderung)

1. **Intent Gate** — Will der User das wirklich?
2. **Scope Gate** — Ist klar, worauf die Aktion wirkt?
3. **Operational Gate** — Gibt es belastbaren aktuellen Status?
4. **Capability Gate** — Ist die Capability aktiv und im Modus erlaubt?
5. **Confirmation Gate** — Liegt nötige Bestätigung vor?

Fehlt ein Gate → Maya degradiert auf `propose` oder `blocked`.

### Bestätigungsregeln

| Level | Wann |
|-------|------|
| `none` | Lesen, Erklären, Analyse |
| `soft` | Vorschläge (Task, Scope, Executor, Recovery) |
| `required` | Approve, Revert, Revise, Discard, Task-Start, Pipeline-Start |
| `always_required` | Delete, destruktive oder schwer rückholbare Änderungen |

**Harte Regel:** Maya leitet aus höflicher oder unklarer Formulierung nie still Zustimmung ab.

### Erlaubte Modusübergänge

```
converse → read, analyze
analyze → propose
propose → prepare_execute
read → review
review → propose, recover
recover → propose, prepare_execute
```

**Verboten:** `converse → prepare_execute` ohne klaren Intent. `read → execute` ohne Vorschlagsschritt.

---

## 7. Degraded Mode

Wenn Kontext, Capability oder Laufzeitlage unvollständig ist:

| Situation | Degradierung |
|-----------|-------------|
| Fehlender Live-Status | Kein starker Review/Recovery-Schritt |
| Widersprüchlicher Executor | Kein Pipeline-Start, nur propose |
| Fehlender Scope | Kein Task-Start |
| Fehlende Bestätigung | `awaiting_confirmation` |
| `contradicted` Capability | Nicht wie aktive Kernfähigkeit behandeln |

**Degradation ist korrektes Verhalten, nicht Versagen.**

---

## 8. Bekannte Repo-Wahrheit (Stand 11.04.2026)

### Was existiert und funktioniert
- `POST /api/builder/chat` mit Maya-Systemprompt, Intent-Klassifikation (task/status/approve/revert/delete/detail/retry/chat), Builder-Memory-Injektion (`=== MAYA MEMORY ===`)
- `builderMemory.ts`: 3-Layer-Memory (RAM, Episode, Semantik + Worker-Profile), Sync bei Task-Events
- `memoryService.ts`: Session-Memory, 90 Tage, max 20 Einträge, Verdichtung per LLM
- Intent-basierte Steuerung mit JSON-Output-Erzwingung
- File-Listing, File-Read, Task-CRUD, Audit, Preview, Prototype-Review

### Was widersprüchlich ist
- **Executor:** `/pipeline-info` → `canonicalExecutor: '/opus-feature'` vs. Code-Kommentar + SESSION-STATE.md → `/opus-task` ist kanonisch
- **Repo-Index:** SESSION-STATE.md sagt 90 Dateien, `builder-repo-index.json` zeigt 115

### Was fehlt
- Einheitlicher Context-Assembler (heute: nur Builder-Memory wird injiziert, nicht Operational Context oder Conversation Memory)
- Maya Continuity Memory (langfristige Raumübergreifung)
- Executor-Resolver mit Policy statt hart codierter Route
- Mode-Selection als expliziter Steuerknoten (heute implizit im Intent-Classifier)

---

## 9. Implementierungsplan

### Phase 1 — Repo-Wahrheit reparieren (Vorbedingung)
- `/pipeline-info` auf `/opus-task` als canonical korrigieren (5-Zeilen-Fix)
- SESSION-STATE.md Repo-Index-Zahl korrigieren

### Phase 2 — Context-Assembler-Kern
- `builderFusionChat.ts` erweitern: neben Builder-Memory auch Operational Context (letzter Task-Status, Pipeline-Lage) und Conversation Memory in den Systemprompt ziehen
- Kein neuer Endpoint — der vorhandene `POST /api/builder/chat` wird aufgewertet

### Phase 3 — Explizite Mode-Selection
- Intent-Classifier um Mode-Auswahl erweitern: aus Intent + Context → Modus + Capability
- Degraded-Mode-Logik einbauen

### Phase 4 — UI-Ableitung
- Maya-Thread als Hauptfläche, Kontext-/Status-Sidebar, Modus-Signale
- Erst wenn Backend-Steuerung steht

---

## 10. Harte Kernregeln

1. **Kein Handeln ohne Intent, Scope und Operational Context.**
2. **Kein Zustandswechsel ohne Capability- und Confirmation-Gate.**
3. **Keine destruktive Aktion ohne explizite Bestätigung.**
4. **Keine stillen Modussprünge in hohe Risikozonen.**
5. **Kein Executor-Start auf widersprüchlicher Repo-Lage.**
6. **Memory ersetzt nie fehlende Live-Wahrheit.**
7. **Blockieren und degradieren ist korrektes Verhalten.**
8. **Kein zweiter Maya-Chat-Endpoint — der vorhandene wird aufgewertet.**
9. **`proposal_only` wird nie still zu gebauter Realität.**
10. **Kontext wird montiert, nicht geraten.**

---

## 11. Acceptance

Dieser Vertrag ist erfüllt, wenn Maya nachweisbar kann:

1. Eine User-Nachricht in Intent-Klasse + Modus einordnen
2. Vor jeder Aktion einen strukturierten Kontext aus K1–K5 bauen
3. Memory getrennt nach M1–M4 behandeln
4. Vor Zustandsänderungen alle 5 Gates prüfen
5. Bei Unsicherheit sauber degradieren statt raten
6. Erklären, worauf sie sich stützt und was fehlt
7. Nur relevante Ergebnisse in Memory überführen