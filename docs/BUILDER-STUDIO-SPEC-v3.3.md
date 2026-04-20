# BUILDER STUDIO — Soulmatch Self-Development Engine
## Spec v3.3 (Final Pre-Build)

**Datum:** 03. April 2026
**Autoren:** Claude Opus 4.6 + ChatGPT 5.4 + Gürcan Dişlioğlu
**Bewertung:** ChatGPT 94/100 für v3.2 + Reuse-First Architektur-Regel
**Status:** Eingefroren — bereit für Phase B1
**Modul:** M10_builder

> **Umsetzungs-Stand (Stichtag S34, 2026-04-20):** Weitgehend produktiv auf `main`. Live: Reuse-First-Prinzip (R1/R2/R3), Builder-UI unter `/builder`, Pool-System (Maya/Council/Worker/Scout/Destillierer), Agent-Habitat mit `builder_agent_profiles`-Tabelle, Canary-Stage-System, atomare Mehrdatei-Commits via Git Data API, Session-Log-Endpoint mit SHA-Backfill (S34), Pool-Config-Persistenz (F7). Offen: S31-False-Positive-Pipeline-Path-Fix (SHA-Verify in `opusSmartPush.ts`, Workflow-Härtung, Orchestrator-Status-Treue). Diese Spec bleibt als Vision-Dokument stehen; der tatsächliche Code-Stand liegt in `STATE.md` und den Handoffs S24–S34.

**v3.3 Changelog:**
- NEU: Architektur-Regel REUSE-FIRST (R1, R2, R3)
- NEU: `@FIND_PATTERN` als Pflichtschritt in Code Lane
- NEU: `reuse_check` im Review-Block
- NEU: `reuse_check_required` in allen Policy Profiles
- NEU: Architecture Tree — lebendige Projekt-Landkarte (`ARCHITECTURE-TREE.json`)
- Code Lane Flow aktualisiert: `@READ → @FIND_PATTERN → @PLAN → @PATCH`

---

## Vision

Soulmatch wird ihr eigener Entwickler. Zwei starke KIs arbeiten
als Duo innerhalb der App. Gürcan gibt die Richtung vor, sieht
Prototypen in der App, und genehmigt Pushes abends.

---

## Architektur-Regel: REUSE-FIRST

**Herkunft:** Arcana Studio Mic-Bug, 03. April 2026.
Drei Stunden Debugging, fünf Commits, weil `ArcanaCreatorChat.tsx`
ein eigenes Audio/Mic-System gebaut hat — obwohl `DiscussionChat.tsx`
das identische Problem längst gelöst hatte.

### Das Prinzip

**Bevor eine Zeile neuer Code geschrieben wird, muss die Codebase
nach einer existierenden Lösung durchsucht werden.**

Gilt für Claude UND ChatGPT in allen Lanes.

### R1 — SEARCH BEFORE BUILD

Vor jedem @PLAN muss ein @FIND_PATTERN laufen:
```
@FIND_PATTERN intent:"mic stummschalten während audio spielt"
  → Suche: grep -rn "setPlaybackActive\|pauseSpeech\|stopListening"
  → Treffer: DiscussionChat.tsx Zeile 232-261
  → Urteil: REUSE (exaktes Pattern übernehmen)
```

Mögliche Urteile:
- **REUSE** — Existierendes Pattern 1:1 kopieren
- **ADAPT** — Pattern existiert, braucht kleine Anpassung (dokumentieren warum)
- **NEW** — Nichts Vergleichbares gefunden (Beweis-Pflicht, siehe R3)

### R2 — COPY OVER ABSTRACT

Wenn ein Pattern in Modul A funktioniert und Modul B das gleiche
Problem hat: **den Code kopieren, nicht abstrahieren.**

Abstraktion ist Wave-2. In der Build-Phase zählt nur: funktioniert es?
Premature Abstraction ist ein eigener Bug-Typ.

```
✅ GUT:  pauseSpeechForAudio() aus DiscussionChat.tsx
         → identische Funktion in ArcanaCreatorChat.tsx

❌ SCHLECHT: Neuen "AudioMicManager" Service erfinden der
            theoretisch für beide Module funktioniert
```

### R3 — BEWEIS-PFLICHT BEI NEUEM CODE

Wenn eine KI neuen Code schreiben will statt existierenden zu
übernehmen, muss sie im @PLAN dokumentieren:

```
@PLAN {
  reuse_search: "@FIND_PATTERN → 0 Treffer für 'X'"
  why_new: "Kein vergleichbares Pattern in der Codebase"
  alternative_considered: "DiscussionChat.tsx nutzt Y,
    aber passt nicht weil Z"
}
```

Ohne diese Felder: @PLAN wird vom Reviewer abgelehnt.

### Beispiel: Ohne vs. Mit Reuse-First

**Ohne (was am 03.04.2026 passiert ist):**
```
Task: Mic soll während Maya-Audio stumm sein
→ @PLAN: setPlaybackActive(true/false) in Audio-Events
→ 3 Stunden, 5 Commits, funktioniert immer noch nicht
```

**Mit Reuse-First:**
```
→ @FIND_PATTERN: grep -rn "setPlaybackActive" client/src/
  Treffer: DiscussionChat.tsx — pauseSpeechForAudio() + scheduleResumeSpeechAfterAudio()
→ Urteil: REUSE
→ @PLAN: Beide Funktionen 1:1 nach ArcanaCreatorChat.tsx kopieren
→ 15 Minuten, 1 Commit
```

---

