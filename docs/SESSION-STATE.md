# SESSION-STATE

**Letzte Session:** S36 (2026-04-22, komplett — Master-Piece Phase 1 gebaut und live verifiziert)
**Handoff:** in diesem Dokument plus `docs/CLAUDE-CONTEXT.md`
**Repo-Head:** Code `c8171c8` (F04 Telemetry-Category). Live-Commit auf Render: `c8171c8`.

## S36 Übersicht — Master-Piece Phase 1

Lange durchgezogene Session am 22.04.2026 von morgens bis abends. Elf Commits auf main, vollständiger Phase-1-Abschluss für Master-Piece (Multi-Provider-Thinker-Roundtable mit Maya als Moderatorin).

**Kette der Commits (chronologisch auf main):**

1. `cf37ccc` — S36-F00: Opus 4.7 API-Kompatibilität in providers.ts. Neue isOpus47OrLater-Sniffing-Logik: kein temperature/top_p/top_k für Opus 4.7+, adaptive thinking wenn vom Modell unterstützt. Ältere Opus-Versionen (4.6, 3.x) unverändert.
2. `c3bbab4` — Vision-Doc erster Wurf als COUNCIL-OF-MASTERS-VISION.md.
3. `53df637` — Doc-Rename auf MASTER-PIECE-VISION.md mit korrigierter Architektur. Master-Piece ist Builder-Feature, nicht Soulmatch-Feature. Teilnehmer heißen Thinker, nicht Beings oder Agents oder Personas.
4. `1df40dc` — S36-F01: 10 Thinker-Einträge in personaRouter.ts und studioPrompt.ts. PersonaTier um `'thinker'` erweitert, ProviderName um `'anthropic' | 'zhipu' | 'openrouter'`. Thinker-IDs: thinker_opus, thinker_sonnet, thinker_gpt54, thinker_grok, thinker_deepseek, thinker_deepseek_r, thinker_glm_turbo, thinker_minimax, thinker_kimi, thinker_qwen.
5. `879dfcb` — S36-F01.1: Thinker-Output-Format-Fix. Thinker-Zweig in buildDiscussPrompt mit reduziertem System-Prompt (kein Soulmatch-App-Kontext, kein META-Format-Zwang). forceJsonObject disabled für Thinker.
6. `5fff8be` — S36-F01.2: Hygiene-Block. Self-Echo verhindert (Thinker-Prompt verbietet Dialog-Formatierung wie `[name]: ...`), UTF-8-Encoding korrigiert via explicit `application/json; charset=utf-8` Content-Type-Header, Max-Personas von 4 auf 6 erweitert für Master-Piece-Setup (5 Thinker + Maya).
7. `79ff93e` — S36-F02: Maya-Synthese-Pass. Wenn Runde maya + 2+ thinker_* hat, macht der /api/discuss-Endpoint nach der Hauptrunde einen zusätzlichen Maya-Call. Neue buildMayaSynthesisPrompt-Funktion produziert 4-Sektionen-Markdown (Kernpunkte/Einigkeit/Dissens/Essenz). Synthese wird als separate Response mit persona='maya_synthesis' und meta.kind='synthesis' geliefert. Synthesis-Fehler ist non-fatal.
8. `04fa659` — S36-F02.1 Teil 1: maxTokens 3500 im synthesis callProvider hinzugefügt. Default 2000 war zu klein für 4-Sektionen-Output, Essenz wurde abgeschnitten.
9. `c85edeb` — S36-F02.1 Teil 2: Prompt-Disziplin in buildMayaSynthesisPrompt. Explizite Regel dass Synthese direkt mit `**Kernpunkte**` beginnen muss (keine Einleitung, keine Moderation, keine neue Frage). Alle 4 Sektionen mandatory, Essenz besonders.
10. `5b2e0ba` — S36-F03: Master-Piece-Round-Telemetrie. Neues Modul server/src/lib/masterpieceTelemetry.ts loggt per-Runde strukturierte Metriken (personasCount, thinkersCount, hasSynthesis, synthesisSectionsPresent, thinkerMetrics mit responseLength/responseTimeMs/hadError, totalDurationMs). Fire-and-forget via setImmediate, zero Impact auf User-Response.
11. `c8171c8` — S36-F04: devLogger um LogCategory `'masterpiece'` erweitert. Telemetrie-Logs laufen jetzt unter eigener Category statt unter 'llm', sauber filterbar für Phase-2-Analysen.

