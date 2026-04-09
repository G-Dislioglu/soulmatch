# SESSION-STATE — Stand 09.04.2026, S10

## Aktive Entscheidungen

1. **Pipeline: Pfad C (Minimal Viable Pipeline)** — gewählt nach Meta-Crush
2. **/opus-task = einziger produktiver Executor** — /build wird Shadow-Track
3. **Full-File JSON Overwrite** — kein SEARCH/REPLACE mehr
4. **Deterministischer Scope** — builderScopeResolver.ts statt LLM-Raten
5. **TypeScript-Syntax-Check vor Push** — ts.transpileModule()
6. **dryRun: true als empfohlener Default** bis Pipeline verifiziert
7. MiniMax **M2.7** (nicht M2.5)
8. **Keine Free-Modelle** — bezahlt, kein Data Collection
9. Preise/Specs: immer docs/provider-specs.md prüfen, nie aus Trainingsdaten

## Was in S10 gemacht wurde

### Neue Dateien
- `server/src/lib/builderScopeResolver.ts` — deterministischer Scope (kein LLM)
- `docs/builder-repo-index.json` — 424 Dateien indexiert mit exports/keywords/imports

### Rewrite
- `server/src/lib/opusTaskOrchestrator.ts` — v2 komplett neu: Scope Resolver, JSON Overwrite, TS-Check, dryRun, runId

### Bereinigt (gelöscht)
- `builderHealthCheck.ts` — unused
- `builderPing.ts` — unused
- `builderPingTest.ts` — unused
- `builderTimestamp.ts` — unused
- `builderUptime.ts` — unused

### Verschoben
- `typescript` von devDependencies zu dependencies (für Render-Runtime)

## Offene Tasks

1. **Push + Deploy + Verify** — S10-Änderungen live bringen
2. **Erster dryRun-Test** — /opus-task mit dryRun:true auf echtem Task
3. **Repo-Index in Deploy-Pipeline** — auto-regenerate nach jedem Push
4. **/build → Shadow-Track** — Endpoints behalten, aber nicht als Executor nutzen
5. **Soulmatch Features** — Crush-Score 52→70, Audio-Verifikation, Arcana Phase 6

## Meister-Benchmark-Ergebnis (09.04.2026)

| Rolle | Modell | Score |
|-------|--------|-------|
| Code-Schreiber Qualität | Sonnet 4.6 | 92 |
| Code-Schreiber Budget | DeepSeek Reasoner | 80 |
| Judge/Reviewer | GPT-5.4 | 82 |
| Architektur | Opus 4.6 | 90 |
| Budget-Worker | GLM-5-Turbo | 88 |
| Speed-Scout | Gemini 3 Flash | 65 |
| Nicht empfohlen | Grok (Bugs), Qwen (zu langsam) | <70 |

## Pipeline-Status (nach S10 Umbau)

### Funktioniert ✅
- Worker-Swarm (5 parallel) 
- Worker-Direct
- /push mit {file, content}
- Deploy-Wait
- Self-Test
- Worker-Registry (zentral)
- **NEU: Deterministischer Scope Resolver**
- **NEU: JSON Overwrite Contract**
- **NEU: TypeScript Syntax Check**

### Noch zu verifizieren ⚠️
- /opus-task v2 im Live-Betrieb (dryRun-Test steht aus)
- Worker-JSON-Output-Qualität (können sie das Envelope-Format?)

### Existiert als Shadow-Track 🔇
- /build Pipeline (Scout, Roundtable, Crush, Error-Cards)
- Architecture Graph (42 Nodes)
- Meister-Council

### Fehlt ❌
- Staging-Branch (Phase E)
- Repo-Index Auto-Update
- Error-Cards Feedback-Loop