## Sechs Prüf-Lanen

```
P. PROTOTYPE LANE  → Vorschau vor dem Bau (für UI/Flow-Tasks)
A. CODE LANE       → Code lesen = UI sehen
X. COUNTEREXAMPLE  → "Wie kann das scheitern?"
B. RUNTIME LANE    → API aufrufen = App bedienen (Hauptwahrheit)
C. BROWSER LANE    → Playwright = visuelle Wahrheit (bei UI-Tasks)
D. REVIEW LANE     → Dual-Review + UX-Heuristik + Disagreement Score
```

### Lane P — Prototype Lane

**Ziel:** Feature sehen bevor es gebaut wird.

Zwei Varianten, je nach Bedarf:

**Variante A — HTML Quick Preview (schnell, 10 Sekunden):**
Claude erzeugt eine einzelne HTML-Datei mit inline CSS/JS.
Server speichert sie temporär und rendert sie unter `/builder/preview/:taskId`.
Gut für: erste Layout-Ideen, Farb-/Spacing-Tests, schnelle Skizzen.
Kein React, kein Build, keine Deps — nur eine statische Seite.

```
@PROTOTYPE route:"/builder/preview/T042" kind:"html" {
  <!DOCTYPE html>
  <html><head><style>
    body { background: #0f0f17; color: #e5e4ee; font-family: 'DM Sans'; }
    .panel { display: grid; grid-template-columns: 220px 1fr 540px; }
  </style></head>
  <body><div class="panel">...</div></body></html>
}
```

**Variante B — React Component Preview (promoteable):**
Claude erzeugt eine temporäre React-Komponente mit Mock-Daten.
Wird unter `/builder/preview/:taskId` in einem isolierten Render-Frame geladen.

```
@PROTOTYPE route:"/builder/preview/T042" kind:"react" interactive:true
@PREVIEW_SCREEN name:"initial_state"
@PREVIEW_SCREEN name:"after_user_input"
@PREVIEW_REVIEW {
  verdict: ok|revise|discard
  layout_clarity: good|mixed|poor
  primary_action_visibility: good|mixed|poor
  ux_risk: ["CTA zu schwach"]
  promotion_readiness: ready|needs_revision|reject
}
@PROMOTE {
  approved: ["layout","component_structure","copy"]
  exclude: ["mock_handlers"]
}
```

**Zwei Arten von Preview:**
- **Throwaway:** Nur zum Zeigen, kann danach weg
- **Promoteable:** So gebaut dass Code direkt übernommen werden kann

**Empfehlung:** Fast immer promoteable. Spart den doppelten Bau.

**Task-Flow mit Prototype Lane:**
```
TASK → CLASSIFY → PROTOTYPE → Gürcan sieht Vorschau
  → approve_prototype → BUILD (Code+Runtime+Review)
  → revise_prototype  → Zurück zu PROTOTYPE
  → discard           → Task abbrechen
```

### Lane A — Code Lane (aktualisiert v3.3)

```
@READ @READ_UI @READ_STYLES @TRACE_FLOW
@FIND_PATTERN              ← NEU in v3.3: Pflicht vor @PLAN
@PLAN @PATCH @APPLY
```

**@FIND_PATTERN ist Pflicht vor jedem @PLAN.**
Ohne dokumentiertes Suchergebnis wird der Plan vom Reviewer abgelehnt (siehe Reuse-First R1-R3).

### Lane X — Counterexample Lane

**Ziel:** Aktiv suchen wie der Fix scheitern kann.

Nur für medium/high risk Tasks. Nach dem Plan, vor Runtime-Tests.

```
@COUNTEREXAMPLE {
  scenario: "text_delta kommt vor filler_text"
  likelihood: medium
  impact: high
  test: @CALL POST /api/arcana/chat body:{...} → @EXPECT filler_text before text_delta
}

@FAILURE_PATH name:"stream_interrupt" {
  step: "SSE connection drops during TTS wait"
  expected: "Player shows filler audio, main audio never arrives"
  mitigation: "Timeout fallback in frontend"
  test: @CALL ... timeout:2s → @EXPECT error within:3s
}

@GOLDEN_PATH name:"happy_flow" {
  step: "User tippt, Maya antwortet, Audio spielt"
  test: @SSE ... { @EXPECT filler within:3s, text_delta within:10s, audio within:25s }
}
```

**Reviewer oder Observer muss 1-3 Gegenbeispiele liefern.**
Erst wenn Golden Path + Failure Paths getestet sind → weiter zu Runtime Lane.

### Lane B — Runtime Lane

```
@CALL method:POST path:/api/... body:{...} stream:true intent:flow_test
@EXPECT @EXPECT_JSON @DB_READ @DB_VERIFY @DB_COUNT @READ_LOGS
```

Allowlisted Endpoints. Intent-basiert. Keine freien SQL-Strings.

### Lane C — Browser Lane

Pflicht bei sichtbaren Änderungen. Kein push_candidate ohne Browser Lane
bei Typ B/C Tasks.

### Lane D — Review Lane (aktualisiert v3.3)

**Dual-Review + UX-Heuristik + Disagreement Score + Täuscht-Prüfung + Reuse-Check.**

