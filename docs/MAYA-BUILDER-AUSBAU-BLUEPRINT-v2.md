# MAYA-BUILDER-AUSBAU-BLUEPRINT v2
## Stand: 11.04.2026 — repo-grounded, umsetzungsnah, ChatGPT-gegengeprüft

> Dieses Dokument verdichtet alle Erkenntnisse aus Claude-Opus- und ChatGPT-Analyse
> in einen einzigen, strikten Ausbauplan. Es ersetzt keine bestehenden Docs,
> sondern definiert den konkreten Weg von IST zu SOLL für Maya im Builder.
> 
> **v2-Änderungen:** userId-Blocker explizit adressiert, Builder-Memory Runtime-Guard
> ergänzt, ChatGPT-Gegenprüfung dokumentiert (1 Halluzination, 2 echte Korrekturen).

---

## 1. IST-ZUSTAND (verifiziert gegen Repo, 11.04.2026)

### Was bereits existiert und funktioniert

| Baustein | Datei | Was er tut |
|---|---|---|
| Builder-Chat | `builderFusionChat.ts` (779 Zeilen) | Maya als Chat-Assistentin mit Intent-Erkennung (chat/status/detail/task/approve/revert/delete), JSON-Antwortformat, Blacklist-Schutz |
| Builder-Memory | `builderMemory.ts` (435 Zeilen) | 3-Layer: RAM-Arbeitsgedächtnis + episodisch (letzte 3) + semantisch (letzte 3) + Worker-Profile (letzte 4). Sync bei Task-Abschluss |
| Session-Memory | `memoryService.ts` (170 Zeilen) | Gesprächsgedächtnis für Personas: topic_tags, emotion_tone, key_insight. Letzte 90 Tage, max 20 Einträge. Via Gemini-Flash verdichtet |
| Pipeline-Steuerung | `opusBridge.ts` | `/opus-task` = kanonischer Executor (v2). `/build` = Legacy/Shadow. 7-Phasen-Pipeline, 56s E2E |
| Builder-Routes | `builder.ts` | chat, tasks (CRUD + run), files (list/read), preview, audit, approve, revert, delete, approve/revise/discard-prototype |
| Prompt-Injektion | `buildSystemPrompt()` | `SYSTEM_PROMPT + "\n\n=== MAYA MEMORY ===\n" + builderMemoryContext` |

### Was FEHLT (die drei blinden Stellen)

1. **Kein Operational Context** — Maya weiß nicht: letzter Run? Laufender Task? Pipeline-Status? Aktive Blocker?
2. **Kein Conversation Context** — Session-Memory (`memoryService.ts`) wird im Builder-Chat nicht genutzt, nur in Persona-Chats. **Zusätzlich: Builder-Route nimmt nur `{ message, history }` — kein `userId`. Ohne Identity-Key kann `getUserMemoryContext()` nicht aufgerufen werden.**
3. **Kein Continuity Memory** — Keine raumübergreifende Maya-Kontinuität (Langzeitziele, verworfene Richtungen, Guardrails)
4. **Builder-Memory Runtime-Risiko** — `STATE.md` Z.290: `builder_memory`-Tabelle erst nach manuellem `drizzle-kit push` voll wirksam. Bis dahin nur RAM-Arbeitsgedächtnis sicher aktiv.

---

## 2. SOLL-ZUSTAND (Kernformel)

**Maya im Builder = bestehender Chat + Context-Assembler + kontrollierte Steuerung**

Nicht: neuer Endpoint. Nicht: 4 Charter-Dokumente. Nicht: Dashboard.
Sondern: den bestehenden `POST /api/builder/chat` von innen heraus reicher machen.

### Der Systemprompt wird von heute:
```
SYSTEM_PROMPT
=== MAYA MEMORY === (Builder-Memory: RAM + Episoden + Semantik + Worker)
```

### Zu morgen:
```
SYSTEM_PROMPT
=== BUILDER MEMORY === (wie bisher)
=== OPERATIONAL CONTEXT === (letzter Run, aktiver Task, Pipeline-Status, Blocker)
=== CONVERSATION CONTEXT === (User-Arbeitsweise, wiederkehrende Themen, letzte Einsicht)
=== CONTINUITY === (Langzeit-Guardrails, verworfene Richtungen — erst Phase 3)
```