**Live-verifiziert (von Claude unabhängig, nicht nur Copilot-Selbstbericht):**

- Alle 10 Thinker funktional (Opus 4.7, Sonnet 4.6, GPT-5.4, Grok 4.1, DeepSeek-Chat, DeepSeek-R, GLM-Turbo, MiniMax, Kimi, Qwen)
- Runde-2-Dialog-Qualität bestätigt: GLM-Turbo revidierte seine R1-Position in R2 nach Claude-Provokation
- F02.1 Synthese-Output: direkt-start mit **Kernpunkte** ✓, alle 4 Sektionen ✓, keine Truncation (1653 chars in 3-Thinker-Test, 1489 chars in 6-Persona-Test), Dissens substanziell differenziert (erkennt Opus-Kontrapunkt explizit)
- F03 Telemetrie: code-review-verified, live-running, aber Render-Log-Content nicht von Claude einsehbar (strikt: compiled-verified + code-review-verified; runtime-log-verification offen für späteren Check)

## Aktive Entscheidungen (aus S35 übernommen, plus S36-Zusätze)

- **Pipeline-Executor-Pfade:** `/opus-feature`, `/opus-task`, `/build` (unverändert)
- **Maya-Routing:** determineBuildMode() in builderFusionChat.ts:233 (unverändert)
- **Worker-Pool:** GLM 5 Turbo, GLM 5.1, MiniMax M2.7, Kimi K2.5, Qwen 3.6+ (unverändert)
- **Patrol:** 6 Deep-Modelle + 3 Routine-Scouts (unverändert)
- **Agent Habitat:** builder_agent_profiles DB-Tabelle, Post-Task-Loop aktiv (unverändert)
- **Deploy-Pipeline:** render-deploy.yml alleinverantwortlich, /git-push triggert kein Redeploy (unverändert)
- **Master-Piece-Runde (NEU seit S36):** /api/discuss erkennt Master-Piece-Runden automatisch wenn Request `personas` mindestens maya und 2+ `thinker_*` enthält. Synthese-Pass läuft als zusätzlicher Maya-Call nach Hauptrunde. Max 6 Personas total. Telemetrie fire-and-forget.
- **Thinker-Provider-Mapping (NEU seit S36):** thinker_opus → anthropic/claude-opus-4-7, thinker_sonnet → anthropic/claude-sonnet-4-6, thinker_gpt54 → openai/gpt-5.4, thinker_grok → xai/grok-4-1-fast, thinker_deepseek → deepseek/deepseek-chat, thinker_deepseek_r → deepseek/deepseek-reasoner, thinker_glm_turbo → zhipu/glm-5-turbo, thinker_minimax → openrouter/minimax/minimax-m2.7, thinker_kimi → openrouter/moonshotai/kimi-k2.5, thinker_qwen → openrouter/qwen/qwen3.6-plus.
- **Master-Piece vs Builder-Feature-Scope (NEU seit S36):** Master-Piece wandert mit dem Builder-System. Wenn Builder für Artifex, Maya-Core oder Bluepilot geklont wird, kommt Master-Piece mit. Es gehört nicht exklusiv zu Soulmatch.
- **Regie-Regel:** Claude nutzt Builder-Infrastruktur (/opus-feature, /opus-task, /git-push) für Code-Änderungen, kleine Fixes via Bridge. Copilot für komplexe Code-Arbeit mit TSC-Pflicht lokal.