```
@REVIEW {
  verdict: ok|issue|block
  lane: code|runtime|browser|overall
  scope_ok: true|false
  blocking: true|false
  notes: [...]

  reuse_check: {
    searched_codebase: true|false
    existing_pattern_found: true|false
    pattern_reused: true|false|adapted
    justification_if_new: "..."
  }

  ux_heuristic: {
    primary_action_visible: true|false
    state_clarity: good|mixed|poor
    unnecessary_dominance: false
    wait_time_bridged: true|false
    user_interpretation_needed: low|medium|high
  }

  false_success_check: {
    appears_working: true
    actually_working: true|false
    product_value: high|medium|low|none
    notes: "Filler spielt, aber User bemerkt keinen Unterschied"
  }

  agreement: {
    level: high|medium|low
    dissent_points: [...]
  }
}
```

**Wenn `searched_codebase: false` → automatisch `verdict: block`.**

---

## BDL v2 — Builder Dialog Language

### Design-Prinzipien

1. **Kompakt:** 70-80% weniger Tokens als Prosa
2. **Maschinenlesbar:** Jede Zeile ist parsebar
3. **Menschenlesbar:** Gürcan kann im Dev-Modus mitlesen
4. **Bidirektional:** Gleiche Syntax für Claude und ChatGPT

### BDL Syntax

```
@BEFEHL [parameter] {optionaler body}
```

### Befehle

```
── TASK-STEUERUNG ──

@TASK id:T001 goal:"Fix filler text" risk:low
  scope: [ArcanaCreatorChat.tsx]
  not_scope: [server/, StudioPage]

@CLASSIFY tier:1|2|3 reason:"kurze Begründung"

── CODE-OPERATIONEN ──

@READ file:client/src/.../ArcanaCreatorChat.tsx lines:230-260
@READ_UI @READ_STYLES @TRACE_FLOW

@FIND_PATTERN intent:"beschreibung was gesucht wird"
  → Suche + Treffer + Urteil: REUSE|ADAPT|NEW

@PLAN {
  reuse_search: "@FIND_PATTERN → Treffer/0 Treffer"
  why_new: "nur wenn NEW"
  Frei-Text Erklärung (kurz, max 3 Sätze)
}

@PATCH file:client/src/.../ArcanaCreatorChat.tsx {
  -L237: alter Code
  +L237: neuer Code
}

@APPLY   ← Server führt den Patch aus (fs.writeFile)

── PRÜFUNG ──

@CHECK tsc      ← Server: exec('tsc --noEmit')
@CHECK build    ← Server: exec('vite build')
@CHECK diff     ← Server: exec('git diff')

── REVIEW ──

@REVIEW {
  verdict: ok|issue|block
  scope_ok: true|false
  reuse_check: { searched_codebase: true, ... }
  notes: "kurze Begründung"
  fix: @PATCH {...}   ← optional: inline Fix-Vorschlag
}

── ENTSCHEIDUNG ──

@APPROVE
@REQUEST_CHANGE { notes: "was fehlt" }
@BLOCK { reason: "warum" }
@OBSERVE {
  side: claude|chatgpt|neither
  reason: "Begründung"
}

── GIT ──

@STAGE files:[ArcanaCreatorChat.tsx]
@COMMIT msg:"fix(arcana): separate filler state"
@STATUS

── KOMMUNIKATION ──

@SAY { Frei-Text für Gürcan im Dev-Modus }
@AGREE
@DISAGREE { grund }
```

### DSL ↔ Klartext Toggle

Im Dev-Modus wechselt Gürcan zwischen zwei Ansichten:

**DSL-Modus:** Roher BDL-Dialog (kompakt, technisch)
**Klartext-Modus:** Server übersetzt BDL in lesbares Deutsch via Gemini:

```
DSL:  @PATCH file:...tsx { -L237: splice-logik +L237: setFillerText }
TEXT: "Claude ersetzt die alte Filler-Splice-Logik in Zeile 237
       durch einen einfachen setFillerText-Aufruf."
```

Übersetzungskosten: ~20 Tokens pro Nachricht (Gemini Flash).

---

## Architektur

