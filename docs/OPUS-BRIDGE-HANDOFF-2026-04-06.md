# OPUS-BRIDGE HANDOFF — Stand 06. April 2026, 17:30 Uhr

## Was an diesem Tag gebaut wurde

Die Opus-Bridge ist ein selbstregulierendes Multi-KI Builder-System für Soulmatch.
In einer einzigen Session wurden alle 7 Phasen implementiert, getestet und deployed.
Repo: github.com/G-Dislioglu/soulmatch | Live: soulmatch-1.onrender.com
Letzter Commit: `50f7088` (BDL commands own line fix)

---

## Gesamtarchitektur

```
TASK EINGANG (POST /execute)
     ↓
SCOUT-PHASE (4 parallel, Round 0):
  Graph-Scout      → programmatisch ($0) — Architecture Graph Briefing
  DeepSeek Chat    → Codebase-Scanner ($0.001) — ⚠️ halluziniert manchmal
  GLM-4.7-Flash    → Pattern-Scout (FREE) — Konventionen, Risiken
  Gemini 3 Flash   → Best-Practices ($0.003)
     ↓
PULSE-CRUSH (automatisch):
  Ambient (immer)  → Reuse-Check, Drift, Missing Branches ($0)
  Case (risk≥medium) → DeepSeek Reasoner + Core Perception Triad
  Heavy (stub)     → Volle 12 Operatoren (nicht implementiert)
     ↓
ROUNDTABLE (Runden-Loop, max 4):
  Claude Opus 4.6  → Architekt, schreibt @PATCH ($5/$25 pro 1M)
  GPT-5.4          → Edge-Case Finder ($2.50/$15)
  GLM-5-Turbo      → Dritter Kritiker, Agent-optimiert ($0.96/$3.20)
  
  Ablauf pro Runde:
  1. Jeder Teilnehmer antwortet (L1 Kompaktformat, <150 Wörter)
  2. System führt @READ Befehle aus → Dateiinhalte in nächste Runde
  3. Konsens-Check: unanimous (alle @APPROVE) oder majority (2/3)
     ↓
PATCH-VALIDATOR (bei Konsens + Patches):
  DeepSeek Reasoner → Prüft ob Patch korrekt ist
     ↓
GITHUB ACTION (bei validiertem Patch):
  triggerGithubAction() → .github/workflows/builder-executor.yml
  → tsc + build → commit → callback an Render
     ↓
ERROR LEARNING (bei no_consensus oder validation_failed):
  DeepSeek Reasoner → Error-Card generieren → builder_error_cards DB
```

---

## Alle Dateien der Opus-Bridge (16 Dateien)

```
server/src/routes/opusBridge.ts           — 7 Endpoints (execute, observe, override, 
                                            chain, audit, worker-direct, memory, reset-session)
server/src/lib/opusBridgeAuth.ts          — Token-Auth (OPUS_BRIDGE_SECRET)
server/src/lib/opusBridgeController.ts    — executeTask() Kernlogik
server/src/lib/opusChainController.ts     — runChain() mit Opus als Zwischen-Entscheider
server/src/lib/opusChatPool.ts            — ChatPool CRUD (builder_chatpool DB)
server/src/lib/opusScoutRunner.ts         — 4 Scouts parallel
server/src/lib/opusRoundtable.ts          — Roundtable + @READ + Patch-Validator + Kompaktformat
server/src/lib/opusGraphIntegration.ts    — Graph lesen/schreiben + Event-Ledger
server/src/lib/opusPulseCrush.ts          — Pulse-Crush (Ambient/Case/Heavy) + extractJsonFromText()
server/src/lib/opusVerification.ts        — Post-Deploy API-Tests
server/src/lib/opusErrorLearning.ts       — Error-Card Generierung
server/src/lib/opusBudgetGate.ts          — Session Budget (max 20 Tasks, 100K Tokens)
server/src/lib/builderGithubBridge.ts     — GitHub Action Trigger (bestand vorher)
server/src/schema/builder.ts              — DB-Schemas (builderChatpool, builderOpusLog, 
                                            builderChains, builderErrorCards + alle alten)
server/src/schema/opusBridge.ts           — Re-Exports aus builder.ts
docs/project-dna.md                       — Erweiterte Project DNA (102 Zeilen)
docs/opus-bridge-spec-v3.0.md             — Vollständige Spec (2066+ Zeilen)
```

---

## DB-Tabellen (Opus-Bridge spezifisch)

- builder_chatpool — Alle Scout + Roundtable Nachrichten
- builder_opus_log — Audit-Trail aller Aktionen
- builder_chains — Task-Ketten mit Status
- builder_error_cards — Gelernte Fehler mit Prevention-Empfehlungen

---

## API-Endpoints

