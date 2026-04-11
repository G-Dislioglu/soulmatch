# SESSION-STATE — Stand 11.04.2026, S13

## Kanonische Builder-Wahrheit

- **Kanonischer Executor:** `/opus-task` (orchestrator v2)
- **Shadow/Legacy:** `/build` (decomposer-v1, nicht für Standard-Deployments)
- **Scope:** deterministisch via `builderScopeResolver.ts` + `server/data/builder-repo-index.json`
- **Change Contract:** JSON Full-File-Overwrite (kein SEARCH/REPLACE im kanonischen Pfad)
- **Judge:** GPT-5.4 (ersetzt Gemini seit S10)
- **Worker-Swarm:** GLM, MiniMax, Qwen, Kimi (DeepSeek ab S13 nur noch Scout/Review, nicht Code-Worker)
- **Promotion:** `triggered ≠ committed` — Action committed nur bei grünem Build, meldet Failure explizit
- **Repo-Index:** 115 Server-Dateien (nicht 424 — Client-Dateien sind nicht indexiert)

## Aktive Entscheidungen

1. `/opus-task` = einziger produktiver Executor
2. `/build` = Shadow-Track (Scouts, Roundtable, Crush — nicht für direkte Deployments)
3. Full-File JSON Overwrite als einziger Change-Contract
4. SEARCH/REPLACE in `/push` bleibt als Legacy-Modus, ist aber nicht der kanonische Pfad
5. MiniMax M2.7 (nicht M2.5)
6. Keine Free-Modelle
7. Preise/Specs: immer docs/provider-specs.md prüfen

## S10 Ergebnisse (verifiziert)

### Pipeline v2 — funktioniert
- 4/4 Tasks erfolgreich deployed (formatCredits, keepAlive uptime, rateLimiter, health detailed)
- Scope Resolver: deterministisch, 1ms, 0 LLM-Calls
- Validation: 5/5 Worker lieferten valides JSON-Overwrite
- Typische Laufzeit: 30-90s pro Task, ~$0.02

### Benchmark (11 Modelle, 1 Task)
- Bester Code: Sonnet 4.6 (92/100)
- Bester Preis/Leistung: DeepSeek (190 Score/$)
- Bester Reviewer: GPT-5.4 (82/100, spec-treu)
- Schwächste: Grok (62, switch-Bug), Qwen (70, zu langsam)



## S11-S13 Ergebnisse (11.04.2026)

### S11 (Handoff aus vorherigem Chat)
- /repo-query LIVE (GLM, `0698a6f`)
- userId in Builder-Chat-Route (DeepSeek, `fd8bf66`)
- Memory Runtime-Guard (GLM, `551bed1`)
- Builder-Chat LIVE mit Token `builder-2026-geheim`
- Zombie-Tasks aufgeraeumt (0 aktive)

### S12-S13 (Context-Assembler + Policy)
- `abd0f65` — FusionChat: assembleBuilderContext eingebunden, userId durchgefaedelt (classifyIntent → buildSystemPrompt → assembler)
- `c0ca635` — DeepSeek aus Code-Workers entfernt (AVAILABLE_WORKERS in MeisterPlan), /repo-query auf GLM/zhipu umgestellt
- `49aa062` — Phase 2 Assembler: Operational Context (DB-Queries: aktive/blockierte/letzte Tasks), Gap Detection (fehlende Memory → explizit), Conflict Detection (blocked ohne Recovery)

### DeepSeek Worker-Policy (ab S13)
- Code-Workers: GLM, MiniMax, Qwen, Kimi (DeepSeek ENTFERNT — unsaubere Patches, JSON-Format-Fehler)
- Scout: DeepSeek bleibt (billig, Textanalyse OK)
- Review: DeepSeek bleibt (builderReviewLane.ts)
- Chat-Personas: DeepSeek bleibt (Lian/Amara/Luna)

### Blueprint-Status
- Phase 1: ✅ Context-Assembler + userId (erledigt)
- Phase 2: ✅ Operational Context + Gap/Conflict Detection (erledigt)
- Phase 3: ⬜ Continuity Memory + UI Modus-Signale (naechster Abend)

### Offene Render-Situation
- Deploy-Queue hatte Haenger (ed26a2b blockierte 15+ Min)
- Cancel-Button funktionierte nicht
- Commits c0ca635 + 49aa062 warten auf Deploy
### Deadlock gefunden + gelöst
- package.json ohne Lockfile-Update → Render-Build kaputt
- GitHub Action verschluckte Commits still bei Build-Failure
- Beides gefixt: Lockfile regeneriert, Action hat jetzt Retry + sichtbares Failure-Reporting

### K2 Canonicalization (Ende S10)
- /pipeline-info meldet jetzt ehrlich opus-task-v2 als kanonisch
- /build als LEGACY/SHADOW markiert
- SEARCH/REPLACE in /push als Legacy markiert
- Action: 3× Retry bei Push-Konflikten, expliziter Failure-Report bei rotem Build
- SESSION-STATE auf belegbaren Stand synchronisiert

## Offene Probleme (ehrlich)

1. **Staging-Branch fehlt** — Pipeline pusht direkt auf main
2. **Repo-Index Auto-Update fehlt** — Index wird nicht bei jedem Deploy regeneriert
3. **Error-Cards Feedback-Loop** — generiert Cards, liest sie nicht zurück
4. **TypeScript-Check ist optional** — ts nicht in production dependencies, Check läuft nur wenn devDep verfügbar
5. **Neue Dateien brauchen manuellen Scope** — Resolver findet nur existierende Dateien im Index
6. **Action-Callback wird nicht ausgewertet** — Builder empfängt execution-result, reagiert aber nicht darauf

## Nächste Prioritäten

1. Soulmatch-Features: Crush-Score 52→70, Audio-Verifikation
2. Staging-Branch in GitHub Action
3. Repo-Index Auto-Regeneration