```
┌──────────────────────────────────────────────────────────────┐
│                    SOULMATCH SERVER (Node.js)                  │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │                    DIALOG BUS (BDL)                      │  │
│  │  Alle KIs kommunizieren über Builder Dialog Language      │  │
│  └────┬──────────┬──────────┬──────────┬──────────────────┘  │
│       │          │          │          │                      │
│  ┌────▼───┐ ┌────▼───┐ ┌────▼───┐ ┌────▼─────┐              │
│  │ GEMINI │ │ CLAUDE │ │CHATGPT │ │OBSERVER  │              │
│  │ Scout  │ │Architkt│ │Reviewer│ │Tie-Break │              │
│  │ $0.001 │ │ $0.03  │ │ $0.005 │ │ $0.003   │              │
│  │ /task  │ │ /task  │ │ /task  │ │ optional │              │
│  └────────┘ └────────┘ └────────┘ └──────────┘              │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │                   EXECUTION ENGINE                       │  │
│  ├──────────┬──────────┬──────────┬───────────────────────┤  │
│  │ FILE I/O │ EXECUTOR │ SELF-TEST│ DB ACCESS             │  │
│  │ read     │ tsc      │ fetch()  │ SELECT/INSERT         │  │
│  │ write    │ build    │ SSE read │ Verify state          │  │
│  │ diff     │ git      │ Assert   │                       │  │
│  └──────────┴──────────┴──────────┴───────────────────────┘  │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │                   TASK DATABASE                          │  │
│  │  builder_tasks | builder_actions | builder_reviews        │  │
│  │  builder_test_results | builder_artifacts                 │  │
│  └─────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
          │
          ▼
┌──────────────────────────────────────────────────────────────┐
│              BUILDER STUDIO UI (Dev-Modus)                     │
│  ┌──────────┬──────────────────────┬───────────────────────┐  │
│  │ Dateien  │  KI-Dialog (BDL)     │  Task + Status        │  │
│  │ Explorer │  Claude ↔ ChatGPT    │  Diff + Checks        │  │
│  │          │  [DSL] [Klartext]    │  Test-Results          │  │
│  │          │                      │  [Push] [Revert]       │  │
│  ├──────────┴──────────────────────┴───────────────────────┤  │
│  │  Task Queue: T001 ✅ | T002 🔄 | T003 ⏳ | T004 ⏳      │  │
│  └─────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

---

## Policy Profiles (aktualisiert v3.3)

Statt allgemeiner Guardrails: **Task-spezifische Regeln.**

Alle Profiles enthalten jetzt `reuse_check_required: true` (Default).

```json
{
  "profiles": {
    "api_sse_fix": {
      "required_lanes": ["code", "runtime", "review"],
      "optional_lanes": ["browser"],
      "allowed_tools": ["READ", "FIND_PATTERN", "PATCH", "CALL", "EXPECT", "DB_VERIFY"],
      "forbidden_files": ["package.json", "db.ts"],
      "auto_needs_human_review": false,
      "max_rounds": 4,
      "counterexamples_required": false,
      "reuse_check_required": true
    },
    "ui_layout": {
      "required_lanes": ["code", "prototype", "browser", "review"],
      "optional_lanes": ["runtime"],
      "allowed_tools": ["READ", "READ_UI", "FIND_PATTERN", "PATCH", "PROTOTYPE", "UI_RUN"],
      "forbidden_files": ["server/", "db.ts"],
      "auto_needs_human_review": false,
      "max_rounds": 5,
      "counterexamples_required": false,
      "reuse_check_required": true
    },
    "form_flow": {
      "required_lanes": ["code", "prototype", "runtime", "browser", "review"],
      "optional_lanes": ["counterexample"],
      "allowed_tools": ["*"],
      "forbidden_files": ["db.ts", ".env"],
      "auto_needs_human_review": false,
      "max_rounds": 6,
      "counterexamples_required": true,
      "reuse_check_required": true
    },
    "arch_sensitive": {
      "required_lanes": ["code", "counterexample", "runtime", "review"],
      "optional_lanes": ["browser"],
      "allowed_tools": ["READ", "TRACE_FLOW", "FIND_PATTERN", "PATCH", "CALL", "EXPECT"],
      "forbidden_files": ["builder.ts", "db.ts", ".env", "package.json"],
      "auto_needs_human_review": true,
      "max_rounds": 8,
      "counterexamples_required": true,
      "reuse_check_required": true
    },
    "db_sensitive": {
      "required_lanes": ["code", "counterexample", "runtime", "review"],
      "optional_lanes": [],
      "allowed_tools": ["READ", "FIND_PATTERN", "PATCH", "DB_READ", "DB_VERIFY"],
      "forbidden_files": [".env", "package.json"],
      "auto_needs_human_review": true,
      "max_rounds": 6,
      "counterexamples_required": true,
      "reuse_check_required": true
    },
    "refactor_safe": {
      "required_lanes": ["code", "review"],
      "optional_lanes": ["runtime"],
      "allowed_tools": ["READ", "FIND_PATTERN", "PATCH", "CHECK"],
      "forbidden_files": ["db.ts", ".env"],
      "auto_needs_human_review": false,
      "max_rounds": 3,
      "counterexamples_required": false,
      "reuse_check_required": false
    }
  }
}
```

---

## Product Intent Card

Jeder Task bekommt drei Pflichtfelder:

```json
{
  "intent": {
    "why": "User wartet 10s auf Maya, Filler überbrückt die Wartezeit",
    "user_outcome": "User hört sofort Mayas Stimme, fühlt sich nicht ignoriert",
    "false_success": "Filler spielt, aber User bemerkt keinen Unterschied
                      weil Filler-Audio nach 0.5s schon vorbei ist"
  }
}
```

Claude und ChatGPT prüfen am Ende: **Wurde das Intent erreicht, oder nur
der Code gefixt?**

---

## Evidence Pack

Jeder abgeschlossene Task erzeugt automatisch ein Prüf-Paket:

```json
{
  "task_id": "T001",
  "evidence_pack": {
    "intent": { "why": "...", "user_outcome": "...", "false_success": "..." },
    "scope_files": ["ArcanaCreatorChat.tsx", "arcana.ts"],
    "base_commit": "33f0b0e",
    "head_commit": "8a3cab6",
    "diff_stat": "2 files, +12 -18",
    "reuse_search": { "patterns_found": 1, "reused": true, "source": "DiscussionChat.tsx" },
    "checks": { "tsc": "pass", "build": "pass" },
    "runtime_results": [
      { "test": "filler_appears", "result": "pass", "details": "filler in 1.2s" },
      { "test": "audio_arrives", "result": "pass", "details": "audio in 14.2s" }
    ],
    "counterexamples_tested": 2,
    "counterexamples_passed": 2,
    "reviews": {
      "claude": { "verdict": "pass", "confidence": 0.9 },
      "chatgpt": { "verdict": "pass", "confidence": 0.85 }
    },
    "agreement_level": "high",
    "final_status": "push_candidate",
    "false_success_detected": false
  }
}
```

---

## Kanonischer Statussatz

Zentral definiert, gültig für DB, API, UI und Gate-Logik:

```typescript
const BUILDER_STATUS = [
  'queued',              // Task wartet
  'classifying',         // Gemini bestimmt Tier/Typ/Profil
  'prototyping',         // Preview wird erzeugt (nur Typ P)
  'prototype_review',    // Gürcan prüft Vorschau
  'planning',            // Claude plant + patcht
  'counterexampling',    // Gegenbeispiele werden erzeugt
  'applying',            // Server wendet Patches an
  'checking',            // tsc + build
  'testing',             // Runtime Lane (@CALL, @EXPECT)
  'browser_testing',     // Playwright (nur Typ B/C)
  'reviewing',           // Dual-Review
  'push_candidate',      // Alles grün, Push wartet
  'needs_human_review',  // Ambivalent, Gürcan muss prüfen
  'review_needed',       // KI-Review hat Issues gefunden
  'blocked',             // Harter Blocker
  'done',                // Gepusht und abgeschlossen
  'reverted',            // Zurückgenommen
  'discarded',           // Task/Prototype verworfen
] as const;
```

---

## Task-Typen

| Typ | Beschreibung | Profil | Prototype |
|-----|-------------|--------|-----------|
| A | API/SSE/Backend | api_sse_fix | Nein |
| B | UI/Layout/UX | ui_layout | Ja |
| C | Form/Flow (E2E) | form_flow | Ja |
| D | Pure Refactor | refactor_safe | Nein |
| P | Prototype-first | ui_layout / form_flow | Pflicht |
| S | Architektur-sensitive | arch_sensitive | Optional |

---

## Vollständiger Task-Flow (v3.3)

```
 1. QUEUE           Gürcan erstellt Task (Text oder Sprache)
 2. CLASSIFY        Gemini: Tier + Typ + Policy Profile zuweisen
 3. INTENT          Product Intent Card ausfüllen (why/outcome/false_success)
 4. PROTOTYPE       [Typ B/C/P] Preview erzeugen → Gürcan gibt frei
 5. CODE LANE       Claude: @READ → @FIND_PATTERN → @PLAN → @PATCH
                                      ^^^^^^^^^^^^^^
                                      NEU v3.3: Pflicht vor Plan
 6. REVIEW-1        ChatGPT: Code-Review (inkl. reuse_check)
 7. COUNTEREXAMPLE  [medium/high] Gegenbeispiele + Failure Paths
 8. APPLY           Server: Patches im Worktree anwenden
 9. CHECK           tsc + build