```
POST /api/builder/opus-bridge/execute      — Task ausführen (Scout→Roundtable→Patch)
GET  /api/builder/opus-bridge/observe/:id  — Voller Task-Röntgenblick
POST /api/builder/opus-bridge/override/:id — approve/block/retry/delete
POST /api/builder/opus-bridge/chain        — Multi-Task Kette
GET  /api/builder/opus-bridge/audit        — Statistiken + Error Cards
POST /api/builder/opus-bridge/worker-direct — Beliebiges Modell direkt ansprechen
GET  /api/builder/opus-bridge/memory       — 3-Schichten Builder Memory
POST /api/builder/opus-bridge/reset-session — Budget-Session zurücksetzen

Auth: ?opus_token=opus-bridge-2026-geheim (alle Endpoints)
```

---

## Provider-Konfiguration (server/src/lib/providers.ts)

| Provider | Env-Key | Modelle im System |
|----------|---------|-------------------|
| anthropic | ANTHROPIC_API_KEY | claude-opus-4-6 (Roundtable) |
| openai | OPENAI_API_KEY | gpt-5.4 (Roundtable) |
| google/gemini | GEMINI_API_KEY | gemini-3-flash-preview (Scout) |
| deepseek | DEEPSEEK_API_KEY | deepseek-chat (Scout), deepseek-reasoner (Crush/Validator) |
| xai | XAI_API_KEY | grok-4-1-fast (Soulmatch Personas) |
| zhipu | ZHIPU_API_KEY | glm-4.7-flash (Scout FREE), glm-5-turbo (Roundtable $0.96/$3.20) |

Render Environment Variables: DATABASE_URL, ANTHROPIC_API_KEY, OPENAI_API_KEY, 
GEMINI_API_KEY, DEEPSEEK_API_KEY, XAI_API_KEY, ZHIPU_API_KEY, FAL_KEY,
OPUS_BRIDGE_SECRET, GITHUB_PAT, TTS_PROVIDER, NODE_ENV

---

## Kosten-Profil (verifiziert)

| Szenario | Runden | Tokens | Anthropic-Kosten |
|----------|--------|--------|-----------------|
| Erster Test (L0, kein @READ) | 4 | 5089 | ~$0.58 |
| L1 Kompakt, kein @READ | 4 | 2265 | ~$0.23 |
| L1 + @READ funktionierend | 2 | 685-750 | ~$0.10-0.15 |

Hauptkostentreiber: Opus Input-Tokens ($5/1M) beim Lesen von Dateien + ChatPool.
Budget pro Monat geschätzt: ~$18 bei 5 Tasks/Tag.

---

## Was funktioniert (verifiziert per LIVE-PROBE)

✅ Scout-Phase: 4 Scouts parallel (Graph, DeepSeek, GLM-4.7-Flash, Gemini)
✅ @READ: Dateien aus Render-Container laden, Multi-Path Resolution
✅ Roundtable: 3 KIs diskutieren im L1 Kompaktformat
✅ GLM-5-Turbo als dritter Kritiker (findet Bugs die andere übersehen)
✅ @PATCH: Opus schreibt korrekte SEARCH/REPLACE Patches
✅ Konsens in 2 Runden (statt 4) dank @READ
✅ Pulse-Crush Ambient (Reuse-Check bei jedem Task)
✅ Error Learning: Error-Cards bei no_consensus
✅ Budget-Gate: Session-Tracking mit Limits
✅ Awareness Gate + Crush-Prinzipien im Roundtable-Prompt
✅ DeepSeek Reasoner: reasoning_content Fallback
✅ Blacklist: Alle 11 Opus-Bridge Dateien geschützt
✅ Observe/Override/Audit/Memory/Worker-Direct Endpoints
✅ Chain-Controller mit Opus als Zwischen-Entscheider

---

## Was NICHT funktioniert / offen ist

### KRITISCH — Patch-Collector Bug
@PATCH wird von Opus korrekt geschrieben (im Message-Content sichtbar),
aber patches: [] in der Execute-Response. Der BDL-Parser findet @PATCH im
L1 Kompaktformat nicht zuverlässig. Der SEARCH/REPLACE Block muss nach
einem @PATCH auf eigener Zeile folgen — möglicherweise erkennt parseBdl()
das mehrzeilige Format nicht wenn der @PATCH Befehl mitten im L1-Text steht.
FIX: parseBdl() debuggen oder collectPatchCommands() anpassen.

### HOCH — DeepSeek Scout halluziniert
DeepSeek Chat als Codebase-Scout erfindet Dateien die nicht existieren
(opusService.ts, types/opus.ts, COST_PER_TASK Konstante). Das Team erkennt
es dank @READ, aber es verschwendet eine Runde. 
FIX: DeepSeek Scout durch zweiten GLM-4.7-Flash Call ersetzen (FREE),
oder Halluzinations-Disclaimer im Scout-Prompt.

### HOCH — GitHub Action End-to-End Test
GITHUB_PAT ist auf Render gesetzt. builder-executor.yml existiert.
Aber nie getestet mit echtem Patch → GitHub Action → Commit → Callback.
FIX: Erst Patch-Collector fixen, dann echten Feature-Task durchlaufen lassen.

