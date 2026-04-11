# SESSION-STATE — Stand 11.04.2026, S13

## Kanonische Builder-Wahrheit

- **Kanonischer Executor:** `/opus-task` (orchestrator v2)
- **Shadow/Legacy:** `/build` (decomposer-v1, nicht für Standard-Deployments)
- **Scope:** deterministisch via `builderScopeResolver.ts` + `server/data/builder-repo-index.json`
- **Change Contract:** JSON Full-File-Overwrite (kein SEARCH/REPLACE im kanonischen Pfad)
- **Judge:** GPT-5.4 (ersetzt Gemini seit S10)
- **Worker-Swarm:** GLM, MiniMax, Qwen, Kimi (DeepSeek ab S13 nur noch Scout/Review, nicht Code)
- **Promotion:** `triggered ≠ committed` — Action committed nur bei grünem Build, meldet Failure explizit
- **Repo-Index:** 116 Server-Dateien, Auto-Regen nach jedem `/push`

## Aktive Entscheidungen

1. `/opus-task` = einziger produktiver Executor
2. `/build` = Shadow-Track (Scouts, Roundtable, Crush — nicht für direkte Deployments)
3. Full-File JSON Overwrite als einziger Change-Contract
4. SEARCH/REPLACE in `/push` bleibt als Legacy-Modus, ist aber nicht der kanonische Pfad
5. MiniMax M2.7 (nicht M2.5)
6. Keine Free-Modelle
7. Preise/Specs: immer docs/provider-specs.md prüfen
8. **DeepSeek: NUR Scout + Review-Rollen, KEIN Code-Worker** (unzuverlässige Patches, JSON-Format-Bugs)
9. **`/repo-query` nutzt GLM/zhipu** (statt DeepSeek)
10. **Claude = Regisseur, Builder = Ausführer** — keine manuellen sed/python3-Patches

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

### Deadlock gefunden + gelöst
- package.json ohne Lockfile-Update → Render-Build kaputt
- GitHub Action verschluckte Commits still bei Build-Failure
- Beides gefixt: Lockfile regeneriert, Action hat jetzt Retry + sichtbares Failure-Reporting

### K2 Canonicalization (Ende S10)
- /pipeline-info meldet jetzt ehrlich opus-task-v2 als kanonisch
- /build als LEGACY/SHADOW markiert
- SEARCH/REPLACE in /push als Legacy markiert
- Action: 3× Retry bei Push-Konflikten, expliziter Failure-Report bei rotem Build

## S11 Ergebnisse (10.04.2026)

- `/opus-feature` als kanonischer Executor (7-Phasen-Pipeline, 56s E2E)
- `/opus-task` = Legacy
- Builder-Repo-Index Pfad-Fix offen (opusBridge.ts → server/src/routes/opusBridge.ts)

## S12 Ergebnisse (11.04.2026, vor Session S13)

- `/repo-query` LIVE (GLM, `0698a6f`)
- userId in Builder-Chat-Route (DeepSeek, `fd8bf66`)
- Memory Runtime-Guard (GLM, `551bed1`)
- Builder-Chat LIVE mit Token `builder-2026-geheim`
- Zombie-Tasks aufgeräumt (0 aktive)

## S13 Ergebnisse (11.04.2026)

### Context-Assembler Fix (Phase 1)
- `builderContextAssembler.ts`: taskId/lane/phase optional, userId→getUserMemoryContext
- `builderFusionChat.ts`: Import + userId durchgefädelt (buildSystemPrompt→classifyIntent→handleBuilderChat)
- Commit: `abd0f65`

### DeepSeek Worker-Policy
- DeepSeek aus `AVAILABLE_WORKERS` in opusMeisterPlan.ts entfernt
- `/repo-query` auf zhipu/glm-4.7-flash umgestellt
- pipeline-info aktualisiert
- DeepSeek bleibt in: builderReviewLane (Text-Review), builderDialogEngine (Observer)
- Commit: `c0ca635`

### Phase 1+2 Assembler (Operational Context + Gap/Conflict)
- Operational Context: DB-Query für letzte 5 Tasks, aktiv/blocked/error/done Übersicht
- Gap Detection: fehlende Session-Memory, fehlender userId, DB-Fehler
- Conflict Detection: blocked Tasks ohne Recovery, error Tasks
- `assembleBuilderContextFull()` returns `{text, gaps, conflicts}`
- Commit: `eba82db`

## Offene Probleme (ehrlich)

1. **Staging-Branch fehlt** — Pipeline pusht direkt auf main
2. **Render Deploy-Queue** — stuck Deploys blockieren Queue, Cancel funktioniert unzuverlässig
3. **Error-Cards Feedback-Loop** — generiert Cards, liest sie nicht zurück
4. **TypeScript-Check ist optional** — ts nicht in production dependencies
5. **Neue Dateien brauchen manuellen Scope** — Resolver findet nur existierende Dateien im Index
6. **Action-Callback wird nicht ausgewertet** — Builder empfängt execution-result, reagiert aber nicht

## Nächste Prioritäten

1. Blueprint Phase 3: Maya Continuity Memory, UI Modus-Signale
2. Staging-Branch in GitHub Action
3. Repo-Index Auto-Regen bei neuen Dateien
4. LIVE-PROBE: Builder-Chat mit "was war mein letzter Task?" testen
5. Soulmatch-Features: Crush-Score 52→70, Audio-Verifikation