10. RUNTIME LANE    @CALL → @EXPECT → @DB_VERIFY
11. BROWSER LANE    [Typ B/C] Playwright
12. REVIEW-2        Dual-Review: UX-Heuristik + Täuscht-Prüfung + Agreement
13. OBSERVER        [Bei Dissens] DeepSeek entscheidet
14. EVIDENCE        Evidence Pack generieren
15. STATUS          → push_candidate | needs_human_review | blocked
16. MERGE           NUR bei push_candidate: Worktree in main mergen
17. FREIGABE        Gürcan: Push-Button im Dev-UI
```

---

## Sicherheits-Gates

### Gate 1: Scope-Enforcement

```typescript
const BLACKLIST = [
  'server/src/routes/builder.ts',
  'server/src/lib/builderEngine.ts',
  'server/src/db.ts',
  '.env',
  'package.json',
  'node_modules/',
];
```

Jeder @APPLY wird gegen task.scope + Blacklist geprüft. Verstöße → @BLOCK.

### Gate 2: Keine Destruktiven Operationen

Kein `rm -rf`, `DROP TABLE`, `DELETE FROM`, `git push`, `git force`, `npm publish`.

### Gate 3: Rollback via Worktree

```typescript
import os from 'os';
const worktreeBase = path.join(os.tmpdir(), `builder-${taskId}`);
exec(`git worktree add ${worktreeBase} HEAD`);

// Alle Patches im Worktree. Checks im Worktree.
// Erfolg → Worktree-Commit in main mergen
// Fail → Worktree wegwerfen
exec(`git worktree remove ${worktreeBase} --force`);
```

### Gate 4: Token-Budget

Low: 2.000 | Medium: 5.000 | High: 10.000
Überschreitung → `blocked` mit Hinweis.

### Gate 5: Kein Auto-Push

`git push` existiert NICHT im Code. Push nur via `/api/builder/tasks/:id/approve`.

### Gate 6: Self-Test Isolation

@CALL nur gegen localhost. Testdaten mit `builder_test_${taskId}` Prefix.
Cleanup nach Task: `DELETE FROM ... WHERE created_by = 'builder-test'`.

---

## Canary Mode

```
Woche 1-2:
  - Nur low-risk Tasks
  - Nur Scope ≤ 2 Dateien
  - Nur Profile: api_sse_fix, refactor_safe
  - Max 2 Tasks pro Tag

Woche 3-4:
  - + medium-risk Tasks
  - + Profile: ui_layout, form_flow
  - Max 5 Tasks pro Tag
  - Prototype Lane aktiv

Woche 5+:
  - + high-risk Tasks
  - + Profile: arch_sensitive, db_sensitive
  - Counterexample Lane aktiv
  - Voller Betrieb