---

## 3. MEMORY-TYPEN (kompakt)

| Typ | Quelle | Zweck | Existiert? |
|---|---|---|---|
| **M1 Conversation** | `session_memories` | Wiederkehrende Themen, Ton, Einsichten | ✅ Ja, aber nicht im Builder genutzt |
| **M2 Builder/Task** | `builder_memory` | Episoden, Fehler-Muster, Worker-Profile | ✅ Ja, bereits injiziert |
| **M3 Operational** | Tasks, Runs, Pipeline-Info | Aktiver Zustand, letzte Ergebnisse, Blocker | ❌ Nein — muss gebaut werden |
| **M4 Continuity** | Neuer Layer | Langfristige Maya-Kontinuität über Sessions | ❌ Nein — Phase 3 |

### Schreibrechte
- M1: nur aus echten Gesprächen (existiert schon via `saveSessionMemory`)
- M2: nur an Task-Übergängen (existiert schon via `syncBuilderMemoryForTask`)
- M3: automatisch aus Live-Zustand (neu zu bauen)
- M4: hohe Schwelle, nur stabile Muster (Phase 3)

### Leserechte
- Maya darf alles lesen, aber selektiv und verdichtet
- Worker/Reviewer: nur minimal nötigen Kontext

---

## 4. AUTONOMIESTUFEN

| Stufe | Name | Was Maya darf | Builder heute |
|---|---|---|---|
| M0 | Converse | Nur reden | ✅ |
| M1 | Read | Status, Memory, Dateien lesen | ✅ (über intent=status/detail) |
| M2 | Propose | Task/Scope/Recovery vorschlagen | ✅ (über intent=task) |
| M3 | Execute+Confirm | Vorbereiten, nach Bestätigung starten | ⚠️ (approve/revert direkt, ohne Kontext-Check) |
| M4 | Delegated | Begrenzte Routinen autonom | ❌ Nicht freischalten |
| M5 | Supervised | Mehrstufige Ketten | ❌ Nicht freischalten |

**Startlevel: M1–M3. Kein M4/M5 bis Context-Assembler stabil läuft.**

---

## 5. CAPABILITY-REGISTRY (kompakt)

### Read (ab M1)
| ID | Zweck | Backing |
|---|---|---|
| `read.chat_context` | Aktuellen Chatverlauf lesen | Builder-Chat-History |
| `read.builder_memory` | Builder-Memory lesen | `buildBuilderMemoryContext()` |
| `read.conversation_memory` | Session-Memory lesen | `getUserMemoryContext()` — NEU im Builder |
| `read.task_list` | Tasks + Status listen | `GET /tasks` |
| `read.task_detail` | Task-Details, Dialog, Evidenz, Audit | `GET /tasks/:id/*` |
| `read.repo_file` | Einzelne Repo-Datei lesen | `GET /files/*` |
| `read.pipeline_info` | Pipeline-Konfiguration | `GET /pipeline-info` |

### Propose (ab M2)
| ID | Zweck | Bestätigung |
|---|---|---|
| `propose.task` | Aus Sprache → Task-Vorschlag | soft |
| `propose.scope` | Betroffene Dateien vorschlagen | soft |
| `propose.review_action` | approve/revise/discard empfehlen | soft |
| `propose.recovery` | Bei Blockade Lösungsweg vorschlagen | soft |

### Execute (ab M3, immer mit Bestätigung)
| ID | Zweck | Bestätigung |
|---|---|---|
| `exec.approve_task` | Task freigeben | required |
| `exec.revert_task` | Task reverten | required |
| `exec.delete_task` | Task löschen | always_required |
| `exec.start_task` | Task-Lauf anstoßen | required |
| `exec.approve_prototype` | Preview freigeben | required |

### Memory (ab M2)
| ID | Zweck |
|---|---|
| `mem.write_episode` | Task-Ergebnis als Episode speichern (existiert) |
| `mem.write_conversation` | Gesprächsverdichtung schreiben (existiert) |
| `mem.write_continuity` | Langzeit-Kontinuität (Phase 3) |

---

## 6. CONTEXT-ASSEMBLER — Der neue Kernbaustein

### Datei: `server/src/lib/builderContextAssembler.ts`

### Funktion: `assembleBuilderContext()`