## Offene Tasks

Legacy aus S35 (alle weiter offen, nicht in S36 angefasst):

0c. **[S32-NEU]** Kaya-Code-Rename — orion → kaya in personaRouter.ts, studioPrompt.ts, HallOfSouls.tsx. Zurückgestellt bis Maya-Core-Migration.
2. **DNS-Overflow Rest-Block** — 26 direkte fetch-Stellen noch nicht auf outboundFetch migriert, als S31-artiger Hardening-Block.
3. **Studio-JSON-Parse-Bug Drift 16** — pre-existing seit 285dedb, reproduziert im Baseline-Worktree.
4. **F13-Runtime-Verify** — ein echter non-dry-run /opus-feature mit Async-Dispatch-Pfad triggern, landed und verifiedCommit Felder in Response prüfen.
6. **Patrol Finding Auto-Fix** — Pipeline automatisch Fixes für Patrol-Findings generieren.
7. **Docs-Consolidation Rest** — opus-bridge-v4-spec.md, MAYA-BUILDER-AUSBAU-BLUEPRINT-v2.md, MAYA-BUILDER-CONTRACT.md Aktualität prüfen.
10. **Maya-Core nächsten Block schneiden** — maya-core STATE.md next_recommended_block steht auf "noch nicht öffentlich neu geschnitten" seit 2026-04-05.

Neu aus S36 (Master-Piece Phase 2 Roadmap):

S36-P2-1. **Dedizierte /masterpiece Surface im Client** — aktuell nutzt Master-Piece den existierenden /api/discuss-Endpoint mit studioMode:true. Phase 2 braucht eigene Route und UI mit Pool-Chips, Thinker-Auswahl, Synthese-Render.
S36-P2-2. **Pool-Auswahl-Persistenz via DB-Tabelle** — masterpiece_state o.ä., damit User-Pool-Zusammensetzung Renders überlebt.
S36-P2-3. **Maya-Modell-Auswahl** — aktuell hardcoded Gemini. User soll zwischen Maya-Providern wählen können.
S36-P2-4. **Heated-Debate-Toggle UI** — aktuell nur debateMode=kontrovers als Parameter. Fine-grained heatLevel 'harmonisch' | 'kontrovers' | 'hitzig'.
S36-P2-5. **Maya-Autonomy** — Maya darf Thinker während Runde hinzufügen/entfernen mit sichtbarer Begründung.
S36-P2-6. **Crossing/Crushing** — explizites Verbinden von Thinker-Beiträgen (Crossing) + AICOS-Crush-Operatoren (ZL/ZQ/IL/BL/IV/AN/SE/TE/SV/OB/MB/NR) als Zerlegungs-Layer. Braucht AICOS-Operator-Spec-Read zuerst.
S36-P2-7. **LiveTalk für Master-Piece** — per-Thinker-Voices, ähnlich Soulmatch-LiveTalk.
S36-P2-8. **Worker-Swarm-Integration-Bridge** — Master-Piece-Entscheidung triggert Builder-Worker-Swarm.
S36-P2-9. **Code-Terminology-Migration** — PERSONA_* Namen im Code zu BEING_*/THINKER_* ändern. Bewusst getrennter späterer Block.

Follow-ups aus F03/F04:
- **Render-Log-Einsicht für Telemetrie-Verifikation** — bei nächster Gelegenheit checken dass `Master-Piece round telemetry` Log-Entries tatsächlich unter Category 'masterpiece' erscheinen. Nicht dringend.

## Reuse-First Regel (aus S24)

- R1: Search Before Build
- R2: Copy Over Abstract
- R3: Proof Obligation

## Session-Historie-Lücke

S22, S23, S26, S27, S28, S29 haben keine Handoff-Files im Repo. Für neue Chats: docs/CLAUDE-CONTEXT.md + STATE.md + docs/SESSION-STATE.md zuerst.