### MITTEL — Case Crush JSON-Extraktion
runCaseCrush() läuft bei risk=medium, aber das extrahierte JSON ist manchmal
unvollständig (nur st-Felder, nicht dtt/mb). maxTokens wurde auf 1500 erhöht,
aber der DeepSeek Reasoner Prompt könnte noch optimiert werden.

### MITTEL — Code-Schreiber wählbar machen
Gürcan will ein Dropdown/Parameter um den Code-Schreiber zu wählen:
Opus ($0.20/Task) vs Sonnet ($0.06) vs GPT-5.4 ($0.08) vs GLM-5-Turbo ($0.02).
Aktuell schreibt immer der erste Teilnehmer den @PATCH (normalerweise Opus).

### MITTEL — Kosten weiter senken
Opus als Default-Architekt kostet $5/$25. Sonnet 4.6 ($3/$15) könnte für
Standard-Tasks reichen. Opus nur für risk=high/architektur.

### NIEDRIG — Event-Ledger in DB
Graph-Updates schreiben ins Dateisystem (architecture/events/). Auf Render
ist das ephemer. Sollte in die DB.

### NIEDRIG — Heavy Crush
Stub vorhanden, volle 12-Operatoren Implementation steht aus.

### NIEDRIG — Render Manager Agent
Server-Konfiguration automatisieren (Deploy, Env-Vars, Logs).

---

## Nächste Schritte (priorisiert)

1. **Patch-Collector Fix** — Damit @PATCH aus dem Roundtable eingesammelt wird
2. **Erster echter Auto-Build** — Feature-Task → Patch → GitHub Action → Commit
3. **DeepSeek Scout ersetzen** — GLM-4.7-Flash statt DeepSeek Chat (halluziniert)
4. **Code-Schreiber Dropdown** — Opus/Sonnet/GPT/GLM wählbar
5. **Sonnet als Default** — Opus nur für komplexe Tasks (Kostensenkung)
6. **SIGNIFY** — Success-Signals in Builder Memory nach Konsens
7. **Builder Dashboard** — CSS-Fix für abgeschnittene Task-Titel

---

## Commit-Historie dieses Tages (22 Commits)

ab2c10f → Delete-Fix
03061d1 → Blacklist
8090d14 → Spec v3.0
4683d3d → Phase 1: Schemas, Auth, Stubs
392e1ad → Route-Fix
a394d8e → Phase 2: Scout + Graph
9b6a841 → Drizzle Import Fix
e9091e9 → Phase 3: Roundtable
ae30d6f → Schema ESM Fix
3acd6dc → Phase 4a: GitHub Action + Observe + Override
bde89f5 → Phase 4b: Chain-Controller
59a9e6b → Phase 5: Verification + Error Learning + Endpoints
c4af3cd → Phase 6: Budget-Gate + Blacklist + Session
158c558 → Phase 6b: Pulse-Crush + Bounded Clerk
ba8f65d → DeepSeek Free-Text Fix
d313f0e → Case Crush System→User Message
2b94e69 → reasoning_content Fallback + Awareness Gate
bd275d1 → Zhipu Provider + GLM-4.7-Flash Scout
18b5d31 → GLM-5-Turbo im Roundtable
61c068e → Erweiterte DNA + Memory Hook
8e12326 → @READ Implementation
4c876a2 → @READ Multi-Path Fix
bbd4919 → Compact Format L1 + MAX_FILE_SIZE 15K
50f7088 → BDL Commands eigene Zeile

---

## Preisübersicht (April 2026, pro 1M Tokens Input/Output)

Claude Opus 4.6: $5/$25 | Claude Sonnet 4.6: $3/$15 | Claude Haiku 4.5: $1/$5
GPT-5.4: $2.50/$15 | gpt-5.4-mini: $0.75/$4.50 | gpt-5.4-nano: $0.20/$1.25
DeepSeek V3.2: $0.28/$0.42 | Gemini 3 Flash: $0.50/$3
GLM-5-Turbo: $0.96/$3.20 | GLM-4.7-Flash: $0.06/$0.40 (oder FREE)
grok-4.20: $2/$6 | grok-4-1-fast: $0.20/$0.50

Z.ai API: https://api.z.ai/api/paas/v4/ (ZHIPU_API_KEY, $5 Guthaben geladen)
GLM-5.1: Nicht per API verfügbar, nur über Coding Plan ($10/mo)

---

## Kontext-Referenzen

- Opus-Bridge Spec: docs/opus-bridge-spec-v3.0.md (2066+ Zeilen, 20 Kapitel)
- Project DNA: docs/project-dna.md (102 Zeilen, erweitert)
- TreeGraphOS v0.3.2: aicos-registry/treegraphos/TREEGRAPHOS-SPEC-v0.3.2.md
- Crush v4.1: aicos-registry/treegraphos/legacy/unified-crush-v4.1.md
- Architecture Graph: architecture/ (Trunks, Nodes, Events)
- AICOS Cards: 101+ Karten in aicos-registry/cards/
- Builder Studio UI: soulmatch-1.onrender.com/builder?token=builder-2026-geheim