### Inputs
```typescript
interface BuilderContextInputs {
  userMessage: string;                    // aktuelle Nachricht
  chatHistory: ChatMessage[];             // letzte N Nachrichten
  userId: string;                         // für Session-Memory
}
```

### Output
```typescript
interface BuilderContext {
  builderMemory: string;                  // existierender Memory-Block
  operationalContext: string;             // NEU: letzter Run, aktive Tasks, Pipeline
  conversationContext: string;            // NEU: Session-Memory für Builder
  conflicts: string[];                    // erkannte Widersprüche
  gaps: string[];                         // fehlende Info
}
```

### Operational Context zusammensetzen aus:
1. **Letzter abgeschlossener Task** — `SELECT * FROM builder_tasks ORDER BY updated_at DESC LIMIT 1`
2. **Laufende Tasks** — `SELECT * FROM builder_tasks WHERE status NOT IN ('done','reverted','deleted')`
3. **Pipeline-Info** — interner Aufruf auf `/pipeline-info`-Daten (kanonischer Executor, Workers, Judge)
4. **Letzte Fehler** — Tasks mit `status='blocked'` oder `status='review_needed'` der letzten 24h

### Conversation Context zusammensetzen aus:
1. `getUserMemoryContext(userId)` — die bereits existierende Funktion aus `memoryService.ts`
2. **BLOCKER: Builder-Route hat kein `userId`.** Lösungsstrategie (eins davon in Phase 1 umsetzen):
   - **Option A (empfohlen):** `userId` als optionales Feld im Builder-Chat-Request (`{ message, history, userId? }`)
   - **Option B:** Fester Builder-Memory-Key (z.B. `"builder-dev"`) für dev-token-Sessions
   - **Option C:** Separater `builderConversationMemory`-Pfad, unabhängig von `session_memories`
3. Falls kein userId verfügbar und keine Option gewählt: graceful degrade auf leeren String + Gap-Markierung

### Integration in `builderFusionChat.ts`:
```typescript
// VORHER:
const memoryContext = await buildBuilderMemoryContext();
return `${SYSTEM_PROMPT}\n\n=== MAYA MEMORY ===\n${memoryContext}`;

// NACHHER:
const ctx = await assembleBuilderContext({ userMessage, chatHistory, userId });
return [
  SYSTEM_PROMPT,
  `\n=== BUILDER MEMORY ===\n${ctx.builderMemory}`,
  ctx.operationalContext ? `\n=== OPERATIONAL CONTEXT ===\n${ctx.operationalContext}` : '',
  ctx.conversationContext ? `\n=== CONVERSATION CONTEXT ===\n${ctx.conversationContext}` : '',
  ctx.conflicts.length > 0 ? `\n=== KONFLIKTE ===\n${ctx.conflicts.join('\n')}` : '',
  ctx.gaps.length > 0 ? `\n=== LUECKEN ===\n${ctx.gaps.join('\n')}` : '',
].filter(Boolean).join('\n');
```

### Runtime-Guards (Pflicht):
```typescript
// Guard 1: Builder-Memory DB-Verfügbarkeit
// STATE.md Z.290: builder_memory erst nach drizzle-kit push voll wirksam
async function getBuilderMemorySafe(): Promise<string> {
  try {
    return await buildBuilderMemoryContext();
  } catch (err) {
    console.warn('[contextAssembler] builder_memory DB nicht verfügbar, RAM-only');
    // Fallback: nur RAM-Arbeitsgedächtnis (workingMemory)
    return workingMemory.recentMessages.length > 0
      ? 'Arbeitsgedaechtnis (RAM-only):\n' + workingMemory.recentMessages.slice(-5).map(m => `- ${m.role}: ${m.content}`).join('\n')
      : '';
  }
}

// Guard 2: Conversation Context nur mit gültigem userId
async function getConversationContextSafe(userId?: string): Promise<string> {
  if (!userId) return ''; // Gap wird in ctx.gaps markiert
  try {
    return await getUserMemoryContext(userId);
  } catch { return ''; }
}
```

---

## 7. STEUERVERTRAG (kompakt)