```

Erst nach 10 grünen Tasks pro Stufe → nächste Stufe freischalten.

---

## UX Heuristic Review

Fünf feste Fragen bei jedem UI-relevanten Task:

```
1. Ist die Hauptaktion sofort sichtbar?
2. Ist der aktuelle Zustand klar erkennbar?
3. Ist etwas unnötig dominant oder ablenkend?
4. Muss der Nutzer zu viel interpretieren?
5. Ist Wartezeit gut überbrückt?
```

Teil des @REVIEW-Blocks als `ux_heuristic` Objekt.

---

## "Täuscht"-Erkennung

```
nicht nur: klappt / klappt nicht
sondern auch: TÄUSCHT ERFOLG VOR

→ intern sauber, extern kaum spürbar
→ UI geändert, aber Nutzer merkt keinen Gewinn
→ Review grün, Produktwert niedrig
```

Teil des @REVIEW-Blocks als `false_success_check` Objekt.

---

## Datenmodell (Drizzle)

```typescript
export const builderTasks = pgTable('builder_tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 200 }).notNull(),
  goal: text('goal').notNull(),
  risk: varchar('risk', { length: 10 }).notNull().default('low'),
  taskType: varchar('task_type', { length: 5 }).notNull().default('A'),
  policyProfile: varchar('policy_profile', { length: 30 }),
  scope: jsonb('scope').$type<string[]>().notNull().default([]),
  notScope: jsonb('not_scope').$type<string[]>().notNull().default([]),
  requiredLanes: jsonb('required_lanes').$type<string[]>().notNull()
    .default(['code','runtime','review']),
  status: varchar('status', { length: 20 }).notNull().default('queued'),
  commitHash: varchar('commit_hash', { length: 40 }),
  tokenCount: integer('token_count').default(0),
  tokenBudget: integer('token_budget').default(5000),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const builderActions = pgTable('builder_actions', {
  id: uuid('id').primaryKey().defaultRandom(),
  taskId: uuid('task_id').references(() => builderTasks.id).notNull(),
  lane: varchar('lane', { length: 20 }).notNull(),
  kind: varchar('kind', { length: 30 }).notNull(),
  actor: varchar('actor', { length: 15 }).notNull(),
  payload: jsonb('payload').$type<Record<string, unknown>>().notNull(),
  result: jsonb('result').$type<Record<string, unknown>>(),
  tokenCount: integer('token_count').default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const builderReviews = pgTable('builder_reviews', {
  id: uuid('id').primaryKey().defaultRandom(),
  taskId: uuid('task_id').references(() => builderTasks.id).notNull(),
  reviewer: varchar('reviewer', { length: 20 }).notNull(),
  verdict: varchar('verdict', { length: 10 }).notNull(),
  scopeOk: varchar('scope_ok', { length: 5 }).default('true'),
  reuseCheck: jsonb('reuse_check').$type<Record<string, unknown>>(),
  evidenceRefs: jsonb('evidence_refs').$type<string[]>().default([]),
  dissentPoints: jsonb('dissent_points').$type<string[]>().default([]),
  notes: text('notes'),
  patches: text('patches'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const builderTestResults = pgTable('builder_test_results', {
  id: uuid('id').primaryKey().defaultRandom(),
  taskId: uuid('task_id').references(() => builderTasks.id).notNull(),
  testName: varchar('test_name', { length: 100 }).notNull(),
  passed: varchar('passed', { length: 5 }).notNull(),
  details: text('details'),
  duration: integer('duration_ms'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const builderArtifacts = pgTable('builder_artifacts', {
  id: uuid('id').primaryKey().defaultRandom(),
  taskId: uuid('task_id').references(() => builderTasks.id).notNull(),
  artifactType: varchar('artifact_type', { length: 30 }).notNull(),
  lane: varchar('lane', { length: 20 }).notNull(),
  path: text('path'),
  jsonPayload: jsonb('json_payload'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
```

---

## Dev-Modus (Geheimer Zugang)

**Zugang:** `https://soulmatch-1.onrender.com/builder?token=GEHEIMER_CODE`

Server prüft `token` gegen `process.env.BUILDER_SECRET`.
Kein Match → 404 (nicht 401, kein Hinweis dass es existiert).

**Alternativ:** `Ctrl+Shift+B` im Arcana Studio → Passwort-Dialog.

### Was sichtbar wird

| Element | Beschreibung |
|---------|-------------|
| File Explorer | Repo-Dateien, klickbar |
| KI-Dialog | Live-Stream: Claude ↔ ChatGPT in BDL |
| DSL/Klartext Toggle | Wechsel zwischen BDL und Deutsch |
| Task-Panel | Status, Scope, Risk, Policy Profile |
| Diff-Panel | Git-Diff der Änderungen |
| Check-Results | tsc/build Ergebnisse |
| Test-Results | Self-Test Ergebnisse |
| Task-Queue Bar | Alle Tasks als Chips, farbcodiert |

### Was NICHT möglich ist

- Kein direktes Code-Editieren durch Gürcan
- Kein Auto-Push (NIEMALS)
- Kein Zugriff auf User-Daten anderer Nutzer
- Kein Ändern von builder.ts / db.ts / .env

---

## Tool-Namen Normierung

| Policy Profile Name | Internal Action Kind |
|---------------------|---------------------|
| READ | READ_FILE |
| READ_UI | READ_COMPONENT |
| FIND_PATTERN | FIND_PATTERN |
| PATCH | PATCH_FILE |
| CALL | CALL_ENDPOINT |
| EXPECT | EXPECT_EVENT |
| DB_READ | DB_READ |
| DB_VERIFY | DB_VERIFY |
| CHECK | RUN_CHECK |
| PROTOTYPE | GENERATE_PREVIEW |
| UI_RUN | RUN_PLAYWRIGHT |

---

## API Endpoints

Alle unter `/api/builder/`, geschützt durch `requireDevToken`.

```
GET    /api/builder/tasks              Liste aller Tasks
POST   /api/builder/tasks              Neuen Task erstellen
GET    /api/builder/tasks/:id          Task-Details + Dialog-History
POST   /api/builder/tasks/:id/run      Task starten
POST   /api/builder/tasks/:id/approve  Push freigeben
POST   /api/builder/tasks/:id/revert   Revertieren

GET    /api/builder/tasks/:id/dialog   Dialog-History (BDL)
GET    /api/builder/tasks/:id/dialog?format=text  Klartext-Version

GET    /api/builder/files              Repo-Dateien
GET    /api/builder/files/:path        Datei-Inhalt

SSE    /api/builder/tasks/:id/stream   Live-Dialog-Stream
```

---

## Kosten

| Pro Task | Tokens | Kosten |
|----------|--------|--------|
| Gemini Scout + Klartext | ~150 | $0.002 |
| Claude Architect (2-3 Runden) | ~1000 | $0.030 |
| ChatGPT Reviewer (2 Runden) | ~500 | $0.006 |
| Counterexample (1 Runde) | ~300 | $0.004 |
| Self-Test (API-Calls) | ~0 | $0.000 |
| Observer (optional) | ~200 | $0.003 |
| **Gesamt** | **~2150** | **~$0.045** |

**5 Tasks/Tag = $0.23 = $6.90/Monat**

---

## Implementierungs-Phasen

| Phase | Was | Aufwand |
|-------|-----|--------|
| B1 | DB Schema + Task CRUD + Policy Profiles | 1 Abend |
| B2 | File I/O + Worktree Executor | 1 Abend |
| B3 | Anthropic Provider in callProvider() | 0.5 Abend |
| B4 | Dialog Engine (BDL + JSON Actions + Runden) | 2 Abende |
| B5 | Code Lane + Counterexample Lane | 1.5 Abende |
| B6 | Runtime Lane (@CALL, @EXPECT, @DB_VERIFY) | 1 Abend |
| B7 | Review Lane (Dual + UX-Heuristik + Täuscht + Agreement) | 1 Abend |
| B8 | Evidence Pack Generator | 0.5 Abend |
| B9 | Builder Studio UI + Preview Canvas | 2.5 Abende |
| B10 | Prototype Lane + Promote Flow | 1 Abend |
| B11 | Browser Lane (Playwright) | 1 Abend |
| B12 | Canary Mode + Status-Normierung + Audit | 0.5 Abend |

**Gesamt: ~13 Abende**

**Erster K2-Block: B1 + B2 + B3 + B4 (Foundation)**
= 4.5 Abende → funktionierendes Grundgerüst

---

## Risiken + Mitigationen

| Risiko | Mitigation |
|---|---|
| KI schreibt kaputten Code | Scope-Gate + tsc + build vor Commit |
| KI ändert Builder selbst | Blacklist: builder.ts, db.ts, .env |
| Endlos-Dialog (Token-Burn) | Token-Budget + Max-Runden + Timeout |
| Falscher Scope | not_scope Enforcement + Diff-Check |
| Push von kaputtem Code | KEIN Auto-Push, nur manuell |
| KI erfindet statt wiederverwendet | Reuse-First R1-R3 + reuse_check im Review |
| API-Ausfall während Task | Graceful Degradation → blocked |
| Observer stimmt falsch | Observer nur bei Tier 3, Gürcan als letztes Gate |

---

## Architecture Tree — Lebendige Projekt-Landkarte

### Konzept

Jede App ist ein **Stamm**. Major Features sind **Äste**. Sub-Features
und Tasks sind **Zweige** und **Blätter**. Der Baum wächst nur — Äste
werden nie entfernt, nur als `archived` markiert. Neue Überlegungen
werden als neue Äste oder Zweige angehängt, nie als Ersatz.

Mehrere Apps (Soulmatch, Maya, AICOS, Bluepilot) wachsen als separate
Stämme aus einem gemeinsamen Boden. Querverbindungen zwischen Stämmen
zeigen wo Apps ineinandergreifen.

### Zweck

1. **KI-Orientierung:** Vor jedem Task liest die KI den Baum, sieht
   wo der Task hingehört, welche Abhängigkeiten bestehen, und was der
   aktuelle Stand ist.
2. **Reuse-First Support:** `@FIND_PATTERN` durchsucht nicht nur Code
   sondern auch den Baum — "Hat ein anderer Stamm dieses Problem
   schon gelöst?"
3. **Fortschritts-Tracking:** Status-Farben zeigen sofort wo Arbeit
   stattfindet und wo Möglichkeiten schlummern.
4. **Template für neue Apps:** Neuer Stamm = Fork der Baumstruktur
   mit leeren Ästen. Architektur-Entscheidungen werden vererbt.

### Datenformat: `ARCHITECTURE-TREE.json`

Liegt im Repo-Root. Wird von KIs gelesen UND geschrieben.

```json
{
  "version": "1.0",
  "updated_at": "2026-04-03T21:00:00Z",
  "trunks": [
    {
      "id": "soulmatch",
      "name": "Soulmatch",
      "color": "#7c6af7",
      "branches": [
        {
          "id": "arcana-studio",
          "name": "Arcana Studio",
          "status": "active",
          "detail": "Creator Shell",
          "connections": ["maya:memory"],
          "leaves": [
            {
              "id": "arcana-tts",
              "name": "Gemini TTS Audio",
              "status": "active",
              "detail": "Mic-Fix ausstehend",
              "commit": "d9e0cbd"
            }
          ]
        }
      ]
    }
  ],
  "connections": [
    {
      "from": "soulmatch:builder-studio",
      "to": "maya:shared-queue",
      "label": "Shared Task Queue"
    }
  ]
}
```

### Status-Werte

| Status | Farbe | Bedeutung |
|--------|-------|-----------|
| `done` | Grün | Fertig und getestet |
| `active` | Gold (pulsierend) | Wird gerade gebaut |
| `planned` | Grau | Nächste Priorität, Spec existiert |
| `possible` | Gestrichelt | Idee, noch keine Spec |
| `blocked` | Rot | Wartet auf Abhängigkeit |
| `archived` | Ausgeblendet | War mal aktiv, durch Neues ersetzt |

### Wachstums-Regeln

**Regel 1 — Nur wachsen, nie schrumpfen:**
Neue Äste werden angehängt. Alte Äste bleiben. Wenn ein Ast
durch einen besseren Ansatz ersetzt wird: alter Ast → `archived`,
neuer Ast daneben. Geschichte bleibt sichtbar.

**Regel 2 — KI aktualisiert nach jedem Task:**
Nach jedem abgeschlossenen Task aktualisiert die KI:
- `status` des betroffenen Blattes/Astes
- `commit` Hash als Referenz
- Ggf. neue Blätter die während der Arbeit entdeckt wurden

**Regel 3 — Querverbindungen sind Pflicht:**
Wenn ein Feature in App A von App B abhängt oder profitiert,
muss eine `connection` eingetragen werden. Das verhindert
isolierte Entwicklung und fördert Reuse-First.

**Regel 4 — Gürcan genehmigt neue Stämme:**
Neue Äste kann die KI selbst anlegen. Neue Stämme (= neue Apps)
nur mit Gürcans Freigabe.

### Visuelle Darstellung

Der Baum wird im Builder Studio als **interaktive Visualisierung**
gerendert — Stämme wachsen nach oben, Äste verzweigen sich,
Blätter tragen Status-Farben. Klick auf einen Ast zeigt die
zugehörigen Tasks und Commits.

Die Listenansicht (aufklappbare Hierarchie) existiert als
kompakte Alternative für den Dev-Modus.

### Integration in Builder Studio

- Builder Studio liest `ARCHITECTURE-TREE.json` beim Task-Start
- Nach Task-Abschluss: automatisches Update des Baums
- Im Dev-UI: Baum als navigierbare Übersicht neben dem Task-Panel
- `@FIND_PATTERN` durchsucht auch Querverbindungen im Baum

---

## Wave 2 (nach stabilem Betrieb)

| Feature | Beschreibung |
|---------|-------------|
| Repo Failure Memory | Fehlermuster-Register pro Repo |
| Preview Memory | Gürcan's Präferenzen aus früheren Prototypen |
| Compression/Resonance | Claude + ChatGPT beschreiben Kern unabhängig |
| Self-Improvement | App liest Logs → erstellt Tasks automatisch |
| Maya Integration | Shared Queue, parallele Arbeit |
| MCP Server | Externe Agents als Fallback |
| Spracheingabe | Gürcan spricht Tasks ins Studio |

---

## Implementation Notes (ChatGPT Final Review, 94/100)

### HTML Preview Sandbox

HTML Quick Previews werden in einem **sandboxed iframe** gerendert:

```html
<iframe
  src="/builder/preview/T042"
  sandbox="allow-scripts"
  style="width:100%;height:600px;border:1px solid #333;"
></iframe>
```

Sicherheitsregeln:
- Kein Zugriff auf Cookies, LocalStorage, Builder-Token
- Kein Zugriff auf echte App-Routen/API
- CSP Header: `default-src 'self'; script-src 'unsafe-inline'`
- Kein externes Script-Nachladen
- Nur Mock-Daten, keine echten User-Daten

### Testdaten-Isolation

Alle Test-Daten die während @CALL flow_test entstehen:
- Werden mit `builder_test_${taskId}` Prefix markiert
- Eigener `createdBy: 'builder-test'` Wert
- Cleanup nach Task
- Kein Vermischen mit echten User-/Persona-Daten

### Portabilität

Worktree Temp-Pfad via `os.tmpdir()` statt hardcoded `/tmp/`.

### Dev-Zugang (spätere Härtung)

Query-Token ist für Pilot okay. Mittelfristig:
- httpOnly Cookie nach einmaliger Token-Eingabe
- Kurzlebige signierte Session (30min Expiry)
- Token nie in Browser-History/Logs

---

## Bestehendes im Repo das wiederverwendet werden soll

| Was | Wo | Für Builder Studio |
|-----|----|--------------------|
| dev.ts → requireDevToken | Auth | Builder-Endpoints |
| db.ts → Drizzle + NeonDB | DB | builder_tasks, builder_actions |
| Fusion Engine Spec | Rollen | Scout/Worker/Reasoner |
| Arcana Studio Layout | UI | Drei-Spalten-Pattern |
| SSE Streaming | Infra | Live-Dialog-Stream |
| Bluepilot Council of AIs | Pattern | Dialog-Runden + Observer |

---

*Builder Studio Spec v3.3 — 03. April 2026*
*v3.2 + Reuse-First Architektur-Regel*
*Claude Opus 4.6 + ChatGPT 5.4 + Gürcan Dişlioğlu*
*"Wer sucht, der findet." — jetzt als formale Regel.*