### Control-Loop
1. **Intent klassifizieren** — chat/status/detail/task/approve/revert/delete/review (existiert bereits in `builderFusionChat.ts`)
2. **Kontext montieren** — `assembleBuilderContext()` (neu)
3. **Modus wählen** — converse/read/propose/execute (implizit durch Intent, explizit durch Context)
4. **Capability prüfen** — Blacklist, Scope, Bestätigungsbedarf
5. **Handeln oder fragen** — Aktion oder Vorschlag
6. **Erklären** — was Maya getan hat und warum
7. **Memory schreiben** — nur bei relevantem Ergebnis

### Bestätigungsregeln
- **Keine Bestätigung**: Lesen, Erklären, Analyse
- **Soft**: Task-/Scope-/Recovery-Vorschläge
- **Required**: approve, revert, start, prototype-approve
- **Always required**: delete

### Degraded Mode
- Fehlendes Operational Context → kein starker Review-/Recovery-Schritt
- Fehlende Session-Memory → Builder-Memory allein reicht für Steuerung
- Fehlendes userId → kein Conversation Context, Maya sagt es

---

## 8. ERKENNTNISSE AUS CHATGPT — KONKRET EINGEBAUT

| ChatGPT-Erkenntnis | Wo eingebaut | Status |
|---|---|---|
| Context Assembler als Kernbaustein | § 6 — `builderContextAssembler.ts` | Direkt umsetzbar |
| 4 Memory-Typen (Conv/Builder/Op/Cont) | § 3 — Memory-Typen | Mapped auf existierenden Code |
| Autonomiestufen M0–M5 | § 4 — Autonomiestufen | M1–M3 als Startlevel |
| Capability Registry | § 5 — kompakt, mit Backing-Referenz | Auf reale Routes gemapped |
| Executor-Widerspruch erkennen | § 9, Punkt 2 | Verifiziert: `/pipeline-info` meldet `/opus-task` korrekt |
| „Kontext ist kein Prompt, sondern System" | § 6 — strukturierter Output statt Roh-String | Im Assembler-Design |
| Conversation Plane / Decision Plane / Capability Plane / Execution Plane | § 2 + § 7 | Vereinfacht zu: Chat → Context → Intent → Action |
| Phase 0 zuerst (Vertrag vor Code) | Dieses Dokument | ✅ Erledigt mit diesem Blueprint |

### Erkenntnisse NICHT eingebaut (bewusst geparkt)

| Erkenntnis | Grund zum Parken |
|---|---|
| Epistemic Governor (Bayesian-Chat) | Theoretisch interessant, kein Builder-Bezug jetzt |
| COF v1.0 (Cognitive Operator Framework) | Wird relevant wenn Maya echtes Reasoning bekommt |
| SV/OB Crush-Operatoren | Bereits in Crush v4.1 drin, Builder-Pulse-Crush kommt später |
| `app-shell.tsx` / `primary-nav.tsx` Umbau | Maya-Core-spezifisch, nicht Builder |
| Crush Solver v2 Webapp | Separates Projekt |
| UI: Maya-Thread + Kontext-Sidebar + Modus-Signale | Phase 3, nachdem Backend stabil |

---

## 9. WIDERSPRÜCHE & RISIKEN (ehrlich)

1. **Executor-Lage ist aktuell SAUBER** — `/pipeline-info` meldet `canonicalExecutor: '/opus-task'`, `pipeline: 'opus-task-v2'` (Code Z.710–711, Live-Server bestätigt). ~~ChatGPTs Warnung~~ war zum Zeitpunkt seiner Analyse nachvollziehbar, ist aber durch S11-Fix (10.04.2026) behoben und live verifiziert.

2. **userId im Builder-Chat FEHLT** — Builder-Route nimmt nur `{ message, history }`. `getUserMemoryContext()` braucht `userId`. **Muss in Phase 1 gelöst werden** (siehe §6, Conversation Context Lösungsstrategie). Ohne dies bleibt Conversation Context leer.

3. **Token-Budget** — jeder neue Context-Block kostet Tokens im Systemprompt. Operational Context und Conversation Context müssen kompakt bleiben (je max ~300 Tokens).

4. **Memory-Inflation** — Builder-Memory wächst mit jedem Task. Die bestehenden Limits (3 Episoden, 3 semantisch, 4 Worker-Profile) sind gut. Nicht aufweichen.

5. **Builder-Memory DB-Verfügbarkeit** — `STATE.md` Z.290: `builder_memory`-Tabelle erst nach manuellem `drizzle-kit push` voll wirksam. RAM-Arbeitsgedächtnis ist der sichere Fallback. **Runtime-Guard ist Pflicht** (siehe §6, Guards).

### ChatGPT-Review (11.04.2026) — Ergebnis der Gegenprüfung
| ChatGPT-Kritikpunkt | Urteil | Aktion |
|---|---|---|
| Executor-Widerspruch, `/pipeline-info` zeige `/opus-feature` | **FALSCH** — Code Z.710 + Live-Server zeigen `/opus-task`. ChatGPT halluziniert. | Keine Änderung nötig |
| userId fehlt in Builder-Route | **RICHTIG** — echter Blocker für Conversation Context | Phase-1-Task ergänzt |
| Operational Context zu simpel | **TEILWEISE RICHTIG** — Prototype-States ergänzen sinnvoll, aber Phase-2-Aufgabe | Phase-2-Task ergänzt |
| Builder-Memory Runtime-Guard | **RICHTIG** — STATE.md bestätigt DB-Risiko | Runtime-Guard in §6 ergänzt |

---

## 10. PHASENPLAN

### Phase 1 — Context-Assembler (dieser Abend)
- [ ] **Identity-Key klären:** `userId` als optionales Feld in Builder-Chat-Route einbauen (Option A aus §6)
- [ ] **Builder-Memory Runtime-Guard:** try/catch mit RAM-Fallback im Assembler
- [ ] `builderContextAssembler.ts` erstellen
- [ ] Operational Context: letzte Tasks, laufende Tasks, Pipeline-Status, blocked Tasks
- [ ] Conversation Context: `getUserMemoryContext()` einbinden (nur wenn userId vorhanden, sonst Gap)
- [ ] `buildSystemPrompt()` in `builderFusionChat.ts` auf Assembler umstellen
- [ ] Deploy + LIVE-PROBE: `POST /api/builder/chat` mit Frage "was war mein letzter Task?"

### Phase 2 — Conflict & Gap Detection + Operational Depth (nächster Abend)
- [ ] Assembler erkennt: fehlende Session-Memory → Gap markieren
- [ ] Assembler erkennt: Task blocked + keine Recovery → Conflict markieren
- [ ] Operational Context erweitern: Prototype-Review-States, Audit-Zusammenfassung
- [ ] Maya sagt im Chat: "Mir fehlt X" statt still zu halluzinieren

### Phase 3 — Continuity Memory + UI (später)
- [ ] Maya Continuity Memory: eigene DB-Tabelle, hohe Schreibschwelle
- [ ] UI: Modus-Signale im Builder-Chat (converse/read/propose/execute)
- [ ] UI: Kontext-Sidebar mit aktivem Ziel, letztem Run, Blocker

---

## 11. ACCEPTANCE-KRITERIEN

Dieser Blueprint ist erfüllt, wenn:

1. ✅ Maya vor einer Antwort Operational Context aus DB und Pipeline zieht
2. ✅ Maya Session-Memory (wenn userId vorhanden) im Builder-Chat nutzt
3. ✅ Maya bei fehlendem Kontext das sagt statt zu raten
4. ✅ Der bestehende Builder-Chat nicht kaputt geht (Regressions-Check)
5. ✅ Token-Budget pro Systemprompt unter +600 Tokens bleibt
6. ✅ Kein neuer Endpoint nötig — alles über bestehenden `POST /api/builder/chat`

---

## 12. REFERENZEN

- `server/src/lib/builderFusionChat.ts` — Maya Builder-Chat (779 Zeilen)
- `server/src/lib/builderMemory.ts` — 3-Layer Builder-Memory (435 Zeilen)
- `server/src/lib/memoryService.ts` — Session-Memory Service (170 Zeilen)
- `server/src/routes/builder.ts` — Builder REST-API
- `server/src/routes/opusBridge.ts` — Opus-Bridge Pipeline
- `docs/SESSION-STATE.md` — Kanonische Builder-Wahrheit
- ChatGPT-Analyse: 13 Abschnitte, Kernidee "Maya als Context-Memory-Control-Kern"
- Claude-Kritik: "Ein Dokument + kontextfähiger Endpoint statt 4 Charters"
